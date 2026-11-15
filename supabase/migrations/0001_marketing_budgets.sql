CREATE FUNCTION touch_updated() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE FUNCTION append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only record'; END $$;
CREATE TABLE budgets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE CHECK(length(trim(code))>0), name text NOT NULL,
 owner text NOT NULL, currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), starts_on date NOT NULL, ends_on date NOT NULL,
 approved_cents bigint NOT NULL CHECK(approved_cents BETWEEN 0 AND 1000000000000), evidence text NOT NULL,
 tax_year_end date NOT NULL, retain_until date NOT NULL, review_on date NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_on>=starts_on)
);
CREATE TABLE campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), budget_id uuid NOT NULL REFERENCES budgets(id), code text NOT NULL UNIQUE,
 name text NOT NULL, owner text NOT NULL, channel text NOT NULL, starts_on date NOT NULL, ends_on date NOT NULL,
 allocation_cents bigint NOT NULL CHECK(allocation_cents BETWEEN 0 AND 1000000000000),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_on>=starts_on)
);
CREATE TABLE cost_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES campaigns(id), reference text NOT NULL,
 name text NOT NULL, supplier text NOT NULL, planned_cents bigint NOT NULL CHECK(planned_cents BETWEEN 0 AND 1000000000000),
 committed_cents bigint NOT NULL CHECK(committed_cents BETWEEN 0 AND 1000000000000),
 forecast_cents bigint NOT NULL CHECK(forecast_cents BETWEEN 0 AND 1000000000000), forecast_on date NOT NULL,
 due_on date NOT NULL, evidence text NOT NULL DEFAULT '', source_row jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(campaign_id,reference)
);
CREATE TABLE actuals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), line_id uuid NOT NULL REFERENCES cost_lines(id), reference text NOT NULL,
 spent_on date NOT NULL, amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 1000000000000),
 evidence text NOT NULL DEFAULT '', source_kind text NOT NULL DEFAULT 'invoice' CHECK(source_kind IN ('invoice','opening-export')),
 actor text NOT NULL, void_reason text, void_actor text, void_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(line_id,reference),
 CHECK((void_reason IS NULL AND void_actor IS NULL AND void_at IS NULL) OR (length(trim(void_reason))>0 AND length(trim(void_actor))>0 AND void_at IS NOT NULL))
);
CREATE TABLE actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES campaigns(id), note text NOT NULL,
 owner text NOT NULL, due_on date NOT NULL, resolution text, closed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((resolution IS NULL AND closed_at IS NULL) OR (length(trim(resolution))>0 AND closed_at IS NOT NULL))
);
CREATE TABLE imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES campaigns(id), fingerprint text NOT NULL UNIQUE,
 filename text NOT NULL, original_csv text NOT NULL, mapping jsonb NOT NULL, actor text NOT NULL, row_count integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE activity (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor text NOT NULL, operation text NOT NULL, record_id uuid NOT NULL,
 detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['budgets','campaigns','cost_lines','actuals','actions','imports','activity'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',n);
  EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated()',n);
 END LOOP;
 FOREACH n IN ARRAY ARRAY['imports','activity'] LOOP
  EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION append_only()',n);
 END LOOP;
END $$;
CREATE FUNCTION guard_actual() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'actuals are never deleted'; END IF;
 IF OLD.void_at IS NOT NULL OR NEW.void_at IS NULL OR (to_jsonb(NEW)-'void_reason'-'void_actor'-'void_at'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'void_reason'-'void_actor'-'void_at'-'updated_at') THEN RAISE EXCEPTION 'actuals can only be voided once'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER actual_guard BEFORE UPDATE OR DELETE ON actuals FOR EACH ROW EXECUTE FUNCTION guard_actual();
CREATE VIEW line_spend AS
WITH a AS (SELECT line_id,sum(amount_cents)::bigint actual_cents FROM actuals WHERE void_at IS NULL GROUP BY line_id), s AS (
 SELECT l.*,c.code campaign,c.name campaign_name,c.owner,c.channel,b.code budget,b.currency,
 coalesce(a.actual_cents,0)::bigint actual_cents,
 greatest(l.committed_cents-coalesce(a.actual_cents,0),0)::bigint outstanding_cents
 FROM cost_lines l JOIN campaigns c ON c.id=l.campaign_id JOIN budgets b ON b.id=c.budget_id LEFT JOIN a ON a.line_id=l.id)
SELECT s.*, (greatest(actual_cents,committed_cents,forecast_cents))::bigint projected_cents,
 (greatest(actual_cents,committed_cents,forecast_cents)-planned_cents)::bigint variance_cents,
 current_date-forecast_on forecast_age_days FROM s;
CREATE VIEW campaign_spend AS
SELECT c.*,b.code budget,b.currency,coalesce(sum(l.planned_cents),0)::bigint planned_cents,
 coalesce(sum(l.actual_cents),0)::bigint actual_cents,coalesce(sum(l.outstanding_cents),0)::bigint outstanding_cents,
 coalesce(sum(l.projected_cents),0)::bigint projected_cents,
 (c.allocation_cents-coalesce(sum(l.projected_cents),0))::bigint headroom_cents,
 count(l.id) FILTER(WHERE l.forecast_age_days>14) stale_forecasts
FROM campaigns c JOIN budgets b ON b.id=c.budget_id LEFT JOIN line_spend l ON l.campaign_id=c.id GROUP BY c.id,b.code,b.currency;
CREATE VIEW budget_spend AS
SELECT b.*,coalesce(sum(c.allocation_cents),0)::bigint allocated_cents,coalesce(sum(c.actual_cents),0)::bigint actual_cents,
 coalesce(sum(c.projected_cents),0)::bigint projected_cents,
 (b.approved_cents-coalesce(sum(c.projected_cents),0))::bigint headroom_cents,
 (b.approved_cents-coalesce(sum(c.allocation_cents),0))::bigint unallocated_cents
FROM budgets b LEFT JOIN campaign_spend c ON c.budget_id=b.id GROUP BY b.id;
CREATE VIEW compliance_issues AS
 SELECT b.code record,'NZ-RETENTION' rule,'Retention date is before seven tax years after the recorded tax-year end' issue FROM budgets b WHERE retain_until<(tax_year_end+interval '7 years')::date
 UNION ALL SELECT code,'REVIEW-DUE','Record review is overdue (internal policy)' FROM budgets WHERE review_on<current_date
 UNION ALL SELECT code,'BUDGET-EVIDENCE','Budget approval evidence is missing (internal policy)' FROM budgets WHERE trim(evidence)=''
 UNION ALL SELECT campaign||'/'||reference,'COMMITMENT-EVIDENCE','Committed cost has no evidence (internal policy)' FROM line_spend WHERE committed_cents>0 AND trim(evidence)=''
 UNION ALL SELECT c.code||'/'||a.reference,'EXPENSE-EVIDENCE','Expense evidence reference is missing' FROM actuals a JOIN cost_lines l ON l.id=a.line_id JOIN campaigns c ON c.id=l.campaign_id WHERE a.void_at IS NULL AND trim(a.evidence)=''
 UNION ALL SELECT c.code||'/'||a.reference,'OPENING-RECONCILIATION','Opening export total needs reconciliation to accounting evidence' FROM actuals a JOIN cost_lines l ON l.id=a.line_id JOIN campaigns c ON c.id=l.campaign_id WHERE a.void_at IS NULL AND a.source_kind='opening-export';

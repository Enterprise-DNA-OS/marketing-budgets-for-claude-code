INSERT INTO budgets(id,code,name,owner,currency,starts_on,ends_on,approved_cents,evidence,tax_year_end,retain_until,review_on) VALUES
 ('10000000-0000-4000-8000-000000000001','NZ-ANNUAL','NZ partner programme','Aroha','NZD',current_date-120,current_date+240,10000000,'Demo signed budget',current_date-120,(current_date-120+interval '7 years')::date,current_date+30),
 ('10000000-0000-4000-8000-000000000002','AU-ANNUAL','AU member programme','Mia','AUD',current_date-120,current_date+240,5000000,'Demo approval',current_date-120,current_date+365,current_date-4)
ON CONFLICT DO NOTHING;
INSERT INTO campaigns(id,budget_id,code,name,owner,channel,starts_on,ends_on,allocation_cents) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','PARTNER-NZ','Partner breakfast NZ','Aroha','Events',current_date-60,current_date+30,3500000),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','GUIDE-NZ','Owner guide','Ben','Editorial',current_date-30,current_date+60,2000000),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000002','PARTNER-AU','Partner breakfast AU','Mia','Events',current_date-30,current_date+45,2500000)
ON CONFLICT DO NOTHING;
INSERT INTO cost_lines(id,campaign_id,reference,name,supplier,planned_cents,committed_cents,forecast_cents,forecast_on,due_on,evidence) VALUES
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','VENUE','Venue and breakfast','Harbour Rooms',2000000,2200000,2200000,current_date-24,current_date-3,'Demo PO-001'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','SPEAKER','Speaker and travel','Studio South',1000000,1500000,1500000,current_date-5,current_date+12,''),
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','EDIT','Editing and layout','Paper Studio',1500000,800000,800000,current_date-3,current_date+20,'Demo PO-002'),
 ('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000003','VENUE','Venue and breakfast','Eastern Rooms',1500000,1500000,1500000,current_date-18,current_date-2,'Demo PO-003')
ON CONFLICT DO NOTHING;
INSERT INTO actuals(id,line_id,reference,spent_on,amount_cents,evidence,actor) VALUES
 ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','INV-101',current_date-10,1000000,'Demo invoice 101','Demo'),
 ('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','INV-102',current_date-5,400000,'Demo invoice 102','Demo'),
 ('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000004','INV-103',current_date-6,500000,'','Demo')
ON CONFLICT DO NOTHING;
INSERT INTO actions(id,campaign_id,note,owner,due_on) VALUES
 ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Confirm speaker purchase evidence','Aroha',current_date-2),
 ('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','Review final layout','Ben',current_date+4)
ON CONFLICT DO NOTHING;

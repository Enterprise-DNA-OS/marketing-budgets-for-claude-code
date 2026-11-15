# Marketing Budgets for Claude Code

See which campaign is over budget before approving the next commitment. Keep budgets, campaign costs, forecasts, expense evidence and follow-ups in a database you own.

## Three ways to own it

- **Do it yourself:** free, MIT licensed. Run it with Claude Code, Codex, OpenCode or Cursor. Hosting and your agent subscription are separate.
- **We customise it:** Enterprise DNA maps your Marmind exports, adds your budget rules and reporting layouts, and builds a web front end or uses a different stack when needed. One setup fee, then a retainer for ongoing work.
- **We run it for you:** Omni by Enterprise DNA installs it, connects your systems, manages access and backups, and prepares the weekly budget review. One setup fee, then a retainer.

[Book a 30-minute call with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=marmind).

## Quick start

Node 20 or newer. No cloud account required.

```sh
npm install
npm test
npm run demo
npm run budget -- campaign-review
npm run budget -- compliance --json
npm run view
npm run docs
```

Open the folder in your agent and ask for /budget-review. Synthetic demo records include an over-budget event, stale forecasts, overdue commitments and missing evidence. Reseeding preserves edits. Use an empty DATA_DIR for real records and never seed it. Set DATABASE_URL for shared PostgreSQL, or leave it empty for local PGlite in .data/db.

## Why this family

Historical third-party Marmind pricing listed Premium at US$1,700 a month on annual billing, equivalent to US$20,400 a year. That is a historical targeting signal, not a current vendor price or a verified customer invoice. Marmind now quotes privately. No NZ/AU buyer or current invoice was verified. [Research and candidate scores](docs/research.md) distinguish those limits from the working software.

## What this base covers

Each approved budget has one currency and period. Campaigns have owners, allocations and cost lines. Each cost line holds its original plan, current total commitment, latest full-cost forecast, due date and evidence. Actual expenses remain separate records.

Projected cost is the greatest of actual spend, committed total and total forecast. Outstanding commitment is the positive difference between committed total and actual spend. These quantities are not added together. A partially invoiced purchase order is counted once. A forecast below known actual or committed spend never hides that exposure. Amounts use integer cents and support two-decimal currencies only, without currency conversion.

The five weekly jobs are budget review, commitments due, reforecast due, over-budget review and actions due. All mutations retain an actor label and activity record. Actual expenses can only be voided once with a reason. Imports and activity are append-only. The application serializes mutations by locking budget rows in a fixed order.

This is a bounded marketing budget desk, not the entire Marmind suite. It does not run campaigns, buy ads, pay bills, post to accounting, attribute revenue, edit media, manage consent or implement vendor permissions. Operating multiple currencies does not imply multiple jurisdictions: the supplied retention check is for an NZ business. Configure other jurisdictions with a cited policy before relying on it.

## Commands

| Command | Job |
|---|---|
| /help | Read supported commands and flags. |
| /budgets | Read budget periods and approved amounts. |
| /campaigns | Read campaign owners, channels and allocations. |
| /budget-review | Compare approved budgets, forecast spend and remaining headroom. |
| /campaign-review | Review each campaign without combining currencies. |
| /cost-review | Compare planned cost, commitments, actual spend and latest forecast. |
| /commitments-due | Review outstanding commitments due within fourteen days. |
| /reforecast-due | Find forecasts more than fourteen days old. |
| /over-budget | Find campaigns projected above their allocation. |
| /actions-due | Find overdue and next-week actions. |
| /compliance | Review missing evidence, retention metadata and opening balances. |
| /activity | Read the recorded change history. |
| /campaign | Read one campaign with its costs and actions. |
| /add-budget | Record an approved budget with evidence and retention dates. |
| /add-campaign | Allocate a campaign inside a budget period. |
| /add-cost | Record a planned cost and its total expected spend. |
| /record-actual | Record an expense against a cost line. |
| /void-actual | Void an incorrect expense with a reason and retain its history. |
| /reforecast | Revise a cost line total forecast with a dated reason. |
| /set-commitment | Record a changed purchase commitment with evidence. |
| /log-action | Assign a review action and due date. |
| /close-action | Record an action outcome. |
| /review-records | Record retention dates and approval evidence. |
| /import | Validate a mapped Marmind detail export and import it atomically. |
| /export | Write all records and original imports to a private snapshot. |
| /weekly-review | Draft Monday review from budgets, stale forecasts and actions. |
| /draft-budget-review | Draft a branded budget brief without sending anything. |
| /customise | Make a tested field or rule change. |
| /new-view | Add a branded read-only report. |

27 executable CLI commands and 29 slash commands. Every CLI command accepts --json. Exact codes take precedence, then partial ids and case-insensitive names. Ambiguous matches list candidates and exit 1. A repeated reference on a changed import fails, rather than overwriting history.

## Ten questions your records answer

1. Which campaign is forecast above its allocation?
2. Which budget still has unallocated money?
3. Which commitments fall due in the next fortnight?
4. How much of a purchase commitment has already been invoiced?
5. Which forecasts have not been reviewed for fourteen days?
6. Which owner has an overdue review action?
7. Which expense lacks an evidence reference?
8. Which budget retention dates need review?
9. Which opening export balances need invoice reconciliation?
10. Who changed a commitment or forecast, and what reason did they record?

These are working queries, not a claim that Marmind cannot answer them. Change the joins and policies to answer the questions your own business needs.

## Your first hour: ten things to ask for

1. Put our business name, colours and logo in brand.json.
2. Show our approved budget and remaining headroom.
3. Explain the over-budget campaign.
4. List next fortnight's outstanding commitments.
5. Find stale forecasts and their owners.
6. Draft Monday's budget review.
7. Produce a branded campaign cost brief.
8. Test our export mapping and reconcile every total.
9. Add our cost-centre field with a tested migration.
10. Export a private snapshot before changing a rule.

## Bring your history

[The replace guide](docs/replace-marmind.md) covers Marmind's documented Excel detail export, saving a detail worksheet as UTF-8 CSV, mapping account-specific headers and importing in one command. A campaign must already exist. The sample is a synthetic mapping contract, not a claimed native vendor schema. Keep the workbook and underlying invoices. Original CSV, extra columns and mapping are retained. Identical imports do nothing; invalid or conflicting rows roll back the whole import.

## Documents and views

brand.json controls your business name, colours and logo. npm run view renders budget week, commitments and evidence review as read-only HTML. npm run docs produces budget briefs and campaign cost reviews. /weekly-review and /draft-budget-review write private drafts. These are internal working documents, not tax returns or accounting statements.

[Compliance](docs/compliance.md) cites the record-keeping sources and distinguishes legal record obligations from internal review policies. The checks find missing metadata, not the legal adequacy of a file. [Why no front end](docs/why-no-front-end.md) describes mobile and shared-editing limits.

Use a trusted database owner. Row-level security is enabled and PUBLIC privileges are revoked on all domain tables. Actor names are labels, not authentication. Database owners can bypass controls. Set OS and database permissions, backups and access policy before sharing. JSON export includes all seven domain record groups, original imports and activity; restore is a reviewed maintenance task. An export file is created exclusively and cannot overwrite an existing file.

npm test uses a temporary database and output directory, exercises every executable command and tests arithmetic, corrections, evidence checks, atomic import, preserved source rows, HTML escaping and ambiguous names. CI runs Windows and Ubuntu on Node 20 and 22, plus PostgreSQL 16. TEST_DATABASE_URL must be empty and disposable. See docs/validation.md for observed results.

## Licence

MIT. Copyright 2026 Enterprise DNA. Marmind belongs to its owner. No vendor code or assets are included.

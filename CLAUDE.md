# Marketing Budgets for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
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

If an ask fits nothing here, run the CLI directly (`npm run budget -- help`) and then propose a new command for it.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis and the guide for moving off Marmind.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/marmind

## Budget semantics

Forecast means the full expected cost, including spend already recorded. Projected spend is the greatest of actual spend, total commitment and total forecast. Never add those three figures. A paid invoice consumes the outstanding commitment. Currencies stay separate. Opening export actuals are aggregates, not invoice evidence. Void them with a reason when replacing them with checked invoices. All controls assume a trusted database owner; actor labels are not authentication.

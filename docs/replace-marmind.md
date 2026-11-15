# Replace the marketing budget desk in Marmind

## Export and retain the source

Marmind documents an Excel export for its Budget and Cost detail grid in the [January 2026 release notes](https://knowledgebase.marmind.com/kb/release-notes-january-2026). Its [Grid guide](https://knowledgebase.marmind.com/kb/grid-module-functionalities-in-detail) explains exporting the current view, including hidden columns as an option. Rechecked 2026-11-15.

Choose the required planning period and one currency. Export detail rows, not subtotal rows. Keep the original workbook unchanged. Save the relevant detail worksheet as UTF-8 CSV. The October admin CSV export concerns reference data; it is not evidence of a native cost-detail CSV format.

## Map the account's columns

Marmind names and fields can be customised. The example fixture is synthetic. It demonstrates this importer, not a verified native export schema. Obtain the actual account export before promising unattended migration. Create an approved budget and a campaign first, with dates covering the source rows. Each import belongs to one campaign. Split multiple campaign worksheets before import.

| Canonical field | Default CSV header | Meaning |
|---|---|---|
| reference | Reference | Stable unique cost-line reference within the campaign |
| name | Name | Cost description |
| supplier | Supplier | Supplier label |
| currency | Currency | Three-letter code matching the campaign budget |
| planned | Planned | Original total planned cost |
| committed | Committed | Total committed cost, including already invoiced amounts |
| forecast | Forecast | Latest total expected cost, including actual spend |
| actual | Actual | Opening actual total for this cost line |
| forecast-date | Forecast date | Date of the source balance and forecast |
| due | Due date | Commitment due date inside the campaign period |
| evidence | Evidence | Source reference, permitted to be empty and flagged |

Money is an unsigned decimal with up to two places and no separators. Dates are YYYY-MM-DD. No currency conversion, tax calculation, credit notes or negative costs. Opening actual totals cannot exceed the total forecast supplied. Fix mapping or review the record before importing a contradictory row. Do not invent invoice evidence from a spreadsheet total.

Use a mapping file to name real headers, for example `{"supplier":"Vendor","planned":"Planned costs","actual":"Actual costs","forecast":"Forecast costs"}`. Every other header keeps its default. Mappings must use distinct source columns and only canonical keys. The source row and every unmapped column are preserved.

## Validate, import and reconcile

```sh
npm run budget -- import marmind --campaign=PARTNER-NZ --file=imports/cost-detail.csv --map=imports/columns.json --actor=Operator --dry-run --json
npm run budget -- import marmind --campaign=PARTNER-NZ --file=imports/cost-detail.csv --map=imports/columns.json --actor=Operator --json
npm run budget -- campaign --campaign=PARTNER-NZ --json
npm run budget -- compliance
```

A dry run writes nothing. Any invalid row or duplicate reference rejects the whole file. The same campaign, file and mapping is idempotent. A changed file that reuses cost references fails; use evidenced forecast and commitment adjustments instead of overwriting history. Keep separate files per currency. Compare row counts and original plan, commitment, actual and forecast totals to the source worksheet before ending the Marmind subscription.

Opening actuals retain the source export and are flagged for reconciliation. They are not invoice records. When replacing one with checked invoices, void the opening actual with a reason, then record the invoices against the same cost line. Never load both totals and underlying invoices without voiding the former.

Budget scenarios, hierarchy, attachments, invoice detail, permissions, integrations and automation do not transfer from an aggregate worksheet. Enterprise DNA maps those into the customised version. Keep the original system available until owners sign off the counts, evidence and operating workflow. Exporting your data and one import command are the mechanical steps; mapping and acceptance depend on the actual account.

# Evidence and record checks

Checked 2026-11-15. This desk tracks marketing costs for an NZ business. It does not calculate tax or certify legal compliance. The business and its adviser decide whether the source evidence and retention policy are adequate.

| Rule | What the command tests | Source or policy |
|---|---|---|
| NZ-RETENTION | Recorded retention date is at least seven years after the recorded tax-year end | [Inland Revenue record keeping](https://www.ird.govt.nz/managing-my-tax/record-keeping) requires at least seven tax years. |
| EXPENSE-EVIDENCE | Active expense has a nonempty evidence reference | [Inland Revenue computer record keeping](https://www.ird.govt.nz/managing-my-tax/record-keeping/computer-record-keeping-for-audit) describes readable, retrievable transaction records. A reference alone does not verify the document. |
| BUDGET-EVIDENCE | Budget has approval evidence | Internal control, not a statutory approval threshold. |
| COMMITMENT-EVIDENCE | A nonzero purchase commitment has evidence | Internal control. |
| REVIEW-DUE | A budget's next review date has passed | Internal control chosen by the operator. |
| OPENING-RECONCILIATION | An imported opening actual total remains active | Internal control. Reconcile it to accounting records and replace it with evidenced invoices where required. |

The seven-year calculation is a minimum metadata check. It does not authorise destruction or assess extended retention, disputes, audit notices, location of cloud records, or other jurisdictions. A fiscal year end must be entered from the business policy. Store supporting documents separately with durable references, permissions and backups. There is no delete or retention-purge command. NZD and AUD are currencies, not jurisdiction selectors.

Fourteen days for a stale forecast, fourteen days for commitments due and seven days for upcoming actions are demonstration operating policies. Change them with a migration and tests after the operator agrees.

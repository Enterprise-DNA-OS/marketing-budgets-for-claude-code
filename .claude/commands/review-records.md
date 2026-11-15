---
description: Record retention dates and approval evidence.
---

# review-records

Record retention dates and approval evidence.

Run `npm run budget -- review-records` with the required flags below. All commands accept `--json`. Flags use `--name=value`.

Flags: `--budget`, `--tax-year-end`, `--retain-until`, `--review`, `--evidence`, `--actor`.

Read the affected record first. Use the operator name as actor. Never invent approval or evidence. After writing, read the result and report what changed.

Present the result in plain language. List ambiguous candidates and stop for a selector. Drafts stay private. Never send, pay or delete.

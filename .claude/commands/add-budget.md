---
description: Record an approved budget with evidence and retention dates.
---

# add-budget

Record an approved budget with evidence and retention dates.

Run `npm run budget -- add-budget` with the required flags below. All commands accept `--json`. Flags use `--name=value`.

Flags: `--code`, `--name`, `--owner`, `--currency`, `--start`, `--end`, `--amount`, `--evidence`, `--tax-year-end`, `--retain-until`, `--review`, `--actor`.

Read the affected record first. Use the operator name as actor. Never invent approval or evidence. After writing, read the result and report what changed.

Present the result in plain language. List ambiguous candidates and stop for a selector. Drafts stay private. Never send, pay or delete.

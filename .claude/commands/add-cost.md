---
description: Record a planned cost and its total expected spend.
---

# add-cost

Record a planned cost and its total expected spend.

Run `npm run budget -- add-cost` with the required flags below. All commands accept `--json`. Flags use `--name=value`.

Flags: `--campaign`, `--reference`, `--name`, `--supplier`, `--planned`, `--committed`, `--forecast`, `--forecast-date`, `--due`, `--evidence`, `--actor`.

Read the affected record first. Use the operator name as actor. Never invent approval or evidence. After writing, read the result and report what changed.

Present the result in plain language. List ambiguous candidates and stop for a selector. Drafts stay private. Never send, pay or delete.

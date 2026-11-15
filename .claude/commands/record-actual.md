---
description: Record an expense against a cost line.
---

# record-actual

Record an expense against a cost line.

Run `npm run budget -- record-actual` with the required flags below. All commands accept `--json`. Flags use `--name=value`.

Flags: `--line`, `--reference`, `--date`, `--amount`, `--evidence`, `--actor`.

Read the affected record first. Use the operator name as actor. Never invent approval or evidence. After writing, read the result and report what changed.

Present the result in plain language. List ambiguous candidates and stop for a selector. Drafts stay private. Never send, pay or delete.

---
description: Record a changed purchase commitment with evidence.
---

# set-commitment

Record a changed purchase commitment with evidence.

Run `npm run budget -- set-commitment` with the required flags below. All commands accept `--json`. Flags use `--name=value`.

Flags: `--line`, `--amount`, `--evidence`, `--reason`, `--actor`.

Read the affected record first. Use the operator name as actor. Never invent approval or evidence. After writing, read the result and report what changed.

Present the result in plain language. List ambiguous candidates and stop for a selector. Drafts stay private. Never send, pay or delete.

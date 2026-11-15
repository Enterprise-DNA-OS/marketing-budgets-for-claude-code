---
description: Validate a mapped Marmind detail export and import it atomically.
---

# import

Validate a mapped Marmind detail export and import it atomically.

Run `npm run budget -- import marmind` with the required flags below. All commands accept `--json`. Flags use `--name=value`.

Flags: `--campaign`, `--file`, `--map`, `--dry-run`, `--actor`.

Read docs/replace-marmind.md first. Show the mapping and run --dry-run before the write. Reconcile counts and currency totals. Preserve the export and report opening-balance exceptions. Never assume the sample headers match a vendor account.

Read the affected record first. Use the operator name as actor. Never invent approval or evidence. After writing, read the result and report what changed.

Present the result in plain language. List ambiguous candidates and stop for a selector. Drafts stay private. Never send, pay or delete.

# Validation

Run date: 2026-11-15.

- Local Linux, Node 22: npm install completed with zero reported vulnerabilities.
- npm test: PASS, 97 assertions and every one of 27 executable commands exercised on a temporary PGlite database.
- npm run demo: PASS, including idempotent migration and seed.
- npm run view: three branded read-only views generated.
- npm run docs: five branded documents generated across two document types.
- Fixtures are synthetic. No customer export or customer database was used.

GitHub run [43669209755](https://github.com/Enterprise-DNA-OS/marketing-budgets-for-claude-code/actions/runs/43669209755) passed all five jobs: Ubuntu and Windows on Node 20 and 22, plus PostgreSQL 16. Tested implementation commit: 51426078d353447a52a3afe75c1fc5c0bb535e4d.

Desktop and mobile screenshots of the generated weekly view and budget brief were inspected. The mobile page stays within a 390px viewport and wide reports scroll inside their cards. View labels use plain words and the action report hides internal identifiers. Three working command runs were captured for the comparison page.

The comparison page passed check-page.mjs, including a rendered HTML check for its tracked booking link and noindex setting. Desktop and mobile page screenshots were inspected.

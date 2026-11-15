# Validation

Run date: 2026-11-15.

- Local Linux, Node 22: npm install completed with zero reported vulnerabilities.
- npm test: PASS, 97 assertions and every one of 27 executable commands exercised on a temporary PGlite database.
- npm run demo: PASS, including idempotent migration and seed.
- npm run view: three branded read-only views generated.
- npm run docs: five branded documents generated across two document types.
- Fixtures are synthetic. No customer export or customer database was used.

Cross-platform and PostgreSQL results will be recorded after the private GitHub run. The workflow configuration alone is not evidence of a passing run.

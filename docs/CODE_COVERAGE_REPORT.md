# Code Coverage Report

Date generated: 2026-02-16

## Summary

| Metric | Coverage |
| --- | --- |
| Statements | 3.73% |
| Branches | 43.63% |
| Functions | 27.50% |
| Lines | 3.73% |

## What Coverage Means

- Statements: How many executable statements ran during tests.
- Branches: How many control flow branches (if/else, ternary, switch) ran.
- Functions: How many functions were called.
- Lines: How many source lines ran during tests.

## Observations

- Highest coverage: components and auth UI/service.
  - components/AppShell.tsx, AuthCard.tsx, FormField.tsx: 100% statements/lines.
  - app/login/page.tsx: 88.19% statements/lines.
  - app/signup/page.tsx: 91.5% statements/lines.
  - lib/authService.ts: 77.73% statements/lines.
- Major areas with 0% coverage:
  - app/assignments/*, app/dashboard/*, app/reviews/*.
  - lib/hooks/useReviewAssignments.ts, lib/hooks/useReviewers.ts.
  - lib/actions/assignReviewer.ts.
  - lib/supabaseClient.ts, lib/supabaseServer.ts.

## How To Regenerate

```bash
npx vitest run --coverage
```

Or using npm:

```bash
npm run test:coverage
```

## HTML Report

Open the report at:

- coverage/index.html

## Next Steps

- Add component tests for assignments, dashboard, and reviews pages.
- Add unit/integration tests for hooks and server actions.
- Add tests for Supabase client/server helpers to lift lib coverage.

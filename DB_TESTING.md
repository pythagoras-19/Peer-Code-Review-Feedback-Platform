# Database Testing Strategy

This document explains how we test Supabase Row Level Security (RLS) policies in this repository using Vitest and real database queries.

## Purpose

Row Level Security is the primary mechanism enforcing data isolation and authorization in Supabase. Unlike application-level authorization checks, RLS policies are enforced at the database level and cannot be bypassed by frontend logic.

We test RLS directly against the production database (or staging) for several critical reasons:

- **Security validation**: Confirms that policies actually prevent unauthorized access, not just that code "tries to" prevent it.
- **Policy correctness**: Catches logic errors in SQL policies that would be invisible to unit tests.
- **Regression detection**: Changes to policies or schema that inadvertently weaken security are caught immediately.
- **Compliance**: Demonstrates that the system enforces its security guarantees.

These tests are fundamentally different from unit tests because they validate infrastructure behavior, not application logic. A passing unit test means your code works; a passing RLS test means your database actually enforces what you claim it does.

## Environment Setup

Database tests require three Supabase API keys and additional test credentials:

**Required environment variables** (set in `.env.test`):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anonymous key (what frontend code uses)
- `SUPABASE_SERVICE_ROLE_KEY` - Privileged admin key (test setup only)
- `TEST_PASSWORD` - Password for test auth users (any strong password)
- `TEST_EMAIL_DOMAIN` - Domain for test email addresses (e.g., `example.test`)

**Important**: The service role key is **only used in test helpers** to create temporary auth users and set up test data. It is never used in production code or frontend. This key has unrestricted database access and should be treated as sensitive.

## Test Architecture

Tests are organized under `tests/db/` and follow a consistent structure.

### helpers.ts

The helpers module centralizes test infrastructure:

- **`adminClient`**: A Supabase client initialized with the service role key. Used only for test setup (creating users, populating data).
- **`createTestUser(prefix)`**: Creates a temporary auth user, signs them in via the anon client, and returns their user ID and authenticated client. This user can be used to run queries with real RLS enforcement.
- **`deleteTestUser(userId)`**: Cleans up auth users after tests complete.

Centralizing these functions ensures all RLS tests follow the same user creation pattern and reduces duplication.

### Test Files

Each test file focuses on a single table and its RLS policies. The naming convention is `[table].rls.test.ts`.

Structure:
- `beforeAll`: Create test users and seed required data
- `it()`: Each test validates one policy invariant
- `afterAll`: Delete test users and clean up

All queries run with a 60-second timeout to account for network latency.

## First Test: user_profiles RLS

The `user_profiles.rls.test.ts` file validates two invariants:

1. **A user can read their own profile**: When an authenticated user queries their own `user_profiles` row, the row is returned.
2. **A user cannot read another user's profile**: When an authenticated user queries another user's `user_profiles` row, RLS blocks visibility and returns `data: null`.

### How RLS Blocking Works

In Supabase, when RLS denies access to a row in a SELECT query, the response is:

```
{ data: null, error: null }
```

This is not an error state; it indicates the query executed successfully but the row is not visible. We use `.maybeSingle()` to handle queries that may return zero rows due to RLS filtering.

### Why We Wait for Trigger Population

The `user_profiles` table likely has a database trigger that creates a profile row when a user signs up. Test data is seeded before assertions to ensure the trigger has executed. This tests the complete flow: auth → trigger → RLS policy.

## Why This Approach Is Safe

Testing against the real database does not weaken security:

- Tests use temporary auth accounts that are deleted after each run.
- Tests validate policies; they do not disable or bypass them.
- Test queries run through the standard anon client, respecting all RLS policies.
- Failures indicate real policy problems that would affect production, prompting fixes before deployment.

## How to Run

Run all database tests in Node environment:

```
vitest tests/db/ --environment node
```

Run a specific test file:

```
vitest tests/db/user_profiles.rls.test.ts --environment node
```

Database tests require network access to Supabase and may take 10-30 seconds per file due to auth operations. They are slower than unit tests but provide stronger security guarantees.

## How This Scales

The pattern established by `user_profiles.rls.test.ts` will be replicated for other tables:

- `assignments.rls.test.ts` - Validate assignment visibility and ownership rules
- `submissions.rls.test.ts` - Validate submission access control
- `review_assignments.rls.test.ts` - Validate review task isolation
- `reviews.rls.test.ts` - Validate review visibility and submission author access

Each test file will:
- Create multiple test users with different roles (if applicable)
- Validate positive cases (permitted access)
- Validate negative cases (blocked access)
- Clean up test data

Over time, this forms a comprehensive RLS audit trail demonstrating that policies are correctly enforced.

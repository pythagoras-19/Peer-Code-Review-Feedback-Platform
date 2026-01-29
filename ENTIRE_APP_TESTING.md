# ENTIRE_APP_TESTING

## Purpose
This document tracks current automated test coverage and known gaps in this repository. It is a living document and should be updated as tests are added, removed, or changed.

## Existing Automated Tests

### authService.test.ts
- **Functionality tested:** Supabase auth service wrapper behavior for sign-up, sign-in, sign-out, session lookup, user lookup, password reset, and password update, including success and error handling.
- **Test type:** Unit
- **Core feature area:** Authentication (service)

### app/login/page.test.tsx
- **Functionality tested:** Login page UI rendering, loading state, redirects for existing sessions, form validation, successful login flow, error display, button states, and navigation to signup.
- **Test type:** Component
- **Core feature area:** Authentication (UI)

### app/signup/page.test.tsx
- **Functionality tested:** Signup page UI rendering, loading state, redirects for existing sessions, form validation, successful signup flow, error display, button states, and navigation to login.
- **Test type:** Component
- **Core feature area:** Authentication (UI)

### user_profiles.rls.test.ts
- **Functionality tested:** RLS enforcement on the `user_profiles` table for reading own profile vs. blocking access to another user’s profile.
- **Test type:** Integration (database/RLS)
- **Core feature area:** User profiles (RLS)

## Coverage by Feature Area

| Feature Area | Coverage |
|---|---|
| Authentication (service) | Strong |
| Authentication (UI) | Strong |
| User profiles (RLS) | Partial |
| Assignments | None |
| Submissions | None |
| Reviews | None |
| Reviewer assignment algorithm | None |
| Student history views | None |
| User directory / discovery (if present) | None |

## Known Gaps / Untested Areas
- Assignments UI and any assignment data handling
- Submissions creation, display, and persistence
- Reviews creation, display, and persistence
- Reviewer assignment workflow/logic
- Student history views (if present)
- User directory/discovery UI and data access
- RLS/authorization coverage beyond `user_profiles` (e.g., assignments, submissions, review assignments, reviews)

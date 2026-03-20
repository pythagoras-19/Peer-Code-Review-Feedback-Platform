# Validation Test Mapping

This document maps the validation suites to functional requirements FR-1 through FR-17.

## Auth

### `tests/validation/auth.validation.test.tsx`

| Requirement | Test case | Status |
|---|---|---|
| FR-1 | `FR-1 allows a user to create an account with an email address and password` | Covered |
| FR-2 | `FR-2 authenticates the user through the login page` | Covered |
| FR-3 | `FR-3 redirects unauthenticated users away from protected dashboard functionality` | Covered |
| FR-4 | `FR-4 prevents unauthenticated users from reaching code submission flow` | Covered |
| FR-4 | `FR-4 prevents unauthenticated users from reaching review submission flow` | Covered |

## Submissions

### `tests/validation/submissions.validation.test.tsx`

| Requirement | Test case | Status |
|---|---|---|
| FR-5 | `FR-5 creates a code submission for an authenticated user and persists optional notes` | Covered |
| FR-6 | `FR-6 requires code text before the submission flow can proceed and always includes a language tag` | Covered |
| FR-6 | `FR-6 keeps contextual notes optional and sends null when the user leaves them blank` | Covered |
| FR-7 | No active validation test yet; submission editing and read-only deadline enforcement are not exposed in the UI | Blocked |
| FR-17 | `FR-17 surfaces a submission deadline error returned by the backend` | Partially covered |

## Lifecycle

### `tests/validation/lifecycle.validation.test.tsx`

| Requirement | Test case | Status |
|---|---|---|
| FR-8 | `FR-8 currently exposes newly assigned review work with an ASSIGNED status in the reviewer queue` | Partially covered |
| FR-8 | No active validation test yet; submission-level Draft, Submitted, Under Review, and Complete states are not implemented | Blocked |
| FR-9 | `FR-9 currently marks the review assignment as completed after a successful review submission` | Partially covered |
| FR-9 | No active validation test yet; review work does not automatically transition to Under Review on assignment or first reviewer action | Blocked |
| FR-9 | No active validation test yet; submission completion is not computed from required review progress | Blocked |

## Reviews

### `tests/validation/reviews.validation.test.tsx`

| Requirement | Test case | Status |
|---|---|---|
| FR-10 | `FR-10 allows an assigned reviewer to submit the currently implemented qualitative review` | Covered |
| FR-11 | `FR-11 requires qualitative feedback in the current UI before a review can be submitted` | Covered |
| FR-11 | `FR-11 allows a reviewer to save a draft with partial rubric values before final submission` | Covered |
| FR-11 | `FR-11 persists checklist selections in the review payload` | Covered |
| FR-12 | `FR-12 submitted reviews become read-only after submission` | Covered |
| FR-12 | `FR-12 blocks attempts to edit a submitted review with clear feedback` | Covered |

Supporting current behavior:

| Related area | Test case | Note |
|---|---|---|
| Review editing | `loads an existing draft review back into the editable form in the current implementation` | Documents pre-submission editing behavior for in-progress reviews |

## Visibility

### `tests/validation/visibility.validation.test.tsx`

| Requirement | Test case | Status |
|---|---|---|
| FR-13 | `FR-13 lets the submission author view completed reviews for their own submissions in read-only mode` | Covered |
| FR-14 | No active validation test yet; the product does not expose a dedicated authored review history view | Blocked |
| FR-15 | `FR-15 blocks unrelated users from viewing a review they are not associated with` | Covered |
| FR-16 | `FR-16 displays the server-generated review timestamp in read-only form alongside the review content` | Partially covered |
| FR-17 | No active validation test yet; review submissions do not yet enforce review deadlines with deadline-specific UI errors | Blocked |

## Notes

- These suites focus on current observable behavior in the existing Next.js and Supabase UI flows.
- `Covered` means the requirement is validated directly by a passing test today.
- `Partially covered` means the suite validates the implemented subset of the requirement but the full requirement is not yet present in the product.
- `Blocked` means the requirement is not fully implemented yet, so the suite records the gap with a skipped test or TODO.

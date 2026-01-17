# Authentication Testing Suite

This document describes the testing infrastructure for the authentication system in the Peer Code Review & Feedback Platform.

## Overview

The testing suite includes:
- **Unit tests** for auth service functions
- **Component/UI tests** for auth pages (login, signup)
- **Mocked Supabase client** to avoid network calls
- **Vitest** as the test runner with jsdom for DOM testing

## Setup

### Install Dependencies

```bash
npm install --legacy-peer-deps
```

The `--legacy-peer-deps` flag is needed due to React 19 compatibility with testing libraries.

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Architecture

### Auth Service (lib/authService.ts)

A typed wrapper around Supabase auth methods that returns consistent `{ data, error }` results:

- `signUp(email, password)` - Create new account
- `signIn(email, password)` - Login user
- `signOut()` - Logout user
- `getSession()` - Get current session
- `getUser()` - Get current user
- `resetPasswordForEmail(email)` - Send reset password email
- `updatePassword(newPassword)` - Update user password

All functions return `AuthResult<T>` with typed data or error.

### Mocking Strategy (test/mocks/supabaseClientMock.ts)

The mock Supabase client provides:

1. **Configurable responses** per test
2. **Default success behaviors** for common operations
3. **Error shapes** matching Supabase AuthApiError

```typescript
import { createMockSupabaseClient } from '@/test/mocks/supabaseClientMock'

// Use in tests:
vi.mocked(supabaseModule.supabase.auth.signUp).mockResolvedValueOnce({
  data: { user: null, session: null },
  error: { message: 'Custom error' }
})
```

### Test Structure

#### Unit Tests (lib/__tests__/authService.test.ts)

Tests each auth service function in isolation:
- Correct method calls with correct arguments
- Success and error scenarios
- Edge cases (null values, network errors)

```typescript
it('should successfully sign up a new user', async () => {
  const result = await authService.signUp('test@example.com', 'password123')
  expect(result.error).toBeNull()
  expect(result.data?.user.email).toBe('test@example.com')
})
```

#### Component Tests (app/**/__tests__/page.test.tsx)

Tests auth pages (signup, login) with user interactions:
- Form rendering
- Field validation
- API call flow
- Success/error states
- Navigation

```typescript
it('should successfully sign up and show success message', async () => {
  const user = userEvent.setup()
  render(<SignupPage />)

  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.click(screen.getByRole('button', { name: /sign up/i }))

  await waitFor(() => {
    expect(screen.getByText(/check your email/i)).toBeInTheDocument()
  })
})
```

## Test Coverage

### Auth Service

- ✅ Signup (success, duplicate email, weak password)
- ✅ Login (success, invalid credentials)
- ✅ Logout
- ✅ Get session (exists, doesn't exist, errors)
- ✅ Get user
- ✅ Reset password
- ✅ Update password

### Signup Page

- ✅ Render form
- ✅ Redirect when already logged in
- ✅ Successful signup with success message
- ✅ Failed signup with error message
- ✅ Email format validation
- ✅ Password length validation
- ✅ Loading state
- ✅ Link to login page

### Login Page

- ✅ Render form
- ✅ Redirect when already logged in
- ✅ Successful login with redirect
- ✅ Failed login with error message
- ✅ Email format validation
- ✅ Password requirement
- ✅ Loading state
- ✅ Link to signup page

## Key Design Decisions

1. **No Network Calls**: All Supabase calls are mocked. Tests run fast and reliably offline.

2. **Consistent Error Handling**: Auth service always returns `{ data, error }` for consistency.

3. **Mock at Module Boundary**: We mock `lib/supabaseClient` so tests import the same interface as production code.

4. **User-Centric Tests**: Component tests use `userEvent` instead of `fireEvent` for more realistic interactions.

5. **Type Safety**: Full TypeScript support in tests with proper types for all mock data.

## Extending Tests

### Adding a New Auth Function

1. Add function to `lib/authService.ts`
2. Add mock methods to `test/mocks/supabaseClientMock.ts`
3. Write unit tests in `lib/__tests__/authService.test.ts`
4. If used in a page, add component tests

### Adding Tests for a New Page

1. Create `app/[page]/__tests__/page.test.tsx`
2. Mock auth service or supabase client
3. Test user interactions and outcomes
4. Verify API calls and state changes

## Troubleshooting

### Tests not running

Make sure you have the correct vitest configuration:
- `vitest.config.ts` exists
- `test/setup.ts` exists
- Dependencies are installed with `npm install --legacy-peer-deps`

### Import errors

Check that:
- All imports use `@/` alias (configured in vitest.config.ts)
- Mock paths match actual file structure
- Environment variables are set in test/setup.ts

### Type errors in tests

Ensure:
- `@types/vitest` is available (included in vitest)
- `@testing-library/jest-dom` types are imported in setup.ts
- TypeScript version is 5.0+

## CI/CD Integration

To run tests in CI:

```yaml
- name: Run tests
  run: npm test -- --run  # --run flag exits after completion
```

To generate coverage:

```yaml
- name: Generate coverage
  run: npm run test:coverage
```

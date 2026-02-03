# Reviewer Selection Implementation Summary

## Overview
Replaced hardcoded reviewer list with real-time data from Supabase `user_directory` table.

---

## Files Changed

### 1. **New File**: `lib/hooks/useReviewers.ts`
Custom React hook that fetches available reviewers from the database.

**Key Features:**
- Fetches reviewers from `user_directory` table
- Automatically excludes the current logged-in user
- Provides loading and error states
- Orders reviewers alphabetically by display name
- Returns type-safe data with TypeScript interfaces

**Supabase Query:**
```typescript
const { data, error } = await supabase
  .from('user_directory')
  .select('user_id, display_name')
  .neq('user_id', user.id)  // Exclude current user
  .order('display_name', { ascending: true })
```

---

### 2. **Updated**: `app/assignments/new/page.tsx`
Replaced mock data with real database query using the `useReviewers` hook.

**Changes:**
- ✅ Removed hardcoded `mockReviewers` array
- ✅ Imported and used `useReviewers()` hook
- ✅ Added loading state: "Loading available reviewers..."
- ✅ Added error state with retry button
- ✅ Added empty state: "No other users available..."
- ✅ Disabled "Confirm Assignments" button during loading
- ✅ Kept all existing UI behavior (chip selection, counter)

**UI States:**
1. **Loading**: Shows loading message while fetching
2. **Error**: Shows error message with retry button
3. **Empty**: Shows message when no reviewers available
4. **Success**: Shows reviewer chips (existing behavior)

---

### 3. **New File**: `supabase/user_directory_rls_policy.sql`
Row Level Security policy for the `user_directory` table.

**Policy Details:**
```sql
CREATE POLICY "Authenticated users can view user directory"
ON user_directory
FOR SELECT
TO authenticated
USING (true);
```

**What it does:**
- Enables all authenticated users to read from `user_directory`
- Only grants SELECT (read) permission
- Required for reviewer selection to work
- Does not expose sensitive data (only user_id and display_name)

**How to apply:**
Run this SQL in your Supabase SQL Editor or through migrations.

---

## Database Requirements

### Table: `user_directory`
Must exist with the following structure:

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Primary key, references auth.users |
| `display_name` | text | User's display name |
| `created_at` | timestamp | Row creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

### RLS Policy Required
The SQL policy in `supabase/user_directory_rls_policy.sql` must be applied to enable SELECT access for authenticated users.

---

## Testing Checklist

- [ ] Apply RLS policy: Run `supabase/user_directory_rls_policy.sql`
- [ ] Verify `user_directory` table exists and has data
- [ ] Test as authenticated user: reviewers should load
- [ ] Verify current user is excluded from list
- [ ] Test loading state (slow network simulation)
- [ ] Test error state (disconnect from Supabase)
- [ ] Test empty state (user_directory with only 1 user)
- [ ] Test reviewer selection/deselection still works
- [ ] Verify "Confirm Assignments" button behavior

---

## Architecture Benefits

1. **Separation of Concerns**: Data fetching logic isolated in custom hook
2. **Reusability**: `useReviewers` can be used in other components
3. **Type Safety**: Full TypeScript support with interfaces
4. **User Experience**: Loading/error/empty states for all scenarios
5. **Security**: RLS enforced at database level, not frontend trust
6. **Performance**: Single query with filters and sorting on server

---

## Next Steps (Optional Enhancements)

1. **Add pagination** if user count grows large
2. **Add search/filter** by display name
3. **Add role filtering** (students only, exclude admins)
4. **Cache results** with React Query or SWR
5. **Add refresh button** to manually refetch reviewers
6. **Show user avatars** if available in user_directory

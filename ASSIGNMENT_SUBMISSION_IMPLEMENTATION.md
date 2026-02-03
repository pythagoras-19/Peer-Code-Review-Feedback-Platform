# Assignment Submission Flow Implementation

## Overview
Implemented the complete end-to-end assignment submission flow with atomic transactions, RLS policies, and real-time reviewer assignment queries.

---

## Files Created/Modified

### 1. **SQL Files**

#### `supabase/create_submission_rpc.sql`
PostgreSQL RPC function that atomically creates a submission and assigns reviewers.

**Function Signature:**
```sql
create_submission_and_assign_reviewers(
  p_assignment_id uuid,
  p_language text,
  p_code_text text,
  p_notes text DEFAULT NULL,
  p_reviewer_ids uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS uuid
```

**Validations Enforced:**
- ✅ User must be authenticated
- ✅ Reviewer list cannot be empty
- ✅ No self-review (author cannot be in reviewer list)
- ✅ All reviewers must exist in `user_directory`

**What it does:**
1. Validates inputs
2. Inserts row into `submissions` table
3. Inserts rows into `review_assignments` for each reviewer
4. Returns the submission ID
5. All operations are atomic (transaction)

**Security:**
- Uses `SECURITY DEFINER` to bypass RLS during insertion
- Validates authenticated user via `auth.uid()`
- Enforces business rules at database level

---

#### `supabase/submissions_and_review_assignments_rls.sql`
Comprehensive RLS policies for three tables: `submissions`, `review_assignments`, and `assignments`.

**Submissions Policies:**
1. `Authors can insert their own submissions` - INSERT policy (author_id = auth.uid())
2. `Authors can read their own submissions` - SELECT policy for authors only
3. `Reviewers can read assigned submissions` - SELECT policy for reviewers (via review_assignments join)
4. `Authors can update their own submissions` - UPDATE policy **with immutability enforcement**
   - **Immutable fields**: `author_id`, `assignment_id` (cannot be changed after creation)
   - **Mutable fields**: `code_text`, `notes`, `updated_at`

**Review Assignments Policies:**
1. `RPC can insert review assignments` - INSERT policy **BLOCKS all direct inserts** (WITH CHECK false)
   - **Critical**: Only the RPC function can insert via SECURITY DEFINER
2. `Reviewers can read their own review assignments` - SELECT policy
3. `Authors can read review assignments for their submissions` - SELECT policy (allows authors to see reviewers)
4. `Reviewers can update their own review assignments` - UPDATE policy **with immutability enforcement**
   - **Immutable fields**: `reviewer_id`, `submission_id` (cannot be changed after creation)
   - **Mutable fields**: `status`, `updated_at`

**Assignments Policies:**
1. `Users can insert their own assignments` - INSERT policy
2. `Users can read their own assignments` - SELECT policy
3. `Users can update their own assignments` - UPDATE policy

**Key Security Features:**
- ✅ Authors CANNOT read submissions they didn't author (unless assigned as reviewer)
- ✅ Nobody can INSERT directly into review_assignments - must use RPC
- ✅ The INSERT policy `WITH CHECK (false)` ensures 100% enforcement
- ✅ **Ownership fields are immutable via UPDATE policies**:
  - `author_id` and `assignment_id` in submissions cannot be changed
  - `reviewer_id` and `submission_id` in review_assignments cannot be changed
- ✅ **Performance optimized** with indexes on critical queries:
  - Dashboard query index: `(reviewer_id, assigned_at DESC)`
  - RLS policy index: `(submission_id, reviewer_id)`
  - Author submissions index: `(author_id, created_at DESC)`

---

### 2. **TypeScript Hook: `lib/hooks/useReviewAssignments.ts`**

Custom React hook for fetching review assignments with full context.

**Features:**
- Fetches review assignments for current user
- Joins with `submissions`, `assignments`, and `user_directory` tables
- Returns assignment title, author name, language, code preview
- Provides loading, error states, and refetch function
- Properly handles component unmounting (cancellation)

**Query Structure:**
```typescript
supabase
  .from('review_assignments')
  .select(`
    id, submission_id, reviewer_id, status, assigned_at,
    submissions (
      id, language, code_text, author_id, assignment_id,
      assignments (title),
      user_directory!submissions_author_id_fkey (display_name)
    )
  `)
  .eq('reviewer_id', user.id)
  .order('assigned_at', { ascending: false })
```

**Return Type:**
```typescript
{
  reviewAssignments: ReviewAssignment[]
  loading: boolean
  error: string | null
  refetch: () => void
}
```

---

### 3. **Updated: `app/assignments/new/page.tsx`**

Complete implementation of the submission flow with reviewer assignment.

**New Features:**
- ✅ Added `assignmentDescription` field (optional)
- ✅ Added `notes` field (optional, for reviewers)
- ✅ Form validation before proceeding to reviewer selection
- ✅ Integrated `useReviewers()` hook for reviewer list
- ✅ Loading state during submission (`isSubmitting`)
- ✅ Error state display with retry option
- ✅ Two-step atomic submission:
  1. Create assignment in `assignments` table
  2. Call RPC to create submission + review assignments
- ✅ Redirect to dashboard on success
- ✅ All buttons disabled during submission

**Submission Flow:**
1. User fills in: title, description, language, code, notes
2. User clicks "Assign Reviewers"
3. User selects reviewers from list (excluding self)
4. User clicks "Confirm Assignments"
5. Creates assignment → calls RPC → redirects to dashboard

**Error Handling:**
- Network errors
- RPC validation errors (empty reviewers, self-review, etc.)
- Supabase errors
- All errors displayed to user with clear messages

---

### 4. **Updated: `app/dashboard/page.tsx`**

Integrated real review assignments from database.

**Changes:**
- ✅ Removed hardcoded `mockReviews` data
- ✅ Imported and used `useReviewAssignments()` hook
- ✅ Added loading state for reviews section
- ✅ Added error state display
- ✅ Added empty state when no reviews assigned
- ✅ Displays real data: assignment title, author, language, status, date
- ✅ Links to individual review page via review assignment ID

**Display Fields:**
- Assignment Title
- Author Display Name
- Programming Language
- Review Status (assigned, in progress, completed)
- Assigned Date

---

## Database Schema Requirements

### Required Tables

#### `assignments`
```sql
- id (uuid, PK)
- created_by (uuid, FK → user_profiles.user_id)
- title (text)
- description (text)
- submit_due (timestamp, optional)
- review_due (timestamp, optional)
- reviews_required (integer, optional)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `submissions`
```sql
- id (uuid, PK)
- assignment_id (uuid, FK → assignments.id)
- author_id (uuid, FK → user_profiles.user_id)
- language (text)
- code_text (text)
- notes (text, optional)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `review_assignments`
```sql
- id (uuid, PK)
- submission_id (uuid, FK → submissions.id)
- reviewer_id (uuid, FK → user_profiles.user_id)
- status (text, default: 'assigned')
- assigned_at (timestamp)
- updated_at (timestamp)
- UNIQUE(submission_id, reviewer_id)
```

#### `user_directory`
```sql
- user_id (uuid, PK, FK → auth.users)
- display_name (text)
- created_at (timestamp)
- updated_at (timestamp)
```

---

## Setup Instructions

### Step 1: Apply SQL Policies
Run these SQL files in your Supabase SQL Editor **in this order**:

1. First, ensure tables exist (check schema)
2. Run `supabase/user_directory_rls_policy.sql`
3. Run `supabase/submissions_and_review_assignments_rls.sql`
4. Run `supabase/create_submission_rpc.sql`

### Step 2: Verify Policies
Test RLS policies:
```sql
-- As an authenticated user, verify you can:
SELECT * FROM user_directory; -- See all users
SELECT * FROM submissions WHERE author_id = auth.uid(); -- See own submissions
SELECT * FROM review_assignments WHERE reviewer_id = auth.uid(); -- See assigned reviews
```

### Step 3: Test RPC Function
```sql
-- Test the RPC function (replace UUIDs with real values)
SELECT create_submission_and_assign_reviewers(
  'assignment-uuid'::uuid,
  'javascript',
  'function hello() { return "world"; }',
  'Please review my code',
  ARRAY['reviewer1-uuid'::uuid, 'reviewer2-uuid'::uuid]
);
```

### Step 4: Test Frontend Flow
1. Log in as a user
2. Navigate to `/assignments/new`
3. Fill in assignment details
4. Select reviewers
5. Click "Confirm Assignments"
6. Verify redirect to dashboard
7. Check "Reviews Assigned To Me" section

---

## Testing Checklist

### Database Layer
- [ ] RPC function rejects empty reviewer list
- [ ] RPC function rejects self-review
- [ ] RPC function rejects invalid reviewer IDs
- [ ] RPC function successfully creates submission + assignments
- [ ] RLS policies allow authors to read own submissions
- [ ] RLS policies allow reviewers to read assigned submissions
- [ ] RLS policies prevent unauthorized access
- [ ] **Direct INSERT into review_assignments is BLOCKED**
- [ ] **Authors cannot read other authors' submissions (unless reviewer)**
- [ ] Verify `WITH CHECK (false)` policy blocks all direct inserts

### Frontend Layer
- [ ] Reviewer list loads from database
- [ ] Current user excluded from reviewer list
- [ ] Form validation works (title, code required)
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Submission succeeds with valid data
- [ ] Dashboard shows real review assignments
- [ ] Review assignment cards display correct data

### Integration
- [ ] End-to-end: create assignment → submit code → assign reviewers
- [ ] Verify submission appears in database
- [ ] Verify review assignments created
- [ ] Verify reviewers see assignments on dashboard
- [ ] Verify authors can see their submissions

---

## Security Guarantees

1. **No Trust in Frontend**: All validation at database level
2. **RLS Enforced**: Users can only see data they own or are assigned
3. **Atomic Operations**: Submission + assignments created together or not at all
4. **No Self-Review**: Enforced by RPC function
5. **Authenticated Only**: All operations require valid session
6. **Immutable FKs**: assignment_id, author_id, reviewer_id cannot be changed after creation
7. **RPC-Only Inserts**: Direct INSERT into review_assignments is BLOCKED via `WITH CHECK (false)`
8. **Author Isolation**: Authors cannot read other authors' submissions unless assigned as reviewer
9. **SECURITY DEFINER**: RPC function bypasses RLS but validates auth.uid() and enforces business rules
10. **Column-Level Immutability**: Column privileges (GRANT/REVOKE) enforce immutability of ownership fields
11. **Minimal RLS Policies**: Row-level authorization only; no WITH CHECK subqueries on UPDATE
12. **Performance Optimized**: Indexes on all critical queries for dashboard and RLS policies

---

## Architecture Benefits

1. **Database-First**: Business logic enforced server-side
2. **Type Safety**: Full TypeScript interfaces throughout
3. **Separation of Concerns**: Hooks handle data, components handle UI
4. **Atomic Transactions**: No partial submissions possible
5. **Reusable Components**: Hooks can be used in multiple pages
6. **Error Resilience**: Comprehensive error handling at every layer
7. **Performance**: Single queries with joins vs multiple round trips

---

## Known Limitations & Future Enhancements

### Current Limitations
- No edit functionality after submission
- No delete functionality for submissions
- No pagination for large reviewer lists
- No search/filter for reviewers
- Mock data still used for "My Assignments" section

### Planned Enhancements
1. **Assignment Management**: Fetch real assignments from database
2. **Submission Editing**: Allow authors to update before review deadline
3. **Review Deletion**: Allow authors to unassign reviewers if status = 'assigned'
4. **Pagination**: Add for reviewer list and review assignments
5. **Search/Filter**: Add for reviewers by name or role
6. **Status Updates**: Allow reviewers to update review status
7. **Real-time Updates**: Add Supabase subscriptions for live updates
8. **File Uploads**: Support file attachments alongside code text
9. **Notifications**: Email/push notifications when reviews assigned

---

## Troubleshooting

### "Not authenticated" error
- Verify user is logged in
- Check `supabase.auth.getUser()` returns valid user

### "Reviewer list cannot be empty" error
- Ensure at least one reviewer selected
- Check `selectedReviewers` Set is populated

### "Cannot assign yourself as a reviewer" error
- RPC function detected author in reviewer list
- Verify `useReviewers()` excludes current user

### "Failed to fetch review assignments" error
- Check RLS policies applied correctly
- Verify foreign key relationships exist
- Check user_directory has display_name column

### Review assignments not showing on dashboard
- Verify RLS policy allows SELECT on review_assignments
- Check joins are correct (submissions → assignments → user_directory)
- Ensure user_directory table populated with all users

### "new row violates row-level security policy" when trying to insert review_assignments
- **This is expected behavior!** Direct INSERT is blocked
- Use the RPC function: `create_submission_and_assign_reviewers()`
- The RPC uses SECURITY DEFINER to bypass RLS with proper validation

### "Failed to create submission" from RPC
- Check all parameters are correct types (UUIDs, text, arrays)
- Verify assignment_id exists in assignments table
- Ensure all reviewer_ids exist in user_directory
- Check that author is not in reviewer list

---

## API Reference

### RPC Function
```typescript
supabase.rpc('create_submission_and_assign_reviewers', {
  p_assignment_id: string (uuid),
  p_language: string,
  p_code_text: string,
  p_notes: string | null,
  p_reviewer_ids: string[] (uuid[])
})
```

### Hooks

#### `useReviewers()`
```typescript
{
  reviewers: Reviewer[]
  loading: boolean
  error: string | null
}
```

#### `useReviewAssignments()`
```typescript
{
  reviewAssignments: ReviewAssignment[]
  loading: boolean
  error: string | null
  refetch: () => void
}
```

---

## Next Steps

1. Apply SQL files to Supabase
2. Test RPC function manually
3. Test frontend flow end-to-end
4. Populate user_directory with test users
5. Create test assignments and submissions
6. Verify dashboard displays correctly
7. Consider implementing enhancements listed above

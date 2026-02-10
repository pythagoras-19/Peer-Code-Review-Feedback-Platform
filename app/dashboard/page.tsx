'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { useReviewAssignments } from '@/lib/hooks/useReviewAssignments'

const mockActivities = [
  'You submitted "Binary Search Tree Implementation"',
  'You received 2 reviews on "REST API Design"',
  'You completed a review for "Algorithm Optimization"',
  'New assignment "Database Normalization Exercise" assigned'
]

type DirectoryUser = {
  user_id: string
  display_name: string
}

type Assignment = {
  id: string
  title: string
}

type MyAssignment = {
  id: string
  title: string
  description: string
  submit_due: string
  review_due: string
  reviews_required: number
  created_at: string
}

type SubmissionRow = {
  id: string
  language: string
  created_at: string
  code_text: string
  assignment: Assignment | null
}

type SubmissionItem = {
  id: string
  assignmentTitle: string
  language: string
  createdAt: string
  codeLength: number
}

export default function DashboardPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')

  const { reviewAssignments, loading: reviewsLoading, error: reviewsError } =
    useReviewAssignments()

  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [submissionsError, setSubmissionsError] = useState('')

  const [assignments, setAssignments] = useState<MyAssignment[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)
  const [assignmentsError, setAssignmentsError] = useState('')

  // Session check
  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getUser()

      if (cancelled) return

      if (error || !data.user) {
        router.push('/login')
      } else {
        setUserEmail(data.user.email || 'User')
        setCurrentUserId(data.user.id)
        setLoading(false)
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  // Fetch available reviewers
  useEffect(() => {
    if (!currentUserId) return

    let cancelled = false

    const fetchUsers = async () => {
      setUsersLoading(true)
      setUsersError('')

      const { data, error } = await supabase
        .from('user_directory')
        .select('user_id, display_name')
        .neq('user_id', currentUserId)

      if (cancelled) return

      if (error) {
        setUsersError(error.message)
      } else {
        setUsers(data || [])
      }

      setUsersLoading(false)
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  // Fetch my submissions
  useEffect(() => {
    if (!currentUserId) return

    let cancelled = false

    const fetchSubmissions = async () => {
      setSubmissionsLoading(true)
      setSubmissionsError('')

      const { data, error } = await supabase
        .from('submissions')
        .select(
          `
            id,
            language,
            created_at,
            code_text,
            assignment:assignments!submissions_assignment_id_fkey (
              id,
              title
            )
          `
        )
        .eq('author_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (cancelled) return

      if (error) {
        console.error(error)
        setSubmissionsError('Unable to load submissions right now.')
      } else {
        const rows = (data || []) as SubmissionRow[]
        const items: SubmissionItem[] = rows.map((row) => ({
          id: row.id,
          assignmentTitle: row.assignment?.title ?? 'Unknown',
          language: row.language,
          createdAt: row.created_at,
          codeLength: row.code_text?.length ?? 0,
        }))
        setSubmissions(items)
      }

      setSubmissionsLoading(false)
    }

    fetchSubmissions()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  // Fetch my assignments
  useEffect(() => {
    if (!currentUserId) return

    let cancelled = false

    const fetchAssignments = async () => {
      setAssignmentsLoading(true)
      setAssignmentsError('')

      const { data, error } = await supabase
        .from('assignments')
        .select('id,title,description,submit_due,review_due,reviews_required,created_at')
        .eq('created_by', currentUserId)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        console.log('Error loading assignments:', error)
        setAssignmentsError(error.message)
      } else {
        setAssignments((data || []) as MyAssignment[])
      }

      setAssignmentsLoading(false)
    }

    fetchAssignments()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-loading">Loading...</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-welcome">Welcome back, {userEmail}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Log out
          </button>
        </div>

        <div className="dashboard-actions">
          <Link href="/assignments/create" className="btn btn-primary">
            Create Assignment
          </Link>
          <Link href="/assignments/new" className="btn btn-primary">
            Start Assignment
          </Link>
          <Link href="/reviews" className="btn btn-primary">
            Review Assigned Code
          </Link>
          <Link href="/reviews/mine" className="btn btn-primary">
            Read My Reviews
          </Link>
        </div>

        <div className="dashboard-layout">
          <div className="dashboard-grid">
            {/* My Assignments (mock for MVP) */}
            <section className="dashboard-section">
              <h2 className="section-title">My Assignments</h2>
              <div className="section-content">
                {assignmentsLoading ? (
                  <p>Loading assignments...</p>
                ) : assignmentsError ? (
                  <p>Error: {assignmentsError}</p>
                ) : assignments.length === 0 ? (
                  <p>No assignments yet. Create one to get started.</p>
                ) : (
                  assignments.map((assignment) => {
                    const description = assignment.description?.trim()
                    const shortDescription = description
                      ? description.length > 140
                        ? `${description.slice(0, 140)}...`
                        : description
                      : ''

                    return (
                      <div key={assignment.id} className="dashboard-card">
                        <h3 className="card-title">{assignment.title}</h3>
                        {shortDescription && (
                          <p className="card-details">{shortDescription}</p>
                        )}
                        <p>
                          <strong>Submit Due:</strong>{' '}
                          {new Date(assignment.submit_due).toLocaleDateString()}
                        </p>
                        <p>
                          <strong>Review Due:</strong>{' '}
                          {new Date(assignment.review_due).toLocaleDateString()}
                        </p>
                        <p>
                          <strong>Reviews Required:</strong>{' '}
                          {assignment.reviews_required}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            {/* Reviews Assigned To Me */}
            <section className="dashboard-section">
              <h2 className="section-title">Reviews Assigned To Me</h2>
              <div className="section-content">
                {reviewsLoading ? (
                  <p>Loading reviews...</p>
                ) : reviewsError ? (
                  <p>Error: {reviewsError}</p>
                ) : reviewAssignments.length === 0 ? (
                  <p>No reviews assigned yet.</p>
                ) : (
                  reviewAssignments.map((review) => (
                    <div key={review.id} className="dashboard-card">
                      <h3>{review.assignment_title}</h3>
                      <p><strong>Author:</strong> {review.author_display_name}</p>
                      <p><strong>Language:</strong> {review.language}</p>
                      <p><strong>Status:</strong> {review.status}</p>
                      <p>
                        <strong>Assigned:</strong>{' '}
                        {new Date(review.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent Activity (mock) */}
            <section className="dashboard-section">
              <h2 className="section-title">Recent Activity</h2>
              <ul className="activity-list">
                {mockActivities.map((activity, i) => (
                  <li key={i}>{activity}</li>
                ))}
              </ul>
            </section>

            {/* My Submissions */}
            <section className="dashboard-section">
              <h2 className="section-title">My Submissions</h2>
              <div className="section-content">
                {submissionsLoading ? (
                  <p>Loading submissions...</p>
                ) : submissionsError ? (
                  <p>{submissionsError}</p>
                ) : submissions.length === 0 ? (
                  <p>No submissions yet.</p>
                ) : (
                  <ul className="activity-list">
                    {submissions.map((submission) => (
                      <li key={submission.id}>
                        <strong>Assignment:</strong>{' '}
                        {submission.assignmentTitle} |{' '}
                        <strong>Language:</strong> {submission.language} |{' '}
                        <strong>Created:</strong>{' '}
                        {new Date(submission.createdAt).toLocaleDateString('en-US')} |{' '}
                        <strong>Code length:</strong> {submission.codeLength}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="dashboard-sidebar">
            <section className="dashboard-section">
              <h2 className="section-title">Available Reviewers</h2>
              <div className="section-content">
                {usersLoading ? (
                  <p>Loading...</p>
                ) : usersError ? (
                  <p>{usersError}</p>
                ) : users.length === 0 ? (
                  <p>No users available</p>
                ) : (
                  <ul>
                    {users.map((user) => (
                      <li key={user.user_id}>{user.display_name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
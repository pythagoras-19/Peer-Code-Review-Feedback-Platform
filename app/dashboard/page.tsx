'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { useReviewAssignments } from '@/lib/hooks/useReviewAssignments'

// Mock data (MVP only)
const mockAssignments = [
  {
    id: 1,
    title: 'Binary Search Tree Implementation',
    submitDue: 'Jan 20, 2026',
    reviewDue: 'Jan 25, 2026'
  },
  {
    id: 2,
    title: 'REST API Design',
    submitDue: 'Jan 28, 2026',
    reviewDue: 'Feb 2, 2026'
  },
  {
    id: 3,
    title: 'Database Normalization Exercise',
    submitDue: 'Feb 5, 2026',
    reviewDue: 'Feb 10, 2026'
  }
]

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

type Author = {
  display_name: string
}

type SubmissionRow = {
  id: string
  assignment_id: string
  author_id: string
  language: string
  created_at: string
  code_text: string
  assignments: Assignment[] | null
  user_profiles: Author[] | null
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

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [submissionsError, setSubmissionsError] = useState('')

  // Session check
  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (cancelled) return

      if (!data.session) {
        router.push('/login')
      } else {
        setUserEmail(data.session.user.email || 'User')
        setCurrentUserId(data.session.user.id)
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
        .select(`
          id,
          assignment_id,
          language,
          created_at,
          code_text,
          author_id,
          assignments (id, title),
          user_profiles!submissions_author_id_fkey (display_name)
        `)
        .eq('author_id', currentUserId)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        setSubmissionsError(error.message)
      } else {
        setSubmissions((data || []) as SubmissionRow[])
      }

      setSubmissionsLoading(false)
    }

    fetchSubmissions()

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
          <Link href="/assignments/create" className="btn btn-secondary">
            Create Assignment
          </Link>
          <Link href="/assignments/new" className="btn btn-primary">
            Start Assignment
          </Link>
          <Link href="/reviews" className="btn btn-primary">
            Review Assigned Code
          </Link>
        </div>

        <div className="dashboard-layout">
          <div className="dashboard-grid">
            {/* My Assignments (mock for MVP) */}
            <section className="dashboard-section">
              <h2 className="section-title">My Assignments</h2>
              <div className="section-content">
                {mockAssignments.map((assignment) => (
                  <div key={assignment.id} className="dashboard-card">
                    <h3 className="card-title">{assignment.title}</h3>
                    <p><strong>Submit Due:</strong> {assignment.submitDue}</p>
                    <p><strong>Review Due:</strong> {assignment.reviewDue}</p>
                  </div>
                ))}
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
                  <p>Loading...</p>
                ) : submissionsError ? (
                  <p>{submissionsError}</p>
                ) : submissions.length === 0 ? (
                  <p>No submissions yet</p>
                ) : (
                  <ul className="activity-list">
                    {submissions.map((submission) => (
                      <li key={submission.id}>
                        <strong>Assignment:</strong>{' '}
                        {submission.assignments?.[0]?.title ?? 'Unknown'} |{' '}
                        <strong>Language:</strong> {submission.language} |{' '}
                        <strong>Created:</strong>{' '}
                        {new Date(submission.created_at).toLocaleDateString()} |{' '}
                        <strong>Code length:</strong> {submission.code_text.length}
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
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'

// Mock data
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

const mockReviews = [
  {
    id: 1,
    assignmentTitle: 'Binary Search Tree Implementation',
    status: 'ASSIGNED'
  },
  {
    id: 2,
    assignmentTitle: 'Algorithm Optimization',
    status: 'DRAFT'
  },
  {
    id: 3,
    assignmentTitle: 'Code Refactoring Challenge',
    status: 'SUBMITTED'
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

type SubmissionRow = {
  id: string
  assignment_id: string
  author_id: string
  language: string
  created_at: string
  code_text: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string>('')

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [submissionsError, setSubmissionsError] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()

        if (cancelled) return

        if (!data.session) {
          router.push('/login')
        } else {
          setUserEmail(data.session.user.email || 'User')
          setCurrentUserId(data.session.user.id)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error checking session:', err)
        if (!cancelled) {
          router.push('/login')
        }
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!currentUserId) return

    let cancelled = false

    const fetchUsers = async () => {
      setUsersLoading(true)
      setUsersError('')

      try {
        const { data, error } = await supabase
          .from('user_directory')
          .select('user_id, display_name')
          .neq('user_id', currentUserId)

        if (cancelled) return

        if (error) {
          setUsersError(`Failed to load users: ${error.message}`)
          console.error('Error fetching users:', error)
        } else {
          setUsers((data || []) as DirectoryUser[])
        }
      } catch (err) {
        if (!cancelled) {
          setUsersError(`Failed to load users: ${String(err)}`)
          console.error('Error fetching users:', err)
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return

    let cancelled = false

    const fetchSubmissions = async () => {
      setSubmissionsLoading(true)
      setSubmissionsError('')

      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('id, assignment_id, language, created_at, code_text, author_id')
          .eq('author_id', currentUserId)
          .order('created_at', { ascending: false })

        if (cancelled) return

        if (error) {
          setSubmissionsError(`Failed to load submissions: ${error.message}`)
          console.error('Error fetching submissions:', error)
        } else {
          setSubmissions((data || []) as SubmissionRow[])
        }
      } catch (err) {
        if (!cancelled) {
          setSubmissionsError(`Failed to load submissions: ${String(err)}`)
          console.error('Error fetching submissions:', err)
        }
      } finally {
        if (!cancelled) {
          setSubmissionsLoading(false)
        }
      }
    }

    fetchSubmissions()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Error logging out:', err)
    }
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
            {process.env.NODE_ENV === 'development' && (
              <p style={{ fontSize: '12px', color: '#666' }}>User ID: {currentUserId}</p>
            )}
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Log out
          </button>
        </div>

        <div className="dashboard-actions">
          <Link href="/assignments/new" className="btn btn-primary">
            Start Assignment
          </Link>
          <Link href="/reviews" className="btn btn-primary">
            Review Assigned Code
          </Link>
        </div>

        <div className="dashboard-layout">
          <div className="dashboard-grid">
            {/* My Assignments */}
            <section className="dashboard-section">
              <h2 className="section-title">My Assignments</h2>
              <div className="section-content">
                {mockAssignments.map((assignment) => (
                  <div key={assignment.id} className="dashboard-card">
                    <h3 className="card-title">{assignment.title}</h3>
                    <div className="card-details">
                      <p>
                        <strong>Submit Due:</strong> {assignment.submitDue}
                      </p>
                      <p>
                        <strong>Review Due:</strong> {assignment.reviewDue}
                      </p>
                    </div>
                    <Link href={`/assignments/${assignment.id}`} className="btn btn-primary btn-small">
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* Reviews Assigned To Me */}
            <section className="dashboard-section">
              <h2 className="section-title">Reviews Assigned To Me</h2>
              <div className="section-content">
                {mockReviews.map((review) => (
                  <div key={review.id} className="dashboard-card">
                    <h3 className="card-title">{review.assignmentTitle}</h3>
                    <div className="card-details">
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className={`status-badge status-${review.status.toLowerCase()}`}>
                          {review.status}
                        </span>
                      </p>
                    </div>
                    <Link href={`/reviews/${review.id}`} className="btn btn-primary btn-small">
                      Start Review
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Activity */}
            <section className="dashboard-section">
              <h2 className="section-title">Recent Activity</h2>
              <div className="section-content">
                <ul className="activity-list">
                  {mockActivities.map((activity, index) => (
                    <li key={index} className="activity-item">
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* My Submissions */}
            <section className="dashboard-section">
              <h2 className="section-title">My Submissions</h2>
              <div className="section-content">
                {submissionsLoading ? (
                  <div className="dashboard-loading">Loading...</div>
                ) : submissionsError ? (
                  <div className="dashboard-error">{submissionsError}</div>
                ) : submissions.length === 0 ? (
                  <p className="empty-state">No submissions yet</p>
                ) : (
                  <ul className="activity-list">
                    {submissions.map((submission) => (
                      <li key={submission.id} className="activity-item">
                        <strong>ID:</strong> {submission.id} | <strong>Assignment:</strong>{' '}
                        {submission.assignment_id} | <strong>Author:</strong> {submission.author_id} |{' '}
                        <strong>Language:</strong> {submission.language} | <strong>Created:</strong>{' '}
                        {new Date(submission.created_at).toLocaleDateString()} | <strong>Code length:</strong>{' '}
                        {submission.code_text.length} chars
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          {/* Available Reviewers Sidebar */}
          <aside className="dashboard-sidebar">
            <section className="dashboard-section">
              <h2 className="section-title">Available Reviewers</h2>
              <div className="section-content">
                {usersLoading ? (
                  <div className="dashboard-loading">Loading...</div>
                ) : usersError ? (
                  <div className="dashboard-error">{usersError}</div>
                ) : users.length === 0 ? (
                  <p className="empty-state">No users available</p>
                ) : (
                  <ul className="user-list">
                    {users.map((user) => (
                      <li key={user.user_id} className="user-item">
                        <div className="user-card">
                          <span className="user-name">{user.display_name}</span>
                        </div>
                      </li>
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
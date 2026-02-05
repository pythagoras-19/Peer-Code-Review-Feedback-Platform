'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'

type ReviewRow = {
  id: string
  overall_comment: string
  created_at: string
}

type ReviewAssignmentRow = {
  id: string
  status: string
  reviewer_id: string
  reviews: ReviewRow[] | null
}

type SubmissionRow = {
  id: string
  language: string
  created_at: string
  assignment: {
    id: string
    title: string
  } | null
  review_assignments: ReviewAssignmentRow[] | null
}

type FlatReview = {
  reviewId: string
  overallComment: string
  reviewCreatedAt: string
  reviewStatus: string
  reviewerId: string
  assignmentTitle: string
  submissionLanguage: string
}

export default function MySubmissionReviewsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (cancelled) return

      if (!data.session) {
        router.push('/login')
        return
      }

      setCurrentUserId(data.session.user.id)
      setLoading(false)
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (loading || !currentUserId) return

    let cancelled = false

    const fetchReviews = async () => {
      setIsFetching(true)
      setError('')

      const { data, error: fetchError } = await supabase
        .from('submissions')
        .select(`
          id,
          language,
          created_at,
          assignment:assignments(id,title),
          review_assignments(
            id,
            status,
            reviewer_id,
            reviews(id, overall_comment, created_at)
          )
        `)
        .eq('author_id', currentUserId)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (fetchError) {
        console.log('Error loading reviews:', fetchError)
        setError(fetchError.message)
      } else {
        setSubmissions((data || []) as SubmissionRow[])
      }

      setIsFetching(false)
    }

    fetchReviews()

    return () => {
      cancelled = true
    }
  }, [currentUserId, loading])

  const reviews = useMemo<FlatReview[]>(() => {
    const flattened: FlatReview[] = []

    submissions.forEach((submission) => {
      submission.review_assignments?.forEach((assignment) => {
        assignment.reviews?.forEach((review) => {
          flattened.push({
            reviewId: review.id,
            overallComment: review.overall_comment,
            reviewCreatedAt: review.created_at,
            reviewStatus: assignment.status,
            reviewerId: assignment.reviewer_id,
            assignmentTitle: submission.assignment?.title ?? 'Unknown Assignment',
            submissionLanguage: submission.language,
          })
        })
      })
    })

    return flattened.sort((a, b) =>
      new Date(b.reviewCreatedAt).getTime() - new Date(a.reviewCreatedAt).getTime()
    )
  }, [submissions])

  const toggleExpanded = (reviewId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(reviewId)) {
        next.delete(reviewId)
      } else {
        next.add(reviewId)
      }
      return next
    })
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
            <h1 className="dashboard-title">Read My Reviews of My Submissions</h1>
            <p className="dashboard-welcome">
              Feedback from your peers on your submitted assignments.
            </p>
          </div>
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">My Submission Reviews</h2>
            <div className="section-content">
              {isFetching ? (
                <p>Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p>No reviews yet for your submissions.</p>
              ) : (
                reviews.map((review) => {
                  const isExpanded = expandedIds.has(review.reviewId)
                  const trimmedComment = review.overallComment?.trim() || ''
                  const shouldClamp = trimmedComment.length > 280
                  const displayComment = !shouldClamp || isExpanded
                    ? trimmedComment
                    : `${trimmedComment.slice(0, 280)}...`

                  return (
                    <div key={review.reviewId} className="dashboard-card">
                      <h3 className="card-title">{review.assignmentTitle}</h3>
                      <p>
                        <strong>Language:</strong> {review.submissionLanguage}
                      </p>
                      <p>
                        <strong>Review Status:</strong> {review.reviewStatus}
                      </p>
                      <p>
                        <strong>Review Created:</strong>{' '}
                        {new Date(review.reviewCreatedAt).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Reviewer ID:</strong> {review.reviewerId}
                      </p>
                      <p>
                        <strong>Overall Comment:</strong>{' '}
                        {displayComment || 'No comment provided.'}
                      </p>
                      {shouldClamp && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => toggleExpanded(review.reviewId)}
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

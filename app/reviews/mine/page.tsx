'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'

type ReviewRow = {
  id: string
  overall_comment: string | null
  created_at: string
}

type AssignmentRow = {
  id: string
  title: string
}

type SubmissionRow = {
  id: string
  author_id: string
  language: string
  assignment: AssignmentRow | AssignmentRow[] | null
}

type ReviewAssignmentRow = {
  id: string
  status: string
  assigned_at: string
  submission: SubmissionRow | SubmissionRow[] | null
  review: ReviewRow | ReviewRow[] | null
}

type ReviewCard = {
  id: string
  assignmentTitle: string
  submissionLanguage: string
  reviewStatus: string
  reviewCreatedAt: string
  overallComment: string
}

const normalizeToObject = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function MySubmissionReviewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState<ReviewCard[]>([])

  useEffect(() => {
    let cancelled = false

    const loadReviews = async () => {
      setLoading(true)
      setError('')

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError || !userData.user) {
        router.push('/login')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('review_assignments')
        .select(`
          id,
          status,
          assigned_at,
          submission:submissions!review_assignments_submission_id_fkey (
            id,
            author_id,
            language,
            assignment:assignments!submissions_assignment_id_fkey (
              id,
              title
            )
          ),
          review:reviews!inner (
            id,
            overall_comment,
            created_at
          )
        `)
        .eq('submission.author_id', userData.user.id)
        .order('assigned_at', { ascending: false })

      if (cancelled) return

      if (fetchError) {
        console.log('Error loading reviews:', fetchError)
        setError('We could not load your reviews right now. Please try again.')
        setReviews([])
        setLoading(false)
        return
      }

      const rows = (data || []) as unknown as ReviewAssignmentRow[]

      const mapped = rows.reduce<ReviewCard[]>((acc, row) => {
        const submission = normalizeToObject(row.submission)
        const review = normalizeToObject(row.review)
        const assignment = normalizeToObject(submission?.assignment)

        const comment = review?.overall_comment?.trim()

        if (!submission || !review || !comment) return acc

        acc.push({
          id: row.id,
          assignmentTitle: assignment?.title ?? 'Unknown Assignment',
          submissionLanguage: submission.language ?? 'Unknown',
          reviewStatus: row.status ?? 'Unknown',
          reviewCreatedAt: review.created_at,
          overallComment: comment,
        })

        return acc
      }, [])

      setReviews(mapped)
      setLoading(false)
    }

    loadReviews()

    return () => {
      cancelled = true
    }
  }, [router])

  if (loading) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-loading">Loading reviews of my submissions…</div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Reviews of My Submissions</h1>
            <p className="dashboard-welcome">Feedback from peers on your submitted work.</p>
          </div>
        </div>

        {error && <div className="dashboard-error">{error}</div>}

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">Received Reviews</h2>
            <div className="section-content">
              {error ? null : reviews.length === 0 ? (
                <p>No reviews received yet.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="dashboard-card">
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
                      <strong>Overall Comment:</strong> {review.overallComment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}
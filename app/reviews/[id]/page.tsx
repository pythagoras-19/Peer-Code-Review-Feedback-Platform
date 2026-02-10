'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'

type AssignmentEmbed = {
  id: string
  title: string
  review_due: string | null
}

type SubmissionEmbed = {
  id: string
  language: string | null
  code_text: string | null
  created_at: string
  assignment?: AssignmentEmbed | AssignmentEmbed[] | null
}

type ReviewAssignmentQueryRow = {
  id: string
  status: string | null
  assigned_at: string | null
  submission?: SubmissionEmbed | SubmissionEmbed[] | null
}

type ReviewDetails = {
  assignmentTitle: string
  language: string
  status: string
  assignedAt: string
  codeText: string
}

type ExistingReview = {
  id: string
  overall_comment: string
}

const firstOrSelf = <T,>(value: T | T[] | null | undefined) => {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

const normalizeStatus = (value: string | null | undefined) => {
  const raw = value ?? 'assigned'
  return raw.replace(/'/g, '').trim().toLowerCase()
}

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const reviewAssignmentId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviewDetails, setReviewDetails] = useState<ReviewDetails | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    const safeSet = (fn: () => void) => {
      if (isActive) fn()
    }

    const loadReview = async () => {
      safeSet(() => {
        setLoading(true)
        setErrorMessage(null)
        setNotFound(false)
      })

      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData.user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('review_assignments')
        .select(`
          id,
          status,
          assigned_at,
          submission:submissions!review_assignments_submission_id_fkey (
            id,
            language,
            code_text,
            created_at,
            assignment:assignments!submissions_assignment_id_fkey (
              id,
              title,
              review_due
            )
          )
        `)
        .eq('id', reviewAssignmentId)
        .eq('reviewer_id', userData.user.id)
        .single()

      if (error) {
        const isNotFound = error.code === 'PGRST116'
        safeSet(() => {
          if (isNotFound) {
            setNotFound(true)
          } else {
            console.error(error)
            setErrorMessage('Unable to load this review assignment.')
          }
          setReviewDetails(null)
          setLoading(false)
        })
        return
      }

      const row = (data ?? null) as unknown as ReviewAssignmentQueryRow | null
      if (!row) {
        safeSet(() => {
          setNotFound(true)
          setReviewDetails(null)
          setLoading(false)
        })
        return
      }

      const submission = firstOrSelf(row.submission)
      const assignment = firstOrSelf(submission?.assignment)

      const { data: existingReview, error: existingReviewError } = await supabase
        .from('reviews')
        .select('id, overall_comment')
        .eq('review_assignment_id', reviewAssignmentId)
        .maybeSingle()

      if (existingReviewError) {
        console.error(existingReviewError)
        safeSet(() => {
          setSaveError('Unable to load the existing review comment.')
        })
      }

      safeSet(() => {
        setReviewDetails({
          assignmentTitle: assignment?.title ?? 'Untitled Assignment',
          language: submission?.language ?? 'unknown',
          status: normalizeStatus(row.status),
          assignedAt: row.assigned_at ?? '',
          codeText: submission?.code_text ?? '',
        })
        setComment(existingReview?.overall_comment ?? '')
        setLoading(false)
      })
    }

    if (reviewAssignmentId) {
      loadReview()
    } else {
      safeSet(() => {
        setNotFound(true)
        setLoading(false)
      })
    }

    return () => {
      isActive = false
    }
  }, [reviewAssignmentId, router])

  if (loading) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Loading Review...</h1>
          </div>
        </div>
      </AppShell>
    )
  }

  if (errorMessage) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Unable to Load Review</h1>
          </div>
          <p className="empty-state">{errorMessage}</p>
          <Link href="/reviews" className="btn btn-secondary">
            Back to Reviews
          </Link>
        </div>
      </AppShell>
    )
  }

  if (notFound || !reviewDetails) {
    return (
      <AppShell>
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Review Not Found</h1>
          </div>
          <Link href="/reviews" className="btn btn-secondary">
            Back to Reviews
          </Link>
        </div>
      </AppShell>
    )
  }

  const handleSubmit = async () => {
    const trimmedComment = comment.trim()

    setSaveError(null)
    setSaveSuccess(null)

    if (!trimmedComment) {
      setSaveError('Please enter an overall comment before submitting.')
      return
    }

    setSaving(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user) {
      setSaving(false)
      router.push('/login')
      return
    }

    const { error } = await supabase
      .from('reviews')
      .upsert(
        { review_assignment_id: reviewAssignmentId, overall_comment: trimmedComment },
        { onConflict: 'review_assignment_id' }
      )

    if (error) {
      console.error(error)
      setSaving(false)
      setSaveError('Unable to submit your review. Please try again.')
      return
    }

    const { error: statusError } = await supabase
      .from('review_assignments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', reviewAssignmentId)
      .eq('reviewer_id', userData.user.id)

    if (statusError) {
      console.error(statusError)
      setSaveError('Review saved, but status could not be updated.')
    } else {
      setSaveSuccess('Review submitted successfully.')
      setReviewDetails((prev) =>
        prev ? { ...prev, status: normalizeStatus('completed') } : prev
      )
    }

    setSaving(false)
  }

  return (
    <AppShell>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Review Code</h1>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">{reviewDetails.assignmentTitle}</h2>
            <div className="section-content">
              <div className="card-details">
                <p>
                  <strong>Language:</strong> {reviewDetails.language}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`status-badge status-${reviewDetails.status}`}>
                    {reviewDetails.status.toUpperCase()}
                  </span>
                </p>
                <p>
                  <strong>Assigned at:</strong>{' '}
                  {reviewDetails.assignedAt
                    ? new Date(reviewDetails.assignedAt).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>

              <div className="form-field" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Code Submission</label>
                <pre className="code-preview">
                  <code>{reviewDetails.codeText}</code>
                </pre>
              </div>

              <div className="form-field" style={{ marginTop: '1.5rem' }}>
                <label className="form-label" htmlFor="overall-comment">
                  Overall Comment
                </label>
                <textarea
                  id="overall-comment"
                  className="form-textarea"
                  rows={6}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Share your overall feedback for this submission."
                />
                {saveError ? <p className="form-error">{saveError}</p> : null}
                {saveSuccess ? <p className="form-success">{saveSuccess}</p> : null}
              </div>

              <div className="review-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? 'Submitting...' : 'Submit Review'}
                </button>
                <Link href="/reviews" className="btn btn-secondary">
                  Back to Reviews
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

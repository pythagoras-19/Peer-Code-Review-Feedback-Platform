'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'

type FieldErrors = {
  title?: string
  submitDue?: string
  reviewDue?: string
  reviewsRequired?: string
}

export default function CreateAssignmentPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitDue, setSubmitDue] = useState('')
  const [reviewDue, setReviewDue] = useState('')
  const [reviewsRequired, setReviewsRequired] = useState('2')

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (cancelled) return

      if (!data.session) {
        router.push('/login')
        return
      }
      setLoading(false)
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  const clearFieldError = (field: keyof FieldErrors) => {
    if (!fieldErrors[field]) return
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validateForm = () => {
    const nextErrors: FieldErrors = {}

    if (!title.trim()) {
      nextErrors.title = 'Title is required'
    }

    if (!submitDue) {
      nextErrors.submitDue = 'Submit due date is required'
    }

    if (!reviewDue) {
      nextErrors.reviewDue = 'Review due date is required'
    }

    if (submitDue && reviewDue) {
      const submitUtc = new Date(`${submitDue}T00:00:00Z`)
      const reviewUtc = new Date(`${reviewDue}T00:00:00Z`)

      if (Number.isNaN(submitUtc.getTime())) {
        nextErrors.submitDue = 'Submit due date is invalid'
      }

      if (Number.isNaN(reviewUtc.getTime())) {
        nextErrors.reviewDue = 'Review due date is invalid'
      }

      if (!Number.isNaN(submitUtc.getTime()) && !Number.isNaN(reviewUtc.getTime())) {
        if (reviewUtc.getTime() <= submitUtc.getTime()) {
          nextErrors.reviewDue = 'Review due date must be after submit due date'
        }
      }
    }

    const reviewsRequiredValue = Number(reviewsRequired)
    if (!reviewsRequired || !Number.isInteger(reviewsRequiredValue)) {
      nextErrors.reviewsRequired = 'Reviews required must be a whole number'
    } else if (reviewsRequiredValue < 1) {
      nextErrors.reviewsRequired = 'Reviews required must be at least 1'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')
    setSubmitSuccess('')

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const submitDueUtc = new Date(`${submitDue}T00:00:00Z`).toISOString()
      const reviewDueUtc = new Date(`${reviewDue}T00:00:00Z`).toISOString()

      const { error } = await supabase.from('assignments').insert({
        title: title.trim(),
        description: description.trim() ? description.trim() : '',
        submit_due: submitDueUtc,
        review_due: reviewDueUtc,
        reviews_required: Number(reviewsRequired),
      })

      if (error) {
        throw new Error(error.message)
      }

      setSubmitSuccess('Assignment created successfully. Redirecting...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 800)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create assignment'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
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
            <h1 className="dashboard-title">Create Assignment</h1>
            <p className="dashboard-welcome">Set up an assignment and due dates.</p>
          </div>
        </div>

        {submitError && <div className="dashboard-error">{submitError}</div>}
        {submitSuccess && <div className="auth-success-message">{submitSuccess}</div>}

        <div className="dashboard-grid">
          <section className="dashboard-section">
            <h2 className="section-title">Assignment Details</h2>
            <div className="section-content">
              <form onSubmit={handleSubmit}>
                <div className="form-field">
                  <label htmlFor="title" className="form-label">
                    Title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value)
                      clearFieldError('title')
                    }}
                    className={`form-input ${fieldErrors.title ? 'form-input-error' : ''}`}
                    placeholder="e.g., Database Normalization Exercise"
                    required
                  />
                  {fieldErrors.title && (
                    <p className="form-error">{fieldErrors.title}</p>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="description" className="form-label">
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="form-textarea"
                    rows={4}
                    placeholder="Add any context or instructions for reviewers..."
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="submitDue" className="form-label">
                    Submit Due Date
                  </label>
                  <input
                    id="submitDue"
                    type="date"
                    value={submitDue}
                    onChange={(event) => {
                      setSubmitDue(event.target.value)
                      clearFieldError('submitDue')
                    }}
                    className={`form-input ${fieldErrors.submitDue ? 'form-input-error' : ''}`}
                    required
                  />
                  {fieldErrors.submitDue && (
                    <p className="form-error">{fieldErrors.submitDue}</p>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="reviewDue" className="form-label">
                    Review Due Date
                  </label>
                  <input
                    id="reviewDue"
                    type="date"
                    value={reviewDue}
                    onChange={(event) => {
                      setReviewDue(event.target.value)
                      clearFieldError('reviewDue')
                    }}
                    min={submitDue || undefined}
                    className={`form-input ${fieldErrors.reviewDue ? 'form-input-error' : ''}`}
                    required
                  />
                  {fieldErrors.reviewDue && (
                    <p className="form-error">{fieldErrors.reviewDue}</p>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="reviewsRequired" className="form-label">
                    Reviews Required
                  </label>
                  <input
                    id="reviewsRequired"
                    type="number"
                    min={1}
                    step={1}
                    value={reviewsRequired}
                    onChange={(event) => {
                      setReviewsRequired(event.target.value)
                      clearFieldError('reviewsRequired')
                    }}
                    className={`form-input ${fieldErrors.reviewsRequired ? 'form-input-error' : ''}`}
                    required
                  />
                  {fieldErrors.reviewsRequired && (
                    <p className="form-error">{fieldErrors.reviewsRequired}</p>
                  )}
                </div>

                <div className="reviewer-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

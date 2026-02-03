'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface ReviewAssignment {
  id: string
  submission_id: string
  reviewer_id: string
  status: string
  assigned_at: string
  assignment_title: string
  author_display_name: string
  language: string
  code_preview: string
}

interface UseReviewAssignmentsResult {
  reviewAssignments: ReviewAssignment[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetches review assignments for the current user.
 * Joins with submissions, assignments, and user_profiles to get full details.
 * 
 * @returns {UseReviewAssignmentsResult} Object containing review assignments, loading state, error, and refetch function
 */
export function useReviewAssignments(): UseReviewAssignmentsResult {
  const [reviewAssignments, setReviewAssignments] = useState<ReviewAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1)
  }

  useEffect(() => {
    let cancelled = false

    async function fetchReviewAssignments() {
      try {
        setLoading(true)
        setError(null)

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          throw new Error(`Failed to get current user: ${userError.message}`)
        }

        if (!user) {
          throw new Error('No authenticated user found')
        }

        if (cancelled) return

        // Fetch review assignments with joined data
        // Note: This query structure assumes your tables are set up as described in the schema
        const { data, error: fetchError } = await supabase
          .from('review_assignments')
          .select(`
            id,
            submission_id,
            reviewer_id,
            status,
            assigned_at,
            submissions (
              id,
              language,
              code_text,
              author_id,
              assignment_id,
              assignments (
                title
              ),
              user_profiles!submissions_author_id_fkey (
                display_name
              )
            )
          `)
          .eq('reviewer_id', user.id)
          .order('assigned_at', { ascending: false })

        if (cancelled) return

        if (fetchError) {
          throw new Error(`Failed to fetch review assignments: ${fetchError.message}`)
        }

        // Transform the data to a flat structure
        const transformedData: ReviewAssignment[] = (data || []).map((ra: any) => {
          const submission = ra.submissions
          const assignment = submission?.assignments
          const author = submission?.user_profiles

          return {
            id: ra.id,
            submission_id: ra.submission_id,
            reviewer_id: ra.reviewer_id,
            status: ra.status,
            assigned_at: ra.assigned_at,
            assignment_title: assignment?.title || 'Unknown Assignment',
            author_display_name: author?.display_name || 'Unknown Author',
            language: submission?.language || 'unknown',
            code_preview: submission?.code_text?.substring(0, 100) || '',
          }
        })

        setReviewAssignments(transformedData)
      } catch (err) {
        if (cancelled) return
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error('Error fetching review assignments:', errorMessage)
        setError(errorMessage)
        setReviewAssignments([])
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchReviewAssignments()

    return () => {
      cancelled = true
    }
  }, [refetchTrigger])

  return { reviewAssignments, loading, error, refetch }
}

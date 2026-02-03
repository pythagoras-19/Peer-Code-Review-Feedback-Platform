'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface Reviewer {
  user_id: string
  display_name: string
}

interface UseReviewersResult {
  reviewers: Reviewer[]
  loading: boolean
  error: string | null
}

/**
 * Fetches available reviewers from the user_directory table.
 * Automatically excludes the current logged-in user.
 * 
 * @returns {UseReviewersResult} Object containing reviewers array, loading state, and error
 */
export function useReviewers(): UseReviewersResult {
  const [reviewers, setReviewers] = useState<Reviewer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReviewers() {
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

        // Fetch all users from user_directory, excluding current user
        const { data, error: fetchError } = await supabase
          .from('user_directory')
          .select('user_id, display_name')
          .neq('user_id', user.id)
          .order('display_name', { ascending: true })

        if (fetchError) {
          throw new Error(`Failed to fetch reviewers: ${fetchError.message}`)
        }

        setReviewers(data || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error('Error fetching reviewers:', errorMessage)
        setError(errorMessage)
        setReviewers([])
      } finally {
        setLoading(false)
      }
    }

    fetchReviewers()
  }, [])

  return { reviewers, loading, error }
}

'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function assignReviewerForSubmission(submissionId: string, reviewerId: string) {
  if (!submissionId || !reviewerId) {
    return { ok: false, error: 'submissionId and reviewerId are required' }
  }

  const supabase = createSupabaseServerClient()

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) return { ok: false, error: authError.message }
  if (!authData.user) return { ok: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('review_assignments')
    .insert([{ submission_id: submissionId, reviewer_id: reviewerId }])
    .select('id, submission_id, reviewer_id, status, assigned_at')
    .single()

  if (error) return { ok: false, error: error.message }

  return { ok: true, data }
}
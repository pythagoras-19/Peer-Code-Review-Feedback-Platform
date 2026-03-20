export type ReviewScoreKey =
  | 'code_quality_score'
  | 'readability_score'
  | 'correctness_score'
  | 'security_score'

export type ReviewChecklistKey =
  | 'checklist_clear_naming'
  | 'checklist_consistent_formatting'
  | 'checklist_handles_edge_cases'
  | 'checklist_logic_is_easy_to_follow'

export type ReviewRecord = {
  id: string
  review_assignment_id: string
  overall_comment: string | null
  created_at: string
  updated_at: string | null
  code_quality_score: number | null
  readability_score: number | null
  correctness_score: number | null
  security_score: number | null
  checklist_clear_naming: boolean
  checklist_consistent_formatting: boolean
  checklist_handles_edge_cases: boolean
  checklist_logic_is_easy_to_follow: boolean
  submitted_at: string | null
}

export type ReviewFormState = {
  overall_comment: string
  code_quality_score: number | null
  readability_score: number | null
  correctness_score: number | null
  security_score: number | null
  checklist_clear_naming: boolean
  checklist_consistent_formatting: boolean
  checklist_handles_edge_cases: boolean
  checklist_logic_is_easy_to_follow: boolean
  submitted_at: string | null
}

export const REVIEW_SCORE_FIELDS: Array<{
  key: ReviewScoreKey
  label: string
}> = [
  { key: 'code_quality_score', label: 'Code Quality Score' },
  { key: 'readability_score', label: 'Readability Score' },
  { key: 'correctness_score', label: 'Correctness Score' },
  { key: 'security_score', label: 'Security Score' },
]

export const REVIEW_CHECKLIST_FIELDS: Array<{
  key: ReviewChecklistKey
  label: string
}> = [
  { key: 'checklist_clear_naming', label: 'Clear naming' },
  { key: 'checklist_consistent_formatting', label: 'Consistent formatting' },
  { key: 'checklist_handles_edge_cases', label: 'Handles edge cases' },
  {
    key: 'checklist_logic_is_easy_to_follow',
    label: 'Logic is easy to follow',
  },
]

export const createEmptyReviewForm = (): ReviewFormState => ({
  overall_comment: '',
  code_quality_score: null,
  readability_score: null,
  correctness_score: null,
  security_score: null,
  checklist_clear_naming: false,
  checklist_consistent_formatting: false,
  checklist_handles_edge_cases: false,
  checklist_logic_is_easy_to_follow: false,
  submitted_at: null,
})

export const mapReviewRecordToForm = (
  review: Partial<ReviewRecord> | null | undefined
): ReviewFormState => ({
  overall_comment: review?.overall_comment ?? '',
  code_quality_score: review?.code_quality_score ?? null,
  readability_score: review?.readability_score ?? null,
  correctness_score: review?.correctness_score ?? null,
  security_score: review?.security_score ?? null,
  checklist_clear_naming: review?.checklist_clear_naming ?? false,
  checklist_consistent_formatting:
    review?.checklist_consistent_formatting ?? false,
  checklist_handles_edge_cases: review?.checklist_handles_edge_cases ?? false,
  checklist_logic_is_easy_to_follow:
    review?.checklist_logic_is_easy_to_follow ?? false,
  submitted_at: review?.submitted_at ?? null,
})

export const getReviewSubmissionValidationError = (
  form: ReviewFormState
): string | null => {
  const missingScores = REVIEW_SCORE_FIELDS.filter(({ key }) => form[key] == null).map(
    ({ label }) => label.replace(' Score', '')
  )
  const missingComment = !form.overall_comment.trim()

  if (missingScores.length === 0 && !missingComment) {
    return null
  }

  const requirements: string[] = []

  if (missingScores.length > 0) {
    requirements.push(`choose ratings for ${missingScores.join(', ')}`)
  }

  if (missingComment) {
    requirements.push('add an overall comment')
  }

  return `Before submitting, ${requirements.join(' and ')}.`
}

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { fetch as undiciFetch, Headers as UndiciHeaders } from 'undici'

loadEnv({ path: resolve(process.cwd(), '.env.test'), override: true })
loadEnv({ path: resolve(process.cwd(), '.env.local'), override: false })

globalThis.fetch = undiciFetch as any
globalThis.Headers = UndiciHeaders as any

const supabaseUrl = process.env.SUPABASE_URL || ''
const anonKey = process.env.SUPABASE_ANON_KEY || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const testPassword = process.env.TEST_PASSWORD || 'TestPassword123!TestPassword123!'
const testEmailDomain = process.env.TEST_EMAIL_DOMAIN || 'example.test'

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables. Ensure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set in .env.test'
  )
}

export async function assertSupabaseReachable() {
  const res = await undiciFetch(`${supabaseUrl}/auth/v1/health`, {
    headers: { apikey: anonKey }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`[db-tests] Supabase not reachable or auth health failed: ${res.status} ${body}`)
  }
}

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  global: { fetch: undiciFetch as any },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

export async function createTestUser(prefix: string) {
  const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const email = `${prefix}.${nonce}@${testEmailDomain}`

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: testPassword,
    email_confirm: true
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message || 'unknown error'}`)
  }

  const userId = authData.user.id

  const client = createClient(supabaseUrl, anonKey, {
    global: { fetch: undiciFetch as any },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: testPassword
  })

  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`)
  }

  return { userId, email, client }
}

export async function deleteTestUser(userId: string) {
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) console.warn(`Failed to delete test user ${userId}: ${error.message}`)
}
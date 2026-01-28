// @vitest-environment node

import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createTestUser, deleteTestUser, assertSupabaseReachable } from './helpers'

async function waitForProfile(userId: string, client: SupabaseClient, timeoutMs = 20000) {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const { data, error } = await client
      .from('user_profiles')
      .select('user_id, display_name')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    if (data) return data

    await new Promise(r => setTimeout(r, 300))
  }

  throw new Error(`Timed out waiting for user_profiles row for user_id=${userId}`)
}

describe('user_profiles RLS', () => {
  let userA: { userId: string; email: string; client: SupabaseClient } | null = null
  let userB: { userId: string; email: string; client: SupabaseClient } | null = null

  beforeAll(async () => {
    await assertSupabaseReachable()

    userA = await createTestUser('userA')
    userB = await createTestUser('userB')

    await waitForProfile(userA.userId, userA.client)
    await waitForProfile(userB.userId, userB.client)
  }, 60000)

  it('authenticated user CAN select their own user_profiles row', async () => {
    if (!userA) throw new Error('userA not initialized')

    const { data, error } = await userA.client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userA.userId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data?.user_id).toBe(userA.userId)
  }, 60000)

  it("authenticated user CANNOT select another user's profile due to RLS", async () => {
    if (!userA || !userB) throw new Error('users not initialized')

    const { data, error } = await userA.client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userB.userId)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  }, 60000)

  afterAll(async () => {
    if (userA?.userId) await deleteTestUser(userA.userId)
    if (userB?.userId) await deleteTestUser(userB.userId)
  }, 60000)
})
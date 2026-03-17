import { vi } from 'vitest'
import type { MockSupabaseAuthError } from './supabaseClientMock'

export type MockQueryResult<T = any> = {
  data: T | null
  error: MockSupabaseAuthError | null
}

export type MockQueryFilter =
  | { type: 'eq' | 'neq'; column: string; value: any }
  | { type: 'in'; column: string; values: any[] }
  | { type: 'order'; column: string; options?: Record<string, any> }
  | { type: 'limit'; value: number }

export type MockQueryContext = {
  table: string
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete'
  columns?: string
  selectAfterMutation?: string
  payload?: any
  options?: any
  filters: MockQueryFilter[]
  modifier?: 'single' | 'maybeSingle'
}

type MockTableResolver = (
  context: MockQueryContext
) => MockQueryResult | Promise<MockQueryResult>

type MockRpcResolver = (
  params: Record<string, any>
) => MockQueryResult | Promise<MockQueryResult>

type CreateMockSupabaseBrowserClientOptions = {
  auth?: {
    getUser?: MockQueryResult<{ user: { id: string; email?: string | null } | null }>
    getSession?: MockQueryResult<{
      session: { user: { id: string; email?: string | null } } | null
    }>
    signOut?: MockQueryResult<null>
  }
  tables?: Record<string, MockTableResolver>
  rpc?: Record<string, MockRpcResolver>
}

type RpcCall = {
  fn: string
  params: Record<string, any>
}

const defaultUser = {
  id: 'user-123',
  email: 'student@example.com',
}

const cloneFilter = (filter: MockQueryFilter): MockQueryFilter => {
  if (filter.type === 'in') {
    return { ...filter, values: [...filter.values] }
  }

  if (filter.type === 'order') {
    return {
      ...filter,
      options: filter.options ? { ...filter.options } : undefined,
    }
  }

  return { ...filter }
}

const cloneContext = (context: MockQueryContext): MockQueryContext => ({
  ...context,
  payload: context.payload,
  options: context.options ? { ...context.options } : undefined,
  filters: context.filters.map(cloneFilter),
})

export function createMockSupabaseBrowserClient(
  options: CreateMockSupabaseBrowserClientOptions = {}
) {
  const queryLog: MockQueryContext[] = []
  const rpcCalls: RpcCall[] = []

  const auth = {
    getUser: vi.fn().mockResolvedValue(
      options.auth?.getUser ?? {
        data: { user: defaultUser },
        error: null,
      }
    ),
    getSession: vi.fn().mockResolvedValue(
      options.auth?.getSession ?? {
        data: { session: { user: defaultUser } },
        error: null,
      }
    ),
    signOut: vi.fn().mockResolvedValue(
      options.auth?.signOut ?? {
        data: null,
        error: null,
      }
    ),
  }

  const resolveQuery = async (
    context: MockQueryContext
  ): Promise<MockQueryResult> => {
    queryLog.push(cloneContext(context))

    const resolver = options.tables?.[context.table]
    if (!resolver) {
      return { data: null, error: null }
    }

    return resolver(cloneContext(context))
  }

  const createBuilder = (table: string) => {
    const context: MockQueryContext = {
      table,
      action: 'select',
      filters: [],
    }

    const builder: any = {
      select: vi.fn((columns: string) => {
        if (context.action !== 'select') {
          context.selectAfterMutation = columns
        } else {
          context.columns = columns
        }
        return builder
      }),
      insert: vi.fn((payload: any) => {
        context.action = 'insert'
        context.payload = payload
        return builder
      }),
      update: vi.fn((payload: any) => {
        context.action = 'update'
        context.payload = payload
        return builder
      }),
      upsert: vi.fn((payload: any, mutationOptions?: Record<string, any>) => {
        context.action = 'upsert'
        context.payload = payload
        context.options = mutationOptions
        return builder
      }),
      delete: vi.fn(() => {
        context.action = 'delete'
        return builder
      }),
      eq: vi.fn((column: string, value: any) => {
        context.filters.push({ type: 'eq', column, value })
        return builder
      }),
      neq: vi.fn((column: string, value: any) => {
        context.filters.push({ type: 'neq', column, value })
        return builder
      }),
      in: vi.fn((column: string, values: any[]) => {
        context.filters.push({ type: 'in', column, values })
        return builder
      }),
      order: vi.fn((column: string, orderOptions?: Record<string, any>) => {
        context.filters.push({ type: 'order', column, options: orderOptions })
        return builder
      }),
      limit: vi.fn((value: number) => {
        context.filters.push({ type: 'limit', value })
        return builder
      }),
      single: vi.fn(() => {
        context.modifier = 'single'
        return builder
      }),
      maybeSingle: vi.fn(() => {
        context.modifier = 'maybeSingle'
        return builder
      }),
      then: (
        onFulfilled?: (value: MockQueryResult) => any,
        onRejected?: (reason: any) => any
      ) => Promise.resolve(resolveQuery(context)).then(onFulfilled, onRejected),
      catch: (onRejected?: (reason: any) => any) =>
        Promise.resolve(resolveQuery(context)).catch(onRejected),
      finally: (onFinally?: () => void) =>
        Promise.resolve(resolveQuery(context)).finally(onFinally),
    }

    return builder
  }

  const supabase = {
    auth,
    from: vi.fn((table: string) => createBuilder(table)),
    rpc: vi.fn(async (fn: string, params: Record<string, any>) => {
      rpcCalls.push({ fn, params })

      const resolver = options.rpc?.[fn]
      if (!resolver) {
        return { data: null, error: null }
      }

      return resolver(params)
    }),
  }

  return {
    supabase,
    queryLog,
    rpcCalls,
    getLastQuery: (table: string, action?: MockQueryContext['action']) =>
      [...queryLog]
        .reverse()
        .find((query) => query.table === table && (!action || query.action === action)),
  }
}

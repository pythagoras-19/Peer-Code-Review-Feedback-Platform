import { supabase } from './supabaseClient'

export type AuthResult<T> = {
  data: T | null
  error: AuthError | null
}

export type AuthError = {
  message: string
  status?: number
  code?: string
}

export async function signUp(
  email: string,
  password: string
): Promise<AuthResult<{ user: { id: string; email: string } }>> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          status: error.status,
          code: error.code,
        },
      }
    }

    return {
      data: data.user
        ? {
            user: {
              id: data.user.id,
              email: data.user.email || '',
            },
          }
        : null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult<{ user: { id: string; email: string }; session: any }>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          status: error.status,
          code: error.code,
        },
      }
    }

    return {
      data: data.user && data.session
        ? {
            user: {
              id: data.user.id,
              email: data.user.email || '',
            },
            session: data.session,
          }
        : null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

export async function signOut(): Promise<AuthResult<null>> {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          status: error.status,
          code: error.code,
        },
      }
    }

    return {
      data: null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

export async function getSession(): Promise<
  AuthResult<{ userId: string; email: string }>
> {
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          status: error.status,
          code: error.code,
        },
      }
    }

    if (!data.session) {
      return {
        data: null,
        error: null,
      }
    }

    return {
      data: {
        userId: data.session.user.id,
        email: data.session.user.email || '',
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

export async function getUser(): Promise<
  AuthResult<{ id: string; email: string }>
> {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          status: error.status,
          code: error.code,
        },
      }
    }

    return {
      data: data.user
        ? {
            id: data.user.id,
            email: data.user.email || '',
          }
        : null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

export async function resetPasswordForEmail(
  email: string
): Promise<AuthResult<null>> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/reset-password`,
    })

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          status: error.status,
          code: error.code,
        },
      }
    }

    return {
      data: null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

export async function updatePassword(
  newPassword: string
): Promise<AuthResult<{ id: string; email: string }>> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          status: error.status,
          code: error.code,
        },
      }
    }

    return {
      data: data.user
        ? {
            id: data.user.id,
            email: data.user.email || '',
          }
        : null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    }
  }
}

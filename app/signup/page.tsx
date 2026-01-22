'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import AuthCard from '@/components/AuthCard'
import FormField from '@/components/FormField'
import * as authService from '@/lib/authService'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check if user is already logged in
  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      try {
        const result = await authService.getSession()
        if (!cancelled && result.data) {
          router.push('/dashboard')
        }
      } catch (err) {
        console.error('Error checking session:', err)
      } finally {
        if (!cancelled) {
          setCheckingSession(false)
        }
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [router])

  const validateForm = () => {
    if (!email) {
      setError('Email is required')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!password) {
      setError('Password is required')
      return false
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return false
    }
    return true
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const result = await authService.signUp(email, password)

      if (result.error) {
        setError(result.error.message)
      } else {
        setSuccess('Account created successfully!')
        // Clear form
        setEmail('')
        setPassword('')
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Signup error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <AppShell>
        <div className="auth-container">
          <div className="auth-card">
            <p>Loading...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <AuthCard title="Sign Up">
        <form onSubmit={handleSignup} className="auth-form">
          <FormField
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error && email === '' ? 'Email is required' : ''}
          />
          <FormField
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error && password === '' ? 'Password is required' : ''}
          />

          {error && <div className="auth-error-message">{error}</div>}
          {success && <div className="auth-success-message">{success}</div>}

          <button
            type="submit"
            disabled={loading || !!success}
            className="btn btn-primary btn-block"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link href="/login" className="auth-link">
            Log in
          </Link>
        </p>
      </AuthCard>
    </AppShell>
  )
}

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/navigation before importing actions
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { signIn, signUp, signOut } from '../auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const mockRedirect = vi.mocked(redirect)
const mockCreateClient = vi.mocked(createClient)

function buildSupabaseMock({
  signInError = null,
  signUpError = null,
}: {
  signInError?: { message: string } | null
  signUpError?: { message: string } | null
} = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: signInError }),
      signUp: vi.fn().mockResolvedValue({ error: signUpError }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signIn', () => {
  it('redirects to /dashboard on success', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock() as any)
    const fd = new FormData()
    fd.set('email', 'user@example.com')
    fd.set('password', 'secret')

    await signIn({ error: '' }, fd)

    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('returns error message on invalid credentials', async () => {
    mockCreateClient.mockResolvedValue(
      buildSupabaseMock({ signInError: { message: 'Invalid login credentials' } }) as any
    )
    const fd = new FormData()
    fd.set('email', 'user@example.com')
    fd.set('password', 'wrong')

    const result = await signIn({ error: '' }, fd)

    expect(result).toEqual({ error: 'Invalid login credentials' })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

describe('signUp', () => {
  it('redirects to /login on success', async () => {
    mockCreateClient.mockResolvedValue(buildSupabaseMock() as any)
    const fd = new FormData()
    fd.set('email', 'new@example.com')
    fd.set('password', 'password123')

    await signUp({ error: '' }, fd)

    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('returns error message when sign-up fails', async () => {
    mockCreateClient.mockResolvedValue(
      buildSupabaseMock({ signUpError: { message: 'Email already in use' } }) as any
    )
    const fd = new FormData()
    fd.set('email', 'existing@example.com')
    fd.set('password', 'password123')

    const result = await signUp({ error: '' }, fd)

    expect(result).toEqual({ error: 'Email already in use' })
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

describe('signOut', () => {
  it('calls signOut and redirects to /login', async () => {
    const mock = buildSupabaseMock()
    mockCreateClient.mockResolvedValue(mock as any)

    await signOut()

    expect(mock.auth.signOut).toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })
})

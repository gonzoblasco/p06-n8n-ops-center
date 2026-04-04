import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// Mock Supabase & OpenAI
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }]
        })
      }
    }))
  }
})

describe('Search API Route', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = {
      auth: {
        getUser: vi.fn()
      },
      rpc: vi.fn()
    }
    ;(createClient as any).mockResolvedValue(mockSupabase)
  })

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'test' })
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('should return 400 if query is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } })
    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should call rpc and return results on valid request', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } })
    mockSupabase.rpc.mockResolvedValue({ data: [{ id: '1', similarity: 0.9 }], error: null })

    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'Hola mundo' })
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(mockSupabase.rpc).toHaveBeenCalledWith('match_support_items', expect.objectContaining({
      p_user_id: '123'
    }))
  })

  it('should return 400 if query exceeds 500 chars', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } })
    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'a'.repeat(501) })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 400 if query is only whitespace', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } })
    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: '   ' })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('should return 500 with generic message when OpenAI throws', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } })
    const { default: OpenAIMock } = await import('openai') as any
    OpenAIMock.mockImplementation(() => ({
      embeddings: {
        create: vi.fn().mockRejectedValue(new Error('OpenAI API key invalid'))
      }
    }))

    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'test query' })
    })

    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error).toBe('Error interno del servidor')
    expect(data.error).not.toContain('OpenAI')
  })

  it('should return 500 when Supabase RPC returns error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123' } } })
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

    const req = new Request('http://localhost:3000/api/search', {
      method: 'POST',
      body: JSON.stringify({ query: 'test query' })
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

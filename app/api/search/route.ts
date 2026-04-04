import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { query } = body
    const threshold = Math.max(0, Math.min(1, Number(body.threshold) || 0.5))
    const limit = Math.max(1, Math.min(100, Number(body.limit) || 10))

    // Validation
    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json({ error: 'La query es requerida' }, { status: 400 })
    }
    if (query.length > 500) {
      return NextResponse.json({ error: 'La query es demasiado larga (max 500 chars)' }, { status: 400 })
    }

    // 1. Generate embedding for the search query
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })

    const query_embedding = response.data[0].embedding

    // 2. Call the Supabase RPC function for similarity search
    const { data: results, error } = await supabase.rpc('match_support_items', {
      query_embedding,
      match_threshold: threshold,
      match_count: limit,
      p_user_id: user.id,
    })

    if (error) {
      console.error('Search RPC Error:', error)
      return NextResponse.json({ error: 'Error en la búsqueda semántica' }, { status: 500 })
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Search API Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

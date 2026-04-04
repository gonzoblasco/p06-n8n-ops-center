import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, file_type, status, created_at, document_chunks(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Documents fetch error:', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }

  const documents = data.map((doc) => ({
    id: doc.id,
    title: doc.title,
    file_type: doc.file_type,
    status: doc.status,
    created_at: doc.created_at,
    chunk_count: (doc.document_chunks as unknown as { count: number }[])[0]?.count ?? 0,
  }))

  return NextResponse.json(documents)
}

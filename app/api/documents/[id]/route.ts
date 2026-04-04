import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
  }

  if (doc.user_id !== user.id) {
    return NextResponse.json({ error: 'Prohibido' }, { status: 403 })
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Document delete error:', deleteError)
    return NextResponse.json({ error: 'Error al eliminar el documento' }, { status: 500 })
  }

  return new Response(null, { status: 204 })
}

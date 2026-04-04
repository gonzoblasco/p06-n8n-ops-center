import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runSeed } from '@/lib/seed/support-items'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Solo disponible en dev' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const result = await runSeed()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Seed Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

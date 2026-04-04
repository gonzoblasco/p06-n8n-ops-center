import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatInterface } from '@/components/chat-interface'

type Document = {
  id: string
  title: string
  chunk_count: number
}

async function getReadyDocuments(userId: string): Promise<Document[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, document_chunks(count)')
    .eq('user_id', userId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((doc) => ({
    id: doc.id,
    title: doc.title,
    chunk_count: (doc.document_chunks as unknown as { count: number }[])[0]?.count ?? 0,
  }))
}

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const documents = await getReadyDocuments(user.id)

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Chat con documentos</h1>
        <p className="text-muted-foreground">
          Seleccioná documentos y hacé preguntas sobre su contenido.
        </p>
      </div>

      <ChatInterface documents={documents} />
    </div>
  )
}

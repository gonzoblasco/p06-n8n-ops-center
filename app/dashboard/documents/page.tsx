import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentUpload } from '@/components/document-upload'
import { DocumentList } from '@/components/document-list'

type Document = {
  id: string
  title: string
  file_type: 'pdf' | 'md'
  status: 'processing' | 'ready' | 'error'
  chunk_count: number
  created_at: string
}

async function getDocuments(): Promise<Document[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, file_type, status, created_at, document_chunks(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((doc) => ({
    id: doc.id,
    title: doc.title,
    file_type: doc.file_type as 'pdf' | 'md',
    status: doc.status as 'processing' | 'ready' | 'error',
    chunk_count: (doc.document_chunks as unknown as { count: number }[])[0]?.count ?? 0,
    created_at: doc.created_at,
  }))
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const documents = await getDocuments()

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Mis documentos</h1>
        <p className="text-muted-foreground">
          Subí PDFs o archivos Markdown para chatear con ellos.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <DocumentUpload />
        <DocumentList documents={documents} />
      </div>
    </div>
  )
}

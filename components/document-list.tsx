'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Document = {
  id: string
  title: string
  file_type: 'pdf' | 'md'
  status: 'processing' | 'ready' | 'error'
  chunk_count: number
  created_at: string
}

const STATUS_LABEL: Record<Document['status'], string> = {
  processing: 'Procesando',
  ready: 'Listo',
  error: 'Error',
}

const STATUS_CLASS: Record<Document['status'], string> = {
  processing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function DocumentList({ documents }: { documents: Document[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(doc: Document) {
    if (!window.confirm(`¿Eliminár "${doc.title}"? Esta acción no se puede deshacer.`)) return

    setDeleting(doc.id)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeleting(null)
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-base font-medium">Todavía no subiste ningún documento</p>
        <p className="text-sm text-muted-foreground">
          Usá el área de arriba para subir tu primer PDF o Markdown.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Título</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Chunks</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Creado</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">{doc.title}</td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="uppercase tracking-wide">
                  {doc.file_type}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <span
                  className={[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    STATUS_CLASS[doc.status],
                  ].join(' ')}
                >
                  {STATUS_LABEL[doc.status]}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {doc.chunk_count}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(doc.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="destructive"
                  size="xs"
                  disabled={deleting === doc.id}
                  onClick={() => handleDelete(doc)}
                >
                  {deleting === doc.id ? 'Eliminando…' : 'Eliminar'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

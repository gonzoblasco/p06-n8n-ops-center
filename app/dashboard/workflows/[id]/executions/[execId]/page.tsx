import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { AnalyzeErrorButton } from '@/components/analyze-error-button'

type ExecutionDetail = {
  id: string
  status: string
  startedAt: string
  stoppedAt: string | null
  mode: string
  error?: {
    message: string
    nodeName: string | null
  }
}

const BASE = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000'

async function getExecutionDetail(execId: string): Promise<ExecutionDetail | null> {
  const res = await fetch(`${BASE}/api/executions/${execId}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

function statusBadge(status: string) {
  switch (status) {
    case 'success':
      return <Badge className="bg-green-500 text-white">Exitoso</Badge>
    case 'error':
      return <Badge variant="destructive">Error</Badge>
    case 'running':
      return <Badge className="bg-yellow-400 text-black">En curso</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function formatDuration(startedAt: string, stoppedAt: string | null) {
  if (!stoppedAt) return 'En curso'
  const ms = new Date(stoppedAt).getTime() - new Date(startedAt).getTime()
  const secs = Math.round(ms / 1000)
  return `${secs}s`
}

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string; execId: string }>
}) {
  const { id, execId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const execution = await getExecutionDetail(execId)

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-2">
        <Link
          href={`/dashboard/workflows/${id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Volver
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalle de ejecución</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono">{execId}</p>
        </div>
        <AnalyzeErrorButton
          workflowId={id}
          executionId={execId}
          errorMessage={execution?.status === 'error'
            ? (execution.error?.message ?? 'Error desconocido en la ejecución')
            : undefined}
          nodeName={execution?.error?.nodeName}
        />
      </div>

      {!execution ? (
        <p className="text-destructive">No se pudo obtener el detalle de la ejecución.</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Estado</p>
                <div className="mt-1">{statusBadge(execution.status)}</div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Workflow ID</p>
                <p className="mt-1 font-mono text-sm">{id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Inicio</p>
                <p className="mt-1 text-sm">{formatDate(execution.startedAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Duración</p>
                <p className="mt-1 text-sm">{formatDuration(execution.startedAt, execution.stoppedAt)}</p>
              </div>
            </div>
          </div>

          {execution.error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-6 space-y-2">
              <h2 className="font-semibold text-destructive">Error en la ejecución</h2>
              {execution.error.nodeName && (
                <p className="text-sm text-muted-foreground">
                  Nodo: <span className="font-mono font-medium">{execution.error.nodeName}</span>
                </p>
              )}
              <p className="text-sm">{execution.error.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

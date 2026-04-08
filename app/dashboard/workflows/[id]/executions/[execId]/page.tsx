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

const MCP_URL = process.env.MCP_SERVER_URL ?? 'http://localhost:3001'

async function getExecutionDetail(execId: string): Promise<ExecutionDetail | null> {
  try {
    const response = await fetch(`${MCP_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'get_execution_detail', arguments: { executionId: execId } },
      }),
      cache: 'no-store',
    })
    if (!response.ok) return null

    const text = await response.text()

    let mcpResult: unknown
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try { mcpResult = JSON.parse(line.slice(6)); break } catch { /* skip */ }
      }
    }
    if (!mcpResult) {
      try { mcpResult = JSON.parse(text) } catch { return null }
    }

    const result = (mcpResult as { result?: { content?: { type: string; text: string }[] } })
      ?.result?.content?.[0]?.text
    if (!result) return null

    return JSON.parse(result) as ExecutionDetail
  } catch {
    return null
  }
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Detalle de ejecución</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">{execId}</p>
      </div>

      {!execution ? (
        <p className="text-destructive">No se pudo obtener el detalle de la ejecución.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="rounded-lg border p-6 flex-1 mr-6">
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
            <AnalyzeErrorButton
              workflowId={id}
              executionId={execId}
              errorMessage={execution.status === 'error'
                ? (execution.error?.message ?? 'Error desconocido en la ejecución')
                : undefined}
              nodeName={execution.error?.nodeName}
            />
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

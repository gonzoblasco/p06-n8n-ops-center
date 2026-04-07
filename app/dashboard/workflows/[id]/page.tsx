import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RunWorkflowButton } from '@/components/run-workflow-button'
import { ExecutionsTable } from '@/components/executions-table'

type Workflow = {
  id: string
  name: string
  active: boolean
  updatedAt: string
}

type Execution = {
  id: string
  status: string
  startedAt: string
  stoppedAt: string | null
  error?: string
}

const BASE = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000'

async function getWorkflows(): Promise<Workflow[]> {
  const res = await fetch(`${BASE}/api/workflows`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

async function getExecutions(workflowId: string): Promise<Execution[]> {
  const res = await fetch(`${BASE}/api/workflows/${workflowId}/executions`, {
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [workflows, executions] = await Promise.all([getWorkflows(), getExecutions(id)])

  const workflowName = workflows.find((w) => w.id === id)?.name ?? id

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-2">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← Volver
        </Link>
      </div>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{workflowName}</h1>
          <p className="text-muted-foreground mt-1 text-sm">ID: {id}</p>
        </div>
        <RunWorkflowButton workflowId={id} />
      </div>

      <h2 className="text-lg font-semibold mb-4">Ejecuciones recientes</h2>
      <ExecutionsTable executions={executions} workflowId={id} />
    </div>
  )
}

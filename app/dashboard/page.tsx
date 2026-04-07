import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkflowsTable } from '@/components/workflows-table'

type Workflow = {
  id: string
  name: string
  active: boolean
  updatedAt: string
}

async function getWorkflows(): Promise<Workflow[]> {
  const base = process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000'

  const res = await fetch(`${base}/api/workflows`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workflows = await getWorkflows()

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">n8n Ops Center</h1>
        <p className="text-muted-foreground mt-1">Lista de workflows en n8n.</p>
      </div>
      <WorkflowsTable workflows={workflows} />
    </div>
  )
}

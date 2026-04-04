import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStats } from '@/lib/actions/support'
import { StatsBar } from '@/components/dashboard/StatsBar'
import { SemanticDashboard } from '@/components/dashboard/SemanticDashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stats = await getStats()

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Semantic Dashboard</h1>
        <p className="text-muted-foreground">
          Búsqueda semántica de soporte sobre preguntas de compradores.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <StatsBar stats={stats} />
        <SemanticDashboard />
      </div>
    </div>
  )
}

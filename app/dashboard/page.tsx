import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

      {workflows.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No se encontraron workflows o el MCP server no está disponible.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última actualización</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((wf) => (
              <TableRow key={wf.id}>
                <TableCell className="font-medium">{wf.name}</TableCell>
                <TableCell>
                  <Badge variant={wf.active ? 'default' : 'secondary'}>
                    {wf.active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(wf.updatedAt).toLocaleString('es-AR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

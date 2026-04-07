'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Execution = {
  id: string
  status: string
  startedAt: string
  stoppedAt: string | null
  error?: string
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

function formatDuration(startedAt: string, stoppedAt: string | null) {
  if (!stoppedAt) return 'En curso'
  const secs = Math.round(
    (new Date(stoppedAt).getTime() - new Date(startedAt).getTime()) / 1000
  )
  return `${secs}s`
}

export function ExecutionsTable({
  executions,
  workflowId,
}: {
  executions: Execution[]
  workflowId: string
}) {
  const router = useRouter()

  if (executions.length === 0) {
    return <p className="text-muted-foreground text-sm">No hay ejecuciones recientes.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Inicio</TableHead>
          <TableHead>Duración</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {executions.map((ex) => (
          <TableRow
            key={ex.id}
            className="cursor-pointer"
            onClick={() =>
              router.push(`/dashboard/workflows/${workflowId}/executions/${ex.id}`)
            }
          >
            <TableCell className="font-mono">{ex.id.slice(0, 8)}</TableCell>
            <TableCell>{statusBadge(ex.status)}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(ex.startedAt).toLocaleString('es-AR')}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDuration(ex.startedAt, ex.stoppedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

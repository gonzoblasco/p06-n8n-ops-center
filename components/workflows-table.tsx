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

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

type Workflow = {
  id: string
  name: string
  active: boolean
  updatedAt: string
}

export function WorkflowsTable({ workflows }: { workflows: Workflow[] }) {
  const router = useRouter()

  if (workflows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No se encontraron workflows o el MCP server no está disponible.
      </p>
    )
  }

  return (
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
          <TableRow
            key={wf.id}
            className="cursor-pointer"
            onClick={() => router.push(`/dashboard/workflows/${wf.id}`)}
          >
            <TableCell className="font-medium">{wf.name}</TableCell>
            <TableCell>
              <Badge variant={wf.active ? 'default' : 'secondary'}>
                {wf.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(wf.updatedAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

'use client'

import { SupportItem } from '@/lib/actions/support'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ResultsTableProps {
  items: SupportItem[]
  isLoading: boolean
  isSemantic: boolean
}

export function ResultsTable({ items, isLoading, isSemantic }: ResultsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'escalated': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500'
    if (score >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-10">
        <div className="h-10 w-full animate-pulse rounded bg-muted"></div>
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded bg-muted/50"></div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center text-muted-foreground border rounded-lg border-dashed">
        <p className="text-lg">No se encontraron resultados.</p>
        {isSemantic && (
          <p className="text-sm">Probá bajando el umbral de similitud o buscando con otras palabras.</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Comprador</TableHead>
            <TableHead>Producto</TableHead>
            <TableHead className="w-[300px]">Pregunta</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Estado</TableHead>
            {isSemantic && <TableHead className="text-right">Similitud</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.buyer_nickname}</TableCell>
              <TableCell>{item.product_title}</TableCell>
              <TableCell className="text-sm italic">"{item.question_text}"</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">{item.category}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${getStatusColor(item.status)} border-none capitalize`}>
                  {item.status}
                </Badge>
              </TableCell>
              {isSemantic && (
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold">
                      {(item.similarity! * 100).toFixed(1)}%
                    </span>
                    <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getSimilarityColor(item.similarity!)}`}
                        style={{ width: `${item.similarity! * 100}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

import { Stats } from '@/lib/actions/support'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface StatsBarProps {
  stats: Stats
}

export function StatsBar({ stats }: StatsBarProps) {
  const items = [
    {
      title: 'Total items',
      value: stats.total,
      icon: Inbox,
      color: 'text-blue-500'
    },
    {
      title: 'Pendientes',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-500'
    },
    {
      title: 'Resueltos',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-green-500'
    },
    {
      title: 'Escalados',
      value: stats.escalated,
      icon: AlertCircle,
      color: 'text-red-500'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {item.title}
            </CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

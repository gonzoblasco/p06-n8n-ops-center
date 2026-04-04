'use server'

import { createClient } from '@/lib/supabase/server'

export type SupportItem = {
  id: string
  buyer_nickname: string
  product_title: string
  question_text: string
  category: string
  status: string
  created_at: string
  similarity?: number
}

export type Stats = {
  total: number
  pending: number
  resolved: number
  escalated: number
}

export async function getItems(filters?: { category?: string; status?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { data: [], error: 'No autorizado' }

  let query = supabase
    .from('support_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (filters?.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  return { data: (data as SupportItem[]) || [], error: error?.message }
}

export async function getStats(): Promise<Stats> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { total: 0, pending: 0, resolved: 0, escalated: 0 }

  const { data, error } = await supabase
    .from('support_items')
    .select('status')
    .eq('user_id', user.id)

  if (error || !data) return { total: 0, pending: 0, resolved: 0, escalated: 0 }

  const stats = data.reduce(
    (acc: any, curr: any) => {
      acc.total++
      if (curr.status === 'pending') acc.pending++
      if (curr.status === 'resolved') acc.resolved++
      if (curr.status === 'escalated') acc.escalated++
      return acc
    },
    { total: 0, pending: 0, resolved: 0, escalated: 0 }
  )

  return stats
}

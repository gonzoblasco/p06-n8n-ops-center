'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; executionId: string | null }
  | { status: 'error'; message: string }

export function RunWorkflowButton({ workflowId }: { workflowId: string }) {
  const [state, setState] = useState<State>({ status: 'idle' })

  async function handleRun() {
    setState({ status: 'loading' })
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setState({ status: 'error', message: data.error ?? 'Error desconocido' })
      } else {
        setState({ status: 'success', executionId: data.executionId ?? null })
      }
    } catch (err) {
      setState({ status: 'error', message: String(err) })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleRun} disabled={state.status === 'loading'}>
        {state.status === 'loading' ? 'Ejecutando...' : 'Ejecutar workflow'}
      </Button>
      {state.status === 'success' && (
        <p className="text-sm text-green-600">
          Ejecución iniciada{state.executionId ? `: ${state.executionId}` : ''}
        </p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
    </div>
  )
}

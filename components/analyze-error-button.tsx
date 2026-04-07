'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  workflowId: string
  executionId: string
  errorMessage: string | undefined
  nodeName: string | null | undefined
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; analysis: string }
  | { status: 'error'; message: string }

export function AnalyzeErrorButton({ workflowId, executionId, errorMessage, nodeName }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' })

  if (!errorMessage) {
    return (
      <Button disabled>
        Sin error para analizar
      </Button>
    )
  }

  async function handleAnalyze() {
    setState({ status: 'loading' })
    try {
      const res = await fetch('/api/analyze-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, executionId, errorMessage, nodeName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState({ status: 'error', message: data.error ?? 'Error desconocido' })
      } else {
        setState({ status: 'done', analysis: data.analysis })
      }
    } catch (err) {
      setState({ status: 'error', message: String(err) })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={handleAnalyze} disabled={state.status === 'loading'}>
        {state.status === 'loading' ? 'Analizando...' : 'Analizar con IA'}
      </Button>
      {state.status === 'done' && (
        <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {state.analysis}
        </div>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
    </div>
  )
}

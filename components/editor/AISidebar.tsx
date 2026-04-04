'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ToneSelector, type Tone } from './ToneSelector'

interface AISidebarProps {
  context: string
  onInsert: (text: string) => void
  onReplace: (text: string) => void
}

export function AISidebar({ context, onInsert, onReplace }: AISidebarProps) {
  const [prompt, setPrompt] = useState('')
  const [tone, setTone] = useState<Tone>('professional')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!prompt.trim()) return
    setOutput('')
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone, context }),
      })

      if (!res.ok) {
        const msg = await res.text()
        setError(msg || 'Error al generar')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value) break
        setOutput((prev) => prev + decoder.decode(value, { stream: true }))
      }
    } catch {
      setError('Error de red al conectar con la API')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 border-l p-4">
      <h2 className="font-semibold">Asistente IA</h2>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">Tono</label>
        <ToneSelector value={tone} onChange={setTone} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">Prompt</label>
        <Textarea
          placeholder="¿Qué querés generar?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-24 resize-none"
        />
      </div>

      <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
        {loading ? 'Generando…' : 'Generar'}
      </Button>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {(output || loading) && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Output</label>
          <Textarea
            readOnly
            value={output}
            className="min-h-40 resize-none bg-muted/30 font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!output}
              onClick={() => onInsert(output)}
              className="flex-1"
            >
              Insertar al final
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!output}
              onClick={() => onReplace(output)}
              className="flex-1"
            >
              Reemplazar todo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

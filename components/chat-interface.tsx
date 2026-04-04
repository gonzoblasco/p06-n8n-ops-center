'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Document = {
  id: string
  title: string
  chunk_count: number
}

type Source = {
  chunk_id: string
  document_id: string
  title: string
  content_preview: string
  similarity: number
}

type Message =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; sources: Source[]; done: boolean }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function similarityColor(score: number) {
  if (score >= 0.8) return 'text-green-600 dark:text-green-400'
  if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SourcesPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false)

  if (sources.length === 0) return null

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronIcon open={open} />
        Fuentes ({sources.length})
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {sources.map((s) => (
            <div
              key={s.chunk_id}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{s.title}</span>
                <span className={`tabular-nums font-medium ${similarityColor(s.similarity)}`}>
                  {Math.round(s.similarity * 100)}%
                </span>
              </div>
              <p className="mt-1 text-muted-foreground leading-snug">{s.content_preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={[
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-bl-sm bg-muted text-foreground',
          ].join(' ')}
        >
          {message.content}
          {message.role === 'assistant' && !message.done && (
            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-middle" />
          )}
        </div>

        {message.role === 'assistant' && message.done && (
          <SourcesPanel sources={message.sources} />
        )}
      </div>
    </div>
  )
}

function SkeletonMessage() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] space-y-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
        <div className="h-3 w-48 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-3 w-32 animate-pulse rounded bg-muted-foreground/20" />
      </div>
    </div>
  )
}

function EmptyChat() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <p className="text-base font-medium">Hacé tu primera pregunta</p>
      <p className="text-sm text-muted-foreground">
        Seleccioná documentos en el panel izquierdo y escribí tu consulta.
      </p>
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatInterface({ documents }: { documents: Document[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  function toggleDoc(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function sendMessage() {
    const query = input.trim()
    if (!query || selectedIds.size === 0 || loading) return

    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, { role: 'user', content: query }])
    setInput('')
    setLoading(true)

    // Append empty assistant message that will stream into
    const assistantIdx = messages.length + 1
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: '', sources: [], done: false },
    ])

    setTimeout(scrollToBottom, 50)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          document_ids: Array.from(selectedIds),
          history,
        }),
      })

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === assistantIdx
              ? { ...m, role: 'assistant' as const, content: 'Error al obtener respuesta.', sources: [], done: true }
              : m,
          ),
        )
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') {
            setMessages((prev) =>
              prev.map((m, i) =>
                i === assistantIdx ? { ...m, role: 'assistant' as const, done: true } : m,
              ),
            )
            break
          }

          try {
            const event = JSON.parse(raw)
            if (event.type === 'text') {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === assistantIdx
                    ? { ...m, role: 'assistant' as const, content: m.content + event.content }
                    : m,
                ),
              )
              scrollToBottom()
            } else if (event.type === 'sources') {
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === assistantIdx
                    ? { ...m, role: 'assistant' as const, sources: event.sources }
                    : m,
                ),
              )
            }
          } catch {
            // malformed JSON line — skip
          }
        }
      }
    } finally {
      setLoading(false)
      setTimeout(scrollToBottom, 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const canSend = input.trim().length > 0 && selectedIds.size > 0 && !loading

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Documentos
        </p>

        {documents.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Subí documentos en la sección{' '}
            <a href="/dashboard/documents" className="underline hover:text-foreground">
              Documentos
            </a>{' '}
            para comenzar.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {documents.map((doc) => {
              const checked = selectedIds.has(doc.id)
              return (
                <li key={doc.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDoc(doc.id)}
                      className="mt-0.5 shrink-0 accent-primary"
                    />
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="truncate font-medium leading-snug">{doc.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {doc.chunk_count} chunks
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {messages.length === 0 && !loading && <EmptyChat />}

          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {loading && messages[messages.length - 1]?.role !== 'assistant' && (
            <SkeletonMessage />
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input footer */}
        <div className="border-t border-border bg-background px-4 py-3">
          {selectedIds.size === 0 && documents.length > 0 && (
            <p className="mb-2 text-xs text-muted-foreground">
              Seleccioná al menos un documento para enviar tu consulta.
            </p>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí tu pregunta… (Enter para enviar, Shift+Enter para nueva línea)"
              disabled={loading}
              className="max-h-40 resize-none"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!canSend}
              size="icon"
              className="shrink-0"
              aria-label="Enviar"
            >
              <SendIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

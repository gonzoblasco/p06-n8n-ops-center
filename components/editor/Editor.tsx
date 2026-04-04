'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateSession } from '@/lib/actions/writing'
import { AISidebar } from './AISidebar'
import { VersionHistory } from './VersionHistory'

interface Session {
  id: string
  title: string
  content: string
  updated_at: string
}

interface EditorProps {
  session: Session
}

const AUTOSAVE_DELAY = 2000

export function Editor({ session }: EditorProps) {
  const [title, setTitle] = useState(session.title)
  const [content, setContent] = useState(session.content)
  const [saving, setSaving] = useState(false)
  const [versions, setVersions] = useState<string[]>([])

  const titleRef = useRef(title)
  const contentRef = useRef(content)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)

  titleRef.current = title
  contentRef.current = content

  const save = useCallback(async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    setSaving(true)
    await updateSession(session.id, {
      title: titleRef.current,
      content: contentRef.current,
    })
    setSaving(false)
  }, [session.id])

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, AUTOSAVE_DELAY)
  }, [save])

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (dirtyRef.current) {
        updateSession(session.id, {
          title: titleRef.current,
          content: contentRef.current,
        })
      }
    }
  }, [session.id])

  function pushVersion(snapshot: string) {
    setVersions((prev) => [snapshot, ...prev].slice(0, 10))
  }

  function handleInsert(text: string) {
    pushVersion(contentRef.current)
    setContent((prev) => {
      const next = prev ? prev + '\n\n' + text : text
      contentRef.current = next
      dirtyRef.current = true
      scheduleSave()
      return next
    })
  }

  function handleReplace(text: string) {
    pushVersion(contentRef.current)
    setContent(text)
    contentRef.current = text
    dirtyRef.current = true
    scheduleSave()
  }

  function handleRestore(version: string) {
    pushVersion(contentRef.current)
    setContent(version)
    contentRef.current = version
    dirtyRef.current = true
    scheduleSave()
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            scheduleSave()
          }}
          className="max-w-sm border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
          placeholder="Sin título"
        />
        <span className="text-xs text-muted-foreground">
          {saving ? 'Guardando…' : 'Guardado'}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-y-auto" style={{ flex: '2 1 0' }}>
          <div className="flex-1 p-6">
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
                scheduleSave()
              }}
              placeholder="Empezá a escribir…"
              className="h-full min-h-96 w-full resize-none border-none bg-transparent text-base shadow-none focus-visible:ring-0"
            />
          </div>
          <VersionHistory versions={versions} onRestore={handleRestore} />
        </main>

        <aside className="overflow-y-auto" style={{ flex: '1 1 0' }}>
          <AISidebar
            context={content}
            onInsert={handleInsert}
            onReplace={handleReplace}
          />
        </aside>
      </div>
    </div>
  )
}

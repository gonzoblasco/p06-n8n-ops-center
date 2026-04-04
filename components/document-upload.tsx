'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; filename: string }
  | { status: 'error'; message: string }

export function DocumentUpload() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [isDragging, setIsDragging] = useState(false)

  async function upload(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'md') {
      setState({ status: 'error', message: 'Solo se aceptan archivos PDF o Markdown (.md)' })
      return
    }

    setState({ status: 'uploading', filename: file.name })

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setState({ status: 'error', message: body.error ?? 'Error al subir el archivo' })
        return
      }
      setState({ status: 'idle' })
      router.refresh()
    } catch {
      setState({ status: 'error', message: 'Error de red. Intentá de nuevo.' })
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    upload(files[0])
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const isUploading = state.status === 'uploading'

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/40',
          isUploading ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        {isUploading ? (
          <>
            <Spinner />
            <p className="text-sm text-muted-foreground">
              Subiendo <span className="font-medium text-foreground">{state.filename}</span>…
            </p>
          </>
        ) : (
          <>
            <UploadIcon />
            <div>
              <p className="text-sm font-medium">Arrastrá un archivo o hacé clic para seleccionar</p>
              <p className="text-xs text-muted-foreground">PDF o Markdown (.md)</p>
            </div>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.md"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {state.status === 'error' && (
        <div className="flex items-center justify-between rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span>{state.message}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setState({ status: 'idle' })}
            className="text-destructive hover:bg-destructive/20"
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  )
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="size-8 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="size-6 animate-spin text-primary"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

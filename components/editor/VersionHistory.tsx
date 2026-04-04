'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface VersionHistoryProps {
  versions: string[]
  onRestore: (version: string) => void
}

export function VersionHistory({ versions, onRestore }: VersionHistoryProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <span>Historial de versiones</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul className="flex flex-col gap-1 px-2 pb-3">
          {versions.length === 0 ? (
            <li className="py-2 text-xs text-muted-foreground">
              Sin versiones anteriores
            </li>
          ) : (
            versions.map((v, i) => (
              <li
                key={`v-${i}-${v.slice(0, 8)}`}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
              >
                <span className="shrink-0 font-medium text-muted-foreground">
                  V{versions.length - i}
                </span>
                <span className="flex-1 truncate text-foreground">
                  {v.slice(0, 60) || <em className="text-muted-foreground">vacío</em>}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 shrink-0 px-2 text-xs"
                  onClick={() => onRestore(v)}
                >
                  Restaurar
                </Button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

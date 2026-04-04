'use client'

export type Tone = 'professional' | 'casual' | 'creative' | 'concise'

const TONES: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'creative', label: 'Creative' },
  { value: 'concise', label: 'Concise' },
]

interface ToneSelectorProps {
  value: Tone
  onChange: (tone: Tone) => void
}

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TONES.map((tone) => (
        <button
          key={tone.value}
          type="button"
          onClick={() => onChange(tone.value)}
          className={
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
            (value === tone.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground')
          }
        >
          {tone.label}
        </button>
      ))}
    </div>
  )
}

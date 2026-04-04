'use client'

import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface ThresholdSliderProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function ThresholdSlider({ value, onChange, disabled }: ThresholdSliderProps) {
  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-card/50">
      <div className="flex items-center justify-between">
        <Label htmlFor="threshold" className="text-sm font-medium">
          Umbral de Similitud (Embedding)
        </Label>
        <Badge variant="secondary" className="px-2 font-mono">
          {(value * 100).toFixed(0)}%
        </Badge>
      </div>
      <Slider
        id="threshold"
        min={0}
        max={1}
        step={0.05}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        disabled={disabled}
        className="cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Exactitud Baja (Más resultados)</span>
        <span>Exactitud Alta (Menos resultados)</span>
      </div>
    </div>
  )
}

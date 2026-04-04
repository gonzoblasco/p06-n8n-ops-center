'use client'

import { useState, useEffect } from 'react'
import { SearchBar } from './SearchBar'
import { ResultsTable } from './ResultsTable'
import { ThresholdSlider } from './ThresholdSlider'
import { SupportItem, getItems } from '@/lib/actions/support'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Sparkles } from 'lucide-react'

export function SemanticDashboard() {
  const [items, setItems] = useState<SupportItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSemantic, setIsSemantic] = useState(false)
  const [threshold, setThreshold] = useState(0.5)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch initial items
  const fetchInitialItems = async () => {
    setIsLoading(true)
    setIsSemantic(false)
    const { data } = await getItems()
    setItems(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchInitialItems()
    
    // Recovery of threshold from sessionStorage
    const savedThreshold = sessionStorage.getItem('semantic_threshold')
    if (savedThreshold) setThreshold(parseFloat(savedThreshold))
  }, [])

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setIsSemantic(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, threshold, limit: 20 })
      })

      const data = await response.json()
      if (Array.isArray(data)) {
        setItems(data)
      } else {
        console.error('Error in search:', data.error)
        setItems([])
        setErrorMessage('Error al realizar la búsqueda. Intentá de nuevo.')
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setItems([])
      setErrorMessage('Error al realizar la búsqueda. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleThresholdChange = (newVal: number) => {
    setThreshold(newVal)
    sessionStorage.setItem('semantic_threshold', newVal.toString())
  }

  const clearSearch = () => {
    setErrorMessage(null)
    fetchInitialItems()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
        <div className="flex-1 w-full space-y-4">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          <ThresholdSlider 
            value={threshold} 
            onChange={handleThresholdChange} 
            disabled={isLoading}
          />
        </div>
        
        {isSemantic && (
          <Button 
            variant="outline" 
            onClick={clearSearch} 
            className="shrink-0"
            disabled={isLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Limpiar búsqueda
          </Button>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Resultados</h2>
          {isSemantic ? (
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none flex gap-1">
              <Sparkles className="h-3 w-3" />
              Vista Semántica
            </Badge>
          ) : (
            <Badge variant="outline">Todos los items</Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          Mostrando {items.length} items
        </p>
      </div>

      <ResultsTable 
        items={items} 
        isLoading={isLoading} 
        isSemantic={isSemantic} 
      />
    </div>
  )
}

import { useState, useCallback } from 'react'
import { analyzeContract, ClauseSuggestion, ImageSuggestion, AnalyzeResult } from '../services/api'

export type WorkflowState = 'idle' | 'uploading' | 'analyzing' | 'reviewing' | 'done'

export interface UseAnalysisReturn {
  state: WorkflowState
  clauses: ClauseSuggestion[]
  images: ImageSuggestion[]
  isStreaming: boolean
  error: string | null
  currentClauseIndex: number
  totalClauses: number
  currentImageIndex: number
  totalImages: number
  analyze: (text: string, contractType: string, images: string[], provider?: string) => Promise<void>
  reset: () => void
  setState: (state: WorkflowState) => void
}

export function useAnalysis(): UseAnalysisReturn {
  const [state, setState] = useState<WorkflowState>('idle')
  const [clauses, setClauses] = useState<ClauseSuggestion[]>([])
  const [images, setImages] = useState<ImageSuggestion[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentClauseIndex, setCurrentClauseIndex] = useState(0)
  const [totalClauses, setTotalClauses] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [totalImages, setTotalImages] = useState(0)

  const analyze = useCallback(
    async (text: string, contractType: string, imgs: string[], provider?: string) => {
      setIsStreaming(true)
      setError(null)
      setClauses([])
      setImages([])
      setState('analyzing')
      setCurrentClauseIndex(0)
      setCurrentImageIndex(0)
      setTotalClauses(0)
      setTotalImages(0)

      let clauseCount = 0
      let imageCount = 0

      try {
        await analyzeContract(text, contractType, imgs, (result: AnalyzeResult) => {
          if (result.type === 'clause' && result.clause) {
            clauseCount++
            setCurrentClauseIndex(clauseCount)
            setClauses((prev) => [...prev, result.clause!])
          } else if (result.type === 'image' && result.image) {
            imageCount++
            setCurrentImageIndex(imageCount)
            setImages((prev) => [...prev, result.image!])
          } else if (result.type === 'done') {
            setTotalClauses(result.total_clauses ?? clauseCount)
            setTotalImages(result.total_images ?? imageCount)
            setState('reviewing')
            setIsStreaming(false)
          } else if (result.type === 'error' && result.message) {
            setError(result.message)
            setIsStreaming(false)
          }
        }, provider)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis failed')
        setState('idle')
        setIsStreaming(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState('idle')
    setClauses([])
    setImages([])
    setError(null)
    setCurrentClauseIndex(0)
    setTotalClauses(0)
    setCurrentImageIndex(0)
    setTotalImages(0)
    setIsStreaming(false)
  }, [])

  return {
    state,
    clauses,
    images,
    isStreaming,
    error,
    currentClauseIndex,
    totalClauses,
    currentImageIndex,
    totalImages,
    analyze,
    reset,
    setState,
  }
}

import { useState, useRef, useCallback } from 'react'
import LeftPane from './LeftPane'
import RightPane from './RightPane'
import { ClauseSuggestion, ImageSuggestion } from '../services/api'
import { WorkflowState } from '../hooks/useAnalysis'

interface SplitEditorProps {
  content: string
  onContentChange: (html: string) => void
  clauses: ClauseSuggestion[]
  images: ImageSuggestion[]
  isStreaming: boolean
  currentClauseIndex: number
  totalClauses: number
  currentImageIndex: number
  totalImages: number
  error: string | null
  onImageDelete?: (src: string) => void
  state: WorkflowState
}

export default function SplitEditor({
  content,
  onContentChange,
  clauses,
  images,
  isStreaming,
  currentClauseIndex,
  totalClauses,
  currentImageIndex,
  totalImages,
  error,
  onImageDelete,
  state,
}: SplitEditorProps) {
  const [leftWidth, setLeftWidth] = useState(60) // percent
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100
    setLeftWidth(Math.max(30, Math.min(80, newWidth)))
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  // Attach global mouse events for drag
  if (typeof window !== 'undefined') {
    window.onmouseup = handleMouseUp
    window.onmousemove = handleMouseMove
  }

  const handleSuggestionClick = useCallback((clauseId: string) => {
    setHighlightedClauseId(clauseId)
    // In a full implementation, this would scroll to and highlight the clause in the editor
  }, [])

  const handleImageClick = useCallback((imageId: string) => {
    // In a full implementation, this would highlight the corresponding image
    console.log('Image clicked:', imageId)
  }, [])

  return (
    <div ref={containerRef} className="split-container">
      <div
        className="left-pane"
        style={{ width: `${leftWidth}%` }}
      >
        <LeftPane
          content={content}
          onChange={onContentChange}
          highlightedClauseId={highlightedClauseId}
          onImageDelete={onImageDelete}
          editable={state !== 'uploading' && state !== 'analyzing'}
        />
      </div>

      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
      />

      <div
        className="right-pane"
        style={{ width: `${100 - leftWidth}%` }}
      >
        <RightPane
          clauses={clauses}
          images={images}
          isStreaming={isStreaming}
          currentClauseIndex={currentClauseIndex}
          totalClauses={totalClauses}
          currentImageIndex={currentImageIndex}
          totalImages={totalImages}
          error={error}
          onSuggestionClick={handleSuggestionClick}
          onImageClick={handleImageClick}
        />
      </div>
    </div>
  )
}

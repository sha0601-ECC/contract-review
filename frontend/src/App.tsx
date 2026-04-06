import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import SplitEditor from './components/SplitEditor'
import ContractTypeSelect from './components/ContractTypeSelect'
import UploadPanel from './components/UploadPanel'
import { getContractTypes, parseContract, ContractType } from './services/api'
import { useAnalysis } from './hooks/useAnalysis'
import { FiPlay, FiRefreshCw, FiDownload, FiSave } from 'react-icons/fi'

export default function App() {
  const [contractTypes, setContractTypes] = useState<ContractType[]>([])
  const [selectedType, setSelectedType] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [filename, setFilename] = useState('')

  const {
    state,
    clauses,
    images: analyzedImages,
    isStreaming,
    error,
    currentClauseIndex,
    totalClauses,
    currentImageIndex,
    totalImages,
    analyze,
    reset,
    setState,
  } = useAnalysis()

  // Fetch contract types on mount
  useEffect(() => {
    getContractTypes()
      .then(setContractTypes)
      .catch(console.error)
  }, [])

  const handleFileSelect = useCallback(
    async (file: File) => {
      setFilename(file.name)
      setState('uploading')
      reset()

      try {
        const result = await parseContract(file)
        setContent(result.text)
        setImages(result.images)
        setState('idle')
      } catch (err) {
        console.error('Parse error:', err)
        setState('idle')
      }
    },
    [reset, setState]
  )

  const handleAnalyze = useCallback(() => {
    if (!content || !selectedType) return
    analyze(content, selectedType, images)
  }, [content, selectedType, images, analyze])

  const handleReanalyze = useCallback(() => {
    handleAnalyze()
  }, [handleAnalyze])

  const handleSave = useCallback(() => {
    // Save current state to localStorage
    localStorage.setItem(
      'contract-draft',
      JSON.stringify({ content, filename, selectedType })
    )
    alert('已保存')
  }, [content, filename, selectedType])

  const handleDownload = useCallback(async () => {
    // Use backend to generate proper Word doc with images
    try {
      const res = await fetch('/api/contracts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html_content: content, images, filename }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename.replace(/\.[^.]+$/, '')}_审核后.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('导出失败，请重试')
    }
  }, [content, images, filename])

  const handleImageDelete = useCallback(
    (src: string) => {
      // Remove from images array
      setImages((prev) => prev.filter((img) => img !== src))
    },
    []
  )

  const showSplitView = state !== 'idle' || content

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">合同审核系统</h1>

          {showSplitView && (
            <ContractTypeSelect
              types={contractTypes}
              selected={selectedType}
              onChange={setSelectedType}
              disabled={isStreaming}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSplitView && (
            <>
              {state === 'reviewing' && (
                <button
                  onClick={handleReanalyze}
                  disabled={!selectedType || isStreaming}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiRefreshCw className={isStreaming ? 'animate-spin' : ''} />
                  重新审核
                </button>
              )}

              {state !== 'idle' && state !== 'uploading' && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <FiSave />
                  保存
                </button>
              )}

              {state === 'reviewing' && (
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <FiDownload />
                  下载
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main>
        {!showSplitView ? (
          <div className="max-w-xl mx-auto mt-16 px-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                上传合同开始审核
              </h2>
              <p className="text-gray-500">
                支持 PDF、Word、文本格式，图片和图表也会一并分析
              </p>
            </div>

            <UploadPanel
              onFileSelect={handleFileSelect}
              isLoading={state === 'uploading'}
            />

            <div className="mt-6 text-center text-sm text-gray-400">
              选择合同类型后，系统将根据该类型模板进行风险分析
            </div>
          </div>
        ) : (
          <>
            {/* Upload overlay (shown when analyzing) */}
            {state === 'idle' && (
              <div className="max-w-xl mx-auto mt-4 px-4">
                <UploadPanel
                  onFileSelect={handleFileSelect}
                  isLoading={state === 'uploading'}
                  filename={filename}
                  imageCount={images.length}
                />
              </div>
            )}

            {/* Analyze button */}
            {state === 'idle' && content && selectedType && (
              <div className="text-center mt-4">
                <button
                  onClick={handleAnalyze}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 mx-auto"
                >
                  <FiPlay />
                  开始分析
                </button>
              </div>
            )}

            {/* Split editor */}
            {(state === 'analyzing' || state === 'reviewing' || state === 'done') && (
              <SplitEditor
                content={content}
                onContentChange={setContent}
                clauses={clauses}
                images={analyzedImages}
                isStreaming={isStreaming}
                currentClauseIndex={currentClauseIndex}
                totalClauses={totalClauses}
                currentImageIndex={currentImageIndex}
                totalImages={totalImages}
                error={error}
                onImageDelete={handleImageDelete}
                state={state}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

import { ClauseSuggestion, ImageSuggestion } from '../services/api'
import { FiAlertTriangle, FiImage, FiCheck, FiX } from 'react-icons/fi'

interface RightPaneProps {
  clauses: ClauseSuggestion[]
  images: ImageSuggestion[]
  isStreaming: boolean
  currentClauseIndex: number
  totalClauses: number
  currentImageIndex: number
  totalImages: number
  error: string | null
  onSuggestionClick?: (clauseId: string) => void
  onImageClick?: (imageId: string) => void
}

const riskColors = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const

const riskLabels = {
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '低风险',
  INFO: '参考',
}

export default function RightPane({
  clauses,
  images,
  isStreaming,
  currentClauseIndex,
  totalClauses,
  currentImageIndex,
  totalImages,
  error,
  onSuggestionClick,
  onImageClick,
}: RightPaneProps) {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-3 border-b bg-white">
        <h2 className="font-semibold text-gray-800">审核建议</h2>
        <p className="text-xs text-gray-500 mt-1">
          {isStreaming
            ? `分析中... (条款 ${currentClauseIndex}/${totalClauses} | 图片 ${currentImageIndex}/${totalImages})`
            : `${clauses.length} 条条款建议 · ${images.length} 条图片建议`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {error && (
          <div className="mx-2 my-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <FiAlertTriangle className="inline mr-2" />
            {error}
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !clauses.length && !images.length && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="animate-pulse text-center">
              <div className="text-lg mb-2">🔍 正在分析合同...</div>
              <div className="text-sm">这可能需要几秒钟</div>
            </div>
          </div>
        )}

        {/* Clause suggestions */}
        {clauses.length > 0 && (
          <div className="mb-4">
            <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
              条款建议 ({clauses.length})
            </h3>
            {clauses.map((clause, idx) => (
              <div
                key={clause.clause_id || idx}
                className={`suggestion-card ${riskColors[clause.risk_level]}`}
                onClick={() => onSuggestionClick?.(clause.clause_id)}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={`risk-badge ${riskColors[clause.risk_level]}`}>
                    {riskLabels[clause.risk_level]}
                  </span>
                  <span className="text-xs text-gray-400">{clause.category}</span>
                </div>
                <p className="text-sm font-medium text-gray-800 mb-1">{clause.suggestion}</p>
                {clause.clause_text && (
                  <p className="text-xs text-gray-500 italic truncate">
                    原文: {clause.clause_text.slice(0, 60)}...
                  </p>
                )}
                {clause.rewrite && (
                  <p className="text-xs text-blue-600 mt-1">
                    建议修改: {clause.rewrite.slice(0, 80)}
                    {clause.rewrite.length > 80 ? '...' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Image suggestions */}
        {images.length > 0 && (
          <div>
            <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
              图片建议 ({images.length})
            </h3>
            {images.map((img, idx) => (
              <div
                key={img.image_id || idx}
                className={`suggestion-card ${riskColors[img.risk_level]}`}
                onClick={() => onImageClick?.(img.image_id)}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className={`risk-badge ${riskColors[img.risk_level]}`}>
                    {riskLabels[img.risk_level]}
                  </span>
                  <div className="flex items-center gap-1">
                    {img.action === 'delete' && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <FiX /> 删除
                      </span>
                    )}
                    {img.action === 'replace' && (
                      <span className="text-xs text-orange-600 flex items-center gap-1">
                        <FiImage /> 替换
                      </span>
                    )}
                    {img.action === 'keep' && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <FiCheck /> 保留
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  图片 #{img.image_index + 1} · {img.category}
                </p>
                <p className="text-sm text-gray-700">{img.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isStreaming && !clauses.length && !images.length && !error && (
          <div className="text-center text-gray-400 mt-16">
            <FiAlertTriangle className="mx-auto text-3xl mb-2 opacity-50" />
            <p className="text-sm">暂无建议</p>
            <p className="text-xs">上传合同并选择类型后开始分析</p>
          </div>
        )}
      </div>
    </div>
  )
}

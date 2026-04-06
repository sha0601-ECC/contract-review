import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FiUpload, FiFile, FiImage } from 'react-icons/fi'

interface UploadPanelProps {
  onFileSelect: (file: File) => void
  isLoading: boolean
  filename?: string
  imageCount?: number
}

export default function UploadPanel({
  onFileSelect,
  isLoading,
  filename,
  imageCount,
}: UploadPanelProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
    },
    multiple: false,
    disabled: isLoading,
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      {filename ? (
        <div className="flex flex-col items-center gap-2">
          <FiFile className="text-3xl text-blue-500" />
          <p className="font-medium text-gray-800">{filename}</p>
          {imageCount !== undefined && imageCount > 0 && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <FiImage /> 包含 {imageCount} 张图片
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {isLoading ? '解析中...' : '点击或拖拽重新上传'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <FiUpload className={`text-4xl ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-gray-600">
            {isDragActive ? '松开以上传' : '拖拽合同文件到此处'}
          </p>
          <p className="text-sm text-gray-400">
            支持 PDF、Word (.docx)、文本 (.txt)
          </p>
          <p className="text-xs text-gray-400 mt-1">
            含图片/图表的合同也能正确分析
          </p>
        </div>
      )}
    </div>
  )
}

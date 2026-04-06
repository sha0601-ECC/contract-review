import { FiCpu } from 'react-icons/fi'

interface Provider {
  id: string
  name: string
  vision: boolean
}

const PROVIDERS: Provider[] = [
  { id: 'claude', name: 'Claude (Anthropic)', vision: true },
  { id: 'openai', name: 'GPT-4o (OpenAI)', vision: true },
  { id: 'qwen', name: 'Qwen (阿里云)', vision: true },
  { id: 'kimi', name: 'Kimi (Moonshot)', vision: true },
  { id: 'deepseek', name: 'DeepSeek', vision: false },
  { id: 'minimax', name: 'MiniMax', vision: false },
  { id: 'ollama', name: 'Ollama (本地)', vision: true },
]

interface ProviderSelectProps {
  selected: string
  onChange: (id: string) => void
  disabled?: boolean
  hasImages?: boolean
}

export default function ProviderSelect({
  selected,
  onChange,
  disabled,
  hasImages,
}: ProviderSelectProps) {
  const currentProvider = PROVIDERS.find((p) => p.id === selected)

  return (
    <div className="flex items-center gap-2">
      <FiCpu className="text-gray-400" />
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {hasImages && currentProvider && !currentProvider.vision && (
        <span className="text-xs text-orange-500">
          (当前模型不支持图片，将仅分析文本)
        </span>
      )}
    </div>
  )
}

export { PROVIDERS }

const API_BASE = '/api'

export interface ContractType {
  id: string
  name: string
  description: string
}

export interface ParsedContract {
  text: string
  images: string[]
  filename: string
}

export interface ClauseSuggestion {
  clause_id: string
  clause_text: string
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  category: string
  suggestion: string
  rewrite?: string
}

export interface ImageSuggestion {
  image_id: string
  image_index: number
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  category: string
  suggestion: string
  action: 'delete' | 'replace' | 'keep'
}

export interface AnalyzeResult {
  type: 'clause' | 'image' | 'done' | 'partial' | 'error'
  clause?: ClauseSuggestion
  image?: ImageSuggestion
  content?: string
  message?: string
  total_clauses?: number
  total_images?: number
}

export async function getContractTypes(): Promise<ContractType[]> {
  const res = await fetch(`${API_BASE}/contracts/types`)
  if (!res.ok) throw new Error('Failed to fetch contract types')
  return res.json()
}

export async function parseContract(file: File): Promise<ParsedContract> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/contracts/parse`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to parse contract')
  return res.json()
}

export async function analyzeContract(
  text: string,
  contractType: string,
  images: string[],
  onChunk: (result: AnalyzeResult) => void
): Promise<void> {
  const response = await fetch(`${API_BASE}/contracts/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, contract_type: contractType, images }),
  })

  if (!response.ok) throw new Error('Failed to analyze contract')

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) throw new Error('No response body')

  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          onChunk(data)
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }
}

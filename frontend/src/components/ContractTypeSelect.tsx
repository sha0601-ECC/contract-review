import { ContractType } from '../services/api'
import { FiFileText } from 'react-icons/fi'

interface ContractTypeSelectProps {
  types: ContractType[]
  selected: string
  onChange: (id: string) => void
  disabled?: boolean
}

export default function ContractTypeSelect({
  types,
  selected,
  onChange,
  disabled,
}: ContractTypeSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <FiFileText className="text-gray-400" />
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">选择合同类型</option>
        {types.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </select>
    </div>
  )
}

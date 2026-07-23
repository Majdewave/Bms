import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export default function SearchInput({ value, placeholder, onChange }: SearchInputProps) {
  return (
    <label className="platform-search-input">
      <Search className="h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="platform-search-field"
      />
    </label>
  )
}

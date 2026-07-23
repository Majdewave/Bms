interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
}

export default function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  return (
    <label className="platform-filter-dropdown">
      <span className="platform-filter-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="platform-filter-select">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

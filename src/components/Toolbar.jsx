import Icon from './Icon'

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search">
      <Icon name="search" size={16} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

export function DepartmentSelect({ value, onChange, departments }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Filter by department">
      <option value="all">All departments</option>
      {departments.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  )
}

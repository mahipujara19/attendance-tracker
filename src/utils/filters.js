export function matchesQuery(employee, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [employee.name, employee.email, employee.department, employee.title].some((field) =>
    field.toLowerCase().includes(q),
  )
}

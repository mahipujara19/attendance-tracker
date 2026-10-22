import { useCallback, useEffect, useMemo, useState } from 'react'
import { createEmployee, deleteEmployee, fetchEmployees, isCancelled, updateEmployee as putEmployee } from '../api/dummyjson'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { EmployeesContext } from './contexts'

function withFields(employee, fields) {
  return { ...employee, ...fields, name: `${fields.firstName} ${fields.lastName}`.trim() }
}

export default function EmployeesProvider({ children }) {
  const [remote, setRemote] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [added, setAdded] = useLocalStorage('attendly.employees.added', [])
  const [removedIds, setRemovedIds] = useLocalStorage('attendly.employees.removed', [])
  // DummyJSON doesn't persist updates, so edits to its employees are kept here: { [id]: fields }.
  const [edits, setEdits] = useLocalStorage('attendly.employees.edited', {})

  useEffect(() => {
    const controller = new AbortController()
    fetchEmployees({ signal: controller.signal })
      .then((list) => {
        setRemote(list)
        setStatus('success')
      })
      .catch((err) => {
        if (isCancelled(err)) return
        setError(err.message)
        setStatus('error')
      })
    return () => controller.abort()
  }, [reloadKey])

  const retry = useCallback(() => {
    setStatus('loading')
    setError(null)
    setReloadKey((key) => key + 1)
  }, [])

  // If loading failed, try again automatically as soon as the connection comes back.
  useEffect(() => {
    if (status !== 'error') return
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [status, retry])

  const employees = useMemo(() => {
    const removed = new Set(removedIds)
    return [...remote, ...added]
      .filter((e) => !removed.has(e.id))
      .map((e) => (edits[e.id] ? withFields(e, edits[e.id]) : e))
  }, [remote, added, removedIds, edits])

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department))].sort((a, b) => a.localeCompare(b)),
    [employees],
  )

  const addEmployee = useCallback(
    async (input) => {
      const employee = await createEmployee(input)
      setAdded((prev) => [...prev, employee])
      return employee
    },
    [setAdded],
  )

  const updateEmployee = useCallback(
    async (employee, fields) => {
      if (employee.source === 'local') {
        // Locally added people only live in localStorage, so update them there.
        setAdded((prev) => prev.map((e) => (e.id === employee.id ? withFields(e, fields) : e)))
      } else {
        await putEmployee(employee.id, fields)
        setEdits((prev) => ({ ...prev, [employee.id]: fields }))
      }
      return withFields(employee, fields)
    },
    [setAdded, setEdits],
  )

  const removeEmployee = useCallback(
    async (employee) => {
      // Locally added people never existed on DummyJSON, so there is nothing to delete remotely.
      if (employee.source !== 'local') await deleteEmployee(employee.id)
      // DummyJSON doesn't really delete, so remember removed ids to keep them hidden after a refetch.
      setRemovedIds((prev) => (prev.includes(employee.id) ? prev : [...prev, employee.id]))
    },
    [setRemovedIds],
  )

  const value = useMemo(
    () => ({
      employees,
      departments,
      status,
      error,
      retry,
      addEmployee,
      updateEmployee,
      removeEmployee,
    }),
    [employees, departments, status, error, retry, addEmployee, updateEmployee, removeEmployee],
  )

  return <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>
}

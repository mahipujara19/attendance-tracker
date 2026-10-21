import { useCallback, useEffect, useMemo, useState } from 'react'
import { createEmployee, deleteEmployee, fetchEmployees, isCancelled } from '../api/dummyjson'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { EmployeesContext } from './contexts'

export default function EmployeesProvider({ children }) {
  const [remote, setRemote] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [added, setAdded] = useLocalStorage('attendly.employees.added', [])
  const [removedIds, setRemovedIds] = useLocalStorage('attendly.employees.removed', [])

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

  const employees = useMemo(() => {
    const removed = new Set(removedIds)
    return [...remote.filter((e) => !removed.has(e.id)), ...added]
  }, [remote, added, removedIds])

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

  const removeEmployee = useCallback(
    async (employee) => {
      if (employee.source === 'local') {
        // Locally added people never existed on DummyJSON, so there is nothing to delete remotely.
        setAdded((prev) => prev.filter((e) => e.id !== employee.id))
        return
      }
      await deleteEmployee(employee.id)
      setRemovedIds((prev) => (prev.includes(employee.id) ? prev : [...prev, employee.id]))
    },
    [setAdded, setRemovedIds],
  )

  const restoreDefaults = useCallback(() => setRemovedIds([]), [setRemovedIds])

  const value = useMemo(
    () => ({
      employees,
      departments,
      status,
      error,
      retry,
      addEmployee,
      removeEmployee,
      restoreDefaults,
      removedCount: removedIds.length,
    }),
    [employees, departments, status, error, retry, addEmployee, removeEmployee, restoreDefaults, removedIds.length],
  )

  return <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>
}

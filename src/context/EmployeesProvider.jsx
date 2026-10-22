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

  // If loading failed, try again automatically as soon as the connection comes back.
  useEffect(() => {
    if (status !== 'error') return
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [status, retry])

  const employees = useMemo(() => {
    const removed = new Set(removedIds)
    return [...remote, ...added].filter((e) => !removed.has(e.id))
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
      // Locally added people never existed on DummyJSON, so there is nothing to delete remotely.
      if (employee.source !== 'local') await deleteEmployee(employee.id)
      // Removal is a soft delete for everyone, so "Restore removed" can bring anyone back.
      setRemovedIds((prev) => (prev.includes(employee.id) ? prev : [...prev, employee.id]))
    },
    [setRemovedIds],
  )

  const restoreRemoved = useCallback(() => setRemovedIds([]), [setRemovedIds])

  const value = useMemo(
    () => ({
      employees,
      departments,
      status,
      error,
      retry,
      addEmployee,
      removeEmployee,
      restoreRemoved,
      removedCount: removedIds.length,
    }),
    [employees, departments, status, error, retry, addEmployee, removeEmployee, restoreRemoved, removedIds.length],
  )

  return <EmployeesContext.Provider value={value}>{children}</EmployeesContext.Provider>
}

import { useCallback, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { AttendanceContext } from './contexts'

// Shape: { "2026-10-21": { "<employeeId>": "present" | "absent" } }
export default function AttendanceProvider({ children }) {
  const [records, setRecords] = useLocalStorage('attendly.attendance', {})

  const mark = useCallback(
    (date, employeeId, status) => {
      setRecords((prev) => {
        const day = { ...(prev[date] ?? {}) }
        // Clicking the active status again clears it.
        if (day[employeeId] === status) delete day[employeeId]
        else day[employeeId] = status
        return { ...prev, [date]: day }
      })
    },
    [setRecords],
  )

  const markMany = useCallback(
    (date, employeeIds, status) => {
      setRecords((prev) => {
        const day = { ...(prev[date] ?? {}) }
        employeeIds.forEach((id) => {
          day[id] = status
        })
        return { ...prev, [date]: day }
      })
    },
    [setRecords],
  )

  const clearDay = useCallback(
    (date) => {
      setRecords((prev) => {
        const next = { ...prev }
        delete next[date]
        return next
      })
    },
    [setRecords],
  )

  const value = useMemo(
    () => ({ records, mark, markMany, clearDay }),
    [records, mark, markMany, clearDay],
  )

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>
}

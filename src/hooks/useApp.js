import { useContext } from 'react'
import { AttendanceContext, EmployeesContext, ToastContext } from '../context/contexts'

function useRequiredContext(context, name) {
  const value = useContext(context)
  if (!value) throw new Error(`${name} must be used inside its provider`)
  return value
}

export const useEmployees = () => useRequiredContext(EmployeesContext, 'useEmployees')
export const useAttendance = () => useRequiredContext(AttendanceContext, 'useAttendance')
export const useToast = () => useRequiredContext(ToastContext, 'useToast')

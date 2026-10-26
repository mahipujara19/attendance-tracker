import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EmployeeDetail from './pages/EmployeeDetail'
import Employees from './pages/Employees'
import NotFound from './pages/NotFound'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

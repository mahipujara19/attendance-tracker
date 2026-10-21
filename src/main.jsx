import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import AttendanceProvider from './context/AttendanceProvider.jsx'
import EmployeesProvider from './context/EmployeesProvider.jsx'
import ToastProvider from './context/ToastProvider.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <EmployeesProvider>
          <AttendanceProvider>
            <App />
          </AttendanceProvider>
        </EmployeesProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)

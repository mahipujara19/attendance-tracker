import { useCallback, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { ToastContext } from './contexts'

const ICONS = { success: 'check', error: 'alert', info: 'info' }

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  // Messages currently on screen, so rapid repeat clicks don't stack identical toasts.
  const activeKeys = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    activeKeys.current.forEach((toastId, key) => {
      if (toastId === id) activeKeys.current.delete(key)
    })
  }, [])

  const notify = useCallback(
    (message, type = 'success') => {
      const key = `${type}:${message}`
      if (activeKeys.current.has(key)) return
      const id = crypto.randomUUID()
      activeKeys.current.set(key, id)
      setToasts((prev) => [...prev.slice(-3), { id, message, type }])
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon name={ICONS[toast.type]} />
            <span>{toast.message}</span>
            <button className="icon-btn" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

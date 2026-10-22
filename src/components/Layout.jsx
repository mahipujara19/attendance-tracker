import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useEmployees } from '../hooks/useApp'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { formatLong, todayKey } from '../utils/date'
import Icon from './Icon'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/employees', label: 'Employees', icon: 'users' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
]

function useTheme() {
  const [theme, setTheme] = useLocalStorage('attendly.theme', null)

  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme
    else delete document.documentElement.dataset.theme
  }, [theme])

  const toggle = () => {
    const current = theme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(current === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggle }
}

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false)
  const { pathname } = useLocation()
  const { toggle } = useTheme()
  const { employees, status } = useEmployees()
  const online = useOnlineStatus()

  // Close the mobile drawer when navigating.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setNavOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="check" size={18} />
          </span>
          <div>
            <strong>Attendly</strong>
            <small>Attendance tracker</small>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.to === '/employees' && status === 'success' && <span className="nav-count">{employees.length}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="muted small">
            <Icon name="calendar" size={14} /> {formatLong(todayKey())}
          </p>
          <button className="btn btn-ghost btn-block" onClick={toggle}>
            <Icon name="sun" size={16} className="show-dark" />
            <Icon name="moon" size={16} className="show-light" />
            <span className="show-light">Dark mode</span>
            <span className="show-dark">Light mode</span>
          </button>
        </div>
      </aside>

      {navOpen && <div className="drawer-backdrop" onClick={() => setNavOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open navigation">
            <Icon name="menu" />
          </button>
          <span className="brand-mark small">
            <Icon name="check" size={14} />
          </span>
          <strong>Attendly</strong>
        </header>
        {!online && (
          <div className="offline-banner" role="alert">
            <Icon name="wifiOff" size={16} />
            <span>
              <strong>You're offline.</strong> Attendance still saves on this device, but adding or removing
              employees won't work until you reconnect.
            </span>
          </div>
        )}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

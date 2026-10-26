import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchEmployeeProfile, isCancelled } from '../api/dummyjson'
import ConfirmDialog from '../components/ConfirmDialog'
import EmployeeFormModal from '../components/EmployeeFormModal'
import Icon from '../components/Icon'
import StatCard from '../components/StatCard'
import { EmptyState, ErrorState, LoadingState, Spinner } from '../components/States'
import { useAttendance, useEmployees, useToast } from '../hooks/useApp'
import { fromKey, isWeekend, toKey, todayKey } from '../utils/date'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const NEXT_STATUS = { none: 'present', present: 'absent', absent: null }

function shiftMonth(monthKey, amount) {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1 + amount, 1)
  return toKey(date).slice(0, 7)
}

function monthDays(monthKey) {
  const first = fromKey(`${monthKey}-01`)
  const offset = (first.getDay() + 6) % 7 // Monday-first grid
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: count }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`)
  return { offset, days }
}

function formatBirthDate(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="info-row">
      <span className="info-label">
        <Icon name={icon} size={14} /> {label}
      </span>
      <span className="info-value">{children || <span className="muted">—</span>}</span>
    </div>
  )
}

// Extra profile fields that only DummyJSON knows about – fetched separately with its own 3 states.
function ProfileDetails({ employee }) {
  const isLocal = employee.source === 'local'
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState(isLocal ? 'success' : 'loading')
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (isLocal) return
    const controller = new AbortController()
    fetchEmployeeProfile(employee.id, { signal: controller.signal })
      .then((data) => {
        setProfile(data)
        setStatus('success')
      })
      .catch((err) => {
        if (isCancelled(err)) return
        setError(err.message)
        setStatus('error')
      })
    return () => controller.abort()
  }, [employee.id, isLocal, reloadKey])

  const retry = () => {
    setStatus('loading')
    setError(null)
    setReloadKey((k) => k + 1)
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Profile</h2>
        {status === 'loading' && (
          <span className="small muted loading-inline">
            <Spinner size={12} /> Loading details…
          </span>
        )}
      </div>
      <div className="info-list">
        <InfoRow icon="mail" label="Email">
          <a href={`mailto:${employee.email}`}>{employee.email}</a>
        </InfoRow>
        <InfoRow icon="info" label="Phone">{employee.phone}</InfoRow>
        <InfoRow icon="briefcase" label="Department">{employee.department}</InfoRow>
        <InfoRow icon="users" label="Job title">{employee.title}</InfoRow>
      </div>

      {status === 'loading' && <LoadingState rows={3} label="Loading profile" />}
      {status === 'error' && <ErrorState title="Couldn't load more details" message={error} onRetry={retry} />}
      {status === 'success' && isLocal && (
        <p className="info-note small muted">
          <Icon name="info" size={14} /> This employee was added by you, so there are no extra profile details.
        </p>
      )}
      {status === 'success' && profile && (
        <div className="info-list bordered-top">
          <InfoRow icon="briefcase" label="Company">{profile.company}</InfoRow>
          <InfoRow icon="info" label="Age">{profile.age}</InfoRow>
          <InfoRow icon="info" label="Gender">
            {profile.gender && profile.gender[0].toUpperCase() + profile.gender.slice(1)}
          </InfoRow>
          <InfoRow icon="calendar" label="Birth date">{formatBirthDate(profile.birthDate)}</InfoRow>
          <InfoRow icon="info" label="Blood group">{profile.bloodGroup}</InfoRow>
          <InfoRow icon="info" label="University">{profile.university}</InfoRow>
          <InfoRow icon="info" label="Address">{profile.address}</InfoRow>
        </div>
      )}
    </section>
  )
}

function AttendanceCalendar({ employee }) {
  const { records, mark } = useAttendance()
  const today = todayKey()
  const [month, setMonth] = useState(today.slice(0, 7))
  const { offset, days } = monthDays(month)
  const isCurrentMonth = month === today.slice(0, 7)

  let present = 0
  let absent = 0
  days.forEach((date) => {
    if (isWeekend(date)) return
    const value = records[date]?.[employee.id]
    if (value === 'present') present++
    else if (value === 'absent') absent++
  })
  const monthStats = { present, absent, rate: present + absent ? Math.round((present / (present + absent)) * 100) : null }

  const cycle = (date) => {
    const current = records[date]?.[employee.id] ?? 'none'
    const next = NEXT_STATUS[current]
    // `mark` toggles off when given the current status, which clears the day.
    mark(date, employee.id, next ?? current)
  }

  const monthLabel = fromKey(`${month}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <section className="card">
      <div className="card-head">
        <h2>Attendance</h2>
        <div className="month-nav">
          <button className="icon-btn bordered" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <Icon name="chevronLeft" size={16} />
          </button>
          <strong className="month-label">{monthLabel}</strong>
          <button
            className="icon-btn bordered"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={isCurrentMonth}
            aria-label="Next month"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      <div className="month-summary small">
        <span className="status-text good">
          <Icon name="check" size={14} /> {monthStats.present} present
        </span>
        <span className="status-text critical">
          <Icon name="x" size={14} /> {monthStats.absent} absent
        </span>
        <span className="muted">
          {monthStats.rate === null ? 'No marks this month' : `${monthStats.rate}% attendance`}
        </span>
      </div>

      <div className="calendar" role="grid" aria-label={`Attendance for ${monthLabel}`}>
        {WEEKDAYS.map((d) => (
          <span key={d} className="calendar-weekday small">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {days.map((date) => {
          const day = Number(date.slice(8))
          const off = isWeekend(date)
          const future = date > today
          const value = records[date]?.[employee.id] ?? 'none'
          const state = off ? 'off' : future ? 'future' : value
          const label = off ? 'Weekly off' : future ? 'Upcoming' : value === 'none' ? 'Not marked' : value
          return (
            <button
              key={date}
              className={`calendar-day ${state} ${date === today ? 'today' : ''}`}
              disabled={off || future}
              onClick={() => cycle(date)}
              title={`${fromKey(date).toDateString()}: ${label}`}
              aria-label={`${fromKey(date).toDateString()}: ${label}`}
            >
              <span>{day}</span>
              {state === 'present' && <Icon name="check" size={12} />}
              {state === 'absent' && <Icon name="x" size={12} />}
            </button>
          )
        })}
      </div>

      <div className="calendar-legend small muted">
        <span><i className="swatch good" /> Present</span>
        <span><i className="swatch critical" /> Absent</span>
        <span><i className="swatch none" /> Not marked</span>
        <span><i className="swatch off" /> Weekly off</span>
        <span className="calendar-hint">Click a weekday to change it</span>
      </div>
    </section>
  )
}

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { employees, status, error, retry, removeEmployee } = useEmployees()
  const { records } = useAttendance()
  const { notify } = useToast()
  const [editing, setEditing] = useState(false)
  const [removal, setRemoval] = useState(null) // { status: 'confirm' | 'pending' | 'error', error }

  const employee = employees.find((e) => e.id === id)
  const backTo = `/employees${location.state?.from ?? ''}`

  const overall = useMemo(() => {
    let present = 0
    let absent = 0
    Object.entries(records).forEach(([date, day]) => {
      if (isWeekend(date)) return
      if (day[id] === 'present') present++
      else if (day[id] === 'absent') absent++
    })
    return { present, absent, rate: present + absent ? Math.round((present / (present + absent)) * 100) : null }
  }, [records, id])

  const confirmRemoval = async () => {
    setRemoval({ status: 'pending' })
    try {
      await removeEmployee(employee)
      notify(`${employee.name} was removed`)
      navigate(backTo, { replace: true })
    } catch (err) {
      setRemoval({ status: 'error', error: err.message })
    }
  }

  const backLink = (
    <Link className="back-link" to={backTo}>
      <Icon name="chevronLeft" size={16} /> Back to employees
    </Link>
  )

  if (status === 'loading') {
    return (
      <div className="page">
        {backLink}
        <section className="card">
          <LoadingState rows={4} label="Loading employee" />
        </section>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="page">
        {backLink}
        <section className="card">
          <ErrorState title="Couldn't load employee" message={error} onRetry={retry} />
        </section>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="page">
        {backLink}
        <section className="card">
          <EmptyState icon="users" title="Employee not found" message="This employee doesn't exist or was removed.">
            <Link className="btn btn-primary" to="/employees">
              Go to employees
            </Link>
          </EmptyState>
        </section>
      </div>
    )
  }

  return (
    <div className="page">
      {backLink}

      <header className="page-header">
        <div>
          <h1>{employee.name}</h1>
          <div className="employee-meta detail-meta">
            <span className="muted">{employee.title}</span>
            <span className="chip">
              <Icon name="briefcase" size={12} /> {employee.department}
            </span>
            {employee.source === 'local' && <span className="chip chip-accent">Added by you</span>}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} /> Edit
          </button>
          <button className="btn btn-soft-critical" onClick={() => setRemoval({ status: 'confirm' })}>
            <Icon name="trash" size={16} /> Remove
          </button>
        </div>
      </header>

      <section className="stats-grid" aria-label="Attendance summary">
        <StatCard icon="check" label="Days present" value={overall.present} tone="good" />
        <StatCard icon="x" label="Days absent" value={overall.absent} tone="critical" />
        <StatCard
          icon="percent"
          label="Attendance rate"
          value={overall.rate === null ? '–' : `${overall.rate}%`}
          hint="all time, weekdays only"
          tone="accent"
        />
      </section>

      <div className="detail-grid">
        <ProfileDetails key={employee.id} employee={employee} />
        <AttendanceCalendar employee={employee} />
      </div>

      {editing && <EmployeeFormModal employee={employee} onClose={() => setEditing(false)} />}

      {removal && (
        <ConfirmDialog
          title={`Remove ${employee.name}?`}
          message="Are you sure you want to delete??"
          confirmLabel="Remove"
          pending={removal.status === 'pending'}
          error={removal.status === 'error' ? `Couldn't remove employee: ${removal.error}` : null}
          onCancel={() => setRemoval(null)}
          onConfirm={confirmRemoval}
        />
      )}
    </div>
  )
}

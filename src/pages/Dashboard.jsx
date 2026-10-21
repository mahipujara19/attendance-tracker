import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import Icon from '../components/Icon'
import StatCard from '../components/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { DepartmentSelect, SearchInput } from '../components/Toolbar'
import { useAttendance, useEmployees, useToast } from '../hooks/useApp'
import { addDays, formatLong, isValidKey, isWeekend, todayKey } from '../utils/date'
import { matchesQuery } from '../utils/filters'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unmarked', label: 'Not marked' },
  { id: 'present', label: 'Present' },
  { id: 'absent', label: 'Absent' },
]

function AttendanceToggle({ status, onMark, name }) {
  return (
    <div className="toggle" role="group" aria-label={`Attendance for ${name}`}>
      <button
        className={`toggle-btn present ${status === 'present' ? 'active' : ''}`}
        aria-pressed={status === 'present'}
        onClick={() => onMark('present')}
      >
        <Icon name="check" size={16} /> Present
      </button>
      <button
        className={`toggle-btn absent ${status === 'absent' ? 'active' : ''}`}
        aria-pressed={status === 'absent'}
        onClick={() => onMark('absent')}
      >
        <Icon name="x" size={16} /> Absent
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { employees, departments, status, error, retry } = useEmployees()
  const { records, mark, markMany, clearDay } = useAttendance()
  const { notify } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmClear, setConfirmClear] = useState(false)

  const today = todayKey()
  const requested = searchParams.get('date')
  const date = isValidKey(requested) && requested <= today ? requested : today
  const isToday = date === today
  const day = useMemo(() => records[date] ?? {}, [records, date])

  const setDate = (key) => setSearchParams(key === today ? {} : { date: key })

  const stats = useMemo(() => {
    let present = 0
    let absent = 0
    employees.forEach((e) => {
      if (day[e.id] === 'present') present++
      else if (day[e.id] === 'absent') absent++
    })
    const marked = present + absent
    return {
      total: employees.length,
      present,
      absent,
      unmarked: employees.length - marked,
      marked,
      rate: marked ? Math.round((present / marked) * 100) : null,
    }
  }, [employees, day])

  const visible = employees.filter((e) => {
    if (!matchesQuery(e, query)) return false
    if (department !== 'all' && e.department !== department) return false
    const s = day[e.id] ?? 'unmarked'
    return statusFilter === 'all' || s === statusFilter
  })

  const isFiltered = query || department !== 'all' || statusFilter !== 'all'
  const completion = stats.total ? Math.round((stats.marked / stats.total) * 100) : 0

  const markVisible = (value) => {
    const ids = visible.map((e) => e.id)
    markMany(date, ids, value)
    notify(`Marked ${ids.length} ${ids.length === 1 ? 'person' : 'people'} ${value}`)
  }

  const markRemainingAbsent = () => {
    const ids = employees.filter((e) => !day[e.id]).map((e) => e.id)
    markMany(date, ids, 'absent')
    notify(`Marked ${ids.length} remaining ${ids.length === 1 ? 'person' : 'people'} absent`)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Mark who's in for the day. Changes save automatically.</p>
        </div>
        <div className="date-nav">
          <button className="icon-btn bordered" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            <Icon name="chevronLeft" />
          </button>
          <label className="date-input">
            <Icon name="calendar" size={16} />
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => isValidKey(e.target.value) && setDate(e.target.value)}
              aria-label="Attendance date"
            />
          </label>
          <button
            className="icon-btn bordered"
            onClick={() => setDate(addDays(date, 1))}
            disabled={isToday}
            aria-label="Next day"
          >
            <Icon name="chevronRight" />
          </button>
          {!isToday && (
            <button className="btn btn-ghost" onClick={() => setDate(today)}>
              Today
            </button>
          )}
        </div>
      </header>

      <div className="day-banner">
        <div>
          <strong>{isToday ? 'Today' : formatLong(date)}</strong>
          {isToday && <span className="muted"> · {formatLong(date)}</span>}
          {isWeekend(date) && <span className="chip">Weekend</span>}
        </div>
        {status === 'success' && stats.total > 0 && (
          <div className="progress-wrap" title={`${stats.marked} of ${stats.total} marked`}>
            <span className="small muted">
              {stats.marked}/{stats.total} marked
            </span>
            <div className="progress" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${completion}%` }} />
            </div>
          </div>
        )}
      </div>

      <section className="stats-grid" aria-label="Summary">
        <StatCard icon="users" label="Employees" value={status === 'success' ? stats.total : '–'} />
        <StatCard icon="check" label="Present" value={stats.present} tone="good" />
        <StatCard icon="x" label="Absent" value={stats.absent} tone="critical" />
        <StatCard icon="clock" label="Not marked" value={status === 'success' ? stats.unmarked : '–'} />
        <StatCard
          icon="percent"
          label="Attendance rate"
          value={stats.rate === null ? '–' : `${stats.rate}%`}
          hint={stats.rate === null ? 'Nobody marked yet' : 'of people marked'}
          tone="accent"
        />
      </section>

      <section className="card">
        <div className="card-toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, role…" />
          <DepartmentSelect value={department} onChange={setDepartment} departments={departments} />
          <div className="segmented" role="tablist" aria-label="Filter by status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={statusFilter === f.id}
                className={statusFilter === f.id ? 'active' : ''}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {status === 'success' && employees.length > 0 && (
          <div className="bulk-bar">
            <span className="small muted">
              Showing {visible.length} of {employees.length}
            </span>
            <div className="bulk-actions">
              <button className="btn btn-soft-good" onClick={() => markVisible('present')} disabled={!visible.length}>
                <Icon name="check" size={16} /> {isFiltered ? 'Mark shown present' : 'Mark all present'}
              </button>
              <button className="btn btn-soft-critical" onClick={markRemainingAbsent} disabled={!stats.unmarked}>
                <Icon name="x" size={16} /> Mark rest absent
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmClear(true)} disabled={!stats.marked}>
                <Icon name="undo" size={16} /> Reset day
              </button>
            </div>
          </div>
        )}

        {status === 'loading' && <LoadingState label="Loading employees" />}
        {status === 'error' && <ErrorState title="Couldn't load employees" message={error} onRetry={retry} />}
        {status === 'success' && employees.length === 0 && (
          <EmptyState title="No employees yet" message="Add your team to start tracking attendance.">
            <Link className="btn btn-primary" to="/employees">
              <Icon name="plus" size={16} /> Add employees
            </Link>
          </EmptyState>
        )}
        {status === 'success' && employees.length > 0 && visible.length === 0 && (
          <EmptyState icon="search" title="No matches" message="Try a different search or filter.">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setQuery('')
                setDepartment('all')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </button>
          </EmptyState>
        )}

        {status === 'success' && visible.length > 0 && (
          <ul className="attendance-list">
            {visible.map((employee) => {
              const current = day[employee.id] ?? null
              return (
                <li key={employee.id} className={`attendance-row ${current ?? 'unmarked'}`}>
                  <div className="person">
                    <strong>{employee.name}</strong>
                    <span className="muted small">
                      {employee.title} · {employee.department}
                    </span>
                  </div>
                  <AttendanceToggle
                    status={current}
                    name={employee.name}
                    onMark={(value) => mark(date, employee.id, value)}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {confirmClear && (
        <ConfirmDialog
          title="Reset this day?"
          message={`This clears all ${stats.marked} attendance marks for ${formatLong(date)}.`}
          confirmLabel="Reset day"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clearDay(date)
            setConfirmClear(false)
            notify('Attendance for the day was reset', 'info')
          }}
        />
      )}
    </div>
  )
}

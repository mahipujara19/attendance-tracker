import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import StatCard from '../components/StatCard'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { DepartmentSelect, SearchInput } from '../components/Toolbar'
import { useAttendance, useEmployees, useToast } from '../hooks/useApp'
import { addDays, daysBetween, formatShort, isValidKey, isWeekend, listDays, startOfMonth, todayKey } from '../utils/date'
import { matchesQuery } from '../utils/filters'

const PRESETS = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
]
const MAX_RANGE_DAYS = 366

const COLUMNS = [
  { key: 'name', label: 'Employee' },
  { key: 'department', label: 'Department' },
  { key: 'present', label: 'Present', numeric: true },
  { key: 'absent', label: 'Absent', numeric: true },
  { key: 'unmarked', label: 'Not marked', numeric: true },
  { key: 'rate', label: 'Attendance', numeric: true },
]

function presetRange(preset, today) {
  if (preset === '30') return { from: addDays(today, -29), to: today }
  if (preset === 'month') return { from: startOfMonth(today), to: today }
  return { from: addDays(today, -6), to: today }
}

const pct = (present, absent) => (present + absent ? Math.round((present / (present + absent)) * 100) : null)

function downloadCsv(filename, rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function DayBar({ present, absent, unmarked }) {
  const total = present + absent + unmarked
  if (!total) return <div className="stack-bar empty" />
  return (
    <div className="stack-bar" aria-hidden="true">
      {present > 0 && <span className="seg good" style={{ flexGrow: present }} />}
      {absent > 0 && <span className="seg critical" style={{ flexGrow: absent }} />}
      {unmarked > 0 && <span className="seg none" style={{ flexGrow: unmarked }} />}
    </div>
  )
}

export default function Reports() {
  const { employees, departments, status, error, retry } = useEmployees()
  const { records } = useAttendance()
  const { notify } = useToast()
  const today = todayKey()

  const [preset, setPreset] = useState('7')
  const [custom, setCustom] = useState(() => presetRange('7', today))
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [sort, setSort] = useState({ key: 'rate', dir: 'desc' })

  const { from, to } = preset === 'custom' ? custom : presetRange(preset, today)
  const rangeError =
    !isValidKey(from) || !isValidKey(to)
      ? 'Pick both a start and an end date.'
      : from > to
        ? 'The start date must be before the end date.'
        : daysBetween(from, to) >= MAX_RANGE_DAYS
          ? 'Please choose a range of one year or less.'
          : null

  const days = useMemo(() => (rangeError ? [] : listDays(from, to)), [from, to, rangeError])

  const scoped = useMemo(
    () => employees.filter((e) => department === 'all' || e.department === department),
    [employees, department],
  )

  const daily = useMemo(
    () =>
      days.map((date) => {
        let present = 0
        let absent = 0
        scoped.forEach((e) => {
          const value = records[date]?.[e.id]
          if (value === 'present') present++
          else if (value === 'absent') absent++
        })
        return { date, present, absent, unmarked: scoped.length - present - absent }
      }),
    [days, scoped, records],
  )

  const perEmployee = useMemo(
    () =>
      scoped.map((e) => {
        let present = 0
        let absent = 0
        days.forEach((date) => {
          const value = records[date]?.[e.id]
          if (value === 'present') present++
          else if (value === 'absent') absent++
        })
        return { employee: e, name: e.name, department: e.department, present, absent, unmarked: days.length - present - absent, rate: pct(present, absent) }
      }),
    [scoped, days, records],
  )

  const totals = daily.reduce(
    (acc, d) => ({ present: acc.present + d.present, absent: acc.absent + d.absent, tracked: acc.tracked + (d.present + d.absent > 0 ? 1 : 0) }),
    { present: 0, absent: 0, tracked: 0 },
  )
  const overallRate = pct(totals.present, totals.absent)

  const rows = perEmployee
    .filter((row) => matchesQuery(row.employee, query))
    .sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const av = a[sort.key] ?? -1
      const bv = b[sort.key] ?? -1
      if (typeof av === 'string') return av.localeCompare(bv) * dir
      return (av - bv) * dir || a.name.localeCompare(b.name)
    })

  const toggleSort = (key) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'department' ? 'asc' : 'desc' }))

  const exportCsv = () => {
    downloadCsv(`attendance-${from}-to-${to}.csv`, [
      ['Employee', 'Email', 'Department', 'Present', 'Absent', 'Not marked', 'Attendance %'],
      ...rows.map((r) => [r.name, r.employee.email, r.department, r.present, r.absent, r.unmarked, r.rate ?? '']),
    ])
    notify('Report downloaded as CSV')
  }

  const ready = status === 'success' && !rangeError

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="muted">Attendance trends and per-person totals.</p>
        </div>
        <button className="btn btn-primary" onClick={exportCsv} disabled={!ready || rows.length === 0}>
          <Icon name="download" size={16} /> Export CSV
        </button>
      </header>

      <section className="card range-card">
        <div className="segmented" role="tablist" aria-label="Date range">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={preset === p.id}
              className={preset === p.id ? 'active' : ''}
              onClick={() => {
                if (p.id === 'custom') setCustom({ from, to })
                setPreset(p.id)
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="range-inputs">
            <label className="date-input">
              <span className="small muted">From</span>
              <input type="date" value={custom.from} max={today} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            </label>
            <label className="date-input">
              <span className="small muted">To</span>
              <input type="date" value={custom.to} max={today} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </label>
          </div>
        )}
        <DepartmentSelect value={department} onChange={setDepartment} departments={departments} />
      </section>

      {rangeError && (
        <div className="alert alert-error" role="alert">
          <Icon name="alert" size={16} /> {rangeError}
        </div>
      )}

      {status === 'loading' && (
        <section className="card">
          <LoadingState rows={5} label="Loading report" />
        </section>
      )}
      {status === 'error' && (
        <section className="card">
          <ErrorState title="Couldn't load report data" message={error} onRetry={retry} />
        </section>
      )}
      {status === 'success' && employees.length === 0 && (
        <section className="card">
          <EmptyState icon="chart" title="Nothing to report" message="Add employees and mark attendance to see reports." />
        </section>
      )}

      {ready && employees.length > 0 && (
        <>
          <section className="stats-grid" aria-label="Report summary">
            <StatCard icon="percent" label="Attendance rate" value={overallRate === null ? '–' : `${overallRate}%`} hint="present ÷ marked" tone="accent" />
            <StatCard icon="check" label="Present marks" value={totals.present} tone="good" />
            <StatCard icon="x" label="Absent marks" value={totals.absent} tone="critical" />
            <StatCard icon="calendar" label="Days tracked" value={`${totals.tracked}/${days.length}`} hint="days with any marks" />
          </section>

          <div className="report-grid">
            <section className="card">
              <div className="card-head">
                <h2>Daily breakdown</h2>
                <div className="legend small">
                  <span><i className="swatch good" /> <Icon name="check" size={12} /> Present</span>
                  <span><i className="swatch critical" /> <Icon name="x" size={12} /> Absent</span>
                  <span><i className="swatch none" /> Not marked</span>
                </div>
              </div>
              <ul className="daily-list">
                {[...daily].reverse().map((d) => {
                  const rate = pct(d.present, d.absent)
                  return (
                    <li
                      key={d.date}
                      className={`daily-row ${isWeekend(d.date) ? 'weekend' : ''}`}
                      title={`${formatShort(d.date)}: ${d.present} present, ${d.absent} absent, ${d.unmarked} not marked`}
                    >
                      <span className="daily-date small">{formatShort(d.date)}</span>
                      <DayBar {...d} />
                      <span className="daily-rate small">{rate === null ? <span className="muted">—</span> : `${rate}%`}</span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="card">
              <div className="card-head">
                <h2>By employee</h2>
                <SearchInput value={query} onChange={setQuery} placeholder="Search employees…" />
              </div>
              {rows.length === 0 ? (
                <EmptyState icon="search" title="No matches" message="No employees match your search." />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        {COLUMNS.map((col) => (
                          <th
                            key={col.key}
                            className={col.numeric ? 'num' : ''}
                            aria-sort={sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          >
                            <button className="th-btn" onClick={() => toggleSort(col.key)}>
                              {col.label}
                              <Icon name={sort.key !== col.key ? 'sort' : sort.dir === 'asc' ? 'arrowUp' : 'arrowDown'} size={12} />
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.employee.id}>
                          <td>
                            <span className="cell-person">{r.name}</span>
                          </td>
                          <td className="muted">{r.department}</td>
                          <td className="num">{r.present}</td>
                          <td className="num">{r.absent}</td>
                          <td className="num muted">{r.unmarked}</td>
                          <td className="num">
                            {r.rate === null ? (
                              <span className="muted">—</span>
                            ) : (
                              <div className="meter" title={`${r.rate}% of marked days present`}>
                                <span className="meter-track">
                                  <span className="meter-fill" style={{ width: `${r.rate}%` }} />
                                </span>
                                <span>{r.rate}%</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

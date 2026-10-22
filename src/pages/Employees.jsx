import { useMemo, useState } from 'react'
import AddEmployeeModal from '../components/AddEmployeeModal'
import ConfirmDialog from '../components/ConfirmDialog'
import Icon from '../components/Icon'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { DepartmentSelect, SearchInput } from '../components/Toolbar'
import { useAttendance, useEmployees, useToast } from '../hooks/useApp'
import { isWeekend } from '../utils/date'
import { matchesQuery } from '../utils/filters'

export default function Employees() {
  const { employees, departments, status, error, retry, removeEmployee, restoreRemoved, removedCount } = useEmployees()
  const { records } = useAttendance()
  const { notify } = useToast()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [removal, setRemoval] = useState(null) // { employee, status: 'confirm' | 'pending' | 'error', error }

  const totals = useMemo(() => {
    const map = {}
    Object.entries(records).forEach(([date, day]) => {
      if (isWeekend(date)) return
      Object.entries(day).forEach(([id, value]) => {
        map[id] ??= { present: 0, absent: 0 }
        map[id][value]++
      })
    })
    return map
  }, [records])

  const visible = employees.filter(
    (e) => matchesQuery(e, query) && (department === 'all' || e.department === department),
  )

  const confirmRemoval = async () => {
    const { employee } = removal
    setRemoval({ employee, status: 'pending' })
    try {
      await removeEmployee(employee)
      setRemoval(null)
      notify(`${employee.name} was removed`)
    } catch (err) {
      setRemoval({ employee, status: 'error', error: err.message })
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="muted">
            {status === 'success' ? `${employees.length} people on the team` : 'Manage the people you track.'}
          </p>
        </div>
        <div className="header-actions">
          {removedCount > 0 && status === 'success' && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                restoreRemoved()
                notify(`Restored ${removedCount} removed ${removedCount === 1 ? 'employee' : 'employees'}`, 'info')
              }}
            >
              <Icon name="undo" size={16} /> Restore removed ({removedCount})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={status !== 'success'}>
            <Icon name="plus" size={16} /> Add employee
          </button>
        </div>
      </header>

      <section className="card">
        <div className="card-toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Search name, email, role…" />
          <DepartmentSelect value={department} onChange={setDepartment} departments={departments} />
        </div>

        {status === 'loading' && <LoadingState label="Loading employees" />}
        {status === 'error' && <ErrorState title="Couldn't load employees" message={error} onRetry={retry} />}
        {status === 'success' && employees.length === 0 && (
          <EmptyState title="Your team is empty" message="Add your first employee to get started.">
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={16} /> Add employee
            </button>
          </EmptyState>
        )}
        {status === 'success' && employees.length > 0 && visible.length === 0 && (
          <EmptyState icon="search" title="No matches" message="No employees match your search." />
        )}

        {status === 'success' && visible.length > 0 && (
          <ul className="employee-grid">
            {visible.map((employee) => {
              const t = totals[employee.id] ?? { present: 0, absent: 0 }
              return (
                <li key={employee.id} className="employee-card">
                  <div className="employee-head">
                    <div className="person">
                      <strong>{employee.name}</strong>
                      <span className="muted small">{employee.title}</span>
                    </div>
                    <button
                      className="icon-btn danger"
                      onClick={() => setRemoval({ employee, status: 'confirm' })}
                      aria-label={`Remove ${employee.name}`}
                      title="Remove employee"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <div className="employee-meta">
                    <span className="chip">
                      <Icon name="briefcase" size={12} /> {employee.department}
                    </span>
                    {employee.source === 'local' && <span className="chip chip-accent">Added by you</span>}
                  </div>
                  <a className="employee-email small" href={`mailto:${employee.email}`}>
                    <Icon name="mail" size={14} /> {employee.email}
                  </a>
                  <div className="employee-stats small">
                    <span className="status-text good">
                      <Icon name="check" size={14} /> {t.present} present
                    </span>
                    <span className="status-text critical">
                      <Icon name="x" size={14} /> {t.absent} absent
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {showAdd && <AddEmployeeModal onClose={() => setShowAdd(false)} />}

      {removal && (
        <ConfirmDialog
          title={`Remove ${removal.employee.name}?`}
          message={`They'll be hidden from the team. You can bring them back, with their attendance history, using "Restore removed".`}
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

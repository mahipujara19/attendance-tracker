import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import EmployeeFormModal from '../components/EmployeeFormModal'
import Icon from '../components/Icon'
import Pagination from '../components/Pagination'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { DepartmentSelect, SearchInput } from '../components/Toolbar'
import { useAttendance, useEmployees, useToast } from '../hooks/useApp'
import { useUrlParams } from '../hooks/useUrlParams'
import { isWeekend } from '../utils/date'
import { matchesQuery } from '../utils/filters'

const PAGE_SIZE = 6

export default function Employees() {
  const { employees, departments, status, error, retry, removeEmployee } = useEmployees()
  const { records } = useAttendance()
  const { notify } = useToast()
  const location = useLocation()
  const [params, setParams] = useUrlParams({ q: '', dept: 'all', page: '1' })
  const query = params.q
  const department = params.dept
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
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

  // The page lives in the URL (?page=2) so "Back to employees" returns to the same page.
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const requestedPage = Number.parseInt(params.page, 10) || 1
  const page = Math.min(Math.max(requestedPage, 1), totalPages)
  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goToPage = (next) => {
    setParams({ page: next }, { replace: false })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Search and filters live in the URL too, so they survive a refresh.
  // Changing them changes the result set, so jump back to the first page.
  const changeQuery = (value) => setParams({ q: value, page: 1 })
  const changeDepartment = (value) => setParams({ dept: value, page: 1 })

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
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={status !== 'success'}>
            <Icon name="plus" size={16} /> Add employee
          </button>
        </div>
      </header>

      <section className="card">
        <div className="card-toolbar">
          <SearchInput value={query} onChange={changeQuery} placeholder="Search name, email, role…" />
          <DepartmentSelect value={department} onChange={changeDepartment} departments={departments} />
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
            {pageItems.map((employee) => {
              const t = totals[employee.id] ?? { present: 0, absent: 0 }
              return (
                <li key={employee.id} className="employee-card">
                  <div className="employee-head">
                    <div className="person">
                      <Link
                        className="stretched-link"
                        to={`/employees/${employee.id}`}
                        state={{ from: location.search }}
                      >
                        <strong>{employee.name}</strong>
                      </Link>
                      <span className="muted small">{employee.title}</span>
                    </div>
                    <div className="card-actions">
                      <button
                        className="icon-btn"
                        onClick={() => setEditing(employee)}
                        aria-label={`Edit ${employee.name}`}
                        title="Edit employee"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => setRemoval({ employee, status: 'confirm' })}
                        aria-label={`Remove ${employee.name}`}
                        title="Remove employee"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
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

        {status === 'success' && visible.length > 0 && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={visible.length} onChange={goToPage} />
        )}
      </section>

      {showAdd && <EmployeeFormModal onClose={() => setShowAdd(false)} />}
      {editing && <EmployeeFormModal employee={editing} onClose={() => setEditing(null)} />}

      {removal && (
        <ConfirmDialog
          title={`Remove ${removal.employee.name}?`}
          message={`Are you sure you want to delete??`}
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

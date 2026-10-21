import { useState } from 'react'
import { useEmployees, useToast } from '../hooks/useApp'
import Icon from './Icon'
import Modal from './Modal'
import { Spinner } from './States'

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', department: '', title: '' }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values, employees) {
  const errors = {}
  if (!values.firstName.trim()) errors.firstName = 'First name is required'
  if (!values.lastName.trim()) errors.lastName = 'Last name is required'
  if (!values.email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address'
  else if (employees.some((e) => e.email.toLowerCase() === values.email.trim().toLowerCase()))
    errors.email = 'An employee with this email already exists'
  if (!values.department.trim()) errors.department = 'Department is required'
  return errors
}

function Field({ label, name, error, optional, ...props }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">
        {label} {optional && <em>optional</em>}
      </span>
      <input name={name} aria-invalid={Boolean(error)} {...props} />
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}

export default function AddEmployeeModal({ onClose }) {
  const { employees, departments, addEmployee } = useEmployees()
  const { notify } = useToast()
  const [values, setValues] = useState(EMPTY)
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | error
  const [apiError, setApiError] = useState(null)

  const errors = touched ? validate(values, employees) : {}
  const submitting = status === 'submitting'

  const handleChange = (event) => {
    setValues((prev) => ({ ...prev, [event.target.name]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(validate(values, employees)).length > 0) return

    setStatus('submitting')
    setApiError(null)
    try {
      const trimmed = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]))
      const employee = await addEmployee({ ...trimmed, title: trimmed.title || 'Employee' })
      notify(`${employee.name} was added to the team`)
      onClose()
    } catch (err) {
      setApiError(err.message)
      setStatus('error')
    }
  }

  return (
    <Modal
      title="Add employee"
      description="They'll show up on the dashboard right away."
      onClose={submitting ? () => {} : onClose}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="modal-body form-grid">
          <Field label="First name" name="firstName" value={values.firstName} onChange={handleChange} error={errors.firstName} autoComplete="given-name" />
          <Field label="Last name" name="lastName" value={values.lastName} onChange={handleChange} error={errors.lastName} autoComplete="family-name" />
          <Field label="Email" name="email" type="email" value={values.email} onChange={handleChange} error={errors.email} autoComplete="email" className="span-2" />
          <Field label="Department" name="department" value={values.department} onChange={handleChange} error={errors.department} list="department-options" placeholder="e.g. Engineering" />
          <Field label="Job title" name="title" value={values.title} onChange={handleChange} optional placeholder="e.g. Designer" />
          <Field label="Phone" name="phone" type="tel" value={values.phone} onChange={handleChange} optional autoComplete="tel" />
          <datalist id="department-options">
            {departments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>

          {apiError && (
            <div className="alert alert-error span-2" role="alert">
              <Icon name="alert" size={16} />
              <span>Couldn't save employee: {apiError}</span>
            </div>
          )}
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <Spinner /> : <Icon name="plus" size={16} />}
            {submitting ? 'Saving…' : status === 'error' ? 'Try again' : 'Add employee'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}

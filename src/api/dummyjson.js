import axios from 'axios'

const api = axios.create({
  baseURL: 'https://dummyjson.com',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Fail fast when the browser knows it is offline, instead of risking a stale cached response.
api.interceptors.request.use((config) => {
  if (!navigator.onLine) {
    return Promise.reject(new axios.AxiosError('Browser is offline', 'ERR_OFFLINE', config))
  }
  return config
})

// Turn axios errors into one readable message; cancelled requests pass through untouched.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    let message
    if (error.code === 'ERR_OFFLINE' || !navigator.onLine) {
      message = "You're offline. Reconnect to the internet and try again."
    } else if (error.response) {
      message = error.response.data?.message || `Request failed with status ${error.response.status}`
    } else if (error.code === 'ECONNABORTED') {
      message = 'The server took too long to respond. Please try again.'
    } else {
      message = 'Network error. Check your internet connection and try again.'
    }
    return Promise.reject(new Error(message, { cause: error }))
  },
)

export const isCancelled = (error) => axios.isCancel(error)

export function toEmployee(user, source = 'api') {
  const firstName = user.firstName?.trim() ?? ''
  const lastName = user.lastName?.trim() ?? ''
  return {
    id: String(user.id),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: user.email ?? '',
    phone: user.phone ?? '',
    department: user.company?.department || 'General',
    title: user.company?.title || 'Employee',
    source,
  }
}

export async function fetchEmployees({ signal } = {}) {
  const fields = 'firstName,lastName,email,phone,company'
  const { data } = await api.get('/users', { params: { limit: 10, select: fields }, signal })
  return data.users.map((user) => toEmployee(user))
}

export async function createEmployee({ firstName, lastName, email, phone, department, title }) {
  const { data: user } = await api.post('/users/add', {
    firstName,
    lastName,
    email,
    phone,
    company: { department, title },
  })
  // DummyJSON simulates the insert and always returns the same id, so we mint a unique local one.
  return { ...toEmployee(user, 'local'), id: `local-${Date.now()}` }
}

export async function updateEmployee(id, { firstName, lastName, email, phone, department, title }) {
  const { data } = await api.put(`/users/${id}`, {
    firstName,
    lastName,
    email,
    phone,
    company: { department, title },
  })
  return data
}

export async function deleteEmployee(id) {
  const { data } = await api.delete(`/users/${id}`)
  return data
}

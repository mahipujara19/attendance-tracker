const KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const pad = (n) => String(n).padStart(2, '0')

export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey() {
  return toKey(new Date())
}

export function isValidKey(key) {
  if (!key || !KEY_PATTERN.test(key)) return false
  return toKey(fromKey(key)) === key
}

export function addDays(key, amount) {
  const date = fromKey(key)
  date.setDate(date.getDate() + amount)
  return toKey(date)
}

export function startOfMonth(key) {
  return `${key.slice(0, 8)}01`
}

export function daysBetween(from, to) {
  return Math.round((fromKey(to) - fromKey(from)) / 86_400_000)
}

export function listDays(from, to) {
  const days = []
  for (let key = from; key <= to; key = addDays(key, 1)) days.push(key)
  return days
}

export function formatLong(key) {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShort(key) {
  return fromKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function isWeekend(key) {
  const day = fromKey(key).getDay()
  return day === 0 || day === 6
}

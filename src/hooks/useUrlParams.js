import { useSearchParams } from 'react-router-dom'

// Keeps UI state (search, filters, page…) in the URL so it survives a refresh and can be shared.
// Values equal to their default are left out of the URL to keep it tidy.
export function useUrlParams(defaults) {
  const [searchParams, setSearchParams] = useSearchParams()

  const values = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, searchParams.get(key) ?? fallback]),
  )

  // `replace: true` (default) avoids a history entry per keystroke; pass false for real navigation.
  const update = (changes, { replace = true } = {}) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(changes).forEach(([key, value]) => {
          const text = value == null ? '' : String(value)
          if (text === '' || text === String(defaults[key] ?? '')) next.delete(key)
          else next.set(key, text)
        })
        return next
      },
      { replace },
    )
  }

  return [values, update]
}

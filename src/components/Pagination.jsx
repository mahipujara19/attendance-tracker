import Icon from './Icon'

// Page numbers with ellipses, e.g. 1 … 4 5 6 … 12
function pageItems(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const items = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push(`gap-${p}`)
    items.push(p)
  })
  return items
}

export default function Pagination({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="small muted">
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong>
      </span>
      {totalPages > 1 && (
        <div className="pagination-pages">
          <button className="icon-btn bordered" onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page">
            <Icon name="chevronLeft" size={16} />
          </button>
          {pageItems(page, totalPages).map((item) =>
            typeof item === 'string' ? (
              <span key={item} className="pagination-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={item}
                className={`page-btn ${item === page ? 'active' : ''}`}
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
              >
                {item}
              </button>
            ),
          )}
          <button
            className="icon-btn bordered"
            onClick={() => onChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      )}
    </nav>
  )
}

interface PaginationProps {
  page: number
  totalPages: number
  rowsPerPage: number
  rowsPerPageOptions: number[]
  onPageChange: (nextPage: number) => void
  onRowsPerPageChange: (rows: number) => void
}

export default function Pagination({
  page,
  totalPages,
  rowsPerPage,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
}: PaginationProps) {
  const canGoPrevious = page > 1
  const canGoNext = page < totalPages

  return (
    <div className="platform-pagination">
      <div className="platform-pagination-meta">Page {page} of {totalPages}</div>

      <label className="platform-pagination-rows">
        Rows per page
        <select
          className="platform-pagination-select"
          value={rowsPerPage}
          onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
        >
          {rowsPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <div className="platform-pagination-buttons">
        <button
          type="button"
          className="platform-button-secondary"
          disabled={!canGoPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>

        <button
          type="button"
          className="platform-button-secondary"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

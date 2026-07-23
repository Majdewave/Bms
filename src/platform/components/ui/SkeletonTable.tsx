interface SkeletonTableProps {
  columns: number
  rows?: number
}

export default function SkeletonTable({ columns, rows = 8 }: SkeletonTableProps) {
  return (
    <div className="platform-table-wrap">
      <table className="platform-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={`skeleton-header-${index}`} className="platform-table-header">
                <div className="h-4 w-20 bg-slate-200 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={`skeleton-row-${rowIndex}`} className="platform-table-row">
              {Array.from({ length: columns }).map((__, colIndex) => (
                <td key={`skeleton-cell-${rowIndex}-${colIndex}`} className="platform-table-cell">
                  <div className="h-4 w-full max-w-[140px] bg-slate-100 rounded" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

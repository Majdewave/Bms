import type { ReactNode } from 'react'

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="platform-table-wrap">
      <table className="platform-table">{children}</table>
    </div>
  )
}

export function TableHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <th scope="col" className={`platform-table-header ${className}`.trim()}>{children}</th>
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="platform-table-row">{children}</tr>
}

export function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`platform-table-cell ${className}`.trim()}>{children}</td>
}

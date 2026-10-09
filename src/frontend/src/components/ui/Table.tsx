import type { ReactNode } from "react"

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">{children}</tr>
    </thead>
  )
}

export function TH({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-800/70">{children}</tbody>
}

export function TR({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={`${onClick ? "cursor-pointer hover:bg-slate-800/40" : ""} ${className}`}
    >
      {children}
    </tr>
  )
}

export function TD({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-slate-200 ${className}`}>{children}</td>
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}) {
  if (pageCount <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
      <p className="text-xs text-slate-500">
        Page {page} of {pageCount}
      </p>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

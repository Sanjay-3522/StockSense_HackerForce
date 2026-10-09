import type { HTMLAttributes, ReactNode } from "react"

export function Card({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-900/60 shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}

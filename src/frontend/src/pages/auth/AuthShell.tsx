import type { ReactNode } from "react"

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">
            S
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 shadow-sm">{children}</div>
      </div>
    </div>
  )
}

import type { ReactNode } from "react"

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "purple"

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-800 text-slate-300 ring-slate-700",
  success: "bg-emerald-950 text-emerald-400 ring-emerald-800",
  warning: "bg-amber-950 text-amber-400 ring-amber-800",
  danger: "bg-red-950 text-red-400 ring-red-800",
  info: "bg-blue-950 text-blue-400 ring-blue-800",
  purple: "bg-purple-950 text-purple-400 ring-purple-800",
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}

const statusTone: Record<string, Tone> = {
  draft: "neutral",
  waiting: "warning",
  ready: "info",
  done: "success",
  canceled: "danger",
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "neutral"}>{status}</Badge>
}

const severityTone: Record<string, Tone> = {
  LOW: "info",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge tone={severityTone[severity] ?? "neutral"}>{severity}</Badge>
}

const priorityTone: Record<string, Tone> = {
  CRITICAL: "danger",
  NEEDS_REVIEW: "warning",
  INFORMATION: "info",
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge tone={priorityTone[priority] ?? "neutral"}>{priority.replace("_", " ")}</Badge>
}

const actionStatusTone: Record<string, Tone> = {
  OPEN: "danger",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
}

export function ActionStatusBadge({ status }: { status: string }) {
  return <Badge tone={actionStatusTone[status] ?? "neutral"}>{status.replace("_", " ")}</Badge>
}

import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: "sm" | "md" | "lg"
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthClass = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }[size]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 w-full ${widthClass} rounded-lg border border-slate-800 bg-slate-900 shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id="modal-title" className="text-sm font-semibold text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close dialog"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  isDanger = false,
  isLoading = false,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  isDanger?: boolean
  isLoading?: boolean
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-slate-300">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white disabled:opacity-60 ${
            isDanger ? "bg-red-600 hover:bg-red-500" : "bg-brand-600 hover:bg-brand-500"
          }`}
        >
          {isLoading ? "Working..." : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

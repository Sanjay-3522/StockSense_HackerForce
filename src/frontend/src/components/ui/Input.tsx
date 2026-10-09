import { forwardRef, type InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
            {label}
            {props.required && <span className="text-red-400"> *</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-9 rounded-md border bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500
            focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-brand-500
            disabled:cursor-not-allowed disabled:opacity-60
            ${error ? "border-red-500" : "border-slate-700"} ${className}`}
          aria-invalid={!!error}
          {...props}
        />
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  },
)
Input.displayName = "Input"

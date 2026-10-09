import { forwardRef, type SelectHTMLAttributes } from "react"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, placeholder, id, className = "", children, ...props }, ref) => {
    const selectId = id ?? props.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-slate-300">
            {label}
            {props.required && <span className="text-red-400"> *</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`h-9 rounded-md border bg-slate-900 px-3 text-sm text-slate-100
            focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-brand-500
            disabled:cursor-not-allowed disabled:opacity-60
            ${error ? "border-red-500" : "border-slate-700"} ${className}`}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {children}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  },
)
Select.displayName = "Select"

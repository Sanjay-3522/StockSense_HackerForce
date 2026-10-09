import { forwardRef, type ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-500 focus-visible:outline-brand-500 disabled:bg-brand-900/50",
  secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:outline-slate-500",
  danger: "bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-500",
  ghost: "bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100",
  outline: "border border-slate-700 text-slate-200 hover:bg-slate-800 bg-transparent",
}

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          disabled:cursor-not-allowed disabled:opacity-60
          ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"

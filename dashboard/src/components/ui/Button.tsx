// 👤 SHARED: Button Component

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-foreground text-background border border-foreground hover:bg-foreground/90 shadow-sm',
      secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80',
      outline: 'border border-border bg-transparent text-foreground hover:bg-secondary',
      ghost: 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground border border-transparent',
      danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
    }

    const sizes = {
      sm: 'min-h-8 px-3 py-1.5 text-sm',
      md: 'min-h-9 px-4 py-2 text-sm',
      lg: 'min-h-10 px-8 py-3 text-base',
      icon: 'h-9 w-9 p-0',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-300',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

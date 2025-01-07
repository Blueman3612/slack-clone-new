'use client'

import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={`inline-flex items-center justify-center rounded-md font-medium transition-colors 
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 
          disabled:opacity-50 disabled:pointer-events-none
          ${variant === 'default' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
          ${variant === 'secondary' ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''}
          ${variant === 'outline' ? 'border border-input hover:bg-accent hover:text-accent-foreground' : ''}
          ${size === 'default' ? 'h-10 py-2 px-4' : ''}
          ${size === 'sm' ? 'h-9 px-3' : ''}
          ${size === 'lg' ? 'h-11 px-8' : ''}
          ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button" 
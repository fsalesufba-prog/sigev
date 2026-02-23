"use client"
import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helperText?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, startIcon, endIcon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {startIcon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
              {startIcon}
            </div>
          )}

          <input
            type={type}
            id={inputId}
            className={cn(
              "input input-futuristic",
              startIcon ? "pl-12" : "",
              endIcon ? "pr-12" : "",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              className
            )}
            ref={ref}
            {...props}
          />
          
          {endIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
              {endIcon}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <p className={cn(
            "text-sm",
            error ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
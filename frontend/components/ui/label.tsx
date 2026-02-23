"use client"
import * as React from "react"
import { cn } from "../../lib/utils"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    required?: boolean
    disabled?: boolean
  }
>(({ className, required, disabled, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
))
Label.displayName = "Label"

export { Label }
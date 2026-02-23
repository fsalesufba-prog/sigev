"use client"

import * as React from "react"
import { X } from "lucide-react" // Ícone de fechar

interface AlertBannerProps {
  title: string
  message: string
  variant?: "default" | "destructive" | "warning" | "success"
}

const variantStyles: Record<string, string> = {
  default: "bg-gray-100 text-gray-900 border-gray-200",
  destructive: "bg-red-100 text-red-900 border-red-200",
  warning: "bg-yellow-100 text-yellow-900 border-yellow-200",
  success: "bg-green-100 text-green-900 border-green-200",
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  title,
  message,
  variant = "default",
}) => {
  const [visible, setVisible] = React.useState(true)

  if (!visible) return null

  return (
    <div
      className={`flex items-start justify-between border-l-4 p-4 rounded-md shadow-sm mb-4 ${variantStyles[variant]}`}
      role="alert"
    >
      <div className="flex-1">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-sm mt-1">{message}</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Fechar alerta"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

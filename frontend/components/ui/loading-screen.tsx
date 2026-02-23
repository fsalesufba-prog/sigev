"use client"

import React from "react"
import { Loader2 } from "lucide-react" // Ícone de loading, você já está usando lucide-react

interface LoadingScreenProps {
  message?: string
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground z-50">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="animate-spin text-iho-blue w-12 h-12" />
        {message && (
          <p className="text-lg font-medium text-center">{message}</p>
        )}
      </div>
      <div className="mt-6 text-sm text-muted-foreground">
        {/* Pode adicionar uma mensagem secundária ou animação extra aqui */}
      </div>
    </div>
  )
}

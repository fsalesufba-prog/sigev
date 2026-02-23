'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Aplica tema salvo ou prefere do sistema
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
  }

  if (!mounted) {
    return <div className="w-10 h-10" /> // Placeholder para evitar layout shift
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {document.documentElement.classList.contains('dark') 
        ? <Sun className="w-5 h-5" /> 
        : <Moon className="w-5 h-5" />}
    </button>
  )
}
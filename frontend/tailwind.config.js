/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // MUITO IMPORTANTE: usa classe .dark
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'sigev': {
          'blue': '#0066FF',
          'cyan': '#00D4FF',
          'purple': '#8A2BE2',
          'success': '#10b981',
          'warning': '#f59e0b',
          'danger': '#ef4444',
          'info': '#3b82f6',
        }
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0,102,255,0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(0,212,255,0.8)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        }
      }
    },
  },
  plugins: [],
}
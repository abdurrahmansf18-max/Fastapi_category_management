/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: { 
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf',
          500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a', 950: '#042f2e',
        },
        calm: {
          purple: '#e9d5ff', blue: '#bfdbfe', teal: '#99f6e4', rose: '#fecdd3'
        },
        calmdark: {
          purple: '#3b0764', blue: '#1e3a8a', teal: '#134e4a', rose: '#881337'
        }
      },
      boxShadow: {
        'glow': '0 0 15px -3px rgba(45, 212, 191, 0.4), 0 0 6px -2px rgba(45, 212, 191, 0.2)',
        'glow-lg': '0 0 25px -5px rgba(45, 212, 191, 0.5), 0 0 10px -3px rgba(45, 212, 191, 0.3)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'calm-gradient': 'linear-gradient(to right bottom, #f8fafc, #f1f5f9)',
        'calm-dark-gradient': 'linear-gradient(to right bottom, #020617, #0f172a)'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'breathe-card': 'breatheCard 6s ease-in-out infinite alternate',
        'gradient-x': 'gradientX 15s ease infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(15px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        glow: {
          '0%': { boxShadow: '0 0 10px -3px rgba(45, 212, 191, 0.3)' },
          '100%': { boxShadow: '0 0 20px 2px rgba(45, 212, 191, 0.6)' },
        },
        breatheCard: {
            '0%': { boxShadow: '0 0 15px -5px rgba(20, 184, 166, 0.4), inset 0 0 10px -5px rgba(167, 139, 250, 0.3)' },
            '50%': { boxShadow: '0 0 25px -2px rgba(56, 189, 248, 0.6), inset 0 0 15px -2px rgba(52, 211, 153, 0.4)' },
            '100%': { boxShadow: '0 0 15px -5px rgba(167, 139, 250, 0.4), inset 0 0 10px -5px rgba(20, 184, 166, 0.3)' },
        },
        gradientX: {
            '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
            '50%': { 'background-size': '200% 200%', 'background-position': 'right center' }
        },
        shimmer: {
            '0%': { backgroundPosition: '-1000px 0' },
            '100%': { backgroundPosition: '1000px 0' }
        },
        float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-10px)' }
        }
      }
    } 
  },
  darkMode: "class",
  plugins: [require("@tailwindcss/typography")],
}

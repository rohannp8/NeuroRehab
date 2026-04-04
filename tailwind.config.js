/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light balanced theme
        page: '#F5F6FA',
        sidebar: '#FFFFFF',
        card: '#FFFFFF',
        'card-hover': '#F9FAFB',
        border: '#E8ECF1',
        'border-light': '#F0F2F5',

        // Accent — warm amber/gold
        accent: {
          DEFAULT: '#D4956B',
          light: '#F5E6D8',
          dark: '#B87A54',
          50: '#FDF6F0',
          100: '#FAE8D8',
          200: '#F0CDB0',
        },

        // Semantic
        success: { DEFAULT: '#34C759', light: '#E8F9EE', dark: '#2AA84A' },
        warn: { DEFAULT: '#F5A623', light: '#FFF4E0', dark: '#D48E1A' },
        danger: { DEFAULT: '#FF5A5F', light: '#FFECEC', dark: '#D94449' },
        info: { DEFAULT: '#5B8DEF', light: '#EBF1FD', dark: '#4A75CC' },

        // Pastel card backgrounds
        pastel: {
          peach: '#FFF0E8',
          mint: '#E8F8F0',
          sky: '#E8F0FF',
          lilac: '#F0E8FF',
          rose: '#FFE8EE',
          lemon: '#FFF8E0',
        },

        // Text
        text: {
          primary: '#1A1D26',
          secondary: '#4A5068',
          muted: '#8C92A4',
          light: '#B0B7C8',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'sidebar': '2px 0 20px rgba(0, 0, 0, 0.04)',
        'button': '0 4px 14px rgba(212, 149, 107, 0.3)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'float': 'float 6s ease-in-out infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // iOS System Colors
        ios: {
          blue: '#007AFF',
          'blue-light': '#5AC8FA',
          green: '#34C759',
          red: '#FF3B30',
          orange: '#FF9500',
          yellow: '#FFCC00',
          purple: '#AF52DE',
          pink: '#FF2D55',
          teal: '#5AC8FA',
          gray: '#8E8E93',
        },
        // Glass Colors
        glass: {
          light: 'rgba(255, 255, 255, 0.72)',
          dark: 'rgba(30, 30, 30, 0.72)',
          border: 'rgba(255, 255, 255, 0.5)',
          'border-dark': 'rgba(255, 255, 255, 0.1)',
        },
        // Legacy support
        telegram: {
          blue: '#007AFF',
          lightblue: '#5AC8FA',
          dark: '#1c1c1e',
          darkgray: '#2c2c2e',
          lightgray: '#f2f2f7',
          text: '#1C1C1E',
          textlight: '#8e8e93',
        },
      },
      borderRadius: {
        'ios': '20px',
        'ios-lg': '24px',
        'ios-sm': '12px',
        'telegram': '12px',
      },
      backdropBlur: {
        'ios': '20px',
        'ios-lg': '40px',
      },
      boxShadow: {
        'ios': '0 8px 32px rgba(0, 0, 0, 0.08)',
        'ios-lg': '0 12px 40px rgba(0, 0, 0, 0.12)',
        'ios-dark': '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-right': 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-glow': 'pulse-glow 2s infinite',
      },
    },
  },
  plugins: [],
}

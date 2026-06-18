/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0D0D0D',
          surface: '#161616',
          elevated: '#1E1E1E',
        },
        border: {
          subtle: '#2A2A2A',
          strong: '#3A3A3A',
        },
        brand: {
          green: '#00C27C',
          hover: '#00A868',
          muted: 'rgba(0, 194, 124, 0.09)', // #00C27C18
        },
        text: {
          primary: '#F0F0F0',
          secondary: '#A0A0A0',
          muted: '#606060',
        },
        danger: '#FF4D4D',
        warning: '#F5A623',
        success: '#00C27C',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '10px',
        input: '6px',
        btn: '6px',
      },
      spacing: {
        '4xs': '4px',
        '3xs': '8px',
        '2xs': '12px',
        'xs': '16px',
        'sm': '24px',
        'md': '32px',
        'lg': '48px',
        'xl': '64px',
        '2xl': '80px',
        '3xl': '96px',
      },
      height: {
        navbar: '64px',
        input: '44px',
        btn: '44px',
      },
      width: {
        sidebar: '240px',
      }
    },
  },
  plugins: [],
}

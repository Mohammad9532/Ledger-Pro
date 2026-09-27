/** @type {import('tailwindcss').Config} */
// Ledger Pro mobile · "Ink & Lime". Mirrors src/theme/index.ts.
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F7FDE3',
          100: '#EEFBC4',
          200: '#E1F79A',
          300: '#D4F36B',
          400: '#CDF24E',
          500: '#C6F13B', // Brand lime
          600: '#A8D622',
          700: '#86AD16',
          800: '#65830F',
          900: '#4A600B',
        },
        onprimary: '#0A1311',
        background: '#0A1311',
        deep: '#070E0C',
        card: '#0F1B18',
        surface: '#16241F',
        elevated: '#1D2F29',
        text: '#E7F0EB',
        muted: '#9FB4AC',
        faint: '#7C948C',
        ghost: '#5F776F',
        border: '#1F3129',
        'border-strong': '#2C433B',
        success: '#3DD68C',
        danger: '#FF6B81',
        warning: '#F2C14E',
        info: '#5AA9F5',
        violet: '#A79BFF',

        // Existing screens use raw Tailwind hues. Re-tune those hues to the
        // palette so every screen picks up the new look without edits.
        slate: {
          50: '#EEF4F1', 100: '#E0EAE5', 200: '#C7D6D0', 300: '#A9BDB5', 400: '#9FB4AC',
          500: '#7C948C', 600: '#5F776F', 700: '#2C433B', 800: '#16241F', 900: '#0F1B18', 950: '#0A1311',
        },
        emerald: { 300: '#6FE3AA', 400: '#3DD68C', 500: '#3DD68C', 600: '#2BB877', 700: '#239A64' },
        green: { 400: '#3DD68C', 500: '#3DD68C', 600: '#2BB877' },
        red: { 300: '#FF97A7', 400: '#FF6B81', 500: '#FF6B81', 600: '#E85A70' },
        rose: { 400: '#FF6B81', 500: '#FF6B81' },
        blue: { 300: '#9ACBF9', 400: '#7DBCF8', 500: '#5AA9F5', 600: '#3A86D9' },
        sky: { 400: '#7DBCF8', 500: '#5AA9F5' },
        cyan: { 400: '#5FCFE9', 500: '#4FC3E8' },
        teal: { 400: '#5AD3C0', 500: '#2FC7B0' },
        orange: { 300: '#FFB78F', 400: '#FF9A5C', 500: '#FF9A5C' },
        amber: { 400: '#F2C14E', 500: '#F2C14E' },
        yellow: { 400: '#F2C14E', 500: '#F2C14E' },
        purple: { 400: '#B8AEFF', 500: '#A79BFF' },
        indigo: { 400: '#A5AEFF', 500: '#8F9BFF' },
        pink: { 400: '#F58CC4', 500: '#F072B6' },
      },
      fontFamily: {
        display: ['InstrumentSerif_400Regular'],
        'display-italic': ['InstrumentSerif_400Regular_Italic'],
        sans: ['InstrumentSans_400Regular'],
        'sans-medium': ['InstrumentSans_500Medium'],
        'sans-semibold': ['InstrumentSans_600SemiBold'],
        'sans-bold': ['InstrumentSans_700Bold'],
        mono: ['DMMono_400Regular'],
        'mono-medium': ['DMMono_500Medium'],
      },
    },
  },
  plugins: [],
}

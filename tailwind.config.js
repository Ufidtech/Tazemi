/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        teal:  { DEFAULT: "#1D9E75", dark: "#17835f", light: "#24c490" },
        deep:  { DEFAULT: "#085041", light: "#0a6655" },
        mist:  { DEFAULT: "#E1F5EE", dark: "#c8eddf" },
        tomato:{ DEFAULT: "#D85A30", dark: "#b84a24" },
        amber: { DEFAULT: "#B45309" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
}

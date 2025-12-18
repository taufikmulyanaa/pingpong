/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#009688",
        secondary: "#0D47A1",
        accent: "#E0F2F1",
        darkblue: "#001064",
        "navy-deep": "#001e61",
        "blue-mid": "#0d47a1",
        "lime-pop": "#E6EE9C",
        background: {
          light: "#F8FAFC",
          dark: "#0f172a",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#1e293b",
        },
        card: {
          light: "#FFFFFF",
          dark: "#1e293b",
        },
        text: {
          light: "#1f2937",
          dark: "#f3f4f6",
        },
        muted: {
          light: "#6B7280",
          dark: "#94A3B8",
        },
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        glow: "0 0 15px rgba(0, 150, 136, 0.3)",
      },
    },
  },
  plugins: [],
};

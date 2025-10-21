/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        // Sistema di font unificato per la piattaforma
        caption: ["0.75rem", { lineHeight: "1rem" }], // 12px - Per caption e note
        "body-sm": ["0.875rem", { lineHeight: "1.25rem" }], // 14px - Per testo piccolo
        body: ["1rem", { lineHeight: "1.5rem" }], // 16px - Testo principale
        "body-lg": ["1.125rem", { lineHeight: "1.75rem" }], // 18px - Testo enfatizzato
        "heading-sm": ["1.25rem", { lineHeight: "1.75rem" }], // 20px - Sottotitoli
        heading: ["1.5rem", { lineHeight: "2rem" }], // 24px - Titoli sezioni
        "heading-lg": ["1.875rem", { lineHeight: "2.25rem" }], // 30px - Titoli principali
        display: ["2.25rem", { lineHeight: "2.5rem" }], // 36px - Titoli pagina
        "display-lg": ["3rem", { lineHeight: "1" }], // 48px - Titoli hero
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "scroll-down": "scrollDown 30s linear infinite",
        "scroll-down-slow": "scrollDown 40s linear infinite",
        "scroll-down-fast": "scrollDown 25s linear infinite",
      },
      keyframes: {
        scrollDown: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
      },
      colors: {
        "agri-green": {
          50: "#f0f9f0",
          100: "#dcf1dc",
          200: "#bce3bc",
          300: "#8ece8e",
          400: "#61b461",
          500: "#3c953c",
          600: "#2e782e",
          700: "#276127",
          800: "#224d22",
          900: "#1e401e",
          950: "#0c220c",
        },
        harvest: {
          100: "#fdf6e3", // Sfondo crema chiaro
          200: "#f8edca", // Paglia chiara
          300: "#eed592", // Paglia
          400: "#d9b362", // Paglia scura
          500: "#a0955a", // Grano
          600: "#5a5530", // Terra
        },
        field: {
          100: "#e9f5fd", // Cielo chiaro
          200: "#c5e3fa", // Cielo
          300: "#86b9dd", // Cielo più scuro
          400: "#5b8ba6", // Blu sfumato dell'orizzonte
          500: "#3a566b", // Blu profondo
          600: "#18293d", // Blu notte
        },
        nature: {
          100: "#f1f8e9", // Verde chiaro
          200: "#dcedc8", // Verde medio chiaro
          300: "#6a8d54", // Verde campo
          400: "#4c7031", // Verde scuro
          500: "#344a1f", // Verde molto scuro
          600: "#20341a", // Verde quasi nero
        },
      },
    },
  },
  plugins: [],
};

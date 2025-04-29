export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    boxShadow: {
      md: "0 2px 24px 1px rgba(0, 0, 0, 0.16)",
    },
    data: {
      shown: 'shown="true"',
      hidden: 'shown="false"',
    },
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#000000",
        subtle: "#6b7280",
      },
      zIndex: {
        1: "1",
      },
    },
  },
  plugins: [],
};

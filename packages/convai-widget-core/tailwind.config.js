const colors = ["base", "accent"];
const shades = [
  null,
  "hover",
  "active",
  "border",
  "subtle",
  "primary",
  "error",
];

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
    colors: Object.fromEntries(
      colors.flatMap(color =>
        shades.map(shade => {
          const key = shade ? `${color}-${shade}` : color;
          return [key, `var(--${key})`];
        })
      )
    ),
    extend: {
      zIndex: {
        1: "1",
      },
    },
  },
  plugins: [],
};

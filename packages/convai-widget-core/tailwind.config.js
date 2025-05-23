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
const radii = [
  "button",
  "input",
  "bubble",
  "sheet",
  "compact-sheet",
  "dropdown-sheet",
];
const spacing = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24,
  28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
];

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    boxShadow: {
      md: "0 2px 24px 1px rgba(0, 0, 0, 0.16)",
      lg: "0 2px 40px 1px rgba(0, 0, 0, 0.12)",
    },
    data: {
      shown: 'shown="true"',
      hidden: 'shown="false"',
    },
    colors: Object.fromEntries(
      colors.flatMap(color =>
        shades.map(shade => {
          const key = shade ? `${color}-${shade}` : color;
          return [key, `var(--el-${key})`];
        })
      )
    ),
    spacing: {
      ...Object.fromEntries(spacing.map(i => [i, `${i * 4}px`])),
      px: "1px",
    },
    fontSize: {
      xs: ["12px", "16px"],
      sm: ["14px", "20px"],
      md: ["16px", "24px"],
      lg: ["18px", "26px"],
      xl: ["20px", "28px"],
      "2xl": ["24px", "30px"],
    },
    borderRadius: {
      ...Object.fromEntries(
        radii.map(radius => [radius, `var(--el-${radius}-radius)`])
      ),
      none: "0px",
      full: "9999px",
    },
    zIndex: {
      1: "1",
      10: "10",
    },
  },
  plugins: [],
};

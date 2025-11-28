export default [
  {
    ignores: ["node_modules/", ".next/", "public/"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: ["next/core-web-vitals"],
  },
];


export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,mjs}"],
    rules: {
      complexity: ["error", 25],
    },
  },
  {
    files: ["v2/**/*.{js,mjs}", "lib/**/*.{js,mjs}", "scripts/**/*.mjs"],
    rules: {
      complexity: ["error", 20],
    },
  },
];

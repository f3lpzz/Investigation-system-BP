import globals from "globals";
// O alvo (app.js) e passado na linha de comando: eslint "../Painel (o app)/app.js"
export default [
  { ignores: ["**/node_modules/**"] },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, DADOS: "writable" },
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "error",
      eqeqeq: ["warn", "smart"],
      "no-redeclare": "warn",
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-unreachable": "warn",
      "no-cond-assign": "warn",
      "no-constant-condition": ["warn", { checkLoops: false }],
    },
  },
];

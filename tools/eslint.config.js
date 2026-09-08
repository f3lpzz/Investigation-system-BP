import globals from "globals";
// Configuração compartilhada pelo lint dos scripts clássicos do painel.
export default [
  { ignores: ["**/node_modules/**"] },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser },
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

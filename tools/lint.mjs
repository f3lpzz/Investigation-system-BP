// Scripts clássicos compartilham o escopo global no navegador. Analisa TODOS
// na ordem do HTML, sem ignorar app/ por estar fora da pasta tools/.
import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import config from "./eslint.config.js";
import { APP, scriptsLocais } from "./carregar-app.mjs";
const arquivos = scriptsLocais();
const codigo = arquivos
  .map((n) => fs.readFileSync(path.join(APP, n), "utf8"))
  .join("\n");
const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config });
const results = await eslint.lintText(codigo, {
  filePath: "painel-scripts.js",
});
console.log((await eslint.loadFormatter("stylish")).format(results));
console.log("Arquivos analisados: " + arquivos.join(", "));
process.exit(results.some((r) => r.errorCount > 0) ? 1 : 0);

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const APP = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../app",
);
export function scriptsLocais() {
  const html = fs.readFileSync(path.join(APP, "painel.html"), "utf8");
  return [...html.matchAll(/<script src="([^"?]+)(?:\?[^\"]*)?"/g)]
    .map((m) => m[1])
    .filter((src) => !src.includes("://"));
}
export function scriptsApp() {
  return scriptsLocais().filter(
    (src) =>
      ![
        "supabase-config.js",
        "dados-vazio.js",
        "salas-base.js",
        "online.js",
        "ia.js",
      ].includes(src),
  );
}
export function codigoApp() {
  return scriptsApp()
    .map((src) => fs.readFileSync(path.join(APP, src), "utf8"))
    .join("\n");
}

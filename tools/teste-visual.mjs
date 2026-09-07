/* Chrome real no CI, usando o servidor da skill verificar-visual.
   Os PNGs são evidência para revisão, não uma comparação automática de pixels. */
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
const executar = promisify(execFile);
const pasta = path.resolve(process.env.VISUAL_OUTPUT || "visual");
await mkdir(pasta, { recursive: true });
const servidor = spawn(
  process.execPath,
  [new URL("./servidor-visual.mjs", import.meta.url).pathname],
  { stdio: ["ignore", "pipe", "inherit"] },
);
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Servidor visual não iniciou")),
      10000,
    );
    servidor.once("error", reject);
    servidor.once("exit", (code) =>
      reject(new Error("Servidor encerrou: " + code)),
    );
    servidor.stdout.once("data", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  for (const [w, h] of [
    [1240, 820],
    [500, 900],
  ]) {
    for (const vista of [
      "grade",
      "mapa",
      "teorias",
      "conta",
      "arquivo-pessoas",
      "conflito",
    ]) {
      const saida = path.join(pasta, `${vista}-${w}.png`);
      await executar(
        process.env.CHROME_PATH || "google-chrome",
        [
          "--headless",
          "--no-sandbox",
          "--disable-gpu",
          "--hide-scrollbars",
          `--window-size=${w},${h}`,
          "--virtual-time-budget=8000",
          `--screenshot=${saida}`,
          `http://localhost:4599/painel.html?seed=${vista}`,
        ],
        { timeout: 45000, maxBuffer: 4 * 1024 * 1024 },
      );
      if ((await stat(saida)).size < 1000)
        throw new Error("Screenshot vazio: " + saida);
      console.log("Screenshot: " + saida);

    }
  }
} finally {
  servidor.kill();
}

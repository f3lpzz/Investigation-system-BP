/* extrair-diretorio-salas.mjs — Etapa 1 do Diretório de Salas.
   Lê os 110 arquivos .md em "Diretorio salas BP/", extrai os campos
   (EN/PT: nome, descrição, raridade, custo, tipo, número + foto/fonte),
   junta a categoria semântica (Blueprint/Bedroom/…) do salas-base.js,
   e gera um JSON validado. NÃO toca em nada online. */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, ".."); // pasta "Blue Prince/"
const DIR_FOTOS = "C:/Users/T-GAMER/Desktop/Diretorio salas BP";
const SAIDA = join(RAIZ, "Painel (o app)", "diretorio-salas.json");

// ---- tag simples: pega o conteúdo entre <tag>...</tag> (multi-linha) ----
function tag(txt, nome) {
  const m = txt.match(new RegExp(`<${nome}>([\\s\\S]*?)</${nome}>`, "i"));
  return m ? m[1].trim() : "";
}
function bloco(txt, nome) {
  const m = txt.match(new RegExp(`<${nome}>([\\s\\S]*?)</${nome}>`, "i"));
  return m ? m[1] : "";
}

// ---- lê a categoria semântica (categorias[]) do salas-base.js por nome ----
function carregarCategorias() {
  const p = join(RAIZ, "Painel (o app)", "salas-base.js");
  const js = readFileSync(p, "utf8");
  // executa só a atribuição window.SALAS_BASE num sandbox mínimo
  const window = {};
  new Function("window", js)(window);
  const map = {};
  for (const s of window.SALAS_BASE || []) {
    map[s.nome] = { categorias: s.categorias || [], diretorio: s.diretorio || "" };
  }
  return map;
}

// ---- percorre as subpastas e coleta os .md ----
function listarMd(raiz) {
  const out = [];
  for (const nome of readdirSync(raiz)) {
    const full = join(raiz, nome);
    if (statSync(full).isDirectory()) {
      for (const arq of readdirSync(full)) {
        if (arq.toLowerCase().endsWith(".md")) out.push({ pasta: nome, arquivo: join(full, arq) });
      }
    }
  }
  return out;
}

const cats = carregarCategorias();
const arquivos = listarMd(DIR_FOTOS);
const salas = [];
const problemas = [];

for (const { pasta, arquivo } of arquivos) {
  const txt = readFileSync(arquivo, "utf8");
  const en = bloco(txt, "en");
  const pt = bloco(txt, "pt");
  const nome = tag(en, "name"); // identidade (bate com salas-base.nome)
  const info = cats[nome] || { categorias: [], diretorio: pasta };
  const sala = {
    nome,
    num: parseInt(tag(en, "number"), 10) || null,
    nome_en: tag(en, "name"),
    nome_pt: tag(pt, "nome"),
    descricao_en: tag(en, "description"),
    descricao_pt: tag(pt, "descricao"),
    raridade_en: tag(en, "rarity"),
    raridade_pt: tag(pt, "raridade"),
    custo_en: tag(en, "cost"),
    custo_pt: tag(pt, "custo"),
    tipo_en: tag(en, "type"),
    tipo_pt: tag(pt, "tipo"),
    categorias: info.categorias,
    diretorio: tag(txt, "categoria_diretorio") || info.diretorio,
    foto: tag(txt, "foto"),
    fonte: tag(txt, "fonte"),
    _pasta: pasta,
    _caminho_foto: join(DIR_FOTOS, pasta, tag(txt, "foto")),
  };
  // validações
  if (!sala.nome) problemas.push(`SEM NOME: ${arquivo}`);
  if (!sala.descricao_en || !sala.descricao_pt) problemas.push(`SEM DESCRIÇÃO: ${nome}`);
  if (!sala.foto) problemas.push(`SEM FOTO: ${nome}`);
  if (!cats[nome]) problemas.push(`NOME não existe no salas-base: ${nome}`);
  salas.push(sala);
}

// ordena por número (as sem número vão pro fim)
salas.sort((a, b) => (a.num || 9999) - (b.num || 9999));

writeFileSync(SAIDA, JSON.stringify(salas, null, 2), "utf8");

console.log(`Lidos: ${arquivos.length} arquivos .md`);
console.log(`Salas geradas: ${salas.length}`);
console.log(`Categorias distintas: ${[...new Set(salas.flatMap((s) => s.categorias))].join(", ")}`);
console.log(`Problemas: ${problemas.length}`);
for (const p of problemas) console.log("  - " + p);
console.log(`\nArquivo gerado: ${SAIDA}`);
console.log(`\n--- Amostra (primeira sala) ---`);
console.log(JSON.stringify(salas[0], null, 2));

/* gerar-seed-salas.mjs — gera o SQL de upsert do diretorio_salas.
   Lê diretorio-salas.json (Etapa 1), monta o link público de cada imagem
   (bucket "salas", caminho "<pasta>/<foto>") e escreve arquivos .sql em
   lotes, prontos para rodar pelo conector do Supabase. Não precisa de chave. */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const SUPABASE_URL = "https://gppfzdlqauygzvpodbdh.supabase.co";
const ARQ_JSON = join(RAIZ, "Painel (o app)", "diretorio-salas.json");
const OUT_DIR = AQUI;
const LOTE = 28; // linhas por arquivo .sql

const salas = JSON.parse(readFileSync(ARQ_JSON, "utf8"));

// escapa texto para SQL (aspas simples)
const q = (v) => "'" + String(v ?? "").replace(/'/g, "''") + "'";
// codifica cada segmento do caminho, mantendo a "/"
const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
// array text[] do Postgres
const arr = (a) =>
  "ARRAY[" + (a || []).map((x) => q(x)).join(",") + "]::text[]";

function linkImagem(s) {
  const caminho = `${s._pasta}/${s.foto}`;
  return `${SUPABASE_URL}/storage/v1/object/public/salas/${encPath(caminho)}`;
}

const COLS =
  "(nome,num,nome_en,nome_pt,descricao_en,descricao_pt,raridade_en,raridade_pt," +
  "custo_en,custo_pt,tipo_en,tipo_pt,categorias,diretorio,imagem,fonte,atualizado_em)";

function valores(s) {
  return (
    "(" +
    [
      q(s.nome),
      s.num == null ? "NULL" : parseInt(s.num, 10),
      q(s.nome_en),
      q(s.nome_pt),
      q(s.descricao_en),
      q(s.descricao_pt),
      q(s.raridade_en),
      q(s.raridade_pt),
      q(s.custo_en),
      q(s.custo_pt),
      q(s.tipo_en),
      q(s.tipo_pt),
      arr(s.categorias),
      q(s.diretorio),
      q(linkImagem(s)),
      q(s.fonte),
      "now()",
    ].join(",") +
    ")"
  );
}

const CONFLICT =
  " on conflict (nome) do update set " +
  [
    "num",
    "nome_en",
    "nome_pt",
    "descricao_en",
    "descricao_pt",
    "raridade_en",
    "raridade_pt",
    "custo_en",
    "custo_pt",
    "tipo_en",
    "tipo_pt",
    "categorias",
    "diretorio",
    "imagem",
    "fonte",
    "atualizado_em",
  ]
    .map((c) => `${c}=excluded.${c}`)
    .join(",") +
  ";";

let n = 0;
for (let i = 0; i < salas.length; i += LOTE) {
  const lote = salas.slice(i, i + LOTE);
  const sql =
    `insert into public.diretorio_salas ${COLS} values\n` +
    lote.map(valores).join(",\n") +
    CONFLICT +
    "\n";
  const nome = `seed-salas-${String(++n).padStart(2, "0")}.sql`;
  writeFileSync(join(OUT_DIR, nome), sql, "utf8");
  console.log(`Gerado ${nome} (${lote.length} salas)`);
}
console.log(`\nTotal: ${salas.length} salas em ${n} arquivos.`);
console.log(`Amostra de link: ${linkImagem(salas[0])}`);

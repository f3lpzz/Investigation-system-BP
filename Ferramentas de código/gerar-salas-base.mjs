/* gerar-salas-base.mjs — regenera Painel (o app)/salas-base.js a partir do
   diretorio-salas.json, já com as IMAGENS do Supabase (nunca da wiki) e os
   campos EN/PT. salas-base.js é o FALLBACK/semente (o app sobrepõe o diretório
   ao vivo por cima; isto só vale se a busca do diretório falhar). */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, "..");
const SUPABASE_URL = "https://gppfzdlqauygzvpodbdh.supabase.co";
const ARQ_JSON = join(RAIZ, "Painel (o app)", "diretorio-salas.json");
const SAIDA = join(RAIZ, "Painel (o app)", "salas-base.js");

const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
const salas = JSON.parse(readFileSync(ARQ_JSON, "utf8"));

const base = salas.map((s) => ({
  nome: s.nome,
  num: s.num,
  nome_en: s.nome_en,
  nome_pt: s.nome_pt,
  descricao: s.descricao_pt, // compat: campo único (PT)
  descricao_en: s.descricao_en,
  descricao_pt: s.descricao_pt,
  raridade: s.raridade_pt, // compat
  raridade_en: s.raridade_en,
  raridade_pt: s.raridade_pt,
  custo_en: s.custo_en,
  custo_pt: s.custo_pt,
  tipo: s.tipo_pt, // compat
  tipo_en: s.tipo_en,
  tipo_pt: s.tipo_pt,
  categorias: s.categorias,
  diretorio: s.diretorio,
  imagem: `${SUPABASE_URL}/storage/v1/object/public/salas/${encPath(s._pasta + "/" + s.foto)}`,
  fonte: s.fonte,
  fatos: [],
  notas: "",
  descoberta: false,
}));

const cabecalho = `/* salas-base.js — lista-base das salas (dado do jogo, igual para todos).
   GERADO por Ferramentas de código/gerar-salas-base.mjs a partir do
   diretorio-salas.json. Imagens apontam para o Storage do Supabase (bucket
   público "salas"), nunca para a wiki. É a SEMENTE/fallback: o app sobrepõe o
   diretório ao vivo (tabela diretorio_salas) por cima na hora de carregar.
   Campos pessoais zerados (descoberta=false; fatos/notas vazios). */
window.SALAS_BASE = `;

writeFileSync(SAIDA, cabecalho + JSON.stringify(base, null, 2) + ";\n", "utf8");
console.log(`salas-base.js regenerado: ${base.length} salas.`);
console.log(`Amostra imagem: ${base[0].imagem}`);

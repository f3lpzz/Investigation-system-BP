// teste-online.mjs — valida a camada ONLINE (online.js) com um Supabase FALSO (mock).
// Não precisa de internet nem do Supabase real. Roda com: node teste-online.mjs
// Verifica: 1º acesso cria esqueleto v6; round-trip "ler = salvar" idêntico;
//           autosave dispara ao alterar; logout limpa a memória.
import { JSDOM } from "jsdom";
import fs from "fs";
import vm from "vm";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "Painel (o app)");
const ler = (n) => fs.readFileSync(path.join(ROOT, n), "utf8");

const html = ler("painel.html");
const dadosVazio = ler("dados-vazio.js");
const app = ler("app.js");
const online = ler("online.js");

let falhas = 0;
const erros = [];
const ok = (nome, cond) => {
  console.log((cond ? "OK  " : "FALHOU  ") + nome);
  if (!cond) falhas++;
};

/* ---------------- Supabase FALSO (mock) ---------------- */
let sessionNow = null;
let authCb = null;
let cloud = {}; // user_id -> dados (o "banco" em memória)
let upsertCalls = [];

function makeBuilder() {
  const st = { filtros: {} };
  const b = {
    select() {
      return b;
    },
    eq(c, v) {
      st.filtros[c] = v;
      return b;
    },
    async maybeSingle() {
      const uid = st.filtros.user_id;
      if (uid in cloud) return { data: { dados: cloud[uid] }, error: null };
      return { data: null, error: null };
    },
    async upsert(row) {
      upsertCalls.push(JSON.parse(JSON.stringify(row)));
      cloud[row.user_id] = JSON.parse(JSON.stringify(row.dados));
      return { data: [row], error: null };
    },
  };
  return b;
}
const mockSb = {
  auth: {
    async getSession() {
      return { data: { session: sessionNow }, error: null };
    },
    onAuthStateChange(cb) {
      authCb = cb;
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signInWithPassword() {
      return { data: {}, error: null };
    },
    async signUp() {
      return { data: {}, error: null };
    },
    async resetPasswordForEmail() {
      return { data: {}, error: null };
    },
    async signInWithOAuth() {
      return { data: {}, error: null };
    },
    async signOut() {
      return { error: null };
    },
  },
  from() {
    return makeBuilder();
  },
};

/* ---------------- Ambiente "sem tela" ---------------- */
const dom = new JSDOM(html, { pretendToBeVisual: true, url: "http://localhost/" });
const w = dom.window;
w.alert = () => {};
w.onerror = (m) => erros.push(String(m));
w.supabase = { createClient: () => mockSb };
w.SUPABASE_URL = "http://localhost";
w.SUPABASE_ANON_KEY = "anon-fake";
w.MODO_ONLINE = true;

const ctx = vm.createContext(w);
const g = (s) => vm.runInContext(s, ctx);
try {
  g(dadosVazio + "\n" + app + "\n" + online);
} catch (e) {
  erros.push("THROW no carregamento: " + e.message);
}

const sleep = (ms) => new Promise((r) => w.setTimeout(r, ms));
async function until(pred, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (pred()) return true;
    await sleep(20);
  }
  return pred();
}
const login = (user) => {
  sessionNow = { user };
  if (authCb) authCb("SIGNED_IN", sessionNow);
};

(async () => {
  /* Teste 1 — esqueleto v6 */
  const esq = g("window.esqueletoVazioV6()");
  const listas = [
    "fichas", "salas", "personagens", "colecoes",
    "grupos", "teorias", "quadros", "tipos",
  ];
  ok("esqueleto: version = 6", esq.version === 6);
  ok("esqueleto: 8 listas são arrays", listas.every((k) => Array.isArray(esq[k])));
  ok("esqueleto: fichas vazias", esq.fichas.length === 0);

  await sleep(60);
  ok("sem sessão -> mostra tela de login", w.document.body.classList.contains("pre-login"));

  /* Teste 2 — 1º acesso cria a linha (esqueleto) na nuvem */
  cloud = {};
  upsertCalls = [];
  login({ id: "user-A", email: "a@test.com" });
  await until(() => !w.document.body.classList.contains("pre-login"));
  ok("1º acesso: entrou no app", !w.document.body.classList.contains("pre-login"));
  ok("1º acesso: criou a linha na nuvem (upsert)", upsertCalls.length >= 1);
  ok("1º acesso: catálogo começa vazio (0 fichas)", g("DADOS.fichas.length") === 0);
  ok("1º acesso: tipos padrão presentes", g("DADOS.tipos.length") > 0);

  /* Teste 3 — round-trip "ler = salvar" idêntico */
  const catalogo = {
    version: 6,
    fichas: [
      {
        id: "f1", titulo: "Teste", sala: "", grupos: [], personagens: [],
        conexoes: [], notas: "nota", pendente: false, fav: false, status: "",
        paginas: [{ imagem: "", original: "O", traducao: "T", explica: "E", rotulo: "Frente" }],
      },
    ],
    salas: [], personagens: [], colecoes: [], grupos: [], teorias: [],
    quadros: [{ nome: "Quadro 1", cam: { x: 40, y: 40, s: 1 }, nodes: [], setas: [] }],
    tipos: [{ id: "sala", nome: "Sala", cor: "#5ec8ff" }],
  };
  g("window.sairDaConta && window.sairDaConta()");
  await sleep(60);
  cloud = { "user-B": JSON.parse(JSON.stringify(catalogo)) };
  upsertCalls = [];
  login({ id: "user-B", email: "b@test.com" });
  await until(() => g("DADOS.fichas.length") === 1);
  ok("round-trip: carregou 1 ficha da nuvem", g("DADOS.fichas.length") === 1);
  upsertCalls = [];
  await g("window.NUVEM.salvarAgora()");
  await until(() => upsertCalls.length >= 1);
  const salvo = upsertCalls[upsertCalls.length - 1].dados;
  ok(
    "round-trip: ler = salvar idêntico (fichas)",
    JSON.stringify(salvo.fichas) === JSON.stringify(catalogo.fichas),
  );

  /* Teste 4 — autosave dispara ao alterar */
  upsertCalls = [];
  g(
    "DADOS.fichas.push({id:'f2',titulo:'Nova',sala:'',grupos:[],personagens:[],conexoes:[],notas:'',pendente:false,fav:false,status:'',paginas:[]}); _persistApenas();",
  );
  const disparou = await until(() => upsertCalls.length >= 1, 3000);
  ok("autosave: alteração dispara salvar na nuvem", disparou);
  ok(
    "autosave: salvou a ficha nova (f2)",
    upsertCalls.length > 0 &&
      upsertCalls[upsertCalls.length - 1].dados.fichas.some((f) => f.id === "f2"),
  );

  /* Teste 5 — logout limpa a memória */
  g("window.sairDaConta && window.sairDaConta()");
  await until(() => w.document.body.classList.contains("pre-login"));
  ok("logout: voltou para a tela de login", w.document.body.classList.contains("pre-login"));
  ok("logout: limpou o catálogo da memória", g("DADOS.fichas.length") === 0);

  ok("zero erros de runtime", erros.length === 0);
  if (erros.length) console.log("Erros:", erros.slice(0, 5));

  console.log(falhas === 0 ? "\n=== ONLINE OK ===" : `\n=== ${falhas} FALHA(S) ===`);
  process.exit(falhas === 0 ? 0 : 1);
})();

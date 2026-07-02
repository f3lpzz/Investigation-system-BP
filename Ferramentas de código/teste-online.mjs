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
const salasBase = ler("salas-base.js"); // lista-base das salas (semeia o Diretório)

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
let falharCarga = false; // quando true, a leitura da nuvem falha (teste de falha de carga)

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
      if (falharCarga)
        return { data: null, error: { message: "Failed to fetch" } };
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

// Contador: quantas vezes o app registra "mouseup" na window (pega vazamento).
let mouseupAdds = 0;
const _origAddEv = w.addEventListener.bind(w);
w.addEventListener = function (tipo, fn, opts) {
  if (tipo === "mouseup") mouseupAdds++;
  return _origAddEv(tipo, fn, opts);
};

const ctx = vm.createContext(w);
const g = (s) => vm.runInContext(s, ctx);
try {
  g(salasBase + "\n" + dadosVazio + "\n" + app + "\n" + online);
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
// "Entrou de fato" = não está na tela de login NEM na de carregando.
const entrou = () =>
  !w.document.body.classList.contains("pre-login") &&
  !w.document.body.classList.contains("app-carregando");

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
  ok(
    "esqueleto: Diretório semeado com as salas-base",
    esq.salas.length > 0 && esq.salas.length === g("window.SALAS_BASE.length"),
  );
  ok(
    "esqueleto: salas começam NÃO descobertas",
    esq.salas.every((s) => s.descoberta === false),
  );

  await sleep(60);
  ok("sem sessão -> mostra tela de login", w.document.body.classList.contains("pre-login"));

  /* Teste 2 — 1º acesso cria a linha (esqueleto) na nuvem */
  cloud = {};
  upsertCalls = [];
  login({ id: "user-A", email: "a@test.com" });
  await until(entrou);
  ok("1º acesso: entrou no app", entrou());
  ok("1º acesso: criou a linha na nuvem (upsert)", upsertCalls.length >= 1);
  ok("1º acesso: catálogo começa vazio (0 fichas)", g("DADOS.fichas.length") === 0);
  ok("1º acesso: Diretório vem com as salas do jogo", g("DADOS.salas.length") > 0);
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

  /* Teste 5 — falha de carga NÃO arma o autosave (não sobrescreve a nuvem) */
  g("window.sairDaConta && window.sairDaConta()");
  await sleep(60);
  cloud = { "user-C": JSON.parse(JSON.stringify(catalogo)) }; // catálogo real na nuvem
  falharCarga = true;
  upsertCalls = [];
  login({ id: "user-C", email: "c@test.com" });
  await sleep(250); // tenta carregar e falha
  ok(
    "falha de carga: continua na tela de login (não entra)",
    w.document.body.classList.contains("pre-login"),
  );
  // Mesmo forçando uma alteração, o autosave deve estar DESARMADO (não logado).
  g(
    "DADOS.fichas.push({id:'fX',titulo:'x',sala:'',grupos:[],personagens:[],conexoes:[],notas:'',pendente:false,fav:false,status:'',paginas:[]}); _persistApenas();",
  );
  await sleep(1800);
  ok(
    "falha de carga: NÃO sobrescreve a nuvem (zero gravações)",
    upsertCalls.length === 0,
  );
  falharCarga = false;

  /* Teste 6 — logout limpa a memória */
  await g("window.sairDaConta && window.sairDaConta()");
  await until(() => g("DADOS.fichas.length") === 0);
  ok("logout: voltou para a tela de login", w.document.body.classList.contains("pre-login"));
  ok("logout: limpou o catálogo da memória", g("DADOS.fichas.length") === 0);

  /* Teste 7 — Quadros: sem vazamento de listener + import restaura quadros */
  g('setView("teorias"); render();');
  const addsAposPrimeiro = mouseupAdds;
  g("render(); render(); render();");
  ok(
    "quadros: re-renders NÃO empilham mouseup na window (vazamento corrigido)",
    mouseupAdds === addsAposPrimeiro,
  );
  g(
    'aplicarImport({salas:[],personagens:[],colecoes:[],fichas:[],teorias:[],tipos:[],quadros:[{nome:"Q Teste",cam:{x:0,y:0,s:1},nodes:[{id:"nT",tipo:"texto",texto:"oi",x:10,y:10,w:250}],setas:[]}]})',
  );
  ok(
    "import: restaura os QUADROS do backup (bug corrigido)",
    g(
      'DADOS.quadros.length === 1 && DADOS.quadros[0].nome === "Q Teste" && DADOS.quadros[0].nodes.length === 1',
    ),
  );

  /* Teste 8 — Ferramentas dos Quadros (Etapa C) */
  g("trocarQuadro(0)");
  g('qNovoTextoEm(100, 100, "nota")');
  ok(
    "nota: criada com campo aditivo (estilo/cor de paleta)",
    g(
      '(function(){var q=quadroAtual();var n=q.nodes[q.nodes.length-1];return q.nodes.length===2 && n.estilo==="nota" && typeof n.cor==="number";})()',
    ),
  );
  g(
    "(function(){var q=quadroAtual();_qSelSet=new Set([q.nodes[q.nodes.length-1].id]);qDuplicarSelecao();})()",
  );
  ok(
    "duplicar (Ctrl+D): cria cópia deslocada e seleciona a cópia",
    g(
      "(function(){var q=quadroAtual();var c=q.nodes[q.nodes.length-1];return q.nodes.length===3 && _qSelSet.size===1 && c.estilo===\"nota\";})()",
    ),
  );
  g(
    "(function(){var q=quadroAtual();var a=q.nodes[1].id,b=q.nodes[2].id;q.setas.push({de:a,para:b});_qSelSet=new Set([a,b]);qApagarSelecao();})()",
  );
  ok(
    "apagar seleção (Delete): remove os cartões E as setas deles",
    g(
      "(function(){var q=quadroAtual();return q.nodes.length===1 && q.setas.length===0;})()",
    ),
  );
  g('qSetTool("nota")');
  ok("ferramentas: qSetTool troca o modo ativo", g('_qTool === "nota"'));
  g('qSetTool("select")');

  /* Teste 9 — Setas estilo tldraw (Etapa D) */
  ok(
    "seta: geometria corta na BORDA do cartão (não no centro)",
    g(
      "(function(){var p=qClipRect(100,100,300,100,{x:50,y:50,w:100,h:100},0);return Math.round(p.x)===150 && Math.round(p.y)===100;})()",
    ),
  );
  // cria 2 cartões + 1 seta e dá rótulo (com HTML malicioso p/ provar o escape)
  w.prompt = () => "<b>rot &</b>";
  g(
    "(function(){var q=quadroAtual();var n1=qNovoTextoEm(0,0);var n2=qNovoTextoEm(400,0);q.setas.push({de:n1.id,para:n2.id});desenhaSetas();window._nA=n1.id;window._nB=n2.id;})()",
  );
  g("qRotuloSeta(0)");
  ok(
    "seta: rótulo salvo (campo aditivo) e renderizado com ESCAPE",
    g('quadroAtual().setas[0].rotulo === "<b>rot &</b>"') &&
      g('document.getElementById("qsvg").innerHTML.indexOf("&lt;b&gt;") !== -1') &&
      g('document.getElementById("qsvg").innerHTML.indexOf("<b>rot") === -1'),
  );
  // religar a ponta para outro cartão
  g("(function(){var n3=qNovoTextoEm(0,300);window._nC=n3.id;})()");
  ok(
    "seta: religar a ponta para outro cartão funciona",
    g(
      'qReligarSeta(0, "para", window._nC) === true && quadroAtual().setas[0].para === window._nC',
    ),
  );
  ok(
    "seta: religar para o PRÓPRIO cartão é recusado",
    g('qReligarSeta(0, "para", quadroAtual().setas[0].de) === false'),
  );
  // seleção + delete da seta
  g("qSelSeta(0)");
  ok("seta: clique seleciona (não apaga mais direto)", g("_qSetaSel === 0"));
  g("qDelSeta(0)");
  ok(
    "seta: Delete apaga a selecionada e zera a seleção",
    g("quadroAtual().setas.length === 0 && _qSetaSel === -1"),
  );

  ok("zero erros de runtime", erros.length === 0);
  if (erros.length) console.log("Erros:", erros.slice(0, 5));

  console.log(falhas === 0 ? "\n=== ONLINE OK ===" : `\n=== ${falhas} FALHA(S) ===`);
  process.exit(falhas === 0 ? 0 : 1);
})();

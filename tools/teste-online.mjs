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
const ROOT = path.resolve(HERE, "..", "app");
const ler = (n) => fs.readFileSync(path.join(ROOT, n), "utf8");

const html = ler("painel.html");
const dadosVazio = ler("dados-vazio.js");
const app = ler("app.js");
const online = ler("online.js");
const salasBase = ler("salas-base.js"); // lista-base das salas (semeia o Diretório)
const iaJs = ler("ia.js"); // camada de IA (processar pistas)

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
let diretorioSalas = []; // "tabela" diretorio_salas em memória (vazia = sem sobreposição)

function makeBuilder(table) {
  const st = { filtros: {}, table };
  const b = {
    select() {
      return b;
    },
    eq(c, v) {
      st.filtros[c] = v;
      return b;
    },
    // Permite `await sb.from("diretorio_salas").select("*")` (sem maybeSingle).
    then(resolve) {
      if (st.table === "diretorio_salas")
        resolve({ data: JSON.parse(JSON.stringify(diretorioSalas)), error: null });
      else resolve({ data: null, error: null });
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
  from(table) {
    return makeBuilder(table);
  },
};

/* ---------------- Ambiente "sem tela" ---------------- */
const dom = new JSDOM(html, { pretendToBeVisual: true, url: "http://localhost/" });
const w = dom.window;
w.alert = () => {};
w.confirm = () => true; // confirmações aceitas nos testes (ex.: lote da IA)
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
  w.IA_ATIVA = true; // liga a camada de IA nos testes (a chamada real é mockada)
  g(salasBase + "\n" + dadosVazio + "\n" + app + "\n" + online + "\n" + iaJs);
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
  ok(
    "seta: retângulo de seleção detecta a linha (geometria)",
    g(
      "qSegCruzaRect(0,50,100,50,40,40,60,60) === true && qSegCruzaRect(0,0,10,10,40,40,60,60) === false",
    ),
  );
  // cria 2 cartões + 1 seta e dá rótulo via MODAL do sistema (com HTML malicioso p/ provar o escape)
  g(
    "(function(){var q=quadroAtual();var n1=qNovoTextoEm(0,0);var n2=qNovoTextoEm(400,0);q.setas.push({de:n1.id,para:n2.id});desenhaSetas();window._nA=n1.id;window._nB=n2.id;})()",
  );
  g("qRotuloSeta(0)");
  ok(
    "seta: rótulo abre em modal do SISTEMA (não prompt do navegador)",
    g(
      'document.getElementById("qrotulo") !== null && document.getElementById("qrotuloInput") !== null',
    ),
  );
  g('document.getElementById("qrotuloInput").value = "<b>rot &</b>"');
  g("qRotuloSalvar(0)");
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
  // seleção + delete da seta (seleção múltipla via qApagarSelecao)
  g("qSelSeta(0)");
  ok("seta: clique seleciona (não apaga mais direto)", g("_qSetaSel.has(0)"));
  g("qApagarSelecao()");
  ok(
    "seta: Delete apaga a(s) selecionada(s) e zera a seleção",
    g("quadroAtual().setas.length === 0 && _qSetaSel.size === 0"),
  );

  /* Teste 9.5 — Toque nos Quadros: arrastar move o cartão; segurar puxa o
     barbante (eventos de ponteiro simulados; MouseEvent serve de PointerEvent) */
  g(
    '(function(){desenhaQuadro();var q=quadroAtual();window._gA=q.nodes.find(function(n){return n.id===window._nA});window._gB=q.nodes.find(function(n){return n.id===window._nB});window._gA.x=0;window._gA.y=0;desenhaQuadro();})()',
  );
  g(
    '(function(){function pe(t,el,x,y){el.dispatchEvent(new MouseEvent(t,{bubbles:true,clientX:x,clientY:y}))}var el=document.querySelector(\'.qnode[data-id="\'+window._nA+\'"] .qtxt\');pe("pointerdown",el,100,100);pe("pointermove",el,140,130);pe("pointerup",el,140,130);})()',
  );
  ok(
    "toque: arrastar o corpo da nota/texto MOVE o cartão (não o quadro)",
    g("window._gA.x === 40 && window._gA.y === 30"),
  );
  g(
    '(function(){function pe(t,el,x,y){el.dispatchEvent(new MouseEvent(t,{bubbles:true,clientX:x,clientY:y}))}var el=document.querySelector(\'.qnode[data-id="\'+window._nA+\'"]\');pe("pointerdown",el,100,100);})()',
  );
  await new Promise((r) => setTimeout(r, 550)); // segurar 450ms sem mover
  ok(
    "toque: segurar num cartão entra no modo de puxar o barbante",
    g("_qArrow !== null && _qArrow.de === window._nA"),
  );
  g(
    '(function(){function pe(t,el,x,y){el.dispatchEvent(new MouseEvent(t,{bubbles:true,clientX:x,clientY:y}))}var elB=document.querySelector(\'.qnode[data-id="\'+window._nB+\'"]\');pe("pointermove",elB,300,50);pe("pointerup",elB,300,50);})()',
  );
  ok(
    "toque: soltar sobre outro cartão cria o barbante (e sai do modo)",
    g(
      "_qArrow === null && quadroAtual().setas.some(function(s){return s.de===window._nA && s.para===window._nB})",
    ),
  );
  g("quadroAtual().setas.length = 0");

  /* Teste 9.6 — Toque nos cartões: 1º toque seleciona, o 2º abre o menu,
     dois toques rápidos editam (e o clique fantasma não fecha a folha) */
  g(
    '(function(){window._tap=function(id){var el=document.querySelector(\'.qnode[data-id="\'+id+\'"]\');function pe(t,x,y){el.dispatchEvent(new MouseEvent(t,{bubbles:true,clientX:x,clientY:y}))}pe("pointerdown",10,10);pe("pointerup",10,10);};_qSelSet=new Set();qMenuCancela();})()',
  );
  g("window._tap(window._nA)");
  await new Promise((r) => setTimeout(r, 400));
  ok(
    "toque no cartão: 1º toque só SELECIONA (não abre menu)",
    g(
      '(function(){return _qSelSet.has(window._nA) && !document.querySelector(".acsheet");})()',
    ),
  );
  g("window._tap(window._nA)");
  await new Promise((r) => setTimeout(r, 400));
  ok(
    "toque no cartão: 2º toque no já selecionado ABRE o menu",
    g('!!document.querySelector(".acsheet")'),
  );
  ok(
    "menu: clique fantasma logo após abrir NÃO fecha a folha (bug do toque)",
    g(
      '(function(){var s=document.querySelector(".acsheet");s.querySelector(".acsheet-veu").dispatchEvent(new MouseEvent("click",{bubbles:true}));return !!document.querySelector(".acsheet");})()',
    ),
  );
  g(
    '(function(){var s=document.querySelector(".acsheet");overlayFechar(s.id);})()',
  );
  g(
    '(function(){var el=document.querySelector(\'.qnode[data-id="\'+window._nA+\'"]\');function pe(t){el.dispatchEvent(new MouseEvent(t,{bubbles:true,clientX:10,clientY:10}))}pe("pointerdown");pe("pointerup");pe("pointerdown");pe("pointerup");})()',
  );
  await new Promise((r) => setTimeout(r, 400));
  ok(
    "toque no cartão: 2 toques rápidos no selecionado EDITAM (sem abrir menu)",
    g(
      '(function(){var ed=document.querySelector(\'.qnode[data-id="\'+window._nA+\'"] .qtxt\');return document.activeElement===ed && !document.querySelector(".acsheet");})()',
    ),
  );
  g("document.activeElement.blur(); _qSelSet=new Set();");

  /* Teste 10 — IA: aplicador + anti-duplicata (sem chamada real; tudo local) */
  g(
    'DADOS.fichas.push({id:"fIA",titulo:"(pendente)",sala:"",grupos:[],personagens:[],conexoes:[],notas:"",pendente:true,fav:false,status:"",paginas:[{imagem:"",original:"",traducao:"",explica:"",rotulo:""}]});',
  );
  g(
    'window.IA.aplicar("fIA",{titulo:"Carta — Teste da IA",paginas:[{transcricao:"Dear staff, the west wing is closed.",traducao:"Caros funcionários, a ala oeste está fechada."}],resumo:"Um aviso sobre a ala oeste.",personagens_existentes:[],personagens_novos:["Novo Persona"],grupo:"",grupo_sugerido:"Avisos"});',
  );
  ok(
    "IA: aplicar preenche a ficha e tira o 'pendente'",
    g(
      '(function(){var f=DADOS.fichas.find(x=>x.id==="fIA");return f.titulo==="Carta — Teste da IA" && f.paginas[0].original.indexOf("west wing")>0 && f.paginas[0].traducao.indexOf("ala oeste")>0 && f.paginas[0].explica.length>0 && f.pendente===false;})()',
    ),
  );
  ok(
    "IA: cria personagem novo e grupo sugerido (aprovados) no catálogo",
    g(
      '(function(){var f=DADOS.fichas.find(x=>x.id==="fIA");return DADOS.personagens.some(p=>p.nome==="Novo Persona") && DADOS.grupos.some(gr=>gr.nome==="Avisos") && f.personagens.indexOf("Novo Persona")>=0 && f.grupos[0]==="Avisos";})()',
    ),
  );
  ok(
    "IA: anti-duplicata acha transcrição igual em OUTRA ficha (e ignora a própria)",
    g(
      '(function(){var d=window.IA.duplicata({paginas:[{transcricao:"  DEAR   staff, the west wing is closed. "}]},"outraFicha");var p=window.IA.duplicata({paginas:[{transcricao:"Dear staff, the west wing is closed."}]},"fIA");return d && d.id==="fIA" && p===null;})()',
    ),
  );

  /* Teste 11 — Diretório de salas compartilhado (sobreposição) */
  // dados com 1 sala já "descoberta" e com notas pessoais + 1 sala fora do diretório
  const dadosDir = {
    salas: [
      { nome: "Entrance Hall", descoberta: true, notas: "minha nota", fatos: ["f1"], descricao: "velha", imagem: "https://wiki/old.png" },
      { nome: "Sala Pessoal", descoberta: true, notas: "só minha", fatos: [] },
    ],
  };
  const dir = [
    {
      nome: "Entrance Hall", num: 2, nome_en: "Entrance Hall", nome_pt: "Hall de Entrada",
      descricao_en: "Past the steps...", descricao_pt: "Passados os degraus...",
      raridade_en: "n/a", raridade_pt: "n/d", custo_en: "None", custo_pt: "Nenhum",
      tipo_en: "Permanent, Blueprint", tipo_pt: "Permanente, Blueprint",
      categorias: ["Blueprint"], diretorio: "Rooms 001-012",
      imagem: "https://sb.co/storage/v1/object/public/salas/x/Entrance%20Hall.png",
      fonte: "https://wiki/Entrance_Hall",
    },
    {
      nome: "Attic", num: 11, nome_en: "Attic", nome_pt: "Sótão",
      descricao_en: "High above...", descricao_pt: "Bem no alto...",
      raridade_en: "Rare", raridade_pt: "Raro", custo_en: "3 gems", custo_pt: "3 gemas",
      tipo_en: "Blueprint", tipo_pt: "Blueprint", categorias: ["Blueprint"],
      diretorio: "Rooms 001-012", imagem: "https://sb.co/storage/v1/object/public/salas/x/Attic.png",
      fonte: "https://wiki/Attic",
    },
  ];
  g("window.__d = " + JSON.stringify(dadosDir) + "; window.__dir = " + JSON.stringify(dir) + ";");
  g("window.NUVEM.sobreporDiretorioSalas(window.__d, window.__dir)");
  ok(
    "diretório: sobrepõe os campos do jogo (descrição PT, imagem do Supabase, EN/PT)",
    g('(function(){var s=window.__d.salas.find(x=>x.nome==="Entrance Hall");return s.descricao==="Passados os degraus..." && s.imagem.indexOf("/storage/v1/object/public/salas/")>0 && s.descricao_en==="Past the steps..." && s.nome_pt==="Hall de Entrada" && s.custo_pt==="Nenhum";})()'),
  );
  ok(
    "diretório: PRESERVA o que é pessoal (descoberta, notas, fatos)",
    g('(function(){var s=window.__d.salas.find(x=>x.nome==="Entrance Hall");return s.descoberta===true && s.notas==="minha nota" && s.fatos.length===1;})()'),
  );
  ok(
    "diretório: adiciona sala que faltava (Attic), NÃO descoberta",
    g('(function(){var s=window.__d.salas.find(x=>x.nome==="Attic");return !!s && s.descoberta===false && s.descricao==="Bem no alto..." && s.num===11;})()'),
  );
  ok(
    "diretório: NÃO mexe em sala fora do diretório (Sala Pessoal intacta)",
    g('(function(){var s=window.__d.salas.find(x=>x.nome==="Sala Pessoal");return s.descoberta===true && s.notas==="só minha" && s.imagem===undefined;})()'),
  );
  ok(
    "diretório: busca vazia não altera nada (degradação graciosa)",
    g('(function(){var antes=JSON.stringify(window.__d);window.NUVEM.sobreporDiretorioSalas(window.__d, []);return JSON.stringify(window.__d)===antes;})()'),
  );

  /* Teste 12 — Dossiê da sala: dados do jogo + edição inline, sem editar/excluir/fonte */
  g('DADOS.salas.push({nome:"Sala UI Teste",descoberta:true,num:7,categorias:["Blueprint"],raridade_pt:"Raro",custo_pt:"Nenhum (sem custo em gemas)",tipo_pt:"Permanente, Blueprint",descricao_pt:"desc em portugues",descricao_en:"desc in english",fonte:"https://blueprince.wiki.gg/wiki/x",fatos:[],notas:""});');
  g('abrirEntidade("sala","Sala UI Teste")');
  const dh = () => g('document.getElementById("drawer").innerHTML');
  ok(
    "dossiê sala: características em grade (sala-caract)",
    g('document.getElementById("drawer").innerHTML.indexOf("sala-caract")>0'),
  );
  ok(
    "dossiê sala: fatos e notas editáveis na 1ª tela",
    g('!!document.getElementById("sala-fatos") && !!document.getElementById("sala-notas")'),
  );
  ok(
    "dossiê sala: SEM botão Editar, SEM Excluir, SEM Fonte/wiki",
    g('(function(){var h=document.getElementById("drawer").innerHTML;return h.indexOf("Editar dossiê")<0 && h.indexOf("Excluir")<0 && h.indexOf(">Fonte<")<0 && h.indexOf("wiki.gg")<0;})()'),
  );
  g('document.getElementById("sala-notas").value="minha anotacao"; document.getElementById("sala-fatos").value="fato 1\\nfato 2"; salaEditInline();');
  ok(
    "dossiê sala: escrever fatos/notas inline salva na sala",
    g('(function(){var s=acharEnt(DADOS.salas,"Sala UI Teste");return s.notas==="minha anotacao" && s.fatos.length===2 && s.fatos[0]==="fato 1";})()'),
  );
  ok(
    "dossiê sala: excluir sala é bloqueado",
    g('(function(){_entAtual={kind:"sala",nome:"Sala UI Teste"};excluirEntPainel();return !!acharEnt(DADOS.salas,"Sala UI Teste");})()'),
  );

  /* Teste 13 — Gerenciar: salas não podem ser renomeadas nem excluídas */
  g('buildLista("g-salas",[{nome:"Attic",descoberta:true}],"sala")');
  g('buildLista("g-pessoas",[{nome:"Fulano"}],"pessoa")');
  ok(
    "gerenciar sala: NÃO tem botão de excluir (🗑)",
    g('document.querySelector("#g-salas .gdel") === null'),
  );
  ok(
    "gerenciar sala: nome é somente-leitura (não renomeia)",
    g('(function(){var i=document.querySelector("#g-salas .ginput");return !!i && i.readOnly===true;})()'),
  );
  ok(
    "gerenciar sala: mantém o 📋 (abrir dossiê)",
    g('document.querySelector("#g-salas .gdos") !== null'),
  );
  ok(
    "gerenciar pessoa: continua com excluir e renomear (não afetado)",
    g('document.querySelector("#g-pessoas .gdel") !== null && document.querySelector("#g-pessoas .ginput").readOnly===false'),
  );
  ok(
    "excluirEnt('sala',...) é bloqueado na raiz",
    g('(function(){DADOS.salas.push({nome:"Zzz Sala",descoberta:true});excluirEnt("sala","Zzz Sala");return !!acharEnt(DADOS.salas,"Zzz Sala");})()'),
  );

  /* Teste 14 — Aba Mundo NÃO mostra mais salas (só personagens e grupos) */
  g('DADOS.personagens.push({nome:"Persona Mundo",imagem:"",descricao:"",fatos:[],notas:""});');
  g('DADOS.salas.push({nome:"Sala No Mundo",descoberta:true,descricao:"x"});');
  g('setView("mundo"); renderMundo();');
  ok(
    "mundo: NÃO renderiza seção/nome de sala",
    g('(function(){var h=document.getElementById("mundo").innerHTML;return h.indexOf("Salas")<0 && h.indexOf("Sala No Mundo")<0;})()'),
  );
  ok(
    "mundo: ainda mostra Personagens e Grupos",
    g('(function(){var h=document.getElementById("mundo").innerHTML;return h.indexOf("Personagens")>0 && h.indexOf("Grupos")>0 && h.indexOf("Persona Mundo")>0;})()'),
  );

  /* Teste 15 — Miniatura das imagens de sala (transformação do Supabase) */
  ok(
    "thumb: vira render/image quadrada com resize=cover (recorte proporcional, sem distorcer)",
    g('(function(){var u="https://x.supabase.co/storage/v1/object/public/salas/Rooms%20001-012/The%20Foundation.png";var t=thumbSala(u,240);return t.indexOf("/storage/v1/render/image/public/")>0 && t.indexOf("width=240")>0 && t.indexOf("height=240")>0 && t.indexOf("resize=cover")>0 && t.indexOf("object/public")<0;})()'),
  );
  ok(
    "thumb: URL que não é do Storage público fica intacta (data:/web)",
    g('thumbSala("data:image/png;base64,AAA",240)==="data:image/png;base64,AAA" && thumbSala("https://site.com/x.png",240)==="https://site.com/x.png"'),
  );
  ok(
    "preload: precarregarThumbsSalas roda sem erro (pré-carrega miniaturas)",
    g('(function(){try{precarregarThumbsSalas();return true;}catch(e){return false;}})()'),
  );

  /* Teste 16 — Mapa: legenda atualizada + menu "Como usar" acima dela */
  g("buildLegend()");
  ok(
    "legenda: sem itens do sistema antigo (Coleção / cor = tipo)",
    g('(function(){var h=document.getElementById("legend").innerHTML;return h.indexOf("Coleção")<0 && h.indexOf("tipo")<0;})()'),
  );
  ok(
    "legenda: tem Ficha (cor do grupo) e fio manual",
    g('(function(){var h=document.getElementById("legend").innerHTML;return h.indexOf("Ficha (cor do grupo)")>=0 && h.indexOf("Fio manual")>=0 && h.indexOf("Ligação automática")>=0;})()'),
  );
  ok(
    "como usar: menu existe acima da legenda (mesmo canto) e aberto por padrão",
    g('(function(){var c=document.querySelector(".mapcorner");var mh=document.getElementById("maphelp");return !!c && !!mh && c.children[0]===mh && mh.innerHTML.indexOf("mh-body")>0 && mh.innerHTML.indexOf("Shift+1")>0;})()'),
  );
  ok(
    "como usar: recolhe e expande (toggle com memória)",
    g('(function(){toggleMapHelp();var fechou=document.getElementById("maphelp").innerHTML.indexOf("mh-body")<0;toggleMapHelp();var abriu=document.getElementById("maphelp").innerHTML.indexOf("mh-body")>0;return fechou && abriu;})()'),
  );
  ok(
    "mapa: a barra antiga de dica (hint) sumiu do HTML",
    g('document.querySelector("#mapa .hint") === null'),
  );

  /* Teste 17 — Upload em massa: abas, aplicar-a-todas, salvar lote, sem-cadastro */
  const antesLote = g("DADOS.fichas.length");
  g('abrirCadastroLote([{imagem:"nuvem:u/a.jpg",preview:"pa"},{imagem:"nuvem:u/b.jpg",preview:"pb"},{imagem:"nuvem:u/c.jpg",preview:"pc"}])');
  ok(
    "lote: modal abre com 1 aba por imagem (3)",
    g('document.querySelectorAll("#quickAdd .qtab-lote").length === 3'),
  );
  g('document.getElementById("ed-q-titulo").value = "Titulo da 1a";');
  g("loteTrocaAba(1)");
  ok(
    "lote: trocar de aba mostra o formulário vazio da aba 2",
    g('document.getElementById("ed-q-titulo").value === ""'),
  );
  g("loteTrocaAba(0)");
  ok(
    "lote: voltar para a aba 1 preserva o que foi digitado",
    g('document.getElementById("ed-q-titulo").value === "Titulo da 1a"'),
  );
  g('document.getElementById("ed-q-sala").value = "Sala UI Teste"; loteAplicarSala();');
  ok(
    "lote: 'aplicar a todas' espalha a sala pelas 3 fichas",
    g('_quickLote.every(it => it.ficha.sala === "Sala UI Teste")'),
  );
  g("salvarLote()");
  ok(
    "lote: concluir salva as 3 (pendentes, sala resolvida, título automático nas vazias)",
    g(
      `(function(){var novas=DADOS.fichas.slice(${antesLote});if(novas.length!==3)return false;return novas.every(f=>f.pendente===true && f.sala==="Sala UI Teste") && novas[0].titulo==="Titulo da 1a" && novas[1].titulo.indexOf("Pista importada")===0 && novas.every(f=>f.paginas.length===1 && f.paginas[0].imagem.indexOf("nuvem:")===0);})()`,
    ),
  );
  ok(
    "lote: modal fechou e estado zerou após concluir",
    g('_quickLote === null && !document.getElementById("quickAdd").classList.contains("open")'),
  );
  const antesSkip = g("DADOS.fichas.length");
  g('_loteItens=[{imagem:"nuvem:u/d.jpg",preview:"pd"},{imagem:"nuvem:u/e.jpg",preview:"pe"}]; loteSemCadastro();');
  ok(
    "lote: 'enviar sem cadastrar' cria N fichas pendentes com título automático",
    g(
      `(function(){var novas=DADOS.fichas.slice(${antesSkip});return novas.length===2 && novas.every(f=>f.pendente===true && f.titulo.indexOf("Pista importada")===0 && f.sala==="");})()`,
    ),
  );
  ok(
    "lote: ids das fichas novas são únicos no catálogo",
    g("(function(){var ids=DADOS.fichas.map(f=>f.id);return new Set(ids).size===ids.length;})()"),
  );

  /* Teste 18 — IA em massa: fila 1-a-1, duplicata pulada, erro não trava */
  g(`
    DADOS.fichas.push(
      {id:"fL1",titulo:"",sala:"",grupos:[],personagens:[],conexoes:[],notas:"",pendente:true,fav:false,status:"",paginas:[{imagem:"data:image/png;base64,AAA",original:"",traducao:"",explica:"",rotulo:""}]},
      {id:"fL2",titulo:"",sala:"",grupos:[],personagens:[],conexoes:[],notas:"",pendente:true,fav:false,status:"",paginas:[{imagem:"data:image/png;base64,BBB",original:"",traducao:"",explica:"",rotulo:""}]},
      {id:"fL3",titulo:"",sala:"",grupos:[],personagens:[],conexoes:[],notas:"",pendente:true,fav:false,status:"",paginas:[{imagem:"data:image/png;base64,CCC",original:"",traducao:"",explica:"",rotulo:""}]}
    );
    window.__chamarOrig = window.IA.chamar;
    window.__nCham = 0;
    // 1ª chamada: ok (com personagem/grupo NOVOS p/ testar criação em massa)
    // 2ª: transcrição igual à da ficha fIA (duplicata) -> deve ser pulada
    // 3ª e 4ª (retry): erro de rede -> vai para erros e a fila continua
    window.IA.chamar = async function(payload){
      window.__nCham++;
      if (window.__nCham === 1) return { resultado: { titulo:"Lote OK 1", paginas:[{transcricao:"Unique text for batch test number one alpha.", traducao:"Texto único do teste de lote número um alfa."}], resumo:"Resumo do lote.", personagens_existentes:[], personagens_novos:["Persona do Lote"], grupo:"", grupo_sugerido:"Grupo do Lote", observacoes:"" }, uso:null, modelo:"mock" };
      if (window.__nCham === 2) return { resultado: { titulo:"Dup", paginas:[{transcricao:"Dear staff, the west wing is closed.", traducao:"x"}], resumo:"", personagens_existentes:[], personagens_novos:[], grupo:"", grupo_sugerido:"", observacoes:"" }, uso:null, modelo:"mock" };
      throw new Error("rede caiu (simulado)");
    };
  `);
  g('window.IA.processarLote(["fL1","fL2","fL3"])');
  ok(
    "lote IA: confirmação é modal do SISTEMA (não confirm nativo), com nº e tempo",
    g('(function(){var m=document.getElementById("ialoteconf");return !!m && m.classList.contains("open") && m.innerHTML.indexOf("3 pista(s)")>0 && m.innerHTML.indexOf("Tempo estimado")>0 && m.innerHTML.indexOf("Cancelar")>0;})()'),
  );
  await g("window.IA.loteIniciar()");
  ok(
    "lote IA: iniciar fecha o modal de confirmação",
    g('!document.getElementById("ialoteconf").classList.contains("open")'),
  );
  ok(
    "lote IA: cada pista = 1 chamada própria (4 chamadas: 1 ok, 1 dup, 2 do retry)",
    g("window.__nCham === 4"),
  );
  ok(
    "lote IA: aplicada preenche a ficha e tira o ⏳ (e as outras continuam pendentes)",
    g('(function(){var a=DADOS.fichas.find(f=>f.id==="fL1"),b=DADOS.fichas.find(f=>f.id==="fL2"),c=DADOS.fichas.find(f=>f.id==="fL3");return a.pendente===false && a.titulo==="Lote OK 1" && a.paginas[0].original.indexOf("Unique text")===0 && b.pendente===true && c.pendente===true;})()'),
  );
  ok(
    "lote IA: cria personagem e grupo novos automaticamente (aprovado p/ massa)",
    g('DADOS.personagens.some(p=>p.nome==="Persona do Lote") && DADOS.grupos.some(x=>x.nome==="Grupo do Lote") && DADOS.fichas.find(f=>f.id==="fL1").grupos[0]==="Grupo do Lote"'),
  );
  ok(
    "lote IA: duplicata é PULADA (não aplica) e erro vai para a lista sem travar a fila",
    g('(function(){var L=window.IA.loteEstado();return L.feitas===3 && L.ok===1 && L.puladas.length===1 && L.puladas[0].id==="fL2" && L.erros.length===1 && L.erros[0].id==="fL3";})()'),
  );
  ok(
    "lote IA: painel final mostra o resumo e a lista de puladas/erros",
    g('(function(){var p=document.getElementById("ialote");return !!p && p.innerHTML.indexOf("concluído")>0 && p.innerHTML.indexOf("fL2")>0 && p.innerHTML.indexOf("fL3")>0;})()'),
  );
  ok(
    "lote IA: botão da topbar aparece com a contagem de pendentes",
    g('(function(){atualizarBtnIaLote();var b=document.getElementById("btnIaLote");return !!b && b.style.display!=="none" && b.textContent.indexOf("Processar pendentes (")>=0;})()'),
  );
  g("window.IA.chamar = window.__chamarOrig;");
  ok(
    "topbar: botão ✨ está na topbar e os 4 filtros (⚠⏳🧩⭐) foram para o painel de filtros",
    g('(function(){var top=document.querySelector(".topbar")||document.body;var ia=document.getElementById("btnIaLote");var painel=document.getElementById("filtrosPanel");return !!ia && !painel.contains(ia) && ["btnInc","btnPend","btnOrfas","btnFav"].every(id=>painel.contains(document.getElementById(id)));})()'),
  );
  ok(
    "filtros movidos continuam funcionando (toggle pendentes marca .on)",
    g('(function(){togglePendentes();var on=document.getElementById("btnPend").classList.contains("on");togglePendentes();return on;})()'),
  );

  /* Teste 18.5 — Folha de filtros no compacto: fundo escurecido fecha ao
     toque e arrastar a alça para baixo fecha (ehCompacto forçado) */
  g("window._ehcOrig = ehCompacto; ehCompacto = function(){ return true; };");
  g("toggleFiltros()");
  await new Promise((r) => setTimeout(r, 50)); // rAF do fundo
  ok(
    "folha de filtros: abre com fundo escurecido (sheet-fundo .on)",
    g(
      '(function(){var pn=document.getElementById("filtrosPanel");var bd=document.getElementById("sheetFundo");return pn.classList.contains("open") && !!bd && bd.classList.contains("on");})()',
    ),
  );
  g('document.getElementById("sheetFundo").onclick()');
  await new Promise((r) => setTimeout(r, 300)); // animação de descida (230ms)
  ok(
    "folha de filtros: tocar no fundo fecha (descendo, e o fundo apaga)",
    g(
      '(function(){var pn=document.getElementById("filtrosPanel");var bd=document.getElementById("sheetFundo");return !pn.classList.contains("open") && !bd.classList.contains("on") && pn.style.transform==="";})()',
    ),
  );
  g("toggleFiltros()");
  g(
    '(function(){function pe(t,el,y){el.dispatchEvent(new MouseEvent(t,{bubbles:true,clientY:y}))}var al=document.querySelector("#filtrosPanel .sheet-grip");pe("pointerdown",al,100);pe("pointermove",al,320);pe("pointerup",al,320);})()',
  );
  await new Promise((r) => setTimeout(r, 300));
  ok(
    "folha de filtros: arrastar a alça para baixo fecha a folha",
    g('!document.getElementById("filtrosPanel").classList.contains("open")'),
  );
  g("ehCompacto = window._ehcOrig;");

  /* Teste 19 — IA: dossiês de personagens (elegibilidade + fila + escrita segura) */
  g(`
    DADOS.personagens.push({nome:"Dossie Persona",imagem:"",descricao:"manual antiga",fatos:["fato do usuário"],notas:"nota minha",aliases:["D.P."]});
    DADOS.fichas.push(
      {id:"fP1",titulo:"Carta do teste",sala:"",grupos:[],personagens:["Dossie Persona"],conexoes:[],notas:"",pendente:false,fav:false,status:"",paginas:[{imagem:"",original:"Letter written by Dossie Persona about the mine.",traducao:"Carta escrita por Dossie Persona sobre a mina.",explica:"Uma carta dele.",rotulo:""}]},
      {id:"fP2",titulo:"Jornal do teste",sala:"",grupos:[],personagens:["D.P."],conexoes:[],notas:"",pendente:false,fav:false,status:"",paginas:[{imagem:"",original:"Newspaper: Dossie Persona disappeared on May 3rd.",traducao:"Jornal: Dossie Persona desapareceu em 3 de maio.",explica:"Notícia do sumiço.",rotulo:""}]}
    );
  `);
  ok(
    "personas: elegível quando nunca processado (e resolve apelido D.P. -> mesmas fichas)",
    g('(function(){var e=window.IA.personasElegiveis().find(x=>x.nome==="Dossie Persona");return !!e && e.fichas.length===2 && e.fichas.indexOf("fP1")>=0 && e.fichas.indexOf("fP2")>=0;})()'),
  );
  g(`
    window.__chamarOrig2 = window.IA.chamar;
    window.__payloadPersona = null;
    window.IA.chamar = async function(payload){
      window.__payloadPersona = payload;
      return { resultado: { descricao: "Dossie Persona escreveu uma carta sobre a mina e, segundo o jornal, desapareceu em 3 de maio.", observacoes: "" }, uso:null, modelo:"mock" };
    };
    window.IA.personasProcessar(["Dossie Persona"]);
  `);
  ok(
    "personas: confirmação em modal do sistema (nº + aviso de Descrição)",
    g('(function(){var m=document.getElementById("ialoteconf");return !!m && m.classList.contains("open") && m.innerHTML.indexOf("1 personagem(ns)")>0 && m.innerHTML.indexOf("Descrição")>0;})()'),
  );
  await g("window.IA.personaIniciar()");
  ok(
    "personas: payload correto (modo personagem, 2 pistas com texto, apelidos)",
    g('(function(){var p=window.__payloadPersona;return !!p && p.modo==="personagem" && p.personagem.nome==="Dossie Persona" && p.personagem.aliases[0]==="D.P." && p.pistas.length===2 && p.pistas[0].original.indexOf("Letter written")===0;})()'),
  );
  ok(
    "personas: descrição escrita; fatos/notas do usuário INTACTOS; ia_desc registrado",
    g('(function(){var p=DADOS.personagens.find(x=>x.nome==="Dossie Persona");return p.descricao.indexOf("desapareceu em 3 de maio")>0 && p.fatos[0]==="fato do usuário" && p.notas==="nota minha" && p.ia_desc && p.ia_desc.fichas.length===2;})()'),
  );
  ok(
    "personas: depois de processado deixa de ser elegível…",
    g('window.IA.personasElegiveis().every(x=>x.nome!=="Dossie Persona")'),
  );
  g('DADOS.fichas.push({id:"fP3",titulo:"Nova pista",sala:"",grupos:[],personagens:["Dossie Persona"],conexoes:[],notas:"",pendente:false,fav:false,status:"",paginas:[{imagem:"",original:"New clue about Dossie Persona.",traducao:"Nova pista sobre Dossie Persona.",explica:"",rotulo:""}]});');
  ok(
    "personas: …e volta a ser elegível quando surge pista NOVA citando (regra 2)",
    g('(function(){var e=window.IA.personasElegiveis().find(x=>x.nome==="Dossie Persona");return !!e && e.fichas.length===3;})()'),
  );
  ok(
    "personas: personagem sem citações nunca é elegível",
    g('(function(){DADOS.personagens.push({nome:"Sem Citacao",imagem:"",descricao:"",fatos:[],notas:"",aliases:[]});return window.IA.personasElegiveis().every(x=>x.nome!=="Sem Citacao");})()'),
  );
  g("window.IA.chamar = window.__chamarOrig2;");

  ok("zero erros de runtime", erros.length === 0);
  if (erros.length) console.log("Erros:", erros.slice(0, 5));

  console.log(falhas === 0 ? "\n=== ONLINE OK ===" : `\n=== ${falhas} FALHA(S) ===`);
  process.exit(falhas === 0 ? 0 : 1);
})();

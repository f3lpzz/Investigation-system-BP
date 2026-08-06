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
  // Storage: o app resolve "nuvem:caminho" em URL assinada ao desenhar
  // imagens (mapa, dossiês). Sem isto, abrir o mapa quebrava no teste.
  storage: {
    from() {
      return {
        async createSignedUrl(caminho) {
          return {
            data: { signedUrl: "https://sb.co/assinada/" + caminho },
            error: null,
          };
        },
        async upload() {
          return { data: {}, error: null };
        },
        async remove() {
          return { data: {}, error: null };
        },
        getPublicUrl(caminho) {
          return { data: { publicUrl: "https://sb.co/publica/" + caminho } };
        },
      };
    },
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

  /* Teste 8.4 — Câmera do quadro: o mundo é que se move (o fundo é liso
     e parado; nada de textura acompanhando a câmera) */
  g(
    '(function(){var q=quadroAtual();q.cam.x=-420;q.cam.y=-260;q.cam.s=2;aplicaCam();})()',
  );
  ok(
    "câmera do quadro: o mundo recebe o transform do arraste e do zoom",
    g(
      '(function(){var t=document.getElementById("qworld").style.transform;return t.indexOf("translate(-420px,-260px)")>=0 && t.indexOf("scale(2)")>0;})()',
    ),
  );
  ok(
    "fundo do quadro: continua liso (sem imagem/textura no canvas)",
    g(
      '(function(){var cv=document.getElementById("qcanvas");return !cv.style.backgroundImage && !cv.style.backgroundSize;})()',
    ),
  );
  g(
    '(function(){var q=quadroAtual();q.cam.x=40;q.cam.y=40;q.cam.s=1;aplicaCam();})()',
  );

  /* Teste 8.5 — Chip do quadro: é o seletor único (celular e desktop) */
  ok(
    "quadros: o chip mostra o nome do quadro aberto e a contagem do que tem nele",
    g(
      '(function(){var c=document.querySelector(".qchip");if(!c)return false;var n=c.querySelector(".qchip-n"),m=c.querySelector(".qchip-m");var q=quadroAtual();return !!n && n.textContent===q.nome && !!m && m.textContent.indexOf((q.nodes||[]).length+" ")===0 && m.textContent.indexOf("barbante")>0;})()',
    ),
  );
  g("qEscolherQuadro()");
  ok(
    "quadros: o seletor abre a lista com todos + '＋ Novo quadro'",
    g(
      '(function(){var b=document.querySelectorAll(".acsheet .acit[data-i]");return b.length===DADOS.quadros.length+1 && b[0].textContent.indexOf(DADOS.quadros[0].nome)===0 && b[b.length-1].textContent.indexOf("Novo quadro")>=0;})()',
    ),
  );
  g('(function(){var s=document.querySelector(".acsheet");overlayFechar(s.id);})()');

  /* Teste 8.6 — Peças flutuantes do quadro (dock, dica, zoom, atalhos) */
  ok(
    "quadros: a dock tem as 6 ferramentas com a tecla impressa, e a ativa é a do _qTool",
    g(
      '(function(){var b=document.querySelectorAll(".qcanvas .qdockbtn");if(b.length!==6)return false;var ids=[].map.call(b,function(x){return x.getAttribute("data-tool")}).join(",");var k=[].every.call(b,function(x){return !!x.querySelector(".k")});var at=document.querySelector(".qdockbtn.active");return ids==="select,hand,ficha,nota,texto,seta" && k && !!at && at.getAttribute("data-tool")===_qTool;})()',
    ),
  );
  ok(
    "quadros: trocar de ferramenta reescreve a dica e marca o canvas (o CSS acende os alfinetes)",
    g(
      '(function(){qSetTool("seta");var h=document.getElementById("qhint"),cv=document.getElementById("qcanvas");var okS=h.querySelector(".ferr").textContent==="Barbante" && h.querySelector(".tx").textContent===QDICAS.seta && cv.dataset.qtool==="seta";qSetTool("select");var okV=h.querySelector(".ferr").textContent==="Selecionar" && cv.dataset.qtool==="select";return okS && okV;})()',
    ),
  );
  ok(
    "quadros: a etiqueta de zoom acompanha a câmera (quem manda é o aplicaCam)",
    g(
      '(function(){var q=quadroAtual();q.cam.s=1;aplicaCam();var a=document.getElementById("qzoomv").textContent;qZoomPasso(1.2);var b=document.getElementById("qzoomv").textContent;var c=Math.round(q.cam.s*100)+"%";q.cam.x=40;q.cam.y=40;q.cam.s=1;aplicaCam();return a==="100%" && b===c && b!=="100%";})()',
    ),
  );
  /* Teste 8.7 — Seleção: o que o clique, o Shift e o laço marcam.
     A nota é o caso que quebrava: clicar nela ia direto para a escrita,
     então ela nunca ficava marcada e Del/Ctrl+D/Shift não pegavam nela. */
  ok(
    // O jsdom NÃO dispara o ondblclick inline (o atributo está no cartão, mas
    // o evento sintético não o executa): aqui se prova que 1 clique marca sem
    // focar e que o atributo aponta para o qFocarTexto, e se chama a função
    // direto. O gesto de 2 cliques abrindo a escrita foi conferido no
    // navegador real pela vista teorias-selecao do servidor-visual.
    "quadros: 1 clique numa NOTA marca o cartão sem entrar na escrita (2 cliques é que escrevem)",
    g(
      '(function(){var q=quadroAtual();var n=qNovoTextoEm(600,300,"nota");desenhaQuadro();var el=nodeEl(n.id),ed=el.querySelector(".qtxt");_qSelSet=new Set();var r=ed.getBoundingClientRect();ed.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:Math.round(r.left+20),clientY:Math.round(r.top+10),button:0}));var marcou=_qSelSet.has(n.id),semFoco=document.activeElement!==ed;qMouseUpGlobal();var fiado=(el.getAttribute("ondblclick")||"").indexOf("qFocarTexto")===0;qFocarTexto(n.id);var escreve=document.activeElement===ed;ed.blur();qDelNode(n.id);return marcou && semFoco && fiado && escreve;})()',
    ),
  );
  ok(
    // Pelo caminho de verdade: CLICAR na nota e então apertar Delete. Marcar
    // _qSelSet na mão passaria mesmo com o defeito — o que quebrava era o
    // clique não marcar nada.
    "quadros: clicar numa nota e apertar Delete apaga a nota",
    g(
      '(function(){var q=quadroAtual();var n=qNovoTextoEm(620,320,"nota");desenhaQuadro();var ed=nodeEl(n.id).querySelector(".qtxt"),r=ed.getBoundingClientRect();_qSelSet=new Set();ed.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:Math.round(r.left+20),clientY:Math.round(r.top+10),button:0}));qMouseUpGlobal();var antes=q.nodes.length;(document.activeElement||document.body).dispatchEvent(new KeyboardEvent("keydown",{bubbles:true,code:"Delete",key:"Delete"}));return q.nodes.length===antes-1 && !q.nodes.some(function(x){return x.id===n.id});})()',
    ),
  );
  ok(
    "quadros: Shift no clique soma à seleção (e tira quem já estava)",
    g(
      '(function(){var q=quadroAtual();var a=qNovoTextoEm(100,600,"nota"),b=qNovoTextoEm(400,600,"nota");desenhaQuadro();var elA=nodeEl(a.id),elB=nodeEl(b.id);_qSelSet=new Set();var rA=elA.getBoundingClientRect(),rB=elB.getBoundingClientRect();elA.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:Math.round(rA.left+20),clientY:Math.round(rA.top+10),button:0}));qMouseUpGlobal();elB.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:Math.round(rB.left+20),clientY:Math.round(rB.top+10),button:0,shiftKey:true}));qMouseUpGlobal();var somou=_qSelSet.size===2;elB.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:Math.round(rB.left+20),clientY:Math.round(rB.top+10),button:0,shiftKey:true}));qMouseUpGlobal();var tirou=_qSelSet.size===1 && _qSelSet.has(a.id);_qSelSet=new Set();qDelNode(a.id);qDelNode(b.id);return somou && tirou;})()',
    ),
  );
  ok(
    "quadros: o laço pega quem só ENCOSTA nele (não exige o centro do cartão)",
    g(
      '(function(){var q=quadroAtual();var n=qNovoTextoEm(200,700,"nota");desenhaQuadro();var el=nodeEl(n.id),r=el.getBoundingClientRect();var cv=document.getElementById("qcanvas");_qSelSet=new Set();' +
        // laço que cobre só ~10px da quina superior esquerda do cartão
        'cv.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:Math.round(r.left-40),clientY:Math.round(r.top-40),button:0}));' +
        'cv.dispatchEvent(new MouseEvent("mousemove",{bubbles:true,clientX:Math.round(r.left+10),clientY:Math.round(r.top+10)}));' +
        'var encostou=_qSelSet.has(n.id);qMouseUpGlobal();' +
        // laço que passa LONGE não pode pegar
        '_qSelSet=new Set();cv.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:Math.round(r.left-300),clientY:Math.round(r.top-300),button:0}));' +
        'cv.dispatchEvent(new MouseEvent("mousemove",{bubbles:true,clientX:Math.round(r.left-200),clientY:Math.round(r.top-200)}));' +
        'var longe=_qSelSet.has(n.id);qMouseUpGlobal();_qSelSet=new Set();qDelNode(n.id);return encostou && !longe;})()',
    ),
  );
  ok(
    "quadros: Esc sai da escrita e deixa o cartão marcado (o teclado do quadro volta a valer)",
    g(
      '(function(){var n=qNovoTextoEm(640,340,"nota");desenhaQuadro();var ed=nodeEl(n.id).querySelector(".qtxt");ed.focus();_qSelSet=new Set();ed.dispatchEvent(new KeyboardEvent("keydown",{bubbles:true,code:"Escape",key:"Escape"}));var saiu=document.activeElement!==ed,marcou=_qSelSet.has(n.id);_qSelSet=new Set();qDelNode(n.id);return saiu && marcou;})()',
    ),
  );
  ok(
    "quadros: o ✕ e o 🎨 saíram do papel dos cartões (as ações moram na barra da seleção)",
    g(
      '(function(){var n=qNovoTextoEm(660,360,"nota");desenhaQuadro();var semX=!document.querySelector(".qnode .qdel") && !document.querySelector(".qnode .qcor");qDelNode(n.id);return semX && document.querySelectorAll(".qnode").length>=0;})()',
    ),
  );
  ok(
    "quadros: o painel de atalhos também fecha ao clicar fora (padrão dos painéis da aba)",
    g(
      '(function(){qAtalhos(true);var ab=document.getElementById("qatalhos").classList.contains("open");document.getElementById("qcanvas").dispatchEvent(new MouseEvent("click",{bubbles:true}));var fe=!document.getElementById("qatalhos").classList.contains("open");return ab && fe;})()',
    ),
  );
  ok(
    "quadros: clicar fora do cartão solta o editor (senão as teclas de ferramenta viram texto)",
    g(
      '(function(){var n=qNovoTextoEm(160,160,"nota");var ed=document.querySelector(\'.qnode[data-id="\'+n.id+\'"] .qtxt\');ed.focus();var dentro=document.activeElement===ed;document.getElementById("qcanvas").dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:900,clientY:600,button:0}));var saiu=document.activeElement!==ed;ed.focus();ed.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,button:0}));var ficou=document.activeElement===ed;ed.blur();qDelNode(n.id);return dentro && saiu && ficou;})()',
    ),
  );
  ok(
    // O toque no chip (onclick inline) não roda no jsdom: aqui só se prova
    // que o clique NO chip não é confundido com "clique fora". O ciclo
    // inteiro (abre/fora/reabre/alterna) foi conferido no navegador real
    // pela vista teorias-pop-fora do servidor-visual.
    "quadros: o painel de quadros fecha ao clicar fora, e o clique no chip não conta como fora",
    g(
      '(function(){var chip=document.querySelector(".qchip");qPop(true);var abriu=document.getElementById("qpop").classList.contains("open");document.getElementById("qcanvas").dispatchEvent(new MouseEvent("click",{bubbles:true}));var fechou=!document.getElementById("qpop").classList.contains("open");qPop(true);chip.dispatchEvent(new MouseEvent("click",{bubbles:true}));var segue=document.getElementById("qpop").classList.contains("open");qPop(false);return abriu && fechou && segue;})()',
    ),
  );
  ok(
    "quadros: o painel de atalhos abre no botão e fecha pelo Esc (pilha de overlays)",
    g(
      '(function(){qAtalhos(true);var ab=document.getElementById("qatalhos").classList.contains("open");overlayFecharTopo();var fe=!document.getElementById("qatalhos").classList.contains("open");return ab && fe;})()',
    ),
  );
  ok(
    "quadros: a contagem do chip não envelhece quando um item entra (desenhaQuadro atualiza)",
    g(
      '(function(){var q=quadroAtual();var antes=document.querySelector(".qchip-m").textContent;q.nodes.push({id:"tX",tipo:"texto",texto:"teste",x:10,y:10,w:200});desenhaQuadro();var dep=document.querySelector(".qchip-m").textContent;q.nodes=q.nodes.filter(function(n){return n.id!=="tX"});desenhaQuadro();var volta=document.querySelector(".qchip-m").textContent;return dep!==antes && dep.indexOf(q.nodes.length+1+" ")===0 && volta===antes;})()',
    ),
  );

  /* Teste 8.8 — As MESMAS regras fora dos Quadros (Mapa e Grade).
     Estes defeitos eram irmãos dos da aba Quadros: laço que exigia o
     centro, Shift que não somava e painel que não fechava ao clicar fora. */
  /* Os testes do Mapa entram e saem da vista sozinhos, e SEMEIAM dois pontos:
     neste ponto do arquivo o catálogo da nuvem falsa ainda está vazio, então
     o grafo não tem nada para selecionar. Ao sair, tudo volta como estava. */
  const noMapa = (corpo) =>
    g(
      '(function(){var _v=state.view,_n=nodes;setView("mapa");render();' +
        'nodes=[{id:"mA",x:120,y:120,r:9,cor:"#c9a35c",kind:"ficha",label:"A"},' +
        '{id:"mB",x:320,y:220,r:9,cor:"#c9a35c",kind:"ficha",label:"B"}];' +
        // com 0 fichas o mapa nem liga os eventos (sai antes do wireMap):
        // depois de semear, liga na mão para que o clique chegue ao handler
        'cam={x:0,y:0,s:1};var _svg=document.getElementById("svg");wireMap(_svg);draw(_svg);' +
        'var _r=(function(){' +
        corpo +
        '})();nodes=_n;_selMap=new Set();setView(_v);render();return _r;})()',
    );
  ok(
    "mapa: o laço pega o ponto que só ENCOSTA no disco (não exige o centro)",
    noMapa(
      'var svg=document.getElementById("svg");if(!svg||!nodes.length)return false;var r=svg.getBoundingClientRect(),z=zoomIF();var n=nodes[0];' +
        'var cx=r.left+(n.x*cam.s+cam.x)*z, cy=r.top+(n.y*cam.s+cam.y)*z, rr=(n.r||6)*cam.s*z;' +
        // laço que morde metade do disco, sem alcançar o centro
        'var a=nodesInRect(svg,{x0:cx-80,y0:cy-80,x1:cx-rr*0.5,y1:cy+80});' +
        // laço que para antes do disco
        'var b=nodesInRect(svg,{x0:cx-80,y0:cy-80,x1:cx-rr*2,y1:cy+80});' +
        'return a.has(n.id) && !b.has(n.id);',
    ),
  );
  ok(
    "mapa: Shift no clique soma ao que já estava marcado (e tira quem já estava)",
    noMapa(
      'var svg=document.getElementById("svg");if(!svg||nodes.length<2)return false;var r=svg.getBoundingClientRect(),z=zoomIF();' +
        'var n0=nodes[0],n1=nodes[1];_selMap=new Set([n1.id]);draw(svg);' +
        'var cx=r.left+(n0.x*cam.s+cam.x)*z, cy=r.top+(n0.y*cam.s+cam.y)*z;' +
        // o handler chama draw(), que REFAZ os .gn: um elemento guardado de
        // antes fica solto do documento e o clique nele não chega ao mapa.
        'var alvo=function(){return document.querySelector(\'.gn[data-id="\'+(window.CSS&&CSS.escape?CSS.escape(n0.id):n0.id)+\'"]\')};' +
        'var clicaShift=function(){var el=alvo();if(!el)return false;el.dispatchEvent(new MouseEvent("mousedown",{bubbles:true,clientX:Math.round(cx),clientY:Math.round(cy),button:0,shiftKey:true}));window.dispatchEvent(new MouseEvent("mouseup",{bubbles:true}));return true};' +
        'if(!clicaShift())return false;' +
        'var somou=_selMap.has(n0.id)&&_selMap.has(n1.id);' +
        'if(!clicaShift())return false;' +
        'var tirou=!_selMap.has(n0.id)&&_selMap.has(n1.id);' +
        'return somou&&tirou;',
    ),
  );
  ok(
    "mapa: o painel de Camadas entra na pilha de overlays (fecha pelo Esc)",
    g(
      '(function(){var mt=document.getElementById("maptoggles");if(!mt)return false;mt.classList.remove("open");toggleCamadas();var abriu=mt.classList.contains("open");var fechou=overlayFecharTopo()&&!mt.classList.contains("open");return abriu&&fechou;})()',
    ),
  );
  ok(
    "painéis: a lista única fecha ao clicar fora (menu ···, filtros, camadas, quadros, atalhos)",
    g(
      '(function(){if(typeof PAINEIS_FECHA_FORA==="undefined")return false;' +
        'var ids=PAINEIS_FECHA_FORA.map(function(p){return p.id}).join(",");' +
        'var mm=document.getElementById("moreMenu");overlayAbrir(mm,{id:"moreMenu"});' +
        'var dentro=(mm.dispatchEvent(new MouseEvent("click",{bubbles:true})),mm.classList.contains("open"));' +
        'document.body.dispatchEvent(new MouseEvent("click",{bubbles:true}));' +
        'var fora=!mm.classList.contains("open");' +
        'return ids==="moreMenu,filtrosPanel,maptoggles,qpop,qatalhos" && dentro && fora;})()',
    ),
  );
  ok(
    "quadros: o laço segue a CURVA do barbante, não a reta entre as pontas",
    g(
      '(function(){var q=quadroAtual();var antesN=q.nodes.slice(),antesS=q.setas.slice();' +
        'q.nodes=[{id:"cA",tipo:"ref",kind:"pista",ref:"f1",x:60,y:120},{id:"cB",tipo:"ref",kind:"pista",ref:"f5",x:800,y:120}];' +
        'q.setas=[{id:"sCurva",de:"cA",para:"cB"}];q.cam={x:0,y:0,s:1};desenhaQuadro();' +
        'var cv=document.getElementById("qcanvas"),r=cv.getBoundingClientRect(),z=zoomIF();' +
        'var pp=qSetaPontos(q,q.setas[0]),ctrl=qCurvaCtrl(pp.p1,pp.p2);' +
        'var tela=function(p){return{x:r.left+(p.x*q.cam.s+q.cam.x)*z,y:r.top+(p.y*q.cam.s+q.cam.y)*z}};' +
        'var mc=tela(qPontoNaCurva(pp.p1,ctrl,pp.p2,0.5)),mr=tela({x:(pp.p1.x+pp.p2.x)/2,y:(pp.p1.y+pp.p2.y)/2});' +
        'var barriga=Math.abs(mc.y-mr.y);' +
        'var caixa=function(p){return{x0:p.x-6,y0:p.y-6,x1:p.x+6,y1:p.y+6}};' +
        'var naCurva=qSetasInRect(cv,q,caixa(mc)).size>0;' +
        // espelha a barriga para o outro lado: lá a curva não passa
        'var espelho={x:mr.x,y:mr.y-(mc.y-mr.y)};' +
        'var foraDaCurva=qSetasInRect(cv,q,caixa(espelho)).size>0;' +
        'q.nodes=antesN;q.setas=antesS;desenhaQuadro();' +
        'return barriga>10 && naCurva && !foraDaCurva;})()',
    ),
  );

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

  /* Teste 18.3 — Fios da investigação levam ao mapa com a ficha em foco.
     (Este jsdom não executa onclick inline — os scripts são injetados à
     mão —, então aqui se confere a FIAÇÃO do HTML e o EFEITO da função.) */
  g(`
    DADOS.fichas.push(
      {id:"fFIO1",titulo:"Fio A",sala:"",grupos:[],personagens:["Simon"],conexoes:["fFIO2"],notas:"",pendente:false,fav:false,status:"",paginas:[{imagem:"",original:"",traducao:"",explica:"",rotulo:""}]},
      {id:"fFIO2",titulo:"Fio B",sala:"",grupos:[],personagens:[],conexoes:[],notas:"",pendente:false,fav:false,status:"",paginas:[{imagem:"",original:"",traducao:"",explica:"",rotulo:""}]}
    );
    setView("grade"); render(); abrir("fFIO1");
  `);
  ok(
    "fios: as duas linhas (manual e automática) levam ao mapa desta ficha",
    g(
      '(function(){var f=document.querySelectorAll(".fio.aomapa");return f.length===2 && [].every.call(f,function(x){return x.getAttribute("onclick")==="focarMapa(\'fFIO1\')" && x.getAttribute("role")==="button" && x.getAttribute("tabindex")==="0";});})()',
    ),
  );
  ok(
    "fios: no fio manual, o título abre a OUTRA ficha sem disparar o mapa",
    g(
      '(function(){var t=document.querySelector(".fio-l.manual").closest(".fio").querySelector(".fio-t").getAttribute("onclick");return t.indexOf("stopPropagation")>=0 && t.indexOf("abrir(\'fFIO2\')")>0;})()',
    ),
  );
  ok(
    "fios: o ✕ de remover também não dispara o mapa",
    g(
      '(function(){var x=document.querySelector(".fio-l.manual").closest(".fio").querySelector(".fio-x").getAttribute("onclick");return x.indexOf("stopPropagation")>=0 && x.indexOf("desligarFicha")>0;})()',
    ),
  );
  g('focarMapa("fFIO1")');
  ok(
    "fios: focarMapa abre o MAPA com a ficha em foco (fecha a ficha)",
    g('state.view === "mapa" && _focus === "fFIO1" && !document.getElementById("drawer").classList.contains("open")'),
  );
  g('setView("grade"); render(); _focus=null;');
  g(
    'fioTecla({key:"Enter",preventDefault:function(){}}, "fFIO1")',
  );
  ok(
    "fios: Enter no fio faz o mesmo que o clique (teclado)",
    g('state.view === "mapa" && _focus === "fFIO1"'),
  );
  g(
    'setView("grade"); DADOS.fichas = DADOS.fichas.filter(function(f){return f.id!=="fFIO1" && f.id!=="fFIO2"}); fechar(); render();',
  );

  /* Teste 18.4 — Arquivo › Salas: a lista de categorias é a primeira tela
     e o botão "trocar" traz ela de volta (classe .catlist manda no CSS) */
  g('setArqTab("salas"); setView("arquivo"); renderArquivo();');
  ok(
    "arquivo/salas: abre na LISTA de categorias (.catlist) com o diretório",
    g(
      '(function(){var b=document.querySelector(".arqbody");return b.classList.contains("catlist") && !!document.querySelector(".dirtitle2") && document.querySelectorAll(".dirbtn2").length>=11;})()',
    ),
  );
  g('arqEscolherCat("Bedrooms")');
  ok(
    "arquivo/salas: escolher a categoria abre a grade (sai do .catlist)",
    g(
      '(function(){var b=document.querySelector(".arqbody");return !b.classList.contains("catlist") && state.dirCat==="Bedrooms" && !!document.querySelector(".arqcatbtn") && !!document.querySelector(".arqgrid.salas");})()',
    ),
  );
  ok(
    "arquivo/salas: o botão mostra a categoria atual",
    g(
      'document.querySelector(".arqcatbtn .arqcatn").textContent === "BEDROOMS"',
    ),
  );
  g("arqAbrirCats()");
  ok(
    "arquivo/salas: o botão traz a lista de categorias de volta",
    g('document.querySelector(".arqbody").classList.contains("catlist")'),
  );
  g('arqEscolherCat("Rooms 001-012"); arqBuscaInput("hall");');
  ok(
    "arquivo/salas: buscando mostra os resultados (sem lista e sem botão)",
    g(
      '(function(){var b=document.querySelector(".arqbody");return !b.classList.contains("catlist") && !document.querySelector(".arqcatbtn") && !!document.querySelector(".arqfx.busca");})()',
    ),
  );
  g('arqBuscaFechar(); setArqTab("salas");');

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
      // Espelha a resposta REAL do servidor: o modelo devolve resumo+fatos
      // estruturados e a Edge Function monta a "descricao" (resumo + bullets).
      return { resultado: { resumo: "Dossie Persona escreveu uma carta sobre a mina.", fatos: [{ pista: "F-901", fato: "Escreveu uma carta sobre a mina" }, { pista: "F-902", fato: "Segundo o jornal, desapareceu em 3 de maio" }], descricao: "Dossie Persona escreveu uma carta sobre a mina.\\n\\n\\u2022 F-901 - Escreveu uma carta sobre a mina\\n\\u2022 F-902 - Segundo o jornal, desapareceu em 3 de maio", observacoes: "" }, uso:null, modelo:"mock" };
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
    "personas: descrição escrita (resumo + bullets por pista); fatos/notas do usuário INTACTOS; ia_desc registrado",
    g('(function(){var p=DADOS.personagens.find(x=>x.nome==="Dossie Persona");return p.descricao.indexOf("desapareceu em 3 de maio")>0 && p.descricao.indexOf("\\u2022 F-902 - ")>0 && p.descricao.indexOf("\\n\\n")>0 && p.fatos[0]==="fato do usuário" && p.notas==="nota minha" && p.ia_desc && p.ia_desc.fichas.length===2;})()'),
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

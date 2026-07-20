/* Servidor do app para captura visual (usado pela skill "verificar-visual"):
   serve a pasta app/ em http://localhost:4599 e, com ?seed=<vista>, injeta
   dados de teste (os mesmos do modelo de design) e entra no app sem login.
   Vistas: grade · detalhe · teorias · mapa · conta · arquivo-salas (lista
   de categorias) · arquivo-grade (salas de uma categoria) · arquivo-pessoas ·
   dossie-sala · grade-filtros · <vista>-diag (mede vazamento de largura e
   escreve o resultado no <title>). */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
const SEED = (vista) => `
<script>
(function(){
  // sem nuvem: o app roda em modo local para a captura
  window.MODO_ONLINE = false; window.IA_ATIVA = true;
  function entra(){
    if (${JSON.stringify(vista)}.indexOf("login") === 0) {
      document.body.classList.remove("app-carregando");
      document.body.classList.add("pre-login");
      if (${JSON.stringify(vista)} === "login-erro") {
        var mm = document.getElementById("authMsg");
        if (mm) { mm.textContent = "E-mail ou senha incorretos."; mm.className = "auth-msg show erro"; }
      }
      return;
    }
    document.body.classList.remove("pre-login","app-carregando");
    var a = document.getElementById("authScreen"); if (a) a.style.display="none";
    var D = (typeof DADOS !== "undefined") ? DADOS : null; if (!D || typeof setView !== "function") return setTimeout(entra, 60);
    if (D.fichas.length) return; // já semeado
    D.fichas.push(
      {id:"f1",titulo:"Bilhete rasgado no salão — jornal sobre o sumiço de Mary Matthew Jones na ala oeste",sala:"Entrance Hall",grupos:["Cartas Vermelhas"],personagens:["Simon"],conexoes:["f5"],notas:"Procurar a outra metade atrás dos móveis do salão.",pendente:true,fav:true,status:"",paginas:[{imagem:"imagens/ficha-01.png",original:"I found half a note behind the grandfather clock.",traducao:"Encontrei metade de um bilhete atrás do relógio de pé. A caligrafia parece a mesma das cartas vermelhas. A outra metade deve estar em algum lugar do salão.",explica:"Liga o salão de entrada à série de cartas vermelhas.",rotulo:""}]},
      {id:"f3",titulo:"Nota do despenseiro",sala:"Pantry",grupos:[],personagens:[],conexoes:[],notas:"",pendente:true,fav:false,status:"",paginas:[{imagem:"",original:"",traducao:"Lista de compras com um item circulado três vezes. Falta transcrever a foto.",explica:"",rotulo:""}]},
      {id:"f4",titulo:"Mapa antigo da propriedade",sala:"Study",grupos:[],personagens:["Herbert"],conexoes:[],notas:"",pendente:false,fav:false,status:"",paginas:[{imagem:"",original:"Old map pinned inside the desk drawer. Someone marked the east wing…",traducao:"",explica:"",rotulo:""}]},
      {id:"f5",titulo:"Carta com selo partido",sala:"Library",grupos:["Cartas Vermelhas"],personagens:["Simon","Mary"],conexoes:["f1"],notas:"",pendente:false,fav:true,status:"resolvida",paginas:[{imagem:"",original:"The third letter of the series.",traducao:"A terceira carta da série. O selo combina com o anel do retrato do corredor.",explica:"",rotulo:""}]},
      {id:"f2",titulo:"Retrato da fundadora",sala:"Drawing Room",grupos:[],personagens:["Mary"],conexoes:[],notas:"",pendente:false,fav:false,status:"",paginas:[{imagem:"",original:"",traducao:"A placa tem data ilegível. Alguém raspou o último algarismo.",explica:"",rotulo:""}]},
      {id:"f6",titulo:"Chave sem fechadura",sala:"",grupos:[],personagens:[],conexoes:[],notas:"",pendente:false,fav:false,status:"",paginas:[{imagem:"",original:"",traducao:"Uma chave pequena de latão, sem indicação de onde usar.",explica:"",rotulo:""}]}
    );
    D.personagens.push({nome:"Simon",imagem:"",descricao:"Correspondente frequente.",fatos:["Escrevia de dentro da casa."],notas:"",aliases:[]},{nome:"Mary",imagem:"",descricao:"",fatos:[],notas:"",aliases:[]},{nome:"Herbert",imagem:"",descricao:"",fatos:[],notas:"",aliases:[]});
    D.grupos.push({nome:"Cartas Vermelhas",cor:"#8d3030",imagem:"",descricao:"",fatos:[],notas:""});
    D.salas.length = 0;
    D.salas.push(
      {nome:"Entrance Hall",descoberta:true,num:1,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:["O relógio marca 8:07 desde o primeiro dia.","A porta oeste às vezes aparece trancada."],notas:"",descricao:"Saguão escuro e espalhafatoso."},
      {nome:"Parlor",descoberta:true,num:2,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:[],notas:"",descricao:""},
      {nome:"Spare Room",descoberta:false,num:3,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:[],notas:"",descricao:""},
      {nome:"Drawing Room",descoberta:true,num:4,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:[],notas:"",descricao:""},
      {nome:"Rotunda",descoberta:false,num:5,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:[],notas:"",descricao:""},
      {nome:"Billiard Room",descoberta:false,num:6,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:[],notas:"",descricao:""},
      {nome:"Study",descoberta:true,num:7,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:[],notas:"",descricao:""},
      {nome:"Pantry",descoberta:true,num:8,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:[],notas:"",descricao:""},
      {nome:"Library",descoberta:true,num:9,diretorio:"Rooms 001-012",categorias:["Blueprint"],imagem:"",fatos:[],notas:"",descricao:""}
    );
    if (typeof rebuildFilters === "function") rebuildFilters();
    var v = ${JSON.stringify(vista)};
    var base = v.replace("-diag","");
    if (base === "detalhe") { setView("grade"); render(); abrir("f1"); }
    // clica DE VERDADE no fio da investigação (prova que ele leva ao mapa)
    else if (base === "fio-mapa") { setView("grade"); render(); abrir("f1"); setTimeout(function(){ var el = document.querySelector(".fio.aomapa"); if (el) el.click(); }, 50); }
    else if (base === "dossie-sala") { state.dirCat = "Rooms 001-012"; setView("arquivo"); arqAbrir("sala","Entrance Hall"); }
    else if (base === "arquivo-salas") { state.dirCat = "Rooms 001-012"; setView("arquivo"); }
    else if (base === "arquivo-grade") { setView("arquivo"); arqEscolherCat("Rooms 001-012"); }
    else if (base === "arquivo-pessoas") { state.arqTab = "pessoas"; setView("arquivo"); }
    else if (base === "arquivo-grupos") { state.arqTab = "grupos"; setView("arquivo"); }
    else if (base === "conta") { setView("conta"); }
    else if (base === "grade-filtros") { setView("grade"); render(); toggleFiltros(); }
    // filtro aplicado: mostra o selo com a contagem no botão de filtros
    else if (base === "grade-filtroativo") { setView("grade"); togglePendentes(); render(); }
    else { setView(base); render(); }
    if (v !== base) { setTimeout(function(){ __diag(); }, 400); }
  }
  function __diag(){
    var vw = document.documentElement.clientWidth, pior = [];
    document.querySelectorAll("*").forEach(function(el){
      var r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 0) pior.push([Math.round(r.right), Math.round(r.width), el.tagName + "." + (el.className && el.className.baseVal === undefined ? String(el.className).split(" ").join(".") : "")]);
    });
    pior.sort(function(a,b){ return b[0]-a[0]; });
    // Rolagem vertical: quem é o dono e se o conteúdo é alcançável.
    var donos = [];
    ["#grade", ".arqbody", ".arqgrid", "#conta", "#teorias", "#drawer", ".db", ".contawrap"].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        var cs = getComputedStyle(el);
        if (cs.display === "none" || !el.clientHeight) return;
        var rola = /(auto|scroll)/.test(cs.overflowY);
        if (el.scrollHeight > el.clientHeight + 1 || rola)
          donos.push(sel + " sh=" + el.scrollHeight + " ch=" + el.clientHeight + (rola ? " ROLA" : " PRESO"));
      });
    });
    document.title = "VW=" + vw + " SCROLLW=" + document.documentElement.scrollWidth +
      " BODYH=" + document.documentElement.clientHeight + " SCROLLH=" + document.documentElement.scrollHeight +
      " || " + pior.slice(0,6).map(function(p){ return p[2] + " right=" + p[0] + " w=" + p[1]; }).join(" | ") +
      " ||V|| " + donos.join(" | ");
  }
  if (document.readyState === "complete") setTimeout(entra, 120);
  else window.addEventListener("load", function(){ setTimeout(entra, 120); });
})();
</script>`;
createServer((req, res) => {
  try {
    const [path, qs] = req.url.split("?");
    let p = decodeURIComponent(path);
    if (p === "/" || p === "/painel") p = "/painel.html";
    // /moldura.html?w=412&h=880&seed=grade — iframe com viewport CSS exato
    // (o Chrome headless do Windows não desce de ~500px de janela; o iframe
    // dá o layout real de celular estreito lá dentro).
    if (p === "/moldura.html") {
      const q = new URLSearchParams(qs || "");
      const w = +(q.get("w") || 412), h = +(q.get("h") || 880);
      const seed = q.get("seed") || "grade";
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#333}</style></head>
<body><iframe src="/painel.html?seed=${encodeURIComponent(seed)}" style="width:${w}px;height:${h}px;border:0;display:block"></iframe></body></html>`);
      return;
    }
    const file = join(DIR, p);
    let body = readFileSync(file);
    const seed = new URLSearchParams(qs || "").get("seed");
    if (seed && p === "/painel.html") {
      body = Buffer.from(body.toString("utf8").replace("</body>", SEED(seed) + "</body>"), "utf8");
    }
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end("404");
  }
}).listen(4599, () => console.log("app em http://localhost:4599/painel.html?seed=grade"));

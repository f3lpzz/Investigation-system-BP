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
    // Simon tem a descrição no formato novo da IA: resumo (1ª linha) +
    // linha em branco + bullets "• F-nnn - fato" — para verificar o pre-wrap.
    D.personagens.push({nome:"Simon",imagem:"",descricao:"Correspondente frequente das cartas vermelhas, ativo dentro da casa.\\n\\n• F-001 - Escreveu metade de um bilhete encontrado atrás do relógio de pé\\n• F-001 - Segundo o bilhete, a caligrafia é a mesma das cartas vermelhas\\n• F-005 - Assinou a terceira carta da série, com o selo partido",fatos:["Escrevia de dentro da casa."],notas:"",aliases:[]},{nome:"Mary",imagem:"",descricao:"",fatos:[],notas:"",aliases:[]},{nome:"Herbert",imagem:"",descricao:"",fatos:[],notas:"",aliases:[]});
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
    // dossiê completo do personagem (drawer com a Descrição em bullets)
    else if (base === "dossie-pessoa") { setView("grade"); render(); abrirEntidade("pessoa","Simon"); }
    // dossiê rápido do Arquivo (painel lateral .dosdesc)
    else if (base === "arquivo-pessoa-dossie") { state.arqTab = "pessoas"; setView("arquivo"); arqAbrir("pessoa","Simon"); }
    else if (base === "arquivo-grupos") { state.arqTab = "grupos"; setView("arquivo"); }
    else if (base === "conta") { setView("conta"); }
    else if (base === "grade-filtros") { setView("grade"); render(); toggleFiltros(); }
    // filtro aplicado: mostra o selo com a contagem no botão de filtros
    else if (base === "grade-filtroativo") { setView("grade"); togglePendentes(); render(); }
    // grade cheia: 28 fichas com títulos de 1 a 3 linhas (reproduz a
    // responsividade real do Felipe, que o seed pequeno não mostra)
    else if (base.indexOf("grade-cheia") === 0) {
      var _ts = ["Pista importada 14/07/2026 - 11/11", "Carta aos editores - rejeicao ao livro", "Mineracao - Ultimo equipamento para a nova mina", "Aviso ao pessoal - Ala Oeste fechada (Lady Clara Epson)", "Peca de xadrez - Peao (Parlor)", "Carta Vermelha 4"];
      var _bs = DADOS.fichas.slice();
      for (var i = 0; i < 28; i++) {
        var b = _bs[i % _bs.length];
        DADOS.fichas.push(Object.assign({}, b, {
          id: "fx" + i,
          titulo: _ts[i % _ts.length],
          paginas: b.paginas.map(function (p) { return Object.assign({}, p); }),
        }));
      }
      setView("grade"); render();
      // "-rolada": mostra o topo da lista durante a rolagem (o corte rente
      // ao cabeçalho só aparece com a grade fora do início)
      if (v.indexOf("rolada") > 0) setTimeout(function () {
        document.getElementById("grade").scrollTop = 260;
      }, 200);
    }
    // marquee-hit: o retângulo de seleção do quadro cai onde o mouse está?
    // Arrasta de (600,400) a (820,560) em coordenadas de TELA e compara com
    // onde o #selbox foi parar. Serve com a interface ampliada (zoom do body
    // em telas grandes), que foi onde a seleção saía deslocada.
    else if (base === "marquee-hit") {
      setView("teorias");
      setTimeout(function () {
        var cv = document.getElementById("qcanvas");
        function ev(t, x, y) { cv.dispatchEvent(new MouseEvent(t, {bubbles:true, clientX:x, clientY:y, button:0})); }
        ev("mousedown", 600, 400); ev("mousemove", 820, 560);
        var b = document.getElementById("selbox").getBoundingClientRect();
        var z = getComputedStyle(document.body).zoom || "1";
        ev("mouseup", 820, 560);
        // 2) arrastar um CARTÃO: ele tem de andar o mesmo que o mouse andou
        var q = quadroAtual();
        q.nodes.length = 0; q.setas.length = 0;
        q.cam = { x: 40, y: 40, s: 1 };
        q.nodes.push({id:"qa", tipo:"ref", kind:"pista", ref:"f1", x:100, y:100});
        desenhaQuadro();
        var el = document.querySelector('.qnode[data-id="qa"]');
        var r0 = el.getBoundingClientRect();
        // o mousedown sai DO CARTÃO (evento sintético não faz hit-test:
        // quem manda no alvo é o elemento em que ele é disparado)
        var px = Math.round(r0.left + 30), py = Math.round(r0.bottom - 12);
        el.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, clientX:px, clientY:py, button:0}));
        ev("mousemove", px + 120, py + 80);
        ev("mouseup", px + 120, py + 80);
        var r1 = el.getBoundingClientRect();
        // 3) com o barbante desenhado POR CIMA das fichas, o alfinete de uma
        // ficha que já tem linha continua sendo pegável?
        q.nodes.push({id:"qb2", tipo:"ref", kind:"pista", ref:"f5", x:520, y:120});
        q.setas.push({id:"sZ", de:"qa", para:"qb2"});
        desenhaQuadro();
        var pin = document.querySelector('.qnode[data-id="qa"] .qpin');
        var rp = pin.getBoundingClientRect();
        var alvo = document.elementFromPoint(rp.left + rp.width/2, rp.top + rp.height/2);
        var pega = alvo && alvo.closest && alvo.closest("[data-conn]") ? "ALFINETE" :
                   (alvo && alvo.closest && alvo.closest("[data-seta-id]") ? "BARBANTE" : "outro");
        document.title = "ZOOM=" + z + " | centro do alfinete pega=" + pega +
          " | selbox esperado=600,400 obtido=" + Math.round(b.left) + "," + Math.round(b.top) +
          " erro=" + Math.round(b.left - 600) + "," + Math.round(b.top - 400) +
          " || cartao esperado=+120,+80 obtido=+" + Math.round(r1.left - r0.left) +
          ",+" + Math.round(r1.top - r0.top);
      }, 400);
    }
    // quadro com fichas + barbantes, inclusive um barbante PRESO em outro
    // barbante (alfinete = alça da linha). Usado para conferir a issue #9.
    // (teorias-no = a mesma cena, ampliada no cruzamento: confere o NÓ;
    //  teorias-no-drag = arrasta o nó pela linha e diz no <title> onde parou)
    else if (base === "teorias-barbante" || base === "teorias-no" || base === "teorias-no-drag") {
      setView("teorias");
      var _q = quadroAtual();
      _q.cam = { x: 40, y: 40, s: 1 };
      _q.nodes.length = 0; _q.setas.length = 0;
      _q.nodes.push(
        {id:"qa", tipo:"ref", kind:"pista", ref:"f1", x:60,  y:60},
        {id:"qb", tipo:"ref", kind:"pista", ref:"f5", x:430, y:70},
        {id:"qc", tipo:"ref", kind:"pista", ref:"f2", x:250, y:330}
      );
      _q.setas.push({id:"sA", de:"qa", para:"qb", rotulo:"mesma letra"});
      // sai do meio do barbante sA e desce até a terceira ficha
      _q.setas.push({id:"sB", de:"seta:sA", deT:0.5, para:"qc"});
      // caixa de texto e nota adesiva, para conferir o alfinete nelas
      _q.nodes.push({id:"qt", tipo:"texto", texto:"Quem estava na ala oeste?", x:60, y:430, w:230});
      _q.nodes.push({id:"qn", tipo:"texto", estilo:"nota", cor:0, texto:"conferir o relógio", x:760, y:400, w:190});
      _q.setas.push({id:"sC", de:"qt", para:"qc"});
      _q.setas.push({id:"sD", de:"qn", para:"qb"});
      desenhaQuadro();
      /* Arrastar o NÓ na tela de verdade: aperta na pega, anda até 0,82 da
         hospedeira e solta (0,6). O <title> diz se deT foi junto e se a ligação
         continuou a mesma (só o ponto muda, o hospedeiro não). */
      if (base === "teorias-no-drag") setTimeout(function () {
        var cv = document.getElementById("qcanvas");
        var r = cv.getBoundingClientRect(), z = (typeof zoomIF === "function" ? zoomIF() : 1);
        var toTela = function (p) {
          return { x: r.left + (p.x*_q.cam.s + _q.cam.x)*z, y: r.top + (p.y*_q.cam.s + _q.cam.y)*z };
        };
        var pp = qSetaPontos(_q, _q.setas[0]), c = qCurvaCtrl(pp.p1, pp.p2);
        var antes = _q.setas[1].deT;
        var pega = document.querySelector('[data-no-i="1"][data-no-end="de"]');
        var a = toTela(qPontoNaCurva(pp.p1, c, pp.p2, antes));
        var b = toTela(qPontoNaCurva(pp.p1, c, pp.p2, 0.6));
        // evento sintético não faz hit-test: o mousedown sai DA PEGA
        pega.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, clientX:Math.round(a.x), clientY:Math.round(a.y), button:0}));
        cv.dispatchEvent(new MouseEvent("mousemove", {bubbles:true, clientX:Math.round(b.x), clientY:Math.round(b.y), button:0}));
        cv.dispatchEvent(new MouseEvent("mouseup", {bubbles:true, clientX:Math.round(b.x), clientY:Math.round(b.y), button:0}));
        document.title = "pega=" + (pega ? "achei" : "SUMIU") +
          " | deT antes=" + antes + " depois=" + _q.setas[1].deT + " (alvo 0,6)" +
          " | ligacao=" + _q.setas[1].de + " | nos=" + document.querySelectorAll("[data-no-i]").length;
      }, 350);
      // Lupa no nó: centraliza o ponto de amarra de sB e amplia 5×.
      if (base === "teorias-no") setTimeout(function () {
        var cv = document.getElementById("qcanvas");
        var pp = qSetaPontos(_q, _q.setas[1]);
        var s = 5;
        _q.cam = { x: cv.clientWidth/2 - pp.p1.x*s, y: cv.clientHeight/2 - pp.p1.y*s, s: s };
        desenhaQuadro();
      }, 300);
    }
    // lista de quadros aberta pelo seletor do celular (2 quadros)
    else if (base === "teorias-sel") { setView("teorias"); novoQuadro(); setTimeout(function(){ qEscolherQuadro(); }, 60); }
    // popover de quadros aberto no chip (com vários quadros para filtrar)
    else if (base === "teorias-pop") {
      setView("teorias");
      for (var _i = 0; _i < 5; _i++) novoQuadro();
      DADOS.quadros.forEach(function (q, i) {
        q.nome = ["O apagão do farol","Linha do tempo — 12/03","Suspeitos","Doca 3","Rede do porto","Álibis cruzados"][i] || q.nome;
      });
      trocarQuadro(1);
      setTimeout(function () { qPop(true); }, 60);
    }
    // O laço mede a CURVA do barbante ou a reta entre as pontas?
    // Compara dois lugares: onde a curva passa (tem de pegar) e onde só a
    // reta passa, longe da curva (não pode pegar).
    else if (base === "teorias-curva") {
      setView("teorias");
      var _q = quadroAtual();
      _q.cam = { x: 0, y: 0, s: 1 };
      _q.nodes.length = 0; _q.setas.length = 0;
      _q.nodes.push(
        {id:"qa", tipo:"ref", kind:"pista", ref:"f1", x:60,  y:120},
        {id:"qb", tipo:"ref", kind:"pista", ref:"f5", x:800, y:120}
      );
      _q.setas.push({id:"sA", de:"qa", para:"qb"});
      desenhaQuadro();
      setTimeout(function () {
        var cv = document.getElementById("qcanvas"), r = cv.getBoundingClientRect();
        var z = (typeof zoomIF === "function" ? zoomIF() : 1);
        var tela = function (p) { return { x: r.left + (p.x*_q.cam.s + _q.cam.x)*z, y: r.top + (p.y*_q.cam.s + _q.cam.y)*z }; };
        var pp = qSetaPontos(_q, _q.setas[0]);
        var ctrl = qCurvaCtrl(pp.p1, pp.p2);
        var meioCurva = tela(qPontoNaCurva(pp.p1, ctrl, pp.p2, 0.5));
        var meioReta = tela({ x: (pp.p1.x + pp.p2.x)/2, y: (pp.p1.y + pp.p2.y)/2 });
        var barriga = Math.round(Math.abs(meioCurva.y - meioReta.y));
        var laco = function (cx, cy, raio) {
          _qSetaSel = new Set();
          cv.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, clientX:Math.round(cx-raio), clientY:Math.round(cy-raio), button:0}));
          cv.dispatchEvent(new MouseEvent("mousemove", {bubbles:true, clientX:Math.round(cx+raio), clientY:Math.round(cy+raio)}));
          var pegou = _qSetaSel.size > 0;
          window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
          return pegou;
        };
        var naCurva = laco(meioCurva.x, meioCurva.y, 6);
        // ponto na RETA, deslocado para o lado oposto da barriga: a curva
        // não passa por lá, então o laço não pode marcar o barbante
        var foraDaCurva = laco(meioReta.x, meioReta.y - (meioCurva.y - meioReta.y), 6);
        document.title = "BARBANTE barriga=" + barriga + "px | laco-na-curva-pega=" + naCurva +
          " | laco-fora-da-curva-nao-pega=" + !foraDaCurva;
      }, 350);
    }
    // GRADE: o painel de filtros fecha ao clicar fora, no desktop?
    else if (base === "grade-filtros-fora") {
      setView("grade"); render();
      setTimeout(function () {
        toggleFiltros();
        var pn = document.getElementById("filtrosPanel");
        var abriu = pn.classList.contains("open");
        // clique DENTRO do painel não pode fechá-lo
        pn.dispatchEvent(new MouseEvent("click", {bubbles:true}));
        var ficouDentro = pn.classList.contains("open");
        document.getElementById("grade").dispatchEvent(new MouseEvent("click", {bubbles:true}));
        var fechou = !pn.classList.contains("open");
        // o menu ··· continua fechando fora (a lista nova assumiu o ouvinte antigo)
        var mm = document.getElementById("moreMenu");
        overlayAbrir(mm, {id:"moreMenu"});
        var mmAbriu = mm.classList.contains("open");
        document.getElementById("grade").dispatchEvent(new MouseEvent("click", {bubbles:true}));
        var mmFechou = !mm.classList.contains("open");
        document.title = "FILTROS abre=" + abriu + " | clique-dentro-mantem=" + ficouDentro +
          " | fecha-clicando-fora=" + fechou +
          " || MENU-3-PONTOS abre=" + mmAbriu + " fecha-fora=" + mmFechou;
      }, 300);
    }
    // MAPA: o laço e o Shift têm os mesmos defeitos que os Quadros tinham?
    // (só diagnóstico — a correção pedida foi na aba Quadros)
    else if (base === "mapa-selecao") {
      setView("mapa");
      setTimeout(function () {
        var svg = document.querySelector("#mapa svg") || document.querySelector("#mapa .mapsvg") || document.getElementsByTagName("svg")[0];
        var r = svg.getBoundingClientRect(), z = (typeof zoomIF === "function" ? zoomIF() : 1);
        var n0 = nodes[0];
        var tela = function (wx, wy) { return { x: r.left + (wx*cam.s + cam.x)*z, y: r.top + (wy*cam.s + cam.y)*z }; };
        var c = tela(n0.x, n0.y);
        var md = function (x, y, sh) { svg.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, clientX:Math.round(x), clientY:Math.round(y), button:0, shiftKey:!!sh})); };
        var mv = function (x, y, sh) { svg.dispatchEvent(new MouseEvent("mousemove", {bubbles:true, clientX:Math.round(x), clientY:Math.round(y), shiftKey:!!sh})); };
        // raio do disco DESENHADO, em pixels de tela
        var rr = (n0.r || 6) * cam.s * z;
        // laço que morde METADE do disco mas não alcança o centro
        _selMap = new Set();
        md(c.x - 60, c.y - 60); mv(c.x - rr*0.5, c.y + 60);
        var pegouEncostando = _selMap.has(n0.id);
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        // laço que para ANTES do disco não pode pegar
        _selMap = new Set();
        md(c.x - 60, c.y - 60); mv(c.x - rr*2, c.y + 60);
        var pegouLonge = _selMap.has(n0.id);
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        // laço cobrindo o centro: aí pega
        _selMap = new Set();
        md(c.x - 60, c.y - 60); mv(c.x + 60, c.y + 60);
        var pegouCentro = _selMap.has(n0.id);
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        // Shift + laço soma ao que já estava?
        var outro = nodes[1] ? nodes[1].id : null;
        _selMap = new Set(outro ? [outro] : []);
        md(c.x - 60, c.y - 60, true); mv(c.x + 60, c.y + 60, true);
        var shiftSomou = outro ? (_selMap.has(outro) && _selMap.has(n0.id)) : "sem2onode";
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        // Shift + clique num nó soma?
        var g0 = document.querySelector('.gn[data-id="' + n0.id + '"]');
        _selMap = new Set(outro ? [outro] : []); draw(svg);
        g0 = document.querySelector('.gn[data-id="' + n0.id + '"]');
        g0.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, clientX:Math.round(c.x), clientY:Math.round(c.y), button:0, shiftKey:true}));
        var shiftCliqueSomou = outro ? (_selMap.has(outro) && _selMap.has(n0.id)) : "sem2onode";
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        // laço SEM shift continua trocando (não pode virar sempre-soma)
        _selMap = new Set(outro ? [outro] : []);
        md(c.x - 60, c.y - 60); mv(c.x + 60, c.y + 60);
        var semShiftTroca = outro ? (!_selMap.has(outro) && _selMap.has(n0.id)) : "sem2onode";
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        // painel de Camadas: fecha ao clicar fora? e pelo Esc?
        toggleCamadas();
        var camAberto = document.getElementById("maptoggles").classList.contains("open");
        document.body.dispatchEvent(new MouseEvent("click", {bubbles:true}));
        var camFechou = !document.getElementById("maptoggles").classList.contains("open");
        // Esc: parte de um estado CONHECIDO (fechado), abre e só então mede —
        // senão o resultado depende do passo anterior e passa pelo motivo errado.
        var mt = document.getElementById("maptoggles");
        mt.classList.remove("open");
        toggleCamadas();
        var camReabriu = mt.classList.contains("open");
        overlayFecharTopo();
        var camEsc = camReabriu && !mt.classList.contains("open");
        document.title = "MAPA raio-tela=" + rr.toFixed(1) +
          " | laco-pega-encostando=" + pegouEncostando + " laco-longe-nao-pega=" + !pegouLonge +
          " | laco-pega-centro=" + pegouCentro + " | shift-laco-soma=" + shiftSomou +
          " | shift-clique-soma=" + shiftCliqueSomou + " | sem-shift-troca=" + semShiftTroca +
          " | camadas-abre=" + camAberto + " camadas-fecha-fora=" + camFechou + " camadas-esc=" + camEsc;
      }, 500);
    }
    // seleção: Delete apaga? Shift soma? o laço pega quem ENCOSTA nele?
    else if (base === "teorias-selecao") {
      setView("teorias");
      var _q = quadroAtual();
      _q.cam = { x: 0, y: 0, s: 1 };
      _q.nodes.length = 0; _q.setas.length = 0;
      _q.nodes.push(
        {id:"qa", tipo:"ref", kind:"pista", ref:"f1", x:60,  y:60},
        {id:"qb", tipo:"ref", kind:"pista", ref:"f5", x:400, y:60},
        {id:"qc", tipo:"ref", kind:"pista", ref:"f2", x:60,  y:400}
      );
      desenhaQuadro();
      setTimeout(function () {
        var cv = document.getElementById("qcanvas"), r = cv.getBoundingClientRect();
        var z = (typeof zoomIF === "function" ? zoomIF() : 1);
        var tela = function (wx, wy) { return { x: r.left + (wx*_q.cam.s + _q.cam.x)*z, y: r.top + (wy*_q.cam.s + _q.cam.y)*z }; };
        var md = function (el, x, y, sh) { el.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, clientX:x, clientY:y, button:0, shiftKey:!!sh})); };
        var tecla = function (code) { (document.activeElement||document.body).dispatchEvent(new KeyboardEvent("keydown", {bubbles:true, code:code, key:code==="Delete"?"Delete":code})); };
        var elA = document.querySelector('.qnode[data-id="qa"]');
        var elB = document.querySelector('.qnode[data-id="qb"]');

        // 1) Delete apaga o cartão selecionado?
        var rA = elA.getBoundingClientRect();
        md(elA, Math.round(rA.left+20), Math.round(rA.bottom-10));
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        var sel1 = _qSelSet.size;
        var antes = _q.nodes.length;
        tecla("Delete");
        var apagou = _q.nodes.length === antes - 1;
        // repõe o cartão para os testes seguintes
        _q.nodes.push({id:"qa", tipo:"ref", kind:"pista", ref:"f1", x:60, y:60});
        _qSelSet = new Set(); desenhaQuadro();
        elA = document.querySelector('.qnode[data-id="qa"]');
        elB = document.querySelector('.qnode[data-id="qb"]');

        // 2) Shift+clique soma à seleção?
        rA = elA.getBoundingClientRect();
        var rB = elB.getBoundingClientRect();
        md(elA, Math.round(rA.left+20), Math.round(rA.bottom-10));
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        md(elB, Math.round(rB.left+20), Math.round(rB.bottom-10), true);
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        var somou = _qSelSet.size === 2;

        // 3) laço encostando SÓ na quina do cartão qc (x 60..236, y 400..~480)
        _qSelSet = new Set(); markSelDom();
        var p0 = tela(20, 360), p1 = tela(100, 430);   // pega ~40x30 do canto
        md(cv, Math.round(p0.x), Math.round(p0.y));
        cv.dispatchEvent(new MouseEvent("mousemove", {bubbles:true, clientX:Math.round(p1.x), clientY:Math.round(p1.y)}));
        var pegouEncostando = _qSelSet.has("qc");
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));

        // 4) Shift + laço soma ao que já estava marcado?
        _qSelSet = new Set(["qb"]); markSelDom();
        var q0 = tela(20, 360), q1 = tela(300, 600);
        md(cv, Math.round(q0.x), Math.round(q0.y), true);
        cv.dispatchEvent(new MouseEvent("mousemove", {bubbles:true, clientX:Math.round(q1.x), clientY:Math.round(q1.y), shiftKey:true}));
        var lacoSomou = _qSelSet.has("qb") && _qSelSet.has("qc");
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));

        // 4b) sem Shift, o laço TROCA a seleção (não soma)
        _qSelSet = new Set(["qb"]); markSelDom();
        var s0 = tela(20, 360), s1 = tela(300, 600);
        md(cv, Math.round(s0.x), Math.round(s0.y));
        cv.dispatchEvent(new MouseEvent("mousemove", {bubbles:true, clientX:Math.round(s1.x), clientY:Math.round(s1.y)}));
        var lacoTroca = !_qSelSet.has("qb") && _qSelSet.has("qc");
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));

        // 5) e numa NOTA? clicar no corpo dela seleciona, ou só entra na escrita?
        _qSelSet = new Set(); markSelDom();
        var nn = qNovoTextoEm(600, 300, "nota"); desenhaQuadro();
        var elN = document.querySelector('.qnode[data-id="' + nn.id + '"]');
        var edN = elN.querySelector(".qtxt"), rN = edN.getBoundingClientRect();
        md(edN, Math.round(rN.left + 20), Math.round(rN.top + 12));
        window.dispatchEvent(new MouseEvent("mouseup", {bubbles:true}));
        var notaSelecionou = _qSelSet.has(nn.id);
        var naoFocouNoClique = document.activeElement !== edN;
        var antesN = _q.nodes.length;
        tecla("Delete");
        var notaApagou = _q.nodes.length === antesN - 1;

        // 6) 2 cliques entram na escrita, e Esc sai dela deixando marcado
        var nn2 = qNovoTextoEm(600, 300, "nota"); desenhaQuadro();
        var el2 = document.querySelector('.qnode[data-id="' + nn2.id + '"]');
        var ed2 = el2.querySelector(".qtxt");
        ed2.blur(); _qSelSet = new Set(); markSelDom();
        el2.dispatchEvent(new MouseEvent("dblclick", {bubbles:true}));
        var doisCliquesEscreve = document.activeElement === ed2;
        ed2.dispatchEvent(new KeyboardEvent("keydown", {bubbles:true, code:"Escape", key:"Escape"}));
        var escSaiu = document.activeElement !== ed2 && _qSelSet.has(nn2.id);

        // 7) o ✕ e o 🎨 sumiram do papel?
        var semX = !document.querySelector(".qnode .qdel") && !document.querySelector(".qnode .qcor");

        // 8) painel de atalhos fecha ao clicar fora?
        qAtalhos(true);
        var atAberto = document.getElementById("qatalhos").classList.contains("open");
        cv.dispatchEvent(new MouseEvent("click", {bubbles:true}));
        var atFechou = !document.getElementById("qatalhos").classList.contains("open");

        document.title = "sel-clique=" + sel1 + " | delete-apaga=" + apagou +
          " | shift-clique-soma=" + somou + " | laco-pega-encostando=" + pegouEncostando +
          " | shift-laco-soma=" + lacoSomou + " | laco-sem-shift-troca=" + lacoTroca +
          " || NOTA: clique-seleciona=" + notaSelecionou + " nao-focou=" + naoFocouNoClique +
          " delete-apaga=" + notaApagou + " 2cliques-escreve=" + doisCliquesEscreve +
          " esc-sai=" + escSaiu +
          " || sem-X=" + semX + " | atalhos-abre=" + atAberto + " atalhos-fecha-fora=" + atFechou;
      }, 350);
    }
    // escrever numa nota e clicar fora: o foco sai do editor e as teclas de
    // ferramenta voltam a trocar de ferramenta em vez de virar texto?
    else if (base === "teorias-foco") {
      setView("teorias");
      setTimeout(function () {
        var cv = document.getElementById("qcanvas");
        var n = qNovoTextoEm(160, 160, "nota");
        var ed = document.querySelector('.qnode[data-id="' + n.id + '"] .qtxt');
        ed.focus();
        var dentro = document.activeElement === ed;
        // clique no fundo do quadro (fora do editor)
        cv.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, clientX:900, clientY:600, button:0}));
        var saiu = document.activeElement !== ed;
        // agora a tecla N tem de trocar de ferramenta, não escrever
        var antes = _qTool, txt0 = ed.textContent;
        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {bubbles:true, code:"KeyN", key:"n"}));
        var trocou = _qTool === "nota" && antes !== "nota";
        var naoEscreveu = ed.textContent === txt0;
        // clicar DENTRO do editor não pode tirar o foco dele
        ed.focus();
        ed.dispatchEvent(new MouseEvent("mousedown", {bubbles:true, button:0}));
        var ficou = document.activeElement === ed;
        document.title = "focou=" + dentro + " | clique-fora-solta=" + saiu +
          " | tecla-troca-ferramenta=" + trocou + " | nao-escreveu=" + naoEscreveu +
          " | clique-dentro-mantem=" + ficou;
      }, 300);
    }
    // clique fora fecha o painel de quadros? (e o chip continua alternando)
    else if (base === "teorias-pop-fora") {
      setView("teorias");
      setTimeout(function () {
        var chip = document.querySelector(".qchip"), cv = document.getElementById("qcanvas");
        var clic = function (el) { el.dispatchEvent(new MouseEvent("click", {bubbles:true})); };
        var aberto = function () { var p = document.getElementById("qpop"); return !!p && p.classList.contains("open"); };
        clic(chip);      var a1 = aberto();   // chip abre
        clic(cv);        var a2 = aberto();   // clique fora fecha
        clic(chip);      var a3 = aberto();   // chip abre de novo
        clic(chip);      var a4 = aberto();   // chip fecha (alterna)
        document.title = "chip-abre=" + a1 + " | fora-fecha=" + !a2 +
          " | reabre=" + a3 + " | chip-alterna=" + !a4;
      }, 300);
    }
    // painel de atalhos aberto (o que era a legenda fixa do rodapé)
    else if (base === "teorias-atalhos") { setView("teorias"); setTimeout(function(){ qAtalhos(true); }, 60); }
    // dica do alfinete: quadro com 2 cartões e NENHUM barbante (halo + anotação)
    else if (base === "teorias-dica" || base === "teorias-acoes") {
      setView("teorias");
      var _q = quadroAtual();
      _q.cam = { x: 40, y: 40, s: 1 };
      _q.nodes.length = 0; _q.setas.length = 0;
      _q.nodes.push(
        {id:"qa", tipo:"ref", kind:"pista", ref:"f1", x:120, y:90},
        {id:"qn", tipo:"texto", estilo:"nota", cor:0, texto:"A lanterna é da doca, mas a bateria é nova.", x:300, y:430, w:190}
      );
      desenhaQuadro();
      // barra de ações: um item selecionado (e a dica do alfinete sai de cena)
      if (base === "teorias-acoes") setTimeout(function () {
        _q.setas.push({id:"sA", de:"qa", para:"qn"});
        _qSelSet = new Set(["qn"]);
        desenhaQuadro();
      }, 120);
    }
    // quadro arrastado: prova que a textura do fundo anda com a câmera
    else if (base === "teorias-pan") { setView("teorias"); var _q = quadroAtual(); _q.cam.x = -420; _q.cam.y = -260; aplicaCam(); }
    // zoom-hit: com a interface ampliada, o ponto clicado ainda cai no
    // elemento certo? (elementFromPoint usa o mesmo espaço do clientX dos
    // eventos de ponteiro — se bater com o rect, arrastar/clicar acerta)
    else if (base === "zoom-hit") {
      setView("teorias");
      var _n = qNovoTextoEm(120, 120, "nota");
      desenhaQuadro();
      setTimeout(function () {
        var el = document.querySelector('.qnode[data-id="' + _n.id + '"]');
        var r = el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var alvo = document.elementFromPoint(cx, cy);
        var ok = !!(alvo && alvo.closest && alvo.closest('.qnode[data-id="' + _n.id + '"]'));
        // também confere o Mapa (mesmo teste no primeiro ponto do grafo)
        setView("mapa"); render();
        setTimeout(function () {
          var no = document.querySelector("#svg circle, #svg .node, #svg g");
          var ok2 = "sem-no";
          if (no) {
            var r2 = no.getBoundingClientRect();
            var a2 = document.elementFromPoint(r2.left + r2.width / 2, r2.top + r2.height / 2);
            ok2 = a2 && (a2 === no || (a2.closest && a2.closest("svg"))) ? "OK" : "ERRO";
          }
          document.title = "ZOOM=" + (getComputedStyle(document.body).zoom || "1") +
            " | rect=" + Math.round(r.left) + "," + Math.round(r.top) +
            " | quadro-hit=" + (ok ? "OK" : "ERRO") + " | mapa-hit=" + ok2;
        }, 300);
      }, 250);
    }
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

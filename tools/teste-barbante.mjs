/* Testa o ALFINETE como botão e o BARBANTE PRESO EM BARBANTE (issue #9).
   Roda o app de verdade no jsdom (como o teste-carga), porque o que quebra
   aqui é o encaixe entre HTML, dados e geometria — screenshot mostra a tela
   parada, este teste mexe nos controles. */
import { JSDOM } from "jsdom";
import fs from "fs";
import vm from "vm";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "app");
const ler = (n) => fs.readFileSync(path.join(ROOT, n), "utf8");

let falhas = 0;
const erros = [];
function ok(nome, condicao, obtido) {
  if (condicao) console.log("OK  " + nome);
  else {
    falhas++;
    console.log(
      "ERRO " +
        nome +
        (obtido === undefined
          ? ""
          : "\n     obtido: " + JSON.stringify(obtido)),
    );
  }
}

const dom = new JSDOM(ler("painel.html"), { pretendToBeVisual: true });
const w = dom.window;
w.alert = () => {};
w.confirm = () => true;
w.onerror = (m) => erros.push(String(m));
const ctx = vm.createContext(w);
const g = (s) => vm.runInContext(s, ctx);
try {
  vm.runInContext(ler("dados.js") + "\n" + ler("app.js"), ctx);
} catch (e) {
  erros.push("THROW: " + e.message);
}

/* ===== 1. Aba Fichas: o alfinete É o botão de favoritar ===== */
g('setView("grade");render()');
const alfinetes = w.document.querySelectorAll(".card .pin");
ok("fichas: todo card tem alfinete", alfinetes.length > 0, alfinetes.length);
ok(
  "fichas: o alfinete é <button> (alcançável pelo teclado)",
  [...alfinetes].every((p) => p.tagName === "BUTTON"),
);
ok(
  "fichas: a estrela ★ do card não existe mais (o alfinete assumiu)",
  w.document.querySelectorAll(".card .cstar").length === 0,
);

/* Este jsdom NÃO executa onclick inline (mesma limitação anotada no
   teste-online.mjs): confere-se a ligação pelo atributo e o efeito
   chamando a função, como o resto da casa faz. */
const achaPin = (id) =>
  [...w.document.querySelectorAll(".card .pin")].find((p) =>
    (p.getAttribute("onclick") || "").includes("toggleFav('" + id + "')"),
  );
const idF = g("DADOS.fichas[0].id");
ok("fichas: o alfinete chama toggleFav da própria ficha", !!achaPin(idF));
ok(
  "fichas: o clique no alfinete não abre a ficha junto (stopPropagation)",
  (achaPin(idF).getAttribute("onclick") || "").includes("stopPropagation"),
);
const favAntes = g("DADOS.fichas[0].fav === true");
g('toggleFav("' + idF + '")');
ok(
  "fichas: favoritar inverte o estado da ficha",
  g("DADOS.fichas[0].fav === true") !== favAntes,
  g("DADOS.fichas[0].fav"),
);
ok(
  "fichas: o alfinete redesenhado mostra o estado (classe .fav)",
  achaPin(idF).classList.contains("fav") === g("DADOS.fichas[0].fav === true"),
);
ok(
  "fichas: o alfinete diz ao leitor de tela se está marcado",
  achaPin(idF).getAttribute("aria-pressed") ===
    String(g("DADOS.fichas[0].fav === true")),
  achaPin(idF).getAttribute("aria-pressed"),
);
g('toggleFav("' + idF + '")'); // devolve como estava

/* ===== 2. Aba Quadros: o alfinete é a alça do barbante ===== */
g('setView("teorias");render()');
g(`
  var q = quadroAtual();
  q.nodes.length = 0; q.setas.length = 0;
  q.nodes.push({id:"qa",tipo:"ref",kind:"pista",ref:"f1",x:0,y:0});
  q.nodes.push({id:"qb",tipo:"ref",kind:"pista",ref:"f5",x:400,y:0});
  q.nodes.push({id:"qc",tipo:"ref",kind:"pista",ref:"f2",x:200,y:400});
  q.nodes.push({id:"qd",tipo:"ref",kind:"pista",ref:"f1",x:640,y:400});
  desenhaQuadro();
`);
const qpin = w.document.querySelector('.qnode[data-id="qa"] .qpin');
ok("quadros: a ficha tem alfinete", !!qpin);
ok(
  "quadros: o alfinete é a alça do barbante (data-conn com o id do cartão)",
  !!qpin && qpin.getAttribute("data-conn") === "qa",
  qpin && qpin.getAttribute("data-conn"),
);
ok(
  "quadros: a ficha não tem mais a bolinha ● (o alfinete substituiu)",
  w.document.querySelectorAll(".qnode.qref .qconn").length === 0,
);
ok(
  "quadros: texto e nota também têm alfinete, e a bolinha ● não existe mais",
  (function () {
    g('qNovoTextoEm(600,600,"nota");desenhaQuadro()');
    const alf = w.document.querySelector(".qnode.qtexto .qpin");
    const bolinha = w.document.querySelector(".qconn");
    const conecta = alf && alf.hasAttribute("data-conn");
    g(
      'var q=quadroAtual();q.nodes=q.nodes.filter(function(n){return n.tipo!=="texto"});desenhaQuadro()',
    );
    return !!alf && !bolinha && conecta;
  })(),
);

/* Arraste de verdade a partir do alfinete: pointerdown no alfinete,
   anda mais que o limiar e solta em cima do outro cartão. */
ok(
  "quadros: arrastar o ALFINETE cria o barbante até o outro cartão",
  g(`
    (function(){
      var q = quadroAtual(); q.setas.length = 0;
      function pe(t, el, x, y){ el.dispatchEvent(new MouseEvent(t,{bubbles:true,clientX:x,clientY:y})); }
      var pin = document.querySelector('.qnode[data-id="qa"] .qpin');
      var alvo = document.querySelector('.qnode[data-id="qb"]');
      pe("pointerdown", pin, 10, 10);
      pe("pointermove", pin, 90, 40);   // > limiar de 8px: vira arraste
      pe("pointerup", alvo, 300, 60);
      return q.setas.length === 1 && q.setas[0].de === "qa" && q.setas[0].para === "qb";
    })()
  `),
  g("JSON.stringify(quadroAtual().setas)"),
);
ok(
  "quadros: arrastar o alfinete NÃO arrasta o cartão junto",
  g('quadroAtual().nodes.find(function(n){return n.id==="qa"}).x') === 0,
);

/* ===== 3. Barbante preso em barbante ===== */
g(
  'var q=quadroAtual();q.setas.length=0;q.setas.push({id:"sA",de:"qa",para:"qb"});desenhaSetas()',
);
ok(
  "barbante: o barbante base foi desenhado",
  g('document.querySelectorAll("#qsvg path").length') > 0,
);
ok(
  "barbante: a linha carrega o id (não só a posição na lista)",
  g("!!document.querySelector('[data-seta-id=\"sA\"]')"),
);

// gruda um barbante novo NO barbante sA, no ponto onde "soltou"
const criou = g(`
  (function(){
    var alvo = document.querySelector('[data-seta-id="sA"]');
    var pp = qSetaPontos(quadroAtual(), quadroAtual().setas[0]);
    var meio = qPontoNaCurva(pp.p1, qCurvaCtrl(pp.p1, pp.p2), pp.p2, 0.25);
    return qLigarBarbante("qc", null, alvo, meio);
  })()
`);
ok("barbante: consegui ligar um cartão a um BARBANTE", criou === true);
ok(
  "barbante: virou uma seta nova",
  g("quadroAtual().setas.length") === 2,
  g("quadroAtual().setas.length"),
);
ok(
  'barbante: a ponta aponta para o barbante ("seta:sA")',
  g('quadroAtual().setas[1].para === "seta:sA"'),
  g("quadroAtual().setas[1]"),
);
const t = g("quadroAtual().setas[1].paraT");
ok(
  "barbante: gravou ONDE na linha grudou, perto do ponto solto (0,25)",
  typeof t === "number" && Math.abs(t - 0.25) < 0.06,
  t,
);
ok(
  "barbante: o barbante pendurado tem geometria (é desenhável)",
  g("!!qSetaPontos(quadroAtual(), quadroAtual().setas[1])"),
);
// o ponto de encontro cai EM CIMA da curva do barbante base
ok(
  "barbante: a ponta encosta exatamente na curva do outro barbante",
  g(`
    (function(){
      var q = quadroAtual();
      var base = qSetaPontos(q, q.setas[0]);
      var esperado = qPontoNaCurva(base.p1, qCurvaCtrl(base.p1, base.p2), base.p2, q.setas[1].paraT);
      var pend = qSetaPontos(q, q.setas[1]);
      return Math.hypot(pend.p2.x - esperado.x, pend.p2.y - esperado.y) < 0.01;
    })()
  `),
);
// e acompanha quando o cartão de apoio se mexe
const antes = g(
  "JSON.stringify(qSetaPontos(quadroAtual(), quadroAtual().setas[1]).p2)",
);
g(
  'var n=quadroAtual().nodes.find(function(x){return x.id==="qb"});n.x=700;n.y=180;desenhaSetas()',
);
ok(
  "barbante: o nó escorrega junto quando o cartão de apoio se move",
  g("JSON.stringify(qSetaPontos(quadroAtual(), quadroAtual().setas[1]).p2)") !==
    antes,
);

/* ===== 4. Barbante que SAI de outro barbante ===== */
const saiu = g(`
  (function(){
    var alvo = document.querySelector('.qnode[data-id="qd"]');
    return qLigarBarbante("seta:sA", 0.7, alvo, null);
  })()
`);
ok(
  "barbante: consigo puxar um barbante A PARTIR de outro barbante",
  saiu === true,
);
ok(
  "barbante: guardou de onde saiu na linha (deT)",
  g("quadroAtual().setas[2].de") === "seta:sA" &&
    g("quadroAtual().setas[2].deT") === 0.7,
  g("quadroAtual().setas[2]"),
);

/* ===== 4b. O NÓ da amarra (voltas + ponta cortada) e o arraste dele =====
   O quadro aqui tem: sA = qa—qb (as duas pontas em CARTÃO) ·
   setas[1] = qc—(sA em 0,25) · setas[2] = (sA em 0,7)—qd. */
g("desenhaSetas()");
ok(
  "nó: só as pontas amarradas em BARBANTE ganham pega de nó (2, não 4)",
  g('document.querySelectorAll("[data-no-i]").length') === 2,
  g('document.querySelectorAll("[data-no-i]").length'),
);
ok(
  "nó: as pegas são das setas certas (a ponta em cartão não tem nó)",
  g(`
    JSON.stringify([...document.querySelectorAll("[data-no-i]")]
      .map(function(c){ return c.getAttribute("data-no-i") + ":" + c.getAttribute("data-no-end"); }).sort())
  `) === JSON.stringify(["1:para", "2:de"]),
  g(`
    JSON.stringify([...document.querySelectorAll("[data-no-i]")]
      .map(function(c){ return c.getAttribute("data-no-i") + ":" + c.getAttribute("data-no-end"); }).sort())
  `),
);
ok(
  "nó: a geometria entrega a tangente da hospedeira (e null em cartão)",
  g(`
    (function(){
      var q = quadroAtual();
      var a = qSetaPontos(q, q.setas[0]), b = qSetaPontos(q, q.setas[1]);
      return !a.tan1 && !a.tan2 && !b.tan1 && !!b.tan2 &&
             Math.hypot(b.tan2.x, b.tan2.y) > 0;
    })()
  `),
);
// a pega fica EXATAMENTE onde a ponta encosta na hospedeira
ok(
  "nó: a pega do nó fica em cima do ponto de amarra",
  g(`
    (function(){
      var q = quadroAtual();
      var pp = qSetaPontos(q, q.setas[1]);
      var c = document.querySelector('[data-no-i="1"]');
      return Math.hypot(+c.getAttribute("cx") - pp.p2.x, +c.getAttribute("cy") - pp.p2.y) < 0.01;
    })()
  `),
);
// a ponta cortada PENDE: em qualquer sentido da hospedeira ela desce
const pende = (tx, ty) =>
  g(`
    (function(){
      var svg = qNoAmarra({x:100,y:100}, {x:${tx},y:${ty}}, "#b8452e");
      var ys = [];
      (svg.match(/d="[^"]*"/g) || []).forEach(function(d){
        var n = (d.match(/-?\\d+(\\.\\d+)?/g) || []).map(Number);
        for (var i = 1; i < n.length; i += 2) ys.push(n[i]);
      });
      return Math.max.apply(null, ys);
    })()
  `);
ok(
  "nó: a ponta cortada pende para baixo, venha a linha de onde vier",
  pende(1, 0) > 106 && pende(-1, 0) > 106,
  [pende(1, 0), pende(-1, 0)],
);
// arrastar o nó: muda ONDE ele está na linha, não em QUE linha
const moveu = g(`
  (function(){
    var q = quadroAtual();
    var pp = qSetaPontos(q, q.setas[0]);
    var p = qPontoNaCurva(pp.p1, qCurvaCtrl(pp.p1, pp.p2), pp.p2, 0.3);
    return qMoverNo(2, "de", p);
  })()
`);
ok("nó: consigo escorregar o nó pela linha (qMoverNo)", moveu === true);
ok(
  "nó: escorregar mudou o ponto (deT ≈ 0,3) e manteve a ligação",
  g('quadroAtual().setas[2].de') === "seta:sA" &&
    Math.abs(g("quadroAtual().setas[2].deT") - 0.3) < 0.06,
  g("quadroAtual().setas[2]"),
);
ok(
  "nó: soltar no mesmo lugar não conta como mudança",
  g(`
    (function(){
      var q = quadroAtual();
      var pp = qSetaPontos(q, q.setas[0]);
      var p = qPontoNaCurva(pp.p1, qCurvaCtrl(pp.p1, pp.p2), pp.p2, q.setas[2].deT);
      return qMoverNo(2, "de", p);
    })()
  `) === false,
);
g('quadroAtual().setas[2].deT = 0.7; desenhaSetas()'); // devolve como estava

/* ===== 5. Regras: só ligação ÚTIL, nada que se morda a si mesmo =====
   O quadro aqui tem: sA = qa—qb · setas[1] = qc—(meio de sA) ·
   setas[2] = (meio de sA)—qd. */
const recusa = (expr) => g(expr) === false;

ok(
  "regra: barbante NÃO liga numa ficha que ele mesmo já liga",
  recusa(
    `qLigarBarbante("seta:sA", 0.5, document.querySelector('.qnode[data-id="qb"]'), null)`,
  ),
);
ok(
  "regra: …nem na outra ponta dele",
  recusa(
    `qLigarBarbante("seta:sA", 0.5, document.querySelector('.qnode[data-id="qa"]'), null)`,
  ),
);
ok(
  "regra: a recusa explica o motivo (não é silenciosa)",
  typeof g("_qMotivo") === "string" && g("_qMotivo").length > 0,
  g("_qMotivo"),
);
ok(
  "regra: ficha não liga duas vezes na mesma ficha (mesmo sentido)",
  recusa(
    `qLigarBarbante("qa", null, document.querySelector('.qnode[data-id="qb"]'), null)`,
  ),
);
ok(
  "regra: nem no sentido CONTRÁRIO — puxar de qb para qa é o mesmo barbante",
  recusa(
    `qLigarBarbante("qb", null, document.querySelector('.qnode[data-id="qa"]'), null)`,
  ),
);
ok(
  "regra: um barbante não gruda nele mesmo",
  recusa(
    `qLigarBarbante("seta:sA", 0.5, document.querySelector('[data-seta-id="sA"]'), null)`,
  ),
);
ok(
  "regra: nem num barbante que já se apoia nele (laço)",
  recusa(`
    (function(){
      var filho = quadroAtual().setas[1];
      var el = document.querySelector('[data-seta-id="' + filho.id + '"]');
      return qLigarBarbante("seta:sA", 0.5, el, null);
    })()
  `),
);
ok(
  "regra: nem repetir a ligação cartão↔barbante que já existe",
  recusa(`
    (function(){
      return qLigarBarbante("qc", null, document.querySelector('[data-seta-id="sA"]'), {x:0,y:0});
    })()
  `),
);
ok(
  "regra: nenhuma dessas recusas criou seta",
  g("quadroAtual().setas.length") === 3,
  g("quadroAtual().setas.length"),
);
ok(
  "regra: o que É útil continua passando (qb ↔ qc, ainda sem ligação)",
  g(
    `qLigarBarbante("qb", null, document.querySelector('.qnode[data-id="qc"]'), null)`,
  ) === true,
);
g("var q=quadroAtual();q.setas.pop()"); // desfaz, para o resto do teste seguir
ok(
  "regra: religar uma ponta usa as MESMAS regras",
  g(`
    (function(){
      var q = quadroAtual();
      var i = q.setas.findIndex(function(s){ return s.id === "sA"; });
      // levar a ponta "para" de sA para qa deixaria qa—qa
      return qReligarSeta(i, "para", document.querySelector('.qnode[data-id="qa"]'), null);
    })()
  `) === false,
);

/* ===== 5b. A ponta nasce no ALFINETE, não no meio da ficha ===== */
ok(
  "ponta: o barbante começa no centro do alfinete do cartão",
  g(`
    (function(){
      var q = quadroAtual();
      var sA = q.setas.find(function(s){ return s.id === "sA"; });
      var pp = qSetaPontos(q, sA);
      var n = q.nodes.find(function(x){ return x.id === "qa"; });
      var alf = qAlfineteCentro(n, qNodeRect(n));
      return Math.abs(pp.p1.x - alf.x) < 0.01 && Math.abs(pp.p1.y - alf.y) < 0.01;
    })()
  `),
);
ok(
  "ponta: o alfinete fica no meio da largura e ACIMA da borda de cima",
  g(`
    (function(){
      var q = quadroAtual();
      var n = q.nodes.find(function(x){ return x.id === "qa"; });
      var r = qNodeRect(n);
      var alf = qAlfineteCentro(n, r);
      return Math.abs(alf.x - (r.x + r.w / 2)) < 0.01 && alf.y < r.y;
    })()
  `),
);
ok(
  "ponta: caixa de texto também amarra no alfinete dela",
  g(`
    (function(){
      var q = quadroAtual();
      var n = qNovoTextoEm(900, 900);
      desenhaQuadro();
      var r = qNodeRect(n);
      var alf = qAlfineteCentro(n, r);
      var p = qPonta(q, n.id, null, 0);
      var ok = alf && p && !p.rect &&
               Math.abs(p.centro.x - alf.x) < 0.01 &&
               Math.abs(p.centro.y - alf.y) < 0.01 && alf.y < r.y;
      q.nodes = q.nodes.filter(function(x){ return x.id !== n.id; });
      desenhaQuadro();
      return !!ok;
    })()
  `),
);

/* ===== 6. Apagar leva junto quem estava pendurado ===== */
g("desenhaSetas()");
const antesDel = g("quadroAtual().setas.length");
g(
  'var q=quadroAtual();qDelSeta(q.setas.findIndex(function(s){return s.id==="sA"}))',
);
ok(
  "apagar: sumir com o barbante base leva junto os pendurados nele",
  g("quadroAtual().setas.length") === 0,
  { antes: antesDel, depois: g("quadroAtual().setas.length") },
);

// mesma coisa apagando o CARTÃO que segura o barbante base
g(`
  var q = quadroAtual();
  q.setas.push({id:"sX",de:"qa",para:"qb"});
  q.setas.push({id:"sY",de:"seta:sX",deT:0.5,para:"qc"});
  desenhaSetas();
  qDelNode("qa");
`);
ok(
  "apagar: sumir com o cartão leva o barbante dele E os pendurados",
  g("quadroAtual().setas.length") === 0,
  g("quadroAtual().setas"),
);

/* ===== 7. Dados antigos (sem id) continuam funcionando ===== */
g(`
  var q = quadroAtual();
  q.nodes.push({id:"qa",tipo:"ref",kind:"pista",ref:"f1",x:0,y:0});
  q.setas.length = 0;
  q.setas.push({de:"qa",para:"qb"});      // seta velha, sem id
  desenhaQuadro();
`);
ok(
  "compatível: seta antiga sem id ganha um id ao desenhar",
  typeof g("quadroAtual().setas[0].id") === "string" &&
    g("quadroAtual().setas[0].id.length") > 0,
  g("quadroAtual().setas[0]"),
);
ok(
  "compatível: seta antiga (cartão→cartão) continua sendo desenhada",
  g("!!qSetaPontos(quadroAtual(), quadroAtual().setas[0])"),
);

ok("zero erros de runtime", erros.length === 0, erros.slice(0, 5));
console.log(
  falhas ? "\n=== " + falhas + " FALHA(S) ===" : "\n=== BARBANTE OK ===",
);
process.exit(falhas ? 1 : 0);

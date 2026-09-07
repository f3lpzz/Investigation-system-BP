/* -- Teorias -- */
let _qIdx = 0,
  _qSelSet = new Set(),
  _qMarq = null,
  _qDrag = null,
  _qPan = null,
  _qArrow = null,
  _qArrowCur = null;
function quadroAtual() {
  return (DADOS.quadros && DADOS.quadros[_qIdx]) || null;
}
/* Ícones da aba Quadros: SVG em vez de emoji (o emoji não herda a cor do
   tema e desenha diferente em cada sistema). Só desenho — nenhum estado. */
const QICO = {
  quadro:
    '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="6" r="1.6" fill="#b8452e"/><line x1="8" y1="7.5" x2="8" y2="10.5" stroke="currentColor" stroke-width="1.3"/></svg>',
  lupa: '<svg width="12" height="12" viewBox="0 0 13 13" aria-hidden="true"><circle cx="5.5" cy="5.5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8.6" y1="8.6" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"/></svg>',
  lista:
    '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" stroke-width="1.4"/><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.4"/><line x1="2" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1.4"/></svg>',
  fit: '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6V2.8h3.2M14 6V2.8h-3.2M2 10v3.2h3.2M14 10v3.2h-3.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  select:
    '<svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.4l8.2 6.1-3.6.5 2 4.1-1.7.8-2-4.2-2.9 2.3z" fill="currentColor"/></svg>',
  hand: '<svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true"><path d="M5.2 8V4.3a1 1 0 0 1 2 0V7m0-.4a1 1 0 0 1 2 0V7.4m0-.6a1 1 0 0 1 2 0v1.4m0-.7a1 1 0 0 1 2 0v2.6c0 2.1-1.6 3.6-3.8 3.6h-.7c-2.1 0-3.5-1.3-3.5-3.4V8.6" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ficha:
    '<svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.6" y="2" width="10.8" height="12" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="4.6" r="1.2" fill="#b8452e"/><line x1="5.2" y1="8.4" x2="10.8" y2="8.4" stroke="currentColor" stroke-width="1.2"/><line x1="5.2" y1="11" x2="9" y2="11" stroke="currentColor" stroke-width="1.2"/></svg>',
  nota: '<svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.6 2.6h10.8v7.2L9.8 13.4H2.6z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M13.4 9.8H9.8v3.6" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>',
  texto:
    '<svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.4 3.4h9.2M8 3.4v9.2M6.2 12.6h3.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  seta: '<svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 12.6C5.4 6.6 8.6 4.4 13 3.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="3" cy="12.6" r="1.9" fill="currentColor"/><circle cx="13" cy="3.4" r="1.9" fill="currentColor"/></svg>',
  duplicar:
    '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="5" y="5" width="9" height="9" rx="1.5" fill="var(--s2)" stroke="currentColor" stroke-width="1.3"/></svg>',
  lixo: '<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5h10M6.5 5V3.5h3V5M5 5l.7 8h4.6L11 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
};
/* Ferramentas da dock, na ordem da tarefa: primeiro NAVEGAR, depois
   COLOCAR NO QUADRO. O risco separa os dois grupos. */
const QFERR = [
  { id: "select", n: "Selecionar", k: "V" },
  { id: "hand", n: "Mão", k: "H", sep: true },
  { id: "ficha", n: "Ficha do arquivo", k: "F" },
  { id: "nota", n: "Nota adesiva", k: "N" },
  { id: "texto", n: "Texto", k: "T" },
  { id: "seta", n: "Barbante", k: "A" },
];
const QDICAS = {
  select: "Clique para selecionar · arraste para mover · Shift soma à seleção",
  hand: "Arraste para navegar · a barra de espaço faz o mesmo em qualquer ferramenta",
  ficha:
    "Escolha uma ficha, sala ou personagem do arquivo para espetar no quadro",
  nota: "Clique no quadro para colar uma nota",
  texto: "Clique no quadro para escrever · use @ para citar uma ficha",
  seta: "Arraste do alfinete de um cartão até o alfinete do outro",
};
/* No dedo o verbo muda e o que depende de teclado sai (não há Shift nem
   barra de espaço). Só as ferramentas cuja frase muda entram aqui; as
   outras seguem valendo a versão de cima. */
const QDICAS_TOQUE = {
  select: "Toque para selecionar · arraste para mover",
  hand: "Arraste para navegar pelo quadro",
  nota: "Toque no quadro para colar uma nota",
  texto: "Toque no quadro para escrever · use @ para citar uma ficha",
  seta: "Arraste do alfinete de um cartão até o alfinete do outro",
};
const QNOMES_FERR = {
  select: "Selecionar",
  hand: "Mão",
  ficha: "Ficha do arquivo",
  nota: "Nota adesiva",
  texto: "Texto",
  seta: "Barbante",
};
/* Quadros abertos há pouco, do mais recente para o mais antigo. Estado
   TRANSIENTE (não vai para o DADOS): serve só para a troca em 1 clique. */
let _qRecentes = [];
function qRecentes() {
  return _qRecentes
    .filter(
      (i, k) =>
        i !== _qIdx && i < DADOS.quadros.length && _qRecentes.indexOf(i) === k,
    )
    .slice(0, 3)
    .map((i) => ({ i: i, nome: DADOS.quadros[i].nome }));
}
function renderTeorias() {
  const box = document.getElementById("teorias");
  if (!box) return;
  if (!DADOS.quadros || !DADOS.quadros.length)
    DADOS.quadros = [
      { nome: "Quadro 1", cam: { x: 40, y: 40, s: 1 }, nodes: [], setas: [] },
    ];
  if (_qIdx >= DADOS.quadros.length) _qIdx = 0;
  const q = quadroAtual();
  const nIt = (q.nodes || []).length,
    nBa = (q.setas || []).length;
  const rec = qRecentes();
  const dock = `<div class="qdock" role="toolbar" aria-label="Ferramentas do quadro">${QFERR.map(
    (f) =>
      `<button class="qdockbtn" data-tool="${f.id}" onclick="qSetTool('${f.id}')" aria-label="${esc(f.n)}" title="${esc(f.n)} (${f.k}) — ${esc(QDICAS[f.id])}">${QICO[f.id]}<span class="k">${f.k}</span></button>` +
      (f.sep ? '<span class="qdock-sep"></span>' : ""),
  ).join("")}</div>`;
  box.innerHTML = `<div class="qbar">
    <button class="qchip" onclick="qPop()" aria-haspopup="dialog" aria-expanded="false" title="Trocar de quadro, renomear ou criar">
      <span class="qchip-ic">${QICO.quadro}</span>
      <span class="qchip-t">
        <span class="qchip-n">${esc(q.nome)}</span>
        <span class="qchip-m">${nIt} ${nIt === 1 ? "item" : "itens"} · ${nBa} ${nBa === 1 ? "barbante" : "barbantes"}</span>
      </span>
      <span class="qchip-c">▾</span>
    </button>
    ${
      rec.length
        ? `<div class="qrecentes"><span class="rot">RECENTES</span>${rec
            .map(
              (r) =>
                `<button class="qrec" onclick="trocarQuadro(${r.i})" title="Abrir este quadro">${esc(r.nome)}</button>`,
            )
            .join("")}</div>`
        : ""
    }
    <div class="topgrow"></div>
    <div class="qbusca" onclick="qBuscaAbrir()">${QICO.lupa}<input id="qBusca" type="search" placeholder="Buscar neste quadro…" aria-label="Buscar itens deste quadro" oninput="qBuscaInput(this.value)" onblur="qBuscaFechar()"></div>
    <button class="topbtn qlista" onclick="qLista()" aria-label="Lista de itens" title="Ver o quadro como lista — alcança todo item sem arrastar">${QICO.lista}<span class="rotulo">Lista de itens</span></button>
    ${qPopHTML()}
  </div>
  <div class="qcanvas" id="qcanvas"><div class="qworld" id="qworld"><svg class="qsvg" id="qsvg"></svg><div class="qnodes" id="qnodes"></div></div>
  ${
    !nIt
      ? `<div class="qvazio"><div class="qv-ic">🧵</div><div class="qv-tit">Quadro vazio</div><div class="qv-tx">${ehToque() ? "Toque em ＋ para adicionar uma ficha, nota ou texto e começar a teoria." : "Arraste fichas do arquivo ou crie uma nota para começar a teoria."}</div><div class="qv-btns"><button class="topbtn primary" onclick="qAddItem()">＋ Ficha do arquivo</button><button class="topbtn" onclick="qAddNota()">Nota</button></div></div>`
      : ""
  }
  ${dock}
  <div class="qhint" id="qhint" aria-live="polite"><span class="ferr"></span><span class="risco"></span><span class="tx"></span><button class="abrir" onclick="qAtalhos()" title="Todos os atalhos do quadro">Atalhos <span class="kbd">?</span></button></div>
  ${qAtalhosHTML()}
  <div class="qzoom">
    <button class="pm menos" onclick="qZoomPasso(1/1.2)" title="Diminuir o zoom" aria-label="Diminuir o zoom">−</button>
    <button class="v" id="qzoomv" onclick="qZoom100()" title="Voltar a 100% (Shift+0)">100%</button>
    <button class="pm mais" onclick="qZoomPasso(1.2)" title="Aumentar o zoom" aria-label="Aumentar o zoom">+</button>
    <span class="sep"></span>
    <button class="fit" onclick="qFitCamera()" aria-label="Ajustar tudo à tela" title="Ajustar tudo à tela (Shift+1)">${QICO.fit}<span class="rotulo">Ajustar</span></button>
  </div></div>`;
  wireQuadro();
  desenhaQuadro();
  qSetTool(_qTool); // restaura a ferramenta ativa (a barra é recriada a cada render)
}
function trocarQuadro(i) {
  if (i !== _qIdx) _qRecentes.unshift(_qIdx);
  _qRecentes = _qRecentes.slice(0, 8);
  _qIdx = i;
  _qSelSet = new Set();
  renderTeorias();
}
/* ---- Popover de quadros: era a fileira de abas + o menu ··· ---- */
function qPopItensHTML(filtro) {
  const f = (filtro || "").trim().toLowerCase();
  const itens = DADOS.quadros
    .map((q, i) => ({ q: q, i: i }))
    .filter((o) => !f || o.q.nome.toLowerCase().includes(f))
    .map(function (o) {
      const n = (o.q.nodes || []).length,
        ab = o.i === _qIdx;
      return `<button class="qpop-it" onclick="trocarQuadro(${o.i});qPop(false)">
        ${ab ? '<span class="marca"></span>' : ""}
        <span class="txt"><span class="nome">${esc(o.q.nome)}</span>
          <span class="det">${ab ? "aberto · " : ""}${n} ${n === 1 ? "item" : "itens"}</span>
        </span>
        ${ab ? '<span class="tag">ABERTO</span>' : ""}
      </button>`;
    })
    .join("");
  return itens || '<div class="qpop-vazio">Nenhum quadro com esse nome.</div>';
}
function qPopHTML() {
  return `<div class="qpop" id="qpop" role="dialog" aria-label="Quadros">
    <div class="qpop-busca"><div class="qbusca">${QICO.lupa}<input id="qpopf" placeholder="Filtrar ${DADOS.quadros.length} ${DADOS.quadros.length === 1 ? "quadro" : "quadros"}…" aria-label="Filtrar quadros" oninput="qPopFiltrar(this.value)"></div></div>
    <div class="qpop-lista">${qPopItensHTML()}</div>
    <div class="qpop-pe">
      <button class="mmit novo" onclick="novoQuadro()">＋ Novo quadro</button>
      <div class="topgrow"></div>
      <button class="mmit" onclick="renomearQuadro(_qIdx)" title="Renomear o quadro aberto">Renomear</button>
      <button class="mmit" onclick="qDuplicarQuadro()" title="Duplicar o quadro aberto">Duplicar</button>
      <button class="mmit del" onclick="excluirQuadro()" title="Excluir o quadro aberto">Excluir</button>
    </div>
  </div>`;
}
function qPop(abrir) {
  // No toque o chip continua chamando o sheet de ações (alvo de 44px e
  // rolagem nativa); o popover é do mouse/teclado.
  if (ehToque()) {
    qEscolherQuadro();
    return;
  }
  const el = document.getElementById("qpop");
  if (!el) return;
  const on = abrir === undefined ? !el.classList.contains("open") : !!abrir;
  const chip = document.querySelector(".qchip");
  if (chip) chip.setAttribute("aria-expanded", on ? "true" : "false");
  if (on) {
    el.classList.add("open");
    // `fechar` também vale para o Esc, que fecha pela pilha de overlays.
    overlayAbrir(el, {
      id: "qpop",
      jaAberto: true,
      focoEm: "#qpopf",
      fechar: qPopFechado,
    });
  } else {
    overlayFechar("qpop");
    qPopFechado();
  }
}
function qPopFechado() {
  const el = document.getElementById("qpop");
  if (el) el.classList.remove("open");
  const chip = document.querySelector(".qchip");
  if (chip) chip.setAttribute("aria-expanded", "false");
}
/* Filtrar só troca a LISTA: o #qpop continua o mesmo elemento, então nem a
   pilha de overlays nem o foco do campo são mexidos a cada tecla. */
function qPopFiltrar(v) {
  const lista = document.querySelector("#qpop .qpop-lista");
  if (lista) lista.innerHTML = qPopItensHTML(v);
}
// Cópia profunda do quadro aberto (ids de nó e de barbante só precisam ser
// únicos DENTRO do quadro, então a cópia crua já serve).
function qDuplicarQuadro() {
  const q = quadroAtual();
  if (!q) return;
  const copia = JSON.parse(JSON.stringify(q));
  copia.nome = q.nome + " (cópia)";
  DADOS.quadros.splice(_qIdx + 1, 0, copia);
  _qRecentes = [];
  marcarAlterado();
  trocarQuadro(_qIdx + 1);
}
/* Busca do quadro: destaca quem casa e apaga o brilho dos outros. Mesma
   regra de nome do qLista — ler e filtrar contam a mesma história. */
function qNomeDoNo(n) {
  if (n.tipo === "texto")
    return (
      (n.texto || "").replace(/<[^>]*>/g, "").slice(0, 80) ||
      (n.estilo === "nota" ? "nota" : "texto")
    );
  return qRefInfo(n).nome;
}
/* No tablet a busca vive encolhida como um botão-lupa de 44px: tocar nela
   abre o campo por cima da barra, e ele se recolhe ao sair vazio. No
   desktop o campo já está aberto e estas duas funções não fazem nada
   visível (a classe não muda nada acima de 1100px). */
function qBuscaAbrir() {
  const el = document.querySelector(".qbusca");
  if (!el) return;
  el.classList.add("aberta");
  const inp = document.getElementById("qBusca");
  if (inp) inp.focus();
}
function qBuscaFechar() {
  const el = document.querySelector(".qbusca"),
    inp = document.getElementById("qBusca");
  // Com texto digitado ela fica aberta: recolher esconderia o filtro ativo.
  if (el && inp && !inp.value.trim()) el.classList.remove("aberta");
}
function qBuscaInput(v) {
  const q = quadroAtual();
  if (!q) return;
  const f = (v || "").trim().toLowerCase();
  q.nodes.forEach(function (n) {
    const el = nodeEl(n.id);
    if (!el) return;
    const casa = !f || qNomeDoNo(n).toLowerCase().includes(f);
    el.classList.toggle("qbusca-off", !!f && !casa);
    el.classList.toggle("qbusca-hit", !!f && casa);
  });
}
/* Seletor de quadro do celular: a lista substitui as abas (P04) */
function qEscolherQuadro() {
  const itens = DADOS.quadros.map(function (q, i) {
    const n = (q.nodes || []).length;
    return {
      rotulo: q.nome,
      detalhe:
        (i === _qIdx ? "aberto · " : "") + n + (n === 1 ? " item" : " itens"),
      fn: function () {
        trocarQuadro(i);
      },
    };
  });
  itens.push({
    rotulo: "＋ Novo quadro",
    fn: function () {
      novoQuadro();
    },
  });
  abrirSheetAcoes("Quadros", itens);
}
function novoQuadro() {
  DADOS.quadros.push({
    nome: "Quadro " + (DADOS.quadros.length + 1),
    cam: { x: 40, y: 40, s: 1 },
    nodes: [],
    setas: [],
  });
  marcarAlterado();
  trocarQuadro(DADOS.quadros.length - 1);
}
function renomearQuadro(i) {
  const nv = prompt("Nome do quadro:", DADOS.quadros[i].nome);
  if (nv && nv.trim()) {
    DADOS.quadros[i].nome = nv.trim();
    marcarAlterado();
    renderTeorias();
  }
}
function excluirQuadro() {
  if (DADOS.quadros.length <= 1) {
    alert("Precisa ter pelo menos um quadro.");
    return;
  }
  if (!confirm('Excluir o quadro "' + quadroAtual().nome + '"?')) return;
  DADOS.quadros.splice(_qIdx, 1);
  _qIdx = 0;
  _qRecentes = []; // os índices andaram: a lista de recentes apontaria errado
  marcarAlterado();
  renderTeorias();
}
function qRefInfo(n) {
  if (n.kind === "pista") {
    const f = fichas.find((x) => x.id === n.ref);
    return {
      icon: "🗂",
      nome: f ? f.titulo || "(sem título)" : "(removida)",
      img: f ? pg0(f).imagem : "",
    };
  }
  const e = acharEnt(entListaDe(n.kind), n.ref);
  return {
    icon:
      n.kind === "sala"
        ? "🚪"
        : n.kind === "grupo"
          ? "📦"
          : n.kind === "colecao"
            ? "📚"
            : "👤",
    nome: e ? e.nome : n.ref,
    img: e ? e.imagem : "",
  };
}
/* A dica do alfinete só nasce enquanto o quadro NÃO tem barbante e há para
   onde amarrar (2+ cartões) — e some para sempre no primeiro barbante. */
function qDicaAlfinete() {
  const q = quadroAtual();
  if (!q || (q.setas || []).length) return null;
  return (q.nodes || []).length >= 2 ? q.nodes[0] : null;
}
function nodeHTML(n) {
  const sel = _qSelSet.has(n.id) ? " sel" : "";
  const alvoDica = qDicaAlfinete();
  const pinCls =
    "qpin" + (alvoDica && alvoDica.id === n.id ? " qpin-dica" : "");
  if (n.tipo === "texto") {
    // "estilo: nota" é ADITIVO: ausente = caixa de texto normal (dados antigos).
    // A cor é um ÍNDICE numa paleta fixa (nunca CSS vindo dos dados).
    const nota = n.estilo === "nota";
    const corBg = nota
      ? `;background:${QCORES_NOTA[(n.cor | 0) % QCORES_NOTA.length]}`
      : "";
    // Texto e nota também são espetados no quadro: mesmo alfinete da ficha,
    // e é dele que se puxa o barbante (a bolinha ● antiga saiu de cena).
    // Excluir e trocar a cor moram na barra da seleção — o ✕ e o 🎨 que
    // apareciam no hover saíram do papel (ver .qacoes).
    // 2 cliques entram na escrita; 1 clique só marca o cartão.
    return `<div class="qnode qtexto${nota ? " qnota" : ""}${sel}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${n.w || 250}px${corBg}" ondblclick="qFocarTexto('${n.id}')"><span class="${pinCls}" data-conn="${n.id}" title="Arraste o alfinete para ligar um barbante"></span><div class="qhandle" data-drag="${n.id}">≡ ${nota ? "nota" : "texto"}</div><div class="qtxt menteditor" contenteditable="true" data-qid="${n.id}" data-ph="Escreva... use @ para citar" oninput="teoEditorInput(this)">${window.Catalogo.htmlSeguro(n.texto || "")}</div></div>`;
  }
  const info = qRefInfo(n);
  const thumb = info.img
    ? `<div class="qthumb"><img src="${esc(info.img)}" onerror="this.parentNode.style.display='none'"></div>`
    : "";
  // Ficha no quadro = papel com alfinete vermelho, código e título serif.
  // O alfinete É a alça do barbante: segurar nele e arrastar puxa a linha
  // (por isso a ficha não tem mais a bolinha ● de conectar).
  // O código anda junto do título, na mesma linha (span, não bloco), no
  // mesmo molde do card da grade: f1 → F-001.
  const cod =
    n.kind === "pista" ? `<span class="qcod">${esc(idVisual(n.ref))}</span>` : "";
  return `<div class="qnode qref${sel}" data-id="${n.id}" data-drag="${n.id}" style="left:${n.x}px;top:${n.y}px" ondblclick="qOpenRef('${n.id}')"><span class="${pinCls}" data-conn="${n.id}" title="Arraste o alfinete para ligar um barbante"></span><div class="qreftit">${cod}<span class="qname">${esc(info.nome)}</span></div>${thumb}</div>`;
}
function desenhaQuadro() {
  const q = quadroAtual();
  if (!q) return;
  // Some o cartão "Quadro vazio" assim que o primeiro item entra
  const qv = document.querySelector(".qvazio");
  if (qv && (q.nodes || []).length) qv.remove();
  aplicaCam();
  const nd = document.getElementById("qnodes");
  if (nd) nd.innerHTML = q.nodes.map(nodeHTML).join("");
  desenhaSetas(); // ela termina chamando o qCoach (o SVG é reescrito lá)
  markSelDom(); // a barra de ações nasce aqui (o innerHTML acima a levou)
  const b = document.getElementById("qBusca");
  if (b && b.value) qBuscaInput(b.value);
}
/* Contagem do chip: quem edita o quadro chama desenhaQuadro, não
   renderTeorias — sem isto o "12 itens" continuaria dizendo 11. */
function qChipMeta() {
  const q = quadroAtual(),
    el = document.querySelector(".qchip-m");
  if (!q || !el) return;
  const nIt = (q.nodes || []).length,
    nBa = (q.setas || []).length;
  el.textContent = `${nIt} ${nIt === 1 ? "item" : "itens"} · ${nBa} ${nBa === 1 ? "barbante" : "barbantes"}`;
}
/* Anotação de primeira vez: texto datilografado + risco pontilhado até o
   alfinete. Vive no .qworld, então anda e escala junto com a câmera. */
function qCoach() {
  const nd = document.getElementById("qnodes"),
    svg = document.getElementById("qsvg");
  if (!nd || !svg) return;
  const velho = nd.querySelector(".qcoach");
  if (velho) velho.remove(); // o SVG é reescrito inteiro; o texto, não
  const alvo = qDicaAlfinete();
  if (!alvo) return;
  // Mesmo cálculo que o barbante usa para nascer no alfinete (qNodeRect).
  const p = qAlfineteCentro(alvo, qNodeRect(alvo));
  if (!p) return;
  svg.insertAdjacentHTML(
    "beforeend",
    `<path d="M${p.x + 18} ${p.y - 14} Q${p.x + 65} ${p.y - 36} ${p.x + 115} ${p.y - 36}" fill="none" stroke="#d8c9ae" stroke-width="1" stroke-opacity=".45" stroke-dasharray="3 3" style="pointer-events:none"/>`,
  );
  nd.insertAdjacentHTML(
    "beforeend",
    `<div class="qcoach" style="left:${p.x + 123}px;top:${p.y - 50}px">Puxe o alfinete para amarrar um barbante em outro cartão</div>`,
  );
}
function aplicaCam() {
  const q = quadroAtual();
  const w = document.getElementById("qworld");
  if (w && q)
    w.style.transform = `translate(${q.cam.x}px,${q.cam.y}px) scale(${q.cam.s})`;
  // A etiqueta de zoom nunca mente: quem atualiza é o dono da câmera.
  const v = document.getElementById("qzoomv");
  if (v && q) v.textContent = Math.round(q.cam.s * 100) + "%";
  // O fundo do quadro é um degradê liso e parado — nada a mover aqui.
}
function nodeEl(id) {
  return document.querySelector(
    '.qnode[data-id="' +
      (window.CSS && CSS.escape ? CSS.escape(id) : id) +
      '"]',
  );
}
/* Marca a seleção e, com EXATAMENTE um item marcado, pendura nele a barra
   de ações. Ela nasce dentro do .qnode, então acompanha o cartão ao
   arrastar e ao dar zoom sem nenhuma conta extra. */
function markSelDom() {
  const q = quadroAtual();
  if (!q) return;
  const um = _qSelSet.size === 1 && !_qSetaSel.size;
  q.nodes.forEach(function (n) {
    const el = nodeEl(n.id);
    if (!el) return;
    const sel = _qSelSet.has(n.id);
    el.classList.toggle("sel", sel);
    const barra = el.querySelector(".qacoes");
    if (sel && um && !barra) el.insertAdjacentHTML("afterbegin", qAcoesHTML(n));
    if ((!sel || !um) && barra) barra.remove();
    if (sel && um) qAcoesLado(el);
  });
}
/* A barra nasce ACIMA do cartão. Se o cartão estiver colado no topo do
   quadro, ela sairia da tela — aí vira para baixo. Roda a cada
   markSelDom, então acompanha o cartão enquanto ele é arrastado. */
function qAcoesLado(el) {
  const barra = el.querySelector(".qacoes"),
    cv = document.getElementById("qcanvas");
  if (!barra || !cv) return;
  const rn = el.getBoundingClientRect(),
    rc = cv.getBoundingClientRect();
  barra.classList.toggle("abaixo", rn.top - rc.top < 60);
}
function qAcoesHTML(n) {
  const nota = n.tipo === "texto" && n.estilo === "nota";
  const cor = nota
    ? `<button onclick="qCorNota('${n.id}')" title="Mudar a cor da nota" aria-label="Mudar a cor da nota"><span class="amostra"></span></button>`
    : "";
  const texto =
    n.tipo === "texto"
      ? `<button onclick="qFocarTexto('${n.id}')" title="Escrever no cartão" aria-label="Escrever no cartão">Aa</button>`
      : "";
  return `<div class="qacoes" onmousedown="event.stopPropagation()">${cor}${texto}<button onclick="qDuplicarSelecao()" title="Duplicar (Ctrl+D)" aria-label="Duplicar">${QICO.duplicar}</button><span class="sep"></span><button class="del" onclick="qDelNode('${n.id}')" title="Excluir (Del)" aria-label="Excluir">${QICO.lixo}</button></div>`;
}
function qFocarTexto(id) {
  const el = nodeEl(id);
  const ed = el && el.querySelector(".qtxt");
  if (ed) ed.focus();
}
/* Tira o foco do editor de um cartão quando o clique cai FORA dele.
   Devolve true se soltou. Clicar dentro do próprio editor não mexe em
   nada — é assim que se posiciona o cursor no texto. */
function qSoltarEditor(alvo) {
  const ed = document.activeElement;
  if (!ed || !ed.classList || !ed.classList.contains("qtxt")) return false;
  if (alvo && ed.contains(alvo)) return false;
  ed.blur();
  return true;
}
/* Barra do barbante: mora no nó do meio da curva, onde o clique já
   seleciona a seta. Vive no .qworld para andar junto com a câmera. */
function qAcoesSeta() {
  const nd = document.getElementById("qnodes");
  if (!nd) return;
  const velha = nd.querySelector(".qacoes-seta");
  if (velha) velha.remove();
  const q = quadroAtual();
  if (!q || _qSetaSel.size !== 1 || _qSelSet.size) return;
  const i = [..._qSetaSel][0],
    se = q.setas[i];
  if (!se) return;
  const pp = qSetaPontos(q, se);
  if (!pp) return;
  const m = qPontoNaCurva(pp.p1, qCurvaCtrl(pp.p1, pp.p2), pp.p2, 0.5);
  nd.insertAdjacentHTML(
    "beforeend",
    `<div class="qacoes qacoes-seta" style="position:absolute;left:${m.x}px;top:${m.y}px" onmousedown="event.stopPropagation()"><button onclick="qRotuloSeta(${i})" title="Rótulo do barbante" aria-label="Rótulo do barbante">Aa</button><span class="sep"></span><button class="del" onclick="qDelSeta(${i})" title="Excluir (Del)" aria-label="Excluir o barbante">${QICO.lixo}</button></div>`,
  );
}
/* Quem o laço pega: basta ENCOSTAR. Antes exigia que o CENTRO do cartão
   caísse dentro do retângulo, o que obrigava a cobrir quase o cartão
   inteiro — e, pior, marcava cartão nenhum sobre o qual o laço passava
   de raspão enquanto marcava outro que o laço mal tocava.
   A medida sai do próprio elemento (getBoundingClientRect), que já vem
   em pixels de tela com câmera e zoom da interface aplicados — sem
   refazer a conta à mão, que era de onde vinha o desencontro. */
function qNodesInRect(q, m) {
  const x0 = Math.min(m.x0, m.x1),
    x1 = Math.max(m.x0, m.x1),
    y0 = Math.min(m.y0, m.y1),
    y1 = Math.max(m.y0, m.y1);
  const s = new Set();
  q.nodes.forEach(function (n) {
    const el = nodeEl(n.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Retângulos que se cruzam (em qualquer pedaço) = selecionado.
    if (r.right >= x0 && r.left <= x1 && r.bottom >= y0 && r.top <= y1)
      s.add(n.id);
  });
  return s;
}
function nodeCenter(n) {
  const el = nodeEl(n.id);
  const w = el ? el.offsetWidth : 120,
    hh = el ? el.offsetHeight : 40;
  return { x: n.x + w / 2, y: n.y + hh / 2 };
}
function desenhaSetas() {
  const q = quadroAtual();
  const svg = document.getElementById("qsvg");
  if (!svg || !q) return;
  // Barbante vermelho: curva com leve "barriga", sem ponta de seta
  // Três camadas de desenho, nesta ordem: linhas, nós de amarra, alças.
  // Assim o nó nunca fica escondido sob o barbante hospedeiro (que pode ser
  // desenhado depois), e a alça de religar continua por cima do nó.
  let s = "",
    sNo = "",
    sAlca = "";
  qIdsSetas(q);
  q.setas.forEach(function (se, i) {
    // Geometria derivada (estilo tldraw): mira o centro, corta na borda.
    const pp = qSetaPontos(q, se);
    if (!pp) return;
    let p1 = pp.p1,
      p2 = pp.p2;
    const religando = _qRebind && _qRebind.i === i && _qRebindCur;
    if (religando) {
      if (_qRebind.end === "de") p1 = _qRebindCur;
      else p2 = _qRebindCur;
    }
    const sel = _qSetaSel.has(i);
    const cor = sel ? "#e0be7a" : "#b8452e";
    const dPath = qCurvaD(p1, p2);
    /* Fibra do barbante: seis camadas sobre o MESMO dPath — sombra no quadro,
       alma, corpo, brilho e o par torção/vale que dá o grão da corda.
       Religando, ficam só as quatro primeiras: as fibras atrapalhariam a
       leitura do tracejado de arraste. */
    const w = sel ? 3.2 : 2.6;
    const L = (c, lw, extra) =>
      `<path d="${dPath}" fill="none" stroke="${c}" stroke-width="${lw}" stroke-linecap="round" ${extra || ""}/>`;
    s += L("#241408", w + 1.8, 'stroke-opacity=".42" transform="translate(1.5,3)"');
    s += L(sel ? "#8a6a1e" : "#7d2417", w + 1);
    s += L(cor, w, religando ? 'stroke-dasharray="5 4"' : "");
    s += L("#e8a68d", 0.9, 'stroke-opacity=".32" transform="translate(-.6,-.9)"');
    if (!religando) {
      s += L("#f2bda6", 0.9, 'stroke-opacity=".3" stroke-dasharray="1 1.5" transform="translate(-.4,-.6)"');
      s += L("#3f1108", 0.9, 'stroke-opacity=".22" stroke-dasharray="1 1.5" stroke-dashoffset="1.25"');
    }
    s += `<path d="${dPath}" fill="none" stroke="transparent" stroke-width="14" style="pointer-events:stroke;cursor:crosshair" data-seta="${i}" data-seta-id="${esc(se.id)}" onclick="qSelSeta(${i})" ondblclick="qRotuloSeta(${i})"><title>Clique: selecionar (Del apaga) · 2 cliques: rótulo · arraste: puxa outro barbante daqui</title></path>`;
    // Nó no meio do barbante: é daqui que se puxa um barbante NOVO (o
    // arraste funciona em qualquer ponto da linha; o nó é a dica visual).
    const meio = qPontoNaCurva(p1, qCurvaCtrl(p1, p2), p2, 0.5);
    if (!religando) {
      s += `<circle cx="${meio.x}" cy="${meio.y}" r="${sel ? 4.5 : 3.5}" fill="${cor}" stroke="#3a1a12" stroke-width="1" style="pointer-events:none"/>`;
    }
    if (se.rotulo) {
      // O rótulo desce junto com a linha: fica logo acima do nó do meio.
      s += `<text x="${meio.x}" y="${meio.y - 10}" text-anchor="middle" font-size="12" fill="#f0d878" font-family="'Special Elite',monospace" paint-order="stroke" stroke="#3a281a" stroke-width="3" style="pointer-events:none">${esc(se.rotulo)}</text>`;
    }
    /* Nó de amarra: onde ESTA ponta se apoia em outro barbante, ela dá voltas
       na linha hospedeira e sobra uma ponta cortada. Só aparece com a ponta
       amarrada de verdade — religando, ela está no ar. A rodela invisível por
       cima é a pega: arrastar escorrega o nó ao longo da hospedeira. */
    const alma = sel ? "#8a6a1e" : "#7d2417";
    if (!religando) {
      if (qEhPontaSeta(se.de) && pp.tan1) {
        sNo += qNoAmarra(p1, pp.tan1, cor, alma) + qNoPega(i, "de", p1);
      }
      if (qEhPontaSeta(se.para) && pp.tan2) {
        sNo += qNoAmarra(p2, pp.tan2, cor, alma) + qNoPega(i, "para", p2);
      }
    }
    if (sel && _qSetaSel.size === 1 && !religando) {
      // Alças das pontas (só com UMA seta selecionada): arrastar reconecta.
      sAlca += `<circle cx="${p1.x}" cy="${p1.y}" r="6" fill="#e3c074" stroke="#14100b" stroke-width="1.5" data-seta-end="de" data-seta-i="${i}" style="pointer-events:all;cursor:grab"><title>Arraste para reconectar</title></circle>`;
      sAlca += `<circle cx="${p2.x}" cy="${p2.y}" r="6" fill="#e3c074" stroke="#14100b" stroke-width="1.5" data-seta-end="para" data-seta-i="${i}" style="pointer-events:all;cursor:grab"><title>Arraste para reconectar</title></circle>`;
    }
  });
  if (_qArrow && _qArrowCur) {
    // A origem pode ser um cartão OU um ponto de outro barbante.
    const A = qPonta(q, _qArrow.de, _qArrow.deT, 0);
    if (A) {
      const ca = A.centro;
      s += `<line x1="${ca.x}" y1="${ca.y}" x2="${_qArrowCur.x}" y2="${_qArrowCur.y}" stroke="#b8452e" stroke-width="2" stroke-dasharray="5 4"/>`;
    }
  }
  svg.innerHTML = s + sNo + sAlca;
  qCoach(); // a anotação da primeira vez é redesenhada junto com o SVG
  qAcoesSeta(); // barra de ação do barbante selecionado
  qChipMeta(); // a contagem do chip não pode envelhecer no meio da edição
}
// Pega invisível do nó de amarra: arrastar escorrega o nó pela hospedeira.
function qNoPega(i, end, p) {
  return `<circle cx="${p.x}" cy="${p.y}" r="9" fill="transparent" data-no-i="${i}" data-no-end="${end}" style="pointer-events:all;cursor:grab"><title>Arraste o nó para movê-lo pelo barbante</title></circle>`;
}
/* Câmera dos Quadros nas mesmas convenções do Mapa (canvas infinito):
   limites unificados, Shift+1 = enquadrar, Shift+0 = 100%, zoom persistido. */
const QUADRO_ZOOM_MIN = 0.1,
  QUADRO_ZOOM_MAX = 8;
let _qCamTimer = null;
// Persistência com atraso: navegar (zoom) não grava a cada tick da roda.
function qAgendaSalvarCam() {
  clearTimeout(_qCamTimer);
  _qCamTimer = setTimeout(function () {
    marcarAlterado();
  }, 800);
}
function qBounds(q) {
  let a = 1e9,
    b = 1e9,
    c = -1e9,
    d = -1e9;
  q.nodes.forEach(function (n) {
    const el = nodeEl(n.id);
    const w = el ? el.offsetWidth : 250,
      h = el ? el.offsetHeight : 80;
    if (n.x < a) a = n.x;
    if (n.y < b) b = n.y;
    if (n.x + w > c) c = n.x + w;
    if (n.y + h > d) d = n.y + h;
  });
  return a > c ? null : { minX: a, minY: b, maxX: c, maxY: d };
}
function qFitCamera() {
  const q = quadroAtual(),
    cv = document.getElementById("qcanvas");
  if (!q || !cv) return;
  const bb = qBounds(q);
  if (!bb) return;
  const W = cv.clientWidth || 700,
    H = cv.clientHeight || 450,
    m = 60;
  const w = bb.maxX - bb.minX || 1,
    h = bb.maxY - bb.minY || 1;
  q.cam.s = Math.max(
    QUADRO_ZOOM_MIN,
    Math.min((W - m * 2) / w, (H - m * 2) / h, 1.4),
  );
  q.cam.x = W / 2 - ((bb.minX + bb.maxX) / 2) * q.cam.s;
  q.cam.y = H / 2 - ((bb.minY + bb.maxY) / 2) * q.cam.s;
  aplicaCam();
  qAgendaSalvarCam();
}
function qZoom100() {
  const q = quadroAtual(),
    cv = document.getElementById("qcanvas");
  if (!q || !cv) return;
  const W = cv.clientWidth || 700,
    H = cv.clientHeight || 450;
  const cx = (W / 2 - q.cam.x) / q.cam.s,
    cy = (H / 2 - q.cam.y) / q.cam.s;
  q.cam.s = 1;
  q.cam.x = W / 2 - cx;
  q.cam.y = H / 2 - cy;
  aplicaCam();
  qAgendaSalvarCam();
}
/* Ferramentas dos Quadros (estilo tldraw): UMA ferramenta ativa por vez;
   Esc volta pra seleção. Estado transiente (não vai para o DADOS). */
let _qTool = "select"; // select | hand | texto | nota | seta
const QCORES_NOTA = ["#f5d76e", "#ffb8dd", "#8ff0b4", "#9cc9ff", "#ffc09f"];
function qSetTool(t) {
  // "ficha" não é um modo: abre o seletor do arquivo e devolve a seleção.
  if (t === "ficha") {
    qAddItem();
    qSetTool("select");
    return;
  }
  _qTool = t;
  _qArrow = null;
  _qArrowCur = null;
  const cv = document.getElementById("qcanvas");
  if (cv) {
    // O CSS lê isto para acender todos os alfinetes na ferramenta Barbante.
    cv.dataset.qtool = t;
    cv.style.cursor =
      t === "hand" ? "grab" : t === "select" ? "default" : "crosshair";
  }
  document.querySelectorAll(".qdockbtn").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-tool") === t);
  });
  qDica(t);
}
/* Dica do rodapé: mostra a ferramenta ativa e o que fazer com ela. É uma
   região viva (aria-live) — a troca é anunciada sem roubar o foco. */
function qDica(t) {
  const el = document.getElementById("qhint");
  if (!el || !QDICAS[t]) return;
  el.querySelector(".ferr").textContent = QNOMES_FERR[t];
  const frase = (ehToque() && QDICAS_TOQUE[t]) || QDICAS[t];
  const tx = el.querySelector(".tx");
  tx.textContent = frase;
  tx.title = frase; // em tela estreita o texto corta: o title devolve
}
const QATALHOS = [
  {
    titulo: "FERRAMENTAS",
    itens: [
      { k: "V", d: "Selecionar" },
      { k: "H", d: "Mão" },
      { k: "F", d: "Ficha do arquivo" },
      { k: "N", d: "Nota" },
      { k: "T", d: "Texto" },
      { k: "A", d: "Barbante" },
      { k: "Esc", d: "Volta para selecionar" },
    ],
  },
  {
    titulo: "NAVEGAR",
    itens: [
      { k: "Espaço", d: "Arraste para mover o quadro" },
      { k: "Scroll", d: "Move · com Ctrl dá zoom" },
      { k: "Shift 1", d: "Ajustar tudo à tela" },
      { k: "Shift 0", d: "Voltar a 100%" },
    ],
  },
  {
    titulo: "EDITAR",
    itens: [
      { k: "Del", d: "Apaga a seleção" },
      { k: "Ctrl D", d: "Duplica a seleção" },
      { k: "Ctrl Z", d: "Desfaz" },
      { k: "Shift", d: "Soma à seleção" },
    ],
  },
  {
    titulo: "BARBANTE",
    itens: [
      { k: "Arraste", d: "Do alfinete até outro cartão" },
      { k: "2 cliques", d: "Escreve o rótulo da ligação" },
      { k: "Arraste", d: "Na ponta, religa em outro cartão" },
      { k: "Del", d: "Apaga o barbante marcado" },
    ],
  },
];
function qAtalhosHTML() {
  return `<div class="qatalhos" id="qatalhos" role="dialog" aria-label="Atalhos do quadro">
    <div class="hd"><div class="tit">Atalhos do quadro</div><div class="topgrow"></div><button class="qfechar" onclick="qAtalhos(false)" aria-label="Fechar">✕</button></div>
    <div class="cols">${QATALHOS.map(
      (g) =>
        `<div class="gr"><div class="gt">${g.titulo}</div>${g.itens
          .map(
            (a) =>
              `<div class="li"><span class="k">${a.k}</span><span class="d">${a.d}</span></div>`,
          )
          .join("")}</div>`,
    ).join("")}</div>
  </div>`;
}
function qAtalhos(abrir) {
  const el = document.getElementById("qatalhos");
  if (!el) return;
  const on = abrir === undefined ? !el.classList.contains("open") : !!abrir;
  if (on) {
    el.classList.add("open");
    overlayAbrir(el, { id: "qatalhos", jaAberto: true }); // Esc fecha por aqui
  } else {
    el.classList.remove("open");
    overlayFechar("qatalhos");
  }
}
// Passo de zoom ancorado no CENTRO da tela — a mesma conta do qZoom100.
function qZoomPasso(f) {
  const q = quadroAtual(),
    cv = document.getElementById("qcanvas");
  if (!q || !cv) return;
  const W = cv.clientWidth || 700,
    H = cv.clientHeight || 450;
  const cx = (W / 2 - q.cam.x) / q.cam.s,
    cy = (H / 2 - q.cam.y) / q.cam.s;
  q.cam.s = Math.max(QUADRO_ZOOM_MIN, Math.min(QUADRO_ZOOM_MAX, q.cam.s * f));
  q.cam.x = W / 2 - cx * q.cam.s;
  q.cam.y = H / 2 - cy * q.cam.s;
  aplicaCam();
  qAgendaSalvarCam();
}
// Cria caixa de texto (ou nota adesiva) num ponto do mundo e foca o editor.
function qNovoTextoEm(x, y, estilo) {
  const q = quadroAtual();
  if (!q) return null;
  const n = {
    id: "n" + Date.now() + Math.floor(Math.random() * 999),
    tipo: "texto",
    texto: "",
    x: Math.round(x),
    y: Math.round(y),
    w: estilo === "nota" ? 190 : 250,
  };
  if (estilo === "nota") {
    n.estilo = "nota"; // campo aditivo (ausente = caixa de texto de sempre)
    n.cor = 0; // índice na paleta QCORES_NOTA
  }
  q.nodes.push(n);
  marcarAlterado();
  desenhaQuadro();
  const el = nodeEl(n.id);
  if (el) {
    const ed = el.querySelector(".qtxt");
    if (ed) ed.focus();
  }
  return n;
}
function qAddNota() {
  const c = qCentro();
  qNovoTextoEm(c.x, c.y, "nota");
}
function qCorNota(id) {
  const q = quadroAtual();
  const n = q && q.nodes.find((x) => x.id === id);
  if (!n) return;
  n.cor = ((n.cor | 0) + 1) % QCORES_NOTA.length;
  marcarAlterado();
  desenhaQuadro();
}
// Apaga tudo que está selecionado: setas marcadas + cartões (e as setas deles).
function qApagarSelecao() {
  const q = quadroAtual();
  if (!q || (!_qSelSet.size && !_qSetaSel.size)) return;
  // Barbantes marcados + os dos cartões apagados + os que estavam
  // pendurados em qualquer um deles (cascata).
  const marcados = new Set(
    [..._qSetaSel].map((i) => q.setas[i]).filter(Boolean),
  );
  const ids = new Set(_qSelSet);
  q.nodes = q.nodes.filter((n) => !ids.has(n.id));
  qRemoverSetas(
    q,
    (s) => marcados.has(s) || ids.has(s.de) || ids.has(s.para),
  );
  _qSelSet = new Set();
  _qSetaSel = new Set();
  marcarAlterado();
  desenhaQuadro();
}
// Duplica os selecionados (ids novos, deslocados 24px) e seleciona as cópias.
function qDuplicarSelecao() {
  const q = quadroAtual();
  if (!q || !_qSelSet.size) return;
  const novos = [];
  let k = 0;
  q.nodes.forEach(function (n) {
    if (!_qSelSet.has(n.id)) return;
    const c = JSON.parse(JSON.stringify(n));
    c.id = "n" + Date.now() + "d" + k++ + Math.floor(Math.random() * 999);
    c.x = (c.x | 0) + 24;
    c.y = (c.y | 0) + 24;
    novos.push(c);
  });
  q.nodes = q.nodes.concat(novos);
  _qSelSet = new Set(novos.map((n) => n.id));
  marcarAlterado();
  desenhaQuadro();
}
/* ---- Setas estilo tldraw (nível 1) ----
   A seta continua sendo o registro { de, para } (campos novos são ADITIVOS:
   rotulo opcional). A geometria é DERIVADA a cada render: a linha vai de
   centro a centro, mas é CORTADA na borda dos cartões (entra "de frente"). */
let _qSetaSel = new Set(); // índices das setas selecionadas (transiente)
let _qRebind = null, // religando uma ponta: { i, end: "de"|"para" }
  _qRebindCur = null;
let _qSetaPull = null, // apertou num barbante: pode virar arraste (transiente)
  _qIgnoraClickSeta = 0, // instante em que virou arraste (o clique não conta)
  _qNoDrag = null, // escorregando um nó de amarra: { i, end, t0, moveu }
  _qMotivo = null; // por que a última ligação foi recusada (para avisar)
// Do centro (cx,cy) em direção a (tx,ty): ponto onde o segmento cruza a
// borda do retângulo r {x,y,w,h}, empurrado "folga" px para fora.
function qClipRect(cx, cy, tx, ty, r, folga) {
  const dx = tx - cx,
    dy = ty - cy;
  if (!dx && !dy) return { x: cx, y: cy };
  let tSai = Infinity;
  if (dx > 0) tSai = Math.min(tSai, (r.x + r.w - cx) / dx);
  if (dx < 0) tSai = Math.min(tSai, (r.x - cx) / dx);
  if (dy > 0) tSai = Math.min(tSai, (r.y + r.h - cy) / dy);
  if (dy < 0) tSai = Math.min(tSai, (r.y - cy) / dy);
  if (!isFinite(tSai) || tSai < 0) tSai = 0;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const t = Math.min(tSai + (folga || 0) / len, 1);
  return { x: cx + dx * t, y: cy + dy * t };
}
function qNodeRect(n) {
  const el = nodeEl(n.id);
  return {
    x: n.x,
    y: n.y,
    w: (el && el.offsetWidth) || 120,
    h: (el && el.offsetHeight) || 40,
  };
}
/* ---- Barbante preso em barbante ----
   Uma ponta ({de,para}) é o id de um cartão (como sempre) OU "seta:<id>",
   um ponto grudado em OUTRO barbante. Campos ADITIVOS: cada seta ganha um
   `id` fixo (antes só existia a posição na lista, que muda ao apagar) e
   `deT`/`paraT` guardam ONDE na curva do outro barbante a ponta grudou
   (0 = começo, 1 = fim). A posição é derivada a cada render, então o nó
   escorrega junto quando os cartões se mexem. */
const QSETA_PROF_MAX = 6; // barbante pendurado em barbante: limite de camadas
function qNovoSetaId() {
  return (
    "s" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
  );
}
// Toda seta precisa de id para poder ser alvo de outra. Dados antigos não
// têm: completa em silêncio (o próximo salvamento grava).
function qIdsSetas(q) {
  if (!q || !Array.isArray(q.setas)) return;
  const vistos = new Set();
  q.setas.forEach(function (se) {
    if (!se.id || vistos.has(se.id)) se.id = qNovoSetaId();
    vistos.add(se.id);
  });
}
function qEhPontaSeta(ref) {
  return typeof ref === "string" && ref.indexOf("seta:") === 0;
}
function qSetaPorId(q, ref) {
  const id = String(ref).slice(5);
  return q.setas.find((s) => s.id === id) || null;
}
// Curva do barbante: quadrática que só CAI (o controle desce na vertical).
function qCurvaCtrl(p1, p2) {
  const mx = (p1.x + p2.x) / 2,
    my = (p1.y + p2.y) / 2;
  const len = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
  // só gravidade: barbante pendurado, não curva de seta
  return { x: mx, y: my + Math.min(90, len * 0.16) };
}
function qCurvaD(p1, p2) {
  const c = qCurvaCtrl(p1, p2);
  return `M ${p1.x} ${p1.y} Q ${c.x} ${c.y}, ${p2.x} ${p2.y}`;
}
// Direção da curva no ponto t (derivada da quadrática) — é o "eixo" do
// barbante ali, e é dela que sai a inclinação das voltas do nó.
function qTangente(p1, c, p2, t) {
  return {
    x: 2 * (1 - t) * (c.x - p1.x) + 2 * t * (p2.x - c.x),
    y: 2 * (1 - t) * (c.y - p1.y) + 2 * t * (p2.y - c.y),
  };
}
/* Nó de amarra: a ponta que se apoia em OUTRO barbante dá três voltas em
   torno da linha hospedeira e sobra uma ponta cortada. p = ponto na
   hospedeira, tan = a tangente dela ali. Voltas e ponta levam a mesma
   fibra da linha (alma, corpo, brilho, torção e vale) — sem isso o nó
   fica liso e denuncia que é outro desenho. */
function qNoAmarra(p, tan, cor, alma) {
  const m = Math.hypot(tan.x, tan.y) || 1;
  let t = { x: tan.x / m, y: tan.y / m }; // eixo da hospedeira
  let n = { x: -t.y, y: t.x };
  // A ponta cortada tem de PENDER: se a normal apontou para cima, olha-se a
  // hospedeira do outro lado (gira o nó 180°, que é simétrico nas voltas).
  if (n.y < 0) {
    t = { x: -t.x, y: -t.y };
    n = { x: -n.x, y: -n.y };
  }
  // volta inclinada 18° fora da perpendicular: cos18·n + sin18·t
  const d = { x: n.x * 0.951 + t.x * 0.309, y: n.y * 0.951 + t.y * 0.309 };
  const P = (a, b) => [p.x + t.x * a + n.x * b, p.y + t.y * a + n.y * b];
  const volta = (k) => {
    const [cx, cy] = P(k, 0),
      r = 3.2;
    return `M ${cx - d.x * r} ${cy - d.y * r} L ${cx + d.x * r} ${cy + d.y * r}`;
  };
  const vs = [volta(-3.2), volta(0), volta(3.2)].join(" ");
  const [ax, ay] = P(-6, 0),
    [bx, by] = P(6, 0); // sombra do bloco todo
  const [tx, ty] = P(4.2, 2.6),
    [ex, ey] = P(7, 9); // ponta cortada
  const pt = `M ${tx} ${ty} Q ${tx + 3} ${ty + 2.6}, ${ex} ${ey}`;
  const L = (dd, c, lw, extra) =>
    `<path d="${dd}" fill="none" stroke="${c}" stroke-width="${lw}" stroke-linecap="round" ${extra || ""}/>`;
  const fibra = (dd) =>
    L(dd, "#e8a68d", 0.9, 'stroke-opacity=".34" transform="translate(-.6,-.9)"') +
    L(dd, "#f2bda6", 0.9, 'stroke-opacity=".3" stroke-dasharray="1 1.5" transform="translate(-.4,-.6)"') +
    L(dd, "#3f1108", 0.9, 'stroke-opacity=".22" stroke-dasharray="1 1.5" stroke-dashoffset="1.25"');
  return (
    L(`M ${ax} ${ay} L ${bx} ${by}`, "#241408", 9, 'stroke-opacity=".42" transform="translate(1.5,3)"') +
    L(pt, alma || "#7d2417", 3.4) +
    L(pt, cor, 2.3) +
    fibra(pt) +
    L(vs, alma || "#7d2417", 4) +
    L(vs, cor, 2.8) +
    fibra(vs)
  );
}
function qPontoNaCurva(p1, c, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p1.x + 2 * u * t * c.x + t * t * p2.x,
    y: u * u * p1.y + 2 * u * t * c.y + t * t * p2.y,
  };
}
// Qual t (0..1) da curva fica mais perto do ponto pt — usado para grudar a
// ponta EXATAMENTE onde o dedo/mouse soltou. Amostra e depois refina.
function qTMaisPerto(p1, c, p2, pt) {
  let melhor = 0.5,
    dist = Infinity;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40,
      p = qPontoNaCurva(p1, c, p2, t);
    const d = (p.x - pt.x) * (p.x - pt.x) + (p.y - pt.y) * (p.y - pt.y);
    if (d < dist) {
      dist = d;
      melhor = t;
    }
  }
  let passo = 1 / 80;
  for (let k = 0; k < 12; k++) {
    [melhor - passo, melhor + passo].forEach(function (t) {
      if (t < 0 || t > 1) return;
      const p = qPontoNaCurva(p1, c, p2, t);
      const d = (p.x - pt.x) * (p.x - pt.x) + (p.y - pt.y) * (p.y - pt.y);
      if (d < dist) {
        dist = d;
        melhor = t;
      }
    });
    passo /= 2;
  }
  return Math.max(0, Math.min(1, melhor));
}
/* Onde uma ponta se apoia. Cartão → devolve o centro e o retângulo (a linha
   ainda vai ser cortada na borda). Barbante → devolve o ponto exato na
   curva dele, sem retângulo (a linha encosta ali mesmo). */
function qPonta(q, ref, t, prof) {
  if (qEhPontaSeta(ref)) {
    const alvo = qSetaPorId(q, ref);
    if (!alvo) return null;
    const pp = qSetaPontos(q, alvo, (prof || 0) + 1);
    if (!pp) return null;
    const c = qCurvaCtrl(pp.p1, pp.p2);
    const tt = t == null ? 0.5 : t;
    const p = qPontoNaCurva(pp.p1, c, pp.p2, tt);
    // A tangente da hospedeira vai junto: é dela que o nó de amarra tira a
    // inclinação das voltas.
    return { centro: p, rect: null, tan: qTangente(pp.p1, c, pp.p2, tt) };
  }
  const n = q.nodes.find((x) => x.id === ref);
  if (!n) return null;
  const r = qNodeRect(n);
  // Ficha: o barbante nasce no CENTRO DO ALFINETE, como num mural de
  // verdade — a linha é amarrada no alfinete, não no meio do papel. Sem
  // retângulo: não há o que cortar, a ponta acaba exatamente ali (e a
  // cabeça do alfinete, que é desenhada por cima do SVG, esconde o nó).
  const alf = qAlfineteCentro(n, r);
  if (alf) return { centro: alf, rect: null };
  // Caixa de texto e nota adesiva não têm alfinete: seguem mirando o meio,
  // com a linha cortada na borda.
  return { centro: { x: r.x + r.w / 2, y: r.y + r.h / 2 }, rect: r };
}
/* Centro do alfinete de um cartão, em coordenadas do quadro. Devolve null
   para quem não tem alfinete (texto/nota). O alfinete é centrado na
   horizontal pelo CSS; na vertical ele fica na faixa de cima do papel, e a
   medida sai do próprio elemento para não repetir número que já está no
   estilo. */
function qAlfineteCentro(n, r) {
  const el = nodeEl(n.id);
  const p = el && el.querySelector(".qpin");
  if (!p) return null;
  const topo = p.offsetTop || 8, // recuo do .qpin no estilos.css
    alt = p.offsetHeight || 16;
  return { x: r.x + r.w / 2, y: r.y + topo + alt / 2 };
}
// Pontas visíveis de uma seta (geometria derivada; null se o apoio sumiu).
function qSetaPontos(q, se, prof) {
  prof = prof || 0;
  if (prof > QSETA_PROF_MAX) return null; // aninhamento absurdo/laço: não desenha
  const A = qPonta(q, se.de, se.deT, prof),
    B = qPonta(q, se.para, se.paraT, prof);
  if (!A || !B) return null;
  const ca = A.centro,
    cb = B.centro;
  return {
    p1: A.rect ? qClipRect(ca.x, ca.y, cb.x, cb.y, A.rect, 4) : ca,
    p2: B.rect ? qClipRect(cb.x, cb.y, ca.x, ca.y, B.rect, 7) : cb,
    // Só quem se apoia em BARBANTE tem tangente (cartão devolve null).
    tan1: A.tan || null,
    tan2: B.tan || null,
  };
}
/* Em que CARTÕES uma ponta se apoia, no fim das contas: cartão devolve ele
   mesmo; barbante devolve os cartões das duas pontas dele, recursivamente. */
function qNosDaPonta(q, ref, prof, acc) {
  acc = acc || new Set();
  if ((prof || 0) > QSETA_PROF_MAX) return acc;
  if (qEhPontaSeta(ref)) {
    const s = qSetaPorId(q, ref);
    if (s) {
      qNosDaPonta(q, s.de, (prof || 0) + 1, acc);
      qNosDaPonta(q, s.para, (prof || 0) + 1, acc);
    }
  } else if (ref) acc.add(ref);
  return acc;
}
/* ---- Quais ligações fazem sentido ----
   Duas regras, e elas dão conta de todos os casos de barbante que só se
   morde a si mesmo:

   1. As duas pontas têm de chegar a cartões DIFERENTES. Ligar o meio de um
      barbante a uma das fichas que ele já liga não diz nada de novo — era
      por aí que dava para empilhar ligação sobre ligação sem fim.
   2. Não existe a mesma ligação duas vezes, em nenhum sentido: puxar de A
      para B e depois de B para A é o MESMO barbante.

   `ignorar` é o índice de uma seta que não deve contar (usado ao religar
   uma ponta, senão a própria seta se acusaria de duplicata). */
function qMotivoRecusa(q, de, para, ignorar) {
  if (!de || !para || de === para) return "Uma ponta não pode ligar nela mesma.";
  const a = qNosDaPonta(q, de, 0),
    b = qNosDaPonta(q, para, 0);
  if (!a.size || !b.size) return "Ligação sem apoio.";
  for (const id of a)
    if (b.has(id)) return "Sem efeito: as duas pontas levam à mesma ficha.";
  const repetida = q.setas.some(function (s, i) {
    if (i === ignorar) return false;
    return (
      (s.de === de && s.para === para) || (s.de === para && s.para === de)
    );
  });
  if (repetida) return "Esses dois já estão ligados.";
  return null; // pode ligar
}
/* Apaga as setas escolhidas por `pred` E as que estavam penduradas nelas
   (senão sobrariam barbantes presos no vazio). */
function qRemoverSetas(q, pred) {
  let mudou = false;
  let corta = pred;
  qIdsSetas(q); // a cascata precisa dos ids
  for (let volta = 0; volta < QSETA_PROF_MAX + 2; volta++) {
    const vivas = q.setas.filter((s) => !corta(s));
    if (vivas.length === q.setas.length) break;
    const ids = new Set(vivas.map((s) => s.id));
    q.setas = vivas;
    mudou = true;
    // Volta seguinte: cai fora quem ficou pendurado em quem já saiu.
    corta = (s) =>
      [s.de, s.para].some(
        (r) => qEhPontaSeta(r) && !ids.has(String(r).slice(5)),
      );
  }
  return mudou;
}
// O segmento (x1,y1)-(x2,y2) toca o retângulo (rx0,ry0)-(rx1,ry1)?
function qSegCruzaRect(x1, y1, x2, y2, rx0, ry0, rx1, ry1) {
  const dentro = (x, y) => x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1;
  if (dentro(x1, y1) || dentro(x2, y2)) return true;
  function cruza(ax, ay, bx, by, cx, cy, dx, dy) {
    const o = (px, py, qx, qy, rx, ry) =>
      (qx - px) * (ry - py) - (qy - py) * (rx - px);
    const o1 = o(ax, ay, bx, by, cx, cy),
      o2 = o(ax, ay, bx, by, dx, dy),
      o3 = o(cx, cy, dx, dy, ax, ay),
      o4 = o(cx, cy, dx, dy, bx, by);
    return o1 * o2 < 0 && o3 * o4 < 0;
  }
  return (
    cruza(x1, y1, x2, y2, rx0, ry0, rx1, ry0) ||
    cruza(x1, y1, x2, y2, rx0, ry1, rx1, ry1) ||
    cruza(x1, y1, x2, y2, rx0, ry0, rx0, ry1) ||
    cruza(x1, y1, x2, y2, rx1, ry0, rx1, ry1)
  );
}
// Setas alcançadas pelo retângulo de seleção (coordenadas de TELA, como os nodes).
function qSetasInRect(cv, q, m) {
  const r = cv.getBoundingClientRect(),
    z = zoomIF(); // mesma conversão CSS → tela do qNodesInRect
  const x0 = Math.min(m.x0, m.x1),
    x1 = Math.max(m.x0, m.x1),
    y0 = Math.min(m.y0, m.y1),
    y1 = Math.max(m.y0, m.y1);
  const s = new Set();
  /* O barbante é DESENHADO em curva (qCurvaD), mas era medido pela reta
     entre as pontas: onde a curva faz barriga, o laço pegava o que não
     encostava e deixava passar o que encostava. Agora a curva é picada em
     pedacinhos e cada pedaço é testado — o que se mede é o que se vê. */
  const PASSOS = 12;
  q.setas.forEach(function (se, i) {
    const pp = qSetaPontos(q, se);
    if (!pp) return;
    const ctrl = qCurvaCtrl(pp.p1, pp.p2);
    const tela = function (p) {
      return {
        x: r.left + (p.x * q.cam.s + q.cam.x) * z,
        y: r.top + (p.y * q.cam.s + q.cam.y) * z,
      };
    };
    let ant = tela(pp.p1);
    for (let k = 1; k <= PASSOS; k++) {
      const at = tela(qPontoNaCurva(pp.p1, ctrl, pp.p2, k / PASSOS));
      if (qSegCruzaRect(ant.x, ant.y, at.x, at.y, x0, y0, x1, y1)) {
        s.add(i);
        return;
      }
      ant = at;
    }
  });
  return s;
}
// Clique numa seta: seleciona só ela / desseleciona (Delete apaga; Esc desmarca).
function qSelSeta(i) {
  // O clique que fecha um ARRASTE saído do barbante não seleciona nada.
  if (Date.now() - _qIgnoraClickSeta < 400) return;
  if (_qSetaSel.size === 1 && _qSetaSel.has(i)) _qSetaSel = new Set();
  else _qSetaSel = new Set([i]);
  desenhaSetas();
}
// Duplo clique numa seta: rótulo — caixa DO SISTEMA (modal), não do navegador.
function qRotuloSeta(i) {
  const q = quadroAtual();
  const se = q && q.setas[i];
  if (!se) return;
  let m = document.getElementById("qrotulo");
  if (!m) {
    m = document.createElement("div");
    m.id = "qrotulo";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modalbox" style="max-width:420px"><div class="modalhd"><h2>🏷️ Rótulo da seta</h2><button class="close" onclick="qRotuloFechar()">✕</button></div>
    <div class="savehelp"><input id="qrotuloInput" class="edinput" placeholder="Ex.: contradiz, mesma pessoa… (vazio remove)" value="${esc(se.rotulo || "")}">
    <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end"><button class="topbtn" onclick="qRotuloFechar()">Cancelar</button><button class="topbtn primary" onclick="qRotuloSalvar(${i})">Salvar</button></div></div></div>`;
  m.classList.add("open");
  setTimeout(function () {
    const inp = document.getElementById("qrotuloInput");
    if (inp) {
      inp.focus();
      inp.select();
      inp.onkeydown = function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          qRotuloSalvar(i);
        } else if (ev.key === "Escape") {
          ev.stopPropagation();
          qRotuloFechar();
        }
      };
    }
  }, 40);
}
function qRotuloFechar() {
  const m = document.getElementById("qrotulo");
  if (m) m.classList.remove("open");
}
function qRotuloSalvar(i) {
  const q = quadroAtual();
  const se = q && q.setas[i];
  const inp = document.getElementById("qrotuloInput");
  if (se && inp) {
    const v = inp.value.trim();
    if (v) se.rotulo = v;
    else delete se.rotulo;
    marcarAlterado();
    desenhaSetas();
  }
  qRotuloFechar();
}
/* Escorrega o nó de uma ponta ao longo do barbante em que ela está amarrada,
   até o ponto pt do mundo. Só mexe em deT/paraT — a ligação continua a mesma
   (para trocar de hospedeiro, use a alça dourada da seta selecionada).
   Devolve true se o nó mudou de lugar. */
function qMoverNo(i, end, pt) {
  const q = quadroAtual();
  const se = q && q.setas[i];
  if (!se || !pt) return false;
  const ref = se[end];
  if (!qEhPontaSeta(ref)) return false;
  const hosp = qSetaPorId(q, ref);
  if (!hosp) return false;
  const t = Math.round(qTNoBarbante(q, hosp, pt) * 1000) / 1000;
  if (se[end + "T"] === t) return false;
  se[end + "T"] = t;
  return true;
}
// Em que ponto (0..1) da curva do barbante `se` cai o ponto pt do mundo.
function qTNoBarbante(q, se, pt) {
  const pp = qSetaPontos(q, se);
  if (!pp || !pt) return 0.5;
  return qTMaisPerto(pp.p1, qCurvaCtrl(pp.p1, pp.p2), pp.p2, pt);
}
// Onde o dedo/mouse soltou (o pointer capture faz e.target virar o canvas).
function qAlvoNoPonto(e) {
  let t = null;
  try {
    t = document.elementFromPoint(e.clientX, e.clientY);
  } catch (err) {}
  return t || e.target;
}
/* Cria um barbante da origem `de` (cartão, ou "seta:<id>" + deT quando sai
   de outro barbante) até onde o arraste terminou. O destino pode ser um
   cartão OU outro barbante — nesse caso a ponta gruda no ponto exato da
   curva em que foi solta. Devolve true se ligou. */
function qLigarBarbante(de, deT, elDestino, pMundo) {
  _qMotivo = null;
  const q = quadroAtual();
  if (!q || !de || !elDestino || !elDestino.closest) return false;
  const setaEl = elDestino.closest("[data-seta-id]");
  const noEl = elDestino.closest(".qnode");
  let para = null,
    paraT = null;
  if (setaEl) {
    const alvo = qSetaPorId(q, "seta:" + setaEl.getAttribute("data-seta-id"));
    if (!alvo) return false;
    para = "seta:" + alvo.id;
    paraT = qTNoBarbante(q, alvo, pMundo);
  } else if (noEl) {
    para = noEl.getAttribute("data-id");
  } else return false;
  _qMotivo = qMotivoRecusa(q, de, para);
  if (_qMotivo) return false;
  const nova = { id: qNovoSetaId(), de: de, para: para };
  if (qEhPontaSeta(de)) nova.deT = Math.round((deT == null ? 0.5 : deT) * 1000) / 1000;
  if (paraT != null) nova.paraT = Math.round(paraT * 1000) / 1000;
  q.setas.push(nova);
  marcarAlterado();
  desenhaSetas();
  return true;
}
/* Reconecta uma ponta da seta a outro cartão — ou a outro barbante, no
   ponto onde foi solta. Aceita o ELEMENTO de destino (cartão ou linha).
   Valida auto-laço e duplicata. */
function qReligarSeta(i, end, destino, pMundo) {
  _qMotivo = null;
  const q = quadroAtual();
  const se = q && q.setas[i];
  if (!se || !destino) return false;
  // Compatibilidade: quem chama com um id de cartão (modo guiado do toque)
  // continua funcionando.
  const el =
    typeof destino === "string"
      ? nodeEl(destino)
      : destino.closest
        ? destino
        : null;
  if (!el) return false;
  const setaEl = el.closest("[data-seta-id]");
  const noEl = el.closest(".qnode");
  let novo = null,
    novoT = null;
  if (setaEl) {
    const alvo = qSetaPorId(q, "seta:" + setaEl.getAttribute("data-seta-id"));
    if (!alvo || alvo === se) return false;
    novo = "seta:" + alvo.id;
    novoT = qTNoBarbante(q, alvo, pMundo);
  } else if (noEl) {
    novo = noEl.getAttribute("data-id");
  }
  if (!novo) return false;
  const de = end === "de" ? novo : se.de,
    para = end === "para" ? novo : se.para;
  // Mesmas regras de quem cria do zero (a própria seta não conta).
  _qMotivo = qMotivoRecusa(q, de, para, i);
  if (_qMotivo) {
    toast(_qMotivo);
    return false;
  }
  se[end] = novo;
  if (novoT == null) delete se[end + "T"];
  else se[end + "T"] = Math.round(novoT * 1000) / 1000;
  marcarAlterado();
  desenhaSetas();
  return true;
}
// Handler ÚNICO de mouseup na window (antes era re-adicionado a cada
// renderTeorias — vazamento de listeners; agora registra uma vez só).
let _qWinWired = false;
function qMouseUpGlobal(e) {
  if (_qArrow) {
    // Solta sobre um cartão OU sobre outro barbante (gruda no ponto exato).
    qLigarBarbante(_qArrow.de, _qArrow.deT, qAlvoNoPonto(e), _qArrowCur);
    // Recusa por regra não pode ser silenciosa: diga por quê.
    if (_qMotivo) toast(_qMotivo);
    _qArrow = null;
    _qArrowCur = null;
    desenhaSetas();
    // Convenção tldraw: depois de criar a seta, a ferramenta volta pra seleção.
    if (_qTool === "seta") qSetTool("select");
  }
  if (_qRebind) {
    // Soltou a alça: sobre um cartão ou barbante religa; no vazio, mantém.
    qReligarSeta(_qRebind.i, _qRebind.end, qAlvoNoPonto(e), _qRebindCur);
    _qRebind = null;
    _qRebindCur = null;
    desenhaSetas();
  }
  if (_qNoDrag) {
    // Soltou o nó: ele fica onde parou (só grava se realmente andou).
    if (_qNoDrag.moveu) marcarAlterado();
    _qNoDrag = null;
    desenhaSetas();
  }
  _qSetaPull = null; // apertou no barbante mas não arrastou: era clique
  if (_qDrag) {
    if (_qDrag.moved) marcarAlterado();
    _qDrag = null;
  }
  if (_qPan) {
    marcarAlterado();
    _qPan = null;
  }
  if (_qMarq) {
    _qMarq = null;
    hideSelBox();
    markSelDom();
  }
}
function wireQuadro() {
  const cv = document.getElementById("qcanvas");
  if (!cv) return;
  const rel = (e) => {
    // Tela → CSS: a câmera (cam.x/cam.s) vive em pixels de CSS.
    const r = cv.getBoundingClientRect(),
      z = zoomIF();
    return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z };
  };
  const toW = (p) => {
    const q = quadroAtual();
    return { x: (p.x - q.cam.x) / q.cam.s, y: (p.y - q.cam.y) / q.cam.s };
  };
  cv.addEventListener("mousedown", function (e) {
    const q = quadroAtual();
    /* Sair do editor ao clicar fora dele. Os arrastes deste canvas chamam
       preventDefault, e isso IMPEDE o navegador de tirar o foco sozinho:
       o cursor ficava preso na nota e as teclas de ferramenta (V/H/F/N/T/A)
       viravam texto em vez de trocar de ferramenta. */
    qSoltarEditor(e.target);
    /* As peças flutuantes (dock, dica, zoom, atalhos, barra de ações e o
       cartão de quadro vazio) ficam DENTRO do canvas: apertar nelas não
       pode virar laço de seleção nem arraste de cartão. */
    if (
      e.target.closest &&
      e.target.closest(".qdock,.qhint,.qzoom,.qatalhos,.qacoes,.qvazio")
    )
      return;
    const conn = e.target.closest && e.target.closest("[data-conn]");
    if (conn && e.button === 0) {
      _qArrow = { de: conn.getAttribute("data-conn") };
      _qArrowCur = toW(rel(e));
      e.preventDefault();
      return;
    }
    // Alça de RELIGAR a ponta de uma seta selecionada (arrastar reconecta).
    const alca = e.target.closest && e.target.closest("[data-seta-end]");
    if (alca && e.button === 0) {
      _qRebind = {
        i: +alca.getAttribute("data-seta-i"),
        end: alca.getAttribute("data-seta-end"),
      };
      _qRebindCur = toW(rel(e));
      e.preventDefault();
      return;
    }
    // Pega do NÓ DE AMARRA: arrastar escorrega o nó pelo barbante hospedeiro
    // (a alça dourada, que troca de hospedeiro, fica desenhada por cima).
    const pegaNo = e.target.closest && e.target.closest("[data-no-i]");
    if (pegaNo && e.button === 0 && _qTool !== "hand" && !_space) {
      const iNo = +pegaNo.getAttribute("data-no-i"),
        endNo = pegaNo.getAttribute("data-no-end");
      const seNo = q && q.setas[iNo];
      _qNoDrag = {
        i: iNo,
        end: endNo,
        t0: seNo ? seNo[endNo + "T"] : null,
        moveu: false,
      };
      e.preventDefault();
      return;
    }
    // Clique numa seta: o onclick/ondblclick dela cuida — não inicia marquee.
    // ARRASTAR a partir dela, porém, puxa um barbante NOVO daquele ponto
    // (fica pendente até o mouse andar: sem andar, continua sendo clique).
    // (a ferramenta Mão e o espaço+arraste continuam navegando, não ligando)
    const setaEl = e.target.closest && e.target.closest("[data-seta-id]");
    if (setaEl && e.button === 0 && _qTool !== "hand" && !_space) {
      const alvo = qSetaPorId(q, "seta:" + setaEl.getAttribute("data-seta-id"));
      if (alvo)
        _qSetaPull = {
          id: alvo.id,
          t: qTNoBarbante(q, alvo, toW(rel(e))),
          x: e.clientX,
          y: e.clientY,
        };
      e.preventDefault();
      return;
    }
    if (e.target.closest && e.target.closest("[data-seta]")) {
      e.preventDefault();
      return;
    }
    if (e.button === 1 || (e.button === 0 && _space)) {
      _qPan = { mx: rel(e).x, my: rel(e).y, cx: q.cam.x, cy: q.cam.y };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    // ---- Ferramentas (estilo tldraw) ----
    if (_qTool === "hand") {
      // Mão: qualquer arraste vira pan (ignora os cartões).
      _qPan = { mx: rel(e).x, my: rel(e).y, cx: q.cam.x, cy: q.cam.y };
      e.preventDefault();
      return;
    }
    if (_qTool === "texto" || _qTool === "nota") {
      // Clique no fundo cria a caixa/nota no ponto; depois volta pra seleção.
      if (!(e.target.closest && e.target.closest(".qnode"))) {
        const w = toW(rel(e));
        qNovoTextoEm(w.x, w.y, _qTool === "nota" ? "nota" : undefined);
        qSetTool("select");
        e.preventDefault();
        return;
      }
      // Sobre um cartão: cai no comportamento normal (selecionar/arrastar).
    }
    if (_qTool === "seta") {
      // Arrastar a partir de QUALQUER ponto de um cartão inicia a seta.
      const alvo = e.target.closest && e.target.closest(".qnode");
      if (alvo) {
        _qArrow = { de: alvo.getAttribute("data-id") };
        _qArrowCur = toW(rel(e));
        e.preventDefault();
        return;
      }
    }
    if (e.target.tagName === "TEXTAREA") return;
    /* Nota e texto: 1 clique SELECIONA o cartão (como qualquer outro), 2
       cliques entram na escrita. Antes o clique caía direto no editor —
       a nota nunca ficava selecionada, e por isso Del, Ctrl+D e o Shift
       não pegavam nela. Já EDITANDO, o clique é do editor (posicionar o
       cursor no texto), então este caminho sai de cena. */
    const edAlvo = e.target.closest && e.target.closest(".qtxt");
    if (edAlvo && document.activeElement === edAlvo) return;
    const dg = e.target.closest && e.target.closest("[data-drag]");
    // O corpo da nota/texto não tem data-drag (só a alcinha ≡): aqui o
    // cartão inteiro vale como pega, igual à ficha.
    const cartao = e.target.closest && e.target.closest(".qnode");
    const idAlvo = dg
      ? dg.getAttribute("data-drag")
      : cartao
        ? cartao.getAttribute("data-id")
        : null;
    if (idAlvo) {
      const id = idAlvo;
      if (e.shiftKey) {
        // Shift soma (ou tira) da seleção, sem descartar o resto.
        if (_qSelSet.has(id)) _qSelSet.delete(id);
        else _qSelSet.add(id);
        markSelDom();
      } else if (!_qSelSet.has(id)) {
        _qSelSet = new Set([id]);
        markSelDom();
      }
      if (edAlvo) e.preventDefault(); // não deixa o editor roubar o foco
      _qDrag = { ids: [..._qSelSet], sw: toW(rel(e)), orig: {}, moved: false };
      _qDrag.ids.forEach(function (i) {
        const nn = q.nodes.find((x) => x.id === i);
        if (nn) _qDrag.orig[i] = { x: nn.x, y: nn.y };
      });
      e.preventDefault();
      return;
    }
    /* Laço de seleção. Com Shift ele SOMA ao que já estava marcado (a base
       fica guardada no próprio laço); sem Shift, começa do zero. */
    _qMarq = {
      x0: e.clientX,
      y0: e.clientY,
      x1: e.clientX,
      y1: e.clientY,
      base: e.shiftKey ? new Set(_qSelSet) : new Set(),
      baseSetas: e.shiftKey ? new Set(_qSetaSel) : new Set(),
    };
    _qSelSet = new Set(_qMarq.base);
    // Clique no fundo (sem Shift) também desmarca as setas selecionadas.
    if (_qSetaSel.size && !e.shiftKey) {
      _qSetaSel = new Set();
      desenhaSetas();
    }
    showSelBox(_qMarq);
    markSelDom();
    // Impede a seleção nativa de texto (azul) durante o retângulo — igual ao Mapa.
    e.preventDefault();
  });
  cv.addEventListener("mousemove", function (e) {
    const q = quadroAtual();
    const p = rel(e);
    // Arrastando um nó de amarra: ele escorrega pela linha hospedeira.
    if (_qNoDrag) {
      if (qMoverNo(_qNoDrag.i, _qNoDrag.end, toW(p))) {
        _qNoDrag.moveu = true;
        desenhaSetas();
      }
      return;
    }
    // Andou o suficiente depois de apertar em cima de um barbante? Então
    // não era clique: está puxando um barbante novo a partir daquele ponto.
    if (_qSetaPull) {
      if (Math.hypot(e.clientX - _qSetaPull.x, e.clientY - _qSetaPull.y) > 6) {
        _qArrow = { de: "seta:" + _qSetaPull.id, deT: _qSetaPull.t };
        _qArrowCur = toW(p);
        _qSetaPull = null;
        _qIgnoraClickSeta = Date.now();
      } else return;
    }
    if (_qDrag) {
      const w = toW(p),
        dx = w.x - _qDrag.sw.x,
        dy = w.y - _qDrag.sw.y;
      _qDrag.ids.forEach(function (id) {
        const n = q.nodes.find((x) => x.id === id),
          o = _qDrag.orig[id];
        if (n && o) {
          n.x = Math.round(o.x + dx);
          n.y = Math.round(o.y + dy);
          const el = nodeEl(id);
          if (el) {
            el.style.left = n.x + "px";
            el.style.top = n.y + "px";
          }
        }
      });
      _qDrag.moved = true;
      desenhaSetas();
    } else if (_qPan) {
      q.cam.x = _qPan.cx + (p.x - _qPan.mx);
      q.cam.y = _qPan.cy + (p.y - _qPan.my);
      aplicaCam();
    } else if (_qArrow) {
      _qArrowCur = toW(p);
      desenhaSetas();
    } else if (_qRebind) {
      _qRebindCur = toW(p);
      desenhaSetas();
    } else if (_qMarq) {
      _qMarq.x1 = e.clientX;
      _qMarq.y1 = e.clientY;
      updateSelBox(_qMarq);
      // A base é o que já estava marcado quando o laço começou com Shift.
      _qSelSet = new Set([..._qMarq.base, ...qNodesInRect(q, _qMarq)]);
      // O retângulo também seleciona as SETAS que ele alcança.
      _qSetaSel = new Set([
        ..._qMarq.baseSetas,
        ...qSetasInRect(cv, q, _qMarq),
      ]);
      markSelDom();
      desenhaSetas();
    }
  });
  if (!_qWinWired) {
    _qWinWired = true;
    window.addEventListener("mouseup", qMouseUpGlobal);
  }
  cv.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      const q = quadroAtual();
      const p = rel(e);
      const wx = (p.x - q.cam.x) / q.cam.s,
        wy = (p.y - q.cam.y) / q.cam.s;
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      q.cam.s = Math.max(
        QUADRO_ZOOM_MIN,
        Math.min(QUADRO_ZOOM_MAX, q.cam.s * f),
      );
      q.cam.x = p.x - wx * q.cam.s;
      q.cam.y = p.y - wy * q.cam.s;
      aplicaCam();
      // Antes o zoom não era salvo (só o pan); agora persiste, com atraso.
      qAgendaSalvarCam();
    },
    { passive: false },
  );
  // ===== Toque (P04/§3.3): arrastar um CARTÃO move o cartão (ficha, nota
  // ou texto); arrastar o fundo move o quadro; pinça dá zoom; tap abre o
  // menu do item; SEGURAR o toque num cartão puxa o barbante até outro.
  const toWxy = (x, y) => {
    const r = cv.getBoundingClientRect(),
      z = zoomIF();
    return toW({ x: (x - r.left) / z, y: (y - r.top) / z });
  };
  let _gqPan = null,
    _gqDrag = null,
    _gqNo = null, // arraste que escorrega um nó de amarra pela hospedeira
    _gqConn = false; // arraste que puxa barbante (alfinete, ● ou outro barbante)
  ligarGestos(cv, {
    mouseProprio: true,
    ignorar: function (e) {
      // Editor de texto EM USO (teclado aberto) segue o fluxo nativo;
      // fora de edição, o dedo arrasta a nota/texto normalmente.
      if (e.target.tagName === "TEXTAREA") return true;
      const ed = e.target.closest && e.target.closest(".qtxt");
      return !!(ed && document.activeElement === ed);
    },
    dragInicio: function (e, alvo, x0, y0) {
      qMenuCancela(); // virou arraste: o menu pendente não abre
      _gqDrag = null;
      _gqNo = null;
      _gqConn = false;
      const q = quadroAtual();
      // Dedo no NÓ de amarra: escorrega o nó em vez de puxar linha nova.
      const pegaNo = alvo && alvo.closest ? alvo.closest("[data-no-i]") : null;
      if (pegaNo && x0 != null) {
        _gqNo = {
          i: +pegaNo.getAttribute("data-no-i"),
          end: pegaNo.getAttribute("data-no-end"),
          moveu: false,
        };
        return;
      }
      // Dedo no ALFINETE (ou na bolinha ● de texto/nota): puxa o barbante
      // em vez de mover o cartão — mesmo gesto do mouse.
      const connEl = alvo && alvo.closest ? alvo.closest("[data-conn]") : null;
      if (connEl && x0 != null) {
        _gqConn = true;
        _qArrow = { de: connEl.getAttribute("data-conn") };
        _qArrowCur = toWxy(x0, y0);
        desenhaSetas();
        return;
      }
      // Dedo em cima de um BARBANTE: puxa um barbante novo daquele ponto.
      const setaEl =
        alvo && alvo.closest ? alvo.closest("[data-seta-id]") : null;
      if (setaEl && x0 != null) {
        const s0 = qSetaPorId(q, "seta:" + setaEl.getAttribute("data-seta-id"));
        if (s0) {
          _gqConn = true;
          _qArrow = {
            de: "seta:" + s0.id,
            deT: qTNoBarbante(q, s0, toWxy(x0, y0)),
          };
          _qArrowCur = toWxy(x0, y0);
          desenhaSetas();
          return;
        }
      }
      const noEl = alvo && alvo.closest ? alvo.closest(".qnode") : null;
      if (noEl && x0 != null) {
        // Dedo num cartão: arrasta o cartão (e o resto da seleção junto)
        const id = noEl.getAttribute("data-id");
        if (!_qSelSet.has(id)) {
          _qSelSet = new Set([id]);
          markSelDom();
        }
        _gqDrag = { ids: [..._qSelSet], orig: {} };
        _gqDrag.ids.forEach(function (i) {
          const nn = q.nodes.find((x) => x.id === i);
          if (nn) _gqDrag.orig[i] = { x: nn.x, y: nn.y };
        });
        return;
      }
      // Dedo no vazio: move o quadro
      _gqPan = { x: q.cam.x, y: q.cam.y };
    },
    drag: function (e, dx, dy) {
      const q = quadroAtual();
      if (_gqNo) {
        if (qMoverNo(_gqNo.i, _gqNo.end, toWxy(e.clientX, e.clientY))) {
          _gqNo.moveu = true;
          desenhaSetas();
        }
        return;
      }
      if (_gqConn) {
        _qArrowCur = toWxy(e.clientX, e.clientY);
        desenhaSetas();
        return;
      }
      if (_gqDrag) {
        // dx/dy vêm em pixels de TELA: dividir pelo zoom da interface antes
        // de dividir pela escala do quadro.
        const s = (q.cam.s || 1) * zoomIF();
        _gqDrag.ids.forEach(function (id) {
          const n = q.nodes.find((x) => x.id === id),
            o = _gqDrag.orig[id];
          if (n && o) {
            n.x = Math.round(o.x + dx / s);
            n.y = Math.round(o.y + dy / s);
            const el = nodeEl(id);
            if (el) {
              el.style.left = n.x + "px";
              el.style.top = n.y + "px";
            }
          }
        });
        desenhaSetas();
        return;
      }
      if (!_gqPan) return;
      const zp = zoomIF();
      q.cam.x = _gqPan.x + dx / zp;
      q.cam.y = _gqPan.y + dy / zp;
      aplicaCam();
    },
    dragFim: function (e) {
      if (_gqConn) {
        // Soltou o alfinete/barbante: liga onde parou.
        const ok = qLigarBarbante(
          _qArrow && _qArrow.de,
          _qArrow && _qArrow.deT,
          qAlvoNoPonto(e),
          _qArrowCur,
        );
        _gqConn = false;
        _qArrow = null;
        _qArrowCur = null;
        desenhaSetas();
        toast(ok ? "Barbante criado." : _qMotivo || "Ligação cancelada.");
        return;
      }
      if (_gqNo) {
        if (_gqNo.moveu) marcarAlterado();
        _gqNo = null;
        return;
      }
      if (_gqDrag) marcarAlterado();
      if (_gqPan) qAgendaSalvarCam();
      _gqDrag = null;
      _gqPan = null;
    },
    dragCancela: function () {
      _gqDrag = null;
      _gqNo = null;
      _gqPan = null;
      if (_gqConn) {
        _gqConn = false;
        _qArrow = null;
        _qArrowCur = null;
        desenhaSetas();
      }
    },
    cancelar: function () {
      _gqDrag = null;
      _gqNo = null;
      _gqPan = null;
      _gqConn = false;
      if (_qArrow) {
        _qArrow = null;
        _qArrowCur = null;
        desenhaSetas();
      }
    },
    // Segurar o toque num cartão (ou num barbante) puxa a linha até o alvo
    longPress: function (alvo, pt) {
      const q = quadroAtual();
      const setaEl = alvo && alvo.closest ? alvo.closest("[data-seta-id]") : null;
      const noEl = alvo && alvo.closest ? alvo.closest(".qnode") : null;
      if (!noEl && !setaEl) return false;
      qMenuCancela(); // segurou: puxa barbante, não abre menu
      if (setaEl) {
        const s0 = qSetaPorId(q, "seta:" + setaEl.getAttribute("data-seta-id"));
        if (!s0) return false;
        _qArrow = {
          de: "seta:" + s0.id,
          deT: qTNoBarbante(q, s0, toWxy(pt.x, pt.y)),
        };
      } else _qArrow = { de: noEl.getAttribute("data-id") };
      _qArrowCur = toWxy(pt.x, pt.y);
      desenhaSetas();
      try {
        if (navigator.vibrate) navigator.vibrate(30);
      } catch (err) {}
      toast("Puxe a linha até outro cartão ou barbante.");
      return true;
    },
    longDrag: function (e) {
      _qArrowCur = toWxy(e.clientX, e.clientY);
      desenhaSetas();
    },
    longFim: function (e) {
      const de = _qArrow && _qArrow.de,
        deT = _qArrow && _qArrow.deT,
        cur = _qArrowCur;
      _qArrow = null;
      _qArrowCur = null;
      // Com pointer capture o e.target é o canvas; quem diz onde o dedo
      // soltou é o elementFromPoint (fallback: e.target, p/ testes).
      const ok = qLigarBarbante(de, deT, qAlvoNoPonto(e), cur);
      toast(ok ? "Barbante criado." : _qMotivo || "Ligação cancelada.");
      desenhaSetas();
    },
    pinch: function (p) {
      const q = quadroAtual();
      const r = cv.getBoundingClientRect(),
        z = zoomIF();
      const cx = (p.cx - r.left) / z,
        cy = (p.cy - r.top) / z;
      const wx = (cx - q.cam.x) / q.cam.s,
        wy = (cy - q.cam.y) / q.cam.s;
      const ns = Math.max(
        QUADRO_ZOOM_MIN,
        Math.min(QUADRO_ZOOM_MAX, q.cam.s * p.fator),
      );
      q.cam.x = cx - wx * ns + p.dx / z;
      q.cam.y = cy - wy * ns + p.dy / z;
      q.cam.s = ns;
      aplicaCam();
      qAgendaSalvarCam();
    },
    tap: function (e, alvo) {
      qTapToque(e, alvo, rel, toW);
    },
    doubleTap: function (e, alvo) {
      qDuploToque(alvo);
    },
  });
}
/* ===== Toque nos Quadros: tap com modos guiados ===== */
let _qConectarDe = null, // conexão guiada: origem escolhida, falta o destino
  _qMoverId = null, // mover guiado: próximo toque diz o novo lugar
  _qReligar = null, // religar guiado: {i, end}
  _qMenuTimer = null; // menu pendente (esperando um possível 2º toque)
/* O menu espera 340ms — mais que a janela de toque duplo (320ms) — para
   que "tocar 2x rápido" abra o editor em vez do menu. */
function qMenuAgenda(id) {
  clearTimeout(_qMenuTimer);
  _qMenuTimer = setTimeout(function () {
    _qMenuTimer = null;
    qNoMenu(id);
  }, 340);
}
function qMenuCancela() {
  clearTimeout(_qMenuTimer);
  _qMenuTimer = null;
}
/* Dois toques no cartão JÁ SELECIONADO: nota/texto abre para escrever;
   ficha abre a ficha. Nunca abre o menu. */
function qDuploToque(alvo) {
  qMenuCancela();
  const noEl = alvo && alvo.closest ? alvo.closest(".qnode") : null;
  if (!noEl) return;
  const id = noEl.getAttribute("data-id");
  if (!_qSelSet.has(id)) {
    _qSelSet = new Set([id]);
    markSelDom();
    return;
  }
  const q = quadroAtual();
  const n = q && q.nodes.find((x) => x.id === id);
  if (!n) return;
  if (n.tipo === "texto") qFocarEditor(noEl.querySelector(".qtxt"));
  else qOpenRef(id);
}
/* Foca o editor de texto com o cursor no FIM (o toque não posiciona o
   cursor sozinho: o gesto chama preventDefault). */
function qFocarEditor(el) {
  if (!el) return;
  try {
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
  } catch (e) {}
}
function qTapToque(e, alvo, rel, toW) {
  const q = quadroAtual();
  const p = toW(rel(e));
  // Toque fora do editor de texto em uso: solta o foco (fecha o teclado)
  const edAtivo =
    document.activeElement &&
    document.activeElement.closest &&
    document.activeElement.closest(".qtxt");
  if (edAtivo && !(alvo && edAtivo.contains(alvo))) edAtivo.blur();
  const noEl = alvo && alvo.closest ? alvo.closest(".qnode") : null;
  const setaEl = alvo && alvo.closest ? alvo.closest("[data-seta]") : null;
  // 1) Modos guiados pendentes
  if (_qConectarDe) {
    const de = _qConectarDe;
    _qConectarDe = null;
    // Destino pode ser um cartão OU um barbante (gruda onde tocou).
    const fez = qLigarBarbante(de, null, noEl || setaEl, p);
    toast(fez ? "Barbante criado." : _qMotivo || "Ligação cancelada.");
    return;
  }
  if (_qReligar) {
    const rl = _qReligar;
    _qReligar = null;
    if (noEl || setaEl) qReligarSeta(rl.i, rl.end, noEl || setaEl, p);
    else toast("Religação cancelada.");
    return;
  }
  if (_qMoverId) {
    const n = q.nodes.find((x) => x.id === _qMoverId);
    _qMoverId = null;
    if (n) {
      n.x = Math.round(p.x - 70);
      n.y = Math.round(p.y - 20);
      marcarAlterado();
      desenhaQuadro();
      toast("Item movido.");
    }
    return;
  }
  // 2) Ferramentas de criação escolhidas na barra
  if ((_qTool === "texto" || _qTool === "nota") && !noEl) {
    qNovoTextoEm(p.x, p.y, _qTool === "nota" ? "nota" : undefined);
    qSetTool("select");
    return;
  }
  // 3) Tap num cartão (§toque): 1º toque SELECIONA; tocar de novo no que já
  // está selecionado abre o menu — com uma pausa, porque dois toques
  // rápidos no selecionado significam "editar" (ver qDuploToque).
  if (noEl) {
    const id = noEl.getAttribute("data-id");
    if (!(_qSelSet.size === 1 && _qSelSet.has(id))) {
      _qSelSet = new Set([id]);
      markSelDom();
      return;
    }
    qMenuAgenda(id);
    return;
  }
  // 4) Tap numa seta: mesma regra — 1º toque seleciona, o 2º abre o menu
  if (setaEl) {
    const i = +setaEl.getAttribute("data-seta");
    const jaSel = _qSetaSel.size === 1 && _qSetaSel.has(i);
    qSelSeta(i);
    if (jaSel) qSetaMenu(i);
    return;
  }
  // 5) Tap no vazio: limpa seleção
  qMenuCancela();
  _qSelSet = new Set();
  if (_qSetaSel.size) {
    _qSetaSel = new Set();
    desenhaSetas();
  }
  markSelDom();
}
/* Menu contextual do cartão (§3.3): nada depende de hover/duplo clique. */
function qNoMenu(id) {
  const q = quadroAtual();
  const n = q.nodes.find((x) => x.id === id);
  if (!n) return;
  const ehTexto = n.tipo === "texto";
  const ehNota = ehTexto && n.estilo === "nota";
  const titulo = ehTexto
    ? ehNota
      ? "Nota adesiva"
      : "Caixa de texto"
    : qRefInfo(n).nome;
  abrirSheetAcoes(titulo, [
    !ehTexto
      ? {
          rotulo: "Abrir",
          fn: function () {
            qOpenRef(id);
          },
        }
      : {
          rotulo: "Editar texto",
          fn: function () {
            qFocarEditor(
              document.querySelector('.qnode[data-id="' + id + '"] .qtxt'),
            );
          },
        },
    {
      rotulo: "Conectar (barbante)",
      fn: function () {
        _qConectarDe = id;
        toast("Toque no cartão — ou no barbante — de DESTINO.");
      },
    },
    {
      rotulo: "Mover para…",
      fn: function () {
        _qMoverId = id;
        toast("Toque no lugar do quadro para onde mover.");
      },
    },
    ehNota
      ? {
          rotulo: "Mudar a cor",
          fn: function () {
            qCorNota(id);
          },
        }
      : null,
    {
      rotulo: "Duplicar",
      fn: function () {
        _qSelSet = new Set([id]);
        qDuplicarSelecao();
      },
    },
    {
      rotulo: "Excluir do quadro",
      perigo: true,
      fn: function () {
        qDelNode(id);
      },
    },
  ]);
}
/* Alternativa acessível em LISTA para o quadro (Etapa 6): todo item pode
   ser alcançado e operado sem gesto espacial. */
function qLista() {
  const q = quadroAtual();
  if (!(q.nodes || []).length) {
    toast("O quadro está vazio.");
    return;
  }
  abrirSheetAcoes(
    "Itens do quadro",
    q.nodes.slice(0, 60).map(function (n) {
      const ehTexto = n.tipo === "texto";
      const nome = ehTexto
        ? (n.texto || "(sem texto)").replace(/<[^>]*>/g, "").slice(0, 40) ||
          "(sem texto)"
        : qRefInfo(n).nome;
      return {
        rotulo: nome,
        detalhe: ehTexto ? (n.estilo === "nota" ? "nota" : "texto") : "ficha",
        fn: function () {
          _qSelSet = new Set([n.id]);
          markSelDom();
          qNoMenu(n.id);
        },
      };
    }),
  );
}
/* Menu do barbante: rótulo, religar pontas e excluir — sem arraste. */
function qSetaMenu(i) {
  const q = quadroAtual();
  const se = q.setas[i];
  if (!se) return;
  abrirSheetAcoes("Barbante", [
    {
      rotulo: se.rotulo ? "Editar rótulo" : "Adicionar rótulo",
      fn: function () {
        qRotuloSeta(i);
      },
    },
    {
      // Caminho sem gesto para "barbante que sai de barbante": sai do meio.
      rotulo: "Puxar barbante daqui",
      fn: function () {
        qIdsSetas(q);
        _qConectarDe = "seta:" + se.id;
        toast("Toque no cartão — ou no barbante — de DESTINO.");
      },
    },
    {
      rotulo: "Religar origem",
      fn: function () {
        _qReligar = { i: i, end: "de" };
        toast("Toque no cartão (ou barbante) que passa a ser a ORIGEM.");
      },
    },
    {
      rotulo: "Religar destino",
      fn: function () {
        _qReligar = { i: i, end: "para" };
        toast("Toque no cartão (ou barbante) que passa a ser o DESTINO.");
      },
    },
    {
      rotulo: "Excluir barbante",
      perigo: true,
      fn: function () {
        qDelSeta(i);
      },
    },
  ]);
}
function qCentro() {
  const q = quadroAtual();
  const cv = document.getElementById("qcanvas");
  const w = cv ? cv.clientWidth : 700,
    hh = cv ? cv.clientHeight : 450;
  return {
    x: Math.round((w / 2 - q.cam.x) / q.cam.s - 70),
    y: Math.round((hh / 2 - q.cam.y) / q.cam.s - 20),
  };
}
function qAddTexto() {
  const c = qCentro();
  qNovoTextoEm(c.x, c.y);
}
function qSetTexto(id, v) {
  const n = quadroAtual().nodes.find((x) => x.id === id);
  if (n) {
    n.texto = v;
    marcarAlterado();
  }
}
function qDelNode(id) {
  const q = quadroAtual();
  q.nodes = q.nodes.filter((n) => n.id !== id);
  // Some com os barbantes do cartão E com os que estavam pendurados neles.
  qRemoverSetas(q, (s) => s.de === id || s.para === id);
  _qSetaSel = new Set(); // setas podem ter mudado de índice
  marcarAlterado();
  desenhaQuadro();
}
function qDelSeta(i) {
  const q = quadroAtual();
  const alvo = q.setas[i];
  if (!alvo) return;
  qRemoverSetas(q, (s) => s === alvo);
  _qSetaSel = new Set(); // índices mudaram; evita destacar/apagar a seta errada
  marcarAlterado();
  desenhaSetas();
}
function qOpenRef(id) {
  const n = quadroAtual().nodes.find((x) => x.id === id);
  if (!n || n.tipo !== "ref") return;
  if (n.kind === "pista") abrir(n.ref);
  else abrirEntidade(n.kind, n.ref);
}
function qAddItem() {
  let m = document.getElementById("qpick");
  if (!m) {
    m = document.createElement("div");
    m.id = "qpick";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modalbox" style="max-width:520px"><div class="modalhd"><h2>➕ Adicionar ao quadro</h2><button class="close" onclick="fecharQPick()">✕</button></div><div class="savehelp"><input id="qpBusca" class="edinput" placeholder="Buscar pista, sala, personagem, coleção..." oninput="qPickRender(this.value)"><div id="qpLista" class="linklista"></div></div></div>`;
  m.classList.add("open");
  qPickRender("");
  setTimeout(() => {
    const b = document.getElementById("qpBusca");
    if (b) b.focus();
  }, 50);
}
function qPickItens(qq) {
  const ql = (qq || "").toLowerCase();
  const out = [];
  fichas.forEach((f) =>
    out.push({
      k: "pista",
      ic: "🗂",
      ref: f.id,
      nome: f.titulo || "(sem título)",
    }),
  );
  DADOS.salas
    .filter((s) => s.descoberta !== false)
    .forEach((s) =>
      out.push({ k: "sala", ic: "🚪", ref: s.nome, nome: s.nome }),
    );
  DADOS.personagens.forEach((s) =>
    out.push({ k: "pessoa", ic: "👤", ref: s.nome, nome: s.nome }),
  );
  DADOS.grupos.forEach((s) =>
    out.push({ k: "grupo", ic: "📦", ref: s.nome, nome: s.nome }),
  );
  return out
    .filter((x) => (x.nome || "").toLowerCase().includes(ql))
    .slice(0, 50);
}
function qPickRender(qq) {
  const box = document.getElementById("qpLista");
  if (!box) return;
  box.innerHTML =
    qPickItens(qq)
      .map(
        (x) =>
          `<div class="linkrow" onclick="qAddRef('${x.k}','${jsq(x.ref)}')">${x.ic} ${esc(x.nome)}</div>`,
      )
      .join("") || "<div class='gvazio'>(nada)</div>";
}
function qAddRef(kind, ref) {
  const q = quadroAtual();
  const c = qCentro();
  q.nodes.push({
    id: "n" + Date.now() + Math.floor(Math.random() * 999),
    tipo: "ref",
    kind: kind,
    ref: ref,
    x: c.x,
    y: c.y,
  });
  marcarAlterado();
  fecharQPick();
  desenhaQuadro();
}
function fecharQPick() {
  const m = document.getElementById("qpick");
  if (m) m.classList.remove("open");
}
function novaTeoria() {
  DADOS.teorias.push({ titulo: "Nova teoria", texto: "" });
  marcarAlterado();
  renderTeorias();
}
function setTeoria(i, campo, val) {
  if (DADOS.teorias[i]) {
    DADOS.teorias[i][campo] = val;
    marcarAlterado();
  }
}
/* ---- mencoes @ nas teorias ---- */
let _mentEditor = null,
  _mentNode = null,
  _mentStart = 0,
  _mentEnd = 0,
  _mentList = [];
function saveTeoEditor(ed) {
  const i = +ed.dataset.i;
  if (DADOS.teorias[i]) {
    DADOS.teorias[i].texto = window.Catalogo.htmlSeguro(ed.innerHTML);
    marcarAlterado();
  }
}
function mentItens(q) {
  const ql = (q || "").toLowerCase();
  const out = [];
  fichas.forEach((f) =>
    out.push({
      k: "pista",
      icon: "🗂",
      ref: f.id,
      nome: f.titulo || "(sem título)",
    }),
  );
  DADOS.salas
    .filter((s) => s.descoberta !== false)
    .forEach((s) =>
      out.push({ k: "sala", icon: "🚪", ref: s.nome, nome: s.nome }),
    );
  DADOS.personagens.forEach((s) =>
    out.push({ k: "pessoa", icon: "👤", ref: s.nome, nome: s.nome }),
  );
  DADOS.grupos.forEach((s) =>
    out.push({ k: "grupo", icon: "📦", ref: s.nome, nome: s.nome }),
  );
  return out
    .filter((x) => (x.nome || "").toLowerCase().includes(ql))
    .slice(0, 40);
}
function mentSave(ed) {
  if (ed.dataset && ed.dataset.qid) {
    qSetTexto(ed.dataset.qid, window.Catalogo.htmlSeguro(ed.innerHTML));
  } else {
    saveTeoEditor(ed);
  }
}
function teoEditorInput(ed) {
  mentSave(ed);
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) {
    hideMent();
    return;
  }
  const r = sel.getRangeAt(0);
  const node = r.startContainer;
  if (!node || node.nodeType !== 3) {
    hideMent();
    return;
  }
  const before = node.textContent.slice(0, r.startOffset);
  const m = before.match(/@([^\s@]{0,30})$/);
  if (!m) {
    hideMent();
    return;
  }
  _mentEditor = ed;
  _mentNode = node;
  _mentEnd = r.startOffset;
  _mentStart = r.startOffset - m[0].length;
  showMent(m[1], r);
}
function showMent(q, range) {
  let mu = document.getElementById("mentMenu");
  if (!mu) {
    mu = document.createElement("div");
    mu.id = "mentMenu";
    mu.className = "mentmenu";
    document.body.appendChild(mu);
  }
  _mentList = mentItens(q);
  mu.innerHTML =
    _mentList
      .map(
        (x, idx) =>
          `<div class="mentit" data-idx="${idx}">${x.icon} ${esc(x.nome)} <small>${x.k}</small></div>`,
      )
      .join("") ||
    "<div class='gvazio' style='padding:8px'>(nada encontrado)</div>";
  let rect = { left: 40, bottom: 120 };
  try {
    rect = range.getBoundingClientRect();
  } catch (e) {}
  mu.style.left = (rect.left || 40) + "px";
  mu.style.top = (rect.bottom || 120) + 4 + "px";
  mu.style.display = "block";
  mu.querySelectorAll(".mentit[data-idx]").forEach(
    (el) => (el.onclick = () => escolherMent(+el.dataset.idx)),
  );
}
function hideMent() {
  const mu = document.getElementById("mentMenu");
  if (mu) mu.style.display = "none";
}
function escolherMent(idx) {
  const x = _mentList[idx];
  if (!x || !_mentEditor || !_mentNode) return;
  const r = document.createRange();
  r.setStart(_mentNode, _mentStart);
  r.setEnd(_mentNode, _mentEnd);
  r.deleteContents();
  const span = document.createElement("span");
  span.className = "ment";
  span.contentEditable = "false";
  span.dataset.kind = x.k;
  span.dataset.ref = x.ref;
  span.textContent = x.icon + " " + x.nome;
  r.insertNode(span);
  const sp = document.createTextNode(" ");
  span.parentNode.insertBefore(sp, span.nextSibling);
  try {
    const sel = window.getSelection();
    const nr = document.createRange();
    nr.setStartAfter(sp);
    nr.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nr);
  } catch (e) {}
  hideMent();
  mentSave(_mentEditor);
}
function abrirMencao(k, ref) {
  if (k === "pista") abrir(ref);
  else abrirEntidade(k, ref);
}
document.addEventListener("click", function (e) {
  const m = e.target.closest && e.target.closest(".ment");
  if (m) {
    abrirMencao(m.dataset.kind, m.dataset.ref);
    return;
  }
  const mu = document.getElementById("mentMenu");
  if (
    mu &&
    mu.style.display === "block" &&
    !(e.target.closest && e.target.closest("#mentMenu")) &&
    !(e.target.closest && e.target.closest(".teotxt")) &&
    !(e.target.closest && e.target.closest(".qtxt"))
  )
    hideMent();
});
function excluirTeoria(i) {
  if (!confirm("Excluir esta teoria?")) return;
  DADOS.teorias.splice(i, 1);
  marcarAlterado();
  renderTeorias();
}

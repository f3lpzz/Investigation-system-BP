function getCss(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
const COR_SALA = "#6fa8c0",
  COR_PESSOA = "#cf7f70",
  COR_LIVRO = "#b07a2e",
  COR_MANUAL = "#b8452e";
const mapLayers = {
  pessoa: true,
  sala: true,
  colecao: true,
  grupo: true,
  manual: true,
};
const SALAS_OFICIAIS = {
  "The Foundation": {
    tipo: "Blueprint",
    raridade: "Rare",
    efeito: "Does not reset each day.",
    desc: "The cornerstone of the house, unvarying and unchanging, The Foundation is one of the only constants in the estate on which you can truly rely. This natural cavity was hollowed directly out of the mountain itself, with its stone and earth walls displaying an underlying coarseness that the rest of the mansion conceals.",
  },
};
const TIPOS_PADRAO = [
  { id: "sala", nome: "Sala", cor: "#6fa8c0" },
  { id: "pista", nome: "Pista", cor: "#c9a35c" },
  { id: "carta", nome: "Carta/Doc", cor: "#b07a2e" },
  { id: "pessoa", nome: "Pessoa", cor: "#cf7f70" },
  { id: "mecanica", nome: "Mecânica", cor: "#7a9c6e" },
];
var SCHEMA_VERSION = 6,
  DADOS_BROKEN = false;
function _dadosValido(d) {
  return !!(
    d &&
    typeof d === "object" &&
    Array.isArray(d.fichas) &&
    Array.isArray(d.salas) &&
    Array.isArray(d.personagens)
  );
}
if (
  typeof DADOS === "undefined" ||
  !DADOS ||
  typeof DADOS !== "object" ||
  !Array.isArray(DADOS.fichas)
) {
  DADOS = window.DADOS = {
    version: SCHEMA_VERSION,
    salas: [],
    personagens: [],
    colecoes: [],
    grupos: [],
    teorias: [],
    quadros: [],
    fichas: [],
    tipos: [],
  };
  DADOS_BROKEN = true;
}
DADOS.fichas = DADOS.fichas || [];
DADOS.teorias = DADOS.teorias || [];
if (!Array.isArray(DADOS.quadros)) {
  DADOS.quadros = [
    { nome: "Quadro 1", cam: { x: 40, y: 40, s: 1 }, nodes: [], setas: [] },
  ];
  (DADOS.teorias || []).forEach(function (t, i) {
    var tx = String(t.texto || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    DADOS.quadros[0].nodes.push({
      id: "n0_" + i,
      tipo: "texto",
      texto: (t.titulo ? t.titulo + "\n" : "") + tx,
      x: 40 + i * 40,
      y: 40 + i * 40,
      w: 250,
    });
  });
}
if (!Array.isArray(DADOS.tipos) || !DADOS.tipos.length)
  DADOS.tipos = TIPOS_PADRAO.map((t) => ({ ...t }));
(function () {
  const ids = new Set(DADOS.tipos.map((t) => t.id));
  DADOS.fichas.forEach((f) => {
    if (f.tipo && !ids.has(f.tipo)) {
      ids.add(f.tipo);
      DADOS.tipos.push({ id: f.tipo, nome: f.tipo, cor: "#88a" });
    }
  });
})();
function _normEnt(arr, nomes) {
  let list = Array.isArray(arr)
    ? arr.map((x) => (typeof x === "string" ? { nome: x } : x))
    : [];
  list = list.map((e) =>
    Object.assign(
      { nome: "", imagem: "", descricao: "", fatos: [], notas: "" },
      e,
    ),
  );
  const set = new Set(list.map((e) => e.nome));
  nomes.forEach((n) => {
    if (n && !set.has(n)) {
      set.add(n);
      list.push({ nome: n, imagem: "", descricao: "", fatos: [], notas: "" });
    }
  });
  return list;
}
DADOS.salas = _normEnt(
  DADOS.salas,
  DADOS.fichas.map((f) => f.sala).filter(Boolean),
);
(function () {
  DADOS.salas.forEach((s) => {
    const cat = (s.categorias && s.categorias[0]) || "";
    if (!s.diretorio)
      s.diretorio =
        cat === "Found Floorplan"
          ? "Found Floorplans"
          : cat === "Outer Room"
            ? "Outer Rooms"
            : cat === "Studio Addition"
              ? "Found Floorplans"
              : "";
    const o = SALAS_OFICIAIS[s.nome];
    if (o) {
      if (o.tipo) s.tipo = o.tipo;
      if (o.raridade) s.raridade = o.raridade;
      if (o.efeito) s.efeito = o.efeito;
      if (o.desc) s.descricao = o.desc;
    }
  });
})();
DADOS.personagens = _normEnt(
  DADOS.personagens,
  DADOS.fichas.flatMap((f) => f.personagens || []).filter(Boolean),
);
DADOS.colecoes = _normEnt(
  DADOS.colecoes,
  DADOS.fichas.flatMap((f) => f.colecoes || []).filter(Boolean),
);
function nomesDe(arr) {
  return arr.map((e) => e.nome);
}
function acharEnt(arr, nome) {
  return arr.find((e) => e.nome === nome);
}
function entListaDe(kind) {
  return kind === "sala"
    ? DADOS.salas
    : kind === "grupo"
      ? DADOS.grupos
      : kind === "colecao"
        ? DADOS.colecoes
        : DADOS.personagens;
}
function descobrirSala(nome) {
  const alvo = (nome || "").trim();
  if (!alvo) return "";
  let s = DADOS.salas.find((x) => x.nome.toLowerCase() === alvo.toLowerCase());
  if (s) {
    s.descoberta = true;
    return s.nome;
  }
  DADOS.salas.push({
    nome: alvo,
    imagem: "",
    descricao: "",
    categorias: [],
    fatos: [],
    notas: "",
    descoberta: true,
  });
  return alvo;
}
function confirmarDescobrir(nome) {
  const s = acharEnt(DADOS.salas, nome);
  if (!s) return;
  let m = document.getElementById("descModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "descModal";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modalbox" style="max-width:460px"><div class="modalhd"><h2>Descobrir sala?</h2><button class="close" onclick="fecharDesc()">✕</button></div>
    <div class="savehelp">${s.imagem ? `<img class="imgprev" src="${esc(s.imagem)}" style="max-height:200px;margin:0 auto" onerror="this.style.display='none'">` : ""}
    <h3 style="text-align:center;margin:4px 0">${esc(s.nome)}</h3>
    <p class="dica" style="text-align:center;margin:2px 0"><b>Tipo:</b> ${esc(s.tipo || (s.categorias || []).join(", ") || "—")}${s.raridade ? " &nbsp;·&nbsp; <b>Raridade:</b> " + esc(s.raridade) : ""}${s.efeito ? "<br><b>Efeito:</b> " + esc(s.efeito) : ""}</p>
    ${s.descricao ? `<p class="dica" style="text-align:center">${esc(s.descricao)}</p>` : ""}
    <div class="editbtns" style="justify-content:center"><button class="dbtn save" onclick="fazerDescobrir('${jsq(nome)}')">✓ Descobrir</button><button class="dbtn" onclick="fecharDesc()">Cancelar</button></div></div></div>`;
  m.classList.add("open");
}
function fazerDescobrir(nome) {
  const s = acharEnt(DADOS.salas, nome);
  if (s) {
    s.descoberta = true;
    marcarAlterado();
    rebuildFilters();
    render();
  }
  fecharDesc();
}
function fecharDesc() {
  const m = document.getElementById("descModal");
  if (m) m.classList.remove("open");
}
function rebloquearSala(nome) {
  const s = acharEnt(DADOS.salas, nome);
  if (!s) return;
  if (
    !confirm(
      'Re-bloquear "' +
        nome +
        '"? Ela volta a ser desconhecida e some das consultas.',
    )
  )
    return;
  s.descoberta = false;
  marcarAlterado();
  rebuildFilters();
  fechar();
  render();
}
let TIPOS = DADOS.tipos;

const fichas = typeof DADOS !== "undefined" && DADOS.fichas ? DADOS.fichas : [];
function pgs(f) {
  if (!Array.isArray(f.paginas) || !f.paginas.length) {
    f.paginas = [
      {
        imagem: f.imagem || "",
        original: f.original || "",
        traducao: f.traducao || "",
        explica: f.explica || "",
        rotulo: "",
      },
    ];
  }
  return f.paginas;
}
function pg0(f) {
  return pgs(f)[0] || {};
}
function txtAll(f) {
  return pgs(f)
    .map((pp) => [pp.original, pp.traducao, pp.explica].join(" "))
    .join(" ");
}
function mergeOrdenadas(d) {
  (d.colecoes || [])
    .filter((c) => c && c.ordenada)
    .slice()
    .forEach(function (col) {
      var membros = (d.fichas || []).filter((f) =>
        (f.colecoes || []).includes(col.nome),
      );
      if (membros.length <= 1) return;
      membros.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
      var base = membros[0];
      base.paginas = membros.map(function (f, i) {
        return {
          rotulo: "Pág. " + (i + 1),
          imagem:
            f.imagem ||
            (f.paginas && f.paginas[0] && f.paginas[0].imagem) ||
            "",
          original: f.original || "",
          traducao: f.traducao || "",
          explica: f.explica || "",
        };
      });
      var pers = [];
      membros.forEach((f) =>
        (f.personagens || []).forEach((pp) => {
          if (pp && pers.indexOf(pp) < 0) pers.push(pp);
        }),
      );
      base.personagens = pers;
      base.titulo = col.nome;
      base.colecoes = (base.colecoes || []).filter((c) => c !== col.nome);
      delete base.imagem;
      delete base.original;
      delete base.traducao;
      delete base.explica;
      delete base.simbolos;
      delete base.ordem;
      membros.slice(1).forEach(function (f) {
        var i = d.fichas.indexOf(f);
        if (i >= 0) d.fichas.splice(i, 1);
      });
      var ci = d.colecoes.indexOf(col);
      if (ci >= 0) d.colecoes.splice(ci, 1);
    });
}
(function () {
  var ov = DADOS.version || 1;
  if (ov < 3) {
    try {
      mergeOrdenadas(DADOS);
    } catch (e) {}
  }
})();
function _slugTipo(s) {
  return (
    "g_" +
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24)
  );
}
function _corHash(s) {
  var x = 0;
  for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) & 0xffffff;
  return "#" + ((x | 0x404040) & 0xffffff).toString(16).padStart(6, "0");
}
function migrarColecoesParaTipos(d) {
  (d.fichas || []).forEach(function (f) {
    var cs = (f.colecoes || []).filter(Boolean);
    if (cs.length) {
      var nome = cs[0];
      var id = _slugTipo(nome) || "g_" + Math.random().toString(36).slice(2, 7);
      if (!(d.tipos || []).some((t) => t.id === id))
        d.tipos.push({ id: id, nome: nome, cor: _corHash(nome) });
      f.tipo = id;
    }
    if ("colecoes" in f) delete f.colecoes;
    if ("ordem" in f) delete f.ordem;
  });
  d.colecoes = [];
}
(function () {
  if ((DADOS.version || 1) < 4) {
    try {
      migrarColecoesParaTipos(DADOS);
    } catch (e) {}
  }
})();
DADOS.grupos = DADOS.grupos || [];
function grupoObj(n) {
  return (DADOS.grupos || []).find((g) => g.nome === n);
}
function corGrupo(f) {
  var gs = f.grupos || [];
  for (var i = 0; i < gs.length; i++) {
    var g = grupoObj(gs[i]);
    if (g && g.cor) return g.cor;
  }
  return "#5b6b86";
}
function migrarGruposDeTipos(d) {
  if (!Array.isArray(d.grupos)) d.grupos = [];
  (d.tipos || []).slice().forEach(function (t) {
    if (t && typeof t.id === "string" && t.id.indexOf("g_") === 0) {
      if (!d.grupos.some((g) => g.nome === t.nome))
        d.grupos.push({
          nome: t.nome,
          cor: t.cor || _corHash(t.nome),
          imagem: "",
          descricao: "",
          fatos: [],
          notas: "",
        });
      (d.fichas || []).forEach(function (f) {
        if (f.tipo === t.id) {
          if (!Array.isArray(f.grupos)) f.grupos = [];
          if (f.grupos.indexOf(t.nome) < 0) f.grupos.push(t.nome);
          f.tipo = "pista";
        }
      });
      var i = d.tipos.indexOf(t);
      if (i >= 0) d.tipos.splice(i, 1);
    }
  });
  (d.fichas || []).forEach(function (f) {
    if (!Array.isArray(f.grupos)) f.grupos = [];
  });
}
(function () {
  if ((DADOS.version || 1) < 5) {
    try {
      migrarGruposDeTipos(DADOS);
    } catch (e) {}
  }
})();
(function () {
  var have = new Set(DADOS.grupos.map((g) => g.nome));
  fichas.forEach((f) =>
    (f.grupos || []).forEach((n) => {
      if (n && !have.has(n)) {
        have.add(n);
        DADOS.grupos.push({
          nome: n,
          cor: _corHash(n),
          imagem: "",
          descricao: "",
          fatos: [],
          notas: "",
        });
      }
    }),
  );
})();
(function () {
  if ((DADOS.version || 1) < 6) {
    (DADOS.fichas || []).forEach(function (f) {
      delete f.tipo;
    });
  }
})();
fichas.forEach(function (f) {
  pgs(f).forEach(function (p) {
    if ("simbolos" in p) delete p.simbolos;
  });
  ["imagem", "original", "traducao", "explica", "simbolos", "ordem"].forEach(
    function (k) {
      if (k in f) delete f[k];
    },
  );
});
DADOS.version = SCHEMA_VERSION;
const state = {
  busca: "",
  sala: "",
  pessoa: "",
  incompletas: false,
  pendentes: false,
  orfas: false,
  favoritas: false,
  grupo: "",
  idioma: "traducao",
  ordenacao: "recentes",
  selMode: false,
  sel: new Set(),
  dirCat: "Rooms 001-012",
  view: "grade",
};

/* ---- popular filtros ---- */
function buildChips() {}
buildChips();
const fsala = document.getElementById("fsala"),
  fpessoa = document.getElementById("fpessoa"),
  fgrupo = document.getElementById("fgrupo");
rebuildFilters();
fsala.onchange = (e) => {
  state.sala = e.target.value;
  render();
};
fpessoa.onchange = (e) => {
  state.pessoa = e.target.value;
  render();
};
fgrupo.onchange = (e) => {
  state.grupo = e.target.value;
  render();
};
document.getElementById("busca").oninput = (e) => {
  state.busca = e.target.value.toLowerCase();
  render();
};
document.getElementById("ordenar").onchange = (e) => {
  state.ordenacao = e.target.value;
  render();
};
function toggleIncompletas() {
  state.incompletas = !state.incompletas;
  render();
}
function togglePendentes() {
  state.pendentes = !state.pendentes;
  render();
}
document.addEventListener("keydown", (e) => {
  const tag = ((e.target && e.target.tagName) || "").toLowerCase();
  const editing = tag === "input" || tag === "textarea" || tag === "select";
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
    e.preventDefault();
    abrirPalette();
    return;
  }
  const _edit2 = editing || (e.target && e.target.isContentEditable);
  if (
    (e.ctrlKey || e.metaKey) &&
    !e.altKey &&
    (e.key === "z" || e.key === "Z")
  ) {
    if (_edit2) return;
    e.preventDefault();
    if (e.shiftKey) refazer();
    else desfazer();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
    if (_edit2) return;
    e.preventDefault();
    refazer();
    return;
  }
  if (e.key === "Escape") {
    const mm = document.getElementById("mentMenu");
    if (mm && mm.style.display === "block") {
      hideMent();
      return;
    }
  }
  if (e.key === "Escape") {
    // Fecha o overlay do topo da pilha (modal, sheet, popover, detalhe…)
    if (typeof overlayFecharTopo === "function" && overlayFecharTopo()) return;
    const om = document.querySelector(".modal.open");
    if (om) {
      om.classList.remove("open");
      return;
    }
    const dr = document.getElementById("drawer");
    if (dr && dr.classList.contains("open")) fechar();
  } else if (e.key === "/" && !editing) {
    e.preventDefault();
    const b = document.getElementById("busca");
    if (b) b.focus();
  }
});

/* ===== Modo compacto (mobile) — a MESMA definição do CSS =====
   CSS e JS compartilham esta media query (regra do plano mobile §3.5).
   Capacidade de entrada (toque × mouse) é uma dimensão separada. */
const MQ_COMPACTO = window.matchMedia
  ? window.matchMedia("(max-width: 720px), (max-height: 500px)")
  : null;
const MQ_TOQUE = window.matchMedia
  ? window.matchMedia("(pointer: coarse)")
  : null;
function ehCompacto() {
  return !!(MQ_COMPACTO && MQ_COMPACTO.matches);
}
function ehToque() {
  return !!(MQ_TOQUE && MQ_TOQUE.matches);
}
// Rotação/resize que muda o modo: re-renderiza a vista SEM trocar o que
// está aberto (drawer, filtros etc. permanecem como estão).
if (MQ_COMPACTO && MQ_COMPACTO.addEventListener) {
  MQ_COMPACTO.addEventListener("change", function () {
    try {
      render();
    } catch (e) {}
  });
}

/* ===== Navegação com estado + botão Voltar (History API) =====
   Ordem do Voltar: fechar overlay aberto → voltar de vista → sair do app.
   Cada overlay aberto registra um fechador; o popstate fecha o do topo. */
const _ovStack = []; // pilha de overlays abertos: {id, fechar}
let _navPopSilencioso = false; // history.back() interno (não fechar de novo)
function navPushOverlay(id, fecharFn) {
  if (_ovStack.some((o) => o.id === id)) return;
  _ovStack.push({ id: id, fechar: fecharFn });
  try {
    if (history.pushState) history.pushState({ bpOv: id }, "");
  } catch (e) {}
}
function navOverlayFechado(id) {
  const i = _ovStack.findIndex((o) => o.id === id);
  if (i < 0) return;
  _ovStack.splice(i, 1);
  // Fechou pelo botão/Escape: recua a entrada do histórico que o abriu.
  try {
    if (history.state && history.state.bpOv === id) {
      _navPopSilencioso = true;
      history.back();
    }
  } catch (e) {}
}
window.addEventListener("popstate", function (e) {
  if (_navPopSilencioso) {
    _navPopSilencioso = false;
    return;
  }
  // 1) Overlay aberto? Fecha o do topo (o history já recuou sozinho).
  const topo = _ovStack.pop();
  if (topo) {
    try {
      topo.fechar();
    } catch (err) {}
    return;
  }
  // 2) Sem overlay: volta de vista, se o estado guardar uma.
  const st = e.state;
  if (st && st.bpView) setView(st.bpView, true);
});

/* ===== Controlador de overlays (plano mobile §5.4) =====
   Um caminho só para modal, bottom sheet, detalhe full-screen, popover e
   lightbox: foco inicial, armadilha de Tab, fundo inert, fechar por botão/
   Escape/Voltar, devolução de foco e semântica de diálogo. */
const _ovInfo = {}; // id -> {el, opts, acionador, trap}
function _ovFocaveis(el) {
  const sel =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.prototype.filter.call(el.querySelectorAll(sel), function (x) {
    return x.offsetParent !== null || x === document.activeElement;
  });
}
function _ovRecalculaInert() {
  // Fundo inerte = há modal aberto que não contém o alvo (nem é contido).
  const modais = Object.keys(_ovInfo)
    .map((k) => _ovInfo[k])
    .filter((i) => i.opts.modal);
  const alvos = document.querySelectorAll(
    ".side, .tabbar, .fab, .topbar, .filtros-pills, .selbar, main > *",
  );
  alvos.forEach(function (alvo) {
    const deveInert = modais.some(
      (i) => !i.el.contains(alvo) && !alvo.contains(i.el),
    );
    try {
      alvo.inert = deveInert;
    } catch (e) {}
  });
}
function overlayAbrir(el, opts) {
  opts = opts || {};
  const id = opts.id || el.id;
  if (!el || !id || _ovInfo[id]) return;
  const info = {
    el: el,
    opts: opts,
    acionador:
      document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : null,
  };
  _ovInfo[id] = info;
  if (!opts.jaAberto) el.classList.add("open");
  if (opts.modal) {
    if (!el.getAttribute("role")) el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    info.trap = function (e) {
      if (e.key !== "Tab") return;
      const f = _ovFocaveis(el);
      if (!f.length) {
        e.preventDefault();
        return;
      }
      const first = f[0],
        last = f[f.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || !el.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el.addEventListener("keydown", info.trap);
    _ovRecalculaInert();
  }
  // Foco inicial: [autofocus] > primeiro focável > o próprio overlay.
  const foco =
    el.querySelector("[autofocus]") ||
    (opts.focoEm && el.querySelector(opts.focoEm)) ||
    _ovFocaveis(el)[0];
  try {
    if (foco) foco.focus();
    else {
      el.tabIndex = -1;
      el.focus();
    }
  } catch (e) {}
  navPushOverlay(id, function () {
    _ovDesfaz(id); // fechamento vindo do Voltar (popstate)
  });
  return id;
}
function overlayFechar(id) {
  // Fechamento por botão/Escape: desfaz e recua a entrada do histórico.
  if (!_ovInfo[id]) return;
  _ovDesfaz(id);
  navOverlayFechado(id);
}
function _ovDesfaz(id) {
  const info = _ovInfo[id];
  if (!info) return;
  delete _ovInfo[id];
  if (info.trap) info.el.removeEventListener("keydown", info.trap);
  if (info.opts.modal) {
    info.el.removeAttribute("aria-modal");
    _ovRecalculaInert();
  }
  if (info.opts.fechar) info.opts.fechar();
  else info.el.classList.remove("open");
  if (info.acionador && document.contains(info.acionador)) {
    try {
      info.acionador.focus();
    } catch (e) {}
  }
}
function overlayFecharTopo() {
  const topo = _ovStack[_ovStack.length - 1];
  if (!topo) return false;
  if (_ovInfo[topo.id]) overlayFechar(topo.id);
  else {
    try {
      topo.fechar(); // legado (drawer): o próprio fechar avisa a pilha
    } catch (e) {}
  }
  return true;
}
/* Qualquer .modal (ou .lightbox) que ganhe/perca .open entra/sai da pilha
   automaticamente — cobre também os modais da camada de IA (ia.js). */
if (window.MutationObserver) {
  new MutationObserver(function (muts) {
    muts.forEach(function (mu) {
      const el = mu.target;
      if (
        !el.classList ||
        !(el.classList.contains("modal") || el.classList.contains("lightbox"))
      )
        return;
      const aberto = el.classList.contains("open");
      if (!el.id) el.id = "ov-" + Math.random().toString(36).slice(2);
      if (aberto && !_ovInfo[el.id])
        overlayAbrir(el, { id: el.id, modal: true, jaAberto: true });
      else if (!aberto && _ovInfo[el.id]) overlayFechar(el.id);
    });
  }).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
  });
}

/* ===== Folha de ações contextual (plano mobile §5.6) =====
   Tap seleciona; as ações do item aparecem aqui (menu/bottom sheet modal).
   Nenhuma ação fica só no hover ou no duplo clique; excluir vem separado. */
function abrirSheetAcoes(titulo, itens, opts) {
  opts = opts || {};
  const el = document.createElement("div");
  el.className = "acsheet";
  el.id = "acsheet-" + Date.now();
  const botoes = itens
    .filter(Boolean)
    .map(function (it, i) {
      return (
        '<button class="acit' +
        (it.perigo ? " perigo" : "") +
        '" data-i="' +
        i +
        '"' +
        (it.desativado ? " disabled" : "") +
        ">" +
        (it.icone ? '<span class="acic">' + it.icone + "</span>" : "") +
        esc(it.rotulo) +
        (it.detalhe ? '<span class="acdet">' + esc(it.detalhe) + "</span>" : "") +
        "</button>"
      );
    })
    .join("");
  el.innerHTML =
    '<div class="acsheet-veu"></div>' +
    '<div class="acsheet-caixa" role="document">' +
    '<div class="sheet-grip"></div>' +
    (titulo ? '<div class="acsheet-tit">' + esc(titulo) + "</div>" : "") +
    botoes +
    '<button class="acit cancelar">Cancelar</button>' +
    "</div>";
  document.body.appendChild(el);
  el.setAttribute("aria-label", titulo || "Ações");
  const fecha = function () {
    overlayFechar(el.id);
  };
  // O toque que ABRE a folha gera um "clique fantasma" logo depois: sem
  // esta trava ele caía no véu (fechando na hora) ou num botão de ação.
  const nascido = Date.now();
  const fantasma = function () {
    return Date.now() - nascido < 400;
  };
  el.querySelector(".acsheet-veu").addEventListener("click", function () {
    if (!fantasma()) fecha();
  });
  el.querySelector(".acit.cancelar").addEventListener("click", function () {
    if (!fantasma()) fecha();
  });
  el.querySelectorAll(".acit[data-i]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (fantasma()) return;
      const it = itens.filter(Boolean)[+b.dataset.i];
      fecha();
      // Ação concluída no clique/pointerup (nunca no pointerdown) — §3.6
      if (it && it.fn) setTimeout(it.fn, 0);
    });
  });
  overlayAbrir(el, {
    id: el.id,
    modal: true,
    jaAberto: true,
    fechar: function () {
      el.remove();
    },
  });
  return el.id;
}
/* Variante do sheet para conteúdo informativo (ajuda, legenda). */
function abrirSheetHTML(titulo, html) {
  const el = document.createElement("div");
  el.className = "acsheet";
  el.id = "acsheet-" + Date.now();
  el.innerHTML =
    '<div class="acsheet-veu"></div>' +
    '<div class="acsheet-caixa" role="document">' +
    '<div class="sheet-grip"></div>' +
    '<div class="acsheet-tit">' +
    esc(titulo) +
    "</div>" +
    '<div class="acsheet-html">' +
    html +
    "</div>" +
    '<button class="acit cancelar">Fechar</button>' +
    "</div>";
  document.body.appendChild(el);
  el.setAttribute("aria-label", titulo);
  const fecha = function () {
    overlayFechar(el.id);
  };
  el.querySelector(".acsheet-veu").addEventListener("click", fecha);
  el.querySelector(".acit.cancelar").addEventListener("click", fecha);
  overlayAbrir(el, {
    id: el.id,
    modal: true,
    jaAberto: true,
    fechar: function () {
      el.remove();
    },
  });
  return el.id;
}

/* ===== Título do card no compacto: segurar mostra o nome inteiro =====
   O título fica em até 2 linhas com "…"; um toque LONGO (450ms) solta o
   corte e revela o texto completo; soltar volta ao normal — sem disparar
   o clique do card. */
let _titTimer = null,
  _titSegurou = false;
document.addEventListener(
  "pointerdown",
  function (e) {
    const t = e.target.closest && e.target.closest(".ctit");
    if (!t || !ehCompacto()) return;
    _titSegurou = false;
    clearTimeout(_titTimer);
    _titTimer = setTimeout(function () {
      if (t.scrollHeight - t.clientHeight > 4) {
        _titSegurou = true;
        t.classList.add("rolando");
      }
    }, 450);
  },
  true,
);
["pointerup", "pointercancel"].forEach(function (ev) {
  document.addEventListener(
    ev,
    function () {
      clearTimeout(_titTimer);
      document.querySelectorAll(".ctit.rolando").forEach(function (t) {
        t.classList.remove("rolando");
      });
    },
    true,
  );
});
// Depois do toque longo, o clique que o navegador dispara não deve abrir o card.
document.addEventListener(
  "click",
  function (e) {
    if (_titSegurou && e.target.closest && e.target.closest(".card")) {
      _titSegurou = false;
      e.stopPropagation();
      e.preventDefault();
    }
  },
  true,
);
// O menu de contexto do navegador não deve interromper o toque longo no título.
document.addEventListener("contextmenu", function (e) {
  if (e.target.closest && e.target.closest(".ctit") && ehCompacto())
    e.preventDefault();
});

/* ===== Gestos de ponteiro compartilhados (plano mobile §5.5) =====
   Mapa, Quadros e lightbox usam o mesmo controlador: tap × arraste com
   limiar, pan, pinch, captura de ponteiro, pointercancel e conclusão de
   ações no pointerup. Mouse e teclado continuam com os caminhos atuais. */
function ligarGestos(el, h) {
  const pts = new Map(); // pointerId -> {x, y, x0, y0}
  let modo = null; // null | aguarda | drag | pinch | long
  let t0 = 0,
    ultTap = 0,
    pinchBase = null,
    alvo0 = null,
    lpTimer = null; // segurar o toque parado -> h.longPress
  const LIMIAR = 8; // px de movimento antes de virar arraste
  function pAtual() {
    const arr = [...pts.values()];
    if (arr.length < 2) return null;
    const dx = arr[1].x - arr[0].x,
      dy = arr[1].y - arr[0].y;
    return {
      d: Math.hypot(dx, dy) || 1,
      cx: (arr[0].x + arr[1].x) / 2,
      cy: (arr[0].y + arr[1].y) / 2,
    };
  }
  function down(e) {
    if (h.ignorar && h.ignorar(e)) return;
    if (e.pointerType === "mouse" && h.mouseProprio) return; // mouse: fluxo atual
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {}
    pts.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      x0: e.clientX,
      y0: e.clientY,
    });
    if (pts.size === 1) {
      modo = "aguarda";
      t0 = Date.now();
      alvo0 = e.target;
      if (h.longPress) {
        clearTimeout(lpTimer);
        const alvoLp = e.target,
          px = e.clientX,
          py = e.clientY;
        lpTimer = setTimeout(function () {
          if (
            modo === "aguarda" &&
            pts.size === 1 &&
            h.longPress(alvoLp, { x: px, y: py })
          )
            modo = "long";
        }, 450);
      }
      if (h.inicio) h.inicio(e);
    } else if (pts.size === 2) {
      clearTimeout(lpTimer);
      if (modo === "drag" && h.dragCancela) h.dragCancela(e);
      if (modo === "long" && h.cancelar) h.cancelar(e);
      modo = "pinch";
      pinchBase = pAtual();
      if (h.pinchInicio) h.pinchInicio(pinchBase);
    }
    if (e.pointerType !== "mouse") e.preventDefault();
  }
  function move(e) {
    const p = pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (modo === "aguarda") {
      if (Math.hypot(p.x - p.x0, p.y - p.y0) > LIMIAR) {
        clearTimeout(lpTimer);
        modo = "drag";
        if (h.dragInicio) h.dragInicio(e, alvo0, p.x0, p.y0);
      }
    }
    if (modo === "long" && h.longDrag) h.longDrag(e);
    else if (modo === "drag" && h.drag) h.drag(e, p.x - p.x0, p.y - p.y0);
    else if (modo === "pinch" && pinchBase) {
      const agora = pAtual();
      if (!agora) return;
      if (h.pinch)
        h.pinch({
          fator: agora.d / pinchBase.d,
          cx: agora.cx,
          cy: agora.cy,
          dx: agora.cx - pinchBase.cx,
          dy: agora.cy - pinchBase.cy,
        });
      pinchBase = agora;
    }
  }
  function up(e) {
    const p = pts.get(e.pointerId);
    if (!p) return;
    pts.delete(e.pointerId);
    clearTimeout(lpTimer);
    if (modo === "long") {
      if (h.longFim) h.longFim(e);
      modo = null;
      pinchBase = null;
      return;
    }
    if (modo === "aguarda" && Date.now() - t0 < 600) {
      const agora = Date.now();
      if (h.doubleTap && agora - ultTap < 320) {
        ultTap = 0;
        h.doubleTap(e, alvo0);
      } else {
        ultTap = agora;
        if (h.tap) h.tap(e, alvo0);
      }
    } else if (modo === "drag" && h.dragFim) h.dragFim(e);
    else if (modo === "pinch" && h.pinchFim) h.pinchFim(e);
    modo = pts.size === 1 ? "drag" : pts.size ? modo : null;
    if (pts.size === 1) {
      // sobrou um dedo do pinch: recomeça o arraste do zero
      const resto = [...pts.values()][0];
      resto.x0 = resto.x;
      resto.y0 = resto.y;
      if (h.dragInicio) h.dragInicio(e, null, resto.x, resto.y);
    }
    if (!pts.size) pinchBase = null;
  }
  function cancel(e) {
    // Gesto cancelado pelo sistema: NENHUMA ação dispara (§P03/P11).
    clearTimeout(lpTimer);
    pts.delete(e.pointerId);
    modo = null;
    pinchBase = null;
    if (h.cancelar) h.cancelar(e);
  }
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", cancel);
  return {
    destruir: function () {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", cancel);
    },
  };
}

[
  ["vGrade", "grade"],
  ["vMapa", "mapa"],
  ["vTeorias", "teorias"],
  ["vArquivo", "arquivo"],
  ["vConta", "conta"],
].forEach(([id, v]) => {
  const b = document.getElementById(id);
  if (b) b.onclick = () => setView(v);
});
function setView(v, deHistorico) {
  const mudou = state.view !== v;
  // Entrar no Arquivo recomeça pela lista de categorias (compacto)
  if (mudou && v === "arquivo") _arqCatsAberto = true;
  state.view = v;
  // Botão Voltar: cada troca de vista vira uma entrada no histórico.
  try {
    if (!deHistorico && history.pushState) {
      if (mudou && history.state && history.state.bpView)
        history.pushState({ bpView: v }, "");
      else history.replaceState({ bpView: v }, "");
    }
  } catch (e) {}
  // Trilho: item ativo (mundo/diretorio são legado dos testes — acendem Arquivo)
  const ativo = {
    grade: "vGrade",
    mapa: "vMapa",
    teorias: "vTeorias",
    arquivo: "vArquivo",
    mundo: "vArquivo",
    diretorio: "vArquivo",
    conta: "vConta",
  }[v];
  ["vGrade", "vMapa", "vTeorias", "vArquivo", "vConta"].forEach((id) => {
    const b = document.getElementById(id);
    if (b) b.classList.toggle("active", id === ativo);
  });
  // Barra inferior (mobile)
  document.querySelectorAll("#tabbar .tbit").forEach((b) => {
    const ativoTab =
      b.dataset.view === v ||
      (b.dataset.view === "arquivo" && (v === "mundo" || v === "diretorio"));
    b.classList.toggle("active", ativoTab);
    if (ativoTab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  document.body.className = document.body.className
    .replace(/\bview-[a-z]+\b/g, "")
    .trim();
  document.body.classList.add("view-" + v);
  document.getElementById("grade").style.display =
    v === "grade" ? "grid" : "none";
  document.getElementById("mapa").style.display =
    v === "mapa" ? "block" : "none";
  document.getElementById("mundo").style.display =
    v === "mundo" ? "block" : "none";
  document.getElementById("diretorio").style.display =
    v === "diretorio" ? "block" : "none";
  const td = document.getElementById("teorias");
  if (td) td.style.display = v === "teorias" ? "flex" : "none";
  const ar = document.getElementById("arquivo");
  if (ar) ar.style.display = v === "arquivo" ? "flex" : "none";
  const ct = document.getElementById("conta");
  if (ct) ct.style.display = v === "conta" ? "block" : "none";
  // O ＋ (FAB) muda de papel por vista: nova ficha × adicionar ao quadro.
  const fabEl = document.getElementById("fab");
  if (fabEl) {
    const rot = v === "teorias" ? "Adicionar ao quadro" : "Nova ficha";
    fabEl.title = rot;
    fabEl.setAttribute("aria-label", rot);
  }
  render();
}
/* FAB por vista: em Quadros abre a folha de criação; nas demais, nova ficha. */
function fabAcao() {
  if (state.view === "teorias") {
    abrirSheetAcoes("Adicionar ao quadro", [
      { rotulo: "Ficha do arquivo", icone: "🗂", fn: qAddItem },
      { rotulo: "Nota adesiva", icone: "🗒", fn: qAddNota },
      { rotulo: "Caixa de texto", icone: "T", fn: qAddTexto },
    ]);
    return;
  }
  novaFicha();
}
/* Menu ··· (ações raras: idioma, seleção, ordenar, desfazer/refazer) */
function toggleMore(force) {
  const m = document.getElementById("moreMenu");
  if (!m) return;
  const abrir = typeof force === "boolean" ? force : !m.classList.contains("open");
  if (abrir) overlayAbrir(m, { id: "moreMenu", modal: false });
  else overlayFechar("moreMenu");
}
document.addEventListener("click", function (e) {
  const m = document.getElementById("moreMenu");
  if (!m || !m.classList.contains("open")) return;
  if (m.contains(e.target)) return;
  const b = document.getElementById("btnMore");
  if (b && b.contains(e.target)) return;
  overlayFechar("moreMenu");
});

/* ---- filtro ---- */
function fichaIncompleta(f) {
  const m = [];
  const p = pg0(f);
  if (!f.sala) m.push("sala");
  if (!p.traducao || !p.traducao.trim()) m.push("tradução");
  if (!p.imagem) m.push("imagem");
  return m;
}
function ordenarFichas(arr) {
  const o = state.ordenacao;
  if (o === "recentes")
    arr.sort((a, b) => fichas.indexOf(b) - fichas.indexOf(a));
  else if (o === "sala")
    arr.sort(
      (a, b) =>
        (a.sala || "\uffff").localeCompare(b.sala || "\uffff") ||
        a.titulo.localeCompare(b.titulo),
    );
  else if (o === "titulo") arr.sort((a, b) => a.titulo.localeCompare(b.titulo));
  else arr.sort((a, b) => a.titulo.localeCompare(b.titulo));
  return arr;
}
function passa(f) {
  if (state.sala && f.sala !== state.sala) return false;
  if (
    state.pessoa &&
    !(f.personagens || []).some(
      (pp) => nomeCanon(pp) === nomeCanon(state.pessoa),
    )
  )
    return false;
  if (state.grupo && !(f.grupos || []).includes(state.grupo)) return false;
  if (state.incompletas && fichaIncompleta(f).length === 0) return false;
  if (state.pendentes && !f.pendente) return false;
  if (state.favoritas && !f.fav) return false;
  if (
    state.orfas &&
    !(
      (f.conexoes || []).length === 0 &&
      !f.sala &&
      !(f.personagens || []).length &&
      !(f.colecoes || []).length
    )
  )
    return false;
  if (state.busca) {
    const blob = [
      f.titulo,
      txtAll(f),
      f.sala,
      (f.colecoes || []).join(" "),
      (f.personagens || []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    if (!blob.includes(state.busca)) return false;
  }
  return true;
}

/* ---- GRADE ---- */
function renderGrade() {
  const box = document.getElementById("grade");
  box.innerHTML = "";
  const vis = ordenarFichas(fichas.filter(passa));
  if (!vis.length) {
    const temFiltro =
      state.sala ||
      state.pessoa ||
      state.grupo ||
      state.incompletas ||
      state.pendentes ||
      state.orfas ||
      state.favoritas;
    const lupa = `<svg width="56" height="56" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.6" fill="none" stroke="#948669" stroke-width="1.8"></circle><line x1="12.6" y1="12.6" x2="17" y2="17" stroke="#948669" stroke-width="1.8" stroke-linecap="round"></line></svg>`;
    if (state.busca) {
      box.innerHTML = `<div class="empty"><div class="eic">${lupa}</div><div class="etit">Nada encontrado</div><div class="etxt">Nenhuma ficha, sala ou pessoa para <b>“${esc(state.busca)}”</b>.</div><button class="topbtn ghost" onclick="limparBusca()">Limpar busca</button></div>`;
    } else if (temFiltro) {
      box.innerHTML = `<div class="empty"><div class="eic">${lupa}</div><div class="etit">Nada encontrado</div><div class="etxt">Nenhuma ficha corresponde aos filtros atuais.</div><button class="topbtn ghost" onclick="limparFiltros()">Limpar filtros</button></div>`;
    } else {
      box.innerHTML = `<div class="empty"><div class="eic">${lupa}</div><div class="etit">Nenhuma ficha ainda</div><div class="etxt">Comece registrando a primeira evidência da sua investigação.</div><button class="topbtn primary" onclick="novaFicha()">＋ Nova ficha</button></div>`;
    }
    return;
  }
  vis.forEach((f) => {
    const c = document.createElement("div");
    c.className = "card";
    if (state.sel.has(f.id)) c.classList.add("selected");
    const falta = fichaIncompleta(f);
    const soTrad = falta.length === 1 && falta[0] === "tradução";
    const img = pg0(f).imagem;
    const resumo = esc(
      state.idioma === "original"
        ? pg0(f).original || pg0(f).traducao || pg0(f).explica || ""
        : pg0(f).traducao || pg0(f).explica || pg0(f).original || "",
    );
    // Rodapé: grupo (bolinha na cor) · personagens; sem nada = "sem conexões ainda"
    const rGrupos = (f.grupos || [])
      .map((gn) => {
        var g = grupoObj(gn);
        return `<span class="cgrupo" onclick="event.stopPropagation();filtraGrupo('${jsq(gn)}')"><span class="gdot" style="background:${(g && g.cor) || "#8d3030"}"></span>${esc(gn)}</span>`;
      })
      .join("");
    const rPess = (f.personagens || []).length
      ? `<span class="cpess">${(f.grupos || []).length ? "· " : ""}${esc(f.personagens.join(", "))}</span>`
      : "";
    let rodape = rGrupos + rPess;
    if (soTrad)
      rodape =
        `<span class="cfalta" title="Falta tradução">falta tradução</span>` +
        (rPess ? " " + rPess : "");
    else if (falta.length && !rodape) {
      // "falta imagem" não entra no rodapé — sem conexões, vale "sem conexões ainda"
      const faltaTxt = falta.filter((x) => x !== "imagem");
      if (faltaTxt.length)
        rodape = `<span class="cfalta" title="Falta: ${faltaTxt.join(", ")}">falta ${faltaTxt.join(", ")}</span>`;
    }
    if (!rodape) rodape = `<span class="cvazio">sem conexões ainda</span>`;
    // Carimbos datilografados no lugar de badges
    let stamp = "";
    if (f.status === "resolvida")
      stamp = `<span class="stamp res">RESOLVIDA</span>`;
    else if (f.pendente)
      stamp = `<span class="stamp pend" title="Ainda não processada">PENDENTE</span>`;
    else if (f.status === "importante")
      stamp = `<span class="stamp imp">IMPORTANTE</span>`;
    // Identificador no estilo do carimbo do design: f3 → F-003
    const idVis = String(f.id).replace(
      /^([a-z]+)(\d+)$/i,
      (_m, letra, num) => letra.toUpperCase() + "-" + num.padStart(3, "0"),
    );
    c.innerHTML = `
      <div class="selcheck">${state.sel.has(f.id) ? "✓" : ""}</div>
      <span class="pin${f.fav ? " fav" : ""}"></span>
      <div class="chead">
        <span class="cid">${esc(idVis)}</span>
        <span class="csala">${f.sala ? esc(f.sala) : "—"}</span>
        <span class="cstar${f.fav ? " on" : ""}" onclick="event.stopPropagation();toggleFav('${f.id}')" title="Favoritar">★</span>
      </div>
      <h3 class="ctit">${esc(f.titulo)}</h3>
      <div class="cthumb">${
        img
          ? `<img class="thumb" loading="lazy" src="${esc(img)}" onerror="this.remove()">`
          : `<span class="cph">foto da ficha</span>`
      }${pgs(f).length > 1 ? `<span class="pgcount">${pgs(f).length} págs.</span>` : ""}</div>
      <div class="cexc">${resumo}</div>
      ${stamp}
      <div class="cfoot">${rodape}</div>`;
    c.onclick = () => {
      if (state.selMode) {
        toggleSel(f.id);
      } else abrir(f.id);
    };
    box.appendChild(c);
  });
}

/* ---- MAPA (grafo) ---- */
let nodes = [],
  links = [],
  sim = null;
let posCache = (function () {
  try {
    return JSON.parse(localStorage.getItem("bpMapPos") || "{}") || {};
  } catch (e) {
    return {};
  }
})();
(function () {
  var LAYV = "2";
  try {
    if (localStorage.getItem("bpMapLayV") !== LAYV) {
      posCache = {};
      localStorage.setItem("bpMapLayV", LAYV);
    }
  } catch (e) {}
})();
let _mapFitted = false;
function _seedPos(id) {
  var hx = 2166136261,
    hy = 98765431;
  for (var i = 0; i < id.length; i++) {
    hx = ((hx ^ id.charCodeAt(i)) * 16777619) >>> 0;
    hy = (hy * 131 + id.charCodeAt(i) * 7) >>> 0;
  }
  return { x: 120 + (hx % 560), y: 90 + (hy % 420) };
}
function savePosCache() {
  try {
    localStorage.setItem("bpMapPos", JSON.stringify(posCache));
  } catch (e) {}
}
function _ccw(a, b, c) {
  return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
}
function _segCross(p1, p2, p3, p4) {
  return (
    _ccw(p1, p3, p4) !== _ccw(p2, p3, p4) &&
    _ccw(p1, p2, p3) !== _ccw(p1, p2, p4)
  );
}
function _localCross(ids) {
  var set = {};
  ids.forEach(function (i) {
    set[i] = 1;
  });
  var inc = links.filter(function (l) {
    return set[l.s] || set[l.t];
  });
  var c = 0;
  for (var x = 0; x < inc.length; x++) {
    var a = inc[x];
    for (var y = 0; y < links.length; y++) {
      var b = links[y];
      if (a === b) continue;
      if (a.s === b.s || a.s === b.t || a.t === b.s || a.t === b.t) continue;
      var a1 = nmap(a.s),
        a2 = nmap(a.t),
        b1 = nmap(b.s),
        b2 = nmap(b.t);
      if (!a1 || !a2 || !b1 || !b2) continue;
      if (_segCross(a1, a2, b1, b2)) c++;
    }
  }
  return c;
}
function reduceCrossings() {
  if (links.length < 2) return;
  for (var pass = 0; pass < 24; pass++) {
    var improved = false;
    for (var i = 0; i < nodes.length; i++)
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i],
          b = nodes[j];
        var before = _localCross([a.id, b.id]);
        if (before === 0) continue;
        var ax = a.x,
          ay = a.y,
          bx = b.x,
          by = b.y;
        a.x = bx;
        a.y = by;
        b.x = ax;
        b.y = ay;
        var after = _localCross([a.id, b.id]);
        if (after < before) {
          improved = true;
        } else {
          a.x = ax;
          a.y = ay;
          b.x = bx;
          b.y = by;
        }
      }
    if (!improved) break;
  }
}
function relaxOverlap() {
  for (var it = 0; it < 140; it++) {
    var moved = false;
    for (var i = 0; i < nodes.length; i++)
      for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i],
          b = nodes[j];
        var dx = a.x - b.x,
          dy = a.y - b.y,
          d = Math.sqrt(dx * dx + dy * dy) || 1;
        var minD = a.r + b.r + 18;
        if (d < minD) {
          var psh = (minD - d) / 2 / d;
          dx *= psh;
          dy *= psh;
          a.x += dx;
          a.y += dy;
          b.x -= dx;
          b.y -= dy;
          moved = true;
        }
      }
    if (!moved) break;
  }
}
function layoutIfNeeded() {
  var novos = nodes.filter(function (n) {
    return n._new;
  }).length;
  if (!novos) return false;
  var fresh = novos === nodes.length;
  for (var it = 0; it < (fresh ? 500 : 220); it++) step(_viewW, _viewH, !fresh);
  if (fresh) {
    reduceCrossings();
    relaxOverlap();
  }
  nodes.forEach(function (n) {
    n._new = false;
  });
  savePosCache();
  return fresh;
}
function buildGraph() {
  const vis = fichas.filter(passa);
  const idset = new Set(vis.map((f) => f.id));
  nodes = [];
  links = [];
  const nmap = {};
  function node(id, label, kind, cor, r) {
    if (nmap[id]) return nmap[id];
    const pc = posCache[id];
    const sp = pc || _seedPos(id);
    const n = {
      id,
      label,
      kind,
      cor,
      r,
      x: sp.x,
      y: sp.y,
      vx: 0,
      vy: 0,
      _new: !pc,
    };
    nmap[id] = n;
    nodes.push(n);
    return n;
  }
  vis.forEach((f) => {
    node(f.id, f.titulo, "ficha", corGrupo(f), 9);
    if (f.sala && mapLayers.sala) {
      node("sala::" + f.sala, f.sala, "sala", COR_SALA, 13);
      links.push({ s: f.id, t: "sala::" + f.sala, kind: "sala" });
    }
    if (mapLayers.pessoa)
      (f.personagens || []).forEach((p) => {
        node("pes::" + p, p, "pessoa", COR_PESSOA, 13);
        links.push({ s: f.id, t: "pes::" + p, kind: "pessoa" });
      });
    if (mapLayers.grupo)
      (f.grupos || []).forEach((gn) => {
        node(
          "grp::" + gn,
          gn,
          "grupo",
          (grupoObj(gn) || {}).cor || COR_LIVRO,
          16,
        );
        links.push({ s: f.id, t: "grp::" + gn, kind: "grupo" });
      });
    if (mapLayers.manual)
      (f.conexoes || []).forEach((cid) => {
        if (idset.has(cid)) links.push({ s: f.id, t: cid, kind: "manual" });
      });
  });
}
function renderMapa() {
  buildGraph();
  const svg = document.getElementById("svg");
  _viewW = svg.clientWidth || 900;
  _viewH = svg.clientHeight || 600;
  const mini = document.getElementById("minimap");
  if (!nodes.length) {
    svg.innerHTML = `<text x="50%" y="50%" fill="#9fb3d8" text-anchor="middle" font-size="15">Nenhuma ficha para mapear ainda.</text>`;
    if (mini) mini.style.display = "none";
    return;
  }
  if (mini) mini.style.display = "";
  const _did = layoutIfNeeded();
  wireMap(svg);
  if (_did || !_mapFitted) {
    fitCamera(false);
    _mapFitted = true;
  }
  draw(svg);
  buildLegend();
  buildMapToggles();
}
function mapaSoftRefresh() {
  const svg = document.getElementById("svg");
  const mini = document.getElementById("minimap");
  buildGraph();
  if (!nodes.length) {
    svg.innerHTML = "";
    if (mini) mini.style.display = "none";
    return;
  }
  if (mini) mini.style.display = "";
  layoutIfNeeded();
  draw(svg);
  buildLegend();
  buildMapToggles();
}
function step(W, H, freezeOld) {
  const k = 0.012,
    rep = 4200,
    springLen = 150;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    a.vx += (W / 2 - a.x) * k * 0.02;
    a.vy += (H / 2 - a.y) * k * 0.02;
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x,
        dy = a.y - b.y,
        d2 = dx * dx + dy * dy || 1,
        d = Math.sqrt(d2);
      let f = rep / d2;
      dx /= d;
      dy /= d;
      a.vx += dx * f;
      a.vy += dy * f;
      b.vx -= dx * f;
      b.vy -= dy * f;
      const minD = a.r + b.r + 30;
      if (d < minD) {
        const push = (minD - d) * 0.45;
        a.vx += dx * push;
        a.vy += dy * push;
        b.vx -= dx * push;
        b.vy -= dy * push;
      }
    }
  }
  links.forEach((l) => {
    const a = nmap(l.s),
      b = nmap(l.t);
    if (!a || !b) return;
    let dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.sqrt(dx * dx + dy * dy) || 1,
      f = (d - springLen) * 0.02;
    dx /= d;
    dy /= d;
    a.vx += dx * f;
    a.vy += dy * f;
    b.vx -= dx * f;
    b.vy -= dy * f;
  });
  nodes.forEach((n) => {
    if (freezeOld && !n._new) {
      n.vx = 0;
      n.vy = 0;
      return;
    }
    n.x += n.vx *= 0.82;
    n.y += n.vy *= 0.82;
  });
}
function nmap(id) {
  return nodes.find((n) => n.id === id);
}

/* ---- camera: pan + zoom + minimapa ---- */
let cam = { x: 0, y: 0, s: 1 };
let _viewW = 900,
  _viewH = 600;
let _mapWired = false,
  _drag = null,
  _pan = null,
  _suppress = false,
  _miniT = null;
let _space = false,
  _selMap = new Set(),
  _marq = null;
function ensureSelBox() {
  let b = document.getElementById("selbox");
  if (!b) {
    b = document.createElement("div");
    b.id = "selbox";
    b.className = "selbox";
    document.body.appendChild(b);
  }
  return b;
}
function showSelBox(m) {
  const b = ensureSelBox();
  b.style.display = "block";
  updateSelBox(m);
}
function updateSelBox(m) {
  const b = ensureSelBox();
  const x = Math.min(m.x0, m.x1),
    y = Math.min(m.y0, m.y1),
    w = Math.abs(m.x1 - m.x0),
    hh = Math.abs(m.y1 - m.y0);
  b.style.left = x + "px";
  b.style.top = y + "px";
  b.style.width = w + "px";
  b.style.height = hh + "px";
}
function hideSelBox() {
  const b = document.getElementById("selbox");
  if (b) b.style.display = "none";
}
function nodesInRect(svg, m) {
  const r = svg.getBoundingClientRect();
  const x0 = Math.min(m.x0, m.x1),
    x1 = Math.max(m.x0, m.x1),
    y0 = Math.min(m.y0, m.y1),
    y1 = Math.max(m.y0, m.y1);
  const s = new Set();
  nodes.forEach(function (n) {
    const cx = r.left + (n.x * cam.s + cam.x),
      cy = r.top + (n.y * cam.s + cam.y);
    if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) s.add(n.id);
  });
  return s;
}
document.addEventListener("keydown", function (e) {
  var t = ((e.target && e.target.tagName) || "").toLowerCase();
  var digitando =
    t === "input" ||
    t === "textarea" ||
    t === "select" ||
    (e.target && e.target.isContentEditable);
  if (e.code === "Space") {
    if (digitando) return;
    _space = true;
  }
  // Atalhos de câmera (convenção tldraw): Shift+1 enquadra, Shift+0 = 100%.
  // Valem no Mapa e nos Quadros (cada um com a própria câmera).
  if (!digitando && e.shiftKey && typeof state !== "undefined") {
    if (state.view === "mapa") {
      if (e.code === "Digit1") {
        e.preventDefault();
        fitCamera(true);
      } else if (e.code === "Digit0") {
        e.preventDefault();
        zoom100Mapa();
      }
    } else if (state.view === "teorias") {
      if (e.code === "Digit1") {
        e.preventDefault();
        qFitCamera();
      } else if (e.code === "Digit0") {
        e.preventDefault();
        qZoom100();
      }
    }
  }
  // Ferramentas dos Quadros: V/H/T/N/A, Esc, Delete, Ctrl+D (fora de campos de texto).
  if (!digitando && typeof state !== "undefined" && state.view === "teorias") {
    if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      if (e.code === "KeyV") qSetTool("select");
      else if (e.code === "KeyH") qSetTool("hand");
      else if (e.code === "KeyT") qSetTool("texto");
      else if (e.code === "KeyN") qSetTool("nota");
      else if (e.code === "KeyA") qSetTool("seta");
      else if (e.code === "Escape") {
        qSetTool("select");
        _qSelSet = new Set();
        _qSetaSel = new Set();
        _qRebind = null;
        _qRebindCur = null;
        if (typeof markSelDom === "function") markSelDom();
        if (typeof desenhaSetas === "function") desenhaSetas();
      } else if (e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        qApagarSelecao(); // apaga cartões E setas selecionados
      }
    } else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === "KeyD") {
      e.preventDefault();
      qDuplicarSelecao();
    }
  }
});
// Canvas reage a redimensionar a janela (viewport/minimapa não ficam defasados).
window.addEventListener("resize", function () {
  var svg = document.getElementById("svg");
  if (!svg || typeof state === "undefined" || state.view !== "mapa") return;
  _viewW = svg.clientWidth || _viewW;
  _viewH = svg.clientHeight || _viewH;
  camRedraw();
});
document.addEventListener("keyup", function (e) {
  if (e.code === "Space") _space = false;
});
window.addEventListener("blur", function () {
  _space = false;
});
function s2w(sx, sy) {
  return { x: (sx - cam.x) / cam.s, y: (sy - cam.y) / cam.s };
}
function worldBounds() {
  let a = 1e9,
    b = 1e9,
    c = -1e9,
    d = -1e9;
  nodes.forEach((n) => {
    if (n.x < a) a = n.x;
    if (n.y < b) b = n.y;
    if (n.x > c) c = n.x;
    if (n.y > d) d = n.y;
  });
  if (a > c) {
    a = 0;
    b = 0;
    c = _viewW;
    d = _viewH;
  }
  return { minX: a, minY: b, maxX: c, maxY: d };
}
function fitCamera(redraw) {
  const bb = worldBounds(),
    m = 70;
  const w = bb.maxX - bb.minX || 1,
    h = bb.maxY - bb.minY || 1;
  cam.s = Math.max(
    MAPA_ZOOM_MIN,
    Math.min((_viewW - m * 2) / w, (_viewH - m * 2) / h, 1.6),
  );
  cam.x = _viewW / 2 - ((bb.minX + bb.maxX) / 2) * cam.s;
  cam.y = _viewH / 2 - ((bb.minY + bb.maxY) / 2) * cam.s;
  if (redraw) camRedraw();
}
/* Zoom por botão (+/−): âncora no centro da tela — alternativa simples ao
   gesto de pinça (P03/§3.2). */
function zoomMapaEm(sx, sy, f) {
  const w = s2w(sx, sy);
  cam.s = Math.max(MAPA_ZOOM_MIN, Math.min(MAPA_ZOOM_MAX, cam.s * f));
  cam.x = sx - w.x * cam.s;
  cam.y = sy - w.y * cam.s;
  aplicaCamMapa();
}
function zoomMapa(f) {
  zoomMapaEm(_viewW / 2, _viewH / 2, f);
}
// Zoom 100% mantendo o ponto do centro da tela fixo (Shift+0).
function zoom100Mapa() {
  const c = s2w(_viewW / 2, _viewH / 2);
  cam.s = 1;
  cam.x = _viewW / 2 - c.x;
  cam.y = _viewH / 2 - c.y;
  camRedraw();
}
function wrapLabel(s, maxc, maxl) {
  s = String(s == null ? "" : s).trim();
  if (!s) return { lines: [""], trunc: false };
  var words = s.split(/\s+/),
    lines = [],
    cur = "",
    idx = 0;
  while (idx < words.length && lines.length < maxl) {
    var w = words[idx],
      cand = cur ? cur + " " + w : w;
    if (cand.length <= maxc) {
      cur = cand;
      idx++;
    } else if (!cur) {
      cur = w.slice(0, maxc - 1) + "…";
      lines.push(cur);
      cur = "";
      idx++;
    } else {
      lines.push(cur);
      cur = "";
    }
  }
  if (cur && lines.length < maxl) {
    lines.push(cur);
    cur = "";
  }
  var trunc = idx < words.length || cur !== "";
  if (trunc) {
    var li = lines.length - 1;
    if (li < 0) {
      lines.push("");
      li = 0;
    }
    var last = lines[li];
    if (last.charAt(last.length - 1) !== "…") {
      if (last.length > maxc - 1) last = last.slice(0, maxc - 1);
      lines[li] = last.replace(/\s+$/, "") + "…";
    }
  }
  return { lines: lines.length ? lines : [""], trunc: trunc };
}
function ensureMapTip() {
  var t = document.getElementById("mapTip");
  if (!t) {
    t = document.createElement("div");
    t.id = "mapTip";
    t.className = "maptip";
    document.body.appendChild(t);
  }
  return t;
}
function draw(svg) {
  const lh = links
    .map((l) => {
      const a = nmap(l.s),
        b = nmap(l.t);
      if (!a || !b) return "";
      // Fio manual = barbante vermelho sólido; ligações automáticas = tracejadas
      const col = l.kind === "manual" ? COR_MANUAL : "#6f6046";
      const dash = l.kind === "manual" ? "" : "5 5";
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${col}" stroke-opacity="${_focus && l.s !== _focus && l.t !== _focus ? 0.06 : l.kind === "manual" ? 0.95 : 0.8}" stroke-width="${l.kind === "manual" ? 2.4 : 1.4}" stroke-dasharray="${dash}"/>`;
    })
    .join("");
  const _q = (state.busca || "").toLowerCase();
  let _viz = null;
  if (_focus) {
    _viz = new Set([_focus]);
    links.forEach((l) => {
      if (l.s === _focus) _viz.add(l.t);
      if (l.t === _focus) _viz.add(l.s);
    });
  }
  const nh = nodes
    .map((n) => {
      const wl = wrapLabel(n.label, 18, 2);
      const lines = wl.lines;
      const LH = 12;
      const topY = n.y - n.r - 6 - (lines.length - 1) * LH;
      const tsp = lines
        .map(
          (ln, i) =>
            `<tspan x="${n.x}" y="${topY + i * LH}">${esc(ln)}</tspan>`,
        )
        .join("");
      const dim = _viz && !_viz.has(n.id);
      const hl =
        (_focus && n.id === _focus) ||
        (_q &&
          n.kind === "ficha" &&
          (() => {
            const f = fichas.find((x) => x.id === n.id);
            return (
              f && [f.titulo, txtAll(f)].join(" ").toLowerCase().includes(_q)
            );
          })());
      const seld = _selMap && _selMap.has(n.id);
      // Halo de toque (48px na tela): área interativa maior que o ponto (P12)
      const haloR = Math.max(n.r + 6, 24 / (cam.s || 1));
      return `<g class="gn" data-id="${n.id}" data-kind="${n.kind}" data-full="${esc(n.label)}" data-trunc="${wl.trunc ? 1 : 0}" style="cursor:pointer;opacity:${dim ? 0.18 : 1}">
      <circle class="halo" cx="${n.x}" cy="${n.y}" r="${haloR}" data-base="${n.r + 6}" fill="transparent"/>
      ${seld ? `<circle cx="${n.x}" cy="${n.y}" r="${n.r + 5}" fill="none" stroke="#c9a35c" stroke-width="1.6" stroke-dasharray="3 3"/>` : ""}<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${n.cor}" stroke="${seld || hl ? "#c9a35c" : "#14100b"}" stroke-width="${seld || hl ? 2.5 : 3}"/>
      <text font-size="11" text-anchor="middle" paint-order="stroke" stroke="#14100b" stroke-width="3" stroke-linejoin="round" fill="#ede4d3">${tsp}</text>
    </g>`;
    })
    .join("");
  nodes.forEach((n) => {
    posCache[n.id] = { x: n.x, y: n.y };
  });
  // O design do mapa é limpo (fundo radial noir), sem grade azulada
  const grid = '<rect id="mgridRect" x="-6000" y="-6000" width="12000" height="12000" fill="none"/>';
  svg.innerHTML = `<g id="mapworld" transform="translate(${cam.x},${cam.y}) scale(${cam.s})">${grid}${lh + nh}</g>`;
  aplicaCamMapa();
  drawMini();
}
/* Canvas infinito: pan/zoom só atualizam o transform do mundo (#mapworld),
   sem reconstruir o SVG — e a grade é reposicionada para cobrir a viewport
   (alinhada aos 40px do padrão, para as linhas não "nadarem"). */
const MAPA_ZOOM_MIN = 0.1,
  MAPA_ZOOM_MAX = 8;
let _ultHaloS = null;
function aplicaCamMapa() {
  const g = document.getElementById("mapworld");
  if (!g) return;
  g.setAttribute("transform", `translate(${cam.x},${cam.y}) scale(${cam.s})`);
  // Mantém o halo de toque com ~48px na TELA em qualquer zoom.
  if (_ultHaloS !== cam.s) {
    _ultHaloS = cam.s;
    const minR = 24 / (cam.s || 1);
    g.querySelectorAll(".gn .halo").forEach(function (c) {
      c.setAttribute("r", Math.max(+c.dataset.base || 0, minR));
    });
  }
  const r = document.getElementById("mgridRect");
  if (r) {
    const tl = s2w(0, 0),
      br = s2w(_viewW, _viewH);
    const mx = (br.x - tl.x) * 0.5 + 120,
      my = (br.y - tl.y) * 0.5 + 120;
    r.setAttribute("x", Math.floor((tl.x - mx) / 40) * 40);
    r.setAttribute("y", Math.floor((tl.y - my) / 40) * 40);
    r.setAttribute("width", Math.ceil((br.x - tl.x + mx * 2) / 40) * 40 + 40);
    r.setAttribute("height", Math.ceil((br.y - tl.y + my * 2) / 40) * 40 + 40);
  }
  miniViewUpdate();
}
// Redesenho leve pós-câmera: usa o transform quando o mundo já existe.
function camRedraw() {
  if (document.getElementById("mapworld")) aplicaCamMapa();
  else {
    const svg = document.getElementById("svg");
    if (svg) draw(svg);
  }
}
// Anima a câmera até (tx,ty,ts) com easing — usada pelo "centralizar no nó".
let _camAnim = null;
const MQ_MENOS_MOVIMENTO = window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)")
  : null;
function animarCamera(tx, ty, ts, ms) {
  // Movimento reduzido: pula a animação espacial e vai direto ao destino.
  if (MQ_MENOS_MOVIMENTO && MQ_MENOS_MOVIMENTO.matches) {
    cam.x = tx;
    cam.y = ty;
    cam.s = ts;
    camRedraw();
    return;
  }
  if (_camAnim) cancelAnimationFrame(_camAnim);
  const x0 = cam.x,
    y0 = cam.y,
    s0 = cam.s,
    t0 = performance.now(),
    dur = ms || 260;
  function passo(t) {
    let k = Math.min(1, (t - t0) / dur);
    k = 1 - Math.pow(1 - k, 3); // easeOutCubic
    cam.x = x0 + (tx - x0) * k;
    cam.y = y0 + (ty - y0) * k;
    cam.s = s0 + (ts - s0) * k;
    camRedraw();
    if (k < 1) _camAnim = requestAnimationFrame(passo);
    else _camAnim = null;
  }
  _camAnim = requestAnimationFrame(passo);
}
function drawMini() {
  const mini = document.getElementById("minisvg");
  if (!mini) return;
  const MW = mini.clientWidth || 170,
    MH = mini.clientHeight || 120,
    pad = 16;
  const bb = worldBounds();
  const w = bb.maxX - bb.minX || 1,
    h = bb.maxY - bb.minY || 1;
  const s = Math.min((MW - pad * 2) / w, (MH - pad * 2) / h);
  const ox = (MW - w * s) / 2 - bb.minX * s,
    oy = (MH - h * s) / 2 - bb.minY * s;
  _miniT = { s, ox, oy };
  const dots = nodes
    .map(
      (n) =>
        `<circle cx="${n.x * s + ox}" cy="${n.y * s + oy}" r="${n.kind === "ficha" ? 1.5 : 2.4}" fill="${n.cor}"/>`,
    )
    .join("");
  const tl = s2w(0, 0),
    br = s2w(_viewW, _viewH);
  const rect = `<rect id="miniview" x="${tl.x * s + ox}" y="${tl.y * s + oy}" width="${(br.x - tl.x) * s}" height="${(br.y - tl.y) * s}" fill="rgba(201,163,92,.08)" stroke="#c9a35c" stroke-width="1"/>`;
  mini.innerHTML = dots + rect;
}
// Atualiza só o retângulo de viewport do minimapa (barato; roda a cada pan/zoom).
function miniViewUpdate() {
  const vr = document.getElementById("miniview");
  if (!vr || !_miniT) return;
  const tl = s2w(0, 0),
    br = s2w(_viewW, _viewH);
  vr.setAttribute("x", tl.x * _miniT.s + _miniT.ox);
  vr.setAttribute("y", tl.y * _miniT.s + _miniT.oy);
  vr.setAttribute("width", (br.x - tl.x) * _miniT.s);
  vr.setAttribute("height", (br.y - tl.y) * _miniT.s);
}
function wireMap(svg) {
  if (_mapWired) return;
  _mapWired = true;
  const rel = (e) => {
    const r = svg.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const nodeFrom = (e) => {
    const g = e.target.closest(".gn");
    return g ? g.dataset : null;
  };
  svg.addEventListener("mousedown", (e) => {
    const d = nodeFrom(e),
      pp = rel(e);
    if (e.button === 1 || (e.button === 0 && _space)) {
      _pan = { mx: pp.x, my: pp.y, cx: cam.x, cy: cam.y, moved: false };
      svg.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    if (d) {
      if (_selMap.has(d.id)) {
        _drag = {
          ids: [..._selMap],
          moved: false,
          sw: s2w(pp.x, pp.y),
          orig: {},
        };
        _drag.ids.forEach((id) => {
          const n = nmap(id);
          if (n) _drag.orig[id] = { x: n.x, y: n.y };
        });
      } else {
        _selMap = new Set([d.id]);
        _drag = { id: d.id, moved: false };
        draw(svg);
      }
    } else {
      _focus = null;
      _selMap = new Set();
      _marq = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
      showSelBox(_marq);
      draw(svg);
    }
    e.preventDefault();
  });
  svg.addEventListener("mousemove", (e) => {
    const pp = rel(e);
    if (_drag) {
      if (_drag.ids) {
        const w = s2w(pp.x, pp.y),
          dx = w.x - _drag.sw.x,
          dy = w.y - _drag.sw.y;
        _drag.ids.forEach((id) => {
          const n = nmap(id),
            o = _drag.orig[id];
          if (n && o) {
            n.x = o.x + dx;
            n.y = o.y + dy;
          }
        });
        _drag.moved = true;
        draw(svg);
      } else {
        const n = nmap(_drag.id);
        if (!n) return;
        const w = s2w(pp.x, pp.y);
        n.x = w.x;
        n.y = w.y;
        _drag.moved = true;
        draw(svg);
      }
    } else if (_pan) {
      cam.x = _pan.cx + (pp.x - _pan.mx);
      cam.y = _pan.cy + (pp.y - _pan.my);
      _pan.moved = true;
      aplicaCamMapa();
    } else if (_marq) {
      _marq.x1 = e.clientX;
      _marq.y1 = e.clientY;
      updateSelBox(_marq);
      _selMap = nodesInRect(svg, _marq);
      draw(svg);
    }
  });
  window.addEventListener("mouseup", () => {
    if (
      (_drag && _drag.moved) ||
      (_pan && _pan.moved) ||
      (_marq && _selMap.size)
    )
      _suppress = true;
    if (_drag && _drag.moved) {
      savePosCache();
      if (typeof _pushHist === "function") _pushHist();
    }
    _drag = null;
    if (_pan) {
      _pan = null;
      svg.style.cursor = "grab";
    }
    if (_marq) {
      _marq = null;
      hideSelBox();
      draw(svg);
    }
  });
  svg.addEventListener("mousemove", (e) => {
    if (_drag || _pan || _marq) {
      var th = document.getElementById("mapTip");
      if (th) th.style.display = "none";
      return;
    }
    var g = e.target.closest(".gn"),
      t = ensureMapTip();
    if (g && g.dataset.trunc === "1") {
      t.textContent = g.dataset.full;
      t.style.display = "block";
      var pad = 14,
        x = e.clientX + pad,
        y = e.clientY + pad,
        bw = t.offsetWidth,
        bh = t.offsetHeight;
      if (x + bw > window.innerWidth - 8) x = e.clientX - pad - bw;
      if (y + bh > window.innerHeight - 8) y = e.clientY - pad - bh;
      t.style.left = x + "px";
      t.style.top = y + "px";
    } else t.style.display = "none";
  });
  svg.addEventListener("mouseleave", () => {
    var t = document.getElementById("mapTip");
    if (t) t.style.display = "none";
  });
  svg.addEventListener("click", (e) => {
    if (_suppress) {
      _suppress = false;
      return;
    }
    const d = nodeFrom(e);
    if (!d) {
      if (_selMap.size) {
        _selMap = new Set();
        draw(svg);
      }
      return;
    }
    if (d.kind === "ficha") abrir(d.id);
    else if (d.kind === "pessoa") abrirEntidade("pessoa", d.id.slice(5));
    else if (d.kind === "sala") abrirEntidade("sala", d.id.slice(6));
    else if (d.kind === "grupo") abrirEntidade("grupo", d.id.slice(5));
    else if (d.kind === "colecao") abrirEntidade("colecao", d.id.slice(5));
  });
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const pp = rel(e),
        w = s2w(pp.x, pp.y);
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      cam.s = Math.max(MAPA_ZOOM_MIN, Math.min(MAPA_ZOOM_MAX, cam.s * f));
      cam.x = pp.x - w.x * cam.s;
      cam.y = pp.y - w.y * cam.s;
      aplicaCamMapa();
    },
    { passive: false },
  );
  const mini = document.getElementById("minisvg");
  if (mini)
    mini.addEventListener("click", (e) => {
      if (!_miniT) return;
      const r = mini.getBoundingClientRect();
      const wx = (e.clientX - r.left - _miniT.ox) / _miniT.s,
        wy = (e.clientY - r.top - _miniT.oy) / _miniT.s;
      animarCamera(_viewW / 2 - wx * cam.s, _viewH / 2 - wy * cam.s, cam.s, 200);
    });
  // ===== Toque (P03/§3.2): um dedo move o canvas, pinça dá zoom, tap
  // seleciona e mantém o detalhe num bottom sheet. Mouse segue o fluxo
  // original (mouseProprio) — os dois convivem em aparelhos híbridos.
  let _gpan = null;
  ligarGestos(svg, {
    mouseProprio: true,
    dragInicio: function () {
      _gpan = { x: cam.x, y: cam.y };
    },
    drag: function (e, dx, dy) {
      if (!_gpan) return;
      cam.x = _gpan.x + dx;
      cam.y = _gpan.y + dy;
      aplicaCamMapa();
    },
    dragFim: function () {
      _gpan = null;
    },
    dragCancela: function () {
      _gpan = null;
    },
    cancelar: function () {
      _gpan = null;
    },
    pinch: function (p) {
      const r = svg.getBoundingClientRect();
      const cx = p.cx - r.left,
        cy = p.cy - r.top;
      const w = s2w(cx, cy);
      const ns = Math.max(MAPA_ZOOM_MIN, Math.min(MAPA_ZOOM_MAX, cam.s * p.fator));
      cam.x = cx - w.x * ns + p.dx;
      cam.y = cy - w.y * ns + p.dy;
      cam.s = ns;
      aplicaCamMapa();
    },
    tap: function (e, alvo) {
      const gEl = alvo && alvo.closest ? alvo.closest(".gn") : null;
      if (gEl) mapaTapNo(gEl.dataset);
      else {
        if (_mapSelModo) return; // no modo seleção, tap no vazio não limpa
        _selMap = new Set();
        _focus = null;
        draw(svg);
        mapaFecharSheet();
      }
    },
    doubleTap: function (e) {
      const r = svg.getBoundingClientRect();
      zoomMapaEm(e.clientX - r.left, e.clientY - r.top, 1.6);
    },
  });
}
/* ===== Bottom sheet do ponto selecionado (não modal, persiste) ===== */
let _mapSelModo = false;
function _mapNoInfo(d) {
  if (d.kind === "ficha") {
    const f = fichas.find((x) => x.id === d.id);
    return {
      titulo: f ? f.titulo : d.id,
      sub: f && f.sala ? f.sala : "Ficha",
      abrir: function () {
        abrir(d.id);
      },
    };
  }
  const nome =
    d.kind === "sala" ? d.id.slice(6) : d.id.slice(5);
  return {
    titulo: nome,
    sub: rotKind(d.kind),
    abrir: function () {
      abrirEntidade(d.kind === "colecao" ? "colecao" : d.kind, nome);
    },
  };
}
function mapaTapNo(d) {
  const svg = document.getElementById("svg");
  if (_mapSelModo) {
    if (_selMap.has(d.id)) _selMap.delete(d.id);
    else _selMap.add(d.id);
    draw(svg);
    mapaAtualizaSheetSel();
    return;
  }
  _selMap = new Set([d.id]);
  draw(svg);
  mapaAbrirSheet(d);
}
function mapaAbrirSheet(d) {
  const mapa = document.getElementById("mapa");
  if (!mapa) return;
  let sh = document.getElementById("mapsheet");
  if (!sh) {
    sh = document.createElement("div");
    sh.id = "mapsheet";
    sh.setAttribute("role", "region");
    sh.setAttribute("aria-label", "Ponto selecionado do mapa");
    mapa.appendChild(sh);
  }
  const info = _mapNoInfo(d);
  sh.innerHTML =
    '<div class="ms-grip"></div>' +
    '<div class="ms-linha"><div class="ms-tx"><div class="ms-tit">' +
    esc(info.titulo) +
    '</div><div class="ms-sub">' +
    esc(info.sub) +
    "</div></div>" +
    '<button class="ms-x" onclick="mapaFecharSheet()" aria-label="Fechar detalhe do ponto">✕</button></div>' +
    '<div class="ms-acoes">' +
    '<button class="dbtn primary" id="msAbrir">Abrir</button>' +
    '<button class="dbtn" id="msCentrar">Centralizar</button>' +
    '<button class="dbtn" id="msSel">Selecionar vários</button>' +
    "</div>";
  sh.classList.add("open");
  document.getElementById("msAbrir").onclick = info.abrir;
  document.getElementById("msCentrar").onclick = function () {
    centralizarNo(d.id);
  };
  document.getElementById("msSel").onclick = function () {
    _mapSelModo = true;
    mapaAtualizaSheetSel();
  };
  navPushOverlay("mapsheet", mapaFecharSheet);
}
function mapaAtualizaSheetSel() {
  const sh = document.getElementById("mapsheet");
  if (!sh) return;
  const n = _selMap.size;
  sh.innerHTML =
    '<div class="ms-grip"></div>' +
    '<div class="ms-linha"><div class="ms-tx"><div class="ms-tit">' +
    n +
    " selecionado" +
    (n === 1 ? "" : "s") +
    '</div><div class="ms-sub">toque nos pontos para marcar/desmarcar</div></div>' +
    '<button class="ms-x" onclick="mapaFecharSheet()" aria-label="Sair da seleção">✕</button></div>' +
    '<div class="ms-acoes">' +
    '<button class="dbtn primary" onclick="mapaSelConcluir()">Concluir</button>' +
    '<button class="dbtn" onclick="mapaSelLimpar()">Limpar seleção</button>' +
    "</div>";
  sh.classList.add("open");
}
function mapaSelLimpar() {
  _selMap = new Set();
  const svg = document.getElementById("svg");
  if (svg) draw(svg);
  mapaAtualizaSheetSel();
}
function mapaSelConcluir() {
  _mapSelModo = false;
  mapaFecharSheet();
}
function mapaFecharSheet() {
  _mapSelModo = false;
  const sh = document.getElementById("mapsheet");
  if (sh) sh.classList.remove("open");
  navOverlayFechado("mapsheet");
}
/* Camadas: no toque/compacto abre em sheet; no desktop, painel flutuante. */
function toggleCamadas() {
  if (ehCompacto() || ehToque()) {
    const defs = [
      ["pessoa", "Personagens"],
      ["sala", "Salas"],
      ["grupo", "Grupos"],
      ["manual", "Fios manuais"],
    ];
    abrirSheetAcoes(
      "Camadas do mapa",
      defs.map(function (dd) {
        return {
          rotulo: dd[1],
          detalhe: mapLayers[dd[0]] ? "visível ✓" : "oculto",
          fn: function () {
            mapLayers[dd[0]] = !mapLayers[dd[0]];
            mapaSoftRefresh();
          },
        };
      }),
    );
    return;
  }
  const mt = document.getElementById("maptoggles");
  if (mt) mt.classList.toggle("open");
}
/* Alternativa por LISTA aos gestos do mapa (P03): toca num item, o mapa
   centraliza e abre o detalhe. */
function mapaLista() {
  if (!nodes.length) {
    toast("O mapa ainda não tem pontos.");
    return;
  }
  abrirSheetAcoes(
    "Pontos do mapa",
    nodes.slice(0, 60).map(function (n) {
      return {
        rotulo: n.label,
        detalhe: rotKind(n.kind),
        fn: function () {
          _selMap = new Set([n.id]);
          centralizarNo(n.id);
          const svg = document.getElementById("svg");
          if (svg) draw(svg);
          mapaAbrirSheet({ id: n.id, kind: n.kind });
        },
      };
    }),
  );
}
/* Ajuda + legenda numa folha (mobile): não cobre o grafo por padrão (P17). */
function mapaAjuda() {
  const box = document.createElement("div");
  buildLegendIn(box);
  abrirSheetHTML(
    "Como usar o mapa",
    '<div class="mh-body">' +
      (ehToque()
        ? "<div class='row'>Arraste com um dedo: navegar</div>" +
          "<div class='row'>Pinça com dois dedos: zoom</div>" +
          "<div class='row'>Toque num ponto: selecionar</div>" +
          "<div class='row'>Botões ＋/−/⤢: zoom e enquadrar</div>"
        : "<div class='row'>Arraste o fundo: navegar</div>" +
          "<div class='row'>Roda do mouse: zoom</div>" +
          "<div class='row'>Arraste um ponto: reposicionar</div>" +
          "<div class='row'><b>Shift+1</b>: enquadrar · <b>Shift+0</b>: 100%</div>") +
      "</div>" +
      box.innerHTML,
  );
}

function buildLegendIn(el) {
  // Legenda fiel ao que o mapa desenha HOJE: pista (cor = grupo), sala,
  // personagem, grupo (cor própria), linha sólida = conexão manual,
  // tracejada = ligação automática. ("Coleção"/"tipo" eram do sistema antigo.)
  if (!el) return;
  el.innerHTML = `
    <div class="ltit">LEGENDA</div>
    <div class="row"><span class="dot" style="background:${COR_SALA}"></span>Sala</div>
    <div class="row"><span class="dot" style="background:${COR_PESSOA}"></span>Personagem</div>
    <div class="row"><span class="dot" style="background:#8d3030"></span>Ficha (cor do grupo)</div>
    <div class="row"><span style="width:16px;border-top:2px solid ${COR_MANUAL}"></span>Fio manual</div>
    <div class="row"><span style="width:16px;border-top:2px dashed #6b5f45"></span>Ligação automática</div>`;
}
function buildLegend() {
  buildLegendIn(document.getElementById("legend"));
  buildMapHelp();
}
/* Menu "Como usar" do mapa (fica acima da legenda). Recolhível; a escolha
   fica no navegador (localStorage), como as posições do mapa. */
var _mapHelpAberto = null;
function buildMapHelp() {
  var box = document.getElementById("maphelp");
  if (!box) return;
  if (_mapHelpAberto === null) {
    try {
      _mapHelpAberto = localStorage.getItem("bp_maphelp") !== "0";
    } catch (e) {
      _mapHelpAberto = true;
    }
  }
  // As instruções seguem a capacidade de entrada (toque × mouse) — P17.
  const corpo = ehToque()
    ? `<div class="mh-body">
      <div class="row">Arraste com um dedo: navegar</div>
      <div class="row">Pinça: zoom</div>
      <div class="row">Toque num ponto: selecionar</div>
      <div class="row">Botões ＋/−/⤢: zoom e enquadrar</div>
    </div>`
    : `<div class="mh-body">
      <div class="row">Arraste o fundo: navegar</div>
      <div class="row">Roda do mouse: zoom</div>
      <div class="row">Arraste um ponto: reposicionar</div>
      <div class="row"><b>Shift+1</b>&nbsp;: enquadrar tudo</div>
      <div class="row"><b>Shift+0</b>&nbsp;: zoom 100%</div>
    </div>`;
  box.innerHTML =
    `<button class="mh-head" onclick="toggleMapHelp()" title="Mostrar/ocultar como usar o mapa">Como usar<span class="mh-arrow">${_mapHelpAberto ? "▾" : "▸"}</span></button>` +
    (_mapHelpAberto ? corpo : "");
}
function toggleMapHelp() {
  _mapHelpAberto = !_mapHelpAberto;
  try {
    localStorage.setItem("bp_maphelp", _mapHelpAberto ? "1" : "0");
  } catch (e) {}
  buildMapHelp();
}

/* ---- PAINEL LATERAL ---- */
let _lb = { s: 1, x: 0, y: 0, drag: null };
function aplicaLB() {
  const m = document.getElementById("lightbox");
  if (!m) return;
  const img = m.querySelector(".lbimg");
  if (img)
    img.style.transform = `translate(${_lb.x}px,${_lb.y}px) scale(${_lb.s})`;
}
function fecharLightbox() {
  const m = document.getElementById("lightbox");
  if (m) m.classList.remove("open");
}
function abrirLightbox(src) {
  if (!src) return;
  let m = document.getElementById("lightbox");
  if (!m) {
    m = document.createElement("div");
    m.id = "lightbox";
    m.className = "lightbox";
    m.innerHTML =
      '<button class="lbclose" title="Fechar (Esc)" aria-label="Fechar imagem">✕</button><div class="lbhint">' +
      (ehToque()
        ? "Pinça: zoom · arraste: mover · toque duplo: reset"
        : "Roda do mouse: zoom · arraste: mover · duplo-clique: reset") +
      '</div><img class="lbimg" alt="Imagem ampliada">';
    document.body.appendChild(m);
    const img = m.querySelector(".lbimg");
    m.addEventListener("mousedown", (e) => {
      if (e.target === m) fecharLightbox();
    });
    m.querySelector(".lbclose").onclick = fecharLightbox;
    m.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
        const f = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        const ns = Math.max(0.15, Math.min(10, _lb.s * f));
        const r = ns / _lb.s;
        const rect = img.getBoundingClientRect();
        const dentro =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        if (dentro) {
          const ox = window.innerWidth / 2,
            oy = window.innerHeight / 2,
            ux = e.clientX - ox,
            uy = e.clientY - oy;
          _lb.x = ux - (ux - _lb.x) * r;
          _lb.y = uy - (uy - _lb.y) * r;
        }
        _lb.s = ns;
        aplicaLB();
      },
      { passive: false },
    );
    img.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      _lb.drag = { x: e.clientX, y: e.clientY, ox: _lb.x, oy: _lb.y };
    });
    window.addEventListener("mousemove", (e) => {
      if (_lb.drag) {
        _lb.x = _lb.drag.ox + (e.clientX - _lb.drag.x);
        _lb.y = _lb.drag.oy + (e.clientY - _lb.drag.y);
        aplicaLB();
      }
    });
    window.addEventListener("mouseup", () => {
      _lb.drag = null;
    });
    img.addEventListener("dblclick", () => {
      _lb.s = 1;
      _lb.x = 0;
      _lb.y = 0;
      aplicaLB();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && m.classList.contains("open")) fecharLightbox();
    });
    // Toque (P13): mesmo controlador de gestos do Mapa/Quadros.
    let _lbPan = null;
    ligarGestos(m, {
      mouseProprio: true,
      ignorar: function (e) {
        return !!(e.target.closest && e.target.closest(".lbclose"));
      },
      dragInicio: function () {
        _lbPan = { x: _lb.x, y: _lb.y };
      },
      drag: function (e, dx, dy) {
        if (!_lbPan) return;
        _lb.x = _lbPan.x + dx;
        _lb.y = _lbPan.y + dy;
        aplicaLB();
      },
      dragFim: function () {
        _lbPan = null;
      },
      dragCancela: function () {
        _lbPan = null;
      },
      cancelar: function () {
        _lbPan = null;
      },
      pinch: function (p) {
        const ns = Math.max(0.15, Math.min(10, _lb.s * p.fator));
        const r = ns / _lb.s;
        const ox = window.innerWidth / 2,
          oy = window.innerHeight / 2,
          ux = p.cx - ox,
          uy = p.cy - oy;
        _lb.x = ux - (ux - _lb.x) * r + p.dx;
        _lb.y = uy - (uy - _lb.y) * r + p.dy;
        _lb.s = ns;
        aplicaLB();
      },
      tap: function (e, alvo) {
        // Toque fora da imagem fecha (equivalente ao clique no fundo).
        if (alvo === m) fecharLightbox();
      },
      doubleTap: function () {
        _lb.s = 1;
        _lb.x = 0;
        _lb.y = 0;
        aplicaLB();
      },
    });
  }
  _lb = { s: 1, x: 0, y: 0, drag: null };
  m.querySelector(".lbimg").src = src;
  aplicaLB();
  m.classList.add("open");
}
let _fichaAberta = null,
  _pgIdx = 0;
function renderPaginaDetalhe() {
  const f = fichas.find((x) => x.id === _fichaAberta);
  if (!f) return;
  const ps = pgs(f);
  if (_pgIdx >= ps.length) _pgIdx = 0;
  const p = ps[_pgIdx] || {};
  const tabs = document.getElementById("pgtabs");
  if (tabs)
    tabs.innerHTML =
      ps.length > 1
        ? ps
            .map(
              (pp, i) =>
                `<button class="pgtab${i === _pgIdx ? " active" : ""}" onclick="setPagDetalhe(${i})">${esc(pp.rotulo || "Pág. " + (i + 1))}</button>`,
            )
            .join("")
        : "";
  const panel = document.getElementById("pgpanel");
  if (!panel) return;
  const _orig = state.idioma === "original";
  panel.innerHTML = `${
    p.imagem
      ? `<img class="dimg" src="${esc(p.imagem)}" onerror="this.style.display='none'" onclick="abrirLightbox(this.src)" title="Clique para ampliar">`
      : `<div class="dph">foto da ficha</div>`
  }
    <div class="transc-head"><span class="plab">TRANSCRIÇÃO</span><button class="langsw" onclick="toggleIdioma();renderPaginaDetalhe()" title="Trocar idioma (PT/EN)" aria-label="Trocar idioma da transcrição (PT/EN)"><span class="${_orig ? "" : "on"}">PT</span><span class="${_orig ? "on" : ""}">EN</span></button></div>
    <div class="transc">${esc((_orig ? p.original || p.traducao : p.traducao || p.original) || "—")}</div>
    ${p.explica ? `<div class="dexpl"><span class="plab">O QUE EXPLICA</span><div class="dexpl-tx">${esc(p.explica)}</div></div>` : ""}
    `;
}
function setPagDetalhe(i) {
  _pgIdx = i;
  renderPaginaDetalhe();
}
function abrir(id) {
  const f = fichas.find((x) => x.id === id);
  if (!f) return;
  _fichaAberta = id;
  _pgIdx = 0;
  const d = document.getElementById("drawer");
  // ETIQUETAS: sala (azul), personagens (rosa), grupos (cor sólida)
  const etiquetas =
    (f.sala
      ? `<button class="et sala" onclick="filtraSala('${esc(f.sala)}')" title="Filtrar pela sala">${esc(f.sala)}</button>`
      : "") +
    (f.personagens || [])
      .map(
        (p) =>
          `<button class="et pessoa" onclick="filtraPessoa('${esc(p)}')" title="Filtrar pelo personagem">${esc(p)}</button>`,
      )
      .join("") +
    (f.grupos || [])
      .map((gn) => {
        var g = grupoObj(gn);
        return `<button class="et grupo" style="background:${corContraste((g && g.cor) || "#8d3030")}" onclick="filtraGrupo('${jsq(gn)}')" title="Filtrar pelo grupo">${esc(gn)}</button>`;
      })
      .join("");
  // FIOS: manuais (linha vermelha sólida, removível) + automáticas (tracejada).
  // Clicar no fio leva ao MAPA com esta ficha em foco (as ligações dela
  // acesas, o resto esmaecido); o título do fio manual abre a outra ficha.
  const fioAbre = `onclick="focarMapa('${f.id}')" onkeydown="fioTecla(event,'${f.id}')" role="button" tabindex="0" title="Ver estas conexões no mapa"`;
  const fiosManuais = (f.conexoes || [])
    .map((c) => {
      const o = fichas.find((z) => z.id === c);
      return o
        ? `<div class="fio aomapa" ${fioAbre}><span class="fio-l manual"></span><div class="fio-tx"><div class="fio-t" onclick="event.stopPropagation();abrir('${c}')" title="Abrir esta ficha">${esc(o.titulo)}</div><div class="fio-s">manual · ${esc(c)}</div></div><button class="fio-x" onclick="event.stopPropagation();desligarFicha('${f.id}','${c}')" title="Remover fio" aria-label="Remover fio com ${esc(o.titulo)}">✕</button></div>`
        : "";
    })
    .join("");
  const autosTxt = [
    f.sala ? esc(f.sala) : "",
    ...(f.personagens || []).map(esc),
    ...(f.grupos || []).map(esc),
  ]
    .filter(Boolean)
    .join(" · ");
  const fioAuto = autosTxt
    ? `<div class="fio aomapa" ${fioAbre}><span class="fio-l auto"></span><div class="fio-tx"><div class="fio-t">${autosTxt}</div><div class="fio-s">automáticas · citadas na ficha</div></div><span class="fio-go">›</span></div>`
    : "";
  d.innerHTML = `
    <div class="dh">
      <div class="dh-top">
        <span class="did">${esc(f.id)}</span>
        <span class="dsala">${f.sala ? esc(f.sala) : "—"}</span>
        <div class="dgrow"></div>
        <button class="dstar${f.fav ? " on" : ""}" onclick="toggleFav('${f.id}');abrir('${f.id}')" title="Favoritar" aria-pressed="${f.fav ? "true" : "false"}" aria-label="Favoritar">★</button>
        <button class="close" onclick="fechar()" title="Fechar">✕</button>
      </div>
      <h2 class="dtit">${esc(f.titulo)}</h2>
      <div class="dactions"><button class="dbtn" onclick="editarFicha('${f.id}')">Editar</button><button class="dbtn" onclick="focarMapa('${f.id}')">Ver no mapa</button><button class="dbtn" onclick="addAoQuadro('${f.id}')">Add ao quadro</button>${window.IA_ATIVA && f.pendente ? `<button class="dbtn" onclick="iaProcessarPista('${f.id}')" title="A IA transcreve, traduz e preenche a ficha — você revisa antes de aplicar">Processar com IA</button>` : ""}<button class="dbtn del" onclick="excluirFicha('${f.id}')">Excluir</button></div>
    </div>
    <div class="db">
      <div id="pgtabs" class="pgtabs"></div>
      <div id="pgpanel" class="paper"></div>
      <div class="dsec">
        <span class="dlab">ETIQUETAS</span>
        <div class="taglist">${etiquetas || "<span class='gvazio'>(nenhuma)</span>"}</div>
      </div>
      <div class="dsec">
        <div class="dlab-row"><span class="dlab">FIOS DA INVESTIGAÇÃO</span><span class="dlab-sub">conexões</span><button class="dlink" onclick="ligarFichaUI('${f.id}')">＋ ligar ficha</button></div>
        ${fiosManuais}${fioAuto}
        ${!fiosManuais && !fioAuto ? "<span class='gvazio'>sem conexões ainda</span>" : ""}
      </div>
      ${f.notas ? `<div class="dsec"><span class="dlab">NOTAS DO DETETIVE</span><div class="postit">${esc(f.notas)}</div></div>` : ""}
    </div>
    <div class="dfoot">
      <button class="dbtn primary" onclick="editarFicha('${f.id}')">Editar</button>
      <button class="dbtn" onclick="focarMapa('${f.id}')">Ver no mapa</button>
      <button class="dbtn" onclick="fichaMais('${f.id}')" aria-haspopup="dialog">Mais ▾</button>
    </div>`;
  drawerAbrir();
  renderPaginaDetalhe();
}
/* Mobile: as ações do detalhe que não cabem no rodapé vão para a folha de
   ações — nada some em relação ao desktop (P07). */
function fichaMais(id) {
  const f = fichas.find((x) => x.id === id);
  if (!f) return;
  abrirSheetAcoes(f.titulo, [
    { rotulo: "Adicionar ao quadro", fn: () => addAoQuadro(id) },
    { rotulo: "Ligar a outra ficha", fn: () => ligarFichaUI(id) },
    window.IA_ATIVA && f.pendente
      ? { rotulo: "Processar com IA", fn: () => iaProcessarPista(id) }
      : null,
    {
      rotulo: f.fav ? "Tirar de favoritas" : "Favoritar",
      fn: () => {
        toggleFav(id);
        abrir(id);
      },
    },
    { rotulo: "Excluir ficha", perigo: true, fn: () => excluirFicha(id) },
  ]);
}
/* Adiciona a ficha ao quadro atual (sem sair da tela) */
function addAoQuadro(id) {
  if (!DADOS.quadros || !DADOS.quadros.length)
    DADOS.quadros = [
      { nome: "Quadro 1", cam: { x: 40, y: 40, s: 1 }, nodes: [], setas: [] },
    ];
  const q = DADOS.quadros[_qIdx] || DADOS.quadros[0];
  if ((q.nodes || []).some((n) => n.tipo === "ref" && n.ref === id)) {
    toast("Esta ficha já está no quadro " + q.nome);
    return;
  }
  q.nodes.push({
    id: "n" + Date.now() + Math.floor(Math.random() * 999),
    tipo: "ref",
    kind: "pista",
    ref: id,
    x: 120 + Math.random() * 160,
    y: 120 + Math.random() * 120,
  });
  marcarAlterado();
  toast("Ficha adicionada ao " + q.nome);
}
function field(lab, val) {
  return `<div class="field"><div class="lab">${lab}</div><div class="val">${val}</div></div>`;
}
/* ===== Abertura/fechamento CENTRAL do detalhe (drawer) =====
   Todo caminho que abre o painel passa por drawerAbrir(); todo caminho que
   fecha passa por fechar(). Isso garante que a tabbar e o FAB voltam
   (body.drawer-aberta), o foco retorna ao acionador e o Voltar funciona. */
function drawerAbrir() {
  const d = document.getElementById("drawer");
  if (!d) return;
  try {
    d.inert = false; // fechado, o painel fica fora do foco/leitor de tela
  } catch (e) {}
  if (!d.classList.contains("open")) {
    d.classList.add("open");
    document.body.classList.add("drawer-aberta");
    // Overlay central: foco, inert (só no compacto, onde é página cheia),
    // Escape/Voltar e devolução de foco ao acionador.
    overlayAbrir(d, {
      id: "drawer",
      modal: ehCompacto(),
      jaAberto: true,
      fechar: function () {
        d.classList.remove("open");
        document.body.classList.remove("drawer-aberta");
        _fichaAberta = null;
        try {
          d.inert = true;
        } catch (e) {}
      },
    });
  }
  d.scrollTop = 0;
}
// Estado inicial: o drawer começa fechado e inerte (invisível ao foco).
(function () {
  const d0 = document.getElementById("drawer");
  if (d0 && !d0.classList.contains("open")) {
    try {
      d0.inert = true;
    } catch (e) {}
  }
})();
function fechar() {
  if (_ovInfo["drawer"]) {
    overlayFechar("drawer");
    return;
  }
  // Segurança: fecha mesmo se o registro se perdeu.
  const d = document.getElementById("drawer");
  if (d) d.classList.remove("open");
  document.body.classList.remove("drawer-aberta");
  _fichaAberta = null;
}
function filtraPessoa(p) {
  p = nomeCanon(p);
  fpessoa.value = p;
  state.pessoa = p;
  fechar();
  render();
}
function filtraSala(s) {
  fsala.value = s;
  state.sala = s;
  fechar();
  render();
}
function filtraGrupo(g) {
  if (fgrupo) fgrupo.value = g;
  state.grupo = g;
  fechar();
  render();
}

function esc(s) {
  return String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

/* ---- edicao / exclusao / salvamento ---- */
let dirty = false;
function _persistApenas() {
  dirty = true;
  atualizarSalvar();
  agendarAuto();
  // GANCHO ONLINE (inerte no MVP): se a camada online estiver ativa, agenda o salvamento na nuvem.
  if (window.NUVEM && typeof window.NUVEM.agendarSalvar === "function")
    window.NUVEM.agendarSalvar();
}
function marcarAlterado() {
  _pushHist();
  _persistApenas();
}
/* ---- histórico (undo/redo) ---- */
let _undoStack = [],
  _redoStack = [],
  _histLock = false;
const HIST_MAX = 40;
function _snap() {
  return {
    d: JSON.stringify(DADOS),
    p: JSON.stringify((typeof posCache !== "undefined" && posCache) || {}),
  };
}
function _restore(s) {
  var d;
  try {
    d = JSON.parse(s.d);
  } catch (e) {
    return;
  }
  [
    "fichas",
    "salas",
    "personagens",
    "grupos",
    "colecoes",
    "teorias",
    "quadros",
    "tipos",
  ].forEach(function (k) {
    if (!Array.isArray(DADOS[k])) DADOS[k] = [];
    DADOS[k].length = 0;
    (d[k] || []).forEach(function (it) {
      DADOS[k].push(it);
    });
  });
  Object.keys(d).forEach(function (k) {
    if (!Array.isArray(d[k])) DADOS[k] = d[k];
  });
  if (typeof TIPOS !== "undefined") TIPOS = DADOS.tipos;
  try {
    posCache = JSON.parse(s.p || "{}") || {};
    if (typeof savePosCache === "function") savePosCache();
  } catch (e) {}
}
function histInit() {
  _undoStack = [_snap()];
  _redoStack = [];
  atualizarHistUI();
}
function _pushHist() {
  if (_histLock) return;
  _redoStack.length = 0;
  _undoStack.push(_snap());
  if (_undoStack.length > HIST_MAX + 1) _undoStack.shift();
  atualizarHistUI();
}
function desfazer() {
  if (_undoStack.length <= 1) return;
  _histLock = true;
  _redoStack.push(_undoStack.pop());
  _restore(_undoStack[_undoStack.length - 1]);
  _histLock = false;
  atualizarHistUI();
  if (typeof rebuildFilters === "function") rebuildFilters();
  render();
  _persistApenas();
  toast("↶ Desfeito", 1100);
}
function refazer() {
  if (!_redoStack.length) return;
  _histLock = true;
  var s = _redoStack.pop();
  _undoStack.push(s);
  _restore(s);
  _histLock = false;
  atualizarHistUI();
  if (typeof rebuildFilters === "function") rebuildFilters();
  render();
  _persistApenas();
  toast("↷ Refeito", 1100);
}
function atualizarHistUI() {
  var u = document.getElementById("btnUndo"),
    r = document.getElementById("btnRedo");
  if (u) u.disabled = _undoStack.length <= 1;
  if (r) r.disabled = _redoStack.length === 0;
}
function marcarSalvo() {
  dirty = false;
  atualizarSalvar();
}
function atualizarSalvar() {
  updateSaveStatus(dirty ? "pending" : "saved");
}
function updateSaveStatus(st) {
  var ic = document.getElementById("saveIc"),
    lb = document.getElementById("saveLb"),
    b = document.getElementById("btnSalvar");
  // No modo online o salvamento é na nuvem (não há "pasta"/fileHandle); a camada online cuida do status.
  if (!window.MODO_ONLINE && !fileHandle && !DADOS_BROKEN) st = "nohandle";
  // O ícone virou uma bolinha colorida (CSS via st-*); só o rótulo muda.
  var M = {
    saving: ["", "Salvando…", "info"],
    pending: ["", "Salvando…", "info"],
    saved: ["", "Tudo salvo", "ok"],
    nohandle: ["", "Sem pasta", "warn"],
  };
  var m = M[st] || M.saved;
  if (ic) ic.textContent = "";
  if (lb) lb.textContent = m[1];
  if (b) {
    b.classList.remove("st-ok", "st-info", "st-warn");
    b.classList.add("st-" + m[2]);
  }
  // Mobile: o status aparece na aba Conta da tabbar (bolinha colorida)...
  var tc = document.querySelector('#tabbar .tbit[data-view="conta"]');
  if (tc) {
    tc.classList.remove("st-ok", "st-info", "st-warn");
    tc.classList.add("st-" + m[2]);
  }
  // ...e é anunciado para leitores de tela quando muda.
  anunciarStatus(m[1]);
}
/* Região viva (aria-live) — anuncia salvando/salvo/erro sem roubar o foco. */
var _srUltimo = "";
function anunciarStatus(txt) {
  var r = document.getElementById("srlive");
  if (!r || txt === _srUltimo) return;
  _srUltimo = txt;
  r.textContent = txt;
}

function rebuildFilters() {
  const sA = fsala.value,
    pA = fpessoa.value,
    gA = fgrupo.value;
  const ns = nomesDe(DADOS.salas.filter((s) => s.descoberta !== false)).sort();
  const np = nomesDe(
    DADOS.personagens.filter((e) => !ehAliasPessoa(e.nome)),
  ).sort();
  fsala.innerHTML = '<option value="">Todas as salas</option>';
  ns.forEach((s) => fsala.add(new Option(s, s)));
  fpessoa.innerHTML = '<option value="">Todos os personagens</option>';
  np.forEach((p) => fpessoa.add(new Option(p, p)));
  fsala.value = ns.includes(sA) ? sA : "";
  state.sala = fsala.value;
  fpessoa.value = np.includes(pA) ? pA : "";
  state.pessoa = fpessoa.value;
  const ng = nomesDe(DADOS.grupos).sort();
  fgrupo.innerHTML = '<option value="">Todos os grupos</option>';
  ng.forEach((g) => fgrupo.add(new Option(g, g)));
  fgrupo.value = ng.includes(gA) ? gA : "";
  state.grupo = fgrupo.value;
}

function edCampo(lab, key, val) {
  return `<div class="field"><label class="lab" for="ed-${key}">${lab}</label><input id="ed-${key}" class="edinput" value="${esc(val || "")}"></div>`;
}
function edArea(lab, key, val) {
  return `<div class="field"><label class="lab" for="ed-${key}">${lab}</label><textarea id="ed-${key}" class="edinput edarea">${esc(val || "")}</textarea></div>`;
}
function edCampoL(lab, key, val, list) {
  return `<div class="field"><label class="lab" for="ed-${key}">${lab}</label><input id="ed-${key}" class="edinput" list="${list}" value="${esc(val || "")}"></div>`;
}
function chipField(lab, key, vals, pool) {
  return `<div class="field"><div class="lab">${lab}</div><div class="chipfield" data-pool="${pool}"><input type="hidden" id="ed-${key}" value="${esc((vals || []).join(", "))}"></div></div>`;
}
function initChipFields() {
  document.querySelectorAll(".chipfield").forEach(function (cf) {
    if (!cf._init) {
      cf._init = true;
      cf._editing = false;
      cfRender(cf);
    }
  });
}
function cfPoolList(kind) {
  if (kind === "pessoa")
    return nomesDe(DADOS.personagens.filter((e) => !ehAliasPessoa(e.nome)));
  if (kind === "grupo") return nomesDe(DADOS.grupos);
  if (kind === "sala") return nomesDe(DADOS.salas);
  return [];
}
function cfVals(cf) {
  var i = cf.querySelector("input[type=hidden]");
  return (i.value || "")
    .split(",")
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
}
function cfSetHidden(cf, arr) {
  var seen = [];
  arr.forEach(function (x) {
    x = (x || "").trim();
    if (
      x &&
      !seen.some(function (y) {
        return y.toLowerCase() === x.toLowerCase();
      })
    )
      seen.push(x);
  });
  cf.querySelector("input[type=hidden]").value = seen.join(", ");
}
function cfRender(cf) {
  var vals = cfVals(cf);
  var pool = cf.dataset.pool;
  var editing = cf._editing;
  var hid = cf.querySelector("input[type=hidden]");
  var html = vals
    .map(function (v, i) {
      var col =
        pool === "grupo"
          ? corContraste((grupoObj(v) || {}).cor || "#5b6b86")
          : null;
      return (
        '<span class="chip-el"' +
        (col
          ? ' style="background:' +
            col +
            ";color:#fff;border-color:" +
            col +
            '"'
          : "") +
        ">" +
        esc(v) +
        '<b class="x" data-i="' +
        i +
        '">\u00d7</b></span>'
      );
    })
    .join("");
  if (editing) {
    html +=
      '<span class="chip-in"><input class="chip-input" autocomplete="off" placeholder="digite e Enter\u2026"><div class="chip-sug"></div></span>';
  } else {
    html +=
      '<button type="button" class="chip-add">+ ' +
      (vals.length ? "" : "adicionar") +
      "</button>";
  }
  cf.innerHTML = "";
  cf.appendChild(hid);
  cf.insertAdjacentHTML("beforeend", html);
  cf.querySelectorAll(".x").forEach(function (b) {
    b.onclick = function () {
      var v = cfVals(cf);
      v.splice(+b.dataset.i, 1);
      cfSetHidden(cf, v);
      cfRender(cf);
    };
  });
  var add = cf.querySelector(".chip-add");
  if (add)
    add.onclick = function () {
      cf._editing = true;
      cfRender(cf);
      var inp = cf.querySelector(".chip-input");
      if (inp) inp.focus();
    };
  var inp = cf.querySelector(".chip-input");
  if (inp) {
    inp.oninput = function () {
      cfSug(cf, inp.value);
    };
    inp.onkeydown = function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        cfCommit(cf, inp.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        cf._editing = false;
        cfRender(cf);
      } else if (e.key === "Backspace" && !inp.value) {
        var v = cfVals(cf);
        if (v.length) {
          v.pop();
          cfSetHidden(cf, v);
          cfRender(cf);
          var ni = cf.querySelector(".chip-input");
          if (ni) ni.focus();
        }
      }
    };
    inp.onblur = function () {
      setTimeout(function () {
        if (cf._sugClicking) {
          cf._sugClicking = false;
          return;
        }
        if (inp.value.trim()) {
          cfCommit(cf, inp.value);
        } else {
          cf._editing = false;
          cfRender(cf);
        }
      }, 150);
    };
    cfSug(cf, "");
  }
}
function cfCommit(cf, text) {
  var parts = (text || "")
    .split(",")
    .map(function (s) {
      return s.trim();
    })
    .filter(Boolean);
  var v = cfVals(cf).concat(parts);
  cf._editing = false;
  cfSetHidden(cf, v);
  cfRender(cf);
}
function cfSug(cf, q) {
  var box = cf.querySelector(".chip-sug");
  if (!box) return;
  var have = cfVals(cf).map(function (s) {
    return s.toLowerCase();
  });
  var ql = (q || "").trim().toLowerCase();
  var pool = cfPoolList(cf.dataset.pool).filter(function (n) {
    return have.indexOf(n.toLowerCase()) < 0;
  });
  if (ql)
    pool = pool.filter(function (n) {
      return n.toLowerCase().indexOf(ql) >= 0;
    });
  pool = pool.slice(0, 8);
  box.innerHTML = pool
    .map(function (n) {
      return '<div class="chip-sugit">' + esc(n) + "</div>";
    })
    .join("");
  box.style.display = pool.length ? "block" : "none";
  box.querySelectorAll(".chip-sugit").forEach(function (el, i) {
    el.onmousedown = function () {
      cf._sugClicking = true;
    };
    el.onclick = function () {
      var v = cfVals(cf);
      v.push(pool[i]);
      cfSetHidden(cf, v);
      cf._editing = true;
      cfRender(cf);
      var ni = cf.querySelector(".chip-input");
      if (ni) {
        ni.value = "";
        ni.focus();
        cfSug(cf, "");
      }
    };
  });
}
function escolherImagem(inputId, previewId) {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = "image/*";
  inp.onchange = async () => {
    const file = inp.files && inp.files[0];
    if (!file) return;
    let val, prev;
    const path = await salvarImagemArquivo(file, "ficha");
    if (path) {
      val = path;
      prev = URL.createObjectURL(file);
    } else {
      const url = await redimImagem(file);
      val = url;
      prev = url;
    }
    const t = document.getElementById(inputId);
    if (t) t.value = val;
    const pv = document.getElementById(previewId);
    if (pv) {
      pv.src = prev;
      pv.style.display = "block";
    }
  };
  inp.click();
}
function redimImagem(file) {
  return new Promise((res) => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1100;
        let w = img.width,
          hh = img.height;
        if (w > max || hh > max) {
          const s = max / Math.max(w, hh);
          w = Math.round(w * s);
          hh = Math.round(hh * s);
        }
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = hh;
        cv.getContext("2d").drawImage(img, 0, 0, w, hh);
        let url;
        try {
          url = cv.toDataURL("image/jpeg", 0.82);
        } catch (e) {
          url = rd.result;
        }
        res(url);
      };
      img.onerror = () => res(rd.result);
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}
let dirHandle = null;
async function ensureImagensDir() {
  if (!window.showDirectoryPicker) return null;
  if (!dirHandle) dirHandle = await idbGet("dirHandle");
  if (dirHandle) {
    let perm = "prompt";
    try {
      perm = await dirHandle.queryPermission({ mode: "readwrite" });
    } catch (e) {}
    if (perm !== "granted") {
      try {
        perm = await dirHandle.requestPermission({ mode: "readwrite" });
      } catch (e) {
        perm = "denied";
      }
    }
    if (perm !== "granted") dirHandle = null;
  }
  if (!dirHandle) {
    try {
      dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      await idbSet("dirHandle", dirHandle);
    } catch (e) {
      return null;
    }
  }
  try {
    return await dirHandle.getDirectoryHandle("imagens", { create: true });
  } catch (e) {
    return null;
  }
}
function _extDe(t) {
  return t === "image/png"
    ? "png"
    : t === "image/webp"
      ? "webp"
      : t === "image/gif"
        ? "gif"
        : "jpg";
}
async function salvarImagemArquivo(blob, base) {
  try {
    const dir = await ensureImagensDir();
    if (!dir) return null;
    const name = (base || "img") + "-" + Date.now() + "." + _extDe(blob.type);
    const fh = await dir.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(blob);
    await w.close();
    return "imagens/" + name;
  } catch (e) {
    return null;
  }
}
async function conectarPasta() {
  const dir = await ensureImagensDir();
  toast(
    dir
      ? "Pasta conectada ✓ — colagens viram arquivos em imagens/"
      : "Nao foi possivel conectar a pasta.",
    3800,
  );
}
async function migrarImagens() {
  const dir = await ensureImagensDir();
  if (!dir) {
    alert(
      "Preciso de acesso a pasta (Chrome/Edge). Clique em 'Conectar pasta' primeiro.",
    );
    return;
  }
  let n = 0;
  const alvos = [
    ...fichas,
    ...DADOS.salas,
    ...DADOS.personagens,
    ...DADOS.colecoes,
  ];
  for (const o of alvos) {
    if (o.imagem && o.imagem.indexOf("data:") === 0) {
      try {
        const blob = await (await fetch(o.imagem)).blob();
        const base = o.id
          ? "ficha-" + o.id
          : "img-" +
            String(o.nome || "x")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[^a-z0-9]+/g, "")
              .slice(0, 16);
        const name =
          base +
          "-" +
          Date.now() +
          "-" +
          Math.floor(Math.random() * 1000) +
          "." +
          _extDe(blob.type);
        const fh = await dir.getFileHandle(name, { create: true });
        const w = await fh.createWritable();
        await w.write(blob);
        await w.close();
        o.imagem = "imagens/" + name;
        n++;
      } catch (e) {}
    }
  }
  marcarAlterado();
  render();
  toast(
    n + " imagem(ns) convertida(s) em arquivo ✓ — agora clique em 💾 Salvar.",
    6000,
  );
}
let _quickFicha = null;
document.addEventListener("paste", async function (e) {
  const tag = ((e.target && e.target.tagName) || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  const items = (e.clipboardData && e.clipboardData.items) || [];
  let file = null;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type && items[i].type.indexOf("image") === 0) {
      file = items[i].getAsFile();
      break;
    }
  }
  if (!file) return;
  e.preventDefault();
  let imagem, preview;
  const path = await salvarImagemArquivo(file, "ficha");
  if (path) {
    imagem = path;
    preview = URL.createObjectURL(file);
  } else {
    const url = await redimImagem(file);
    imagem = url;
    preview = url;
  }
  const mq = document.getElementById("quickAdd");
  if (_quickFicha && mq && mq.classList.contains("open")) {
    _quickFicha.paginas.push({
      imagem: imagem,
      original: "",
      traducao: "",
      explica: "",
      rotulo: "",
    });
    _quickPreviews.push(preview);
    renderQuickPaginas();
  } else {
    abrirCadastroRapido(imagem, preview);
  }
});
let _quickPreviews = [];
function renderQuickPaginas() {
  const box = document.getElementById("q-pgs");
  if (!box || !_quickFicha) return;
  const n = _quickFicha.paginas.length;
  box.innerHTML = `<div class="qpgrow">${_quickPreviews.map((src, i) => `<div class="qpg"><img src="${esc(src)}"><span>${i + 1}</span></div>`).join("")}</div>${n > 1 ? `<div class="dica" style="text-align:center">📄 ${n} páginas nesta ficha</div>` : ""}`;
}
function abrirCadastroRapido(imagem, preview) {
  let n = 1;
  const ids = fichas.map((f) => f.id);
  while (ids.includes("f" + n)) n++;
  _quickFicha = {
    id: "f" + n,
    titulo: "",
    sala: "",
    colecoes: [],
    personagens: [],
    conexoes: [],
    notas: "",
    pendente: true,
    paginas: [
      { imagem: imagem, original: "", traducao: "", explica: "", rotulo: "" },
    ],
  };
  _quickPreviews = [preview || imagem];
  let m = document.getElementById("quickAdd");
  if (!m) {
    m = document.createElement("div");
    m.id = "quickAdd";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modalbox" style="max-width:560px"><div class="modalhd"><h2>📋 Cadastro rápido (Ctrl+V)</h2><button class="close" onclick="fecharQuick()">✕</button></div>
    <div class="savehelp">
      <div id="q-pgs"></div>
      <p class="dica" style="text-align:center">Cole de novo (Ctrl+V) para adicionar mais páginas a esta ficha.</p>
      ${edCampoL("Sala onde encontrei", "q-sala", "", "dl-salas-q")}
      <datalist id="dl-salas-q">${nomesDe(DADOS.salas)
        .map((s) => `<option value="${esc(s)}">`)
        .join("")}</datalist>
      ${edCampo("Título (opcional)", "q-titulo", "")}
      ${edArea("Observação rápida (opcional)", "q-obs", "")}
      <div class="editbtns"><button class="dbtn save" onclick="salvarRapido()">✓ Salvar</button><button class="dbtn" onclick="fecharQuick()">Cancelar</button></div>
      <p class="dica">Pode salvar sem preencher tudo. Fica marcada como ⏳ não processada até você me pedir no chat para rodar a skill.</p>
    </div></div>`;
  m.classList.add("open");
  renderQuickPaginas();
  setTimeout(() => {
    const s = document.getElementById("ed-q-sala");
    if (s) s.focus();
  }, 60);
}
function salvarRapido() {
  const f = _quickFicha;
  if (!f) return;
  const g = (k) => {
    const el = document.getElementById("ed-" + k);
    return el ? el.value : "";
  };
  f.sala = descobrirSala(g("q-sala").trim());
  f.titulo =
    g("q-titulo").trim() || "Pista colada " + new Date().toLocaleDateString();
  f.notas = g("q-obs");
  fichas.push(f);
  _quickFicha = null;
  _quickPreviews = [];
  const m = document.getElementById("quickAdd");
  if (m) m.classList.remove("open");
  marcarAlterado();
  rebuildFilters();
  render();
  abrir(f.id);
}
function fecharQuick() {
  const m = document.getElementById("quickAdd");
  if (m) m.classList.remove("open");
  _quickFicha = null;
  _quickPreviews = [];
  _quickLote = null;
}

/* ===========================================================
   UPLOAD EM MASSA (arrastar e soltar N imagens)
   - Arrastou imagens sobre o app -> véu "Solte as imagens aqui".
   - Soltou -> sobem em fila (3 por vez) com progresso no véu.
   - 1 imagem  -> cadastro rápido normal (igual ao Ctrl+V).
   - N imagens -> escolha: enviar sem cadastrar OU cadastrar em abas.
   =========================================================== */
let _quickLote = null,
  _quickIdx = 0;

// Reserva `qtd` ids livres de ficha (f1, f2, ...) sem repetir.
function _idsLivres(qtd) {
  const usados = new Set(fichas.map((f) => f.id));
  const out = [];
  let n = 1;
  while (out.length < qtd) {
    const id = "f" + n++;
    if (!usados.has(id)) {
      usados.add(id);
      out.push(id);
    }
  }
  return out;
}
function _tituloImportado(i, total) {
  return (
    "Pista importada " +
    new Date().toLocaleDateString() +
    " — " +
    (i + 1) +
    "/" +
    total
  );
}
function _fichaDoLote(id, imagem) {
  return {
    id: id,
    titulo: "",
    sala: "",
    grupos: [],
    colecoes: [],
    personagens: [],
    conexoes: [],
    notas: "",
    pendente: true,
    fav: false,
    status: "",
    paginas: [{ imagem: imagem, original: "", traducao: "", explica: "", rotulo: "" }],
  };
}

/* ---- véu de arrastar / progresso ---- */
function _dropveil(msg) {
  let v = document.getElementById("dropveil");
  if (!msg) {
    if (v) v.remove();
    return;
  }
  if (!v) {
    v = document.createElement("div");
    v.id = "dropveil";
    document.body.appendChild(v);
  }
  v.innerHTML = `<div class="dv-box">🖼️ ${msg}</div>`;
}
function _appPronto() {
  return (
    !document.body.classList.contains("pre-login") &&
    !document.body.classList.contains("app-carregando")
  );
}
function _dragTemArquivo(e) {
  const t = e.dataTransfer && e.dataTransfer.types;
  return !!t && Array.prototype.indexOf.call(t, "Files") >= 0;
}
let _dragN = 0;
document.addEventListener("dragenter", function (e) {
  if (!_dragTemArquivo(e) || !_appPronto()) return;
  e.preventDefault();
  _dragN++;
  _dropveil("Solte as imagens aqui");
});
document.addEventListener("dragover", function (e) {
  if (_dragTemArquivo(e)) e.preventDefault();
});
document.addEventListener("dragleave", function (e) {
  if (!_dragTemArquivo(e)) return;
  _dragN = Math.max(0, _dragN - 1);
  if (_dragN === 0) _dropveil(null);
});
document.addEventListener("drop", async function (e) {
  if (!_dragTemArquivo(e)) return;
  e.preventDefault();
  _dragN = 0;
  if (!_appPronto()) {
    _dropveil(null);
    return;
  }
  const files = Array.prototype.filter.call(
    (e.dataTransfer && e.dataTransfer.files) || [],
    (f) => f && f.type && f.type.indexOf("image") === 0,
  );
  if (!files.length) {
    _dropveil(null);
    return;
  }
  const itens = await _subirLote(files);
  _dropveil(null);
  if (itens.length === 1) abrirCadastroRapido(itens[0].imagem, itens[0].preview);
  else escolhaLote(itens);
});

/* ---- fila de upload: 3 por vez, com progresso; nada se perde ---- */
async function _subirLote(files) {
  const itens = new Array(files.length);
  let feito = 0,
    prox = 0;
  _dropveil("Enviando 0/" + files.length + "…");
  async function um() {
    while (prox < files.length) {
      const i = prox++;
      const file = files[i];
      let imagem, preview;
      try {
        const path = await salvarImagemArquivo(file, "ficha");
        if (path) {
          imagem = path;
          preview = URL.createObjectURL(file);
        } else {
          const url = await redimImagem(file);
          imagem = url;
          preview = url;
        }
      } catch (e2) {
        const url = await redimImagem(file);
        imagem = url;
        preview = url;
      }
      itens[i] = { imagem: imagem, preview: preview };
      feito++;
      _dropveil("Enviando " + feito + "/" + files.length + "…");
    }
  }
  await Promise.all([um(), um(), um()]);
  return itens;
}

/* ---- escolha: sem cadastro x abas ---- */
let _loteItens = null;
function escolhaLote(itens) {
  _loteItens = itens;
  let m = document.getElementById("loteEscolha");
  if (!m) {
    m = document.createElement("div");
    m.id = "loteEscolha";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modalbox" style="max-width:480px"><div class="modalhd"><h2>🖼️ ${itens.length} imagens recebidas</h2><button class="close" onclick="fecharEscolhaLote()">✕</button></div>
    <div class="savehelp">
      <p class="dica" style="text-align:center">Como você quer cadastrar?</p>
      <div class="editbtns" style="flex-direction:column;align-items:stretch">
        <button class="dbtn save" onclick="loteSemCadastro()">⚡ Enviar sem cadastrar (preencho depois)</button>
        <button class="dbtn" onclick="loteComCadastro()">📋 Cadastrar agora (uma aba por imagem)</button>
        <button class="dbtn" onclick="fecharEscolhaLote()">Cancelar</button>
      </div>
      <p class="dica">Nos dois casos as fichas ficam ⏳ pendentes — a IA ✨ pode preenchê-las depois.</p>
    </div></div>`;
  m.classList.add("open");
}
function fecharEscolhaLote() {
  const m = document.getElementById("loteEscolha");
  if (m) m.classList.remove("open");
}
function loteSemCadastro() {
  const itens = _loteItens || [];
  fecharEscolhaLote();
  _loteItens = null;
  if (!itens.length) return;
  const ids = _idsLivres(itens.length);
  itens.forEach(function (it, i) {
    const f = _fichaDoLote(ids[i], it.imagem);
    f.titulo = _tituloImportado(i, itens.length);
    fichas.push(f);
  });
  marcarAlterado();
  rebuildFilters();
  render();
  toast("✓ " + itens.length + " fichas criadas (pendentes ⏳)", 4000);
}
function loteComCadastro() {
  const itens = _loteItens || [];
  fecharEscolhaLote();
  _loteItens = null;
  if (itens.length) abrirCadastroLote(itens);
}

/* ---- cadastro rápido em ABAS (uma por imagem) ---- */
function abrirCadastroLote(itens) {
  const ids = _idsLivres(itens.length);
  _quickLote = itens.map(function (it, i) {
    return {
      ficha: _fichaDoLote(ids[i], it.imagem),
      previews: [it.preview || it.imagem],
    };
  });
  _quickIdx = 0;
  renderCadastroLote();
}
// guarda o que está digitado na aba atual (sala fica como texto cru;
// só vira sala "descoberta" na hora de concluir)
function _loteColhe() {
  if (!_quickLote) return;
  const it = _quickLote[_quickIdx];
  const g = (k) => {
    const el = document.getElementById("ed-" + k);
    return el ? el.value : "";
  };
  it.ficha.sala = g("q-sala");
  it.ficha.titulo = g("q-titulo");
  it.ficha.notas = g("q-obs");
}
function loteTrocaAba(i) {
  if (!_quickLote || i < 0 || i >= _quickLote.length || i === _quickIdx) return;
  _loteColhe();
  _quickIdx = i;
  renderCadastroLote();
}
function loteAplicarSala() {
  const el = document.getElementById("ed-q-sala");
  if (!el || !_quickLote) return;
  const v = el.value;
  _quickLote.forEach(function (it) {
    it.ficha.sala = v;
  });
  toast('Sala "' + v + '" aplicada às ' + _quickLote.length + " fichas ✓", 2500);
}
function renderCadastroLote() {
  const L = _quickLote;
  if (!L) return;
  const it = L[_quickIdx];
  // Ctrl+V com o modal aberto adiciona página à ABA ATUAL (reusa o fluxo de hoje)
  _quickFicha = it.ficha;
  _quickPreviews = it.previews;
  let m = document.getElementById("quickAdd");
  if (!m) {
    m = document.createElement("div");
    m.id = "quickAdd";
    m.className = "modal";
    document.body.appendChild(m);
  }
  const tabs = L.map(function (x, i) {
    const done =
      (x.ficha.titulo || x.ficha.sala || x.ficha.notas) && i !== _quickIdx
        ? " done"
        : "";
    return `<button class="qtab-lote${i === _quickIdx ? " active" : ""}${done}" onclick="loteTrocaAba(${i})" title="Imagem ${i + 1}"><img src="${esc(x.previews[0])}" onerror="this.style.display='none'"><span>${i + 1}</span></button>`;
  }).join("");
  m.innerHTML = `<div class="modalbox" style="max-width:640px"><div class="modalhd"><h2>📋 Cadastro rápido — ${L.length} imagens</h2><button class="close" onclick="fecharQuick()">✕</button></div>
    <div class="savehelp">
      <div class="qtabs-wrap">${tabs}</div>
      <div id="q-pgs"></div>
      ${edCampoL("Sala onde encontrei", "q-sala", it.ficha.sala, "dl-salas-q")}
      <datalist id="dl-salas-q">${nomesDe(DADOS.salas)
        .map((s) => `<option value="${esc(s)}">`)
        .join("")}</datalist>
      <div class="field"><button type="button" class="dbtn" onclick="loteAplicarSala()">📌 Aplicar esta sala a todas</button></div>
      ${edCampo("Título (opcional)", "q-titulo", it.ficha.titulo)}
      ${edArea("Observação rápida (opcional)", "q-obs", it.ficha.notas)}
      <div class="editbtns">
        <button class="dbtn" ${_quickIdx === 0 ? "disabled" : ""} onclick="loteTrocaAba(${_quickIdx - 1})">← Anterior</button>
        <button class="dbtn" ${_quickIdx === L.length - 1 ? "disabled" : ""} onclick="loteTrocaAba(${_quickIdx + 1})">Próxima →</button>
        <button class="dbtn save" onclick="salvarLote()">✓ Concluir (salva as ${L.length})</button>
        <button class="dbtn" onclick="fecharQuick()">Cancelar</button>
      </div>
      <p class="dica">Trocar de aba guarda o que você digitou. Abas vazias ganham título automático e ficam ⏳ pendentes. Ctrl+V adiciona outra página à aba atual.</p>
    </div></div>`;
  m.classList.add("open");
  renderQuickPaginas();
  setTimeout(() => {
    const s = document.getElementById("ed-q-sala");
    if (s) s.focus();
  }, 60);
}
function salvarLote() {
  if (!_quickLote) return;
  _loteColhe();
  const total = _quickLote.length;
  _quickLote.forEach(function (it, i) {
    const f = it.ficha;
    f.sala = descobrirSala((f.sala || "").trim());
    f.titulo = (f.titulo || "").trim() || _tituloImportado(i, total);
    fichas.push(f);
  });
  _quickLote = null;
  _quickFicha = null;
  _quickPreviews = [];
  const m = document.getElementById("quickAdd");
  if (m) m.classList.remove("open");
  marcarAlterado();
  rebuildFilters();
  render();
  toast("✓ " + total + " fichas criadas (pendentes ⏳)", 4000);
}

let _editPaginas = [],
  _editPgIdx = 0;
function editarFicha(id) {
  const f = fichas.find((x) => x.id === id);
  if (!f) return;
  _editPaginas = pgs(f).map((p) => ({
    imagem: p.imagem || "",
    original: p.original || "",
    traducao: p.traducao || "",
    explica: p.explica || "",
    rotulo: p.rotulo || "",
  }));
  _editPgIdx = 0;
  const d = document.getElementById("drawer");
  d.innerHTML = `
    <div class="dh">
      <div class="dh-top">
        <span class="plab">EDITANDO FICHA</span>
        <div class="dgrow"></div>
        <button class="close" onclick="abrir('${f.id}')" title="Voltar sem salvar">✕</button>
      </div>
      <h2 class="dtit">${esc(f.titulo)}</h2>
    </div>
    <div class="db">
      ${edCampo("Título", "titulo", f.titulo)}
      ${edCampoL("Sala de origem", "sala", f.sala, "dl-salas")}
      ${chipField("Personagens citados", "personagens", f.personagens || [], "pessoa")}
      ${chipField("Grupos", "grupos", f.grupos || [], "grupo")}
      <div class="field"><div class="lab">Status</div><select id="ed-status" class="edinput"><option value="">nenhum</option><option value="importante" ${f.status === "importante" ? "selected" : ""}>importante</option><option value="resolvida" ${f.status === "resolvida" ? "selected" : ""}>resolvida</option></select></div>
      ${edArea("Notas", "notas", f.notas)}
      <div class="pgedhead"><b>Páginas</b><button type="button" class="dbtn" onclick="addPaginaEdit()">＋ página</button></div>
      <div id="pgedtabs" class="pgtabs"></div>
      <div id="pgedpanel"></div>
      <div class="editbtns">
        <button class="dbtn cancel" onclick="abrir('${f.id}')">Cancelar</button>
        <span class="dgrow"></span>
        <button class="dbtn del" onclick="excluirFicha('${f.id}')">Excluir</button>
        <button class="dbtn save" onclick="salvarFichaEdit('${f.id}')">Salvar ficha</button>
      </div>
      <datalist id="dl-salas">${nomesDe(DADOS.salas)
        .map((s) => `<option value="${esc(s)}">`)
        .join("")}</datalist>
      <datalist id="dl-grupos">${nomesDe(DADOS.grupos)
        .map((g) => `<option value="${esc(g)}">`)
        .join("")}</datalist>
    </div>`;
  drawerAbrir();
  renderPagEdit();
  initChipFields();
}
function renderPagEdit() {
  const tabs = document.getElementById("pgedtabs");
  if (!tabs) return;
  tabs.innerHTML =
    _editPaginas
      .map(
        (p, i) =>
          `<button class="pgtab${i === _editPgIdx ? " active" : ""}" onclick="setPagEdit(${i})">${esc(p.rotulo || "Pág. " + (i + 1))}</button>`,
      )
      .join("") +
    (_editPaginas.length > 1
      ? ` <button class="pgtab pgdel" onclick="removerPaginaEdit(${_editPgIdx})" title="Remover esta página">🗑</button>`
      : "");
  const p = _editPaginas[_editPgIdx] || {};
  const panel = document.getElementById("pgedpanel");
  if (!panel) return;
  panel.innerHTML = `${edCampo("Rótulo da aba (opcional)", "p-rotulo", p.rotulo || "")}
    ${edCampo("Imagem (ou anexe abaixo)", "p-imagem", p.imagem || "")}
    <div class="field"><button type="button" class="dbtn attachbtn" onclick="escolherImagem('ed-p-imagem','ed-p-imgprev')">📎 Anexar imagem do computador</button><img id="ed-p-imgprev" class="imgprev" ${p.imagem ? 'src="' + esc(p.imagem) + '"' : 'style="display:none"'} onerror="this.style.display='none'"></div>
    ${edArea("Original (EN)", "p-original", p.original || "")}
    ${edArea("Tradução (PT)", "p-traducao", p.traducao || "")}
    ${edArea("O que explica", "p-explica", p.explica || "")}`;
}
function coletarPagEdit() {
  const g = (k) => {
    const el = document.getElementById("ed-" + k);
    return el ? el.value : "";
  };
  const p = _editPaginas[_editPgIdx];
  if (!p) return;
  p.rotulo = g("p-rotulo").trim();
  p.imagem = g("p-imagem").trim();
  p.original = g("p-original");
  p.traducao = g("p-traducao");
  p.explica = g("p-explica");
}
function setPagEdit(i) {
  coletarPagEdit();
  _editPgIdx = i;
  renderPagEdit();
}
function addPaginaEdit() {
  coletarPagEdit();
  _editPaginas.push({
    imagem: "",
    original: "",
    traducao: "",
    explica: "",
    rotulo: "",
  });
  _editPgIdx = _editPaginas.length - 1;
  renderPagEdit();
}
function removerPaginaEdit(i) {
  if (_editPaginas.length <= 1) return;
  _editPaginas.splice(i, 1);
  if (_editPgIdx >= _editPaginas.length) _editPgIdx = _editPaginas.length - 1;
  renderPagEdit();
}
function salvarFichaEdit(id) {
  const f = fichas.find((x) => x.id === id);
  if (!f) return;
  coletarPagEdit();
  const g = (k) => {
    const el = document.getElementById("ed-" + k);
    return el ? el.value : "";
  };
  f.titulo = g("titulo").trim() || "(sem título)";
  f.sala = g("sala").trim();
  f.personagens = g("personagens")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  f.grupos = g("grupos")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  f.grupos.forEach((gn) => {
    if (!acharEnt(DADOS.grupos, gn))
      DADOS.grupos.push({
        nome: gn,
        cor: _corHash(gn),
        imagem: "",
        descricao: "",
        fatos: [],
        notas: "",
      });
  });
  f.notas = g("notas");
  f.status = g("status");
  f.paginas = _editPaginas.map((p) => ({
    imagem: p.imagem || "",
    original: p.original || "",
    traducao: p.traducao || "",
    explica: p.explica || "",
    rotulo: p.rotulo || "",
  }));
  delete f.imagem;
  delete f.original;
  delete f.traducao;
  delete f.explica;
  delete f.simbolos;
  delete f.ordem;
  if (f.sala) f.sala = descobrirSala(f.sala);
  f.personagens.forEach((pp) => {
    if (!acharEnt(DADOS.personagens, pp))
      DADOS.personagens.push({
        nome: pp,
        imagem: "",
        descricao: "",
        fatos: [],
        notas: "",
      });
  });
  marcarAlterado();
  rebuildFilters();
  render();
  abrir(id);
}
function excluirFicha(id) {
  const f = fichas.find((x) => x.id === id);
  if (!f) return;
  if (
    !confirm(
      'Excluir a ficha "' +
        f.titulo +
        '"?\n\nA exclusao vale depois que voce salvar o dados.js.',
    )
  )
    return;
  fichas.splice(fichas.indexOf(f), 1);
  marcarAlterado();
  fechar();
  rebuildFilters();
  render();
}
function novaFicha() {
  let n = 1;
  const ids = fichas.map((f) => f.id);
  while (ids.includes("f" + n)) n++;
  const nf = {
    id: "f" + n,
    titulo: "Nova ficha",
    imagem: "",
    original: "",
    traducao: "",
    explica: "",
    sala: "",
    colecoes: [],
    ordem: undefined,
    personagens: [],
    conexoes: [],
    notas: "",
    pendente: true,
  };
  fichas.push(nf);
  marcarAlterado();
  render();
  editarFicha(nf.id);
}

function serializeDados() {
  return (
    "/* Blue Prince - dados.js (gerado pelo painel em " +
    new Date().toLocaleString() +
    ") */\n\nconst DADOS = " +
    JSON.stringify(DADOS, null, 2) +
    ";\n"
  );
}
function mostrarOnboard() {
  var o = document.getElementById("onboard");
  if (!o) return;
  var msg = document.getElementById("onboardMsg"),
    btn = document.getElementById("onboardBtn");
  if (_pendingHandle) {
    if (msg)
      msg.innerHTML =
        "Reconecte ao arquivo <b>" +
        esc(_pendingHandle.name || "dados.js") +
        "</b> para continuar salvando automaticamente. É só um clique — a pasta já está lembrada.";
    if (btn) {
      btn.textContent = "🔓 Reconectar e continuar";
      btn.setAttribute("onclick", "reconectarHandle()");
    }
  } else {
    if (msg)
      msg.innerHTML =
        "Para o painel guardar tudo automaticamente, escolha o arquivo <b>dados.js</b> da pasta do painel. É só uma vez — depois ele reconecta sozinho.";
    if (btn) {
      btn.textContent = "📂 Escolher onde salvar";
      btn.setAttribute("onclick", "escolherArquivoSalvar()");
    }
  }
  o.style.display = "flex";
}
async function reconectarHandle() {
  if (!_pendingHandle) return escolherArquivoSalvar();
  try {
    var perm = await _pendingHandle.requestPermission({ mode: "readwrite" });
    if (perm === "granted") {
      fileHandle = _pendingHandle;
      _pendingHandle = null;
      await idbSet("fileHandle", fileHandle);
      autoSave = true;
      _diskMtime = await lerMtime();
      esconderOnboard();
      marcarSalvo();
      toast("Reconectado ✓ — salvando automaticamente", 2600);
    } else {
      var msg = document.getElementById("onboardMsg");
      if (msg)
        msg.innerHTML =
          "Permissão negada. Clique de novo e escolha <b>Permitir</b> para o painel poder salvar.";
    }
  } catch (e) {}
}
function esconderOnboard() {
  var o = document.getElementById("onboard");
  if (o) o.style.display = "none";
}
function exigirPasta() {
  mostrarOnboard();
}
async function escolherArquivoSalvar() {
  if (!window.showSaveFilePicker) {
    var msg = document.getElementById("onboardMsg");
    if (msg)
      msg.innerHTML =
        "Seu navegador não permite gravar direto no arquivo. Abra o painel no <b>Chrome</b> ou no <b>Edge</b> para poder salvar automaticamente.";
    return;
  }
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: "dados.js",
      types: [
        { description: "JavaScript", accept: { "text/javascript": [".js"] } },
      ],
    });
    _pendingHandle = null;
    await idbSet("fileHandle", fileHandle);
    const w = await fileHandle.createWritable();
    await w.write(serializeDados());
    await w.close();
    _diskMtime = Date.now();
    autoSave = true;
    esconderOnboard();
    marcarSalvo();
    toast("Pasta conectada ✓ — tudo será salvo automaticamente", 3200);
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
}
let _lastBkp = 0;
async function gravarBackup(force) {
  try {
    if (!force && Date.now() - _lastBkp < 90000) return;
    let dh = dirHandle;
    if (!dh) {
      dh = await idbGet("dirHandle");
      if (dh) dirHandle = dh;
    }
    if (!dh) return;
    let perm = "prompt";
    try {
      perm = await dh.queryPermission({ mode: "readwrite" });
    } catch (e) {}
    if (perm !== "granted") return;
    const bk = await dh.getDirectoryHandle("backups", { create: true });
    const d = new Date();
    const z = (n) => String(n).padStart(2, "0");
    const name =
      "dados-" +
      d.getFullYear() +
      z(d.getMonth() + 1) +
      z(d.getDate()) +
      "-" +
      z(d.getHours()) +
      z(d.getMinutes()) +
      z(d.getSeconds()) +
      ".js";
    const fh = await bk.getFileHandle(name, { create: true });
    const w = await fh.createWritable();
    await w.write(serializeDados());
    await w.close();
    _lastBkp = Date.now();
    const nomes = [];
    for await (const [nm, hh] of bk.entries()) {
      if (nm.indexOf("dados-") === 0 && nm.endsWith(".js")) nomes.push(nm);
    }
    nomes.sort();
    while (nomes.length > 15) {
      const old = nomes.shift();
      try {
        await bk.removeEntry(old);
      } catch (e) {}
    }
  } catch (e) {}
}
let fileHandle = null;
async function salvarTudo() {
  if (
    DADOS_BROKEN &&
    !confirm(
      "Os dados estao em modo de recuperacao (possivelmente vazios). Salvar agora grava por cima do arquivo. Recomendo restaurar um backup antes. Continuar mesmo assim?",
    )
  )
    return;
  const txt = serializeDados();
  if (
    fileHandle &&
    (await discoMudou()) &&
    !confirm(
      "O arquivo dados.js mudou fora do painel. Sobrescrever com a sua versao? (Cancelar = recarregar)",
    )
  ) {
    location.reload();
    return;
  }
  if (window.showSaveFilePicker) {
    try {
      if (!fileHandle) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: "dados.js",
          types: [
            {
              description: "JavaScript",
              accept: { "text/javascript": [".js"] },
            },
          ],
        });
        idbSet("fileHandle", fileHandle);
      }
      updateSaveStatus("saving");
      const w = await fileHandle.createWritable();
      await w.write(txt);
      await w.close();
      marcarSalvo();
      toast("Salvo direto no arquivo ✓  (recarregue o painel para confirmar)");
      gravarBackup(true);
      snapshotDB(true);
      _diskMtime = Date.now();
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
  }
  const b = new Blob([txt], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = "dados.js";
  document.body.appendChild(a);
  a.click();
  a.remove();
  marcarSalvo();
  ajudaSalvar();
}
function pastaAtual() {
  try {
    let u = decodeURIComponent(location.href);
    u = u.replace(/^file:\/\/\//, "").replace(/[\/\\][^\/\\]*$/, "");
    if (/^[A-Za-z]:/.test(u)) u = u.replace(/\//g, "\\");
    return u;
  } catch (e) {
    return "";
  }
}
function copiarCaminho() {
  const t = document.getElementById("pathtxt");
  if (!t) return;
  const s = t.textContent;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(s).then(
      () => toast("Caminho copiado \u2713"),
      () => toast(s),
    );
  } else {
    toast(s);
  }
}
function fecharAjudaSalvar() {
  const m = document.getElementById("saveHelp");
  if (m) m.classList.remove("open");
}
function ajudaSalvar() {
  const folder = pastaAtual();
  let m = document.getElementById("saveHelp");
  if (!m) {
    m = document.createElement("div");
    m.id = "saveHelp";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML =
    `<div class="modalbox" style="max-width:540px"><div class="modalhd"><h2>\uD83D\uDCBE Quase l\u00e1</h2><button class="close" onclick="fecharAjudaSalvar()">\u2715</button></div>` +
    `<div class="savehelp"><p>O navegador baixou o <b>dados.js</b> atualizado (geralmente na pasta <b>Downloads</b>).</p>` +
    `<p>Mova esse arquivo para a pasta abaixo, <b>substituindo o antigo</b>, e recarregue o painel:</p>` +
    `<div class="pathbox"><code id="pathtxt">${esc(folder || "(a mesma pasta do painel.html)")}</code><button class="topbtn" onclick="copiarCaminho()">Copiar caminho</button></div>` +
    `<p class="dica">\uD83D\uDCA1 No <b>Chrome</b> ou <b>Edge</b> o Salvar grava direto no arquivo \u2014 voc\u00ea nem precisa fazer isso.</p>` +
    `<div style="text-align:right"><button class="topbtn" onclick="fecharAjudaSalvar()">Entendi</button></div></div></div>`;
  m.classList.add("open");
}
function toast(msg, ms) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), ms || 5500);
}
/* ---- auto-salvar (so com arquivo conectado: Chrome/Edge) ---- */
let autoSave = true,
  autoTimer = null;
function setAuto(v) {
  autoSave = v;
  const b = document.getElementById("btnAuto");
  if (b) {
    b.classList.toggle("on", autoSave);
    var _lb = b.querySelector(".ni-lb");
    if (_lb) _lb.textContent = autoSave ? "Auto-salvar: ON" : "Auto-salvar";
  }
  idbSet("autoOn", v);
}
/* ---- persistencia do arquivo (IndexedDB) p/ religar apos recarregar ---- */
function _idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("bpPanel", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbSet(k, v) {
  try {
    const db = await _idb();
    await new Promise((res, rej) => {
      const t = db.transaction("kv", "readwrite");
      t.objectStore("kv").put(v, k);
      t.oncomplete = res;
      t.onerror = () => rej(t.error);
    });
  } catch (e) {}
}
async function idbGet(k) {
  try {
    const db = await _idb();
    return await new Promise((res) => {
      const t = db.transaction("kv", "readonly");
      const q = t.objectStore("kv").get(k);
      q.onsuccess = () => res(q.result);
      q.onerror = () => res(undefined);
    });
  } catch (e) {
    return undefined;
  }
}
async function trocarArquivo() {
  if (!window.showSaveFilePicker) {
    alert("Trocar arquivo precisa do Chrome ou Edge.");
    return;
  }
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: "dados.js",
      types: [
        { description: "JavaScript", accept: { "text/javascript": [".js"] } },
      ],
    });
    await idbSet("fileHandle", fileHandle);
    const w = await fileHandle.createWritable();
    await w.write(serializeDados());
    await w.close();
    setAuto(true);
    marcarSalvo();
    toast("Arquivo trocado e auto-salvar ligado \u2713", 2600);
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
}
function mostrarReconectar(hnd) {
  let bar = document.getElementById("reconnectBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "reconnectBar";
    bar.className = "reconnect";
    document.body.appendChild(bar);
  }
  bar.innerHTML =
    '<span>⟳ Auto-salvar estava ligado. Reative o acesso ao arquivo:</span> <button class="topbtn" id="rcbtn">Reativar (1 clique)</button> <button class="topbtn" id="rcx">Agora não</button>';
  bar.style.display = "flex";
  document.getElementById("rcbtn").onclick = async () => {
    try {
      const pp = await hnd.requestPermission({ mode: "readwrite" });
      if (pp === "granted") {
        fileHandle = hnd;
        setAuto(true);
        bar.style.display = "none";
        toast("Auto-salvar reativado \u2713", 2000);
      } else {
        toast("Permissao negada.", 2500);
      }
    } catch (e) {}
  };
  document.getElementById("rcx").onclick = () => {
    bar.style.display = "none";
  };
}
/* ===== Durabilidade e recuperacao ===== */
let _lastSnap = 0,
  _diskMtime = 0;
async function snapshotDB(force) {
  try {
    if (DADOS_BROKEN) return;
    if (!force && Date.now() - _lastSnap < 60000) return;
    let snaps = (await idbGet("snaps")) || [];
    snaps.push({
      t: Date.now(),
      n: (DADOS.fichas || []).length,
      data: JSON.parse(JSON.stringify(DADOS)),
    });
    while (snaps.length > 10) snaps.shift();
    await idbSet("snaps", snaps);
    _lastSnap = Date.now();
  } catch (e) {}
}
async function lerMtime() {
  try {
    if (fileHandle) {
      const f = await fileHandle.getFile();
      return f.lastModified || 0;
    }
  } catch (e) {}
  return 0;
}
async function discoMudou() {
  if (!fileHandle) return false;
  const m = await lerMtime();
  return !!(_diskMtime && m && m > _diskMtime + 1500);
}
function bannerDisco() {
  let b = document.getElementById("diskBanner");
  if (!b) {
    b = document.createElement("div");
    b.id = "diskBanner";
    b.className = "diskbanner";
    document.body.appendChild(b);
  }
  b.innerHTML =
    '⚠ O arquivo dados.js mudou fora do painel. <button class="topbtn" onclick="location.reload()">Recarregar</button> <button class="topbtn" onclick="forcarSalvar()">Manter o meu (sobrescrever)</button> <button class="topbtn" onclick="this.parentNode.style.display=\'none\'">Ignorar</button>';
  b.style.display = "flex";
}
async function forcarSalvar() {
  const b = document.getElementById("diskBanner");
  if (b) b.style.display = "none";
  try {
    const w = await fileHandle.createWritable();
    await w.write(serializeDados());
    await w.close();
    _diskMtime = Date.now();
    gravarBackup(true);
    snapshotDB(true);
    marcarSalvo();
    toast("Sobrescrito com a sua versao ✓");
  } catch (e) {
    toast("Falha ao salvar.", 3000);
  }
}
function _parseDadosTxt(txt) {
  const a = txt.indexOf("{");
  const b = txt.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("formato");
  return JSON.parse(txt.slice(a, b + 1));
}
function _tsNome(nm) {
  const m = nm.match(/dados-(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)/);
  if (!m) return 0;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
}
let _fontesCache = [];
async function listarFontes(comDisco) {
  const cands = [];
  try {
    const snaps = (await idbGet("snaps")) || [];
    snaps
      .slice()
      .reverse()
      .forEach((s) =>
        cands.push({
          fonte: "Snapshot interno (navegador)",
          t: s.t,
          n: s.n,
          data: s.data,
        }),
      );
  } catch (e) {}
  if (comDisco) {
    try {
      let dh = dirHandle || (await idbGet("dirHandle"));
      if (dh) {
        let perm = "prompt";
        try {
          perm = await dh.queryPermission({ mode: "readwrite" });
        } catch (e) {}
        if (perm !== "granted") {
          try {
            perm = await dh.requestPermission({ mode: "readwrite" });
          } catch (e) {}
        }
        if (perm === "granted") {
          dirHandle = dh;
          const bk = await dh.getDirectoryHandle("backups", { create: true });
          for await (const [nm, hh] of bk.entries()) {
            if (nm.indexOf("dados-") === 0 && nm.endsWith(".js"))
              cands.push({
                fonte: "backups/" + nm,
                t: _tsNome(nm),
                n: null,
                handle: hh,
              });
          }
        }
      }
    } catch (e) {}
  }
  return cands.sort((a, b) => b.t - a.t);
}
async function _obterData(c) {
  if (c.data) return c.data;
  if (c.handle) {
    const f = await c.handle.getFile();
    return _parseDadosTxt(await f.text());
  }
  throw new Error("sem fonte");
}
async function restaurarFonte(idx) {
  try {
    const c = _fontesCache[idx];
    if (!c) return;
    const d = await _obterData(c);
    if (!_dadosValido(d)) {
      alert("Esse backup parece invalido.");
      return;
    }
    if (
      !confirm(
        "Restaurar este backup? O dados.js sera sobrescrito e o painel vai recarregar.",
      )
    )
      return;
    let fh = fileHandle || (await idbGet("fileHandle"));
    if (!fh) {
      if (!window.showSaveFilePicker) {
        alert("Use Chrome/Edge para gravar.");
        return;
      }
      fh = await window.showSaveFilePicker({
        suggestedName: "dados.js",
        types: [
          { description: "JavaScript", accept: { "text/javascript": [".js"] } },
        ],
      });
      await idbSet("fileHandle", fh);
    } else {
      let perm = fh.queryPermission
        ? await fh.queryPermission({ mode: "readwrite" })
        : "granted";
      if (perm !== "granted") {
        perm = await fh.requestPermission({ mode: "readwrite" });
        if (perm !== "granted") {
          alert("Permissao negada.");
          return;
        }
      }
    }
    const txt =
      "/* Blue Prince - dados.js (restaurado em " +
      new Date().toLocaleString() +
      ") */\n\nconst DADOS = " +
      JSON.stringify(d, null, 2) +
      ";\n";
    const w = await fh.createWritable();
    await w.write(txt);
    await w.close();
    toast("Restaurado ✓ recarregando...", 1500);
    setTimeout(() => location.reload(), 700);
  } catch (e) {
    if (e && e.name === "AbortError") return;
    alert("Falha ao restaurar: " + ((e && e.message) || e));
  }
}
function _linhasFontes(l) {
  return l.length
    ? l
        .map(
          (c, i) =>
            `<div class="linkrow"><span>${esc(c.fonte)} — ${new Date(c.t).toLocaleString()}${c.n != null ? " · " + c.n + " fichas" : ""}</span> <button class="dbtn save" onclick="restaurarFonte(${i})">Restaurar</button></div>`,
        )
        .join("")
    : "<div class='gvazio'>Nenhum backup encontrado.</div>";
}
async function abrirBackups(comDisco) {
  let m = document.getElementById("bkModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "bkModal";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML =
    '<div class="modalbox" style="max-width:600px"><div class="modalhd"><h2>🛠 Backups / Restaurar</h2><button class="close" onclick="document.getElementById(\'bkModal\').classList.remove(\'open\')">✕</button></div><div class="savehelp"><p class="dica">Suas fichas tem 3 copias: o arquivo dados.js, os backups da pasta e snapshots no navegador. Restaurar grava o escolhido no dados.js e recarrega.</p><div class="editbtns" style="margin:0 0 8px"><button class="dbtn" onclick="abrirBackups(true)">🔄 Incluir backups da pasta</button></div><div id="bkLista" class="linklista">Carregando...</div></div></div>';
  m.classList.add("open");
  _fontesCache = await listarFontes(!!comDisco);
  const box = document.getElementById("bkLista");
  if (box) box.innerHTML = _linhasFontes(_fontesCache);
}
function abrirRecuperacao() {
  let m = document.getElementById("recModal");
  if (!m) {
    m = document.createElement("div");
    m.id = "recModal";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML =
    '<div class="modalbox" style="max-width:600px"><div class="modalhd"><h2>⚠ Recuperar dados</h2></div><div class="savehelp"><p class="dica">O <b>dados.js</b> nao pode ser lido (vazio, corrompido ou truncado). O auto-salvar foi <b>desligado</b> para nao sobrescrever nada. Escolha um backup para restaurar:</p><div class="editbtns" style="margin:0 0 8px"><button class="dbtn" onclick="abrirBackups(true)">🔄 Procurar na pasta backups/</button><button class="dbtn" onclick="importarDados()">⬆ Importar arquivo</button></div><div id="recLista" class="linklista">Procurando snapshots...</div></div></div>';
  m.classList.add("open");
  listarFontes(false).then((l) => {
    _fontesCache = l;
    const box = document.getElementById("recLista");
    if (box)
      box.innerHTML = l.length
        ? _linhasFontes(l)
        : "<div class='gvazio'>Nenhum snapshot interno. Clique em 'Procurar na pasta backups/' ou 'Importar arquivo'.</div>";
  });
}
let _pendingHandle = null;
async function reconectarAoCarregar() {
  try {
    if (DADOS_BROKEN) return;
    if (!("indexedDB" in window)) return;
    const hnd = await idbGet("fileHandle");
    if (!hnd) return;
    _pendingHandle = hnd;
    const perm = hnd.queryPermission
      ? await hnd.queryPermission({ mode: "readwrite" })
      : "prompt";
    if (perm === "granted") {
      fileHandle = hnd;
      _pendingHandle = null;
      autoSave = true;
      _diskMtime = await lerMtime();
    }
  } catch (e) {}
}
function agendarAuto() {
  if (!autoSave || !fileHandle) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(salvarAuto, 700);
}
async function salvarAuto() {
  if (!autoSave || !fileHandle || DADOS_BROKEN) return;
  try {
    if (await discoMudou()) {
      bannerDisco();
      return;
    }
    updateSaveStatus("saving");
    const w = await fileHandle.createWritable();
    await w.write(serializeDados());
    await w.close();
    _diskMtime = Date.now();
    gravarBackup(false);
    snapshotDB(false);
    marcarSalvo();
    toast("\u2713 salvo automaticamente", 1400);
  } catch (e) {
    updateSaveStatus("nohandle");
    toast(
      "Salvamento pausado: permiss\u00e3o perdida. Reconecte para continuar salvando.",
      5000,
    );
    if (typeof exigirPasta === "function") exigirPasta();
  }
}
function toggleAuto() {
  if (autoSave) {
    setAuto(false);
    clearTimeout(autoTimer);
    toast("Auto-salvar desligado", 1800);
    return;
  }
  if (!window.showSaveFilePicker) {
    alert(
      "Auto-salvar precisa do Chrome ou Edge (que gravam direto no arquivo). Em outros navegadores o Salvar baixa o arquivo, entao nao da pra automatizar.",
    );
    return;
  }
  setAuto(true);
  if (!fileHandle) {
    salvarTudo().then(() => {
      if (!fileHandle) {
        setAuto(false);
      } else {
        toast("Auto-salvar ligado \u2713", 2000);
        if (dirty) agendarAuto();
      }
    });
  } else {
    toast("Auto-salvar ligado \u2713", 2000);
    if (dirty) agendarAuto();
  }
}
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ---- gestao de salas / personagens / tipos ---- */
function abrirGestao() {
  document.getElementById("modalGestao").classList.add("open");
  renderGestao();
}
function fecharGestao() {
  document.getElementById("modalGestao").classList.remove("open");
}
function renderGestao() {
  buildLista(
    "g-salas",
    [...DADOS.salas].sort((a, b) => (a.nome < b.nome ? -1 : 1)),
    "sala",
  );
  buildLista(
    "g-pessoas",
    [...DADOS.personagens].sort((a, b) => (a.nome < b.nome ? -1 : 1)),
    "pessoa",
  );
  buildLista(
    "g-grupos",
    [...DADOS.grupos].sort((a, b) => (a.nome < b.nome ? -1 : 1)),
    "grupo",
  );
  var _sc = document.getElementById("gc-salas");
  if (_sc) _sc.textContent = DADOS.salas.length;
  var _pc = document.getElementById("gc-pessoas");
  if (_pc) _pc.textContent = DADOS.personagens.length;
  var _gc = document.getElementById("gc-grupos");
  if (_gc) _gc.textContent = DADOS.grupos.length;
  fillMescla();
}
function buildLista(elId, arr, kind) {
  const box = document.getElementById(elId);
  if (!box) return;
  box.innerHTML = "";
  if (!arr.length) {
    box.innerHTML = '<div class="gvazio">(vazio)</div>';
    return;
  }
  arr.forEach((ent) => {
    const nome = ent.nome;
    const row = document.createElement("div");
    row.className = "grow";
    const inp = document.createElement("input");
    inp.className = "ginput";
    inp.value = nome;
    if (kind === "sala") {
      // Salas vêm do diretório compartilhado (Supabase): aqui não se renomeia
      // nem se exclui — só se abre o dossiê.
      inp.readOnly = true;
      inp.title = "Sala do diretório do jogo (não editável aqui)";
    } else {
      inp.onchange = () => {
        const nv = inp.value.trim();
        if (nv && nv !== nome) {
          renomearEnt(kind, nome, nv);
        } else if (!nv) {
          inp.value = nome;
        }
      };
    }
    const dos = document.createElement("button");
    dos.className = "gdos";
    dos.textContent = "📋";
    dos.title = "Abrir dossiê";
    dos.onclick = () => {
      fecharGestao();
      abrirEntidade(kind, nome);
    };
    let del = null;
    if (kind !== "sala") {
      del = document.createElement("button");
      del.className = "gdel";
      del.textContent = "🗑";
      del.onclick = () => {
        if (
          confirm(
            'Excluir "' +
              nome +
              '"? Sera removido das fichas e o dossie apagado.',
          )
        ) {
          excluirEnt(kind, nome);
        }
      };
    }
    if (kind === "grupo") {
      const col = document.createElement("input");
      col.type = "color";
      col.className = "gcolor";
      col.value = hex6(ent.cor);
      col.oninput = () => {
        ent.cor = col.value;
        marcarAlterado();
        render();
      };
      row.appendChild(col);
    }
    row.appendChild(inp);
    row.appendChild(dos);
    if (del) row.appendChild(del);
    box.appendChild(row);
  });
}
function hex6(c) {
  c = (c || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c))
    return (
      "#" +
      c
        .slice(1)
        .split("")
        .map((x) => x + x)
        .join("")
    );
  return "#8888aa";
}
function _lin(v) {
  v /= 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function corContraste(hex) {
  hex = hex6(hex);
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16),
    guard = 0;
  function L() {
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b);
  }
  while (L() > 0.22 && guard < 16) {
    r = Math.round(r * 0.84);
    g = Math.round(g * 0.84);
    b = Math.round(b * 0.84);
    guard++;
  }
  return (
    "#" +
    [r, g, b]
      .map(function (x) {
        return x.toString(16).padStart(2, "0");
      })
      .join("")
  );
}
function addSala() {
  addEnt("sala", "add-sala");
}
function addPessoa() {
  addEnt("pessoa", "add-pessoa");
}
function addGrupo() {
  const el = document.getElementById("add-grupo");
  const nv = ((el && el.value) || "").trim();
  if (!nv) return;
  if (acharEnt(DADOS.grupos, nv)) {
    alert("Já existe um grupo com esse nome.");
    return;
  }
  DADOS.grupos.push({
    nome: nv,
    cor: _corHash(nv),
    imagem: "",
    descricao: "",
    fatos: [],
    notas: "",
  });
  el.value = "";
  marcarAlterado();
  rebuildFilters();
  render();
  renderGestao();
}
function addEnt(kind, inputId) {
  const i = document.getElementById(inputId);
  const v = i.value.trim();
  if (!v) return;
  const arr = entListaDe(kind);
  if (!acharEnt(arr, v))
    arr.push({ nome: v, imagem: "", descricao: "", fatos: [], notas: "" });
  i.value = "";
  marcarAlterado();
  rebuildFilters();
  render();
  renderGestao();
}
function renomearEnt(kind, o, nv) {
  const arr = entListaDe(kind);
  const e = acharEnt(arr, o);
  if (!e) return;
  if (nv !== o && acharEnt(arr, nv)) {
    alert("Ja existe um item com esse nome.");
    renderGestao();
    return;
  }
  e.nome = nv;
  fichas.forEach((f) => {
    if (kind === "sala" && f.sala === o) f.sala = nv;
    if (kind === "grupo")
      f.grupos = (f.grupos || []).map((x) => (x === o ? nv : x));
    if (kind === "colecao")
      f.colecoes = (f.colecoes || []).map((x) => (x === o ? nv : x));
    if (kind === "pessoa")
      f.personagens = (f.personagens || []).map((p) => (p === o ? nv : p));
  });
  marcarAlterado();
  rebuildFilters();
  render();
  renderGestao();
}
function excluirEnt(kind, o) {
  // Salas são do diretório compartilhado do jogo: nunca podem ser excluídas.
  if (kind === "sala") return;
  const arr = entListaDe(kind);
  const i = arr.findIndex((e) => e.nome === o);
  if (i < 0) return;
  arr.splice(i, 1);
  fichas.forEach((f) => {
    if (kind === "sala" && f.sala === o) f.sala = "";
    if (kind === "grupo") f.grupos = (f.grupos || []).filter((x) => x !== o);
    if (kind === "colecao")
      f.colecoes = (f.colecoes || []).filter((x) => x !== o);
    if (kind === "pessoa")
      f.personagens = (f.personagens || []).filter((p) => p !== o);
  });
  marcarAlterado();
  rebuildFilters();
  render();
  renderGestao();
}
function fillMescla() {
  const a = document.getElementById("mesclaPrin"),
    b = document.getElementById("mesclaSec");
  if (!a || !b) return;
  const nomes = [...DADOS.personagens]
    .map((e) => e.nome)
    .sort((x, y) => x.localeCompare(y));
  const opts = nomes
    .map((n) => `<option value="${esc(n)}">${esc(n)}</option>`)
    .join("");
  const va = a.value,
    vb = b.value;
  a.innerHTML = opts;
  b.innerHTML = opts;
  if (va && nomes.includes(va)) a.value = va;
  if (vb && nomes.includes(vb)) b.value = vb;
  if ((!b.value || b.value === a.value) && nomes.length > 1) {
    b.selectedIndex = a.selectedIndex === 0 ? 1 : 0;
  }
}
function mesclarPessoas(modo) {
  const a = document.getElementById("mesclaPrin"),
    b = document.getElementById("mesclaSec");
  if (!a || !b) return;
  const prin = a.value,
    sec = b.value;
  if (!prin || !sec) {
    alert("Escolha os dois nomes.");
    return;
  }
  if (prin === sec) {
    alert("Escolha dois nomes diferentes.");
    return;
  }
  const arr = DADOS.personagens;
  const eP = acharEnt(arr, prin),
    eS = acharEnt(arr, sec);
  if (!eP || !eS) {
    alert("Personagem não encontrado.");
    return;
  }
  const msg =
    modo === "alias"
      ? 'Tornar "' +
        sec +
        '" um pseudônimo de "' +
        prin +
        '"?\n\nOs dados e ligações de "' +
        sec +
        '" passam para "' +
        prin +
        '". As pistas continuam citando "' +
        sec +
        '", que passa a resolver para "' +
        prin +
        '".'
      : 'Juntar "' +
        sec +
        '" em "' +
        prin +
        '", mantendo apenas "' +
        prin +
        '"?\n\nTudo que usa "' +
        sec +
        '" passa a usar "' +
        prin +
        '", e o nome "' +
        sec +
        '" deixa de existir.';
  if (!confirm(msg)) return;
  // combinar dados (preencher vazios + somar fatos + juntar apelidos)
  if (!eP.descricao && eS.descricao) eP.descricao = eS.descricao;
  if (!eP.imagem && eS.imagem) eP.imagem = eS.imagem;
  if (eS.notas) eP.notas = eP.notas ? eP.notas + "\n" + eS.notas : eS.notas;
  const fa = (eP.fatos || []).slice(),
    setF = new Set(fa.map((x) => String(x).trim()));
  (eS.fatos || []).forEach((x) => {
    const k = String(x).trim();
    if (k && !setF.has(k)) {
      fa.push(x);
      setF.add(k);
    }
  });
  eP.fatos = fa;
  const al = new Set(eP.aliases || []);
  (eS.aliases || []).forEach((x) => al.add(x));
  if (modo === "alias") al.add(sec);
  al.delete(prin);
  // ligações nas fichas
  if (modo === "full") {
    fichas.forEach((f) => {
      if ((f.personagens || []).includes(sec)) {
        const m = f.personagens.map((p) => (p === sec ? prin : p));
        f.personagens = m.filter((p, i) => m.indexOf(p) === i);
      }
    });
    al.delete(sec);
  }
  eP.aliases = [...al];
  // remover a entidade absorvida (no modo alias as citações permanecem como o apelido)
  const i = arr.findIndex((e) => e.nome === sec);
  if (i >= 0) arr.splice(i, 1);
  marcarAlterado();
  rebuildFilters();
  render();
  renderGestao();
  alert(
    modo === "alias"
      ? '"' + sec + '" agora é pseudônimo de "' + prin + '".'
      : '"' + sec + '" foi juntado em "' + prin + '".',
  );
}

/* ---- render principal ---- */
/* ---- dossie de entidades (salas/personagens/livros) ---- */
function jsq(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
function iconKind(k) {
  return k === "sala"
    ? "🚪"
    : k === "grupo"
      ? "📦"
      : k === "colecao"
        ? "📚"
        : "👤";
}
function colEmoji(t) {
  return t === "livro"
    ? "📖"
    : t === "quadros"
      ? "🖼️"
      : t === "cor"
        ? "🎨"
        : "📚";
}
function corKind(k) {
  return k === "sala"
    ? COR_SALA
    : k === "grupo"
      ? COR_LIVRO
      : k === "colecao"
        ? COR_LIVRO
        : COR_PESSOA;
}
function rotKind(k) {
  return k === "sala"
    ? "Sala"
    : k === "grupo"
      ? "Grupo"
      : k === "colecao"
        ? "Coleção"
        : "Personagem";
}
function persByName(nome) {
  return (
    (DADOS.personagens || []).find((e) => (e.aliases || []).includes(nome)) ||
    (DADOS.personagens || []).find((e) => e.nome === nome)
  );
}
function nomeCanon(nome) {
  const e = persByName(nome);
  return e ? e.nome : nome;
}
function ehAliasPessoa(nome) {
  return (DADOS.personagens || []).some((o) =>
    (o.aliases || []).includes(nome),
  );
}
function pistasQueCitam(kind, nome) {
  return fichas.filter((f) =>
    kind === "sala"
      ? f.sala === nome
      : kind === "grupo"
        ? (f.grupos || []).includes(nome)
        : kind === "colecao"
          ? (f.colecoes || []).includes(nome)
          : (f.personagens || []).some(
              (pp) => nomeCanon(pp) === nomeCanon(nome),
            ),
  );
}
function _temMencao(txt, nome) {
  if (!txt || !nome || nome.length < 2) return false;
  const t = String(txt).toLowerCase(),
    n = nome.toLowerCase();
  let i = t.indexOf(n);
  while (i >= 0) {
    const b = i === 0 ? " " : t[i - 1];
    const a = i + n.length >= t.length ? " " : t[i + n.length];
    if (!/[\wÀ-ÿ]/.test(b) && !/[\wÀ-ÿ]/.test(a)) return true;
    i = t.indexOf(n, i + 1);
  }
  return false;
}
function mencionaTexto(f, nome) {
  const alts = [nome].concat((persByName(nome) || {}).aliases || []);
  return alts.some((a) => [f.titulo, txtAll(f)].some((t) => _temMencao(t, a)));
}
function rotDiretas(kind) {
  return kind === "sala"
    ? "Encontradas nesta sala"
    : kind === "grupo"
      ? "Pistas deste grupo"
      : kind === "colecao"
        ? "Pistas desta coleção"
        : "Fichas marcadas com este personagem";
}
function autoCount(f) {
  return (
    (f.sala ? 1 : 0) + (f.grupos || []).length + (f.personagens || []).length
  );
}
function autoChip(kind, ic, nome, fid, cls, cor) {
  const style = cor ? ` style="background:${cor};color:#fff"` : "";
  return `<span class="t auto ${cls || ""}"${style}>${ic}<button class="t-abrir" onclick="abrirEntidade('${kind}','${jsq(nome)}')">${esc(nome)}</button> <button class="t-x" title="Remover vínculo" aria-label="Remover vínculo com ${esc(nome)}" onclick="desautoFicha('${fid}','${kind}','${jsq(nome)}')">✕</button></span>`;
}
function autosFichaHTML(f) {
  const chips = [];
  if (f.sala) chips.push(autoChip("sala","",f.sala,f.id,"sala"));
  (f.grupos || []).forEach(function (gn) {
    var g = grupoObj(gn);
    chips.push(
      autoChip("grupo","",
        gn,
        f.id,
        "",
        corContraste((g && g.cor) || "#5b6b86"),
      ),
    );
  });
  (f.personagens || []).forEach(function (pp) {
    chips.push(autoChip("pessoa","",pp,f.id,"pessoa"));
  });
  return chips.length
    ? '<span class="taglist">' + chips.join("") + "</span>"
    : "<span class='gvazio'>(nenhuma)</span>";
}
function desautoFicha(fid, kind, val) {
  const f = fichas.find(function (x) {
    return x.id === fid;
  });
  if (!f) return;
  if (
    !confirm(
      'Remover o vínculo automático com "' +
        val +
        '"?\nO dado é retirado desta pista (ela deixa de aparecer ligada no mapa).',
    )
  )
    return;
  if (kind === "sala") {
    f.sala = "";
  } else if (kind === "grupo") {
    f.grupos = (f.grupos || []).filter(function (g) {
      return g !== val;
    });
  } else if (kind === "pessoa") {
    f.personagens = (f.personagens || []).filter(function (x) {
      return x !== val;
    });
  }
  marcarAlterado();
  render();
  abrir(fid);
}
function tagPistasAuto(arr, kind, nome) {
  return arr.length
    ? '<span class="taglist">' +
        arr
          .map(function (f) {
            return (
              '<span class="t conx auto"><span style="cursor:pointer" onclick="abrir(\'' +
              f.id +
              "')\">" +
              esc(f.titulo) +
              "</span>" +
              (f.sala
                ? ' <small style="opacity:.6">· ' + esc(f.sala) + "</small>"
                : "") +
              ' <b title="Remover vínculo" onclick="desautoEnt(\'' +
              f.id +
              "','" +
              kind +
              "','" +
              jsq(nome) +
              "')\">✕</b></span>"
            );
          })
          .join("") +
        "</span>"
    : "<span class='gvazio'>(nenhuma)</span>";
}
function desautoEnt(fid, kind, nomeEnt) {
  const f = fichas.find(function (x) {
    return x.id === fid;
  });
  if (!f) return;
  if (
    !confirm('Remover o vínculo automático desta pista com "' + nomeEnt + '"?')
  )
    return;
  if (kind === "sala") {
    if (f.sala === nomeEnt) f.sala = "";
  } else if (kind === "grupo") {
    f.grupos = (f.grupos || []).filter(function (g) {
      return g !== nomeEnt;
    });
  } else if (kind === "pessoa") {
    f.personagens = (f.personagens || []).filter(function (pp) {
      return nomeCanon(pp) !== nomeCanon(nomeEnt);
    });
  }
  marcarAlterado();
  render();
  reabrirEnt();
}
function tagPistas(arr) {
  return arr.length
    ? `<span class="taglist">${arr.map((f) => `<span class="t conx" onclick="abrir('${f.id}')">${esc(f.titulo)}${f.sala && f.sala !== "" ? ` <small style="opacity:.6">· ${esc(f.sala)}</small>` : ""}</span>`).join("")}</span>`
    : "<span class='gvazio'>(nenhuma)</span>";
}
// Dossiê de uma SALA: mostra os dados do JOGO (compartilhados), com EN e PT.
// As características vão numa grade "tabela invisível": até 3 por coluna,
// depois seguem na coluna ao lado.
function salaDossieJogo(e) {
  const itens = [];
  if (e.num) itens.push(["Nº", String(e.num)]);
  const cat = (e.categorias || []).join(", ");
  if (cat) itens.push(["Categoria", cat]);
  const rar = e.raridade_pt || e.raridade;
  if (rar) itens.push(["Raridade", rar]);
  if (e.custo_pt) itens.push(["Custo", e.custo_pt]);
  const tip = e.tipo_pt || e.tipo;
  if (tip) itens.push(["Tipo", tip]);
  let html = "";
  if (itens.length) {
    html +=
      `<div class="sala-caract">` +
      itens
        .map(
          ([l, v]) =>
            `<div class="sc-item"><span class="sc-lab">${esc(l)}</span><span class="sc-val">${esc(v)}</span></div>`,
        )
        .join("") +
      `</div>`;
  }
  const dPt = e.descricao_pt || e.descricao;
  if (dPt) html += field("Descrição (PT)", esc(dPt));
  if (e.descricao_en) html += field("Description (EN)", esc(e.descricao_en));
  if (e.efeito) html += field("Efeito", esc(e.efeito));
  return html;
}
// Edição inline dos campos PESSOAIS da sala (fatos/notas), direto no dossiê.
// Não re-renderiza (não perde o foco); só atualiza os dados e salva.
function salaEditInline() {
  if (!_entAtual || _entAtual.kind !== "sala") return;
  const s = acharEnt(DADOS.salas, _entAtual.nome);
  if (!s) return;
  const ft = document.getElementById("sala-fatos");
  const nt = document.getElementById("sala-notas");
  if (ft)
    s.fatos = ft.value
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  if (nt) s.notas = nt.value;
  marcarAlterado();
}
let _entAtual = null;
function abrirEntidade(kind, nome) {
  const e = acharEnt(entListaDe(kind), nome);
  if (!e) return;
  _entAtual = { kind, nome };
  const diretas = pistasQueCitam(kind, nome);
  const idsDir = new Set(diretas.map((f) => f.id));
  const mencoes = fichas.filter(
    (f) => !idsDir.has(f.id) && mencionaTexto(f, nome),
  );
  const d = document.getElementById("drawer");
  // Salas do diretório: sem "Editar dossiê" nem "Excluir" (não se apaga sala).
  const ehSala = kind === "sala";
  const acoesHtml =
    (ehSala ? "" : `<button class="dbtn" onclick="editarEntidade()">Editar dossiê</button>`) +
    `<button class="dbtn" onclick="focarEnt('${kind}','${jsq(nome)}')">Ver no mapa</button>` +
    (kind === "colecao" && e.ordenada ? `<button class="dbtn" onclick="abrirLeitor('${jsq(nome)}')">Folhear</button>` : "") +
    (kind === "pessoa" && window.IA && window.IA.personasProcessar && pistasQueCitam("pessoa", nome).length ? `<button class="dbtn" onclick="window.IA.personasProcessar(['${jsq(nome)}'], true)" title="A IA (re)escreve a Descrição a partir de todas as pistas que citam este personagem">Gerar descrição (IA)</button>` : "") +
    (ehSala ? `<button class="dbtn" onclick="rebloquearSala('${jsq(nome)}')" title="Voltar esta sala para o estado desconhecido">Re-bloquear</button>` : "");
  // Sala: fatos e notas EDITÁVEIS direto no dossiê (sem tela de edição separada).
  const pessoalHtml = ehSala
    ? `<div class="field"><div class="lab">Fatos conhecidos <small style="opacity:.55">(um por linha)</small></div><textarea id="sala-fatos" class="edinput edarea" placeholder="Anote fatos desta sala…" onchange="salaEditInline()">${esc((e.fatos || []).join("\n"))}</textarea></div>
      <div class="field"><div class="lab">Notas</div><textarea id="sala-notas" class="edinput edarea" placeholder="Suas anotações pessoais…" onchange="salaEditInline()">${esc(e.notas || "")}</textarea></div>`
    : field("Fatos conhecidos", e.fatos && e.fatos.length ? `<ul class="fatos">${e.fatos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "<span class='gvazio'>(nenhum ainda)</span>") +
      (e.notas ? field("Notas", esc(e.notas)) : "");
  d.innerHTML = `
    <div class="dh">
      <div class="dh-top">
        <span class="doskicker" style="color:${corKind(kind)}">DOSSIÊ · ${rotKind(kind).toUpperCase()}</span>
        <div class="dgrow"></div>
        <button class="close" onclick="fechar()" title="Fechar">✕</button>
      </div>
      <h2 class="dtit">${esc(nome)}</h2>
      <div class="dactions">${acoesHtml}</div>
    </div>
    <div class="db">
      ${e.imagem ? `<img src="${esc(ehSala ? thumbSala(e.imagem, 640) : e.imagem)}" alt="${esc(nome)}" onerror="if(this.dataset.f){this.style.display='none'}else{this.dataset.f=1;this.src='${jsq(e.imagem)}'}">` : ""}
      ${ehSala ? salaDossieJogo(e) : e.descricao ? field("Descrição", esc(e.descricao)) : ""}
      ${kind === "pessoa" && (e.aliases || []).length ? field("Também conhecido como", '<span class="taglist">' + (e.aliases || []).map((a) => '<span class=\"t pessoa\">' + esc(a) + "</span>").join("") + "</span>") : ""}
      ${pessoalHtml}
      ${field(rotDiretas(kind) + " (" + diretas.length + ")", tagPistasAuto(diretas, kind, nome))}
      ${field("Mencionam em outro lugar (" + mencoes.length + ")", tagPistas(mencoes))}
    </div>
    <div class="dfoot">
      ${ehSala ? "" : `<button class="dbtn primary" onclick="editarEntidade()">Editar</button>`}
      <button class="dbtn${ehSala ? " primary" : ""}" onclick="focarEnt('${kind}','${jsq(nome)}')">Ver no mapa</button>
      <button class="dbtn" onclick="entMais()" aria-haspopup="dialog">Mais ▾</button>
    </div>`;
  drawerAbrir();
}
/* Mobile: ações extras do dossiê (Folhear, IA, Re-bloquear…) na folha de
   ações — o rodapé mostra só as frequentes. */
function entMais() {
  if (!_entAtual) return;
  const kind = _entAtual.kind,
    nome = _entAtual.nome;
  const e = acharEnt(entListaDe(kind), nome);
  if (!e) return;
  abrirSheetAcoes(nome, [
    kind === "colecao" && e.ordenada
      ? { rotulo: "Folhear", fn: () => abrirLeitor(nome) }
      : null,
    kind === "pessoa" &&
    window.IA &&
    window.IA.personasProcessar &&
    pistasQueCitam("pessoa", nome).length
      ? {
          rotulo: "Gerar descrição (IA)",
          fn: () => window.IA.personasProcessar([nome], true),
        }
      : null,
    kind === "sala"
      ? {
          rotulo: "Re-bloquear sala",
          perigo: true,
          fn: () => rebloquearSala(nome),
        }
      : null,
  ].filter(Boolean));
}
function reabrirEnt() {
  if (_entAtual) abrirEntidade(_entAtual.kind, _entAtual.nome);
}
function editarEntidade() {
  if (!_entAtual) return;
  const kind = _entAtual.kind,
    nome = _entAtual.nome;
  const e = acharEnt(entListaDe(kind), nome);
  if (!e) return;
  const d = document.getElementById("drawer");
  d.innerHTML = `
    <div class="dh">
      <button class="close" onclick="reabrirEnt()">✕</button>
      <div class="tipo">✏️ Editando ${rotKind(kind).toLowerCase()}</div>
      <h2>${esc(nome)}</h2>
    </div>
    <div class="db">
      ${kind === "sala" ? "" : edCampo("Nome", "entnome", e.nome)}
      ${kind === "grupo" ? '<div class="field"><div class="lab">Cor do grupo</div><input type="color" id="ed-entcor" class="gcolor" value="' + hex6(e.cor) + '"></div>' : ""}
      ${kind === "sala" ? "" : edCampo("Imagem (ou anexe abaixo)", "entimg", e.imagem)}
      ${kind === "sala" ? "" : `<div class="field"><button type="button" class="dbtn attachbtn" onclick="escolherImagem('ed-entimg','ed-entimgprev')">📎 Anexar imagem do computador</button><img id="ed-entimgprev" class="imgprev" ${e.imagem ? 'src="' + esc(e.imagem) + '"' : 'style="display:none"'} onerror="this.style.display='none'"></div>`}
      ${kind === "pessoa" ? chipField("Apelidos / pseudônimos", "entalias", e.aliases || [], "pessoa") : ""}
      ${kind === "sala" ? '<div class="field"><div class="lab">Dados do jogo (compartilhados)</div><p class="dica">Nome, descrição, imagem e características vêm do <b>diretório compartilhado</b> e são iguais para todos — não são editáveis aqui. Anote seus <b>fatos</b> e <b>notas</b> pessoais abaixo.</p></div>' : edArea("Descrição", "entdesc", e.descricao)}
      ${edArea("Fatos conhecidos (um por linha)", "entfatos", (e.fatos || []).join("\n"))}
      ${edArea("Notas", "entnotas", e.notas)}
      <div class="editbtns">
        <button class="dbtn save" onclick="salvarEntidade()">✓ Aplicar</button>
        <button class="dbtn" onclick="reabrirEnt()">Cancelar</button>
        <button class="dbtn del" onclick="excluirEntPainel()">🗑 Excluir</button>
      </div>
    </div>`;
  drawerAbrir();
  initChipFields();
}
function salvarEntidade() {
  if (!_entAtual) return;
  const kind = _entAtual.kind,
    nome = _entAtual.nome;
  // Devolve null quando o campo NÃO está no formulário (ex.: salas escondem os
  // campos do jogo) — assim não sobrescrevemos com vazio o que veio do diretório.
  const g = (k) => {
    const el = document.getElementById("ed-" + k);
    return el ? el.value : null;
  };
  let novo = ((g("entnome") || nome).trim()) || nome;
  if (novo !== nome) renomearEnt(kind, nome, novo);
  const e = acharEnt(entListaDe(kind), novo);
  if (!e) {
    _entAtual = null;
    return;
  }
  const imgv = g("entimg");
  if (imgv !== null) e.imagem = imgv.trim();
  const descv = g("entdesc");
  if (descv !== null) e.descricao = descv;
  e.fatos = (g("entfatos") || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const notasv = g("entnotas");
  if (notasv !== null) e.notas = notasv;
  if (kind === "pessoa") {
    e.aliases = g("entalias")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (kind === "grupo") {
    var _c = document.getElementById("ed-entcor");
    if (_c) e.cor = _c.value;
  }
  _entAtual = { kind, nome: novo };
  marcarAlterado();
  render();
  abrirEntidade(kind, novo);
}
function excluirEntPainel() {
  if (!_entAtual) return;
  const kind = _entAtual.kind,
    nome = _entAtual.nome;
  // Salas são do diretório compartilhado do jogo: não podem ser excluídas.
  if (kind === "sala") {
    alert("As salas fazem parte do diretório do jogo e não podem ser excluídas.");
    return;
  }
  if (!confirm('Excluir o dossiê de "' + nome + '" e desvincular das fichas?'))
    return;
  excluirEnt(kind, nome);
  _entAtual = null;
  fechar();
}
function renderMundo() {
  const box = document.getElementById("mundo");
  if (!box) return;
  // As SALAS não entram aqui: têm o Diretório próprio (dados do jogo, no Supabase).
  // A aba Mundo mostra só Personagens e Grupos (dossiês pessoais).
  const secs = [
    ["pessoa", "Personagens", DADOS.personagens],
    ["grupo", "Grupos", DADOS.grupos],
  ];
  box.innerHTML = secs
    .map(function (sec) {
      const kind = sec[0],
        titulo = sec[1],
        arr = sec[2];
      const lista =
        kind === "pessoa" ? arr.filter((e) => !ehAliasPessoa(e.nome)) : arr;
      const cards =
        [...lista]
          .sort((a, b) => (a.nome < b.nome ? -1 : 1))
          .map((e) => {
            const n = pistasQueCitam(kind, e.nome).length;
            const resumo = e.descricao || (e.fatos && e.fatos[0]) || "";
            return `<div class="card" style="border-left-color:${corKind(kind)}" onclick="abrirEntidade('${kind}','${jsq(e.nome)}')">
        ${e.imagem ? `<div class="thumbwrap"><img class="thumb" src="${esc(e.imagem)}" onerror="var w=this.closest('.thumbwrap');if(w)w.remove()"></div>` : ""}
        <h3>${esc(e.nome)}</h3>
        ${resumo ? `<div class="excerpt">${esc(resumo)}</div>` : ""}
        <div class="meta"><span class="pill">🔗 ${n} pista(s)</span>${e.fatos && e.fatos.length ? `<span class="pill">📌 ${e.fatos.length} fato(s)</span>` : ""}</div>
      </div>`;
          })
          .join("") || '<div class="gvazio">(nenhum ainda)</div>';
      // IA: botão para descrever os personagens elegíveis (nunca descritos ou
      // com pista nova citando desde a última descrição).
      let btnIA = "";
      if (kind === "pessoa" && window.IA && window.IA.personasElegiveis) {
        const nEleg = window.IA.personasElegiveis().length;
        if (nEleg > 0)
          btnIA = ` <button class="topbtn" style="margin-left:10px;vertical-align:middle" onclick="iaPersonasTodos()" title="A IA escreve a descrição de cada personagem elegível a partir de TODAS as pistas que o citam (um por vez)">✨ Descrever personagens (${nEleg})</button>`;
      }
      return `<div class="msec"><h2 class="msech">${iconKind(kind)} ${titulo} <span class="msecn">${lista.length}</span>${btnIA}</h2><div class="mgrid">${cards}</div></div>`;
    })
    .join("");
}
function iaPersonasTodos() {
  if (window.IA && window.IA.personasProcessar) window.IA.personasProcessar();
}
function buildMapToggles() {
  const box = document.getElementById("maptoggles");
  if (!box) return;
  const defs = [
    ["pessoa", "Personagens", COR_PESSOA],
    ["sala", "Salas", "#6fa8c0"],
    ["grupo", "Grupos", "#c9a35c"],
    ["manual", "Fios manuais", COR_MANUAL],
  ];
  box.innerHTML = "";
  defs.forEach(function (dd) {
    const k = dd[0],
      lab = dd[1],
      cor = dd[2];
    const c = document.createElement("button");
    c.type = "button";
    c.className = "mtog" + (mapLayers[k] ? " on" : "");
    c.title = "Mostrar/ocultar " + lab + " no mapa";
    c.setAttribute("aria-pressed", mapLayers[k] ? "true" : "false");
    c.innerHTML =
      (k === "manual"
        ? `<span class="ln" style="border-top:2px solid ${cor}"></span>`
        : `<span class="dot" style="background:${cor}"></span>`) +
      lab +
      `<span class="chk">✓</span>`;
    c.onclick = () => {
      mapLayers[k] = !mapLayers[k];
      mapaSoftRefresh();
    };
    box.appendChild(c);
  });
}
function toggleFiltros() {
  const pn = document.getElementById("filtrosPanel");
  if (!pn) return;
  // No compacto vira bottom sheet MODAL (fundo inerte, foco preso, Voltar
  // fecha) que sobe animado, desce arrastando pela alça e fecha tocando no
  // fundo escurecido; no desktop segue como painel inline (Escape/Voltar).
  if (pn.classList.contains("open")) {
    overlayFechar("filtrosPanel");
    return;
  }
  fSheetWire(pn);
  if (ehCompacto()) fSheetFundo(true);
  overlayAbrir(pn, {
    id: "filtrosPanel",
    modal: ehCompacto(),
    focoEm: "#fsala",
    fechar: function () {
      fSheetFechaAnim(pn);
    },
  });
}
/* Fundo escurecido da folha de filtros: tocar nele fecha a folha */
function fSheetFundo(liga) {
  let bd = document.getElementById("sheetFundo");
  if (!bd) {
    if (!liga) return;
    bd = document.createElement("div");
    bd.id = "sheetFundo";
    bd.className = "sheet-fundo";
    bd.onclick = function () {
      overlayFechar("filtrosPanel");
    };
    document.body.appendChild(bd);
  }
  if (liga)
    requestAnimationFrame(function () {
      bd.classList.add("on");
    });
  else bd.classList.remove("on");
}
/* Fecha a folha DESCENDO — vale para Aplicar, Voltar, Escape e toque fora */
function fSheetFechaAnim(pn) {
  fSheetFundo(false);
  if (!ehCompacto()) {
    pn.classList.remove("open");
    return;
  }
  pn.style.transition = "transform 0.22s ease-in";
  pn.style.transform = "translateY(110%)";
  setTimeout(function () {
    pn.classList.remove("open");
    pn.style.transition = "";
    pn.style.transform = "";
  }, 230);
}
/* Arrastar a folha pela alça/cabeçalho: segue o dedo; soltar longe (ou
   rápido) fecha, soltar perto volta com mola */
function fSheetWire(pn) {
  if (pn._sheetWired) return;
  pn._sheetWired = true;
  let st = null;
  function volta() {
    pn.style.transition = "transform 0.2s ease";
    pn.style.transform = "";
    setTimeout(function () {
      pn.style.transition = "";
    }, 220);
  }
  function down(e) {
    if (!ehCompacto() || !pn.classList.contains("open")) return;
    // Toque nos botões do cabeçalho (limpar) segue o fluxo normal
    if (e.target.closest && e.target.closest("button")) return;
    st = { y0: e.clientY, t0: Date.now(), dy: 0 };
    pn.style.transition = "none";
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    e.preventDefault();
  }
  function move(e) {
    if (!st) return;
    st.dy = Math.max(0, e.clientY - st.y0);
    pn.style.transform = st.dy ? "translateY(" + st.dy + "px)" : "";
  }
  function up() {
    if (!st) return;
    const rapido = st.dy / Math.max(1, Date.now() - st.t0) > 0.5;
    const fecha = st.dy > 110 || (st.dy > 30 && rapido);
    st = null;
    pn.style.transition = "";
    if (fecha) overlayFechar("filtrosPanel");
    else volta();
  }
  function cancel() {
    if (!st) return;
    st = null;
    volta();
  }
  [".sheet-grip", ".sheet-head"].forEach(function (s) {
    const el = pn.querySelector(s);
    if (!el) return;
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", cancel);
  });
}
function toggleSelMode() {
  state.selMode = !state.selMode;
  state.sel.clear();
  const b = document.getElementById("btnSel");
  if (b) b.classList.toggle("on", state.selMode);
  render();
}
function toggleSel(id) {
  if (state.sel.has(id)) state.sel.delete(id);
  else state.sel.add(id);
  render();
}
function selecionarVisiveis() {
  fichas.filter(passa).forEach((f) => state.sel.add(f.id));
  render();
}
function excluirSelecionadas() {
  const ids = [...state.sel];
  if (!ids.length) {
    alert("Nenhuma ficha selecionada.");
    return;
  }
  if (
    !confirm(
      "Excluir " +
        ids.length +
        " ficha(s) selecionada(s)?\n\nA exclusao vale ao salvar o dados.js.",
    )
  )
    return;
  for (let i = fichas.length - 1; i >= 0; i--) {
    if (state.sel.has(fichas[i].id)) fichas.splice(i, 1);
  }
  state.sel.clear();
  state.selMode = false;
  const b = document.getElementById("btnSel");
  if (b) b.classList.remove("on");
  marcarAlterado();
  rebuildFilters();
  render();
}
// IA em massa: botões (só fazem algo quando a camada de IA está carregada)
function iaLotePendentes() {
  if (!window.IA || !window.IA.processarLote) return;
  window.IA.processarLote(fichas.filter((f) => f.pendente).map((f) => f.id));
}
function iaLoteSelecionadas() {
  if (!window.IA || !window.IA.processarLote) return;
  window.IA.processarLote([...state.sel]);
}
// Mostra/esconde o botão "✨ Processar pendentes (N)" da topbar.
function atualizarBtnIaLote() {
  const b = document.getElementById("btnIaLote");
  if (!b) return;
  const n = fichas.filter((f) => f.pendente).length;
  const mostrar = !!(window.IA && window.IA.processarLote && n > 0);
  b.style.display = mostrar ? "" : "none";
  if (mostrar) b.textContent = "✨ Processar pendentes (" + n + ")";
}
function atualizarSelBar() {
  atualizarBtnIaLote();
  const bar = document.getElementById("selbar");
  if (!bar) return;
  const ativo = state.selMode && state.view === "grade";
  const g = document.getElementById("grade");
  if (g) g.classList.toggle("selmode", ativo);
  if (!ativo) {
    bar.classList.remove("on");
    bar.innerHTML = "";
    return;
  }
  bar.classList.add("on");
  const n = state.sel.size,
    vis = fichas.filter(passa).length;
  const btnIA =
    window.IA && window.IA.processarLote && n > 0
      ? `<button class="topbtn" onclick="iaLoteSelecionadas()">Processar selecionadas</button>`
      : "";
  bar.innerHTML = `<span class="selchk">✓</span><span class="cnt">${n} selecionada${n === 1 ? "" : "s"}</span>
    <button class="topbtn" onclick="selecionarVisiveis()">Selecionar visíveis (${vis})</button>
    <span class="grow"></span>
    ${btnIA}
    ${n > 0 ? `<button class="topbtn" onclick="selAddAoQuadro()">Adicionar ao quadro</button>` : ""}
    <button class="seldel" onclick="excluirSelecionadas()">Excluir</button>
    <button class="topbtn plain" onclick="toggleSelMode()">Cancelar</button>`;
}
/* Seleção múltipla → manda todas para o quadro atual */
function selAddAoQuadro() {
  const ids = [...state.sel];
  if (!ids.length) return;
  ids.forEach((id) => addAoQuadro(id));
  toggleSelMode();
}
function limparBusca() {
  const i = document.getElementById("busca");
  if (i) i.value = "";
  state.busca = "";
  render();
}
function limparFiltros() {
  state.sala = "";
  state.pessoa = "";
  state.busca = "";
  state.incompletas = false;
  state.pendentes = false;
  state.orfas = false;
  state.favoritas = false;
  state.grupo = "";
  const b = document.getElementById("busca");
  if (b) b.value = "";
  try {
    fsala.value = "";
    fpessoa.value = "";
    fgrupo.value = "";
  } catch (e) {}
  buildChips();
  render();
}
function atualizarContador() {
  const el = document.getElementById("contador");
  const n = fichas.filter(passa).length;
  if (el) el.textContent = n + (n === 1 ? " ficha" : " fichas");
  // Estatísticas viram filtros clicáveis no cabeçalho (decisão do handoff)
  const st = document.getElementById("areaStats");
  if (!st) return;
  const pend = fichas.filter((f) => f.pendente).length;
  const inc = fichas.filter((f) => fichaIncompleta(f).length).length;
  const orf = fichas.filter(
    (f) =>
      (f.conexoes || []).length === 0 &&
      !f.sala &&
      !(f.personagens || []).length &&
      !(f.grupos || []).length,
  ).length;
  const tot = fichas.length;
  const parte = [];
  parte.push(tot + (tot === 1 ? " ficha" : " fichas"));
  if (pend)
    parte.push(
      `<span class="stat-link gold" onclick="state.pendentes=true;render()">${pend} pendente${pend > 1 ? "s" : ""}</span>`,
    );
  if (inc)
    parte.push(
      `<span class="stat-link red" onclick="state.incompletas=true;render()">${inc} incompleta${inc > 1 ? "s" : ""}</span>`,
    );
  if (orf)
    parte.push(
      `<span class="stat-link" onclick="state.orfas=true;render()">${orf} sem conexão</span>`,
    );
  st.innerHTML = parte.join(" · ");
}
function atualizarBtnFiltros() {
  const n =
    (state.sala ? 1 : 0) +
    (state.pessoa ? 1 : 0) +
    (state.incompletas ? 1 : 0) +
    (state.pendentes ? 1 : 0) +
    (state.orfas ? 1 : 0) +
    (state.favoritas ? 1 : 0) +
    (state.grupo ? 1 : 0);
  const b = document.getElementById("btnFiltros");
  if (b) {
    b.classList.toggle("hasfilters", n > 0);
    // Ícone (só aparece no celular) + rótulo (só no desktop) + contagem
    b.innerHTML =
      '<svg class="fic" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.2 3h11.6l-4.5 5.3v4.1l-2.6 1.3V8.3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path></svg>' +
      '<span class="btxt">Filtros</span>' +
      (n > 0 ? `<span class="fbadge">${n}</span>` : "");
  }
  const bi = document.getElementById("btnInc");
  if (bi) bi.classList.toggle("on", state.incompletas);
  const bp = document.getElementById("btnPend");
  if (bp) bp.classList.toggle("on", state.pendentes);
  const bo = document.getElementById("btnOrfas");
  if (bo) bo.classList.toggle("on", state.orfas);
  const bf = document.getElementById("btnFav");
  if (bf) bf.classList.toggle("on", state.favoritas);
}
function renderPills() {
  const box = document.getElementById("filtrosPills");
  if (!box) return;
  const pills = [];
  if (state.sala)
    pills.push({
      lab: "Sala: " + state.sala,
      rm: () => {
        state.sala = "";
        try {
          fsala.value = "";
        } catch (e) {}
      },
    });
  if (state.pessoa)
    pills.push({
      lab: "Personagem: " + state.pessoa,
      rm: () => {
        state.pessoa = "";
        try {
          fpessoa.value = "";
        } catch (e) {}
      },
    });
  if (state.grupo)
    pills.push({
      lab: "Grupo: " + state.grupo,
      rm: () => {
        state.grupo = "";
        try {
          fgrupo.value = "";
        } catch (e) {}
      },
    });
  if (state.incompletas)
    pills.push({
      lab: "Só incompletas",
      rm: () => {
        state.incompletas = false;
      },
    });
  if (state.pendentes)
    pills.push({
      lab: "Só não processadas",
      rm: () => {
        state.pendentes = false;
      },
    });
  if (state.orfas)
    pills.push({
      lab: "Sem conexão",
      rm: () => {
        state.orfas = false;
      },
    });
  if (state.favoritas)
    pills.push({
      lab: "Favoritas",
      rm: () => {
        state.favoritas = false;
      },
    });
  if (state.busca)
    pills.push({
      lab: 'Busca: "' + state.busca + '"',
      rm: () => {
        state.busca = "";
        const i = document.getElementById("busca");
        if (i) i.value = "";
      },
    });
  box.innerHTML = "";
  if (!pills.length) {
    box.style.display = "none";
    return;
  }
  box.style.display = "flex";
  pills.forEach((pp) => {
    const e = document.createElement("span");
    e.className = "fpill";
    e.innerHTML = esc(pp.lab) + " <b>✕</b>";
    e.onclick = () => {
      pp.rm();
      render();
    };
    box.appendChild(e);
  });
  const clr = document.createElement("button");
  clr.className = "fpill clr";
  clr.textContent = "Limpar tudo";
  clr.onclick = () => limparFiltros();
  box.appendChild(clr);
}
function atualizarBarra() {
  renderPills();
  atualizarContador();
  atualizarBtnFiltros();
  atualizarSelBar();
}
function setDirCat(c) {
  state.dirCat = c;
  renderDiretorio();
}
// Converte a URL pública de uma imagem do Supabase numa MINIATURA leve
// (endpoint de transformação -> WebP, ~8KB em vez de ~120KB). O navegador
// negocia WebP pelo header Accept. URLs que não são do Storage público
// (data:, web) voltam sem alteração. Só reduz o que a página das salas exibe.
function thumbSala(url, w) {
  if (typeof url !== "string") return url || "";
  var marca = "/storage/v1/object/public/";
  var i = url.indexOf(marca);
  if (i < 0) return url;
  var lado = w || 240;
  // Quadrado com resize=cover: o Supabase recorta o excesso mantendo a
  // proporção (sem distorcer). As artes das salas são bem altas — proporção
  // original deixava o card gigante; contain deixava faixas vazias.
  return (
    url.slice(0, i) +
    "/storage/v1/render/image/public/" +
    url.slice(i + marca.length) +
    "?width=" +
    lado +
    "&height=" +
    lado +
    "&resize=cover&quality=60"
  );
}
// Pré-carrega (em segundo plano) as miniaturas das salas já descobertas, para
// que a aba Diretório apareça pronta. Leve (~7KB cada) e com concorrência
// limitada para não dar pico de rede.
var _thumbsSalasPre = false;
function precarregarThumbsSalas() {
  if (_thumbsSalasPre || typeof Image === "undefined") return;
  _thumbsSalasPre = true;
  var urls = (DADOS.salas || [])
    .filter(function (s) {
      return s && s.descoberta !== false && s.imagem;
    })
    .map(function (s) {
      return thumbSala(s.imagem, 240);
    });
  var i = 0,
    CONC = 6;
  function proximo() {
    if (i >= urls.length) return;
    var im = new Image();
    im.onload = im.onerror = proximo;
    im.src = urls[i++];
  }
  for (var k = 0; k < CONC; k++) proximo();
}
function renderDiretorio() {
  const box = document.getElementById("diretorio");
  if (!box) return;
  const cats = [
    "Rooms 001-012",
    "Rooms 013-024",
    "Rooms 025-036",
    "Rooms 037-046",
    "Bedrooms",
    "Hallways",
    "Green Rooms",
    "Shops",
    "Red Rooms",
    "Found Floorplans",
    "Outer Rooms",
  ];
  const EXTRA = ["Found Floorplans", "Outer Rooms"];
  const catLabel = (c) => {
    if (EXTRA.includes(c)) {
      const tem = DADOS.salas.some(
        (s) => s.diretorio === c && s.descoberta !== false,
      );
      return tem ? c.toUpperCase() : "??????";
    }
    return c.toUpperCase();
  };
  const menu = cats
    .map(
      (c) =>
        `<button class="dirbtn${c === state.dirCat ? " active" : ""}" onclick="setDirCat('${c}')">${catLabel(c)}</button>`,
    )
    .join("");
  const lista = DADOS.salas
    .filter((s) => s.diretorio === state.dirCat)
    .sort(
      (a, b) => (a.num || 999) - (b.num || 999) || (a.nome < b.nome ? -1 : 1),
    );
  const tiles =
    lista
      .map((s) => {
        if (s.descoberta !== false) {
          // Miniatura leve (WebP ~8KB) via transformação do Supabase; se falhar
          // (ex.: limite do plano), o onerror cai na imagem cheia; e se essa
          // também falhar, a miniatura some.
          const thumb = s.imagem
            ? `<img loading="lazy" decoding="async" src="${esc(thumbSala(s.imagem, 200))}" onerror="if(this.dataset.f){this.style.display='none'}else{this.dataset.f=1;this.src='${jsq(s.imagem)}'}">`
            : "";
          return `<div class="dtile found" onclick="abrirEntidade('sala','${jsq(s.nome)}')" title="${esc(s.nome)}">
        <div class="dthumb">${thumb}</div>
        <div class="dname">${esc(s.nome)}</div></div>`;
        }
        return `<div class="dtile locked" style="cursor:pointer" title="Clique para descobrir esta sala" onclick="confirmarDescobrir('${jsq(s.nome)}')">${s.num ? `<span class="dnum">${s.num}</span>` : `<span class="dlock">🔒</span>`}</div>`;
      })
      .join("") || '<div class="gvazio">(sem salas nesta categoria)</div>';
  const total = lista.length,
    achadas = lista.filter((s) => s.descoberta !== false).length;
  box.innerHTML = `<div class="dirwrap">
    <div class="dirmenu"><div class="dirtitle">MOUNT HOLLY<br><b>DIRECTORY</b></div>${menu}</div>
    <div class="dircontent"><div class="dirhead">${catLabel(state.dirCat)} — ${achadas}/${total} descobertas</div><div class="dirgrid">${tiles}</div></div>
  </div>`;
}
/* ===== ARQUIVO (Salas · Personagens · Grupos) — área nova do redesign =====
   Une Mundo + Diretório + Gerenciar num só lugar, com dossiê lateral
   persistente. A lógica de dados é a mesma das funções legadas
   (renomearEnt, excluirEnt, mesclarPessoas, confirmarDescobrir…). */
if (!state.arqTab) state.arqTab = "salas";
var _arqSel = null; // {kind:'sala'|'pessoa'|'grupo', nome} — dossiê aberto
var _arqBusca = "";
const CORES_GRUPO_SUGERIDAS = [
  "#8d3030",
  "#b07a2e",
  "#2e7a54",
  "#3a5a8d",
  "#6a4a8d",
];
/* Salas no compacto: a lista de categorias é a PRIMEIRA tela; escolher uma
   abre a grade e o botão do topo traz a lista de volta. No desktop a lista
   fica sempre à esquerda e este estado não muda nada. */
var _arqCatsAberto = true;
function arqEscolherCat(c) {
  state.dirCat = c;
  _arqCatsAberto = false;
  renderArquivo();
}
function arqAbrirCats() {
  _arqCatsAberto = true;
  renderArquivo();
}
function setArqTab(t) {
  state.arqTab = t;
  _arqSel = null;
  if (t === "salas") _arqCatsAberto = true; // volta pela lista de categorias
  renderArquivo();
}
function arqAbrir(kind, nome) {
  _arqSel = { kind: kind, nome: nome };
  // No modo compacto o dossiê vira página cheia (mesma definição do CSS)
  if (ehCompacto()) {
    abrirEntidade(kind, nome);
    return;
  }
  renderArquivo();
}
function arqFecharDossie() {
  _arqSel = null;
  renderArquivo();
}
function arqBuscaInput(v) {
  _arqBusca = v || "";
  renderArquivo(true);
}
function novoEntArq(kind) {
  const nome = (prompt(kind === "grupo" ? "Nome do novo grupo:" : "Nome do novo personagem:") || "").trim();
  if (!nome) return;
  const arr = kind === "grupo" ? DADOS.grupos : DADOS.personagens;
  if (arr.some((e) => e.nome.toLowerCase() === nome.toLowerCase())) {
    toast("Já existe: " + nome);
    return;
  }
  arr.push(
    kind === "grupo" ? { nome: nome, cor: _corHash(nome) } : { nome: nome },
  );
  marcarAlterado();
  _arqSel = { kind: kind === "grupo" ? "grupo" : "pessoa", nome: nome };
  renderArquivo();
}
function arqRenomear(kind, nome) {
  const arr = entListaDe(kind);
  const o = acharEnt(arr, nome);
  if (!o) return;
  const nv = (prompt("Novo nome para “" + nome + "”:", nome) || "").trim();
  if (!nv || nv === nome) return;
  renomearEnt(kind, o, nv);
  _arqSel = { kind: kind, nome: nv };
  renderArquivo();
}
function arqExcluir(kind, nome) {
  const arr = entListaDe(kind);
  const o = acharEnt(arr, nome);
  if (!o) return;
  excluirEnt(kind, o);
  _arqSel = null;
  renderArquivo();
}
function arqCorGrupo(nome, cor) {
  const g = acharEnt(DADOS.grupos, nome);
  if (!g) return;
  g.cor = cor;
  marcarAlterado();
  renderArquivo();
}
function arqMesclar(nome) {
  // Reusa a ferramenta testada do modal Gerenciar: preenche os selects e chama
  const sec = (prompt(
    "“" + nome + "” é a mesma pessoa que… (digite o outro nome exatamente)",
  ) || "").trim();
  if (!sec) return;
  const outro = acharEnt(DADOS.personagens, sec);
  if (!outro) {
    toast("Personagem não encontrado: " + sec);
    return;
  }
  const modo = confirm(
    "OK = JUNTAR (citações de “" +
      sec +
      "” são reescritas para “" +
      nome +
      "” e “" +
      sec +
      "” deixa de existir).\nCancelar = tornar “" +
      sec +
      "” um PSEUDÔNIMO de “" +
      nome +
      "”.",
  )
    ? "full"
    : "alias";
  fillMescla();
  const p = document.getElementById("mesclaPrin"),
    s = document.getElementById("mesclaSec");
  if (!p || !s) return;
  p.value = nome;
  s.value = outro.nome;
  mesclarPessoas(modo);
  _arqSel = { kind: "pessoa", nome: nome };
  renderArquivo();
}
function _arqFichasDe(kind, nome) {
  return pistasQueCitam(kind, nome);
}
function _arqDossieHTML() {
  if (!_arqSel) return "";
  const kind = _arqSel.kind,
    nome = _arqSel.nome;
  const arr = entListaDe(kind);
  const e = acharEnt(arr, nome);
  if (!e) return "";
  const fichasDe = _arqFichasDe(kind, nome);
  const rowsFichas = fichasDe
    .slice(0, 8)
    .map(
      (f) =>
        `<div class="dosrow" onclick="abrir('${f.id}')"><span class="doscod">${esc(f.id)}</span><span class="dostit">${esc(f.titulo)}</span><span class="dosgo">›</span></div>`,
    )
    .join("");
  const fatos =
    e.fatos && e.fatos.length
      ? `<div class="dossec"><div class="doslab">FATOS ANOTADOS (${e.fatos.length})</div><div class="dosfatos">${e.fatos.map((x) => "· " + esc(x)).join("<br>")}</div></div>`
      : "";
  if (kind === "sala") {
    const desc = e.descoberta !== false;
    return `<aside class="arqdossie">
      <div class="doshead"><span class="doskicker">DOSSIÊ</span><button class="dosx" onclick="arqFecharDossie()" aria-label="Fechar dossiê">✕</button></div>
      <div><div class="dosnome">${esc(e.nome)}</div><div class="dosmeta">${e.num ? "Nº " + String(e.num).padStart(3, "0") + " · " : ""}${desc ? "descoberta" : "não descoberta"}</div></div>
      <div class="dosimg">${e.imagem ? `<img loading="lazy" src="${esc(thumbSala(e.imagem, 330))}" onerror="this.style.display='none'">` : `<span>planta / captura da sala</span>`}</div>
      <div class="dossec"><div class="doslab">FICHAS DESTA SALA (${fichasDe.length})</div>${rowsFichas || "<span class='gvazio'>(nenhuma)</span>"}</div>
      ${fatos}
      <button class="dosbtn ghost" onclick="abrirEntidade('sala','${jsq(e.nome)}')">Abrir dossiê completo</button>
      <button class="dosbtn gold" onclick="focarEnt('sala','${jsq(e.nome)}')">Ver no mapa de conexões</button>
    </aside>`;
  }
  if (kind === "pessoa") {
    return `<aside class="arqdossie">
      <div class="doshead"><span class="doskicker rosa">DOSSIÊ · PERSONAGEM</span><button class="dosx" onclick="arqFecharDossie()" aria-label="Fechar dossiê">✕</button></div>
      <div class="dosid"><span class="avatar-p">${esc((e.nome || "?")[0].toUpperCase())}</span><div class="dosnome">${esc(e.nome)}</div><button class="dosren" onclick="arqRenomear('pessoa','${jsq(e.nome)}')">renomear</button></div>
      ${e.descricao ? `<div class="dosdesc">${esc(e.descricao)}</div>` : ""}
      <div class="dossec"><div class="doslab">FICHAS QUE CITAM (${fichasDe.length})</div>${rowsFichas || "<span class='gvazio'>(nenhuma)</span>"}</div>
      ${fatos}
      <button class="dosbtn ghost" onclick="abrirEntidade('pessoa','${jsq(e.nome)}')">Abrir dossiê completo</button>
      <button class="dosbtn dashed" onclick="arqMesclar('${jsq(e.nome)}')">É a mesma pessoa que… (mesclar)</button>
    </aside>`;
  }
  // grupo
  const cor = e.cor || "#8d3030";
  const sw = CORES_GRUPO_SUGERIDAS.map(
    (c) =>
      `<span class="dossw${c === cor ? " on" : ""}" style="background:${c}" onclick="arqCorGrupo('${jsq(e.nome)}','${c}')"></span>`,
  ).join("");
  return `<aside class="arqdossie">
    <div class="doshead"><span class="doskicker">DOSSIÊ · GRUPO</span><button class="dosx" onclick="arqFecharDossie()" aria-label="Fechar dossiê">✕</button></div>
    <div class="dosid"><span class="dosswatch" style="background:${esc(cor)}"></span><div class="dosnome">${esc(e.nome)}</div><button class="dosren" onclick="arqRenomear('grupo','${jsq(e.nome)}')">renomear</button></div>
    <div class="dossec"><div class="doslab">COR DO GRUPO</div><div class="dossws">${sw}<label class="dossw custom" title="Cor personalizada" style="background:${esc(cor)}"><input type="color" value="${esc(hex6(cor))}" oninput="arqCorGrupo('${jsq(e.nome)}',this.value)">✎</label></div></div>
    <div class="dossec"><div class="doslab">FICHAS DO GRUPO (${fichasDe.length})</div>${rowsFichas || "<span class='gvazio'>(nenhuma)</span>"}</div>
    <button class="dosbtn danger" onclick="arqExcluir('grupo','${jsq(e.nome)}')">Excluir grupo…</button>
    <button class="dosbtn gold" onclick="focarEnt('grupo','${jsq(e.nome)}')">Ver no mapa de conexões</button>
  </aside>`;
}
function renderArquivo(soLista) {
  const box = document.getElementById("arquivo");
  if (!box) return;
  const q = _arqBusca.toLowerCase();
  const salasDesc = DADOS.salas.filter((s) => s.descoberta !== false).length;
  const pessoasVis = DADOS.personagens.filter((e) => !ehAliasPessoa(e.nome));
  const tab = (id, lab, n) =>
    `<button class="seg${state.arqTab === id ? " active" : ""}"${state.arqTab === id ? ' aria-current="true"' : ""} onclick="setArqTab('${id}')">${lab} <span class="segn">${n}</span></button>`;
  const tabs = `<div class="segtabs">${tab("salas", "Salas", salasDesc + "/" + totalSalas())}${tab("pessoas", "Personagens", pessoasVis.length)}${tab("grupos", "Grupos", DADOS.grupos.length)}</div>`;
  let acao = "";
  if (state.arqTab === "pessoas")
    acao = `<button class="topbtn primary" onclick="novoEntArq('pessoa')">＋ Novo personagem</button>`;
  else if (state.arqTab === "grupos")
    acao = `<button class="topbtn primary" onclick="novoEntArq('grupo')">＋ Novo grupo</button>`;
  let corpo = "";
  if (state.arqTab === "salas") {
    corpo = _arqSalasHTML(q);
  } else if (state.arqTab === "pessoas") {
    const lista = pessoasVis
      .filter((e) => !q || e.nome.toLowerCase().includes(q))
      .sort((a, b) => (a.nome < b.nome ? -1 : 1));
    const cards = lista
      .map((e) => {
        const nF = _arqFichasDe("pessoa", e.nome).length;
        const nFa = (e.fatos || []).length;
        return `<div class="pcard${_arqSel && _arqSel.kind === "pessoa" && _arqSel.nome === e.nome ? " on" : ""}" onclick="arqAbrir('pessoa','${jsq(e.nome)}')">
          <div class="pcard-h"><span class="avatar-p">${esc((e.nome || "?")[0].toUpperCase())}</span><div class="pcard-n">${esc(e.nome)}</div><button class="pcard-m" onclick="event.stopPropagation();arqRenomear('pessoa','${jsq(e.nome)}')" title="Renomear" aria-label="Renomear ${esc(e.nome)}">···</button></div>
          ${e.descricao ? `<div class="pcard-d">${esc(e.descricao)}</div>` : ""}
          <div class="pcard-f"><span>${nF} ficha${nF === 1 ? "" : "s"}</span><span>${nFa} fato${nFa === 1 ? "" : "s"}</span></div>
        </div>`;
      })
      .join("");
    corpo = `<div class="arqgrid pess">${cards}<div class="pcard novo" onclick="novoEntArq('pessoa')">＋ Novo personagem</div></div>`;
  } else {
    const lista = DADOS.grupos
      .filter((e) => !q || e.nome.toLowerCase().includes(q))
      .sort((a, b) => (a.nome < b.nome ? -1 : 1));
    const cards = lista
      .map((e) => {
        const nF = _arqFichasDe("grupo", e.nome).length;
        const cor = e.cor || "#8d3030";
        return `<div class="pcard grp${_arqSel && _arqSel.kind === "grupo" && _arqSel.nome === e.nome ? " on" : ""}" style="border-left-color:${esc(cor)}" onclick="arqAbrir('grupo','${jsq(e.nome)}')">
          <div class="pcard-h"><span class="gsw" style="background:${esc(cor)}" title="mudar cor"></span><div class="pcard-n">${esc(e.nome)}</div><button class="pcard-m" onclick="event.stopPropagation();arqRenomear('grupo','${jsq(e.nome)}')" title="Renomear" aria-label="Renomear ${esc(e.nome)}">···</button></div>
          <div class="pcard-f"><span>${nF} ficha${nF === 1 ? "" : "s"}</span></div>
        </div>`;
      })
      .join("");
    corpo = `<div class="arqgrid grps">${cards}<div class="pcard novo" onclick="novoEntArq('grupo')">＋ Novo grupo</div></div>`;
  }
  box.innerHTML = `
    <div class="arqhead">
      <h3>Arquivo</h3>
      ${tabs}
      <div class="topgrow"></div>
      <div class="search arqsearch${_arqBuscaAberta ? " aberta" : ""}">
        <button type="button" class="arqlupa" onclick="arqBuscaAbrir()" aria-label="Buscar no arquivo"><svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true"><circle cx="5.5" cy="5.5" r="4" fill="none" stroke="currentColor" stroke-width="1.5"></circle><line x1="8.6" y1="8.6" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"></line></svg></button>
        <input id="arqBusca" type="search" enterkeyhint="search" aria-label="Buscar no arquivo" placeholder="Buscar no arquivo…" value="${esc(_arqBusca)}" oninput="arqBuscaInput(this.value)">
        <button type="button" class="arqx" onclick="arqBuscaFechar()" aria-label="Limpar e fechar a busca">✕</button>
      </div>
      ${acao}
    </div>
    <div class="arqbody${_arqSel ? " com-dossie" : ""}${state.arqTab === "salas" && _arqCatsAberto && !q ? " catlist" : ""}">${corpo}${_arqDossieHTML()}</div>`;
  if (soLista || (_arqBuscaAberta && _arqFocarBusca)) {
    _arqFocarBusca = false;
    const inp = document.getElementById("arqBusca");
    if (inp) {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }
  }
}
/* Busca do Arquivo no compacto: a lupa é um botão real que expande o campo,
   foca e oferece limpar/fechar (P06). */
let _arqBuscaAberta = false,
  _arqFocarBusca = false;
function arqBuscaAbrir() {
  _arqBuscaAberta = true;
  _arqFocarBusca = true;
  renderArquivo();
}
function arqBuscaFechar() {
  _arqBuscaAberta = false;
  _arqBusca = "";
  renderArquivo();
}
function totalSalas() {
  return DADOS.salas.length;
}
function _arqSalasHTML(q) {
  // Mesmas faixas do Diretório legado, com contagem X/Y por faixa
  const cats = [
    "Rooms 001-012",
    "Rooms 013-024",
    "Rooms 025-036",
    "Rooms 037-046",
    "Bedrooms",
    "Hallways",
    "Green Rooms",
    "Shops",
    "Red Rooms",
    "Found Floorplans",
    "Outer Rooms",
  ];
  const EXTRA = ["Found Floorplans", "Outer Rooms"];
  if (!state.dirCat) state.dirCat = cats[0];
  const menu = cats
    .map((c) => {
      const all = DADOS.salas.filter((s) => s.diretorio === c);
      const ach = all.filter((s) => s.descoberta !== false).length;
      const oculta = EXTRA.includes(c) && !ach;
      const lab = oculta ? "??????" : c.toUpperCase();
      return `<button class="dirbtn2${c === state.dirCat ? " active" : ""}${oculta ? " mist" : ""}" onclick="arqEscolherCat('${c}')">${lab}${all.length ? `<span class="dirn">${ach}/${all.length}</span>` : ""}</button>`;
    })
    .join("");
  let lista = DADOS.salas
    .filter((s) => s.diretorio === state.dirCat)
    .sort(
      (a, b) => (a.num || 999) - (b.num || 999) || (a.nome < b.nome ? -1 : 1),
    );
  if (q)
    lista = DADOS.salas
      .filter((s) => s.descoberta !== false && s.nome.toLowerCase().includes(q))
      .sort((a, b) => (a.num || 999) - (b.num || 999));
  const tiles =
    lista
      .map((s) => {
        if (s.descoberta !== false) {
          const nF = fichas.filter((f) => f.sala === s.nome).length;
          const thumb = s.imagem
            ? `<img loading="lazy" decoding="async" src="${esc(thumbSala(s.imagem, 200))}" onerror="if(this.dataset.f){this.style.display='none'}else{this.dataset.f=1;this.src='${jsq(s.imagem)}'}">`
            : "";
          return `<div class="rtile${_arqSel && _arqSel.kind === "sala" && _arqSel.nome === s.nome ? " on" : ""}" onclick="arqAbrir('sala','${jsq(s.nome)}')" title="${esc(s.nome)}">
        <div class="rthumb">${thumb}</div>
        <div class="rname">${esc(s.nome)}</div>
        <div class="rmeta">${s.num ? "Nº " + String(s.num).padStart(3, "0") : "—"} · ${nF} ficha${nF === 1 ? "" : "s"}</div></div>`;
        }
        return `<div class="rtile locked" title="Clique para marcá-la como descoberta" onclick="confirmarDescobrir('${jsq(s.nome)}')"><div class="rlk"><div class="rlknum">${s.num ? String(s.num).padStart(3, "0") : "?"}</div><div class="rlktxt">não descoberta</div></div></div>`;
      })
      .join("") || '<div class="gvazio">(sem salas nesta faixa)</div>';
  const all = lista.length,
    ach = lista.filter((s) => s.descoberta !== false).length;
  const head = q
    ? `<span class="arqfx busca">BUSCA</span><span class="arqfx-s">${all} sala(s) descobertas com “${esc(q)}”</span>`
    : `<span class="arqfx">${state.dirCat.toUpperCase()}</span><span class="arqfx-s">${ach} de ${all} descobertas · clique numa sala trancada para marcá-la como descoberta</span>`;
  // Botão que reabre a lista de categorias (só aparece no compacto; na
  // busca não faz sentido — os resultados vêm de todas as categorias)
  const btnCat = q
    ? ""
    : `<button class="arqcatbtn" onclick="arqAbrirCats()" aria-label="Escolher outra categoria de salas"><span class="arqcatn">${esc(state.dirCat.toUpperCase())}</span><span class="arqcatx">trocar ▾</span></button>`;
  return `<div class="dirmenu2"><div class="dirtitle2">MOUNT HOLLY<br><b>DIRECTORY</b></div>${menu}</div>
    <div class="arqmain">${btnCat}<div class="arqfaixa">${head}</div><div class="arqgrid salas">${tiles}</div></div>`;
}
/* ===== CONTA — área própria (sai do modal Gerenciar) ===== */
function renderConta() {
  const box = document.getElementById("conta");
  if (!box) return;
  const email =
    (window.USUARIO && (window.USUARIO.email || window.USUARIO.user_metadata?.email)) ||
    "";
  const ini = email ? email.slice(0, 2).toUpperCase() : "·";
  const podeApagar = !!window.APAGAR_CONTA_ATIVO && !!window.apagarConta;
  const online = !!window.MODO_ONLINE;
  box.innerHTML = `
  <div class="contawrap">
    <div class="contacard">
      <div class="conta-id">
        <span class="avatar-lg">${esc(ini)}</span>
        <div><div class="conta-tit">Conta</div><div class="conta-mail">${esc(email || "modo local (sem conta)")}</div></div>
        ${online ? `<button class="dbtn" onclick="if(window.sairComConfirmacao)window.sairComConfirmacao()">Sair</button>` : ""}
      </div>
      <div class="conta-save">
        <span class="save-dot2" id="contaSaveDot"></span>
        <div class="conta-save-tx"><div id="contaSaveTit">Tudo salvo${online ? " na nuvem" : ""}</div><div class="conta-save-sub" id="contaSaveSub">salvamento automático ativo</div></div>
        <button class="conta-link" onclick="salvarTudo()">Salvar agora</button>
      </div>
      <div class="conta-sec">
        <div class="doslab">SEUS DADOS</div>
        <div class="conta-row" onclick="exportarBackup()">
          <div><div class="cr-t">Exportar backup</div><div class="cr-s">baixa uma cópia de tudo em um arquivo</div></div><span class="dosgo">›</span>
        </div>
        <div class="conta-row" onclick="importarDados()">
          <div><div class="cr-t">Restaurar / importar</div><div class="cr-s">carrega dados de um arquivo de backup</div></div><span class="dosgo">›</span>
        </div>
      </div>
      <div class="conta-sec">
        <div class="doslab">PREFERÊNCIAS</div>
        <div class="conta-row noclick">
          <div><div class="cr-t">Idioma padrão dos cards</div><div class="cr-s">transcrições exibidas em PT ou EN</div></div>
          <button class="langsw" onclick="toggleIdioma();renderConta()" aria-label="Trocar idioma padrão dos cards (PT/EN)"><span class="${state.idioma === "original" ? "" : "on"}">PT</span><span class="${state.idioma === "original" ? "on" : ""}">EN</span></button>
        </div>
      </div>
      ${
        podeApagar
          ? `<div class="conta-danger">
        <div><div class="cr-t">Apagar conta e dados</div><div class="cr-s">remove tudo para sempre — pede confirmação dupla</div></div>
        <button class="dosbtn danger slim" onclick="window.apagarConta()">Apagar…</button>
      </div>`
          : ""
      }
    </div>
  </div>`;
}
/* ===== Ferramentas extras ===== */
let _focus = null,
  _leitor = { col: "", i: 0 };
/* -- Ligar pistas -- */
function ligarFichaUI(id) {
  let m = document.getElementById("linkPicker");
  if (!m) {
    m = document.createElement("div");
    m.id = "linkPicker";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modalbox" style="max-width:520px"><div class="modalhd"><h2>Ligar a outra ficha</h2><button class="close" onclick="fecharLink()">✕</button></div><div class="savehelp"><input id="linkBusca" class="edinput" placeholder="Buscar ficha pelo título..." oninput="renderLink('${id}',this.value)"><div id="linkLista" class="linklista"></div></div></div>`;
  m.classList.add("open");
  renderLink(id, "");
  setTimeout(() => {
    const b = document.getElementById("linkBusca");
    if (b) b.focus();
  }, 60);
}
function renderLink(id, q) {
  const base = fichas.find((f) => f.id === id);
  const box = document.getElementById("linkLista");
  if (!base || !box) return;
  const ql = (q || "").toLowerCase();
  const outras = fichas.filter(
    (f) => f.id !== id && (f.titulo || "").toLowerCase().includes(ql),
  );
  box.innerHTML =
    outras
      .map((f) => {
        const ja = (base.conexoes || []).includes(f.id);
        return `<div class="linkrow" onclick="ligar('${id}','${f.id}')">${ja ? "✓ " : ""}${esc(f.titulo)}${f.sala ? ` <small style="opacity:.6">· ${esc(f.sala)}</small>` : ""}</div>`;
      })
      .join("") || "<div class='gvazio'>(nenhuma ficha)</div>";
}
function ligar(a, b) {
  const fa = fichas.find((f) => f.id === a),
    fb = fichas.find((f) => f.id === b);
  if (!fa || !fb) return;
  fa.conexoes = fa.conexoes || [];
  fb.conexoes = fb.conexoes || [];
  if (!fa.conexoes.includes(b)) fa.conexoes.push(b);
  if (!fb.conexoes.includes(a)) fb.conexoes.push(a);
  marcarAlterado();
  renderLink(a, (document.getElementById("linkBusca") || {}).value || "");
}
function desligarFicha(a, b) {
  const fa = fichas.find((f) => f.id === a),
    fb = fichas.find((f) => f.id === b);
  if (fa) fa.conexoes = (fa.conexoes || []).filter((x) => x !== b);
  if (fb) fb.conexoes = (fb.conexoes || []).filter((x) => x !== a);
  marcarAlterado();
  abrir(a);
}
function fecharLink() {
  const m = document.getElementById("linkPicker");
  if (m) m.classList.remove("open");
}
/* -- Simbolos -- */
/* -- toggles -- */
function toggleOrfas() {
  state.orfas = !state.orfas;
  render();
}
function toggleFav(id) {
  const f = fichas.find((x) => x.id === id);
  if (!f) return;
  f.fav = !f.fav;
  marcarAlterado();
  render();
}
function toggleFavoritas() {
  state.favoritas = !state.favoritas;
  render();
}
function toggleIdioma() {
  state.idioma = state.idioma === "traducao" ? "original" : "traducao";
  const b = document.getElementById("mmIdioma");
  if (b) b.textContent = state.idioma === "original" ? "EN" : "PT";
  render();
}
/* -- Foco no mapa -- */
function focarEnt(kind, nome) {
  const pre =
    kind === "sala" ? "sala::" : kind === "colecao" ? "col::" : "pes::";
  focarMapa(pre + nome);
}
/* Fio da investigação no teclado: Enter/Espaço vale como clique */
function fioTecla(e, id) {
  if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    focarMapa(id);
  }
}
function focarMapa(id) {
  _focus = id;
  fechar();
  fecharGestao && fecharGestao();
  setView("mapa");
  setTimeout(() => centralizarNo(id), 60);
}
function centralizarNo(id) {
  const n = nodes.find((x) => x.id === id);
  const svg = document.getElementById("svg");
  if (!n || !svg) return;
  // Desliza suave até o nó (o draw do foco já rodou; aqui é só câmera).
  animarCamera(_viewW / 2 - n.x * cam.s, _viewH / 2 - n.y * cam.s, cam.s, 300);
}
/* -- Backup / restaurar -- */
function exportarBackup() {
  const txt = serializeDados();
  const dt = new Date().toISOString().slice(0, 10);
  const b = new Blob([txt], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = "dados_backup_" + dt + ".js";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast("Backup baixado ✓", 2500);
}
function _replaceArr(t, s) {
  if (!t) return;
  t.length = 0;
  (s || []).forEach((x) => t.push(x));
}
// Aplica um objeto importado sobre o DADOS (substituição das listas).
// Separada do seletor de arquivo para poder ser testada "sem tela".
function aplicarImport(o) {
  _replaceArr(DADOS.salas, o.salas);
  _replaceArr(DADOS.personagens, o.personagens);
  _replaceArr(DADOS.colecoes, o.colecoes);
  _replaceArr(fichas, o.fichas);
  _replaceArr(DADOS.teorias, o.teorias);
  // Conserto: quadros eram esquecidos no restaurar (o backup os contém).
  // Defensivo: backups antigos podem não ter a lista.
  if (Array.isArray(o.quadros)) _replaceArr(DADOS.quadros, o.quadros);
  if (o.tipos && o.tipos.length) _replaceArr(TIPOS, o.tipos);
}
function importarDados() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = ".js,.json,text/javascript,application/json";
  inp.onchange = () => {
    const file = inp.files && inp.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const t = rd.result;
        const o = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
        if (
          !confirm(
            "Restaurar vai SUBSTITUIR os dados atuais pelos do arquivo. Continuar?",
          )
        )
          return;
        aplicarImport(o);
        marcarAlterado();
        buildChips();
        rebuildFilters();
        render();
        toast("Dados restaurados ✓", 3000);
      } catch (e) {
        alert("Não consegui ler esse arquivo como dados.js válido.");
      }
    };
    rd.readAsText(file);
  };
  inp.click();
}
/* -- Dashboard -- */
function dashboardHTML() {
  const sal = DADOS.salas.length,
    salD = DADOS.salas.filter((s) => s.descoberta !== false).length;
  const orf = fichas.filter(
    (f) =>
      (f.conexoes || []).length === 0 &&
      !f.sala &&
      !(f.personagens || []).length &&
      !(f.colecoes || []).length,
  ).length;
  const inc = fichas.filter((f) => fichaIncompleta(f).length).length;
  const pend = fichas.filter((f) => f.pendente).length;
  const it = (lab, val, oc) =>
    `<div class="dashit"${oc ? ` onclick="${oc}" style="cursor:pointer"` : ""}><b>${val}</b><span>${lab}</span></div>`;
  return `<div class="dashboard">${it("pistas", fichas.length, "")}${it("salas", salD + "/" + sal, "setView('diretorio')")}${it("personagens", DADOS.personagens.length, "setView('mundo')")}${it("grupos", DADOS.grupos.length, "setView('mundo')")}${it("pendentes", pend, "state.pendentes=true;render()")}${it("incompletas", inc, "state.incompletas=true;render()")}${it("órfãs", orf, "state.orfas=true;render()")}</div>`;
}
/* -- Paleta (Ctrl+K) -- */
function abrirPalette() {
  let m = document.getElementById("palette");
  if (!m) {
    m = document.createElement("div");
    m.id = "palette";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modalbox" style="max-width:560px"><div class="modalhd"><h2>⌨️ Ir para…</h2><button class="close" onclick="fecharPalette()">✕</button></div><div class="savehelp"><input id="palBusca" class="edinput" placeholder="Buscar ficha, sala, personagem, coleção..." oninput="renderPalette(this.value)"><div id="palLista" class="linklista"></div></div></div>`;
  m.classList.add("open");
  renderPalette("");
  setTimeout(() => {
    const b = document.getElementById("palBusca");
    if (b) b.focus();
  }, 60);
}
function renderPalette(q) {
  const box = document.getElementById("palLista");
  if (!box) return;
  const ql = (q || "").toLowerCase();
  const its = [];
  fichas.forEach((f) =>
    its.push({
      t: "🗂 " + f.titulo,
      k: "pista",
      go: "abrir('" + f.id + "')",
      nome: f.titulo,
    }),
  );
  DADOS.salas
    .filter((s) => s.descoberta !== false)
    .forEach((s) =>
      its.push({
        t: "🚪 " + s.nome,
        go: "abrirEntidade('sala','" + jsq(s.nome) + "')",
        nome: s.nome,
      }),
    );
  DADOS.personagens.forEach((s) =>
    its.push({
      t: "👤 " + s.nome,
      go: "abrirEntidade('pessoa','" + jsq(s.nome) + "')",
      nome: s.nome,
    }),
  );
  DADOS.grupos.forEach((s) =>
    its.push({
      t: "📦 " + s.nome,
      go: "abrirEntidade('grupo','" + jsq(s.nome) + "')",
      nome: s.nome,
    }),
  );
  const f = its.filter((x) => x.nome.toLowerCase().includes(ql)).slice(0, 40);
  box.innerHTML =
    f
      .map(
        (x) =>
          `<div class="linkrow" onclick="fecharPalette();${x.go}">${esc(x.t)}</div>`,
      )
      .join("") || "<div class='gvazio'>(nada)</div>";
}
function fecharPalette() {
  const m = document.getElementById("palette");
  if (m) m.classList.remove("open");
}
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
function renderTeorias() {
  const box = document.getElementById("teorias");
  if (!box) return;
  if (!DADOS.quadros || !DADOS.quadros.length)
    DADOS.quadros = [
      { nome: "Quadro 1", cam: { x: 40, y: 40, s: 1 }, nodes: [], setas: [] },
    ];
  if (_qIdx >= DADOS.quadros.length) _qIdx = 0;
  const tabs = DADOS.quadros
    .map(
      (q, i) =>
        `<button class="qtab${i === _qIdx ? " active" : ""}"${i === _qIdx ? ' aria-current="true"' : ""} ondblclick="renomearQuadro(${i})" onclick="trocarQuadro(${i})" title="Clique para abrir · 2 cliques para renomear">${esc(q.nome)}</button>`,
    )
    .join("");
  box.innerHTML = `<div class="qbar">
    <div class="qtitulo">Quadros</div>
    <div class="qtabs">${tabs}<button class="qtab qadd" onclick="novoQuadro()" title="Novo quadro">＋</button></div>
    <button class="qsel" onclick="qEscolherQuadro()" aria-haspopup="dialog" aria-label="Escolher quadro">${esc(quadroAtual().nome)}<span class="qsel-c">▾</span></button>
    <div class="qtools">
      <span class="qtoolbar" title="Ferramentas"><button class="qtoolbtn" data-tool="select" onclick="qSetTool('select')" title="Selecionar (V)">⬉</button><button class="qtoolbtn" data-tool="hand" onclick="qSetTool('hand')" title="Mão — navegar (H)">✋</button><button class="qtoolbtn qt-t" data-tool="texto" onclick="qSetTool('texto')" title="Texto — clique no quadro para criar (T)">T</button><button class="qtoolbtn" data-tool="nota" onclick="qSetTool('nota')" title="Nota adesiva — clique no quadro para criar (N)">🗒</button><button class="qtoolbtn" data-tool="seta" onclick="qSetTool('seta')" title="Barbante — arraste de um cartão a outro (A)">↗</button></span>
      <button class="topbtn qfich" onclick="qAddItem()">＋ Ficha do arquivo</button>
      <button class="topbtn ic" onclick="document.getElementById('qmore').classList.toggle('open')" title="Mais ações">···</button>
      <div class="moremenu qmore" id="qmore">
        <button class="mmit" onclick="qAddTexto();document.getElementById('qmore').classList.remove('open')">Texto</button>
        <button class="mmit" onclick="qAddNota();document.getElementById('qmore').classList.remove('open')">Nota adesiva</button>
        <button class="mmit" onclick="document.getElementById('qmore').classList.remove('open');qLista()">Lista de itens…</button>
        <button class="mmit" onclick="document.getElementById('qmore').classList.remove('open');renomearQuadro(_qIdx)">Renomear quadro…</button>
        <div class="mm-sep"></div>
        <button class="mmit del" onclick="document.getElementById('qmore').classList.remove('open');excluirQuadro()">Excluir quadro…</button>
      </div>
    </div>
  </div>
  <div class="qcanvas" id="qcanvas"><div class="qworld" id="qworld"><svg class="qsvg" id="qsvg"></svg><div class="qnodes" id="qnodes"></div></div>
  ${
    !(quadroAtual().nodes || []).length
      ? `<div class="qvazio"><div class="qv-ic">🧵</div><div class="qv-tit">Quadro vazio</div><div class="qv-tx">${ehToque() ? "Toque em ＋ para adicionar uma ficha, nota ou texto e começar a teoria." : "Arraste fichas do arquivo ou crie uma nota para começar a teoria."}</div><div class="qv-btns"><button class="topbtn primary" onclick="qAddItem()">＋ Ficha do arquivo</button><button class="topbtn" onclick="qAddNota()">Nota</button></div></div>`
      : ""
  }
  <div class="qhint">V selecionar · H mão · T texto · N nota · A barbante · Del apaga · Ctrl+D duplica</div></div>`;
  wireQuadro();
  desenhaQuadro();
  qSetTool(_qTool); // restaura a ferramenta ativa (a barra é recriada a cada render)
}
function trocarQuadro(i) {
  _qIdx = i;
  _qSelSet = new Set();
  renderTeorias();
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
  _qIdx = DADOS.quadros.length - 1;
  marcarAlterado();
  renderTeorias();
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
function nodeHTML(n) {
  const sel = _qSelSet.has(n.id) ? " sel" : "";
  if (n.tipo === "texto") {
    // "estilo: nota" é ADITIVO: ausente = caixa de texto normal (dados antigos).
    // A cor é um ÍNDICE numa paleta fixa (nunca CSS vindo dos dados).
    const nota = n.estilo === "nota";
    const corBg = nota
      ? `;background:${QCORES_NOTA[(n.cor | 0) % QCORES_NOTA.length]}`
      : "";
    const btnCor = nota
      ? `<button class="qcor" onclick="qCorNota('${n.id}')" title="Mudar a cor" aria-label="Mudar a cor da nota">🎨</button>`
      : "";
    return `<div class="qnode qtexto${nota ? " qnota" : ""}${sel}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px;width:${n.w || 250}px${corBg}"><div class="qhandle" data-drag="${n.id}">≡ ${nota ? "nota" : "texto"}</div><div class="qtxt menteditor" contenteditable="true" data-qid="${n.id}" data-ph="Escreva... use @ para citar" oninput="teoEditorInput(this)">${n.texto || ""}</div><button class="qdel" onclick="qDelNode('${n.id}')" aria-label="Excluir do quadro">✕</button>${btnCor}<span class="qconn" data-conn="${n.id}" title="Arraste para ligar">●</span></div>`;
  }
  const info = qRefInfo(n);
  const thumb = info.img
    ? `<div class="qthumb"><img src="${esc(info.img)}" onerror="this.parentNode.style.display='none'"></div>`
    : "";
  // Ficha no quadro = papel com alfinete vermelho, código e título serif
  const cod = n.kind === "pista" ? `<div class="qcod">${esc(n.ref)}</div>` : "";
  return `<div class="qnode qref${sel}" data-id="${n.id}" data-drag="${n.id}" style="left:${n.x}px;top:${n.y}px" ondblclick="qOpenRef('${n.id}')"><span class="qpin"></span>${cod}<div class="qreftit"><span class="qname">${esc(info.nome)}</span></div>${thumb}<button class="qdel" onclick="event.stopPropagation();qDelNode('${n.id}')" aria-label="Excluir do quadro">✕</button><span class="qconn" data-conn="${n.id}" title="Arraste para ligar">●</span></div>`;
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
  desenhaSetas();
}
function aplicaCam() {
  const q = quadroAtual();
  const w = document.getElementById("qworld");
  if (w && q)
    w.style.transform = `translate(${q.cam.x}px,${q.cam.y}px) scale(${q.cam.s})`;
  // O fundo do quadro é um degradê liso e parado — nada a mover aqui.
}
function nodeEl(id) {
  return document.querySelector(
    '.qnode[data-id="' +
      (window.CSS && CSS.escape ? CSS.escape(id) : id) +
      '"]',
  );
}
function markSelDom() {
  const q = quadroAtual();
  if (!q) return;
  q.nodes.forEach(function (n) {
    const el = nodeEl(n.id);
    if (el) el.classList.toggle("sel", _qSelSet.has(n.id));
  });
}
function qNodesInRect(cv, q, m) {
  const r = cv.getBoundingClientRect();
  const x0 = Math.min(m.x0, m.x1),
    x1 = Math.max(m.x0, m.x1),
    y0 = Math.min(m.y0, m.y1),
    y1 = Math.max(m.y0, m.y1);
  const s = new Set();
  q.nodes.forEach(function (n) {
    const c = nodeCenter(n);
    const cx = r.left + (c.x * q.cam.s + q.cam.x),
      cy = r.top + (c.y * q.cam.s + q.cam.y);
    if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) s.add(n.id);
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
  let s = "";
  const _curva = (p1, p2) => {
    const mx = (p1.x + p2.x) / 2,
      my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x,
      dy = p2.y - p1.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const sag = Math.min(34, len * 0.14);
    return `M ${p1.x} ${p1.y} Q ${mx - (dy / len) * sag} ${my + (dx / len) * sag + sag * 0.6}, ${p2.x} ${p2.y}`;
  };
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
    const dPath = _curva(p1, p2);
    s += `<path d="${dPath}" fill="none" stroke="${cor}" stroke-width="${sel ? 3.2 : 2.5}"${religando ? ' stroke-dasharray="5 4"' : ""}/>`;
    s += `<path d="${dPath}" fill="none" stroke="transparent" stroke-width="14" style="pointer-events:stroke;cursor:pointer" data-seta="${i}" onclick="qSelSeta(${i})" ondblclick="qRotuloSeta(${i})"><title>Clique: selecionar (Del apaga) · 2 cliques: rótulo</title></path>`;
    if (se.rotulo) {
      const mx = (p1.x + p2.x) / 2,
        my = (p1.y + p2.y) / 2;
      s += `<text x="${mx}" y="${my - 8}" text-anchor="middle" font-size="12" fill="#f0d878" font-family="'Special Elite',monospace" paint-order="stroke" stroke="#3a281a" stroke-width="3" style="pointer-events:none">${esc(se.rotulo)}</text>`;
    }
    if (sel && _qSetaSel.size === 1 && !religando) {
      // Alças das pontas (só com UMA seta selecionada): arrastar reconecta.
      s += `<circle cx="${p1.x}" cy="${p1.y}" r="6" fill="#e3c074" stroke="#14100b" stroke-width="1.5" data-seta-end="de" data-seta-i="${i}" style="pointer-events:all;cursor:grab"><title>Arraste para reconectar</title></circle>`;
      s += `<circle cx="${p2.x}" cy="${p2.y}" r="6" fill="#e3c074" stroke="#14100b" stroke-width="1.5" data-seta-end="para" data-seta-i="${i}" style="pointer-events:all;cursor:grab"><title>Arraste para reconectar</title></circle>`;
    }
  });
  if (_qArrow && _qArrowCur) {
    const a = q.nodes.find((n) => n.id === _qArrow.de);
    if (a) {
      const ca = nodeCenter(a);
      s += `<line x1="${ca.x}" y1="${ca.y}" x2="${_qArrowCur.x}" y2="${_qArrowCur.y}" stroke="#b8452e" stroke-width="2" stroke-dasharray="5 4"/>`;
    }
  }
  svg.innerHTML = s;
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
  _qTool = t;
  _qArrow = null;
  _qArrowCur = null;
  const cv = document.getElementById("qcanvas");
  if (cv)
    cv.style.cursor =
      t === "hand" ? "grab" : t === "select" ? "default" : "crosshair";
  document.querySelectorAll(".qtoolbtn").forEach(function (b) {
    b.classList.toggle("active", b.getAttribute("data-tool") === t);
  });
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
  // Setas selecionadas: remove por índice, do maior pro menor.
  [..._qSetaSel]
    .sort((a, b) => b - a)
    .forEach(function (i) {
      q.setas.splice(i, 1);
    });
  const ids = new Set(_qSelSet);
  q.nodes = q.nodes.filter((n) => !ids.has(n.id));
  q.setas = q.setas.filter((s) => !ids.has(s.de) && !ids.has(s.para));
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
// Pontas visíveis de uma seta (geometria derivada; null se um nó sumiu).
function qSetaPontos(q, se) {
  const a = q.nodes.find((n) => n.id === se.de),
    b = q.nodes.find((n) => n.id === se.para);
  if (!a || !b) return null;
  const ra = qNodeRect(a),
    rb = qNodeRect(b);
  const ca = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 },
    cb = { x: rb.x + rb.w / 2, y: rb.y + rb.h / 2 };
  return {
    p1: qClipRect(ca.x, ca.y, cb.x, cb.y, ra, 4),
    p2: qClipRect(cb.x, cb.y, ca.x, ca.y, rb, 7),
  };
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
  const r = cv.getBoundingClientRect();
  const x0 = Math.min(m.x0, m.x1),
    x1 = Math.max(m.x0, m.x1),
    y0 = Math.min(m.y0, m.y1),
    y1 = Math.max(m.y0, m.y1);
  const s = new Set();
  q.setas.forEach(function (se, i) {
    const pp = qSetaPontos(q, se);
    if (!pp) return;
    const ax = r.left + (pp.p1.x * q.cam.s + q.cam.x),
      ay = r.top + (pp.p1.y * q.cam.s + q.cam.y),
      bx = r.left + (pp.p2.x * q.cam.s + q.cam.x),
      by = r.top + (pp.p2.y * q.cam.s + q.cam.y);
    if (qSegCruzaRect(ax, ay, bx, by, x0, y0, x1, y1)) s.add(i);
  });
  return s;
}
// Clique numa seta: seleciona só ela / desseleciona (Delete apaga; Esc desmarca).
function qSelSeta(i) {
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
// Reconecta uma ponta da seta a outro cartão (valida auto-loop e duplicata).
function qReligarSeta(i, end, novoId) {
  const q = quadroAtual();
  const se = q && q.setas[i];
  if (!se || !novoId) return false;
  const de = end === "de" ? novoId : se.de,
    para = end === "para" ? novoId : se.para;
  if (de === para) return false;
  if (q.setas.some((s2, j) => j !== i && s2.de === de && s2.para === para))
    return false;
  se[end] = novoId;
  marcarAlterado();
  desenhaSetas();
  return true;
}
// Handler ÚNICO de mouseup na window (antes era re-adicionado a cada
// renderTeorias — vazamento de listeners; agora registra uma vez só).
let _qWinWired = false;
function qMouseUpGlobal(e) {
  if (_qArrow) {
    const t = e.target.closest && e.target.closest(".qnode");
    if (t) {
      const para = t.getAttribute("data-id");
      if (para && para !== _qArrow.de) {
        const q = quadroAtual();
        if (!q.setas.some((s) => s.de === _qArrow.de && s.para === para)) {
          q.setas.push({ de: _qArrow.de, para: para });
          marcarAlterado();
        }
      }
    }
    _qArrow = null;
    _qArrowCur = null;
    desenhaSetas();
    // Convenção tldraw: depois de criar a seta, a ferramenta volta pra seleção.
    if (_qTool === "seta") qSetTool("select");
  }
  if (_qRebind) {
    // Soltou a alça: sobre um cartão religa; no vazio, mantém como estava.
    const alvo = e.target.closest && e.target.closest(".qnode");
    if (alvo) qReligarSeta(_qRebind.i, _qRebind.end, alvo.getAttribute("data-id"));
    _qRebind = null;
    _qRebindCur = null;
    desenhaSetas();
  }
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
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toW = (p) => {
    const q = quadroAtual();
    return { x: (p.x - q.cam.x) / q.cam.s, y: (p.y - q.cam.y) / q.cam.s };
  };
  cv.addEventListener("mousedown", function (e) {
    const q = quadroAtual();
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
    // Clique numa seta: o onclick/ondblclick dela cuida — não inicia marquee.
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
    if (
      e.target.tagName === "TEXTAREA" ||
      e.target.isContentEditable ||
      (e.target.closest && e.target.closest(".qtxt"))
    )
      return;
    const dg = e.target.closest && e.target.closest("[data-drag]");
    if (dg) {
      const id = dg.getAttribute("data-drag");
      if (!_qSelSet.has(id)) {
        _qSelSet = new Set([id]);
        markSelDom();
      }
      _qDrag = { ids: [..._qSelSet], sw: toW(rel(e)), orig: {}, moved: false };
      _qDrag.ids.forEach(function (i) {
        const nn = q.nodes.find((x) => x.id === i);
        if (nn) _qDrag.orig[i] = { x: nn.x, y: nn.y };
      });
      e.preventDefault();
      return;
    }
    _qMarq = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
    _qSelSet = new Set();
    // Clique no fundo também desmarca as setas selecionadas.
    if (_qSetaSel.size) {
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
      _qSelSet = qNodesInRect(cv, q, _qMarq);
      // O retângulo também seleciona as SETAS que ele alcança.
      _qSetaSel = qSetasInRect(cv, q, _qMarq);
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
    const r = cv.getBoundingClientRect();
    return toW({ x: x - r.left, y: y - r.top });
  };
  let _gqPan = null,
    _gqDrag = null;
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
      const q = quadroAtual();
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
      if (_gqDrag) {
        const s = q.cam.s || 1;
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
      q.cam.x = _gqPan.x + dx;
      q.cam.y = _gqPan.y + dy;
      aplicaCam();
    },
    dragFim: function () {
      if (_gqDrag) marcarAlterado();
      if (_gqPan) qAgendaSalvarCam();
      _gqDrag = null;
      _gqPan = null;
    },
    dragCancela: function () {
      _gqDrag = null;
      _gqPan = null;
    },
    cancelar: function () {
      _gqDrag = null;
      _gqPan = null;
      if (_qArrow) {
        _qArrow = null;
        _qArrowCur = null;
        desenhaSetas();
      }
    },
    // Segurar o toque num cartão: puxa o barbante até outro cartão
    longPress: function (alvo, pt) {
      const noEl = alvo && alvo.closest ? alvo.closest(".qnode") : null;
      if (!noEl) return false;
      qMenuCancela(); // segurou: puxa barbante, não abre menu
      _qArrow = { de: noEl.getAttribute("data-id") };
      _qArrowCur = toWxy(pt.x, pt.y);
      desenhaSetas();
      try {
        if (navigator.vibrate) navigator.vibrate(30);
      } catch (err) {}
      toast("Puxe a linha até outro cartão.");
      return true;
    },
    longDrag: function (e) {
      _qArrowCur = toWxy(e.clientX, e.clientY);
      desenhaSetas();
    },
    longFim: function (e) {
      const de = _qArrow && _qArrow.de;
      _qArrow = null;
      _qArrowCur = null;
      // Com pointer capture o e.target é o canvas; quem diz onde o dedo
      // soltou é o elementFromPoint (fallback: e.target, p/ testes).
      let t = null;
      try {
        t = document.elementFromPoint(e.clientX, e.clientY);
      } catch (err) {}
      if (!t) t = e.target;
      const noEl = t && t.closest ? t.closest(".qnode") : null;
      const para = noEl && noEl.getAttribute("data-id");
      if (de && para && para !== de) {
        const q = quadroAtual();
        if (!q.setas.some((s) => s.de === de && s.para === para)) {
          q.setas.push({ de: de, para: para });
          marcarAlterado();
        }
        toast("Barbante criado.");
      } else toast("Ligação cancelada.");
      desenhaSetas();
    },
    pinch: function (p) {
      const q = quadroAtual();
      const r = cv.getBoundingClientRect();
      const cx = p.cx - r.left,
        cy = p.cy - r.top;
      const wx = (cx - q.cam.x) / q.cam.s,
        wy = (cy - q.cam.y) / q.cam.s;
      const ns = Math.max(
        QUADRO_ZOOM_MIN,
        Math.min(QUADRO_ZOOM_MAX, q.cam.s * p.fator),
      );
      q.cam.x = cx - wx * ns + p.dx;
      q.cam.y = cy - wy * ns + p.dy;
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
    if (noEl && noEl.getAttribute("data-id") !== de) {
      const para = noEl.getAttribute("data-id");
      if (!q.setas.some((s) => s.de === de && s.para === para)) {
        q.setas.push({ de: de, para: para });
        marcarAlterado();
        desenhaSetas();
      }
      toast("Barbante criado.");
    } else toast("Ligação cancelada.");
    return;
  }
  if (_qReligar) {
    const rl = _qReligar;
    _qReligar = null;
    if (noEl) qReligarSeta(rl.i, rl.end, noEl.getAttribute("data-id"));
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
        toast("Toque no cartão de DESTINO para ligar o barbante.");
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
      rotulo: "Religar origem",
      fn: function () {
        _qReligar = { i: i, end: "de" };
        toast("Toque no cartão que passa a ser a ORIGEM.");
      },
    },
    {
      rotulo: "Religar destino",
      fn: function () {
        _qReligar = { i: i, end: "para" };
        toast("Toque no cartão que passa a ser o DESTINO.");
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
  q.setas = q.setas.filter((s) => s.de !== id && s.para !== id);
  _qSetaSel = new Set(); // setas podem ter mudado de índice
  marcarAlterado();
  desenhaQuadro();
}
function qDelSeta(i) {
  const q = quadroAtual();
  q.setas.splice(i, 1);
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
    DADOS.teorias[i].texto = ed.innerHTML;
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
    qSetTexto(ed.dataset.qid, ed.innerHTML);
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
/* -- Folhear colecao ordenada -- */
function abrirLeitor(col) {
  _leitor = { col, i: 0 };
  let m = document.getElementById("leitor");
  if (!m) {
    m = document.createElement("div");
    m.id = "leitor";
    m.className = "modal";
    document.body.appendChild(m);
  }
  m.classList.add("open");
  renderLeitor();
}
function leitorPaginas() {
  return fichas
    .filter((f) => (f.colecoes || []).includes(_leitor.col))
    .sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
}
function leitorNav(d) {
  const ps = leitorPaginas();
  _leitor.i = Math.max(0, Math.min(ps.length - 1, _leitor.i + d));
  renderLeitor();
}
function renderLeitor() {
  const m = document.getElementById("leitor");
  if (!m) return;
  const ps = leitorPaginas();
  const f = ps[_leitor.i];
  m.innerHTML = `<div class="modalbox" style="max-width:760px"><div class="modalhd"><h2>📖 ${esc(_leitor.col)} — ${ps.length ? _leitor.i + 1 : 0}/${ps.length}</h2><button class="close" onclick="fecharLeitor()">✕</button></div>
    <div class="leitorbody">${f ? `${pg0(f).imagem ? `<img src="${esc(pg0(f).imagem)}" class="leitorimg" style="cursor:zoom-in" onclick="abrirLightbox(this.src)" onerror="this.style.display='none'">` : ""}<h3>${esc(f.titulo)}</h3><div class="twocol"><div><div class="lab">Original (EN)</div><div class="orig">${esc(pg0(f).original || "—")}</div></div><div><div class="lab">Tradução (PT)</div><div class="trad">${esc(pg0(f).traducao || "—")}</div></div></div>` : "<div class='gvazio'>(coleção vazia)</div>"}</div>
    <div class="leitornav"><button class="dbtn" onclick="leitorNav(-1)" ${_leitor.i <= 0 ? "disabled" : ""}>◀ Anterior</button><button class="dbtn" onclick="leitorNav(1)" ${_leitor.i >= ps.length - 1 ? "disabled" : ""}>Próxima ▶</button></div></div>`;
}
function fecharLeitor() {
  const m = document.getElementById("leitor");
  if (m) m.classList.remove("open");
}
function render() {
  atualizarBarra();
  if (state.view === "grade") renderGrade();
  else if (state.view === "mapa") renderMapa();
  else if (state.view === "mundo") renderMundo();
  else if (state.view === "diretorio") renderDiretorio();
  else if (state.view === "teorias") renderTeorias();
  else if (state.view === "arquivo") renderArquivo();
  else if (state.view === "conta") renderConta();
}
render();
// No modo online quem comanda o início (login -> carregar da nuvem) é a camada online (online.js).
// Sem o modo online, segue o MVP: reconecta o arquivo local e, se não houver, mostra o onboarding.
if (!window.MODO_ONLINE) {
  reconectarAoCarregar()
    .then(function () {
      return lerMtime();
    })
    .then(function (m) {
      if (m) _diskMtime = m;
    })
    .catch(function () {})
    .then(function () {
      atualizarSalvar();
      if (!fileHandle && !DADOS_BROKEN) mostrarOnboard();
    });
}
snapshotDB(true);
histInit();
atualizarSalvar();
if (DADOS_BROKEN) {
  try {
    setAuto(false);
  } catch (e) {}
  abrirRecuperacao();
}
window.addEventListener("focus", async function () {
  try {
    if (fileHandle && autoSave && !DADOS_BROKEN && (await discoMudou()))
      bannerDisco();
  } catch (e) {}
});

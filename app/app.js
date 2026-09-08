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
  /* `preventScroll` NÃO é detalhe: o painel entra deslizando (transform), e
     no instante do foco ele ainda está fora da tela, à direita. Sem isto o
     navegador "corre atrás" do elemento focado e ROLA o <main> uns 530px —
     a grade de fichas dá um pulo para a esquerda e volta junto com o
     painel. Era esse o tremor das fichas atrás da ficha aberta. */
  try {
    if (foco) foco.focus({ preventScroll: true });
    else {
      el.tabIndex = -1;
      el.focus({ preventScroll: true });
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
/* PADRÃO DA CASA: painel flutuante fecha ao clicar fora dele.
   - `abre` é o botão que o abre: o clique nele já alterna, e fechar aqui
     depois faria o painel piscar e nunca abrir.
   - `so` limita a regra (no compacto a folha de filtros é MODAL e já fecha
     tocando no fundo escurecido — dois caminhos brigariam).
   Painel novo? some uma linha nesta lista em vez de escrever outro ouvinte:
   era assim que uns fechavam e outros não. */
const PAINEIS_FECHA_FORA = [
  { id: "moreMenu", abre: "#btnMore" },
  { id: "filtrosPanel", abre: "#btnFiltros", so: () => !ehCompacto() },
  { id: "maptoggles", abre: "#btnCamadas" },
  { id: "qpop", abre: ".qchip" },
  { id: "qatalhos", abre: ".qhint .abrir" },
];
document.addEventListener("click", function (e) {
  PAINEIS_FECHA_FORA.forEach(function (p) {
    const el = document.getElementById(p.id);
    if (!el || !el.classList.contains("open")) return;
    if (p.so && !p.so()) return;
    if (el.contains(e.target)) return;
    if (p.abre && e.target.closest && e.target.closest(p.abre)) return;
    overlayFechar(p.id);
  });
});
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
    // "com-alfinete": só o card de ficha reserva a faixa do alfinete no
    // topo (os cards de personagem/grupo usam .card e não têm alfinete
    // nenhum). Em qualquer tela o alfinete fica dentro do papel.
    c.className = "card com-alfinete";
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
    const idVis = idVisual(f.id);
    c.innerHTML = `
      <div class="selcheck">${state.sel.has(f.id) ? "✓" : ""}</div>
      <button class="pin${f.fav ? " fav" : ""}" onclick="event.stopPropagation();toggleFav('${f.id}')" title="${f.fav ? "Tirar de favoritas" : "Favoritar"}" aria-pressed="${f.fav ? "true" : "false"}" aria-label="Favoritar"></button>
      <div class="chead">
        <span class="cid">${esc(idVis)}</span>
        <span class="csala">${f.sala ? esc(f.sala) : "—"}</span>
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
      ? `<button class="et sala" onclick="filtraSala('${jsq(f.sala)}')" title="Filtrar pela sala">${esc(f.sala)}</button>`
      : "") +
    (f.personagens || [])
      .map(
        (p) =>
          `<button class="et pessoa" onclick="filtraPessoa('${jsq(p)}')" title="Filtrar pelo personagem">${esc(p)}</button>`,
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
        <span class="did">${esc(idVisual(f.id))}</span>
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
      ? { rotulo: "Processar com IA", fn: () => window.iaProcessarPista(id) }
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
/* Descrição de personagem gerada pela IA: começa com um resumo (1ª linha) e
   segue com bullets "• F-010 - fato". Cards e listas compactas mostram só o
   resumo; o dossiê completo mostra tudo (com as quebras preservadas). */
function descResumo(d) {
  const linhas = String(d || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  return linhas[0] || "";
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
/* Identificador no estilo do carimbo do design: f3 → F-003. É só VISUAL —
   o id gravado no DADOS continua "f3". Vale para todo lugar que mostra o
   código de uma ficha (card da grade, ficha do quadro). */
function idVisual(id) {
  return String(id == null ? "" : id).replace(
    /^([a-z]+)(\d+)$/i,
    (_m, letra, num) => letra.toUpperCase() + "-" + num.padStart(3, "0"),
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

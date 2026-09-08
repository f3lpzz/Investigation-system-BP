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
/* Em tela grande o CSS amplia a interface com `zoom` no <body> (1.08 / 1.22
   / 1.45). Isso cria DUAS réguas: `clientX` e `getBoundingClientRect()` vêm
   em pixels de TELA (já ampliados), enquanto `style.left`, a câmera do
   quadro e do mapa trabalham em pixels de CSS. Misturar as duas desloca
   tudo por "coordenada × (zoom − 1)" — some no monitor pequeno e cresce
   quanto mais longe do canto superior esquerdo. Divida por este fator para
   ir de tela → CSS; multiplique para o contrário. */
function zoomIF() {
  const z = parseFloat(getComputedStyle(document.body).zoom);
  return isFinite(z) && z > 0 ? z : 1;
}
function showSelBox(m) {
  const b = ensureSelBox();
  b.style.display = "block";
  updateSelBox(m);
}
function updateSelBox(m) {
  const b = ensureSelBox();
  // m vem em pixels de tela; a caixa é filha do <body> ampliado.
  const z = zoomIF();
  const x = Math.min(m.x0, m.x1) / z,
    y = Math.min(m.y0, m.y1) / z,
    w = Math.abs(m.x1 - m.x0) / z,
    hh = Math.abs(m.y1 - m.y0) / z;
  b.style.left = x + "px";
  b.style.top = y + "px";
  b.style.width = w + "px";
  b.style.height = hh + "px";
}
function hideSelBox() {
  const b = document.getElementById("selbox");
  if (b) b.style.display = "none";
}
/* Quem o laço do Mapa pega: basta ENCOSTAR no disco desenhado. Antes exigia
   que o CENTRO do ponto caísse dentro do retângulo, então passar o laço por
   cima da bolinha não bastava — era preciso cobrir o miolo dela.
   (Mesma regra do laço dos Quadros, ver qNodesInRect.) */
function nodesInRect(svg, m) {
  // m em pixels de TELA; o ponto do grafo em CSS — ver zoomIF.
  const r = svg.getBoundingClientRect(),
    z = zoomIF();
  const x0 = Math.min(m.x0, m.x1),
    x1 = Math.max(m.x0, m.x1),
    y0 = Math.min(m.y0, m.y1),
    y1 = Math.max(m.y0, m.y1);
  const s = new Set();
  nodes.forEach(function (n) {
    const cx = r.left + (n.x * cam.s + cam.x) * z,
      cy = r.top + (n.y * cam.s + cam.y) * z,
      rr = (n.r || 6) * cam.s * z;
    // Ponto do retângulo mais perto do centro do nó; se ele cai dentro do
    // disco, retângulo e bolinha se cruzam.
    const px = Math.max(x0, Math.min(cx, x1)),
      py = Math.max(y0, Math.min(cy, y1));
    const dx = cx - px,
      dy = cy - py;
    if (dx * dx + dy * dy <= rr * rr) s.add(n.id);
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
  /* Esc sai da escrita de um cartão do quadro e deixa o cartão MARCADO —
     daí em diante o teclado do quadro (Del, Ctrl+D, V/H/F/N/T/A) volta a
     valer. Sem isto, escrever prendia o teclado dentro do editor. */
  if (
    e.code === "Escape" &&
    e.target &&
    e.target.classList &&
    e.target.classList.contains("qtxt") &&
    e.target.dataset.qid
  ) {
    e.preventDefault();
    const id = e.target.dataset.qid;
    e.target.blur();
    _qSelSet = new Set([id]);
    if (typeof markSelDom === "function") markSelDom();
    return;
  }
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
      else if (e.code === "KeyF") qSetTool("ficha");
      else if (e.code === "KeyT") qSetTool("texto");
      else if (e.code === "KeyN") qSetTool("nota");
      else if (e.code === "KeyA") qSetTool("seta");
      else if (e.code === "Escape") {
        qSetTool("select");
        _qSelSet = new Set();
        _qSetaSel = new Set();
        _qRebind = null;
        _qRebindCur = null;
        // Nó a meio arraste volta para onde estava.
        if (_qNoDrag) {
          const _q = quadroAtual(),
            _se = _q && _q.setas[_qNoDrag.i];
          if (_se) {
            if (_qNoDrag.t0 == null) delete _se[_qNoDrag.end + "T"];
            else _se[_qNoDrag.end + "T"] = _qNoDrag.t0;
          }
          _qNoDrag = null;
        }
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
    // "?" abre o painel de atalhos (na maioria dos teclados exige Shift)
    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      qAtalhos();
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
      return `<g class="gn" data-id="${esc(n.id)}" data-kind="${n.kind}" data-full="${esc(n.label)}" data-trunc="${wl.trunc ? 1 : 0}" style="cursor:pointer;opacity:${dim ? 0.18 : 1}">
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
    // Tela → CSS (ver zoomIF): a câmera do mapa vive em pixels de CSS.
    const r = svg.getBoundingClientRect(),
      z = zoomIF();
    return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z };
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
      // Shift soma (ou tira) da seleção, sem descartar o resto — mesma
      // regra dos Quadros.
      if (e.shiftKey) {
        if (_selMap.has(d.id)) _selMap.delete(d.id);
        else _selMap.add(d.id);
        draw(svg);
      } else if (_selMap.has(d.id)) {
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
      // Com Shift o laço SOMA ao que já estava marcado (a base fica
      // guardada nele); sem Shift, começa do zero.
      _marq = {
        x0: e.clientX,
        y0: e.clientY,
        x1: e.clientX,
        y1: e.clientY,
        base: e.shiftKey ? new Set(_selMap) : new Set(),
      };
      _selMap = new Set(_marq.base);
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
      // A base é o que já estava marcado quando o laço começou com Shift.
      _selMap = new Set([..._marq.base, ...nodesInRect(svg, _marq)]);
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
      /* Duas réguas (ver zoomIF): `clientX/Y` e `innerWidth/Height` vêm em
         pixels de TELA, mas a dica é filha do <body> ampliado — o `left`
         dela conta em pixels de CSS. Sem dividir pelo zoom, a dica saía
         cada vez mais longe do mouse quanto mais para a direita/baixo do
         canto superior esquerdo (e ficava certinha só no monitor pequeno,
         onde o zoom é 1). */
      var z = zoomIF(),
        pad = 14,
        cx = e.clientX / z,
        cy = e.clientY / z,
        vw = window.innerWidth / z,
        vh = window.innerHeight / z,
        x = cx + pad,
        y = cy + pad,
        bw = t.offsetWidth,
        bh = t.offsetHeight;
      if (x + bw > vw - 8) x = cx - pad - bw;
      if (y + bh > vh - 8) y = cy - pad - bh;
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
      const r = mini.getBoundingClientRect(),
        z = zoomIF();
      const wx = ((e.clientX - r.left) / z - _miniT.ox) / _miniT.s,
        wy = ((e.clientY - r.top) / z - _miniT.oy) / _miniT.s;
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
      const z = zoomIF(); // dx/dy vêm em pixels de tela
      cam.x = _gpan.x + dx / z;
      cam.y = _gpan.y + dy / z;
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
      const r = svg.getBoundingClientRect(),
        z = zoomIF();
      const cx = (p.cx - r.left) / z,
        cy = (p.cy - r.top) / z;
      const w = s2w(cx, cy);
      const ns = Math.max(MAPA_ZOOM_MIN, Math.min(MAPA_ZOOM_MAX, cam.s * p.fator));
      cam.x = cx - w.x * ns + p.dx / z;
      cam.y = cy - w.y * ns + p.dy / z;
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
      const r = svg.getBoundingClientRect(),
        z = zoomIF();
      zoomMapaEm((e.clientX - r.left) / z, (e.clientY - r.top) / z, 1.6);
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
  /* No desktop o painel entra na PILHA de overlays: assim o Esc e o Voltar
     fecham, como em qualquer outro painel. Antes ele só alternava a classe
     e ficava aberto até clicarem de novo no botão. */
  const mt = document.getElementById("maptoggles");
  if (!mt) return;
  if (mt.classList.contains("open")) overlayFechar("maptoggles");
  else overlayAbrir(mt, { id: "maptoggles" });
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


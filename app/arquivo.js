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
  return esc(String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r/g, "\\r").replace(/\n/g, "\\n"));
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
      ${ehSala ? salaDossieJogo(e) : e.descricao ? field("Descrição", `<div class="desc-topicos">${esc(e.descricao)}</div>`) : ""}
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
            const resumo = descResumo(e.descricao) || (e.fatos && e.fatos[0]) || "";
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
// Devolve a URL da imagem da sala como ela é, sem alteração.
//
// Antes esta função apontava para o endpoint de transformação do Supabase
// (/storage/v1/render/image/public/...?width=...&resize=cover) para servir
// miniaturas de ~8KB. Esse recurso é de plano pago: no plano atual o servidor
// responde 403 {"error":"FeatureNotEnabled"} em JSON, e o Chrome descarta a
// resposta com ERR_BLOCKED_BY_ORB (ele bloqueia JSON que chega numa <img>).
// Resultado: cada sala fazia 2 pedidos — um que sempre falhava e o original
// pelo fallback do onerror. Enquanto o redimensionamento não estiver ligado,
// pedir direto o original evita o pedido perdido.
//
// O recorte quadrado dos cards não depende disto: quem faz é o
// `object-fit: cover` do CSS, e as artes das salas já são 512x512 quadradas —
// o `resize=cover` nunca mexeu no enquadramento, só no peso do arquivo.
//
// Para religar as miniaturas depois (plano Pro ou bucket de thumbs próprio),
// basta voltar a montar a URL aqui: todas as telas passam por esta função, e o
// parâmetro `w` (o lado desejado em pixels) continua sendo informado por elas.
function thumbSala(url, w) {
  if (typeof url !== "string") return url || "";
  return url;
}
// Pré-carregava (em segundo plano) as miniaturas das salas já descobertas para
// que a aba Diretório abrisse pronta. Fazia sentido quando cada miniatura tinha
// ~7KB; sem o redimensionamento do Supabase (ver `thumbSala`) isso viraria o
// download das artes inteiras — ~120KB por sala, mais de uma centena delas —
// logo na abertura do app, mesmo para quem nunca abre o Diretório.
//
// Fica desligada até as miniaturas voltarem. As imagens continuam carregando
// normalmente quando o Diretório é aberto: as tags <img> de lá usam
// loading="lazy", então cada card busca a sua na hora em que aparece.
var _thumbsSalasPre = false;
function precarregarThumbsSalas() {
  if (_thumbsSalasPre || typeof Image === "undefined") return;
  _thumbsSalasPre = true;
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
          ${e.descricao ? `<div class="pcard-d">${esc(descResumo(e.descricao))}</div>` : ""}
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
  if (window.NUVEM) window.NUVEM.atualizarStatus();
}

/* ============================================================
   ia.js — Processar pistas com IA (via Edge Function "ia-processar").

   Carregado DEPOIS de online.js. Sem window.MODO_ONLINE + window.IA_ATIVA,
   não faz nada (MVP local intacto; botão ✨ nem aparece).

   Fluxo: botão ✨ na ficha pendente -> junta imagens (links assinados) +
   contexto (listas de salas/personagens/grupos) -> Edge Function (a chave
   da OpenAI vive lá) -> modal de REVISÃO editável -> anti-duplicata ->
   Aplicar (fluxo normal do app: marcarAlterado + autosave + desfazer).
   ============================================================ */
(function () {
  "use strict";
  if (typeof window === "undefined" || !window.MODO_ONLINE || !window.IA_ATIVA)
    return;

  function $(id) {
    return document.getElementById(id);
  }

  // ---- Anti-duplicata (Regra 2): determinístico, sem IA ----
  function iaNormaliza(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
  // Compara as transcrições novas com as pistas JÁ catalogadas (exceto a própria).
  function iaDuplicata(resultado, idProprio) {
    const novas = (resultado.paginas || [])
      .map((p) => iaNormaliza(p.transcricao))
      .filter((t) => t.length >= 25);
    if (!novas.length) return null;
    for (const f of DADOS.fichas) {
      if (f.id === idProprio) continue;
      for (const pg of f.paginas || []) {
        const antiga = iaNormaliza(pg.original);
        if (antiga.length < 25) continue;
        for (const nova of novas) {
          if (nova === antiga || nova.includes(antiga) || antiga.includes(nova)) {
            return { id: f.id, titulo: f.titulo || "(sem título)" };
          }
        }
      }
    }
    return null;
  }

  // ---- Imagens da ficha -> URLs que a OpenAI consegue ver ----
  async function iaImagens(f) {
    const urls = [];
    const avisos = [];
    for (const pg of (f.paginas || []).slice(0, 3)) {
      const im = pg.imagem || "";
      if (im.startsWith("nuvem:")) {
        const r = await window.sb.storage
          .from("imagens")
          .createSignedUrl(im.slice(6), 900); // 15 min bastam
        if (r.data && r.data.signedUrl) urls.push(r.data.signedUrl);
        else avisos.push("não consegui gerar o link de uma imagem");
      } else if (/^https:\/\//i.test(im)) {
        urls.push(im);
      } else if (im.startsWith("data:image/")) {
        urls.push(im);
      } else if (im) {
        avisos.push("uma página usa imagem local (não enviável): " + im);
      }
    }
    return { urls, avisos };
  }

  // ---- Chamada ao porteiro (exposta separada para os testes mockarem) ----
  async function iaChamarFuncao(payload) {
    const sess = await window.sb.auth.getSession();
    const token =
      sess && sess.data && sess.data.session
        ? sess.data.session.access_token
        : null;
    if (!token) throw new Error("sessão expirada — entre de novo.");
    const r = await fetch(window.SUPABASE_URL + "/functions/v1/ia-processar", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        apikey: window.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const res = await r.json().catch(() => ({}));
    if (!r.ok || res.error) throw new Error(res.error || "HTTP " + r.status);
    return res;
  }

  // ---- Botão ✨: processa a ficha e abre a revisão ----
  async function iaProcessarPista(id) {
    const f = DADOS.fichas.find((x) => x.id === id);
    if (!f) return;
    try {
      if (typeof toast === "function")
        toast("✨ Enviando para a IA… (alguns segundos)", 5000);
      const { urls, avisos } = await window.IA.imagens(f);
      if (!urls.length) {
        alert(
          "Esta pista não tem imagem que a IA consiga ver (anexe uma foto primeiro)." +
            (avisos.length ? "\n\n" + avisos.join("\n") : ""),
        );
        return;
      }
      const payload = {
        imagens: urls,
        salas: DADOS.salas.map((s) => s.nome),
        personagens: DADOS.personagens.map(
          (p) =>
            p.nome +
            ((p.aliases || []).length ? " (apelidos: " + p.aliases.join(", ") + ")" : ""),
        ),
        grupos: DADOS.grupos.map((g) => g.nome),
      };
      const res = await window.IA.chamar(payload);
      const dup = window.IA.duplicata(res.resultado, id);
      iaAbrirRevisao(id, res.resultado, dup, avisos, res.uso, res.modelo);
    } catch (e) {
      alert("Não consegui processar: " + (e && e.message ? e.message : e));
    }
  }

  // ---- Modal de revisão (nada é gravado sem o OK do usuário) ----
  function iaAbrirRevisao(id, r, dup, avisos, uso, modelo) {
    let m = $("iamodal");
    if (!m) {
      m = document.createElement("div");
      m.id = "iamodal";
      m.className = "modal";
      document.body.appendChild(m);
    }
    const f = DADOS.fichas.find((x) => x.id === id);
    const pgs = (r.paginas || []).map(
      (p, i) => `
      <div class="gsec card" style="margin-top:8px">
        <h3>📄 Página ${i + 1}</h3>
        <div class="field"><label>Original (EN)</label><textarea id="ia-orig-${i}" class="edinput" rows="4">${esc(p.transcricao || "")}</textarea></div>
        <div class="field"><label>Tradução (PT)</label><textarea id="ia-trad-${i}" class="edinput" rows="4">${esc(p.traducao || "")}</textarea></div>
      </div>`,
    );
    const opcoesGrupo =
      '<option value="">(sem grupo)</option>' +
      DADOS.grupos
        .map(
          (g) =>
            `<option value="${esc(g.nome)}"${g.nome === r.grupo ? " selected" : ""}>${esc(g.nome)}</option>`,
        )
        .join("");
    m.innerHTML = `<div class="modalbox" style="max-width:720px"><div class="modalhd"><h2>✨ Revisar o que a IA preencheu — <span class="idref">${esc(id)}</span></h2><button class="close" onclick="document.getElementById('iamodal').classList.remove('open')">✕</button></div>
      <div class="modalbody">
        ${dup ? `<div class="auth-msg show erro" style="max-height:none">⚠️ <b>Possível duplicata:</b> a transcrição bate com a pista <b>${esc(dup.id)} — ${esc(dup.titulo)}</b>. Confira antes de aplicar (talvez seja melhor atualizar aquela e excluir esta).</div>` : ""}
        ${avisos && avisos.length ? `<div class="auth-msg show info" style="max-height:none">${esc(avisos.join(" · "))}</div>` : ""}
        ${r.observacoes ? `<div class="auth-msg show info" style="max-height:none">🗒 IA: ${esc(r.observacoes)}</div>` : ""}
        <div class="field"><label>Título</label><input id="ia-titulo" class="edinput" value="${esc(r.titulo || "")}"></div>
        ${pgs.join("")}
        <div class="field"><label>Resumo (o que a pista diz)</label><textarea id="ia-resumo" class="edinput" rows="3">${esc(r.resumo || "")}</textarea></div>
        <div class="field"><label>Personagens já existentes (separados por ;)</label><input id="ia-pex" class="edinput" value="${esc((r.personagens_existentes || []).join("; "))}"></div>
        <div class="field"><label>Personagens NOVOS a criar (separados por ; — apague os indesejados)</label><input id="ia-pnov" class="edinput" value="${esc((r.personagens_novos || []).join("; "))}"></div>
        <div class="field"><label>Grupo</label><select id="ia-grupo" class="edinput">${opcoesGrupo}</select></div>
        ${r.grupo_sugerido && !r.grupo ? `<div class="field"><label><input type="checkbox" id="ia-grupo-novo-ok"> Criar e usar o grupo novo sugerido: <b>${esc(r.grupo_sugerido)}</b></label></div>` : ""}
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="topbtn" onclick="document.getElementById('iamodal').classList.remove('open')">Cancelar</button>
          <button class="topbtn primary" onclick="window.IA.aplicarDoModal('${esc(id)}')">✔ Aplicar na ficha</button>
        </div>
        ${uso ? `<div class="dica" style="text-align:right;margin-top:6px">modelo ${esc(modelo || "?")} · ${uso.entrada || "?"} tokens entrada · ${uso.saida || "?"} saída</div>` : ""}
      </div></div>`;
    m.classList.add("open");
    m._iaSugestaoGrupo = r.grupo_sugerido || "";
  }

  // Lê o modal (com as edições do usuário) e aplica na ficha.
  function iaAplicarDoModal(id) {
    const m = $("iamodal");
    const lerLista = (elId) =>
      (($(elId) || {}).value || "")
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean);
    const paginas = [];
    for (let i = 0; ; i++) {
      const o = $("ia-orig-" + i);
      if (!o) break;
      paginas.push({
        transcricao: o.value,
        traducao: ($("ia-trad-" + i) || {}).value || "",
      });
    }
    const r = {
      titulo: ($("ia-titulo") || {}).value || "",
      paginas,
      resumo: ($("ia-resumo") || {}).value || "",
      personagens_existentes: lerLista("ia-pex"),
      personagens_novos: lerLista("ia-pnov"),
      grupo: ($("ia-grupo") || {}).value || "",
      grupo_sugerido:
        $("ia-grupo-novo-ok") && $("ia-grupo-novo-ok").checked
          ? m._iaSugestaoGrupo
          : "",
    };
    iaAplicar(id, r);
    if (m) m.classList.remove("open");
  }

  // Quando a FILA em massa está rodando, o aplicar não abre o painel da
  // ficha nem dispara toast individual (seria 1 por pista).
  let _loteRodando = false;

  // Aplica um resultado (da IA ou editado) na ficha — testável sem tela.
  function iaAplicar(id, r) {
    const f = DADOS.fichas.find((x) => x.id === id);
    if (!f) return false;
    if (r.titulo) f.titulo = r.titulo;
    f.paginas = f.paginas || [];
    (r.paginas || []).forEach(function (p, i) {
      if (!f.paginas[i])
        f.paginas[i] = { imagem: "", original: "", traducao: "", explica: "", rotulo: "" };
      f.paginas[i].original = p.transcricao || "";
      f.paginas[i].traducao = p.traducao || "";
    });
    if (r.resumo && f.paginas[0]) f.paginas[0].explica = r.resumo;
    // Personagens: novos são criados; a ficha marca existentes + novos.
    const nomes = [];
    (r.personagens_existentes || []).forEach(function (n) {
      const limpo = n.replace(/\s*\(apelidos:.*\)$/i, "").trim();
      if (limpo) nomes.push(limpo);
    });
    (r.personagens_novos || []).forEach(function (n) {
      const limpo = n.trim();
      if (!limpo) return;
      if (!DADOS.personagens.some((p) => p.nome === limpo)) {
        DADOS.personagens.push({
          nome: limpo,
          imagem: "",
          descricao: "",
          fatos: [],
          notas: "",
          aliases: [],
        });
      }
      nomes.push(limpo);
    });
    if (nomes.length) f.personagens = [...new Set(nomes)];
    // Grupo: existente escolhido, ou novo aprovado pelo usuário.
    let grupo = r.grupo || "";
    if (!grupo && r.grupo_sugerido) {
      const nomeNovo = r.grupo_sugerido.trim();
      if (nomeNovo) {
        if (!DADOS.grupos.some((g) => g.nome === nomeNovo)) {
          DADOS.grupos.push({
            nome: nomeNovo,
            cor: "#5b6b86",
            imagem: "",
            descricao: "",
            fatos: [],
            notas: "",
          });
        }
        grupo = nomeNovo;
      }
    }
    if (grupo) f.grupos = [grupo];
    f.pendente = false; // processada!
    if (typeof marcarAlterado === "function") marcarAlterado();
    if (typeof rebuildFilters === "function") rebuildFilters();
    if (typeof render === "function") render();
    if (!_loteRodando) {
      if (typeof abrir === "function") abrir(id); // reabre o painel atualizado
      if (typeof toast === "function") toast("✨ Ficha preenchida pela IA ✓", 3000);
    }
    return true;
  }

  /* ===========================================================
     FILA EM MASSA — processa N pistas, UMA POR VEZ.
     Cada pista é 1 chamada independente à Edge Function (conversa
     isolada: regras + contexto + a foto DAQUELA pista). Nada de
     misturar pistas num mesmo chat.
     - anti-duplicata determinístico ANTES de aplicar (bateu -> pula)
     - erro: 1 nova tentativa; persistiu -> pula e a fila continua
     - pausar/cancelar a qualquer momento; cada aplicação salva na
       nuvem na hora (autosave), então retomar é só clicar de novo.
     =========================================================== */
  let _lote = null;

  function iaPayloadDe(urls) {
    return {
      imagens: urls,
      salas: DADOS.salas.map((s) => s.nome),
      personagens: DADOS.personagens.map(
        (p) =>
          p.nome +
          ((p.aliases || []).length ? " (apelidos: " + p.aliases.join(", ") + ")" : ""),
      ),
      grupos: DADOS.grupos.map((g) => g.nome),
    };
  }

  async function iaProcessarLote(ids) {
    if (_lote && _lote.rodando) {
      alert("Já existe um processamento em andamento (veja o painel no canto).");
      return;
    }
    const fila = (ids || []).filter((id) => {
      const f = DADOS.fichas.find((x) => x.id === id);
      return f && f.pendente;
    });
    if (!fila.length) {
      alert("Nenhuma pista pendente (⏳) para processar.");
      return;
    }
    const min = Math.max(1, Math.round((fila.length * 12) / 60));
    if (
      !confirm(
        "Processar " +
          fila.length +
          " pista(s) com a IA?\n\n" +
          "Tempo estimado: ~" +
          min +
          " min (uma por vez, cada uma numa conversa própria).\n" +
          "As fichas serão preenchidas automaticamente, sem revisão individual.\n" +
          "Duplicatas e erros são pulados e listados no final.",
      )
    )
      return;
    _lote = {
      total: fila.length,
      feitas: 0,
      ok: 0,
      puladas: [],
      erros: [],
      pausado: false,
      cancelado: false,
      rodando: true,
    };
    _loteRodando = true;
    iaLotePainel();
    for (const id of fila) {
      if (_lote.cancelado) break;
      while (_lote.pausado && !_lote.cancelado)
        await new Promise((r) => setTimeout(r, 300));
      if (_lote.cancelado) break;
      await iaLoteUma(id);
      _lote.feitas++;
      iaLotePainel();
    }
    _lote.rodando = false;
    _loteRodando = false;
    iaLoteFim();
  }

  async function iaLoteUma(id) {
    const f = DADOS.fichas.find((x) => x.id === id);
    if (!f || !f.pendente) {
      _lote.puladas.push({ id: id, motivo: "já processada" });
      return;
    }
    try {
      const { urls } = await window.IA.imagens(f);
      if (!urls.length) {
        _lote.puladas.push({ id: id, motivo: "sem imagem que a IA veja" });
        return;
      }
      let res;
      try {
        res = await window.IA.chamar(iaPayloadDe(urls));
      } catch (e1) {
        // 1 nova tentativa (rede/instabilidade); persistiu -> cai no catch de fora
        res = await window.IA.chamar(iaPayloadDe(urls));
      }
      const dup = window.IA.duplicata(res.resultado, id);
      if (dup) {
        _lote.puladas.push({ id: id, motivo: "possível duplicata de " + dup.id });
        return;
      }
      window.IA.aplicar(id, res.resultado);
      _lote.ok++;
    } catch (e) {
      _lote.erros.push({ id: id, motivo: (e && e.message) || String(e) });
    }
  }

  /* ---- painel de progresso (canto inferior direito) ---- */
  function iaLotePainel() {
    let p = $("ialote");
    if (!p) {
      p = document.createElement("div");
      p.id = "ialote";
      document.body.appendChild(p);
    }
    const L = _lote;
    const pct = L.total ? Math.round((L.feitas / L.total) * 100) : 0;
    p.innerHTML = `
      <div class="il-head">✨ Processando ${L.feitas}/${L.total}</div>
      <div class="il-stats">✓ ${L.ok} aplicadas · ⏭ ${L.puladas.length} puladas · ⚠ ${L.erros.length} erros</div>
      <div class="il-bar"><span style="width:${pct}%"></span></div>
      <div class="il-btns">
        <button class="dbtn" onclick="window.IA.lotePausa()">${L.pausado ? "▶ Continuar" : "⏸ Pausar"}</button>
        <button class="dbtn" onclick="window.IA.loteCancela()">✕ Cancelar</button>
      </div>`;
  }
  function iaLoteFim() {
    const p = $("ialote");
    if (!p || !_lote) return;
    const L = _lote;
    const item = (x, ic) =>
      `<div class="il-item" onclick="abrir('${esc(x.id)}')">${ic} <b>${esc(x.id)}</b> — ${esc(x.motivo)}</div>`;
    const lista =
      L.puladas.map((x) => item(x, "⏭")).join("") +
      L.erros.map((x) => item(x, "⚠")).join("");
    p.innerHTML = `
      <div class="il-head">${L.cancelado ? "✕ Processamento cancelado" : "✨ Processamento concluído"}</div>
      <div class="il-stats">✓ ${L.ok} aplicadas · ⏭ ${L.puladas.length} puladas · ⚠ ${L.erros.length} erros</div>
      ${lista ? `<div class="il-lista">${lista}</div>` : ""}
      <div class="il-btns"><button class="dbtn" onclick="document.getElementById('ialote').remove()">Fechar</button></div>`;
    if (typeof toast === "function")
      toast(
        (L.cancelado ? "Lote cancelado — " : "Lote concluído — ") +
          "✓ " + L.ok + " · ⏭ " + L.puladas.length + " · ⚠ " + L.erros.length,
        5000,
      );
  }
  function iaLotePausa() {
    if (!_lote || !_lote.rodando) return;
    _lote.pausado = !_lote.pausado;
    iaLotePainel();
  }
  function iaLoteCancela() {
    if (!_lote || !_lote.rodando) return;
    _lote.cancelado = true;
    _lote.pausado = false;
  }

  // API pública (o botão usa; os testes mockam window.IA.chamar).
  window.IA = {
    processar: iaProcessarPista,
    chamar: iaChamarFuncao,
    imagens: iaImagens,
    duplicata: iaDuplicata,
    normaliza: iaNormaliza,
    aplicar: iaAplicar,
    aplicarDoModal: iaAplicarDoModal,
    processarLote: iaProcessarLote,
    lotePausa: iaLotePausa,
    loteCancela: iaLoteCancela,
    loteEstado: function () {
      return _lote;
    },
  };
  window.iaProcessarPista = iaProcessarPista;
})();

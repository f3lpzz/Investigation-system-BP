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
  let _abortAtual = null;

  // ---- Anti-duplicata (Regra 2): determinístico, sem IA ----
  // Remove os marcadores entre colchetes ([Ilustração: …], [ilegível]) antes de
  // comparar: pistas antigas (sem eles) continuam batendo com as novas.
  function iaNormaliza(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\[[^\]\n]*\]/g, " ")
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
          if (
            nova === antiga ||
            nova.includes(antiga) ||
            antiga.includes(nova)
          ) {
            return { id: f.id, titulo: f.titulo || "(sem título)" };
          }
        }
      }
    }
    return null;
  }

  // ---- Imagens da ficha -> URLs que a OpenAI consegue ver ----
  async function iaImagens(f) {
    const paginas = f.paginas || [];
    if (paginas.length > 3)
      throw new Error(
        "A IA aceita até 3 páginas por ficha. Separe as páginas em fichas menores antes de processar.",
      );
    // As URLs assinadas são independentes: gerar em paralelo evita somar uma
    // ida ao Storage por página antes mesmo de a IA começar.
    const resultados = await Promise.all(
      paginas.map(async function (pg) {
        const im = pg.imagem || "";
        if (im.startsWith("nuvem:")) {
          const r = await window.sb.storage
            .from("imagens")
            .createSignedUrl(im.slice(6), 900); // 15 min bastam
          return r.data && r.data.signedUrl
            ? { url: r.data.signedUrl }
            : { aviso: "não consegui gerar o link de uma imagem" };
        } else if (/^https:\/\//i.test(im)) {
          return { url: im };
        } else if (im.startsWith("data:image/")) {
          return { url: im };
        } else if (im) {
          return { aviso: "uma página usa imagem local (não enviável): " + im };
        }
        return { aviso: "uma página está sem imagem" };
      }),
    );
    const urls = resultados.map((x) => x.url).filter(Boolean);
    const avisos = resultados.map((x) => x.aviso).filter(Boolean);
    if (urls.length !== paginas.length)
      throw new Error(
        "Não consegui enviar todas as páginas. Confira as imagens e tente novamente; nenhum texto foi alterado.",
      );
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
    if (_abortAtual)
      throw new Error("já existe uma chamada da IA em andamento");
    const controller = new AbortController();
    _abortAtual = controller;
    let expirou = false;
    const timer = setTimeout(function () {
      expirou = true;
      controller.abort();
    }, 125000);
    try {
      const r = await fetch(
        window.SUPABASE_URL + "/functions/v1/ia-processar",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            apikey: window.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      const res = await r.json().catch(() => ({}));
      if (!r.ok || res.error) {
        const erro = new Error(res.error || "HTTP " + r.status);
        // Só instabilidade temporária merece a segunda tentativa do lote.
        erro.tentavel = r.status === 408 || r.status >= 500;
        throw erro;
      }
      return res;
    } catch (e) {
      if (e && e.name === "AbortError") {
        const erro = new Error(
          expirou
            ? "a IA demorou demais; tente novamente"
            : "processamento cancelado",
        );
        erro.tentavel = false;
        erro.cancelado = !expirou;
        throw erro;
      }
      throw e;
    } finally {
      clearTimeout(timer);
      if (_abortAtual === controller) _abortAtual = null;
    }
  }

  async function iaChamarComRetry(payload) {
    try {
      return await window.IA.chamar(payload);
    } catch (erro) {
      if (erro && erro.tentavel === false) throw erro;
      return window.IA.chamar(payload);
    }
  }

  function iaCancelarTudo() {
    if (_lote && _lote.rodando) {
      _lote.cancelado = true;
      _lote.pausado = false;
    }
    if (_abortAtual) _abortAtual.abort();
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
            ((p.aliases || []).length
              ? " (apelidos: " + p.aliases.join(", ") + ")"
              : ""),
        ),
        grupos: DADOS.grupos.map((g) => g.nome),
      };
      const res = await window.IA.chamar(payload);
      if (DADOS.fichas.find((x) => x.id === id) !== f) return;
      validarPaginas(f, res.resultado);
      const dup = window.IA.duplicata(res.resultado, id);
      iaAbrirRevisao(id, res.resultado, dup, avisos, res.uso, res.modelo);
    } catch (e) {
      if (e && e.cancelado) return;
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
    const gruposAtuais = f.grupos || [];
    const personagensIniciais = [
      ...new Set([
        ...(f.personagens || []),
        ...(r.personagens_existentes || []),
      ]),
    ].filter((nome) => !(r.personagens_novos || []).includes(nome));
    const pgs = (r.paginas || []).map(
      (p, i) => {
        const imagem = (f.paginas[i] || {}).imagem;
        return `
      <section class="ia-review-page" aria-labelledby="ia-page-title-${i}">
        <div class="ia-review-section-head">
          <h3 id="ia-page-title-${i}">Página ${i + 1}</h3>
          <span>Confira o texto com a imagem</span>
        </div>
        <div class="ia-review-page-layout${imagem ? " has-image" : ""}">
          ${imagem ? `<button type="button" class="ia-review-image" onclick="abrirLightbox(this.querySelector('img').src)" aria-label="Ampliar imagem da página ${i + 1}"><img src="${esc(imagem)}" alt="Imagem original da página ${i + 1}" onerror="this.closest('button').style.display='none'"><span>Ampliar imagem ↗</span></button>` : ""}
          <div class="ia-review-texts">
            <div class="ia-review-field"><label for="ia-orig-${i}">Transcrição original <span>EN</span></label><textarea id="ia-orig-${i}" class="edinput ia-review-textarea" rows="8" spellcheck="false">${esc(p.transcricao || "")}</textarea></div>
            <div class="ia-review-field"><label for="ia-trad-${i}">Tradução <span>PT</span></label><textarea id="ia-trad-${i}" class="edinput ia-review-textarea" rows="8">${esc(p.traducao || "")}</textarea></div>
          </div>
        </div>
      </section>`;
      },
    );
    const opcoesGrupo =
      `<option value="">${gruposAtuais.length ? "Manter grupos atuais" : "Sem grupo"}</option>` +
      DADOS.grupos
        .map(
          (g) =>
            `<option value="${esc(g.nome)}"${g.nome === r.grupo ? " selected" : ""}>${esc(g.nome)}</option>`,
        )
        .join("") +
      (gruposAtuais.length
        ? '<option value="__ia_sem_grupo__">Remover grupos da ficha</option>'
        : "") +
      (r.grupo_sugerido && !r.grupo
        ? `<option value="__ia_novo_grupo__">Criar grupo: ${esc(r.grupo_sugerido)}</option>`
        : "");
    m.innerHTML = `<div class="modalbox ia-review" role="dialog" aria-modal="true" aria-labelledby="ia-review-title" aria-describedby="ia-review-intro">
      <div class="modalhd ia-review-header">
        <div><div class="ia-review-kicker">REVISÃO DA IA · FICHA ${esc(id)}</div><h2 id="ia-review-title">Conferir dados da pista</h2><p id="ia-review-intro">Compare com a imagem e ajuste as informações antes de salvar na ficha.</p></div>
        <button type="button" class="close" aria-label="Fechar revisão" onclick="document.getElementById('iamodal').classList.remove('open')">✕</button>
      </div>
      <div class="modalbody ia-review-body">
        ${dup ? `<div class="auth-msg show erro ia-review-alert" style="max-height:none">⚠️ <b>Possível duplicata:</b> o texto coincide com <b>${esc(dup.id)} — ${esc(dup.titulo)}</b>. Confira as duas fichas antes de aplicar.</div>` : ""}
        ${avisos && avisos.length ? `<div class="auth-msg show info ia-review-alert" style="max-height:none">${esc(avisos.join(" · "))}</div>` : ""}
        ${r.observacoes ? `<div class="auth-msg show info ia-review-alert" style="max-height:none"><b>Observação da IA:</b> ${esc(r.observacoes)}</div>` : ""}
        <section class="ia-review-section" aria-labelledby="ia-review-identidade">
          <div class="ia-review-section-head"><h3 id="ia-review-identidade">Identificação</h3><span>Como esta pista aparecerá no catálogo</span></div>
          <div class="ia-review-field"><label for="ia-titulo">Título da ficha</label><input id="ia-titulo" class="edinput" value="${esc(r.titulo || f.titulo || "")}" required><small>Use um nome curto que ajude a reconhecer a pista.</small></div>
        </section>
        <section class="ia-review-section" aria-labelledby="ia-review-conteudo">
          <div class="ia-review-section-head"><h3 id="ia-review-conteudo">Conteúdo da pista</h3><span>Transcrição e tradução por página</span></div>
          <div class="ia-review-pages">${pgs.join("")}</div>
          <div class="ia-review-field ia-review-summary"><label for="ia-resumo">Resumo</label><textarea id="ia-resumo" class="edinput" rows="3">${esc(r.resumo || (f.paginas[0] || {}).explica || "")}</textarea><small>Explique em poucas frases o que a pista revela. Esse texto aparece na ficha.</small></div>
        </section>
        <section class="ia-review-section" aria-labelledby="ia-review-vinculos">
          <div class="ia-review-section-head"><h3 id="ia-review-vinculos">Vínculos</h3><span>Relacione a pista ao arquivo</span></div>
          <div class="ia-review-links">
            <div class="ia-review-field"><label for="ia-pex">Personagens existentes</label><input id="ia-pex" class="edinput" value="${esc(personagensIniciais.join("; "))}" placeholder="Nome 1; Nome 2"><small>Vincula personagens já cadastrados. Separe os nomes com ponto e vírgula.</small></div>
            <div class="ia-review-field"><label for="ia-pnov">Novos personagens</label><input id="ia-pnov" class="edinput" value="${esc((r.personagens_novos || []).join("; "))}" placeholder="Nome 1; Nome 2"><small>Estes nomes criarão fichas de personagem. Remova os que não desejar.</small></div>
            <div class="ia-review-field"><label for="ia-grupo">Grupo da pista</label><select id="ia-grupo" class="edinput">${opcoesGrupo}</select><small>${gruposAtuais.length ? `Atuais: ${esc(gruposAtuais.join(", "))}. Escolha uma alteração ou mantenha como está.` : "Escolha um grupo existente, crie o sugerido ou deixe sem grupo."}</small></div>
          </div>
        </section>
      </div>
      <div class="ia-review-footer">
        ${uso ? `<details class="ia-review-details"><summary>Detalhes do processamento</summary><span>${esc(modelo || "Modelo desconhecido")} · ${uso.entrada || "?"} tokens de entrada · ${uso.saida || "?"} de saída</span></details>` : "<span></span>"}
        <div class="ia-review-actions"><button type="button" class="topbtn" onclick="document.getElementById('iamodal').classList.remove('open')">Cancelar</button><button type="button" class="topbtn primary" onclick="window.IA.aplicarDoModal('${esc(id)}')">Aplicar à ficha</button></div>
      </div>
    </div>`;
    m.classList.add("open");
    m._iaSugestaoGrupo = r.grupo_sugerido || "";
    $("ia-titulo").focus();
  }

  // Lê o modal (com as edições do usuário) e aplica na ficha.
  function iaAplicarDoModal(id) {
    const m = $("iamodal");
    const titulo = $("ia-titulo");
    if (!titulo.value.trim()) {
      titulo.setCustomValidity("Informe um título para a ficha.");
      titulo.reportValidity();
      titulo.focus();
      titulo.addEventListener("input", () => titulo.setCustomValidity(""), {
        once: true,
      });
      return;
    }
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
    const escolhaGrupo = ($("ia-grupo") || {}).value || "";
    const r = {
      titulo: titulo.value.trim(),
      paginas,
      resumo: ($("ia-resumo") || {}).value || "",
      personagens_existentes: lerLista("ia-pex"),
      personagens_novos: lerLista("ia-pnov"),
      grupo: escolhaGrupo === "__ia_novo_grupo__" ? "" : escolhaGrupo,
      grupo_sugerido:
        escolhaGrupo === "__ia_novo_grupo__" ? m._iaSugestaoGrupo : "",
      grupo_limpar: escolhaGrupo === "__ia_sem_grupo__",
    };
    iaAplicar(id, r, true);
    if (m) m.classList.remove("open");
  }

  // Quando a FILA em massa está rodando, o aplicar não abre o painel da
  // ficha nem dispara toast individual (seria 1 por pista).
  let _loteRodando = false;

  // Aplica um resultado (da IA ou editado) na ficha — testável sem tela.
  function validarPaginas(f, r) {
    if (
      !r ||
      !Array.isArray(r.paginas) ||
      r.paginas.length !== (f.paginas || []).length ||
      r.paginas.some(
        (p) =>
          !p ||
          typeof p.transcricao !== "string" ||
          typeof p.traducao !== "string",
      )
    )
      throw new Error(
        "A IA não devolveu todas as páginas na ordem esperada. Nenhum texto foi alterado; tente novamente.",
      );
  }
  function iaAplicar(id, r, substituirVazios = false) {
    const f = DADOS.fichas.find((x) => x.id === id);
    if (!f) return false;
    validarPaginas(f, r);
    if (r.titulo) f.titulo = r.titulo;
    f.paginas = f.paginas || [];
    (r.paginas || []).forEach(function (p, i) {
      if (!f.paginas[i])
        f.paginas[i] = {
          imagem: "",
          original: "",
          traducao: "",
          explica: "",
          rotulo: "",
        };
      f.paginas[i].original = p.transcricao || "";
      f.paginas[i].traducao = p.traducao || "";
    });
    if (f.paginas[0] && (substituirVazios || r.resumo))
      f.paginas[0].explica = r.resumo || "";
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
    if (substituirVazios || nomes.length)
      f.personagens = [...new Set(nomes)];
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
    if (r.grupo_limpar) f.grupos = [];
    else if (grupo) f.grupos = [grupo];
    f.pendente = false; // processada!
    if (typeof marcarAlterado === "function") marcarAlterado();
    if (typeof rebuildFilters === "function") rebuildFilters();
    if (typeof render === "function") render();
    if (!_loteRodando) {
      if (typeof abrir === "function") abrir(id); // reabre o painel atualizado
      if (typeof toast === "function")
        toast("✨ Ficha preenchida pela IA ✓", 3000);
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
          ((p.aliases || []).length
            ? " (apelidos: " + p.aliases.join(", ") + ")"
            : ""),
      ),
      grupos: DADOS.grupos.map((g) => g.nome),
    };
  }

  // Passo 1: valida e abre a CONFIRMAÇÃO (modal do sistema, não confirm nativo).
  let _loteFilaPrep = null;
  function iaProcessarLote(ids) {
    if (_lote && _lote.rodando) {
      if (typeof toast === "function")
        toast(
          "Já existe um processamento em andamento (painel no canto).",
          4000,
        );
      return;
    }
    const fila = (ids || []).filter((id) => {
      const f = DADOS.fichas.find((x) => x.id === id);
      return f && f.pendente;
    });
    if (!fila.length) {
      if (typeof toast === "function")
        toast("Nenhuma pista pendente (⏳) para processar.", 4000);
      return;
    }
    _loteFilaPrep = fila;
    const min = Math.max(1, Math.round((fila.length * 12) / 60));
    let m = $("ialoteconf");
    if (!m) {
      m = document.createElement("div");
      m.id = "ialoteconf";
      m.className = "modal";
      document.body.appendChild(m);
    }
    m.innerHTML = `<div class="modalbox" style="max-width:460px"><div class="modalhd"><h2>✨ Processar com a IA</h2><button class="close" onclick="window.IA.loteConfFechar()">✕</button></div>
      <div class="savehelp">
        <p class="dica" style="font-size:13px"><b>${fila.length} pista(s)</b> serão processadas, <b>uma por vez</b> — cada uma numa conversa própria da IA.</p>
        <p class="dica">⏱ Tempo estimado: <b>~${min} min</b></p>
        <p class="dica">As fichas serão preenchidas automaticamente, sem revisão individual (você revisa depois). Possíveis duplicatas e erros são <b>pulados</b> e listados no final.</p>
        <div class="editbtns">
          <button class="dbtn save" onclick="window.IA.loteIniciar()">✨ Processar ${fila.length} pista(s)</button>
          <button class="dbtn" onclick="window.IA.loteConfFechar()">Cancelar</button>
        </div>
      </div></div>`;
    m.classList.add("open");
  }
  function iaLoteConfFechar() {
    const m = $("ialoteconf");
    if (m) m.classList.remove("open");
    _loteFilaPrep = null;
  }
  // Passo 2: o botão do modal inicia a fila de verdade.
  async function iaLoteIniciar() {
    const fila = _loteFilaPrep;
    const m = $("ialoteconf");
    if (m) m.classList.remove("open");
    _loteFilaPrep = null;
    if (!fila || !fila.length) return;
    _lote = {
      tipo: "pista",
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
      const res = await iaChamarComRetry(iaPayloadDe(urls));
      if (_lote.cancelado || DADOS.fichas.find((x) => x.id === id) !== f)
        return;
      validarPaginas(f, res.resultado);
      const dup = window.IA.duplicata(res.resultado, id);
      if (dup) {
        _lote.puladas.push({
          id: id,
          motivo: "possível duplicata de " + dup.id,
        });
        return;
      }
      window.IA.aplicar(id, res.resultado);
      _lote.ok++;
    } catch (e) {
      if (_lote.cancelado) return;
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
    const verbo = L.tipo === "persona" ? "Descrevendo" : "Processando";
    const lab = L.tipo === "persona" ? "descritos" : "aplicadas";
    p.innerHTML = `
      <div class="il-head">✨ ${verbo} ${L.feitas}/${L.total}</div>
      <div class="il-stats">✓ ${L.ok} ${lab} · ⏭ ${L.puladas.length} puladas · ⚠ ${L.erros.length} erros</div>
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
    const lab = L.tipo === "persona" ? "descritos" : "aplicadas";
    const item = (x, ic) =>
      L.tipo === "persona"
        ? `<div class="il-item" onclick="abrirEntidade('pessoa','${typeof jsq === "function" ? jsq(x.id) : esc(x.id)}')">${ic} <b>${esc(x.id)}</b> — ${esc(x.motivo)}</div>`
        : `<div class="il-item" onclick="abrir('${esc(x.id)}')">${ic} <b>${esc(x.id)}</b> — ${esc(x.motivo)}</div>`;
    const lista =
      L.puladas.map((x) => item(x, "⏭")).join("") +
      L.erros.map((x) => item(x, "⚠")).join("");
    p.innerHTML = `
      <div class="il-head">${L.cancelado ? "✕ Processamento cancelado" : "✨ Processamento concluído"}</div>
      <div class="il-stats">✓ ${L.ok} ${lab} · ⏭ ${L.puladas.length} puladas · ⚠ ${L.erros.length} erros</div>
      ${lista ? `<div class="il-lista">${lista}</div>` : ""}
      <div class="il-btns"><button class="dbtn" onclick="document.getElementById('ialote').remove()">Fechar</button></div>`;
    if (typeof toast === "function")
      toast(
        (L.cancelado ? "Lote cancelado — " : "Lote concluído — ") +
          "✓ " +
          L.ok +
          " · ⏭ " +
          L.puladas.length +
          " · ⚠ " +
          L.erros.length,
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
    iaCancelarTudo();
  }

  /* ===========================================================
     RECEITA 2 — DOSSIÊS DE PERSONAGENS
     Para cada personagem elegível, UMA chamada com TODAS as pistas
     que o citam (dossiê completo); personagens processados um por
     vez na mesma fila/painel. Elegível se: nunca processado, OU o
     conjunto de pistas que o citam mudou desde a última vez
     (guardado no campo aditivo personagem.ia_desc).
     =========================================================== */
  function iaPersonaCitacoes(nome) {
    return DADOS.fichas
      .filter((f) =>
        (f.personagens || []).some((pp) => nomeCanon(pp) === nomeCanon(nome)),
      )
      .map((f) => f.id)
      .sort();
  }
  function iaPersonasElegiveis() {
    return (DADOS.personagens || [])
      .filter((p) => p && p.nome)
      .map((p) => ({ nome: p.nome, fichas: iaPersonaCitacoes(p.nome) }))
      .filter((it) => {
        if (!it.fichas.length) return false; // nada citando -> nada a contar
        const p = DADOS.personagens.find((x) => x.nome === it.nome);
        const feito =
          p.ia_desc && Array.isArray(p.ia_desc.fichas)
            ? [...p.ia_desc.fichas].sort()
            : null;
        return !feito || JSON.stringify(feito) !== JSON.stringify(it.fichas);
      });
  }
  let _personaPrep = null;
  // nomes: opcional (restringe); force: ignora o "já processado" (regerar 1)
  function iaPersonasProcessar(nomes, force) {
    if (_lote && _lote.rodando) {
      if (typeof toast === "function")
        toast(
          "Já existe um processamento em andamento (painel no canto).",
          4000,
        );
      return;
    }
    let alvo;
    if (force && nomes && nomes.length) {
      alvo = nomes
        .map((n) => ({ nome: nomeCanon(n), fichas: iaPersonaCitacoes(n) }))
        .filter((it) => it.fichas.length);
    } else {
      alvo = iaPersonasElegiveis();
      if (nomes && nomes.length) {
        const canon = nomes.map((n) => nomeCanon(n));
        alvo = alvo.filter((it) => canon.includes(it.nome));
      }
    }
    if (!alvo.length) {
      if (typeof toast === "function")
        toast(
          "Nenhum personagem elegível (precisa ser citado em pistas e ter novidade desde a última descrição).",
          5000,
        );
      return;
    }
    _personaPrep = alvo;
    const min = Math.max(1, Math.round((alvo.length * 10) / 60));
    let m = $("ialoteconf");
    if (!m) {
      m = document.createElement("div");
      m.id = "ialoteconf";
      m.className = "modal";
      document.body.appendChild(m);
    }
    m.innerHTML = `<div class="modalbox" style="max-width:460px"><div class="modalhd"><h2>✨ Descrever personagens</h2><button class="close" onclick="window.IA.loteConfFechar()">✕</button></div>
      <div class="savehelp">
        <p class="dica" style="font-size:13px"><b>${alvo.length} personagem(ns)</b> serão descritos, <b>um por vez</b> — cada um numa conversa própria da IA, lendo TODAS as pistas que o citam.</p>
        <p class="dica">⏱ Tempo estimado: <b>~${min} min</b></p>
        <p class="dica">A IA escreve o campo <b>Descrição</b> (substitui o atual nos elegíveis). Seus <b>fatos</b> e <b>notas</b> pessoais não são tocados.</p>
        <div class="editbtns">
          <button class="dbtn save" onclick="window.IA.personaIniciar()">✨ Descrever ${alvo.length} personagem(ns)</button>
          <button class="dbtn" onclick="window.IA.loteConfFechar()">Cancelar</button>
        </div>
      </div></div>`;
    m.classList.add("open");
  }
  async function iaPersonaIniciar() {
    const fila = _personaPrep;
    const m = $("ialoteconf");
    if (m) m.classList.remove("open");
    _personaPrep = null;
    if (!fila || !fila.length) return;
    _lote = {
      tipo: "persona",
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
    for (const it of fila) {
      if (_lote.cancelado) break;
      while (_lote.pausado && !_lote.cancelado)
        await new Promise((r) => setTimeout(r, 300));
      if (_lote.cancelado) break;
      await iaPersonaUma(it);
      _lote.feitas++;
      iaLotePainel();
    }
    _lote.rodando = false;
    _loteRodando = false;
    iaLoteFim();
  }
  async function iaPersonaUma(it) {
    const p = DADOS.personagens.find((x) => x.nome === it.nome);
    if (!p) {
      _lote.puladas.push({ id: it.nome, motivo: "personagem não encontrado" });
      return;
    }
    try {
      const pistas = it.fichas
        .map((id) => {
          const f = DADOS.fichas.find((x) => x.id === id);
          if (!f) return null;
          const pgs = f.paginas || [];
          return {
            id: f.id,
            titulo: f.titulo || "",
            sala: f.sala || "",
            grupo: (f.grupos || [])[0] || "",
            original: pgs
              .map((x) => x.original || "")
              .filter(Boolean)
              .join("\n\n"),
            traducao: pgs
              .map((x) => x.traducao || "")
              .filter(Boolean)
              .join("\n\n"),
            resumo: (pgs[0] && pgs[0].explica) || "",
          };
        })
        .filter(Boolean);
      if (!pistas.length) {
        _lote.puladas.push({ id: it.nome, motivo: "pistas não encontradas" });
        return;
      }
      const payload = {
        modo: "personagem",
        personagem: { nome: p.nome, aliases: p.aliases || [] },
        pistas: pistas,
      };
      const res = await iaChamarComRetry(payload);
      const d = res && res.resultado && res.resultado.descricao;
      if (!d) {
        _lote.erros.push({ id: it.nome, motivo: "resposta sem descrição" });
        return;
      }
      if (_lote.cancelado || !DADOS.personagens.includes(p)) return;
      p.descricao = d;
      p.ia_desc = { fichas: it.fichas, em: new Date().toISOString() };
      if (typeof marcarAlterado === "function") marcarAlterado();
      if (typeof rebuildFilters === "function") rebuildFilters();
      if (typeof render === "function") render();
      _lote.ok++;
    } catch (e) {
      if (_lote.cancelado) return;
      _lote.erros.push({ id: it.nome, motivo: (e && e.message) || String(e) });
    }
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
    loteIniciar: iaLoteIniciar,
    loteConfFechar: iaLoteConfFechar,
    personasElegiveis: iaPersonasElegiveis,
    personasProcessar: iaPersonasProcessar,
    personaIniciar: iaPersonaIniciar,
    lotePausa: iaLotePausa,
    loteCancela: iaLoteCancela,
    cancelar: iaCancelarTudo,
    loteEstado: function () {
      return _lote;
    },
  };
  window.iaProcessarPista = iaProcessarPista;
})();

/* ============================================================
   online.js — Camada ONLINE do painel (login + nuvem).

   Carregado DEPOIS de app.js, só na versão online. Sem
   window.MODO_ONLINE, este arquivo não faz absolutamente nada
   (o MVP local segue intacto).

   Responsabilidades:
   - Conectar ao Supabase (URL + chave anon públicas).
   - Tela de login/cadastro/esqueci-a-senha (e-mail/senha).
   - Ao logar: carregar o catálogo da nuvem para o DADOS.
   - A cada alteração: salvar na nuvem (autosave com atraso).
   ============================================================ */
(function () {
  "use strict";
  if (!window.MODO_ONLINE) return;

  if (!window.supabase || !window.supabase.createClient) {
    // Falha ao carregar o SDK (CDN fora do ar/bloqueado/offline): degrada com
    // aviso VISÍVEL e mantém o painel escondido — nunca um login "morto" e mudo.
    document.body.classList.remove("app-carregando");
    document.body.classList.add("pre-login");
    var _m = document.getElementById("authMsg");
    if (_m) {
      _m.textContent =
        "Não foi possível carregar o componente de nuvem. Verifique a conexão e recarregue a página.";
      _m.className = "auth-msg show erro";
    }
    var _b = document.getElementById("authPrimary");
    if (_b) {
      _b.textContent = "Recarregar";
      _b.onclick = function () {
        location.reload();
      };
    }
    return;
  }

  var sb = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
  window.sb = sb;

  /* ---- Esqueleto v6 vazio (1º acesso): mesmo formato que o app cria ---- */
  function esqueletoVazioV6() {
    return {
      version: typeof SCHEMA_VERSION !== "undefined" ? SCHEMA_VERSION : 6,
      fichas: [],
      // Diretório: começa com TODAS as salas do jogo, "não descobertas" (lista-base
      // igual pra todos). Cópia própria (deep clone) — cada usuário descobre no seu ritmo.
      salas:
        typeof window !== "undefined" && Array.isArray(window.SALAS_BASE)
          ? JSON.parse(JSON.stringify(window.SALAS_BASE))
          : [],
      personagens: [],
      colecoes: [],
      grupos: [],
      teorias: [],
      quadros: [
        { nome: "Quadro 1", cam: { x: 40, y: 40, s: 1 }, nodes: [], setas: [] },
      ],
      tipos:
        typeof TIPOS_PADRAO !== "undefined"
          ? TIPOS_PADRAO.map(function (t) {
              return Object.assign({}, t);
            })
          : [],
    };
  }
  window.esqueletoVazioV6 = esqueletoVazioV6;

  /* ---- Estado ---- */
  var usuarioAtual = null;
  var modoForm = "login"; // login | signup | reset | nova-senha
  var entrando = false; // trava síncrona contra entrada dupla no app
  var controle = null;
  var geracaoSessao = 0;
  var operacaoConta = false;
  var ultimoStatus = "saved";

  /* ---- Helpers de tela ---- */
  function $(id) {
    return document.getElementById(id);
  }
  function msg(texto, tipo) {
    var m = $("authMsg");
    if (!m) return;
    if (!texto) {
      m.className = "auth-msg";
      m.textContent = "";
      return;
    }
    m.textContent = texto;
    m.className = "auth-msg show " + (tipo || "info");
  }
  function ocupado(b) {
    var p = $("authPrimary");
    if (p) p.disabled = b;
  }

  /* ---- Status do botão "Salvar" no modo nuvem ---- */
  function statusNuvem(st) {
    ultimoStatus = st;
    var ic = $("saveIc"),
      lb = $("saveLb"),
      b = $("btnSalvar");
    // O ícone virou bolinha colorida (CSS via st-*); só o rótulo muda.
    var M = {
      saving: ["", "Salvando…", "info"],
      saved: ["", "Tudo salvo na nuvem", "ok"],
      erro: ["", "Falha — tentando de novo", "warn"],
      conflito: ["", "Conflito — confira antes de salvar", "warn"],
    };
    var m = M[st] || M.saved;
    if (ic) ic.textContent = "";
    if (lb) lb.textContent = m[1];
    var ct = $("contaSaveTit"),
      dot = $("contaSaveDot"),
      sub = $("contaSaveSub");
    var tc = document.querySelector('#tabbar .tbit[data-view="conta"]');
    if (tc) {
      tc.classList.remove("st-ok", "st-info", "st-warn");
      tc.classList.add("st-" + m[2]);
    }
    if (ct) ct.textContent = m[1];
    if (sub)
      sub.textContent =
        st === "conflito"
          ? "O catálogo mudou em outro aparelho."
          : st === "erro"
            ? "Suas alterações continuam nesta aba."
            : "salvamento automático ativo";
    if (dot) dot.className = "save-dot2 st-" + m[2];
    if (typeof anunciarStatus === "function") anunciarStatus(m[1]);
    if (st === "conflito") mostrarConflito();
    if (b) {
      b.classList.remove("st-ok", "st-info", "st-warn");
      b.classList.add("st-" + m[2]);
    }
  }

  /* ---- Aplicar um DADOS no app (muta no lugar; não recria o const) ---- */
  var LISTAS = [
    "fichas",
    "salas",
    "personagens",
    "grupos",
    "colecoes",
    "teorias",
    "quadros",
    "tipos",
  ];
  function aplicarDadosNoApp(novo) {
    novo = window.Catalogo.preparar(novo || esqueletoVazioV6());
    Object.keys(DADOS).forEach(function (k) {
      if (!LISTAS.includes(k) && !Object.prototype.hasOwnProperty.call(novo, k))
        delete DADOS[k];
    });
    LISTAS.forEach(function (k) {
      if (!Array.isArray(DADOS[k])) DADOS[k] = [];
      DADOS[k].length = 0;
      (novo[k] || []).forEach(function (it) {
        DADOS[k].push(it);
      });
    });
    Object.keys(novo).forEach(function (k) {
      if (!LISTAS.includes(k)) DADOS[k] = novo[k];
    });
    if (!Array.isArray(DADOS.tipos) || !DADOS.tipos.length) {
      DADOS.tipos =
        typeof TIPOS_PADRAO !== "undefined"
          ? TIPOS_PADRAO.map(function (t) {
              return Object.assign({}, t);
            })
          : [];
    }
    if (typeof TIPOS !== "undefined") TIPOS = DADOS.tipos;
    if (typeof rebuildFilters === "function") rebuildFilters();
    if (typeof render === "function") render();
    if (typeof histInit === "function") histInit();
    if (typeof marcarSalvo === "function") marcarSalvo();
    statusNuvem("saved");
  }

  /* ---- Diretório de salas COMPARTILHADO (dado do JOGO, igual p/ todos) ----
     Lê a tabela diretorio_salas e sobrepõe os campos do jogo em cada sala,
     casando por "nome" e PRESERVANDO o que é pessoal (descoberta, notas,
     fatos, posição no mapa). Salas do diretório que faltarem são adicionadas.
     Se a busca falhar, mantém o que já havia (degradação graciosa). */
  var CAMPOS_JOGO_SALA = [
    "num",
    "nome_en",
    "nome_pt",
    "descricao_en",
    "descricao_pt",
    "raridade_en",
    "raridade_pt",
    "custo_en",
    "custo_pt",
    "tipo_en",
    "tipo_pt",
    "categorias",
    "diretorio",
    "imagem",
    "fonte",
  ];
  async function carregarDiretorioSalas() {
    try {
      var r = await sb.from("diretorio_salas").select("*");
      if (r.error) throw r.error;
      return Array.isArray(r.data) ? r.data : [];
    } catch (e) {
      if (typeof console !== "undefined")
        console.warn("Diretório de salas indisponível:", e && e.message);
      return null;
    }
  }
  function sobreporDiretorioSalas(dados, diretorio) {
    if (!dados || !Array.isArray(diretorio) || !diretorio.length) return;
    if (!Array.isArray(dados.salas)) dados.salas = [];
    var porNome = {};
    dados.salas.forEach(function (s) {
      if (s && s.nome) porNome[s.nome] = s;
    });
    diretorio.forEach(function (d) {
      var s = porNome[d.nome];
      if (!s) {
        // sala ainda não existe no catálogo do usuário: cria com o pessoal zerado
        s = { nome: d.nome, descoberta: false, notas: "", fatos: [] };
        dados.salas.push(s);
        porNome[d.nome] = s;
      }
      // sobrepõe SÓ os campos do jogo; não toca em descoberta/notas/fatos/etc.
      CAMPOS_JOGO_SALA.forEach(function (c) {
        if (d[c] !== undefined && d[c] !== null) s[c] = d[c];
      });
      // compatibilidade com o app antigo (campos únicos, em PT)
      s.descricao = d.descricao_pt || s.descricao || "";
      s.tipo = d.tipo_pt || "";
      s.raridade = d.raridade_pt || "";
    });
  }

  /* ---- Carregar o catálogo da nuvem (ou criar vazio no 1º acesso) ---- */
  async function carregarDaNuvem(user) {
    var geracao = geracaoSessao;
    var r = await sb
      .from("catalogo_usuario")
      .select("dados,atualizado_em")
      .eq("user_id", user.id)
      .maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) {
      var criada = await sb
        .from("catalogo_usuario")
        .insert({ user_id: user.id, dados: esqueletoVazioV6() });
      // Outro aparelho pode ter criado a linha durante a leitura inicial.
      if (criada.error && criada.error.code !== "23505") throw criada.error;
      r = await sb
        .from("catalogo_usuario")
        .select("dados,atualizado_em")
        .eq("user_id", user.id)
        .maybeSingle();
      if (r.error || !r.data)
        throw r.error || new Error("Catálogo indisponível");
    }
    var dados = window.Catalogo.preparar(r.data.dados);
    var diretorio = await carregarDiretorioSalas();
    if (diretorio) sobreporDiretorioSalas(dados, diretorio);
    if (geracao !== geracaoSessao) return false;
    if (controle) controle.encerrar();
    aplicarDadosNoApp(dados);
    controle = window.ControleNuvem.criar({
      versao: r.data.atualizado_em,
      dados: function () {
        return DADOS;
      },
      status: statusNuvem,
      confirmar: function () {
        if (typeof marcarSalvo === "function") marcarSalvo();
      },
      gravar: async function (snapshot, versao) {
        // Comparação E gravação são uma única operação no Postgres.
        var salvo = await sb
          .from("catalogo_usuario")
          .update({ dados: snapshot, atualizado_em: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("atualizado_em", versao)
          .select("atualizado_em")
          .maybeSingle();
        if (salvo.error) throw salvo.error;
        if (!salvo.data) {
          var erro = new Error("Catálogo alterado em outro aparelho");
          erro.code = "CONFLITO";
          throw erro;
        }
        return salvo.data.atualizado_em;
      },
    });
    if (typeof precarregarThumbsSalas === "function") {
      (
        window.requestIdleCallback ||
        function (f) {
          return setTimeout(f, 300);
        }
      )(precarregarThumbsSalas);
    }
    return true;
  }

  function mostrarConflito() {
    var m = $("conflitoNuvem");
    if (!m) {
      m = document.createElement("div");
      m.id = "conflitoNuvem";
      m.className = "modal";
      m.setAttribute("role", "dialog");
      m.setAttribute("aria-modal", "true");
      m.setAttribute("aria-labelledby", "conflitoTitulo");
      m.innerHTML =
        '<div class="modalbox" style="max-width:520px"><div class="modalhd"><h2 id="conflitoTitulo">O catálogo mudou em outro aparelho</h2><button class="close" aria-label="Fechar aviso">✕</button></div><div class="modalbody"><p>Suas alterações continuam nesta aba. Salve uma cópia antes de carregar a versão da nuvem. O salvamento está pausado para evitar substituir o trabalho de outro aparelho.</p><div class="editbtns"><button class="dbtn save" data-acao="backup">Salvar cópia desta aba</button><button class="dbtn" data-acao="carregar">Carregar versão da nuvem</button></div></div></div>';
      m.querySelector(".close").onclick = function () {
        m.classList.remove("open");
      };
      m.querySelector('[data-acao="backup"]').onclick = function () {
        window.exportarBackup();
      };
      m.querySelector('[data-acao="carregar"]').onclick = async function () {
        if (
          operacaoConta ||
          !usuarioAtual ||
          !confirm(
            "Carregar a versão da nuvem descarta as alterações desta aba. Você já salvou uma cópia do que quer preservar?",
          )
        )
          return;
        operacaoConta = true;
        bloquearEdicao(true);
        try {
          if (window.IA && window.IA.loteCancela) window.IA.loteCancela();
          if (await carregarDaNuvem(usuarioAtual)) m.classList.remove("open");
        } catch (e) {
          alert("Não consegui carregar: " + e.message);
        } finally {
          operacaoConta = false;
          bloquearEdicao(false);
        }
      };
      document.body.appendChild(m);
    }
    if (!m.classList.contains("open")) {
      m.classList.add("open");
      m.querySelector('[data-acao="backup"]').focus();
    }
  }
  function agendarSalvar() {
    if (usuarioAtual && controle) controle.alterar();
  }
  function salvarNaNuvem() {
    if (!usuarioAtual || !controle) return Promise.resolve(false);
    if (controle.estado() === "conflito") mostrarConflito();
    return controle.salvar();
  }
  // Exposto para o gancho _persistApenas() e para o botão "Salvar".
  window.NUVEM = {
    agendarSalvar: agendarSalvar,
    salvarAgora: salvarNaNuvem,
    carregar: carregarDaNuvem,
    sobreporDiretorioSalas: sobreporDiretorioSalas,
    carregarDiretorioSalas: carregarDiretorioSalas,
    atualizarStatus: function () {
      statusNuvem(ultimoStatus);
    },
  };

  /* ===========================================================
     IMAGENS NA NUVEM (Storage privado, pasta por usuário)
     - Anexar: comprime -> upload em imagens/{user_id}/... -> guarda "nuvem:caminho".
     - Exibir: um observer troca todo <img src="nuvem:..."> por uma URL assinada.
     - URLs da web (http...) e base64 (data:) seguem como estão.
     =========================================================== */
  var BUCKET_IMG = "imagens";
  var urlCacheImg = {}; // caminho -> { url, exp }

  // Comprime o arquivo para um JPEG (máx. 1100px, qualidade 0.82) -> Blob.
  function comprimirParaBlob(file) {
    return new Promise(function (res) {
      try {
        var rd = new FileReader();
        rd.onload = function () {
          var img = new Image();
          img.onload = function () {
            var max = 1100;
            var w = img.width,
              h = img.height;
            if (w > max || h > max) {
              var s = max / Math.max(w, h);
              w = Math.round(w * s);
              h = Math.round(h * s);
            }
            var cv = document.createElement("canvas");
            cv.width = w;
            cv.height = h;
            cv.getContext("2d").drawImage(img, 0, 0, w, h);
            try {
              cv.toBlob(
                function (b) {
                  res(b || file);
                },
                "image/jpeg",
                0.82,
              );
            } catch (e) {
              res(file);
            }
          };
          img.onerror = function () {
            res(file);
          };
          img.src = rd.result;
        };
        rd.onerror = function () {
          res(file);
        };
        rd.readAsDataURL(file);
      } catch (e) {
        res(file);
      }
    });
  }

  // Substitui o salvar-em-arquivo-local do app: envia ao Storage privado e
  // devolve "nuvem:{user_id}/arquivo". Se não der, devolve null e o app cai
  // no base64 embutido (a imagem não se perde).
  window.salvarImagemArquivo = async function (blob, base) {
    if (!usuarioAtual || !blob) return null;
    try {
      var comp = await comprimirParaBlob(blob);
      var nome =
        (base || "img") +
        "-" +
        Date.now() +
        "-" +
        Math.floor(Math.random() * 1e6) +
        ".jpg";
      var caminho = usuarioAtual.id + "/" + nome;
      var up = await sb.storage
        .from(BUCKET_IMG)
        .upload(caminho, comp, { upsert: true, contentType: "image/jpeg" });
      if (up.error) throw up.error;
      return "nuvem:" + caminho;
    } catch (e) {
      return null;
    }
  };

  // Exibição: resolve "nuvem:caminho" -> URL assinada temporária (com cache).
  var PLACEHOLDER_IMG =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
    );
  function resolverImg(img) {
    var raw = img.getAttribute("src") || "";
    if (raw.indexOf("nuvem:") !== 0) return;
    var caminho = raw.slice(6);
    var c = urlCacheImg[caminho];
    if (c && c.exp > Date.now()) {
      img.src = c.url;
      return;
    }
    img.src = PLACEHOLDER_IMG; // evita o ícone de "imagem quebrada" enquanto resolve
    sb.storage
      .from(BUCKET_IMG)
      .createSignedUrl(caminho, 3600)
      .then(function (r) {
        if (r && r.data && r.data.signedUrl) {
          urlCacheImg[caminho] = {
            url: r.data.signedUrl,
            exp: Date.now() + 50 * 60 * 1000,
          };
          img.src = r.data.signedUrl;
        }
      })
      .catch(function () {});
  }
  function varrerImgs(root) {
    if (!root || !root.querySelectorAll) return;
    var imgs = root.querySelectorAll('img[src^="nuvem:"]');
    Array.prototype.forEach.call(imgs, resolverImg);
  }
  var obsImg = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === "attributes") {
        if (m.target && m.target.tagName === "IMG") resolverImg(m.target);
      } else {
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (!n || n.nodeType !== 1) continue;
          if (n.tagName === "IMG") resolverImg(n);
          else varrerImgs(n);
        }
      }
    }
  });
  if (document.body) {
    obsImg.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
    varrerImgs(document.body);
  }

  /* ===========================================================
     IMPORTAR o dados.js para a nuvem (com as imagens)
     - Sobe imagens locais (imagens/...) e base64 (data:) para o Storage.
     - Traz as 8 listas (via aplicarDadosNoApp) e salva na nuvem.
     - URLs da web seguem como estão.
     =========================================================== */
  window.exportarBackup = async function () {
    if (!usuarioAtual) return false;
    try {
      toast("Preparando backup com suas imagens…", 4000);
      var backup = await window.BackupCatalogo.criar(
        DADOS,
        sb.storage.from(BUCKET_IMG),
      );
      var a = document.createElement("a");
      var url = URL.createObjectURL(
        new Blob([JSON.stringify(backup)], { type: "application/json" }),
      );
      a.href = url;
      a.download =
        "magnify-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
      toast("Backup completo baixado ✓", 2500);
      return true;
    } catch (e) {
      alert("Não consegui exportar o backup completo: " + e.message);
      return false;
    }
  };
  async function importarDocumento(documento) {
    if (!usuarioAtual || operacaoConta) return false;
    // A validação vem ANTES da confirmação, uploads e substituição.
    window.Catalogo.validar(
      documento.formato === "magnify-backup" ? documento.dados : documento,
    );
    if (
      !confirm(
        "Importar vai SUBSTITUIR seu catálogo pelo do arquivo. Continuar?",
      )
    )
      return false;
    operacaoConta = true;
    bloquearEdicao(true);
    var geracao = geracaoSessao;
    try {
      if (controle && controle.pendente() && !(await salvarNaNuvem()))
        throw new Error("Salve ou resolva o conflito atual antes de importar.");
      var resultado = await window.BackupCatalogo.restaurar(
        documento,
        usuarioAtual.id,
        sb.storage.from(BUCKET_IMG),
      );
      if (geracao !== geracaoSessao)
        throw new Error(
          "A sessão mudou durante a importação. Entre novamente.",
        );
      aplicarDadosNoApp(resultado.dados);
      marcarAlterado();
      var salvo = await salvarNaNuvem();
      toast(
        salvo
          ? "Catálogo e imagens importados ✓"
          : "Importação nesta aba; o salvamento ainda está pendente.",
        6000,
      );
      return salvo;
    } finally {
      operacaoConta = false;
      bloquearEdicao(false);
    }
  }
  window.NUVEM.importarDocumento = importarDocumento;
  window.importarDados = function () {
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".js,.json,text/javascript,application/json";
    inp.onchange = function () {
      var file = inp.files && inp.files[0];
      if (!file) return;
      var rd = new FileReader();
      rd.onload = async function () {
        try {
          await importarDocumento(window.Catalogo.ler(rd.result));
        } catch (e) {
          alert("Não consegui importar: " + e.message);
        }
      };
      rd.readAsText(file);
    };
    inp.click();
  };

  /* ===========================================================
     CONTA / LGPD: apagar conta + faxina dos botões locais
     - Exportar: o app já tem exportarBackup() (baixa o JSON) — segue valendo.
     - Apagar conta: chama a Edge Function "apagar-conta" (servidor) que remove
       imagens + catálogo + login. A chave secreta vive só no servidor.
     =========================================================== */
  window.apagarConta = async function () {
    if (!usuarioAtual || operacaoConta) return;
    var c = window.prompt(
      "Isto vai APAGAR sua conta e TODOS os seus dados (catálogo + imagens), para sempre — não tem como desfazer.\n\nPara confirmar, digite APAGAR:",
    );
    if (c == null) return;
    if (c.trim().toUpperCase() !== "APAGAR") {
      alert('Cancelado (você não digitou "APAGAR").');
      return;
    }
    operacaoConta = true;
    bloquearEdicao(true);
    if (window.IA && window.IA.loteCancela) window.IA.loteCancela();
    try {
      // Nenhum autosave pode recriar o catálogo enquanto a exclusão está em curso.
      if (controle) await controle.pausar();
      if (typeof toast === "function") toast("Apagando sua conta…", 5000);
      var sess = await sb.auth.getSession();
      var token =
        sess && sess.data && sess.data.session
          ? sess.data.session.access_token
          : null;
      if (!token) throw new Error("sessão expirada — entre de novo e tente.");
      var r = await fetch(window.SUPABASE_URL + "/functions/v1/apagar-conta", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          apikey: window.SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
      });
      var res = {};
      try {
        res = await r.json();
      } catch (e) {}
      if (!r.ok || res.error) throw new Error(res.error || "HTTP " + r.status);
      // Sucesso: limpa tudo localmente e volta ao login.
      if (controle) controle.encerrar();
      controle = null;
      geracaoSessao++;
      usuarioAtual = null;
      window.USUARIO = null;
      try {
        await sb.auth.signOut();
      } catch (e) {}
      aplicarDadosNoApp(esqueletoVazioV6());
      mostrarLogin();
      alert("Sua conta e seus dados foram apagados. Até mais!");
    } catch (e) {
      alert(
        "Não consegui apagar a conta: " +
          (e && e.message ? e.message : String(e)),
      );
    } finally {
      operacaoConta = false;
      bloquearEdicao(false);
      if (controle) controle.retomar();
    }
  };

  // Esconde os botões do "Gerenciar" que só fazem sentido na versão LOCAL
  // e adiciona o botão "Apagar minha conta".
  function ajustarUIConta() {
    var locais = [
      "trocarArquivo",
      "conectarPasta",
      "migrarImagens",
      "abrirBackups",
    ];
    locais.forEach(function (fn) {
      var btn = document.querySelector('#modalGestao [onclick^="' + fn + '"]');
      var item = btn && btn.closest ? btn.closest(".ftitem") : null;
      if (item) item.style.display = "none";
    });
    // O botão "Apagar minha conta" só aparece quando a Edge Function
    // "apagar-conta" estiver publicada (window.APAGAR_CONTA_ATIVO = true).
    var ft = document.querySelector("#modalGestao .ftbtns");
    if (
      window.APAGAR_CONTA_ATIVO &&
      ft &&
      !ft.querySelector(".btn-apagar-conta")
    ) {
      var span = document.createElement("span");
      span.className = "ftitem";
      span.innerHTML =
        '<button class="topbtn btn-apagar-conta" onclick="if(window.apagarConta)window.apagarConta()">🗑️ Apagar minha conta</button>';
      ft.appendChild(span);
    }
  }

  /* ---- Telas: login / cadastro / esqueci a senha ---- */
  function mostrarLogin() {
    usuarioAtual = null;
    window.USUARIO = null;
    document.body.classList.remove("app-carregando");
    document.body.classList.add("pre-login");
    aplicarModo("login");
  }
  async function entrarNoApp(user) {
    // Guarda síncrona: impede entrada dupla (getSession + onAuthStateChange) e reentrância.
    if (entrando || usuarioAtual) return;
    entrando = true;
    // Mostra a tela de "Carregando…" (não a de login) enquanto busca a nuvem — evita a piscada.
    document.body.classList.remove("pre-login");
    document.body.classList.add("app-carregando");
    try {
      if (!(await carregarDaNuvem(user))) return;
      // SÓ considera "logado" DEPOIS de carregar com sucesso. Se marcássemos antes
      // e a carga falhasse, o autosave poderia gravar o esqueleto VAZIO por cima
      // do catálogo real na nuvem (perda de dados).
      usuarioAtual = user;
      window.USUARIO = user;
      // Iniciais do e-mail no avatar da Conta (trilho e cabeçalho mobile)
      try {
        var av = document.getElementById("contaAvatar");
        if (av && user && user.email)
          av.textContent = user.email.slice(0, 2).toUpperCase();
      } catch (e) {}
      document.body.classList.remove("app-carregando");
      document.body.classList.remove("pre-login");
      msg("");
      // No modo online não há arquivo local: desliga o autosave de arquivo.
      try {
        if (typeof setAuto === "function") setAuto(false);
      } catch (e) {}
    } catch (e) {
      // Carga falhou: NÃO fica logado, então nenhum salvamento pode ocorrer.
      usuarioAtual = null;
      window.USUARIO = null;
      document.body.classList.remove("app-carregando");
      document.body.classList.add("pre-login");
      msg(
        "Não consegui carregar seu catálogo. " +
          traduzErro(e) +
          " Recarregue a página (F5) para tentar de novo.",
        "erro",
      );
    } finally {
      entrando = false;
    }
  }

  function aplicarModo(m) {
    modoForm = m;
    var primary = $("authPrimary"),
      p2 = $("authPass2wrap"),
      linkSignup = $("authToSignup"),
      linkReset = $("authToReset"),
      sub = $("authSub");
    // E-mail não faz sentido na tela de "nova senha" (a sessão de recuperação já existe).
    var emailEl = $("authEmail");
    var emailWrap =
      emailEl && emailEl.closest ? emailEl.closest("label") : null;
    if (emailWrap) emailWrap.style.display = m === "nova-senha" ? "none" : "";
    msg("");
    if (m === "login") {
      if (primary) primary.textContent = "Abrir o arquivo";
      if (p2) p2.style.display = "none";
      if (sub) sub.textContent = "Entre na sua conta";
      if (linkSignup) linkSignup.textContent = "Criar conta";
      if (linkReset) linkReset.style.display = "";
    } else if (m === "signup") {
      if (primary) primary.textContent = "Criar conta";
      if (p2) p2.style.display = "";
      if (sub) sub.textContent = "Crie a sua conta";
      if (linkSignup) linkSignup.textContent = "Já tenho conta";
      if (linkReset) linkReset.style.display = "none";
    } else if (m === "reset") {
      if (primary) primary.textContent = "Enviar link de redefinição";
      if (p2) p2.style.display = "none";
      if (sub) sub.textContent = "Recuperar acesso";
      if (linkSignup) linkSignup.textContent = "Voltar a entrar";
      if (linkReset) linkReset.style.display = "none";
    } else if (m === "nova-senha") {
      if (primary) primary.textContent = "Salvar nova senha";
      if (p2) p2.style.display = "";
      if (sub) sub.textContent = "Defina uma nova senha";
      if (linkSignup) linkSignup.textContent = "Voltar a entrar";
      if (linkReset) linkReset.style.display = "none";
    }
  }

  async function aoEnviar() {
    var email = (($("authEmail") || {}).value || "").trim();
    var senha = ($("authPass") || {}).value || "";
    if (modoForm !== "nova-senha" && !email)
      return msg("Digite o seu e-mail.", "erro");
    if (modoForm !== "reset" && !senha)
      return msg("Digite a sua senha.", "erro");

    ocupado(true);
    try {
      if (modoForm === "login") {
        var r = await sb.auth.signInWithPassword({
          email: email,
          password: senha,
        });
        if (r.error) throw r.error;
        // onAuthStateChange cuida de entrar no app.
      } else if (modoForm === "signup") {
        var senha2 = ($("authPass2") || {}).value || "";
        if (senha.length < 6) {
          ocupado(false);
          return msg("A senha precisa de pelo menos 6 caracteres.", "erro");
        }
        if (senha !== senha2) {
          ocupado(false);
          return msg("As senhas não conferem.", "erro");
        }
        var rs = await sb.auth.signUp({ email: email, password: senha });
        if (rs.error) throw rs.error;
        aplicarModo("login");
        msg(
          "Conta criada! Enviamos um e-mail de confirmação para " +
            email +
            ". Confirme o e-mail e depois entre.",
          "ok",
        );
      } else if (modoForm === "reset") {
        var ro = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.href,
        });
        if (ro.error) throw ro.error;
        aplicarModo("login");
        msg(
          "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.",
          "ok",
        );
      } else if (modoForm === "nova-senha") {
        var senha2b = ($("authPass2") || {}).value || "";
        if (senha.length < 6) {
          ocupado(false);
          return msg("A senha precisa de pelo menos 6 caracteres.", "erro");
        }
        if (senha !== senha2b) {
          ocupado(false);
          return msg("As senhas não conferem.", "erro");
        }
        var ru = await sb.auth.updateUser({ password: senha });
        if (ru.error) throw ru.error;
        try {
          await sb.auth.signOut();
        } catch (e2) {}
        aplicarModo("login");
        msg("Senha alterada! Agora entre com a nova senha.", "ok");
      }
    } catch (e) {
      msg(traduzErro(e), "erro");
    } finally {
      ocupado(false);
    }
  }

  async function entrarComGoogle() {
    try {
      var r = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.href },
      });
      if (r.error) throw r.error;
    } catch (e) {
      msg(traduzErro(e), "erro");
    }
  }

  function bloquearEdicao(b) {
    document.querySelectorAll(".shell, #drawer, .modal").forEach(function (el) {
      el.inert = b;
    });
  }
  async function sair() {
    if (operacaoConta) return false;
    operacaoConta = true;
    bloquearEdicao(true);
    if (window.IA && window.IA.loteCancela) window.IA.loteCancela();
    try {
      if (controle && controle.pendente() && !(await salvarNaNuvem())) {
        alert(
          "Não foi possível salvar suas alterações. Você continua conectado; tente salvar novamente ou exporte um backup.",
        );
        return false;
      }
      var r = await sb.auth.signOut();
      if (r && r.error) throw r.error;
      limparSessao();
      mostrarLogin();
      return true;
    } catch (e) {
      alert("Não consegui sair: " + traduzErro(e));
      return false;
    } finally {
      operacaoConta = false;
      bloquearEdicao(false);
    }
  }
  function limparSessao() {
    geracaoSessao++;
    if (controle) controle.encerrar();
    controle = null;
    usuarioAtual = null;
    window.USUARIO = null;
    urlCacheImg = {};
    if (window.IA && window.IA.loteCancela) window.IA.loteCancela();
    document.querySelectorAll(".modal.open").forEach(function (m) {
      m.classList.remove("open");
    });
    aplicarDadosNoApp(esqueletoVazioV6());
  }
  window.sairDaConta = sair;
  // Versão com confirmação, usada pelo botão "Sair" da barra lateral.
  window.sairComConfirmacao = function () {
    if (
      window.confirm(
        "Sair da conta? Você será desconectado e voltará para a tela de login.",
      )
    ) {
      sair();
    }
  };

  function traduzErro(e) {
    var t = e && e.message ? e.message : String(e);
    if (/Invalid login credentials/i.test(t))
      return "E-mail ou senha incorretos.";
    if (/Email not confirmed/i.test(t))
      return "Confirme o seu e-mail antes de entrar (veja a caixa de entrada e o spam).";
    if (/User already registered/i.test(t))
      return "Já existe uma conta com esse e-mail. Tente entrar.";
    if (/should be at least|Password/i.test(t))
      return "A senha precisa de pelo menos 6 caracteres.";
    if (/rate limit|too many|after/i.test(t))
      return "Muitas tentativas. Espere um minuto e tente de novo.";
    if (/Failed to fetch|NetworkError|network/i.test(t))
      return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
    return "Erro: " + t;
  }

  /* ---- Ligar os controles da tela ---- */
  function ligarEventos() {
    var form = $("authForm");
    if (form)
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        aoEnviar();
      });
    var g = $("authGoogle");
    if (g) g.addEventListener("click", entrarComGoogle);
    var ls = $("authToSignup");
    if (ls)
      ls.addEventListener("click", function (ev) {
        ev.preventDefault();
        aplicarModo(modoForm === "login" ? "signup" : "login");
      });
    var lr = $("authToReset");
    if (lr)
      lr.addEventListener("click", function (ev) {
        ev.preventDefault();
        aplicarModo("reset");
      });
    // Olhinho: mostrar/ocultar a senha (ícones SVG; herdam a cor clara via currentColor).
    var OLHO_ABERTO =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    var OLHO_FECHADO =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    var olhos = document.querySelectorAll(".auth-eye");
    Array.prototype.forEach.call(olhos, function (b) {
      b.innerHTML = OLHO_FECHADO; // começa com a senha oculta (•••)
      b.addEventListener("click", function () {
        var inp = document.getElementById(b.getAttribute("data-alvo"));
        if (!inp) return;
        var mostrar = inp.type === "password"; // oculta agora -> vamos mostrar
        inp.type = mostrar ? "text" : "password";
        b.innerHTML = mostrar ? OLHO_ABERTO : OLHO_FECHADO;
        b.setAttribute(
          "aria-label",
          mostrar ? "Ocultar senha" : "Mostrar senha",
        );
      });
    });
    // No modo online, o botão "Salvar" salva na nuvem.
    window.salvarTudo = function () {
      return salvarNaNuvem();
    };
  }

  /* ---- Reage a login/logout em qualquer aba ---- */
  sb.auth.onAuthStateChange(function (evento, sessao) {
    if (evento === "PASSWORD_RECOVERY") {
      // Voltou do link "esqueci a senha": deixa digitar a nova senha (NÃO entra no app).
      document.body.classList.remove("app-carregando");
      document.body.classList.add("pre-login");
      aplicarModo("nova-senha");
      return;
    }
    if (sessao && sessao.user) {
      if (!usuarioAtual) entrarNoApp(sessao.user);
    } else {
      limparSessao();
      mostrarLogin();
    }
  });

  /* ---- Início ---- */
  function iniciar() {
    ligarEventos();
    ajustarUIConta();
    sb.auth
      .getSession()
      .then(function (r) {
        var sessao = r && r.data ? r.data.session : null;
        if (sessao && sessao.user) entrarNoApp(sessao.user);
        else mostrarLogin();
      })
      .catch(function () {
        mostrarLogin();
      });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();

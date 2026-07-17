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
  var saveTimer = null;
  var salvandoAgora = false;
  var precisaSalvarDeNovo = false;

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
    var ic = $("saveIc"),
      lb = $("saveLb"),
      b = $("btnSalvar");
    // O ícone virou bolinha colorida (CSS via st-*); só o rótulo muda.
    var M = {
      saving: ["", "Salvando…", "info"],
      saved: ["", "Tudo salvo na nuvem", "ok"],
      erro: ["", "Falha — tentando de novo", "warn"],
    };
    var m = M[st] || M.saved;
    if (ic) ic.textContent = "";
    if (lb) lb.textContent = m[1];
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
    novo = novo || esqueletoVazioV6();
    LISTAS.forEach(function (k) {
      if (!Array.isArray(DADOS[k])) DADOS[k] = [];
      DADOS[k].length = 0;
      (novo[k] || []).forEach(function (it) {
        DADOS[k].push(it);
      });
    });
    Object.keys(novo).forEach(function (k) {
      if (!Array.isArray(novo[k])) DADOS[k] = novo[k];
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
    "num", "nome_en", "nome_pt", "descricao_en", "descricao_pt",
    "raridade_en", "raridade_pt", "custo_en", "custo_pt",
    "tipo_en", "tipo_pt", "categorias", "diretorio", "imagem", "fonte",
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
    var r = await sb
      .from("catalogo_usuario")
      .select("dados")
      .eq("user_id", user.id)
      .maybeSingle();
    if (r.error) throw r.error;
    var dados = r.data && r.data.dados ? r.data.dados : null;
    if (!dados || !Array.isArray(dados.fichas)) {
      dados = esqueletoVazioV6();
      var up = await sb.from("catalogo_usuario").upsert(
        {
          user_id: user.id,
          dados: dados,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (up.error) throw up.error;
    }
    // Sobrepõe o diretório compartilhado (dado do jogo) antes de aplicar.
    var diretorio = await carregarDiretorioSalas();
    if (diretorio) sobreporDiretorioSalas(dados, diretorio);
    aplicarDadosNoApp(dados);
    // Pré-carrega as miniaturas das salas (em segundo plano) para o Diretório
    // já aparecer pronto quando o usuário abrir a aba.
    if (typeof precarregarThumbsSalas === "function") {
      var _ric =
        window.requestIdleCallback ||
        function (f) {
          return setTimeout(f, 300);
        };
      _ric(precarregarThumbsSalas);
    }
  }

  /* ---- Salvar na nuvem (autosave com atraso ~1,5s) ---- */
  function agendarSalvar() {
    if (!usuarioAtual) return;
    statusNuvem("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(salvarNaNuvem, 1500);
  }
  async function salvarNaNuvem() {
    if (!usuarioAtual) return;
    if (salvandoAgora) {
      precisaSalvarDeNovo = true;
      return;
    }
    salvandoAgora = true;
    try {
      statusNuvem("saving");
      var r = await sb.from("catalogo_usuario").upsert(
        {
          user_id: usuarioAtual.id,
          dados: DADOS,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (r.error) throw r.error;
      if (typeof marcarSalvo === "function") marcarSalvo();
      statusNuvem("saved");
    } catch (e) {
      // NÃO perde o que o usuário digitou: agenda nova tentativa.
      statusNuvem("erro");
      clearTimeout(saveTimer);
      saveTimer = setTimeout(salvarNaNuvem, 5000);
    } finally {
      salvandoAgora = false;
      if (precisaSalvarDeNovo) {
        precisaSalvarDeNovo = false;
        agendarSalvar();
      }
    }
  }
  // Exposto para o gancho _persistApenas() e para o botão "Salvar".
  window.NUVEM = {
    agendarSalvar: agendarSalvar,
    salvarAgora: salvarNaNuvem,
    carregar: carregarDaNuvem,
    sobreporDiretorioSalas: sobreporDiretorioSalas,
    carregarDiretorioSalas: carregarDiretorioSalas,
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
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
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
  async function subirImagemImport(valor, base) {
    if (typeof valor !== "string" || !valor) return valor;
    if (valor.indexOf("nuvem:") === 0 || valor.indexOf("http") === 0) return valor;
    // local (imagens/...) ou base64 (data:): busca o conteúdo e envia ao Storage.
    try {
      var resp = await fetch(valor);
      var blob = await resp.blob();
      var novo = await window.salvarImagemArquivo(blob, base || "import");
      return novo || valor; // se o upload falhar, mantém o original
    } catch (e) {
      return valor;
    }
  }
  async function migrarImagensDoImport(o) {
    var conta = 0;
    async function trata(obj, campo, base) {
      var v = obj[campo];
      if (
        typeof v === "string" &&
        v &&
        v.indexOf("nuvem:") !== 0 &&
        v.indexOf("http") !== 0
      ) {
        var nv = await subirImagemImport(v, base);
        if (nv !== v) {
          obj[campo] = nv;
          conta++;
        }
      }
    }
    var fs = o.fichas || [];
    for (var i = 0; i < fs.length; i++) {
      if (fs[i].imagem) await trata(fs[i], "imagem", "ficha");
      var pgs = fs[i].paginas || [];
      for (var j = 0; j < pgs.length; j++) await trata(pgs[j], "imagem", "ficha");
    }
    var listas = ["salas", "personagens", "grupos", "colecoes"];
    for (var k = 0; k < listas.length; k++) {
      var arr = o[listas[k]] || [];
      for (var m = 0; m < arr.length; m++)
        await trata(arr[m], "imagem", listas[k].slice(0, 4));
    }
    return conta;
  }
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
          var t = String(rd.result || "");
          var o = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
          if (!o || !Array.isArray(o.fichas))
            throw new Error("não parece um dados.js válido");
          if (
            !window.confirm(
              "Importar vai SUBSTITUIR o seu catálogo na nuvem pelo do arquivo (e enviar as imagens). Continuar?",
            )
          )
            return;
          if (typeof toast === "function")
            toast("Importando… enviando imagens para a nuvem.", 4000);
          var n = await migrarImagensDoImport(o);
          aplicarDadosNoApp(o);
          await salvarNaNuvem();
          if (typeof toast === "function")
            toast(
              "Catálogo importado ✓ — " +
                (o.fichas ? o.fichas.length : 0) +
                " ficha(s), " +
                n +
                " imagem(ns) enviada(s) à nuvem.",
              6000,
            );
        } catch (e) {
          alert(
            "Não consegui importar: " + (e && e.message ? e.message : String(e)),
          );
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
    if (!usuarioAtual) return;
    var c = window.prompt(
      "Isto vai APAGAR sua conta e TODOS os seus dados (catálogo + imagens), para sempre — não tem como desfazer.\n\nPara confirmar, digite APAGAR:",
    );
    if (c == null) return;
    if (c.trim().toUpperCase() !== "APAGAR") {
      alert('Cancelado (você não digitou "APAGAR").');
      return;
    }
    try {
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
      if (!r.ok || res.error)
        throw new Error(res.error || "HTTP " + r.status);
      // Sucesso: limpa tudo localmente e volta ao login.
      clearTimeout(saveTimer);
      saveTimer = null;
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
      var btn = document.querySelector(
        '#modalGestao [onclick^="' + fn + '"]',
      );
      var item = btn && btn.closest ? btn.closest(".ftitem") : null;
      if (item) item.style.display = "none";
    });
    // O botão "Apagar minha conta" só aparece quando a Edge Function
    // "apagar-conta" estiver publicada (window.APAGAR_CONTA_ATIVO = true).
    var ft = document.querySelector("#modalGestao .ftbtns");
    if (window.APAGAR_CONTA_ATIVO && ft && !ft.querySelector(".btn-apagar-conta")) {
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
      await carregarDaNuvem(user);
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
    var emailWrap = emailEl && emailEl.closest ? emailEl.closest("label") : null;
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
    if (modoForm !== "reset" && !senha) return msg("Digite a sua senha.", "erro");

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

  async function sair() {
    // Limpa a camada de salvamento para não vazar timers/flags entre sessões.
    clearTimeout(saveTimer);
    saveTimer = null;
    salvandoAgora = false;
    precisaSalvarDeNovo = false;
    try {
      await sb.auth.signOut();
    } catch (e) {}
    // Limpa a tela: zera o DADOS para não deixar o catálogo de quem saiu.
    aplicarDadosNoApp(esqueletoVazioV6());
    mostrarLogin();
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
    if (/Invalid login credentials/i.test(t)) return "E-mail ou senha incorretos.";
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
        b.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
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

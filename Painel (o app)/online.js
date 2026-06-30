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
    alert(
      "Não consegui carregar o componente de nuvem (Supabase). Verifique a conexão e recarregue a página.",
    );
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
      salas: [],
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
  var modoForm = "login"; // login | signup | reset
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
    var M = {
      saving: ["☁", "Salvando…", "info"],
      saved: ["☁✓", "Salvo na nuvem", "ok"],
      erro: ["⚠", "Falha — tentando de novo", "warn"],
    };
    var m = M[st] || M.saved;
    if (ic) ic.textContent = m[0];
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
    aplicarDadosNoApp(dados);
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
  };

  /* ---- Telas: login / cadastro / esqueci a senha ---- */
  function mostrarLogin() {
    usuarioAtual = null;
    window.USUARIO = null;
    document.body.classList.add("pre-login");
    aplicarModo("login");
  }
  async function entrarNoApp(user) {
    usuarioAtual = user;
    window.USUARIO = user;
    try {
      msg("Carregando o seu catálogo…", "info");
      await carregarDaNuvem(user);
      document.body.classList.remove("pre-login");
      msg("");
      // No modo online não há arquivo local: desliga o autosave de arquivo.
      try {
        if (typeof setAuto === "function") setAuto(false);
      } catch (e) {}
    } catch (e) {
      msg("Não consegui carregar seu catálogo. " + traduzErro(e), "erro");
    }
  }

  function aplicarModo(m) {
    modoForm = m;
    var primary = $("authPrimary"),
      p2 = $("authPass2wrap"),
      linkSignup = $("authToSignup"),
      linkReset = $("authToReset"),
      sub = $("authSub");
    msg("");
    if (m === "login") {
      if (primary) primary.textContent = "Entrar";
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
    }
  }

  async function aoEnviar() {
    var email = (($("authEmail") || {}).value || "").trim();
    var senha = ($("authPass") || {}).value || "";
    if (!email) return msg("Digite o seu e-mail.", "erro");
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
        msg(
          "Conta criada! Enviamos um e-mail de confirmação para " +
            email +
            ". Confirme o e-mail e depois entre.",
          "ok",
        );
        aplicarModo("login");
      } else if (modoForm === "reset") {
        var ro = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.href,
        });
        if (ro.error) throw ro.error;
        msg(
          "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.",
          "ok",
        );
        aplicarModo("login");
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
    try {
      await sb.auth.signOut();
    } catch (e) {}
    // Limpa a tela: zera o DADOS para não deixar o catálogo de quem saiu.
    aplicarDadosNoApp(esqueletoVazioV6());
    mostrarLogin();
  }
  window.sairDaConta = sair;

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
        aplicarModo(modoForm === "signup" ? "login" : "signup");
      });
    var lr = $("authToReset");
    if (lr)
      lr.addEventListener("click", function (ev) {
        ev.preventDefault();
        aplicarModo("reset");
      });
    // No modo online, o botão "Salvar" salva na nuvem.
    window.salvarTudo = function () {
      return salvarNaNuvem();
    };
  }

  /* ---- Reage a login/logout em qualquer aba ---- */
  sb.auth.onAuthStateChange(function (_evento, sessao) {
    if (sessao && sessao.user) {
      if (!usuarioAtual) entrarNoApp(sessao.user);
    } else {
      mostrarLogin();
    }
  });

  /* ---- Início ---- */
  function iniciar() {
    ligarEventos();
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

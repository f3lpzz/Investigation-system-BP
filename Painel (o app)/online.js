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

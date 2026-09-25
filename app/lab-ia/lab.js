const URL_API = "https://afmllayitasncvvuownx.supabase.co";
const PUBLIC_KEY = "sb_publishable_5z4Q__eYsqbdrY7h8H-hiA_6AzuoiH1";
const HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "feature-testes-ia.investigation-system-bp.pages.dev",
]);
const SESSION_KEY = "investigation-lab-session-v1";
const $ = (id) => document.getElementById(id);
let sessao = null,
  historico = [],
  ocupado = false,
  fotos = [];

function aviso(texto, erro = false) {
  $("mensagem").textContent = texto;
  $("mensagem").className = "notice" + (erro ? " error" : "");
  $("mensagem").hidden = !texto;
}
function elemento(tag, texto, classe) {
  const e = document.createElement(tag);
  if (texto !== undefined) e.textContent = texto;
  if (classe) e.className = classe;
  return e;
}
const usd = (n) =>
  n === null || n === undefined ? "Não informado" : "$" + Number(n).toFixed(6);
function guardarSessao(s) {
  sessao = s;
  if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION_KEY);
}
async function requisicao(caminho, options = {}, auth = true) {
  if (auth && sessao && sessao.expires_at * 1000 < Date.now() + 30000) {
    const r = await fetch(URL_API + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: PUBLIC_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: sessao.refresh_token }),
    });
    const s = await r.json();
    if (!r.ok) {
      guardarSessao(null);
      mostrarAcesso();
      throw new Error("Sessão expirada. Entre novamente.");
    }
    guardarSessao(s);
  }
  const response = await fetch(URL_API + caminho, {
    ...options,
    headers: {
      apikey: PUBLIC_KEY,
      "Content-Type": "application/json",
      ...(auth && sessao
        ? { Authorization: "Bearer " + sessao.access_token }
        : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.execucao)
    throw new Error(
      data.error ||
        data.msg ||
        data.message ||
        "Não foi possível concluir a operação (" + response.status + ")",
    );
  return data;
}
function mostrarAcesso() {
  $("acesso").hidden = !!sessao;
  $("laboratorio").hidden = !sessao;
  $("sair").hidden = !sessao;
}
$("login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.submitter;
  button.disabled = true;
  try {
    const s = await requisicao(
      "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        body: JSON.stringify({
          email: $("email").value.trim(),
          password: $("senha").value,
        }),
      },
      false,
    );
    if (s.user?.app_metadata?.ia_lab !== true)
      throw new Error(
        "Use uma das contas de teste liberadas para este laboratório.",
      );
    guardarSessao(s);
    $("senha").value = "";
    mostrarAcesso();
    aviso("");
    await carregarHistorico();
  } catch (err) {
    aviso(err.message, true);
  } finally {
    button.disabled = false;
  }
});
$("sair").addEventListener("click", async () => {
  if (ocupado) return;
  try {
    await requisicao("/auth/v1/logout", { method: "POST" });
  } catch {
    /* A sessão local também é encerrada offline. */
  }
  guardarSessao(null);
  historico = [];
  location.reload();
});
$("modo").addEventListener("change", () => {
  $("modo-pista").hidden = $("modo").value !== "pista";
  $("modo-personagem").hidden = $("modo").value !== "personagem";
});
$("exemplo").addEventListener("click", () => {
  $("caso").value = "Exemplo fictício — dossiê de Lia";
  $("personagem").value = "Lia";
  $("pistas").value = JSON.stringify(
    [
      {
        id: "F-001",
        titulo: "Bilhete",
        traducao:
          "Lia assinou o bilhete em 12 de maio. Ela entregou uma chave a Rui.",
      },
      {
        id: "F-002",
        titulo: "Registro",
        traducao: "Segundo o registro, Lia visitou a biblioteca em 13 de maio.",
      },
    ],
    null,
    2,
  );
});
$("imagens").addEventListener("change", () => {
  fotos.forEach(URL.revokeObjectURL);
  fotos = [];
  $("miniaturas").replaceChildren();
  for (const file of Array.from($("imagens").files).slice(0, 3)) {
    const url = URL.createObjectURL(file);
    fotos.push(url);
    const img = elemento("img");
    img.src = url;
    img.alt = file.name;
    $("miniaturas").append(img);
  }
});
const lista = (id) =>
  $(id)
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const lerArquivo = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("Não foi possível ler " + file.name));
    reader.readAsDataURL(file);
  });
async function obterEntrada() {
  const modo = $("modo").value;
  if (modo === "personagem") {
    let pistas;
    try {
      pistas = JSON.parse($("pistas").value);
    } catch {
      throw new Error("Confira o JSON das pistas ou use o exemplo fictício.");
    }
    if (
      !Array.isArray(pistas) ||
      !pistas.length ||
      !$("personagem").value.trim()
    )
      throw new Error("Preencha o personagem e ao menos uma pista.");
    return {
      modo,
      personagem: { nome: $("personagem").value.trim(), aliases: [] },
      pistas,
    };
  }
  const files = Array.from($("imagens").files);
  if (!files.length || files.length > 3)
    throw new Error("Selecione de 1 a 3 imagens da mesma pista.");
  if (
    files.some(
      (f) =>
        f.size > 5 * 1024 * 1024 ||
        !["image/png", "image/jpeg", "image/webp"].includes(f.type),
    )
  )
    throw new Error("Use PNG, JPG ou WebP com até 5 MB cada.");
  if (files.reduce((n, f) => n + f.size, 0) > 12 * 1024 * 1024)
    throw new Error("As imagens juntas devem ter até 12 MB.");
  return {
    modo,
    imagens: await Promise.all(files.map(lerArquivo)),
    personagens: lista("personagens"),
    grupos: lista("grupos"),
    salas: lista("salas"),
  };
}
function metricas(r) {
  const box = elemento("div", undefined, "metrics");
  const values = [
    [usd(r.custo_usd), "custo estimado · USD"],
    [
      r.duracao_ms == null ? "—" : (r.duracao_ms / 1000).toFixed(1) + " s",
      "tempo da chamada",
    ],
    [r.uso?.input_tokens?.toLocaleString("pt-BR") || "—", "tokens de entrada"],
    [
      r.uso?.output_tokens?.toLocaleString("pt-BR") || "—",
      "tokens de saída + raciocínio",
    ],
  ];
  for (const [valor, rotulo] of values) {
    const item = elemento("div");
    item.append(elemento("strong", valor), elemento("small", rotulo));
    box.append(item);
  }
  return box;
}
function renderResultado(r, slot) {
  const root = $("resultado-" + slot);
  root.replaceChildren();
  root.append(
    elemento("p", slot === "a" ? "REFERÊNCIA" : "CANDIDATO", "eyebrow"),
    elemento("h3", r.modelo === "gpt-5-nano" ? "GPT-5 nano" : "GPT-6 Luna"),
  );
  if (r.estado === "processando") {
    root.append(
      elemento(
        "p",
        "Chamada registrada. Aguardando resposta… Se a conexão cair, consulte o histórico antes de repetir.",
        "hint",
      ),
    );
    return;
  }
  root.append(metricas(r));
  root.append(
    elemento(
      "p",
      "Raciocínio: " +
        r.esforco +
        " · Cache lido: " +
        (r.uso?.input_tokens_details?.cached_tokens || 0) +
        " tokens",
      "hint",
    ),
  );
  if (r.erro) root.append(elemento("p", r.erro, "error-text"));
  const output = elemento("div", undefined, "output");
  const field = (title, text) => {
    if (text) output.append(elemento("h4", title), elemento("p", text));
  };
  if (r.resultado) {
    const d = r.resultado;
    const paginasEsperadas = r.configuracao?.imagens_enviadas;
    if (paginasEsperadas && d.paginas?.length !== paginasEsperadas) {
      output.append(elemento("p", "Atenção: " + paginasEsperadas + " imagem(ns) enviada(s), mas " + (d.paginas?.length || 0) + " página(s) devolvida(s). A resposta falhou na correspondência de páginas exigida pelo aplicativo.", "error-text"));
    }
    field("Título", d.titulo);
    field("Resumo", d.resumo);
    (d.paginas || []).forEach((p, i) => {
      field("Página " + (i + 1) + " · original", p.transcricao);
      field("Página " + (i + 1) + " · tradução", p.traducao);
    });
    if (d.fatos)
      field(
        "Fatos e fontes",
        d.fatos.map((f) => f.pista + " — " + f.fato).join("\n"),
      );
    field("Personagens existentes", d.personagens_existentes?.join(", "));
    field("Novos personagens", d.personagens_novos?.join(", "));
    field("Grupo", d.grupo);
    field("Grupo sugerido", d.grupo_sugerido);
    field("Observações", d.observacoes);
    const details = elemento("details");
    details.append(
      elemento("summary", "Resposta completa em JSON"),
      elemento("pre", JSON.stringify(d, null, 2)),
    );
    output.append(details);
  }
  root.append(output);
  if (!r.id) return;
  const review = elemento("form", undefined, "review");
  const label = elemento(
    "label",
    "Qualidade — fidelidade, tradução e ausência de invenções",
  );
  const select = elemento("select");
  for (const [value, text] of [
    ["", "Ainda não avaliada"],
    ["1", "1 · Inadequada"],
    ["2", "2 · Erros importantes"],
    ["3", "3 · Precisa de revisão"],
    ["4", "4 · Boa"],
    ["5", "5 · Excelente"],
  ]) {
    const option = elemento("option", text);
    option.value = value;
    select.append(option);
  }
  select.value = r.avaliacao?.nota || "";
  label.append(select);
  const notesLabel = elemento("label", "Erros, omissões e comentários");
  const notes = elemento("textarea");
  notes.rows = 3;
  notes.maxLength = 2500;
  notes.value = r.avaliacao?.notas || "";
  notesLabel.append(notes);
  const save = elemento("button", "Salvar avaliação", "quiet");
  save.type = "submit";
  review.append(label, notesLabel, save);
  review.addEventListener("submit", async (e) => {
    e.preventDefault();
    save.disabled = true;
    try {
      const avaliacao = {
        nota: select.value ? Number(select.value) : null,
        notas: notes.value,
      };
      const saved = await requisicao(
        "/rest/v1/lab_execucoes?id=eq." + r.id + "&select=id",
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ avaliacao }),
        },
      );
      if (!saved.length)
        throw new Error(
          "Avaliação não salva. Atualize o histórico e tente novamente.",
        );
      r.avaliacao = avaliacao;
      aviso("Avaliação salva.");
      await carregarHistorico();
    } catch (err) {
      aviso(err.message, true);
    } finally {
      save.disabled = false;
    }
  });
  root.append(review);
}
function mostrarPar(rows) {
  for (const [slot, modelo] of [
    ["a", "gpt-5-nano"],
    ["b", "gpt-6-luna"],
  ]) {
    const r = rows.find((x) => x.modelo === modelo);
    if (r) renderResultado(r, slot);
    else {
      $("resultado-" + slot).replaceChildren(
        elemento("h3", modelo),
        elemento(
          "p",
          "Este modelo ainda não tem resultado nesta rodada.",
          "empty",
        ),
      );
    }
  }
  const a = rows.find((r) => r.modelo === "gpt-5-nano"),
    b = rows.find((r) => r.modelo === "gpt-6-luna");
  let texto = rows[0]?.nome || "";
  if (a && b && a.entrada_hash !== b.entrada_hash)
    texto +=
      " · Atenção: entradas diferentes; não compare os custos diretamente.";
  else if (
    a?.estado === "concluido" &&
    b?.estado === "concluido" &&
    Number(a.custo_usd) > 0 &&
    b.custo_usd !== null
  ) {
    const diferenca = (Number(b.custo_usd) / Number(a.custo_usd) - 1) * 100;
    texto +=
      " · Nesta rodada, Luna custou " +
      Math.abs(diferenca).toFixed(1) +
      "% " +
      (diferenca >= 0 ? "a mais" : "a menos") +
      ". Avalie a qualidade antes de escolher.";
  }
  $("resumo-comparacao").textContent = texto;
}
$("comparar").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (ocupado) return;
  ocupado = true;
  $("entradas").disabled = true;
  $("sair").disabled = true;
  const rows = [];
  try {
    const entrada = await obterEntrada(),
      nome = $("caso").value.trim();
    if (!nome) throw new Error("Dê um nome ao teste.");
    const grupo_id = crypto.randomUUID();
    const configs = [
      { slot: "a", modelo: "gpt-5-nano", esforco: $("esforco-a").value },
      { slot: "b", modelo: "gpt-6-luna", esforco: $("esforco-b").value },
    ];
    if (crypto.getRandomValues(new Uint8Array(1))[0] % 2) configs.reverse();
    aviso(
      "Comparação em andamento. Mantenha esta página aberta; cada chamada pode levar até 2 minutos.",
    );
    for (const [i, config] of configs.entries()) {
      $("progresso").textContent = "Chamando " + (i + 1) + " de 2…";
      renderResultado({ ...config, estado: "processando" }, config.slot);
      try {
        const data = await requisicao("/functions/v1/ia-laboratorio", {
          method: "POST",
          body: JSON.stringify({
            ...entrada,
            nome,
            grupo_id,
            id: crypto.randomUUID(),
            modelo: config.modelo,
            esforco: config.esforco,
          }),
        });
        if (data.execucao) {
          rows.push(data.execucao);
          renderResultado(data.execucao, config.slot);
        }
        if (data.error) aviso(data.error, true);
      } catch (err) {
        renderResultado(
          { ...config, estado: "erro", erro: err.message, custo_usd: null },
          config.slot,
        );
        throw err; // Falha de transporte: não dispara mais chamadas automaticamente.
      }
    }
    mostrarPar(rows);
    aviso(
      rows.every((r) => r.estado === "concluido")
        ? "Comparação concluída. Leia as duas respostas e registre sua avaliação."
        : "A rodada teve uma falha. Confira os resultados e o consumo registrado.",
      rows.some((r) => r.estado !== "concluido"),
    );
  } catch (err) {
    aviso(err.message + " Confira o histórico antes de repetir.", true);
  } finally {
    ocupado = false;
    $("entradas").disabled = false;
    $("sair").disabled = false;
    $("progresso").textContent =
      rows.length === 2 ? "Rodada registrada" : "Pronto para conferir";
    await carregarHistorico().catch((err) => aviso(err.message, true));
  }
});
async function carregarHistorico() {
  if (!sessao) return;
  historico = await requisicao(
    "/rest/v1/lab_execucoes?select=*&order=created_at.desc&limit=500",
  );
  const root = $("historico");
  root.replaceChildren();
  const groups = new Map();
  for (const r of historico) {
    if (!groups.has(r.grupo_id)) groups.set(r.grupo_id, []);
    groups.get(r.grupo_id).push(r);
  }
  const conhecidos = historico.filter((r) => r.custo_usd !== null);
  $("total").textContent =
    historico.length +
    " chamadas carregadas (até 500) · Total conhecido: " +
    usd(conhecidos.reduce((s, r) => s + Number(r.custo_usd), 0)) +
    " · " +
    (historico.length - conhecidos.length) +
    " com custo não informado.";
  if (!groups.size)
    root.append(elemento("p", "Seu primeiro teste aparecerá aqui.", "hint"));
  for (const rows of groups.values()) {
    const r = rows[0];
    const button = elemento("button", undefined, "history-row");
    const label = elemento("span");
    label.append(
      elemento("strong", r.nome),
      elemento(
        "small",
        new Date(r.created_at).toLocaleString("pt-BR") +
          " · " +
          (r.modo === "pista" ? "Pista" : "Dossiê"),
      ),
    );
    const values = elemento("span", rows.length + "/2 chamadas");
    values.append(
      elemento(
        "small",
        rows.every((x) => x.estado === "concluido")
          ? "Concluídas"
          : "Conferir estado",
      ),
    );
    button.append(label, values);
    button.addEventListener("click", () => {
      if (ocupado) return;
      mostrarPar(rows);
      $("progresso").textContent = "Histórico";
      $("resultado-a").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    root.append(button);
  }
}
$("atualizar").addEventListener("click", () =>
  carregarHistorico().catch((e) => aviso(e.message, true)),
);
function baixar(conteudo, tipo, extensao) {
  const a = elemento("a"),
    url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  a.href = url;
  a.download =
    "testes-ia-" + new Date().toISOString().slice(0, 10) + "." + extensao;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("exportar").addEventListener("click", () =>
  baixar(
    JSON.stringify(
      {
        exportado_em: new Date().toISOString(),
        projeto: "afmllayitasncvvuownx",
        execucoes: historico,
      },
      null,
      2,
    ),
    "application/json",
    "json",
  ),
);
$("csv").addEventListener("click", () => {
  const campos = [
    "id",
    "grupo_id",
    "nome",
    "modo",
    "modelo",
    "esforco",
    "estado",
    "created_at",
    "custo_usd",
    "duracao_ms",
    "entrada_hash",
    "modelo_retornado",
    "erro",
  ];
  const escape = (v) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  const rows = historico.map((r) => [
    ...campos.map((c) => r[c]),
    r.uso?.input_tokens,
    r.uso?.output_tokens,
    r.avaliacao?.nota,
    r.avaliacao?.notas,
  ]);
  baixar(
    "\uFEFF" +
      [[...campos, "tokens_entrada", "tokens_saida", "nota", "notas"], ...rows]
        .map((row) => row.map(escape).join(","))
        .join("\r\n"),
    "text/csv;charset=utf-8",
    "csv",
  );
});
if (!HOSTS.has(location.hostname)) {
  $("login").hidden = true;
  aviso("Este laboratório só funciona no endereço de testes autorizado.", true);
} else {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) sessao = JSON.parse(raw);
  } catch {
    guardarSessao(null);
  }
  mostrarAcesso();
  carregarHistorico().catch((e) => aviso(e.message, true));
}

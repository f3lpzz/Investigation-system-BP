// Edge Function: ia-processar — o "porteiro" da IA.
// Recebe as imagens de uma pista + o contexto do catálogo, chama a OpenAI
// (GPT-5 nano por padrão) e devolve um JSON estruturado com a ficha preenchida.
//
// Segurança:
// - A chave OPENAI_API_KEY vive SÓ aqui (secret do Supabase), nunca no front/git.
// - Exige login válido (JWT do Supabase) E e-mail na allowlist IA_EMAILS
//   (fail-closed: sem allowlist configurada, ninguém usa).
// - Sem spoiler por construção: o modelo NÃO recebe ferramentas de web —
//   é impossível ele consultar wiki/walkthrough.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// Montagem do texto do dossiê: arquivo à parte para o teste do Node poder
// rodar o MESMO código que roda aqui (ver tools/teste-dossie.mjs).
import { montarDescricao } from "./montar-dossie.mjs";
import {
  extrairRespostaOpenAI,
  LIMITES_IA,
  listaTextos,
  montarContextoPersonagem,
  montarRequisicaoOpenAI,
  validarImagens,
} from "./nucleo.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function inteiroAmbiente(
  nome: string,
  padrao: number,
  minimo: number,
  maximo: number,
) {
  const valor = Number(Deno.env.get(nome));
  return Number.isInteger(valor) && valor >= minimo && valor <= maximo
    ? valor
    : padrao;
}

async function identificadorSeguro(uid: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(uid),
  );
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Regras fixas da "receita" processar-pista (vivem no servidor de propósito).
const REGRAS = `Você processa fotos de pistas do jogo Blue Prince para um catálogo pessoal fan-made. Responda SEMPRE no JSON pedido.

REGRAS INEGOCIÁVEIS:
1. SEM SPOILER: transcreva e traduza APENAS o que está literalmente visível nas imagens. O resumo descreve só o que o texto diz — NUNCA deduza significados, soluções, segredos ou conexões com outras pistas. Não use conhecimento externo sobre o jogo.
2. TRANSCRIÇÃO FIEL E COM LAYOUT: mantenha o texto original em inglês exatamente como está (erros e tudo) e reproduza o desenho do documento, de cima para baixo: título sozinho na linha dele, subtítulo na linha seguinte, cada linha do documento numa linha própria, e UMA linha em branco entre blocos que aparecem separados na imagem. Se algo estiver ilegível, use [ilegível].
3. ELEMENTOS NÃO TEXTUAIS: descreva ilustrações, gráficos, mapas, selos e assinaturas ilegíveis entre colchetes, NA POSIÇÃO em que aparecem no documento, em português nas duas versões. Ex.: [Ilustração: gráfico de aquecimento com curva de -10°C a 30°C]. Descreva só o que está visível; não interprete o significado.
4. TRADUÇÃO: português do Brasil, natural, fiel ao original, espelhando EXATAMENTE as mesmas quebras de linha, linhas em branco e marcadores entre colchetes da transcrição.
5. TÍTULO: padrão "[Assunto principal] — [detalhe distintivo]", máx. 60 caracteres, em português. Ex.: "Aviso ao pessoal — Ala Oeste fechada".
6. PERSONAGENS: em "personagens_existentes" liste APENAS nomes que constam na lista fornecida (grafia exata da lista). Nomes citados no texto que NÃO estão na lista vão em "personagens_novos".
7. GRUPO: escolha no máximo UM grupo da lista fornecida (grafia exata) se a pista claramente pertencer a ele; senão deixe "" e, se fizer sentido, proponha um nome curto em "grupo_sugerido".
8. RESUMO: 1-3 frases neutras sobre o que o texto diz. Sem especulação.
9. "observacoes": avisos práticos (ex.: imagem cortada, texto parcialmente ilegível). Senão, "".`;

// ---- Receita 2: dossiê de PERSONAGEM (modo: "personagem") ----
// Texto-somente (sem imagens): recebe os trechos das pistas que citam o
// personagem e escreve a descrição em resumo + bullets de fatos objetivos,
// um por fato, citando o id da pista. SEM interpretação/especulação.
const REGRAS_PERSONA = `Você escreve o dossiê de UM personagem do jogo Blue Prince para um catálogo pessoal fan-made, a partir de trechos de pistas fornecidos. Responda SEMPRE no JSON pedido.

REGRAS INEGOCIÁVEIS:
1. FONTES: use APENAS os trechos fornecidos. Não use conhecimento externo sobre o jogo e não invente nada que nenhuma pista sustente.
2. SÓ FATOS OBJETIVOS: relate o que cada pista DIZ sobre o personagem, nada além. NUNCA deduza, sugira ou especule — frases como "o que sugere…", "possivelmente…", "indicando envolvimento…" são PROIBIDAS. O que terceiros fizeram com criações do personagem fica de fora, a menos que a interação seja com o personagem em si (ex.: "ele construiu o relógio" entra; "outra pessoa vendeu o relógio dele" só entra se a pista ligar a venda a ele).
3. "resumo": 1 a 3 frases sobre quem é o personagem, só com fatos das pistas. NÃO amontoe os fatos aqui — eles vão detalhados em "fatos".
4. "fatos": UM item por fato — não junte vários fatos num item, e não deixe fato de fora achando que o resumo já cobriu. Em "pista" ponha o id exatamente como aparece entre colchetes no cabeçalho da pista (ex.: F-010). Em "fato" a frase curta e objetiva. Ex.: pista "F-010", fato "Anne Babbage foi a primeira a alugar o livro 'A Sightseer's Guide to Reddington' em 1982". Uma pista com vários fatos gera vários itens, repetindo o id; mantenha os itens da mesma pista juntos, na ordem em que as pistas foram fornecidas.
5. FATO x RUMOR: distinga na redação do fato ("segundo o jornal…", "uma carta afirma…"). Se as pistas se contradizem, escreva um item para cada versão em vez de escolher um lado.
6. IDIOMA: português do Brasil, tom neutro de dossiê; texto puro, sem markdown, sem asteriscos.
7. "observacoes": avisos práticos (ex.: menções ambíguas, pouco material sobre o personagem). Senão, "".`;

// O dossiê volta ESTRUTURADO (resumo + lista de fatos) — o esquema OBRIGA a
// lista a existir; pedir o formato só no texto do prompt falhou com o
// gpt-5-nano (ele escrevia o resumo e ignorava os bullets). O servidor monta
// a "descricao" final a partir destes campos.
const ESQUEMA_PERSONA = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumo: { type: "string" },
    fatos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          pista: { type: "string" },
          fato: { type: "string" },
        },
        required: ["pista", "fato"],
      },
    },
    observacoes: { type: "string" },
  },
  required: ["resumo", "fatos", "observacoes"],
};

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    titulo: { type: "string" },
    paginas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          transcricao: { type: "string" },
          traducao: { type: "string" },
        },
        required: ["transcricao", "traducao"],
      },
    },
    resumo: { type: "string" },
    personagens_existentes: { type: "array", items: { type: "string" } },
    personagens_novos: { type: "array", items: { type: "string" } },
    grupo: { type: "string" },
    grupo_sugerido: { type: "string" },
    observacoes: { type: "string" },
  },
  required: [
    "titulo",
    "paginas",
    "resumo",
    "personagens_existentes",
    "personagens_novos",
    "grupo",
    "grupo_sugerido",
    "observacoes",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")
    return json({ error: "metodo nao permitido" }, 405);

  try {
    // ---- 1) Autenticação (mesmo padrão da apagar-conta) ----
    const token = (req.headers.get("Authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) return json({ error: "sem token de autenticacao" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u?.user) return json({ error: "token invalido" }, 401);

    // ---- 2) Allowlist (fail-closed) ----
    const permitidos = (Deno.env.get("IA_EMAILS") || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const email = (u.user.email || "").toLowerCase();
    if (!permitidos.length || !permitidos.includes(email)) {
      return json({ error: "IA não liberada para esta conta" }, 403);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 500);

    // ---- 3) Entrada (com limites para conter custo) ----
    const tamanhoDeclarado = Number(req.headers.get("content-length") || 0);
    if (tamanhoDeclarado > LIMITES_IA.corpoBytes) {
      return json({ error: "pedido grande demais" }, 413);
    }
    const corpo = await req.text();
    if (new TextEncoder().encode(corpo).byteLength > LIMITES_IA.corpoBytes) {
      return json({ error: "pedido grande demais" }, 413);
    }
    let body: Record<string, any>;
    try {
      body = JSON.parse(corpo);
    } catch {
      return json({ error: "JSON invalido" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "corpo do pedido invalido" }, 400);
    }
    const modo = body.modo === "personagem" ? "personagem" : "pista";

    let sysPrompt: string;
    let userContent: unknown;
    let schemaName: string;
    let schemaObj: unknown;

    if (modo === "personagem") {
      // ---- Receita 2: dossiê de personagem (texto-somente) ----
      let contexto;
      try {
        contexto = montarContextoPersonagem(body);
      } catch (e) {
        return json({ error: String((e as Error).message || e) }, 400);
      }
      sysPrompt = REGRAS_PERSONA;
      userContent =
        `PERSONAGEM: ${contexto.nome}` +
        (contexto.aliases.length
          ? ` (apelidos: ${contexto.aliases.join(", ")})`
          : "") +
        `\n\nPISTAS QUE O CITAM (${contexto.usadas} de ${contexto.recebidas}):\n\n` +
        contexto.blocos.join("\n") +
        (contexto.truncado
          ? "\nAVISO: o contexto atingiu o limite; use somente as pistas acima.\n"
          : "") +
        `\nEscreva o dossiê deste personagem.`;
      schemaName = "dossie_personagem";
      schemaObj = ESQUEMA_PERSONA;
    } else {
      // ---- Receita 1: processar pista (visão) ----
      let imagens: string[];
      try {
        imagens = validarImagens(body.imagens);
      } catch (e) {
        return json({ error: String((e as Error).message || e) }, 400);
      }
      const salas = listaTextos(body.salas, 200, 120);
      const personagens = listaTextos(body.personagens, 200, 240);
      const grupos = listaTextos(body.grupos, 60, 120);
      sysPrompt = REGRAS;
      userContent = [
        {
          type: "input_text",
          text:
            `LISTA DE PERSONAGENS EXISTENTES:\n${personagens.join("; ") || "(vazia)"}\n\n` +
            `LISTA DE GRUPOS EXISTENTES:\n${grupos.join("; ") || "(vazia)"}\n\n` +
            `LISTA DE SALAS (apenas referência de nomes; NÃO escolha sala):\n${salas.join("; ") || "(vazia)"}\n\n` +
            `Processe a(s) ${imagens.length} imagem(ns) desta pista, na ordem enviada (1 item de "paginas" por imagem).`,
        },
        ...imagens.map((url) => ({
          type: "input_image",
          image_url: url,
          detail: "high",
        })),
      ];
      schemaName = "ficha_pista";
      schemaObj = ESQUEMA;
    }

    // ---- 4) Cota atomica no Postgres (protege custo e rajadas) ----
    const limiteHora = inteiroAmbiente("IA_LIMITE_HORA", 60, 1, 10000);
    const { data: cota, error: cotaErro } = await admin.rpc(
      "consumir_cota_ia",
      {
        p_user_id: u.user.id,
        p_rota: modo,
        p_limite: limiteHora,
        p_janela_segundos: 3600,
      },
    );
    if (cotaErro) {
      console.error(
        JSON.stringify({ evento: "ia_cota_falhou", codigo: cotaErro.code }),
      );
      return json({ error: "controle de uso da IA indisponivel" }, 503);
    }
    if (!cota?.permitido) {
      const reinicia = Date.parse(cota?.reinicia_em || "");
      const espera = Number.isFinite(reinicia)
        ? Math.max(1, Math.ceil((reinicia - Date.now()) / 1000))
        : 3600;
      return json(
        {
          error: "limite temporario da IA atingido; tente novamente mais tarde",
        },
        429,
        { "Retry-After": String(espera) },
      );
    }

    // ---- 5) Chamada à OpenAI Responses API (JSON garantido) ----
    const modelo = Deno.env.get("OPENAI_MODEL") || "gpt-5-nano";
    const pedidoOpenAI = montarRequisicaoOpenAI({
      modelo,
      instrucoes: sysPrompt,
      conteudo: userContent,
      schemaNome: schemaName,
      schema: schemaObj,
      modo,
      safetyIdentifier: await identificadorSeguro(u.user.id),
    });
    const inicio = Date.now();
    const abortarOpenAI = new AbortController();
    const timerOpenAI = setTimeout(() => abortarOpenAI.abort(), 120000);
    const abortarComCliente = () => abortarOpenAI.abort();
    req.signal.addEventListener("abort", abortarComCliente, { once: true });
    let resp: Response;
    try {
      resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pedidoOpenAI),
        // A plataforma encerra requests ociosos em 150 s; abortar antes produz
        // um erro controlado. O cancelamento do navegador também é propagado.
        signal: abortarOpenAI.signal,
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        return json({ error: "A IA demorou demais; tente novamente" }, 504);
      }
      throw e;
    } finally {
      clearTimeout(timerOpenAI);
      req.signal.removeEventListener("abort", abortarComCliente);
    }

    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = dados?.error?.message || `OpenAI HTTP ${resp.status}`;
      return json({ error: "Falha na IA: " + msg }, 502);
    }
    let resultado;
    try {
      resultado = extrairRespostaOpenAI(dados);
    } catch (e) {
      return json({ error: String((e as Error).message || e) }, 502);
    }

    // Dossiê: monta a "descricao" (resumo + linha em branco + bullets) AQUI,
    // determinístico — o app continua lendo o campo único de sempre e o
    // formato não depende da obediência do modelo.
    if (modo === "personagem" && resultado && typeof resultado === "object") {
      resultado.descricao = montarDescricao(resultado);
    }

    const duracaoMs = Date.now() - inicio;
    console.log(
      JSON.stringify({
        evento: "ia_processada",
        modo,
        duracao_ms: duracaoMs,
        modelo,
        openai_request_id: resp.headers.get("x-request-id") || undefined,
        tokens_entrada: dados?.usage?.input_tokens,
        tokens_saida: dados?.usage?.output_tokens,
      }),
    );
    return json({
      ok: true,
      resultado,
      modelo,
      uso: dados?.usage
        ? {
            entrada: dados.usage.input_tokens,
            saida: dados.usage.output_tokens,
            cache: dados.usage.input_tokens_details?.cached_tokens || 0,
          }
        : null,
      duracao_ms: duracaoMs,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

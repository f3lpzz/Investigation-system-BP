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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
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
  if (req.method !== "POST") return json({ error: "metodo nao permitido" }, 405);

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
    const body = await req.json();
    const modo = body.modo === "personagem" ? "personagem" : "pista";
    const lista = (arr: unknown, max: number) =>
      (Array.isArray(arr) ? arr : [])
        .filter((x) => typeof x === "string")
        .slice(0, max);
    const txt = (v: unknown, max: number) =>
      typeof v === "string" ? v.slice(0, max) : "";

    let sysPrompt: string;
    let userContent: unknown;
    let schemaName: string;
    let schemaObj: unknown;

    if (modo === "personagem") {
      // ---- Receita 2: dossiê de personagem (texto-somente) ----
      const p = body.personagem || {};
      const nome = txt(p.nome, 120);
      if (!nome) return json({ error: "personagem sem nome" }, 400);
      const aliases = lista(p.aliases, 12).map((a) => a.slice(0, 80));
      const pistas = (Array.isArray(body.pistas) ? body.pistas : []).slice(0, 60);
      if (!pistas.length)
        return json({ error: "nenhuma pista citando o personagem" }, 400);
      const blocos = pistas.map((f: Record<string, unknown>, i: number) => {
        // Id no formato "carimbo" que o app mostra nos cards (f10 → F-010),
        // para os bullets do dossiê citarem a pista do jeito que o usuário vê.
        const idVis = (txt(f.id, 20) || "?").replace(
          /^([a-z]+)(\d+)$/i,
          (_m, letra, num) => letra.toUpperCase() + "-" + num.padStart(3, "0"),
        );
        const cab = `[${idVis}] ${txt(f.titulo, 200) || "(sem título)"}` +
          (txt(f.sala, 80) ? ` — sala: ${txt(f.sala, 80)}` : "") +
          (txt(f.grupo, 80) ? ` — grupo: ${txt(f.grupo, 80)}` : "");
        const en = txt(f.original, 6000);
        const pt = txt(f.traducao, 6000);
        const rs = txt(f.resumo, 1000);
        return (
          `--- PISTA ${i + 1} ---\n${cab}\n` +
          (en ? `EN: ${en}\n` : "") +
          (pt ? `PT: ${pt}\n` : "") +
          (rs ? `Resumo: ${rs}\n` : "")
        );
      });
      sysPrompt = REGRAS_PERSONA;
      userContent =
        `PERSONAGEM: ${nome}` +
        (aliases.length ? ` (apelidos: ${aliases.join(", ")})` : "") +
        `\n\nPISTAS QUE O CITAM (${pistas.length}):\n\n` +
        blocos.join("\n") +
        `\nEscreva o dossiê deste personagem.`;
      schemaName = "dossie_personagem";
      schemaObj = ESQUEMA_PERSONA;
    } else {
      // ---- Receita 1: processar pista (visão) ----
      const imagens: string[] = (body.imagens || []).slice(0, 3);
      if (!imagens.length) return json({ error: "nenhuma imagem enviada" }, 400);
      for (const url of imagens) {
        if (
          typeof url !== "string" ||
          !(url.startsWith("https://") || url.startsWith("data:image/"))
        ) {
          return json({ error: "imagem inválida (use https ou data:image)" }, 400);
        }
      }
      const salas = lista(body.salas, 200);
      const personagens = lista(body.personagens, 200);
      const grupos = lista(body.grupos, 60);
      sysPrompt = REGRAS;
      userContent = [
        {
          type: "text",
          text:
            `LISTA DE PERSONAGENS EXISTENTES:\n${personagens.join("; ") || "(vazia)"}\n\n` +
            `LISTA DE GRUPOS EXISTENTES:\n${grupos.join("; ") || "(vazia)"}\n\n` +
            `LISTA DE SALAS (apenas referência de nomes; NÃO escolha sala):\n${salas.join("; ") || "(vazia)"}\n\n` +
            `Processe a(s) ${imagens.length} imagem(ns) desta pista, na ordem enviada (1 item de "paginas" por imagem).`,
        },
        ...imagens.map((url) => ({ type: "image_url", image_url: { url } })),
      ];
      schemaName = "ficha_pista";
      schemaObj = ESQUEMA;
    }

    // ---- 4) Chamada à OpenAI (JSON garantido) ----
    const modelo = Deno.env.get("OPENAI_MODEL") || "gpt-5-nano";
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        // GPT-5: os tokens de raciocínio contam DENTRO deste limite —
        // teto alto + esforço baixo evita resposta vazia por "length".
        max_completion_tokens: 16000,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: schemaName, strict: true, schema: schemaObj },
        },
      }),
    });

    const dados = await resp.json();
    if (!resp.ok) {
      const msg = dados?.error?.message || `OpenAI HTTP ${resp.status}`;
      return json({ error: "Falha na IA: " + msg }, 502);
    }
    const escolha = dados?.choices?.[0];
    if (escolha?.message?.refusal) {
      return json({ error: "A IA recusou o pedido: " + escolha.message.refusal }, 502);
    }
    if (escolha?.finish_reason === "length") {
      return json(
        { error: "A IA estourou o limite de resposta (length). Tente de novo; se persistir, aumente max_completion_tokens." },
        502,
      );
    }
    let resultado;
    try {
      resultado = JSON.parse(escolha?.message?.content || "");
    } catch {
      return json(
        {
          error:
            "Resposta da IA não veio no formato esperado (finish_reason=" +
            (escolha?.finish_reason || "?") +
            ", conteudo_vazio=" +
            String(!(escolha?.message?.content || "").length) +
            ")",
        },
        502,
      );
    }

    // Dossiê: monta a "descricao" (resumo + linha em branco + bullets) AQUI,
    // determinístico — o app continua lendo o campo único de sempre e o
    // formato não depende da obediência do modelo.
    if (modo === "personagem" && resultado && typeof resultado === "object") {
      resultado.descricao = montarDescricao(resultado);
    }

    return json({
      ok: true,
      resultado,
      modelo,
      uso: dados?.usage
        ? {
            entrada: dados.usage.prompt_tokens,
            saida: dados.usage.completion_tokens,
          }
        : null,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});

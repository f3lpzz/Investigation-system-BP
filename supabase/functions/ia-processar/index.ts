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
2. TRANSCRIÇÃO FIEL: mantenha o texto original em inglês exatamente como está (erros e tudo). Se algo estiver ilegível, use [ilegível].
3. TRADUÇÃO: português do Brasil, natural, fiel ao original.
4. TÍTULO: padrão "[Assunto principal] — [detalhe distintivo]", máx. 60 caracteres, em português. Ex.: "Aviso ao pessoal — Ala Oeste fechada".
5. PERSONAGENS: em "personagens_existentes" liste APENAS nomes que constam na lista fornecida (grafia exata da lista). Nomes citados no texto que NÃO estão na lista vão em "personagens_novos".
6. GRUPO: escolha no máximo UM grupo da lista fornecida (grafia exata) se a pista claramente pertencer a ele; senão deixe "" e, se fizer sentido, proponha um nome curto em "grupo_sugerido".
7. RESUMO: 1-3 frases neutras sobre o que o texto diz. Sem especulação.
8. "observacoes": avisos práticos (ex.: imagem cortada, texto parcialmente ilegível). Senão, "".`;

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
    const lista = (arr: unknown, max: number) =>
      (Array.isArray(arr) ? arr : [])
        .filter((x) => typeof x === "string")
        .slice(0, max);
    const salas = lista(body.salas, 200);
    const personagens = lista(body.personagens, 200);
    const grupos = lista(body.grupos, 60);

    // ---- 4) Chamada à OpenAI (visão + JSON garantido) ----
    const modelo = Deno.env.get("OPENAI_MODEL") || "gpt-5-nano";
    const conteudoUsuario: unknown[] = [
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

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        max_completion_tokens: 4000,
        messages: [
          { role: "system", content: REGRAS },
          { role: "user", content: conteudoUsuario },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "ficha_pista", strict: true, schema: ESQUEMA },
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
    let resultado;
    try {
      resultado = JSON.parse(escolha?.message?.content || "");
    } catch {
      return json({ error: "Resposta da IA não veio no formato esperado" }, 502);
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

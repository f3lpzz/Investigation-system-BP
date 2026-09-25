import "jsr:@supabase/functions-js@2.117.1/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.57.4";
import { montarPedido } from "./receita.ts";
import { extrairRespostaOpenAI, LIMITES_IA } from "./nucleo.mjs";
import { montarDescricao } from "./montar-dossie.mjs";
import { calcularCusto, DATA_PRECOS } from "./custo.mjs";

const PROJETO = "https://afmllayitasncvvuownx.supabase.co";
const ORIGENS = new Set([
  "http://localhost:4599",
  "http://127.0.0.1:4599",
  "https://feature-testes-ia.investigation-system-bp.pages.dev",
]);
const BASE = "e7241e01dcff606dace26f38c630f0941e5fabc4";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function hash(s: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const origem = req.headers.get("Origin") || "";
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Vary: "Origin",
        "Access-Control-Allow-Origin": ORIGENS.has(origem)
          ? origem
          : "http://localhost:4599",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  if (origem && !ORIGENS.has(origem))
    return json({ error: "Origem não autorizada" }, 403);
  if (req.method === "OPTIONS") return json({});
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (Deno.env.get("SUPABASE_URL") !== PROJETO)
    return json({ error: "Laboratório bloqueado neste projeto" }, 403);
  try {
    const token = (req.headers.get("Authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) return json({ error: "Entre com uma conta de testes" }, 401);
    const admin = createClient(
      PROJETO,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    // Valida o usuário no servidor; user_metadata nunca autoriza acesso.
    const { data: autenticacao, error: authError } =
      await admin.auth.getUser(token);
    if (authError || !autenticacao.user)
      return json({ error: "Sessão expirada. Entre novamente." }, 401);
    const usuario = autenticacao.user;
    if (usuario.app_metadata?.ia_lab !== true)
      return json({ error: "Conta sem acesso ao laboratório" }, 403);
    if (Number(req.headers.get("Content-Length")) > LIMITES_IA.corpoBytes)
      return json({ error: "Pedido muito grande" }, 413);
    const texto = await req.text();
    if (new TextEncoder().encode(texto).byteLength > LIMITES_IA.corpoBytes)
      return json({ error: "Pedido muito grande" }, 413);
    let body;
    try {
      body = JSON.parse(texto);
    } catch {
      return json({ error: "Pedido inválido" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body))
      return json({ error: "Pedido inválido" }, 400);
    const key = Deno.env.get("OPENAI_API_KEY");
    if (body.acao === "status")
      return json({ ok: true, chave_configurada: !!key, base: BASE });
    if (!key)
      return json(
        {
          error:
            "A chave OpenAI ainda não está configurada no projeto de testes",
        },
        503,
      );
    if (
      !UUID.test(body.id) ||
      !UUID.test(body.grupo_id) ||
      !["gpt-5-nano", "gpt-6-luna"].includes(body.modelo) ||
      !(
        body.modelo === "gpt-6-luna"
          ? ["low", "medium", "high", "xhigh", "max"]
          : ["low", "medium", "high"]
      ).includes(body.esforco) ||
      !["pista", "personagem"].includes(body.modo)
    )
      return json({ error: "Configuração inválida" }, 400);
    const nome =
      typeof body.nome === "string" ? body.nome.trim().slice(0, 120) : "";
    if (!nome) return json({ error: "Dê um nome ao caso de teste" }, 400);
    if (
      body.modo === "pista" &&
      (!Array.isArray(body.imagens) ||
        body.imagens.some(
          (s: unknown) =>
            typeof s !== "string" ||
            !/^data:image\/(png|jpeg|webp);base64,/.test(s),
        ))
    )
      return json({ error: "Envie arquivos PNG, JPEG ou WebP" }, 400);
    let pedido;
    try {
      pedido = montarPedido(
        body,
        body.modelo,
        body.esforco,
        await hash(usuario.id),
      );
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
    const entradaHash = await hash(
      JSON.stringify({
        instructions: pedido.instructions,
        input: pedido.input,
        format: pedido.text,
      }),
    );
    const pedidoHash = await hash(
      JSON.stringify({ pedido, grupo: body.grupo_id, nome }),
    );
    const configuracao = {
      base: BASE,
      max_output_tokens: pedido.max_output_tokens,
      reasoning: pedido.reasoning,
      image_detail: body.modo === "pista" ? "high" : null,
      imagens_enviadas: body.modo === "pista" ? body.imagens.length : 0,
      store: false,
      service_tier: "default",
      precos_em: DATA_PRECOS,
    };
    const { data: reserva, error: reservaErro } = await admin.rpc(
      "lab_reservar",
      {
        p_registro: {
          id: body.id,
          user_id: usuario.id,
          grupo_id: body.grupo_id,
          nome,
          entrada_hash: entradaHash,
          pedido_hash: pedidoHash,
          modo: body.modo,
          modelo: body.modelo,
          esforco: body.esforco,
          configuracao,
        },
      },
    );
    if (reservaErro)
      return json(
        {
          error:
            "Não foi possível registrar o teste; nenhuma chamada foi feita",
        },
        503,
      );
    if (reserva.erro) return json({ error: reserva.erro }, 429);
    if (reserva.existente)
      return json(
        { execucao: reserva.existente, repetida: true },
        reserva.existente.estado === "processando" ? 409 : 200,
      );
    const inicio = Date.now();
    let resposta: Record<string, any> = {};
    let dados: Record<string, any> = {};
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pedido),
        signal: AbortSignal.timeout(120000),
      });
      dados = await response.json();
      if (!response.ok)
        throw new Error(
          `OpenAI ${response.status}: ${String(dados.error?.message || "falha na chamada").slice(0, 600)}`,
        );
      const resultado = extrairRespostaOpenAI(dados);
      if (body.modo === "personagem")
        resultado.descricao = montarDescricao(resultado);
      resposta = { estado: "concluido", resultado };
    } catch (e) {
      resposta = {
        estado: "erro",
        erro:
          (e as Error).name === "TimeoutError"
            ? "Tempo esgotado. O custo pode ter sido cobrado; consulte o uso na OpenAI antes de repetir."
            : (e as Error).message,
      };
    }
    // Salva consumo também quando a saída é recusada/incompleta. Sem usage = custo desconhecido.
    const custo = calcularCusto(
      body.modelo,
      dados.usage,
      dados.service_tier || "default",
    );
    const registro = {
      ...resposta,
      uso: dados.usage || null,
      custo_usd: custo,
      duracao_ms: Date.now() - inicio,
      modelo_retornado: dados.model || null,
      configuracao: {
        ...configuracao,
        service_tier_retornado: dados.service_tier || null,
        response_id: dados.id || null,
      },
    };
    const { data: salvo, error: salvarErro } = await admin
      .from("lab_execucoes")
      .update(registro)
      .eq("id", body.id)
      .eq("user_id", usuario.id)
      .select()
      .single();
    if (salvarErro)
      return json(
        {
          error:
            "A chamada foi feita, mas o histórico não foi salvo. Exporte este resultado; não repita automaticamente.",
          execucao: {
            id: body.id,
            grupo_id: body.grupo_id,
            nome,
            modo: body.modo,
            modelo: body.modelo,
            esforco: body.esforco,
            entrada_hash: entradaHash,
            ...registro,
          },
        },
        503,
      );
    return json({ execucao: salvo });
  } catch {
    return json(
      { error: "Falha no laboratório. Confira o histórico antes de repetir." },
      500,
    );
  }
});

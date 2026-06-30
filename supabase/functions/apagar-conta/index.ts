// Edge Function: apagar-conta
// Apaga a conta do PRÓPRIO usuário (LGPD): imagens no Storage + linha do
// catálogo + usuário no Auth. A chave service_role vive só aqui (variável de
// ambiente do servidor), NUNCA no app. O usuário a ser apagado é deduzido do
// PRÓPRIO token (não há parâmetro user_id), então ninguém apaga a conta de outro.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "metodo nao permitido" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "sem token de autenticacao" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Identifica o dono a partir do PRÓPRIO token (cada um só apaga a si mesmo).
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u?.user) return json({ error: "token invalido" }, 401);
    const uid = u.user.id;

    // 1) Apaga as imagens da pasta {uid}/ no Storage.
    const { data: arquivos } = await admin.storage
      .from("imagens")
      .list(uid, { limit: 1000 });
    if (arquivos && arquivos.length) {
      const caminhos = arquivos.map((f) => `${uid}/${f.name}`);
      await admin.storage.from("imagens").remove(caminhos);
    }

    // 2) Apaga a linha do catálogo (defensivo; o delete do usuário já cascateia).
    await admin.from("catalogo_usuario").delete().eq("user_id", uid);

    // 3) Apaga o usuário do Auth (cascateia o catálogo via FK on delete cascade).
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      return json({ error: "falha ao apagar a conta: " + delErr.message }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    return json(
      { error: String((e as Error)?.message || e) },
      500,
    );
  }
});

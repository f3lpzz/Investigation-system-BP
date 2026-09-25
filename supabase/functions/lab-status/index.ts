import { createClient } from "jsr:@supabase/supabase-js@2.57.4";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};
Deno.serve(async (req) => {
  const reply = (x: unknown, s = 200) =>
    new Response(JSON.stringify(x), {
      status: s,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  if (req.method === "OPTIONS") return reply({});
  if (
    Deno.env.get("SUPABASE_URL") !== "https://afmllayitasncvvuownx.supabase.co"
  )
    return reply({ error: "projeto incorreto" }, 403);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await admin.auth.getUser(
    (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""),
  );
  if (error || !data.user) return reply({ error: "login necessário" }, 401);
  if (data.user.app_metadata?.ia_lab !== true)
    return reply({ error: "conta sem acesso" }, 403);
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return reply({ key_configured: false }, 503);
  const models = await Promise.all(
    ["gpt-5-nano", "gpt-6-luna"].map(async (model) => {
      const r = await fetch("https://api.openai.com/v1/models/" + model, {
        headers: { Authorization: "Bearer " + key },
      });
      const d = await r.json();
      return {
        model,
        status: r.status,
        available: r.ok,
        error: r.ok ? undefined : d.error?.code,
      };
    }),
  );
  return reply({ key_configured: true, models });
});

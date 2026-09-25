import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { PGlite } from "@electric-sql/pglite";
import { calcularCusto } from "../supabase/functions/ia-laboratorio/custo.mjs";
const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("preços: cache lido/escrito sem duplicar raciocínio; falha sem uso tem custo desconhecido", () => {
  const uso = {
    input_tokens: 1000000,
    output_tokens: 100000,
    input_tokens_details: { cached_tokens: 100000, cache_write_tokens: 200000 },
    output_tokens_details: { reasoning_tokens: 50000 },
  };
  // Contexto longo de Luna dobra entrada/cache e aumenta saída em 50%.
  assert.ok(
    Math.abs(
      calcularCusto("gpt-6-luna", uso) -
        (0.07 * 2 + 0.001 * 2 + 0.025 * 2 + 0.05 * 1.5),
    ) < 1e-12,
  );
  assert.equal(
    calcularCusto("gpt-5-nano", { input_tokens: 627, output_tokens: 334 }),
    0.00016495,
  );
  assert.equal(calcularCusto("gpt-6-luna", null), null);
  assert.equal(calcularCusto("gpt-6-luna", uso, "priority"), null);
  assert.equal(
    calcularCusto("gpt-6-luna", {
      input_tokens: 1,
      output_tokens: 1,
      input_tokens_details: { cached_tokens: 2 },
    }),
    null,
  );
});

test("receita mantém as instruções/esquemas e o núcleo do app sem modificar produção", () => {
  const constants = (source) => {
    const code = source.slice(
      source.indexOf("const REGRAS ="),
      source.indexOf("const ESQUEMA ="),
    );
    const schema = source.slice(
      source.indexOf("const ESQUEMA ="),
      source.indexOf("const ESQUEMA =") +
        source.slice(source.indexOf("const ESQUEMA =")).indexOf("\n};") +
        3,
    );
    return JSON.stringify(
      vm.runInNewContext(
        code + schema + ";({REGRAS, REGRAS_PERSONA, ESQUEMA, ESQUEMA_PERSONA})",
      ),
    );
  };
  assert.equal(
    constants(
      read("../supabase/functions/ia-laboratorio/receita.ts").replaceAll(
        "\r\n",
        "\n",
      ),
    ),
    constants(
      read("../supabase/functions/ia-processar/index.ts").replaceAll(
        "\r\n",
        "\n",
      ),
    ),
  );
  for (const file of ["nucleo.mjs", "montar-dossie.mjs"])
    assert.equal(
      read("../supabase/functions/ia-laboratorio/" + file),
      read("../supabase/functions/ia-processar/" + file),
    );
});

test("histórico: RLS entre contas, permissão só de avaliação, reserva idempotente e cota", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create role anon; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select current_setting('request.jwt.claim.sub', true)::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select '{"app_metadata":{"ia_lab":true}}'::jsonb $$;
      grant usage on schema auth,public to authenticated,service_role;`);
    await db.exec(read("../supabase/laboratorio/schema.sql"));
    const a = "00000000-0000-4000-8000-000000000001",
      b = "00000000-0000-4000-8000-000000000002";
    await db.query("insert into auth.users values ($1),($2)", [a, b]);
    await db.exec("set role service_role");
    const registro = {
      id: a,
      user_id: a,
      grupo_id: a,
      nome: "Caso",
      entrada_hash: "hash",
      pedido_hash: "pedido",
      modo: "pista",
      modelo: "gpt-5-nano",
      esforco: "low",
      configuracao: {},
    };
    const reservar = async (r) =>
      (await db.query("select public.lab_reservar($1) r", [JSON.stringify(r)]))
        .rows[0].r;
    assert.equal((await reservar(registro)).permitido, true);
    assert.equal((await reservar(registro)).existente.id, a);
    assert.ok((await reservar({ ...registro, pedido_hash: "outro" })).erro);
    await db.exec("reset role; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
    assert.equal(
      (await db.query("select * from lab_execucoes")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("update lab_execucoes set avaliacao = '{}' returning id"))
        .rows.length,
      0,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    assert.equal(
      (await db.query("select * from lab_execucoes")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update lab_execucoes set avaliacao = '{\"nota\":4}' returning id",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query("update lab_execucoes set custo_usd=0"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select lab_reservar('{}')"),
      /permission denied/,
    );
    await db.exec("reset role; set role service_role");
    for (let i = 3; i <= 31; i++)
      assert.equal(
        (
          await reservar({
            ...registro,
            id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
          })
        ).permitido,
        true,
      );
    assert.match((await reservar({ ...registro, id: b })).erro, /30 chamadas/);
    await db.query("update lab_execucoes set esforco='high' where id=$1", [a]);
    await assert.rejects(
      db.query("update lab_execucoes set esforco='max' where id=$1", [a]),
      /lab_execucoes_esforco_check/,
    );
    await db.query(
      "update lab_execucoes set modelo='gpt-6-luna', esforco='max' where id=$1",
      [a],
    );
    await db.query("update lab_execucoes set esforco='xhigh' where id=$1", [a]);
  } finally {
    await db.close();
  }
});

test("tela: entrada idêntica nos dois modelos, histórico e conteúdo tratado como texto", async () => {
  const dom = new JSDOM(read("../app/lab-ia/index.html"), {
    url: "http://localhost:4599/lab-ia/index.html",
    runScripts: "outside-only",
  });
  const w = dom.window;
  const calls = [],
    saved = [];
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.sessionStorage.setItem(
    "investigation-lab-session-v1",
    JSON.stringify({
      access_token: "fake",
      expires_at: Date.now() / 1000 + 500,
    }),
  );
  w.fetch = async (url, options) => {
    assert.ok(url.startsWith("https://afmllayitasncvvuownx.supabase.co/"));
    if (url.includes("/rest/")) return { ok: true, json: async () => saved };
    const b = JSON.parse(options.body);
    calls.push(b);
    const r = {
      id: b.id,
      grupo_id: b.grupo_id,
      nome: b.nome,
      modelo: b.modelo,
      esforco: b.esforco,
      estado: "concluido",
      custo_usd: 0.001,
      entrada_hash: "same",
      created_at: new Date().toISOString(),
      resultado: { resumo: '<img src=x onerror="alert(1)">', fatos: [] },
      avaliacao: {},
    };
    saved.push(r);
    return { ok: true, json: async () => ({ execucao: r }) };
  };
  try {
    w.eval(read("../app/lab-ia/lab.js"));
    w.document.getElementById("modo").value = "personagem";
    w.document.getElementById("exemplo").click();
    w.document.getElementById("esforco-a").value = "high";
    w.document.getElementById("esforco-b").value = "max";
    w.document
      .getElementById("comparar")
      .dispatchEvent(
        new w.Event("submit", { bubbles: true, cancelable: true }),
      );
    for (let i = 0; i < 50 && calls.length < 2; i++)
      await new Promise((r) => setTimeout(r, 5));
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(calls.length, 2);
    assert.equal(calls.find((c) => c.modelo === "gpt-5-nano").esforco, "high");
    assert.equal(calls.find((c) => c.modelo === "gpt-6-luna").esforco, "max");
    assert.deepEqual(calls[0].pistas, calls[1].pistas);
    assert.equal(calls[0].grupo_id, calls[1].grupo_id);
    assert.notEqual(calls[0].id, calls[1].id);
    assert.equal(w.document.querySelectorAll(".output img").length, 0);
    assert.match(w.document.getElementById("resultado-a").textContent, /<img/);
    assert.equal(w.document.querySelectorAll(".history-row").length, 1);
    assert.equal(w.document.getElementById("entradas").disabled, false);
  } finally {
    w.close();
  }
});

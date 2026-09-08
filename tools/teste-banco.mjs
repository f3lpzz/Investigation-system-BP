// Postgres local em WASM; usa as migrações reais. Auth/Storage são esquemas
// mínimos de teste, sem conexão, chaves ou usuários do Supabase de produção.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("migrações idempotentes, RLS e gravação condicional no Postgres", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role authenticated;
      create role anon;
      create schema auth;
      create schema storage;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
      $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id integer generated always as identity primary key,bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$
        select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]
      $$;
      grant usage on schema auth,storage,public to authenticated,anon;
      grant select,insert,update,delete on storage.objects to authenticated;
      grant usage on all sequences in schema storage to authenticated;
    `);
    const migracoes = fs.readdirSync(new URL("../supabase/migrations/", import.meta.url))
      .filter((nome) => nome.endsWith(".sql")).sort();
    for (let repeticao = 0; repeticao < 2; repeticao++)
      for (const nome of migracoes)
        await db.exec(
          fs.readFileSync(
            new URL("../supabase/migrations/" + nome, import.meta.url),
            "utf8",
          ),
        );
    const A = "00000000-0000-0000-0000-000000000001",
      B = "00000000-0000-0000-0000-000000000002";
    await db.query("insert into auth.users values ($1),($2)", [A, B]);
    await db.query(
      "insert into public.catalogo_usuario(user_id,dados) values ($1,'{}'),($2,'{}')",
      [A, B],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values ('imagens',$1),('imagens',$2)",
      [A + "/a.png", B + "/b.png"],
    );
    // Sementes mantidas no repositório precisam caber no esquema versionado.
    for (let i = 1; i <= 4; i++)
      await db.exec(
        fs.readFileSync(
          new URL(`../supabase/seed/seed-salas-0${i}.sql`, import.meta.url),
          "utf8",
        ),
      );
    await db.exec("set role authenticated");
    for (const [eu, outro] of [
      [A, B],
      [B, A],
    ]) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        eu,
      ]);
      assert.equal(
        (await db.query("select * from public.catalogo_usuario")).rows.length,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select * from public.catalogo_usuario where user_id=$1",
            [outro],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "update public.catalogo_usuario set dados='{}' where user_id=$1 returning user_id",
            [outro],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "delete from public.catalogo_usuario where user_id=$1 returning user_id",
            [outro],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (await db.query("select * from storage.objects")).rows.length,
        1,
      );
      await assert.rejects(() =>
        db.query("update storage.objects set name=$1 where name=$2", [
          outro + "/roubo.png",
          eu + (eu === A ? "/a.png" : "/b.png"),
        ]),
      );
      await assert.rejects(() =>
        db.query(
          "insert into storage.objects(bucket_id,name) values ('imagens',$1)",
          [outro + "/intruso.png"],
        ),
      );
    }
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [A]);
    const antiga = (
      await db.query(
        "select atualizado_em::text as versao from catalogo_usuario",
      )
    ).rows[0].versao;
    const nova = (
      await db.query(
        'update catalogo_usuario set dados=\'{"texto":"A"}\' where user_id=$1 and atualizado_em=$2 returning atualizado_em::text as versao',
        [A, antiga],
      )
    ).rows;
    assert.equal(nova.length, 1);
    assert.notEqual(nova[0].versao, antiga);
    const conflito = await db.query(
      'update catalogo_usuario set dados=\'{"texto":"B"}\' where user_id=$1 and atualizado_em=$2 returning user_id',
      [A, antiga],
    );
    assert.equal(conflito.rows.length, 0);
    assert.equal(
      (await db.query("select dados from catalogo_usuario")).rows[0].dados
        .texto,
      "A",
    );
    await assert.rejects(() =>
      db.query("insert into diretorio_salas(nome) values ('intruso')"),
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(() => db.query("select * from catalogo_usuario"));
    await db.exec("reset role");
    await db.query("delete from auth.users where id=$1", [A]);
    assert.equal(
      (await db.query("select * from catalogo_usuario where user_id=$1", [A]))
        .rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});

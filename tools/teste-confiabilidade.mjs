import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { JSDOM } from "jsdom";
import { APP, scriptsApp } from "./carregar-app.mjs";
import { excluirDadosDaConta } from "../supabase/functions/apagar-conta/excluir-dados.mjs";
const fixture = JSON.parse(
  fs.readFileSync(new URL("./fixtures/catalogo.json", import.meta.url)),
);
const clone = (o) => JSON.parse(JSON.stringify(o));
function ambiente() {
  const dom = new JSDOM(
    fs.readFileSync(path.join(APP, "painel.html"), "utf8"),
    { url: "http://localhost/", pretendToBeVisual: true },
  );
  const w = dom.window;
  w.alert = () => {};
  w.confirm = () => true;
  w.MODO_ONLINE = true;
  const ctx = vm.createContext(w);
  const run = (s) => vm.runInContext(s, ctx);
  run("const DADOS = " + JSON.stringify(fixture));
  // Uma execução por script: detecta dependências de ordem que concatenar ocultaria.
  for (const nome of scriptsApp())
    run(fs.readFileSync(path.join(APP, nome), "utf8"));
  return { dom, w, run };
}
const diferida = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};

test("scripts separados carregam e renderizam todas as telas", () => {
  const a = ambiente();
  for (const v of ["grade", "mapa", "teorias", "arquivo", "conta"])
    a.run(`setView(${JSON.stringify(v)});render()`);
  assert.equal(a.run("DADOS_BROKEN"), false);
  a.dom.window.close();
});

test("edição durante request não é marcada salva; flush espera todas as versões", async () => {
  const a = ambiente(),
    primeiro = diferida(),
    segundo = diferida();
  let dados = { titulo: "primeira" },
    confirmacoes = 0;
  const envios = [],
    estados = [];
  const c = a.w.ControleNuvem.criar({
    versao: "v1",
    dados: () => dados,
    status: (s) => estados.push(s),
    confirmar: () => confirmacoes++,
    gravar: async (d, v) => {
      envios.push({ d, v });
      return envios.length === 1 ? primeiro.promise : segundo.promise;
    },
  });
  c.alterar();
  const flush = c.salvar();
  dados.titulo = "segunda";
  c.alterar();
  primeiro.resolve("v2");
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(confirmacoes, 0);
  assert.equal(c.pendente(), true);
  assert.equal(envios[0].d.titulo, "primeira");
  segundo.resolve("v3");
  assert.equal(await flush, true);
  assert.equal(envios[1].d.titulo, "segunda");
  assert.equal(envios[1].v, "v2");
  assert.equal(confirmacoes, 1);
  assert.equal(estados.at(-1), "saved");
  c.encerrar();
  a.dom.window.close();
});

test("falha mantém pendência; retry salva; controller encerrado ignora resposta antiga", async () => {
  const a = ambiente();
  let falhar = true,
    confirmacoes = 0;
  const c = a.w.ControleNuvem.criar({
    versao: "v1",
    dados: () => ({ titulo: "preservado" }),
    status: () => {},
    confirmar: () => confirmacoes++,
    gravar: async () => {
      if (falhar) throw new Error("offline");
      return "v2";
    },
  });
  c.alterar();
  assert.equal(await c.salvar(), false);
  assert.equal(c.pendente(), true);
  assert.equal(c.estado(), "erro");
  falhar = false;
  assert.equal(await c.salvar(), true);
  assert.equal(confirmacoes, 1);
  c.encerrar();
  const d = diferida();
  const velho = a.w.ControleNuvem.criar({
    versao: "v1",
    dados: () => ({}),
    status: () => {},
    confirmar: () => confirmacoes++,
    gravar: () => d.promise,
  });
  velho.alterar();
  const p = velho.salvar();
  velho.encerrar();
  d.resolve("v2");
  assert.equal(await p, false);
  assert.equal(confirmacoes, 1);
  a.dom.window.close();
});

test("duas abas: uma salva, a outra preserva o rascunho e sinaliza conflito", async () => {
  const a = ambiente();
  let versao = "v1",
    nuvem = { texto: "original" };
  function controle(texto) {
    return a.w.ControleNuvem.criar({
      versao: "v1",
      dados: () => ({ texto }),
      status: () => {},
      confirmar: () => {},
      gravar: async (d, v) => {
        if (v !== versao)
          throw Object.assign(new Error("conflito"), { code: "CONFLITO" });
        nuvem = d;
        versao = "v2";
        return versao;
      },
    });
  }
  const c1 = controle("aba A"),
    c2 = controle("aba B");
  c1.alterar();
  c2.alterar();
  assert.equal(await c1.salvar(), true);
  assert.equal(await c2.salvar(), false);
  assert.equal(c2.estado(), "conflito");
  assert.equal(c2.pendente(), true);
  assert.equal(nuvem.texto, "aba A");
  assert.equal(await c2.salvar(), false);
  c1.encerrar();
  c2.encerrar();
  a.dom.window.close();
});

test("importação rejeita estrutura inválida e remove HTML ativo preservando menções", () => {
  const a = ambiente(),
    original = JSON.parse(a.run("JSON.stringify(DADOS)")),
    mal = clone(fixture);
  mal.quadros[0].nodes = [
    {
      id: "n1",
      tipo: "texto",
      x: 1,
      y: 2,
      texto:
        '<b>Fato</b><img src=x onerror="alert(1)"><svg onload="alert(1)"></svg><span class="ment" data-kind="pista" data-ref="f1" onclick="alert(1)">F-001</span>',
    },
  ];
  const preparado = a.w.Catalogo.preparar(mal);
  assert.match(preparado.quadros[0].nodes[0].texto, /<b>Fato<\/b>/);
  assert.match(preparado.quadros[0].nodes[0].texto, /data-ref="f1"/);
  assert.doesNotMatch(
    preparado.quadros[0].nodes[0].texto,
    /onerror|onclick|<svg|<img/,
  );
  for (const dano of [
    (d) => (d.salas = {}),
    (d) => (d.fichas[0].id = "x');alert(1)//"),
    (d) => d.fichas.push(clone(d.fichas[0])),
    (d) => (d.quadros[0].cam.x = "1px;bad"),
  ]) {
    const d = clone(fixture);
    dano(d);
    assert.throws(() => a.w.Catalogo.preparar(d));
  }
  assert.deepEqual(JSON.parse(a.run("JSON.stringify(DADOS)")), original);
  const literal =
    "/* legado */ const DADOS = " +
    JSON.stringify(fixture) +
    '; alert("não executar");';
  assert.equal(a.w.Catalogo.ler(literal).fichas.length, 5);
  a.dom.window.close();
});

test("backup leva os bytes e restaura imagens em outra conta; falhas não geram backup incompleto", async () => {
  const a = ambiente(),
    d = clone(fixture),
    bytes = new a.w.Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
  d.fichas[0].paginas[0].imagem = "nuvem:conta-A/foto.png";
  d.fichas[1].paginas[0].imagem = "nuvem:conta-A/foto.png";
  let baixadas = 0;
  const backup = await a.w.BackupCatalogo.criar(d, {
    download: async () => {
      baixadas++;
      return { data: bytes };
    },
  });
  assert.equal(baixadas, 1);
  assert.equal(
    backup.imagens["nuvem:conta-A/foto.png"],
    "data:image/png;base64,AQID",
  );
  const uploads = [];
  const r = await a.w.BackupCatalogo.restaurar(backup, "conta-B", {
    upload: async (p, b) => {
      uploads.push({ p, b });
      return {};
    },
    remove: async () => ({}),
  });
  assert.equal(uploads.length, 1);
  assert.match(uploads[0].p, /^conta-B\//);
  assert.equal(
    r.dados.fichas[0].paginas[0].imagem,
    r.dados.fichas[1].paginas[0].imagem,
  );
  assert.equal(d.fichas[0].paginas[0].imagem, "nuvem:conta-A/foto.png");
  await assert.rejects(() =>
    a.w.BackupCatalogo.criar(d, {
      download: async () => ({ error: new Error("offline") }),
    }),
  );
  await assert.rejects(
    () => a.w.BackupCatalogo.restaurar(d, "conta-B", {}),
    /conta original/,
  );
  const invalido = clone(backup);
  invalido.imagens = {};
  await assert.rejects(() =>
    a.w.BackupCatalogo.restaurar(invalido, "conta-B", {}),
  );
  await assert.rejects(
    () =>
      a.w.BackupCatalogo.restaurar(backup, "conta-B", {
        upload: async () => ({ error: new Error("cheio") }),
      }),
    /cheio/,
  );
  a.dom.window.close();
});

function adminFalso(qtd, falha) {
  const arquivos = new Set(
    Array.from({ length: qtd }, (_, i) => "user/" + i + ".png"),
  );
  arquivos.add("user/sub/p.png");
  let apagouAuth = false;
  const admin = {
    storage: {
      from: () => ({
        list: async (p, { limit, offset }) => {
          assert.equal(offset, 0);
          if (falha === "list") return { error: new Error("offline") };
          const itens = new Map();
          for (const arq of arquivos) {
            if (!arq.startsWith(p + "/")) continue;
            const resto = arq.slice(p.length + 1),
              name = resto.split("/")[0];
            itens.set(name, { name, id: resto.includes("/") ? null : arq });
          }
          return { data: [...itens.values()].slice(0, limit) };
        },
        remove: async (ps) => {
          if (falha === "remove") return { error: new Error("offline") };
          ps.forEach((p) => arquivos.delete(p));
          return {};
        },
      }),
    },
    auth: {
      admin: {
        deleteUser: async () => {
          if (falha === "auth") return { error: new Error("offline") };
          assert.equal(arquivos.size, 0);
          apagouAuth = true;
          return {};
        },
      },
    },
  };
  return { admin, arquivos, apagou: () => apagouAuth };
}
test("exclusão percorre mais de 1000 imagens e subpastas; Auth só é removido depois", async () => {
  const f = adminFalso(1205);
  await excluirDadosDaConta(f.admin, "user");
  assert.equal(f.arquivos.size, 0);
  assert.equal(f.apagou(), true);
  for (const etapa of ["list", "remove", "auth"]) {
    const d = adminFalso(3, etapa);
    await assert.rejects(() => excluirDadosDaConta(d.admin, "user"));
    assert.equal(d.apagou(), false);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  extrairRespostaOpenAI,
  LIMITES_IA,
  listaTextos,
  montarContextoPersonagem,
  montarRequisicaoOpenAI,
  validarImagens,
} from "../supabase/functions/ia-processar/nucleo.mjs";

test("entrada da IA limita listas e imagens antes de gerar custo", () => {
  assert.deepEqual(listaTextos(["abcdef", 2, "xy"], 2, 3), ["abc", "xy"]);
  assert.deepEqual(validarImagens(["https://exemplo.test/a.jpg"]), [
    "https://exemplo.test/a.jpg",
  ]);
  assert.throws(() => validarImagens({}), /nenhuma imagem/);
  assert.throws(
    () => validarImagens(["http://inseguro.test/a.jpg"]),
    /imagem invalida/,
  );
  assert.throws(
    () =>
      validarImagens([
        "data:image/png,A",
        "data:image/png,B",
        "data:image/png,C",
        "data:image/png,D",
      ]),
    /no maximo 3/,
  );
});

test("dossie tem orçamento global e não duplica original + tradução", () => {
  const pistas = Array.from({ length: 60 }, (_, i) => ({
    id: "f" + (i + 1),
    titulo: "Pista " + i,
    original: "ORIGINAL-NAO-DEVE-ENTRAR " + "e".repeat(5000),
    traducao: "TRADUCAO " + "p".repeat(5000),
    resumo: "Resumo",
  }));
  const contexto = montarContextoPersonagem({
    personagem: { nome: "Mary", aliases: ["M."] },
    pistas,
  });
  const texto = contexto.blocos.join("\n");
  assert.equal(contexto.nome, "Mary");
  assert.equal(contexto.truncado, true);
  assert.ok(contexto.usadas <= LIMITES_IA.pistasPersonagem);
  assert.ok(
    texto.length <= LIMITES_IA.caracteresDossie + contexto.blocos.length,
  );
  assert.match(texto, /PT: TRADUCAO/);
  assert.doesNotMatch(texto, /ORIGINAL-NAO-DEVE-ENTRAR/);
  assert.match(texto, /\[F-001\]/);
});

test("pedido usa Responses API sem armazenamento e com saída estruturada", () => {
  const pedido = montarRequisicaoOpenAI({
    modelo: "gpt-teste",
    instrucoes: "Regras fixas",
    conteudo: [{ type: "input_text", text: "entrada" }],
    schemaNome: "resultado",
    schema: { type: "object", properties: {}, additionalProperties: false },
    modo: "pista",
    safetyIdentifier: "hash",
  });
  assert.equal(pedido.model, "gpt-teste");
  assert.equal(pedido.store, false);
  assert.equal(pedido.input[0].content[0].type, "input_text");
  assert.equal(pedido.text.format.type, "json_schema");
  assert.equal(pedido.text.format.strict, true);
  assert.equal(pedido.max_output_tokens, 12000);
});

test("resposta estruturada é extraída sem depender da posição do item", () => {
  const valor = extrairRespostaOpenAI({
    status: "completed",
    output: [
      { type: "reasoning", content: [] },
      {
        type: "message",
        content: [{ type: "output_text", text: '{"ok":true}' }],
      },
    ],
  });
  assert.deepEqual(valor, { ok: true });
  assert.throws(
    () =>
      extrairRespostaOpenAI({
        status: "completed",
        output: [{ content: [{ type: "refusal", refusal: "não posso" }] }],
      }),
    /recusou/,
  );
  assert.throws(
    () =>
      extrairRespostaOpenAI({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
      }),
    /max_output_tokens/,
  );
});

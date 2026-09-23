// Funcoes puras do backend de IA. Ficam separadas para o mesmo codigo ser
// testado no Node e executado pela Edge Function, sem simular a rede.

export const LIMITES_IA = Object.freeze({
  corpoBytes: 18 * 1024 * 1024,
  imagens: 3,
  urlImagem: 7 * 1024 * 1024,
  pistasPersonagem: 30,
  caracteresDossie: 60000,
});

export function texto(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export function listaTextos(valor, maxItens, maxCaracteres) {
  return (Array.isArray(valor) ? valor : [])
    .filter((item) => typeof item === "string")
    .slice(0, maxItens)
    .map((item) => item.slice(0, maxCaracteres));
}

export function validarImagens(valor) {
  if (!Array.isArray(valor) || !valor.length) {
    throw new Error("nenhuma imagem enviada");
  }
  if (valor.length > LIMITES_IA.imagens) {
    throw new Error(`no maximo ${LIMITES_IA.imagens} imagens por pista`);
  }
  return valor.map((url) => {
    if (
      typeof url !== "string" ||
      url.length > LIMITES_IA.urlImagem ||
      !(url.startsWith("https://") || url.startsWith("data:image/"))
    ) {
      throw new Error(
        "imagem invalida (use https ou data:image dentro do limite)",
      );
    }
    return url;
  });
}

function idVisivel(valor) {
  return (texto(valor, 20) || "?").replace(
    /^([a-z]+)(\d+)$/i,
    (_m, letra, numero) => letra.toUpperCase() + "-" + numero.padStart(3, "0"),
  );
}

// Para o dossie, PT e a fonte preferida. EN so entra quando nao ha traducao;
// isso evita mandar duas copias do mesmo documento e reduz custo/latencia.
export function montarContextoPersonagem(body) {
  const personagem =
    body && typeof body.personagem === "object" ? body.personagem : {};
  const nome = texto(personagem.nome, 120);
  if (!nome) throw new Error("personagem sem nome");
  const aliases = listaTextos(personagem.aliases, 12, 80);
  const recebidas = Array.isArray(body.pistas) ? body.pistas : [];
  if (!recebidas.length) throw new Error("nenhuma pista citando o personagem");

  const blocos = [];
  let caracteres = 0;
  for (const [indice, fichaBruta] of recebidas
    .slice(0, LIMITES_IA.pistasPersonagem)
    .entries()) {
    const ficha =
      fichaBruta && typeof fichaBruta === "object" ? fichaBruta : {};
    const cabecalho =
      `[${idVisivel(ficha.id)}] ${texto(ficha.titulo, 200) || "(sem titulo)"}` +
      (texto(ficha.sala, 80) ? ` — sala: ${texto(ficha.sala, 80)}` : "") +
      (texto(ficha.grupo, 80) ? ` — grupo: ${texto(ficha.grupo, 80)}` : "");
    const traducao = texto(ficha.traducao, 8000);
    const original = traducao ? "" : texto(ficha.original, 8000);
    const resumo = texto(ficha.resumo, 1000);
    let bloco =
      `--- PISTA ${indice + 1} ---\n${cabecalho}\n` +
      (traducao ? `PT: ${traducao}\n` : original ? `EN: ${original}\n` : "") +
      (resumo ? `Resumo: ${resumo}\n` : "");
    const restante = LIMITES_IA.caracteresDossie - caracteres;
    if (restante <= 0) break;
    // Nunca corte uma pista no meio: é preferível omitir a próxima fonte e
    // registrar o truncamento a entregar uma frase parcial como evidência.
    if (bloco.length > restante) break;
    blocos.push(bloco);
    caracteres += bloco.length;
    if (caracteres >= LIMITES_IA.caracteresDossie) break;
  }

  if (!blocos.length) throw new Error("pistas sem texto utilizavel");
  return {
    nome,
    aliases,
    blocos,
    recebidas: recebidas.length,
    usadas: blocos.length,
    truncado:
      recebidas.length > blocos.length ||
      caracteres >= LIMITES_IA.caracteresDossie,
  };
}

export function montarRequisicaoOpenAI({
  modelo,
  instrucoes,
  conteudo,
  schemaNome,
  schema,
  modo,
  safetyIdentifier,
}) {
  const content =
    typeof conteudo === "string"
      ? [{ type: "input_text", text: conteudo }]
      : conteudo;
  return {
    model: modelo,
    instructions: instrucoes,
    input: [{ role: "user", content }],
    reasoning: { effort: "low" },
    max_output_tokens: modo === "personagem" ? 6000 : 12000,
    text: {
      format: {
        type: "json_schema",
        name: schemaNome,
        strict: true,
        schema,
      },
    },
    safety_identifier: safetyIdentifier,
    store: false,
  };
}

export function extrairRespostaOpenAI(dados) {
  if (!dados || typeof dados !== "object") {
    throw new Error("resposta vazia da IA");
  }
  if (dados.status === "incomplete") {
    throw new Error(
      "resposta incompleta da IA (" +
        ((dados.incomplete_details && dados.incomplete_details.reason) ||
          "motivo desconhecido") +
        ")",
    );
  }
  let textoSaida =
    typeof dados.output_text === "string" ? dados.output_text : "";
  let recusa = "";
  if (!textoSaida && Array.isArray(dados.output)) {
    for (const item of dados.output) {
      for (const parte of Array.isArray(item && item.content)
        ? item.content
        : []) {
        if (
          parte &&
          parte.type === "output_text" &&
          typeof parte.text === "string"
        ) {
          textoSaida += parte.text;
        }
        if (
          parte &&
          parte.type === "refusal" &&
          typeof parte.refusal === "string"
        ) {
          recusa = parte.refusal;
        }
      }
    }
  }
  if (recusa) throw new Error("A IA recusou o pedido: " + recusa);
  if (!textoSaida) throw new Error("resposta da IA sem texto estruturado");
  try {
    return JSON.parse(textoSaida);
  } catch {
    throw new Error("resposta da IA nao veio no JSON esperado");
  }
}

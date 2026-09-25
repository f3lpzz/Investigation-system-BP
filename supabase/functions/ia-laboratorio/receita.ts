// Receita congelada do commit e7241e01dcff606dace26f38c630f0941e5fabc4.
// Cópia isolada para medir os modelos com o mesmo pedido da produção.
import { montarContextoPersonagem, validarImagens, listaTextos, montarRequisicaoOpenAI } from "./nucleo.mjs";
const REGRAS = `Você transcreve, traduz e organiza o conteúdo visível em imagens de documentos. Responda SEMPRE no JSON pedido.

REGRAS INEGOCIÁVEIS:
1. SEM PESQUISA: transcreva e traduza APENAS o que está literalmente visível nas imagens. Não busque fontes externas nem complete trechos com conhecimento prévio. O resumo descreve somente o conteúdo explícito do documento, sem deduzir significados, relações ou conclusões que não estejam escritas.
2. TRANSCRIÇÃO FIEL E COM LAYOUT: mantenha o texto original em inglês exatamente como está (erros e tudo) e reproduza o desenho do documento, de cima para baixo: título sozinho na linha dele, subtítulo na linha seguinte, cada linha do documento numa linha própria, e UMA linha em branco entre blocos que aparecem separados na imagem. Se algo estiver ilegível, use [ilegível].
3. ELEMENTOS NÃO TEXTUAIS: descreva ilustrações, gráficos, mapas, selos e assinaturas ilegíveis entre colchetes, NA POSIÇÃO em que aparecem no documento, em português nas duas versões. Ex.: [Ilustração: gráfico de aquecimento com curva de -10°C a 30°C]. Descreva só o que está visível; não interprete o significado.
4. TRADUÇÃO: português do Brasil, natural, fiel ao original, espelhando EXATAMENTE as mesmas quebras de linha, linhas em branco e marcadores entre colchetes da transcrição.
5. TÍTULO: padrão "[Assunto principal] — [detalhe distintivo]", máx. 60 caracteres, em português. Ex.: "Aviso ao pessoal — Ala Oeste fechada".
6. PERSONAGENS: em "personagens_existentes" liste APENAS nomes que constam na lista fornecida (grafia exata da lista). Nomes citados no texto que NÃO estão na lista vão em "personagens_novos".
7. GRUPO: escolha no máximo UM grupo da lista fornecida (grafia exata) se o documento claramente pertencer a ele; senão deixe "" e, se fizer sentido, proponha um nome curto em "grupo_sugerido".
8. RESUMO: 1-3 frases neutras sobre o que o texto diz. Sem especulação.
9. "observacoes": avisos práticos (ex.: imagem cortada, texto parcialmente ilegível). Senão, "".`;

// ---- Receita 2: dossiê de PERSONAGEM (modo: "personagem") ----
// Texto-somente (sem imagens): recebe os trechos das pistas que citam o
// personagem e escreve a descrição em resumo + bullets de fatos objetivos,
// um por fato, citando o id da pista. SEM interpretação/especulação.
const REGRAS_PERSONA = `Você escreve o dossiê de UM personagem a partir de trechos de pistas fornecidos. Responda SEMPRE no JSON pedido.

REGRAS INEGOCIÁVEIS:
1. FONTES: use APENAS os trechos fornecidos. Não use conhecimento externo aos trechos e não invente nada que nenhuma pista sustente.
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


export function montarPedido(body: Record<string, any>, modelo: string, esforco: string, safetyIdentifier: string) {
const modo = body.modo === "personagem" ? "personagem" : "pista";
    let sysPrompt: string;
    let userContent: unknown;
    let schemaName: string;
    let schemaObj: unknown;

    if (modo === "personagem") {
      // ---- Receita 2: dossiê de personagem (texto-somente) ----
      let contexto;
      try {
        contexto = montarContextoPersonagem(body);
      } catch (e) {
        throw e;
      }
      sysPrompt = REGRAS_PERSONA;
      userContent =
        `PERSONAGEM: ${contexto.nome}` +
        (contexto.aliases.length
          ? ` (apelidos: ${contexto.aliases.join(", ")})`
          : "") +
        `\n\nPISTAS QUE O CITAM (${contexto.usadas} de ${contexto.recebidas}):\n\n` +
        contexto.blocos.join("\n") +
        (contexto.truncado
          ? "\nAVISO: o contexto atingiu o limite; use somente as pistas acima.\n"
          : "") +
        `\nEscreva o dossiê deste personagem.`;
      schemaName = "dossie_personagem";
      schemaObj = ESQUEMA_PERSONA;
    } else {
      // ---- Receita 1: processar pista (visão) ----
      let imagens: string[];
      try {
        imagens = validarImagens(body.imagens);
      } catch (e) {
        throw e;
      }
      const salas = listaTextos(body.salas, 200, 120);
      const personagens = listaTextos(body.personagens, 200, 240);
      const grupos = listaTextos(body.grupos, 60, 120);
      sysPrompt = REGRAS;
      userContent = [
        {
          type: "input_text",
          text:
            `LISTA DE PERSONAGENS EXISTENTES:\n${personagens.join("; ") || "(vazia)"}\n\n` +
            `LISTA DE GRUPOS EXISTENTES:\n${grupos.join("; ") || "(vazia)"}\n\n` +
            `LISTA DE SALAS (apenas referência de nomes; NÃO escolha sala):\n${salas.join("; ") || "(vazia)"}\n\n` +
            `Processe a(s) ${imagens.length} imagem(ns) desta pista, na ordem enviada (1 item de "paginas" por imagem).`,
        },
        ...imagens.map((url) => ({
          type: "input_image",
          image_url: url,
          detail: "high",
        })),
      ];
      schemaName = "ficha_pista";
      schemaObj = ESQUEMA;
    }


const pedido = montarRequisicaoOpenAI({modelo,instrucoes:sysPrompt,conteudo:userContent,schemaNome:schemaName,schema:schemaObj,modo,safetyIdentifier});
pedido.reasoning.effort = esforco;
return {...pedido, service_tier: "default"};
}

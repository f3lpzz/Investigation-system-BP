/* Testa a montagem do dossiê de personagem — o MESMO arquivo que a Edge
   Function usa em produção (supabase/functions/ia-processar/montar-dossie.mjs).
   Existe porque o teste-online.mjs só finge a resposta do servidor: um erro na
   montagem passava batido por ele (aconteceu — resumo vazio deixava o texto
   começando com duas quebras de linha). */
import { montarDescricao } from "../supabase/functions/ia-processar/montar-dossie.mjs";

let falhas = 0;
function ok(nome, condicao, obtido) {
  if (condicao) {
    console.log("OK  " + nome);
  } else {
    falhas++;
    console.log("ERRO " + nome + "\n     obtido: " + JSON.stringify(obtido));
  }
}

// --- caso normal: resumo em cima, linha em branco, um bullet por fato ---
const normal = montarDescricao({
  resumo: "Mary Matthew Jones é autora e ilustradora.",
  fatos: [
    { pista: "F-010", fato: "Assina como Marion Marigold" },
    { pista: "F-010", fato: "Foi vista entrando numa carruagem em Trinsdale" },
    { pista: "F-023", fato: "Segundo o jornal, desapareceu em 3 de maio" },
  ],
});
ok(
  "dossiê: resumo na 1ª linha (é o que o card do personagem mostra)",
  normal.split("\n")[0] === "Mary Matthew Jones é autora e ilustradora.",
  normal,
);
ok("dossiê: linha em branco separando resumo dos fatos", normal.includes(".\n\n• F-010"), normal);
ok(
  "dossiê: um bullet por fato, cada um na sua linha",
  normal.split("\n").filter((l) => l.startsWith("• ")).length === 3,
  normal,
);
ok(
  "dossiê: a mesma pista pode repetir o id em vários fatos",
  normal.split("\n").filter((l) => l.startsWith("• F-010 - ")).length === 2,
  normal,
);
ok("dossiê: sem markdown (nada de asteriscos)", !normal.includes("*"), normal);

// --- casos-limite: nenhum pode deixar linha em branco sobrando ---
const semResumo = montarDescricao({ resumo: "", fatos: [{ pista: "F-1", fato: "Alugou o livro" }] });
ok(
  "resumo vazio: NÃO começa com quebra de linha (buraco no topo do dossiê)",
  semResumo === "• F-1 - Alugou o livro",
  semResumo,
);
const soEspacos = montarDescricao({ resumo: "   ", fatos: [{ pista: "F-1", fato: "Alugou" }] });
ok("resumo só com espaços: tratado como vazio", soEspacos === "• F-1 - Alugou", soEspacos);
const semFatos = montarDescricao({ resumo: "Mary é autora.", fatos: [] });
ok("sem fatos: fica só o resumo, sem sobra no fim", semFatos === "Mary é autora.", semFatos);
ok("tudo vazio: texto vazio", montarDescricao({ resumo: "", fatos: [] }) === "", "");

// --- entrada torta vinda da IA não pode derrubar a função ---
ok("resposta sem campo 'fatos': usa só o resumo", montarDescricao({ resumo: "Só isso." }) === "Só isso.", "");
ok("resposta vazia/indefinida: texto vazio, sem exceção", montarDescricao(undefined) === "", "");
ok(
  "'fatos' que não é lista: ignorado",
  montarDescricao({ resumo: "Mary.", fatos: "isto não é lista" }) === "Mary.",
  "",
);
const fatoVazio = montarDescricao({
  resumo: "Mary.",
  fatos: [{ pista: "F-1", fato: "  " }, { pista: "F-2", fato: "vale" }],
});
ok("fato sem texto é descartado (não vira bullet vazio)", fatoVazio === "Mary.\n\n• F-2 - vale", fatoVazio);
const semId = montarDescricao({ resumo: "Mary.", fatos: [{ pista: "", fato: "sem id" }] });
ok("fato sem id da pista: marca com '?' em vez de sumir", semId === "Mary.\n\n• ? - sem id", semId);

// --- limites de tamanho (conter resposta gigante da IA) ---
const muitos = montarDescricao({
  resumo: "R.",
  fatos: Array.from({ length: 200 }, (_, i) => ({ pista: "F-" + i, fato: "fato " + i })),
});
ok(
  "no máximo 120 fatos (resposta gigante não estoura a ficha)",
  muitos.split("\n").filter((l) => l.startsWith("• ")).length === 120,
  muitos.length,
);
const longo = montarDescricao({ resumo: "x".repeat(5000), fatos: [] });
ok("resumo gigante é cortado em 2000 caracteres", longo.length === 2000, longo.length);

console.log(falhas ? "\n=== DOSSIE COM " + falhas + " FALHA(S) ===" : "\n=== DOSSIE OK ===");
process.exit(falhas ? 1 : 0);

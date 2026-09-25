/* Montagem do texto do dossiê de personagem — resumo + bullets "• F-010 - fato".
   Fica FORA do index.ts de propósito: é JavaScript puro, sem nada de Deno, para
   o Deno (na Edge Function) e o Node (no teste de tools/) lerem o MESMO código.
   Antes, essa lógica vivia embutida na função e nenhum teste a alcançava. */

// Corta o texto no limite e ignora o que não for string (entrada vem da IA).
function txt(v, max) {
  return typeof v === "string" ? v.slice(0, max) : "";
}

/* Recebe o resultado estruturado da IA ({resumo, fatos:[{pista, fato}]}) e
   devolve o texto único que o app grava em personagem.descricao.
   Partes vazias somem: nunca sobra linha em branco no começo nem no fim. */
export function montarDescricao(resultado) {
  const partes = [];
  const resumo = txt(resultado?.resumo, 2000).trim();
  if (resumo) partes.push(resumo);
  const fatos = (Array.isArray(resultado?.fatos) ? resultado.fatos : [])
    .slice(0, 120)
    .map((x) => {
      const fato = txt(x?.fato, 500).trim();
      if (!fato) return "";
      const id = txt(x?.pista, 20).trim() || "?";
      return `• ${id} - ${fato}`;
    })
    .filter(Boolean);
  if (fatos.length) partes.push(fatos.join("\n"));
  return partes.join("\n\n");
}

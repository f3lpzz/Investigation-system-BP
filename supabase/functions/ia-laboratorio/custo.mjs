// USD por milhão de tokens, serviço Standard/global. Consultado em 24/09/2026.
// https://developers.openai.com/api/docs/pricing
export const PRECOS = Object.freeze({
  "gpt-5-nano": { entrada: 0.05, cache: 0.005, escrita: 0.05, saida: 0.4 },
  "gpt-6-luna": { entrada: 0.1, cache: 0.01, escrita: 0.125, saida: 0.5 },
});
export const DATA_PRECOS = "2026-09-24";
export function calcularCusto(modelo, uso, tier = "default") {
  if (!uso || !PRECOS[modelo] || !["default", "standard"].includes(tier))
    return null;
  const entrada = uso.input_tokens;
  const saida = uso.output_tokens;
  const cache = uso.input_tokens_details?.cached_tokens || 0;
  const escrita = uso.input_tokens_details?.cache_write_tokens || 0;
  if (
    ![entrada, saida, cache, escrita].every(
      (v) => Number.isFinite(v) && v >= 0,
    ) ||
    cache + escrita > entrada
  )
    return null;
  const p = PRECOS[modelo];
  const longo = modelo === "gpt-6-luna" && entrada > 272000;
  return (
    ((entrada - cache - escrita) * p.entrada * (longo ? 2 : 1) +
      cache * p.cache * (longo ? 2 : 1) +
      escrita * p.escrita * (longo ? 2 : 1) +
      saida * p.saida * (longo ? 1.5 : 1)) /
    1000000
  );
}

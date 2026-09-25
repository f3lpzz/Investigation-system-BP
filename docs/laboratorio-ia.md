# Laboratório isolado de IA

Branch de testes: `feature/testes-ia`. **Manter como ambiente de testes; não mesclar este PR na `online`.** A branch redireciona as entradas antigas do site para o laboratório. Publicar esta branch gera somente um preview do Cloudflare.

- Site: https://feature-testes-ia.investigation-system-bp.pages.dev/lab-ia/
- Supabase exclusivo: `afmllayitasncvvuownx` — Investigation BP - Testes IA, organização Felipe Martins.
- Nenhuma tabela, conta, dado ou função da produção é alterada. A receita é copiada do commit `e7241e01dcff606dace26f38c630f0941e5fabc4`; seus módulos ficam congelados na pasta `ia-laboratorio`.
- Contas fictícias: `teste-a@investigation.test` e `teste-b@investigation.test`. Senhas entregues separadamente, fora do repositório. Endereços não recebem e-mails.

## Primeiro teste

1. Abra o site e entre com uma conta de testes.
2. Dê um nome ao caso (por exemplo, “Carta curta e legível”).
3. Selecione de 1 a 3 imagens da mesma pista, na ordem desejada. Até 5 MB por imagem e 12 MB no total.
4. Se necessário, informe os nomes já conhecidos no contexto do catálogo. Cada nome em uma linha.
5. Mantenha o raciocínio “baixo” nos dois modelos na primeira comparação. Clique em **Comparar os dois modelos**.
6. Confira transcrição, quebras de linha, tradução, nomes, resumo, omissões e invenções. Salve uma nota de 1 a 5 e comentários em cada resposta.
7. Repita pelo menos 3 vezes cada caso. Inclua texto pequeno, imagem parcialmente ilegível, página com ilustração e uma pista com várias páginas.
8. Exporte o JSON (registro completo) ou CSV (métricas e notas) para comparar os resultados em conjunto.

Teste de dossiê também disponível, com entrada textual em JSON e um exemplo inteiramente fictício. Não importamos os dados das contas reais.

## O que fica igual ao aplicativo

Responses API, instruções, schemas de JSON estrito, `store:false`, visão `high`, 12.000 tokens máximos para pistas e 6.000 para dossiês. A montagem de contexto e de descrição usa cópias dos mesmos módulos. A comparação muda apenas modelo e raciocínio selecionado; a ordem das chamadas é sorteada. A entrada normalizada recebe um hash para conferir equivalência entre chamadas.

## Custo e interpretação

São chamadas reais, cobradas na conta OpenAI. Criar o projeto de testes Supabase foi cotado em US$ 0/mês no momento da criação (24/09/2026). O laboratório permite 30 chamadas/hora por conta e 200 chamadas em 24 horas no projeto. Isso limita a quantidade, não equivale a um teto monetário.

Preços Standard/global consultados em 24/09/2026, por milhão de tokens:

| Modelo | Entrada | Cache lido | Cache escrito | Saída (inclui raciocínio) |
| --- | ---: | ---: | ---: | ---: |
| GPT-5 nano | US$ 0,05 | US$ 0,005 | US$ 0,05 | US$ 0,40 |
| GPT-6 Luna | US$ 0,10 | US$ 0,01 | US$ 0,125 | US$ 0,50 |

Fonte: [preços OpenAI](https://developers.openai.com/api/docs/pricing), [cache](https://developers.openai.com/api/docs/guides/prompt-caching). Contexto de Luna acima de 272 mil tokens aplica o multiplicador correspondente. A estimativa considera tokens reais informados, sem somar raciocínio duas vezes. Uso ausente aparece como custo desconhecido, inclusive em timeout. Não confundir preço por token com custo por pista: a quantidade de tokens pode variar bastante.

Cada linha registra modelo solicitado e retornado, esforço, uso bruto, hash de entrada, custo estimado, tempo, configuração, resultado ou erro e avaliação humana. Falhas com `usage` também contam no custo. Imagens e texto de entrada não são armazenados no banco do laboratório; selecione-os novamente para repetir. O histórico e a exportação carregam as 500 chamadas mais recentes da conta, com indicação desse limite.

## Segurança e manutenção

- A chave `OPENAI_API_KEY` existe somente nos secrets do projeto de testes, manuseada pelo proprietário. A interface contém apenas a chave pública Supabase.
- A função verifica o projeto fixo, valida o token com `auth.getUser` e exige `app_metadata.ia_lab=true`, atributo definido pelo administrador. `verify_jwt=false` permite chaves modernas; a autenticação é obrigatória no corpo da função.
- RLS protege o histórico por conta. Usuários só podem editar a coluna de avaliação; custo e resultado são gravados pelo servidor. A reserva da chamada é atômica, tem limite de uso e não executa novamente um mesmo identificador.
- SQL de instalação fica em `supabase/laboratorio/schema.sql`, **fora das migrations de produção**. Aplicar somente no projeto de testes. Não executar `db push` na produção para instalar o laboratório.
- A função temporária de criação das contas foi encerrada e retorna 410. `lab-status` permite verificar chave/modelos somente com conta autorizada. Nunca devolve a chave.
- O advisor não encontrou problemas de RLS; apontou que a proteção contra senhas vazadas do Auth está desligada. As duas senhas de teste foram geradas aleatoriamente com alta entropia. [Documentação da proteção](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Alterações futuras na receita de produção exigem atualização explícita deste snapshot para manter a comparação relevante.

## Verificação local

Na pasta `tools`: `npm ci --ignore-scripts`, `npm run checar-online`, `npm run lint`, `node --test teste-laboratorio.mjs`.

Servidor local: `node tools/servidor-visual.mjs`; abra `http://localhost:4599/lab-ia/index.html`. O laboratório local acessa apenas o Supabase de testes. Contas e chave reais da produção não são necessárias.

# CLAUDE.md — contexto do projeto Blue Prince

> Carregado automaticamente pelo Claude Code. O dono (Felipe) **não programa** —
> fale em português simples, explique termos técnicos e **pare para pedir a ele**
> onde envolver deploy, contas, segredos ou algo difícil de desfazer.

## O que é

**Blue Prince — Painel de Pistas**: app web estático (HTML/CSS/JS puro) para
catalogar, transcrever e traduzir (EN→PT) pistas, salas e personagens do jogo
Blue Prince, com mapa de conexões e quadros. **Fan-made (não oficial). Online
e em produção**, com o **tema azul original** — o redesign "Magnify" (tema
noir/marrom do Claude Design) foi testado e **revertido em 16/07/2026**; se
voltar, a fonte é o zip citado em "Lições pagas".

**Stack:** app estático + **Supabase** (Auth, Postgres, Storage, RLS, Edge
Functions) + **Cloudflare Pages** + **GitHub**.

## Estrutura do repositório

```
app/        → o aplicativo (site publicado). Abrir app/painel.html para usar.
supabase/   → backend: functions/ (apagar-conta, ia-processar) e seed/ (SQL do diretório de salas)
tools/      → testes e utilitários de dev (rodar a partir daqui)
docs/       → documentação (comece por docs/README.md)
```

## Skills do repositório — use, não reinvente

- **`verificar-visual`** — mexeu em algo que aparece na tela? Siga esta skill:
  servidor de captura (`tools/servidor-visual.mjs`) + screenshot no Chrome
  headless + comparação com o modelo. **"Screenshot ou não aconteceu."**
- **`fechar-etapa`** — terminou uma mudança? Siga esta skill: testes verdes →
  varredura de segredos → commit pequeno em português → push na branch.

Elas existem porque refazer esses fluxos "de cabeça" já causou erro e gastou
tokens. O passo a passo e as pegadinhas estão nelas — não duplique aqui.

## Como rodar e checar

- Rodar: abrir `app/painel.html` no Chrome/Edge, ou
  `node tools/servidor-visual.mjs` → `http://localhost:4599/painel.html`
  (`?seed=<vista>` entra sem login, com dados de teste).
- Checar (Node, na pasta `tools/`): `npm install` (1x) → `npm run checar` e
  `node teste-online.mjs` (Supabase falso, ~95 checagens). Ambos **verdes**.
- No PowerShell, recarregue o PATH antes do node/npm (o comando está nas skills).

## Regras inegociáveis

1. **Não quebrar o esquema v6** do objeto `DADOS` (`fichas`, `salas`,
   `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`). Só
   **adicione** campos; nunca renomeie/remova. Detalhes em `docs/data-model.md`.
2. **"Ler = salvar":** o que lê e o que grava o `DADOS` usam o mesmo formato.
   Mudou um, muda o outro junto.
3. **Salas vêm do diretório compartilhado** (tabela `diretorio_salas` + bucket
   público `salas` no Supabase); o app sobrepõe por `nome` e preserva o pessoal
   (descoberto, notas, fatos). Não se cria/renomeia/exclui sala no app.
4. **Segurança:** a chave `service_role` (e qualquer segredo) **NUNCA** vai para
   o frontend nem para o git — só a `anon` (pública). Quem protege é o **RLS**.
   Segredos são manuseados pelo Felipe; o Claude não precisa vê-los.
5. **Fluxo de mudança — só quando for ALTERAR o repositório** (criar, editar
   ou excluir qualquer arquivo versionado). Tarefa só de leitura, análise ou
   planejamento **não** dispara nada disto: nada de faxina, branch ou PR —
   responda e pronto.
   Quando FOR alterar: **antes de começar, faça a faxina pós-merge**
   (`git checkout online && git pull && git fetch --prune` e apague branches
   locais já mescladas com `git branch -d …` — o merge é do Felipe e acontece
   entre sessões; quem chega para alterar é que limpa) → branch `feature/…`
   (nome curto, ≤ ~20 letras — limite de 28 do endereço de preview do
   Cloudflare) → skill `fechar-etapa` (termina abrindo **Pull Request** para
   a `online`) → Felipe confere o **preview** e clica ele mesmo em **Merge**
   no PR (o GitHub apaga a branch remota sozinho).
   ⛔ A IA nunca mergeia na `online` — o botão de produção é do Felipe.
6. **Mudança visual só está pronta depois da skill `verificar-visual`** — teste
   verde e HTTP 200 não provam que a tela está certa.

## Lições pagas (erros desta base — não repetir)

- **Não repinte por cima de design:** implementar um modelo visual é portar a
  ESTRUTURA dele (HTML/valores exatos), não ajustar cores no que já existe.
  Repintar perdeu detalhes demais e o trabalho foi refeito.
- **Falha ao capturar screenshot = PARE.** Verificar "de outro jeito" (CSS
  computado, jsdom) deixou passar regra morta (`.drawer` vs `#drawer`) e um
  minimapa azul fora do tema.
- **`estilos.css`/`online.css` usam CRLF** — scripts de busca/troca precisam
  normalizar `\r\n` antes de comparar strings.
- **Cores e tema também vivem em JS inline** (SVG do mapa/quadros em `app.js`),
  não só no CSS. Ao trocar paleta, faça grep no JS.
- **Janela do Chrome no Windows tem piso de ~500px** — captura "mobile" menor
  que isso corta a imagem e fabrica vazamento falso. Meça `scrollWidth` antes
  de acreditar (a vista `<vista>-diag` do servidor faz isso).
- **Editou `tools/servidor-visual.mjs`? Reinicie o processo node** — o seed
  fica em memória e a mudança não vale até reiniciar.
- **Design de referência:** projeto do Claude Design "Novo Design — Arquivo do
  Detetive" (export em "Design de novo sistema.zip", Downloads do Felipe).
  A pasta `app/` dentro do zip é um retrato ANTIGO — nunca copiar por cima.

## Trabalhando com IA sem desperdiçar tokens

- **1 tarefa = 1 sessão.** Terminou, feche; a próxima tarefa começa limpa.
- **Peça em lote:** uma lista de correções de uma vez, não uma por mensagem.
- **Aponte arquivos** (`app/app.js`) em vez de colar conteúdo no chat.
- Correção que se repetiu 2x vira **uma linha neste arquivo** ou numa skill —
  nunca uma explicação repetida a cada sessão.

## Deploy

- **Produção:** Cloudflare Pages publica a branch **`online`**; *Output
  directory* = **`app`**. Todo push na `online` re-publica. Passo a passo em
  `docs/deploy.md`.
- Segredos do Supabase (OpenAI, allowlist da IA) ficam nos *secrets* do
  projeto, nunca no git.

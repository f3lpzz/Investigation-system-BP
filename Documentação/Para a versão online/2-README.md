# README — Blue Prince online (projeto)

> **Porta de entrada da versão online.** Quem chega aqui (IA ou pessoa) entende em 2 minutos o que é o projeto, em que estado está e para onde ir.
> Este README é sobre **transformar o MVP em app online**. O README do app local (uso do MVP) fica em `Documentação/README.md`.

---

## O que é

**Blue Prince — Painel de Pistas:** app para catalogar, transcrever e traduzir (inglês → português) cartas, pistas, salas e personagens do jogo Blue Prince, com mapa de conexões e quadros. Projeto **fan-made** (não oficial). A versão online deixa qualquer pessoa criar conta e ter o **próprio** catálogo na nuvem, sincronizado entre aparelhos.

---

## Estado hoje × objetivo

| | Hoje (MVP) | Objetivo (online) |
|---|---|---|
| Quem usa | 1 usuário (o Felipe) | Qualquer pessoa, com conta |
| Onde os dados ficam | Arquivo `dados.js` no PC | Nuvem (Supabase), 1 registro por usuário |
| Como salva | File System Access API (Chrome/Edge) | Autosave na nuvem |
| Imagens | Pasta local `imagens/` | Supabase Storage (pasta de cada usuário) |
| Acesso | Só naquele PC | De qualquer aparelho, após login |
| Hospedagem | Abrir o arquivo / localhost | Site publicado (Cloudflare Pages) |

**O que NÃO muda:** o formato dos dados (`DADOS` v6) e toda a experiência do painel (telas, botões, mapa). Muda só de onde carrega / para onde salva, mais a tela de login. Detalhes em `4-ARQUITETURA.md`.

---

## Como rodar o MVP atual (ponto de partida)

O app online é construído **em cima** do MVP. Para rodar o MVP:

- **Simples:** abrir `Painel (o app)/painel.html` no Chrome/Edge.
- **Recomendado:** servir a pasta `Painel (o app)/` em `localhost` (`npx serve` ou `python -m http.server`).

Detalhes completos e checagens no `Documentação/README.md` (o README do MVP) e no `Documentação/CHECKLIST.md`.

---

## Mapa dos arquivos do app (o que vira o "frontend")

Em `Painel (o app)/`:

- `painel.html` — a página (estrutura + ligações para CSS e JS).
- `estilos.css` — aparência.
- `app.js` — comportamento (carregar dados, telas, mapa, salvar). **É aqui** que entram o login e a troca de "salvar no arquivo" por "salvar na nuvem".
- `dados.js` — o catálogo local de hoje (`const DADOS = {…}`). Online, deixa de ser a fonte da verdade; serve para **importar** o catálogo existente para a conta.
- `imagens/` — imagens locais de hoje (passam a ir para o Storage na versão online).

---

## Documentação online — o que ler e em que ordem

Tudo nesta pasta (`Documentação/Para a versão online/`):

| Ordem | Documento | Para que serve | Quando ler |
|---|---|---|---|
| 0 | `0-PLANO-DOS-DOCUMENTOS.md` | O detalhamento de cada doc (régua) | Referência |
| 1 | `1-SPEC.md` | **O alvo**: o que construir e "pronto quando" | **Primeiro** |
| 2 | `2-README.md` | Este arquivo (visão geral) | Primeiro |
| 3 | `3-MODELO-DE-DADOS.md` | Formato dos dados + tabela na nuvem | Antes de mexer em dados |
| 4 | `4-ARQUITETURA.md` | Como as peças se encaixam e o fluxo | Antes de codar |
| 5 | `5-DEPLOY.md` | Passo a passo para pôr no ar e manter | Na hora de construir/publicar |
| 6 | `6-SEGURANCA.md` | Chaves, RLS, o que nunca vazar | Antes de publicar |
| 7 | `7-PRIVACIDADE.md` | LGPD, política, aviso fan-made | Antes de publicar |

> **Núcleo para construir:** SPEC, README, MODELO-DE-DADOS, ARQUITETURA.
> **Para publicar:** DEPLOY, SEGURANCA, PRIVACIDADE.
> Conteúdo de regras do jogo (fichas) continua em `Documentação/COMO_PROCESSAR.md`.

---

## Como publicar (resumo)

Em 3 linhas: criar projeto **Supabase** (login + banco + imagens + trava por usuário), conectar o app com a URL + chave pública, e publicar o site no **Cloudflare Pages** a partir de um repositório **GitHub** (atualiza sozinho a cada `git push`). O passo a passo completo, com SQL e cliques, está em **`5-DEPLOY.md`**.

---

## Stack (resumo)

Frontend: o app atual (HTML/CSS/JS puro). Backend: **Supabase** (Auth, Postgres, Storage, RLS). Hospedagem: **Cloudflare Pages**. Repositório/deploy: **GitHub**. Tudo em tier gratuito. O porquê de cada escolha está em `4-ARQUITETURA.md`.

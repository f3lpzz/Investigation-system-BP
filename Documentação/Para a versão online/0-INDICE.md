# 📂 Índice — Documentação da versão online

> **Comece por aqui.** Esta pasta contém os documentos que orientam o **Claude Code** a transformar o MVP local do Blue Prince num **app online com contas** (multiusuário, dados na nuvem), gastando ~zero.

---

## Ordem de leitura

| # | Documento | O que é | Quando ler |
|---|---|---|---|
| — | `0-PLANO-DOS-DOCUMENTOS.md` | A "régua": o que cada doc precisa ter (como foram planejados) | Referência |
| — | `0-INDICE.md` | Este arquivo (porta de entrada) | Agora |
| 1 | **`1-SPEC.md`** | **O alvo**: o que construir e "pronto quando". O mais importante. | **Primeiro** |
| 2 | `2-README.md` | Visão geral, estado hoje × objetivo, mapa de arquivos | Primeiro |
| 3 | `3-MODELO-DE-DADOS.md` | Formato dos dados (`DADOS` v6) + tabela na nuvem + SQL | Antes de mexer em dados |
| 4 | `4-ARQUITETURA.md` | Como as peças se encaixam, o fluxo e o porquê | Antes de codar |
| 5 | **`5-DEPLOY.md`** | Passo a passo do zero ao ar (SQL, Auth, Storage, publicar) | Na hora de construir/publicar |
| 6 | `6-SEGURANCA.md` | Chaves, RLS, teste de isolamento, o que nunca vazar | Antes de publicar |
| 7 | `7-PRIVACIDADE.md` | LGPD, modelo de política, aviso fan-made | Antes de publicar |
| 8 | **`8-TESTES.md`** | Como **testar cada etapa** + testes extras de robustez | **Durante toda** a construção |

**Núcleo para construir:** 1, 2, 3, 4. **Para publicar:** 5, 6, 7. **Testar o tempo todo:** 8.

---

## As decisões que valem para todos (não reabrir)

1. **Stack:** app estático atual + **Supabase** (Auth + Postgres + Storage + RLS) + **Cloudflare Pages** + **GitHub**.
2. **Dados na nuvem:** **1 registro por usuário** — o `DADOS` inteiro como `jsonb`. Imagens à parte (Storage).
3. **Login:** **e-mail/senha + Google** (sem link mágico), com **confirmação de e-mail**.
4. **Visitante sem conta:** vai direto para o login (**sem** demo público).
5. **Fora de escopo agora:** compartilhar catálogos, offline/PWA, app nativo, domínio próprio.
6. **Não pode quebrar:** o formato `DADOS` v6 e toda a UI/lógica do painel. Muda só de onde carrega / para onde salva + a tela de login + imagens na nuvem.

---

## Vocabulário padrão (igual em todos os documentos)

- Tabela: **`catalogo_usuario`** — colunas `user_id` (uuid, dono), `dados` (jsonb, o `DADOS`), `atualizado_em` (timestamptz).
- Bucket de imagens: **`imagens`** (privado), pasta `{user_id}/...`.
- Função de salvar: **`salvarNaNuvem()`** (autosave com debounce ~1–2 s).
- Branch do git: **`online`** (versão local intacta na principal).
- Chaves: **`anon`** (pública, vai no app) × **`service_role`** (secreta, nunca no front/git).

---

## Regras de ouro

- **Ler = salvar:** o que lê e o que grava o `DADOS` usam o mesmo formato (invariante).
- **O RLS é o que protege:** teste de isolamento entre 2 contas é **obrigatório** antes de publicar.
- **Reconferir fatos:** limites e telas dos serviços mudam — revalidar ao executar.
- **⛔ PARE:** onde um passo exige conta/decisão do Felipe (criar Supabase, OAuth do Google, e-mail de contato, aprovar o teste de isolamento), mostrar e esperar o "ok".

> Estes documentos são **guia** — o app online ainda não foi construído. A construção segue o `5-DEPLOY.md`, numa branch `online`, em commits pequenos, testando o isolamento antes de publicar.

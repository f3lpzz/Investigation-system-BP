# CLAUDE.md — contexto do projeto Blue Prince

> Carregado automaticamente pelo Claude Code. O dono (Felipe) **não programa** —
> fale em português simples, explique termos técnicos e **pare para pedir a ele**
> onde envolver deploy, contas, segredos ou algo difícil de desfazer.

## O que é

**Blue Prince — Painel de Pistas:** app web estático (HTML/CSS/JS puro) para
catalogar, transcrever e traduzir (EN→PT) pistas, salas, personagens e grupos do
jogo Blue Prince, com mapa de conexões e quadros. **Fan-made (não oficial).**
Já está **online e em produção**.

**Stack:** app estático + **Supabase** (Auth, Postgres, Storage, RLS, Edge
Functions) + **Cloudflare Pages** + **GitHub**.

## Estrutura do repositório

```
app/        → o aplicativo (site publicado). Abrir app/painel.html para usar.
supabase/   → backend: functions/ (apagar-conta, ia-processar) e seed/ (SQL do diretório de salas)
tools/      → testes e utilitários de dev (rodar a partir daqui)
docs/       → documentação (comece por docs/README.md)
```

## Como rodar e checar

- Rodar: abrir `app/painel.html` no Chrome/Edge (ou servir `app/` em localhost).
- Checar (precisa de Node, na pasta `tools/`): `npm install` (1x) → `npm run checar`
  (valida o `dados.js` + abre o app "sem tela") e `node teste-online.mjs`
  (valida a camada online com um Supabase falso). Mantenha ambos **verdes**.

## Regras inegociáveis

1. **Não quebrar o esquema v6** do objeto `DADOS` (`fichas`, `salas`,
   `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`). Só
   **adicione** campos; nunca renomeie/remova. Detalhes em `docs/data-model.md`.
2. **"Ler = salvar":** o que lê e o que grava o `DADOS` usam o mesmo formato.
   Mudou um, muda o outro junto.
3. **Salas vêm do diretório compartilhado** (tabela `diretorio_salas` + bucket
   público `salas` no Supabase), iguais para todos; o app sobrepõe por `nome` e
   preserva o pessoal (descoberto, notas, fatos). Não dá para criar/renomear/
   excluir salas no app.
4. **Segurança:** a chave `service_role` (e qualquer segredo) **NUNCA** vai para
   o frontend nem para o git — só a chave `anon` (pública) entra no app. Quem
   protege os dados é o **RLS**. Segredos são manuseados pelo Felipe (ele sobe/
   cola a chave localmente); o Claude não precisa vê-los. Varredura de segredos
   antes de cada `git push`.
5. **Fluxo de mudança:** trabalhe numa branch `feature/…` (nome curto, ≤ ~20
   letras, por causa do limite de 28 do endereço de preview do Cloudflare) →
   push → o Felipe confere no **preview** → só depois **merge na `online`** (a
   branch que o Cloudflare publica) → apagar a branch. Commits pequenos.
6. **Verificar mudanças visuais no render real** (screenshot/dimensões), não só
   por teste headless ou HTTP 200.

## Deploy

- **Produção:** Cloudflare Pages publica a branch **`online`**; o *Output
  directory* é **`app`**. Todo `git push` na `online` re-publica. Passo a passo
  em `docs/deploy.md`.
- Segredos do Supabase (OpenAI, allowlist da IA) ficam nos *secrets* do projeto,
  nunca no git.

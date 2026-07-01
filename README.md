# Blue Prince — Painel de Pistas (versão online)

App web **fan-made (não oficial)** para catalogar, transcrever e traduzir
(inglês → português) pistas, salas e personagens do jogo *Blue Prince*, com
**login por conta**, **dados na nuvem** e **sincronização entre aparelhos** —
cada pessoa vê só o próprio catálogo.

**No ar:** https://investigation-system-bp.pages.dev

## Como funciona
- **Front-end** estático (HTML/CSS/JS puro) — pasta `Painel (o app)/`.
- **Supabase** (Auth + Postgres + Storage + RLS): contas, banco e imagens.
  O isolamento entre usuários é garantido pelo **RLS** (no banco), não só na tela.
- **Cloudflare Pages**: publica automaticamente a cada `git push` na branch `online`.

## Estrutura do repositório
- `Painel (o app)/` — o app (o que é publicado).
- `supabase/functions/` — funções de servidor (ex.: apagar conta).
- `Ferramentas de código/` — testes (`npm run checar-online`).
- `Documentação/Para a versão online/` — especificações e guias do sistema online.

## Rodar/testar localmente
Dentro de `Ferramentas de código/`:

```bash
npm install        # uma vez
npm run checar-online
```

O app abre em `Painel (o app)/painel.html`. A configuração pública do Supabase
(URL + chave `anon`) fica em `Painel (o app)/supabase-config.js`. A chave
secreta `service_role` **nunca** vai no código nem no repositório.

---
Projeto fan-made, sem afiliação com a desenvolvedora do jogo.

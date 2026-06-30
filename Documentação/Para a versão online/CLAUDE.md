# CLAUDE.md — contexto do projeto Blue Prince

> Este arquivo é carregado automaticamente pelo Claude Code como contexto.
> O dono do projeto (Felipe) **não programa** — fale em português simples, explique termos técnicos e **pare para pedir ajuda dele** onde indicado.

---

## O que é este projeto

**Blue Prince — Painel de Pistas:** um app (site estático, HTML/CSS/JS puro) para catalogar, transcrever e traduzir (inglês → português) pistas, salas e personagens do jogo Blue Prince, com mapa de conexões e quadros. Projeto **fan-made (não oficial)**.

- **Hoje (MVP):** local, 1 usuário, dados num arquivo `dados.js`, salva pela File System Access API (Chrome/Edge).
- **Objetivo atual:** transformar em **app online com contas** (multiusuário, dados na nuvem, sincronizado entre aparelhos), gastando ~zero. Toda a direção está documentada — veja abaixo.

## Estrutura da pasta

```
Blue Prince/
├─ Painel (o app)/         ← O APP. Abrir painel.html para usar. (painel.html, estilos.css, app.js, dados.js, imagens/, backups/)
├─ Documentação/           ← Textos. Inclui a subpasta "Para a versão online/" (a doc da migração).
├─ Ferramentas de código/  ← Testes/config (verificar-dados.mjs, teste-carga.mjs, package.json, eslint.config.js)
└─ _arquivo/               ← Cópias antigas (rollback). Não usar no app.
```

## Como rodar e checar o MVP

- Rodar: abrir `Painel (o app)/painel.html` no Chrome/Edge, ou servir `Painel (o app)/` em localhost.
- Checagens (precisa de Node): dentro de `Ferramentas de código/` → `npm install` (1x) → `npm run checar` (valida o dados.js + abre o app "sem tela"). Teste visual/manual: `Documentação/CHECKLIST.md`.

---

## 🎯 Tarefa atual: construir a versão ONLINE

Toda a especificação está em **`Documentação/Para a versão online/`**. **Leia os documentos de lá; não os recrie.**

**Ordem de leitura (comece por aqui, ANTES de codar):**
1. `0-INDICE.md` — porta de entrada e decisões fixadas.
2. `1-SPEC.md` — o alvo e o "pronto quando" (o mais importante).
3. `3-MODELO-DE-DADOS.md` — formato dos dados + tabela na nuvem (SQL).
4. `4-ARQUITETURA.md` — como as peças se encaixam e o fluxo.

Depois, na hora de construir/publicar: `5-DEPLOY.md` (passo a passo). Antes de publicar: `6-SEGURANCA.md` e `7-PRIVACIDADE.md`.

**Stack alvo (já decidida, não reabrir):** app estático atual + **Supabase** (Auth + Postgres + Storage + RLS) + **Cloudflare Pages** + **GitHub**. Login **e-mail/senha + Google** (sem link mágico), com confirmação de e-mail. Dados = **1 registro `jsonb` por usuário** (tabela `catalogo_usuario`). Imagens no Storage (bucket privado, pasta por usuário). Sem demo público; visitante vai direto ao login.

---

## ⚖️ Regras inegociáveis (valem para tudo)

1. **Uma etapa por vez, com teste.** Faça mudanças pequenas, seguindo as etapas do `5-DEPLOY.md`. Ao fim de cada etapa, rode a **verificação correspondente do `8-TESTES.md`** e confirme que o app ainda abre e funciona antes de seguir. Mantenha os testes do MVP (`Ferramentas de código/` → `npm run checar`) **verdes** o tempo todo. Não tente "fazer tudo de uma vez".
2. **Não quebrar o que existe.** O formato do objeto `DADOS` (esquema **v6**: `fichas`, `salas`, `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`) e toda a UI/lógica do painel **continuam iguais**. Muda só de onde os dados carregam / para onde salvam, a tela de login e o destino das imagens.
3. **Ler = salvar.** O que lê e o que grava o `DADOS` usam o mesmo formato. Mudou um, muda o outro junto.
4. **Trabalhe numa branch `online`** (`git checkout -b online`). A versão local deve continuar **intacta** na branch principal. Commits pequenos.
5. **Segurança:** a chave `service_role` do Supabase **NUNCA** vai para o frontend nem para o git; só a `anon` (pública) vai no app. Quem protege os dados é o **RLS**. Faça varredura de segredos antes de cada `git push`.
6. **⛔ PARE e peça ao Felipe** onde a documentação marcar (criar conta no Supabase, configurar o login com Google, e principalmente **aprovar o teste de isolamento entre 2 contas antes de publicar**). Não publique sem esse teste passar.
7. **Reconfira fatos** (limites/telas do Supabase e Cloudflare mudam) ao executar.

---

## Como começar (primeira resposta esperada)

Antes de escrever qualquer código: **leia** `0-INDICE.md`, `1-SPEC.md`, `3-MODELO-DE-DADOS.md`, `4-ARQUITETURA.md` e o **`8-TESTES.md`**, e então **apresente ao Felipe um resumo do que entendeu + um plano em etapas pequenas** (baseado no `5-DEPLOY.md`).

**O plano DEVE incluir os testes:** cada etapa do plano traz, junto, a **sua verificação** (o "✅ Como verificar" do passo no `5-DEPLOY.md`, detalhado no `8-TESTES.md`). Uma etapa só é "pronta" quando o teste dela passa. As **etapas finais** do plano são, obrigatoriamente, o **teste de isolamento entre 2 contas** (3 frentes) e os **critérios de aceite da SPEC** no site publicado — além dos testes de robustez da Camada 5 (falha de salvamento, pausa, import, export→import, segredos).

Só comece a implementar depois do "ok" dele — uma etapa por vez.

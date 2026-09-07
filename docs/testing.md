# Testes — plano de testes da versão online

## Comandos reproduzíveis nesta revisão

Na pasta `tools`:

```bash
npm ci
npm run checar-online
npm run lint
npm run teste-visual # exige Chrome; no CI gera capturas como artefatos
```

Os testes usam `tools/fixtures/catalogo.json`, nunca o catálogo pessoal excluído do Git. `checar-online` inclui a carga dos módulos, os testes legados, regressões de nuvem/IA, backup/exclusão e as migrações reais em Postgres local (PGlite). Os esquemas de Auth/Storage nesse teste são mínimos e simulados: ainda é obrigatório conferir o isolamento no Supabase real antes de publicar.

`lint` lê todos os scripts locais na ordem de `painel.html` e analisa o escopo compartilhado. O workflow `.github/workflows/verificar.yml` executa as verificações e captura o app com Chrome em desktop e celular. Consulte também `revisao-confiabilidade.md`.



> **Objetivo:** garantir que **cada parte funciona** e que **nada quebra**. O `deploy.md` aponta para cada camada daqui.
> **Princípio:** testar **a cada etapa**. Se uma checagem ficar vermelha e não resolver em poucos minutos, **desfaça** (git).

---

## Como os testes se organizam (3 formas de rodar)

1. **Automático "sem tela" (headless):** roda sozinho com Node; não precisa de navegador nem do Supabase real. Bom para a lógica de dados e o invariante "ler = salvar".
2. **Consulta no Supabase (SQL / painel):** confirma banco, RLS e Storage diretamente no backend.
3. **Manual no navegador:** o que exige clique e login real (cadastro, Google, upload, isolamento, site publicado).

> Reaproveite o que já existe em `tools/`: **`teste-carga.mjs`** (o app abre e renderiza), **`verificar-dados.mjs`** (o `DADOS` está íntegro, v6) e **`teste-online.mjs`** (a camada online com um Supabase falso). Eles devem continuar **verdes**.

---

## Camada 1 — Verificação por etapa do deploy

Depois de **cada** passo do `deploy.md`, rode a checagem correspondente antes de seguir.

### Passo 1 — Projeto Supabase criado
- ✅ A **URL** e a **chave `anon`** existem em *Project Settings → API*.
- ✅ Um teste mínimo de conexão responde sem erro de credencial.

### Passo 2 — Tabela `catalogo_usuario` + RLS
- ✅ A tabela existe e o **RLS está LIGADO**.
- ✅ Como não autenticado, `select * from public.catalogo_usuario;` → **0 linhas / negado**.
- ✅ Existem as **4 políticas** (select/insert/update/delete).
- ✅ **Sem SELECT, o UPDATE não funciona** (a policy de select existe).

### Passo 3 — Storage (bucket `imagens` privado)
- ✅ O bucket `imagens` existe e está **privado**.
- ✅ Upload de teste em `{user_id}/teste.png` funciona logado.
- ✅ A imagem **exibe** via URL assinada.
- ✅ **Isolamento:** logado como B, tentar abrir a imagem de A → **negado**.
- ✅ Compressão: a imagem enviada é menor que a original.

### Passo 4 — Login (Auth)
- ✅ **Cadastro** → e-mail de confirmação chega → confirmar → entra.
- ✅ **Senha errada** é rejeitada; **e-mail não confirmado** não entra.
- ✅ **Esqueci a senha** funciona; **Google** funciona; **Sair** volta ao login.

### Passo 5 — Conectar o app (carregar/salvar)
- ✅ **1º acesso:** conta nova cria a linha com `DADOS` **vazio padrão** (v6).
- ✅ **Ida-e-volta:** editar → **não** salvar manualmente → **recarregar** → persistiu.
- ✅ **Invariante "ler = salvar":** carregar, salvar e carregar de novo dá `DADOS` **idêntico**.
- ✅ **Autosave** dispara com atraso (~1,5 s), sem travar a digitação.
- ✅ **Logout** limpa os dados em memória.

### Passo 6 — Conta e LGPD
- ✅ **Exportar:** o JSON baixado contém o catálogo completo e válido.
- ✅ **Apagar conta:** somem a linha do banco, as imagens da pasta `{user_id}` e a conta no Auth.

### Passo 8 — Publicar (Cloudflare Pages)
- ✅ A **URL pública** (`*.pages.dev`) abre o app.
- ✅ Login funciona **em produção** (Redirect URLs corretas) e numa **janela anônima**.

---

## Camada 2 — Regressão (não quebrar o app)

A cada etapa que mexer no `app/app.js`, rode os testes e confirme as telas:

- ✅ `npm run checar` (em `tools/`): `teste-carga` verde + `verificar-dados` verde.
- ✅ As telas continuam funcionando: Grade, Mapa, Mundo, Diretório, Quadros, filtros, busca, **desfazer/refazer**, chips, mesclar personagens.
- ✅ O formato `DADOS` **não mudou** (mesmas 8 listas; `SCHEMA_VERSION` = 6).

---

## Camada 3 — Teste de isolamento entre 2 contas (INEGOCIÁVEL)

O teste mais importante; sem ele, **não publicar**. Testar nas **três frentes**:

1. **Pelo app (UI):** logado em A não aparece **nada** de B, e vice-versa.
2. **Pelo banco (SQL):** tentar `select` da linha de B estando como A → 0 linhas.
3. **Pela API (REST):** tentar buscar a linha de B **direto pela API REST** com a chave `anon` → **negado** pelo RLS.

Inclui: recarregar **mantém** o login; logar em **outro navegador/aparelho** mostra os **mesmos** dados.

---

## Camada 4 — Aceitação (os "Pronto quando" da SPEC)

No **site publicado**, rodar o roteiro dos **12 critérios de aceite** do `spec.md` de ponta a ponta. Todos têm de passar.

---

## Camada 5 — Testes extras para robustez

1. **Falha ao salvar / rede caindo:** simular o Supabase indisponível e confirmar que o app **avisa** e **não perde** o que o usuário digitou (tenta de novo).
2. **Recuperação da pausa de 7 dias:** o app **degrada com mensagem**, sem tela branca.
3. **Sessão e sincronização:** a sessão **persiste** ao recarregar; editar nos dois aparelhos — a segunda gravação recebe conflito e não substitui a primeira (comparar `atualizado_em`).
4. **Importar o `dados.js` real:** catálogo fica **completo e válido** (rodar o validador).
5. **Export → Import:** exportar de uma conta e importar noutra dá catálogo **idêntico**.
6. **Segurança aprofundada:** a **`service_role` NÃO** aparece no bundle; varredura de segredos antes de cada push; RLS não burlável pela REST.
7. **Produção:** e-mails de **confirmação** e **reset** funcionam **no domínio publicado**.
8. **Limites/escala:** um `DADOS` grande ainda salva; imagens comprimidas o suficiente para não estourar 1 GB.

---

## O que dá para automatizar

- **Headless (sem Supabase real):** `tools/teste-online.mjs` injeta uma **camada de nuvem falsa (mock)** e verifica: 1º acesso cria esqueleto v6; **round-trip ler=salvar**; autosave dispara ao editar; logout limpa a memória; sobreposição do diretório de salas.
- **Semi-automático (SQL):** os testes de RLS podem virar um **script SQL** com 2 usuários de teste.
- **Manual (navegador + Supabase real):** auth, Google, upload, isolamento na UI, site publicado, e-mails de produção.

---

## Definition of Done (testes)

- [ ] `teste-carga` + `verificar-dados` **verdes** (regressão).
- [ ] Verificação de **cada passo** do deploy passou (Camada 1).
- [ ] Round-trip **ler = salvar** confirmado (headless + na UI).
- [ ] **Isolamento entre 2 contas** passou nas 3 frentes (UI, SQL, REST).
- [ ] **Falha de salvamento** tratada; **pausa** degrada com mensagem.
- [ ] **Importar** e **export→import** dão catálogo íntegro.
- [ ] **`service_role` ausente** do site/bundle; sem segredos no git.
- [ ] Confirmação e reset de senha funcionam **em produção**.
- [ ] Os **12 critérios de aceite** do `spec.md` passam no site publicado.

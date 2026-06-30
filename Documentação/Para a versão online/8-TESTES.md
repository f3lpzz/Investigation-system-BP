# 8-TESTES — Plano de testes da versão online

> **Objetivo:** garantir que **cada parte funciona durante a construção** (não só no fim) e que **nada do MVP quebra**. Este documento é a referência de testes; o `5-DEPLOY.md` aponta para cada camada daqui.
> **Princípio:** testar **a cada etapa**. Se uma checagem ficar vermelha e não resolver em poucos minutos, **desfaça** (git) e avise o Felipe. Nunca avance com um passo sem o seu teste passando.

---

## Como os testes se organizam (3 formas de rodar)

1. **Automático "sem tela" (headless):** roda sozinho com Node; não precisa de navegador nem do Supabase real. Bom para a lógica de dados e o invariante "ler = salvar".
2. **Consulta no Supabase (SQL / painel):** confirma banco, RLS e Storage diretamente no backend.
3. **Manual no navegador:** o que exige clique e login real (cadastro, Google, upload, isolamento, site publicado). Vira um `CHECKLIST-ONLINE.md`.

> Reaproveite o que já existe no MVP (`Ferramentas de código/`): **`teste-carga.mjs`** (o app abre e renderiza) e **`verificar-dados.mjs`** (o `DADOS` está íntegro, v6). Eles devem continuar **verdes do começo ao fim**.

---

## Camada 1 — Verificação por etapa do DEPLOY ("✅ Como verificar este passo")

Depois de **cada** passo do `5-DEPLOY.md`, rode a checagem correspondente antes de seguir.

### Passo 1 — Projeto Supabase criado
- ✅ A **URL** e a **chave `anon`** existem em *Project Settings → API*.
- ✅ Um teste mínimo de conexão (do app ou do console) responde sem erro de credencial.

### Passo 2 — Tabela `catalogo_usuario` + RLS
- ✅ A tabela existe e o **RLS está LIGADO** (no painel, a tabela aparece com "RLS enabled").
- ✅ Teste de SQL no editor (com 2 usuários de teste):
  ```sql
  -- como NÃO autenticado (role anon), não deve retornar nada:
  select * from public.catalogo_usuario;            -- esperado: 0 linhas / negado
  ```
- ✅ Existem as **4 políticas** (select/insert/update/delete). Conferir em *Authentication → Policies*.
- ✅ **Sem SELECT, o UPDATE não funciona** — confirmar que a policy de select existe (já incluída no DEPLOY).

### Passo 3 — Storage (bucket `imagens` privado)
- ✅ O bucket `imagens` existe e está **privado** (não público).
- ✅ Upload de um arquivo de teste em `{user_id}/teste.png` funciona logado.
- ✅ A imagem **exibe** via URL assinada (`createSignedUrl`).
- ✅ **Isolamento:** logado como B, tentar abrir a imagem de A → **negado**.
- ✅ Compressão: a imagem enviada é menor que a original (conferir o tamanho).

### Passo 4 — Login (Auth)
- ✅ **Cadastro:** criar conta com e-mail/senha → **e-mail de confirmação chega** → confirmar → entra.
- ✅ **Senha errada** é rejeitada; **e-mail não confirmado** não entra (se essa for a config).
- ✅ **Esqueci a senha:** chega o e-mail, troca a senha, entra com a nova.
- ✅ **Google:** login com Google em 1 clique funciona e cria/acessa a conta.
- ✅ **Sair** (logout) volta para a tela de login.

### Passo 5 — Conectar o app (carregar/salvar) — o coração
- ✅ **1º acesso:** logar com conta nova cria a linha com `DADOS` **vazio padrão** (v6), e o painel abre sem erro.
- ✅ **Ida-e-volta (round-trip):** editar uma ficha → **não** clicar em salvar → **recarregar** → a alteração **persistiu** (veio da nuvem).
- ✅ **Invariante "ler = salvar":** carregar da nuvem, salvar de novo e carregar outra vez deve dar um `DADOS` **idêntico** (sem perder/renomear campo). *(Testável também no headless — ver Camada 5.)*
- ✅ **Autosave:** alterações disparam a gravação com atraso (~1–2 s), sem travar a digitação.
- ✅ **Logout** limpa os dados em memória / volta ao login (não fica o catálogo de A na tela depois de sair).

### Passo 6 — Conta e LGPD
- ✅ **Exportar:** o arquivo baixado (JSON) contém o catálogo completo e válido (passar pelo validador).
- ✅ **Apagar conta:** some a **linha do banco**, **as imagens** da pasta `{user_id}` e a **conta no Auth**; depois **não** dá mais para logar com aquela conta.

### Passo 8 — Publicar (Cloudflare Pages)
- ✅ A **URL pública** (`*.pages.dev`) abre o app.
- ✅ Login funciona **em produção** (as **Redirect URLs** do Auth e do Google incluem o endereço publicado).
- ✅ Tudo das camadas acima funciona **no site no ar** (e numa **janela anônima**).

---

## Camada 2 — Regressão (não quebrar o MVP)

A cada etapa que mexer no `app.js`, rode os testes do MVP e confirme as telas:

- ✅ `npm run checar` (em `Ferramentas de código/`): `teste-carga` verde (app abre/renderiza) + `verificar-dados` verde (DADOS v6 íntegro).
- ✅ As telas e recursos continuam funcionando: Grade, Mapa, Mundo, Diretório, Quadros, filtros, busca, **desfazer/refazer**, chips, mesclar personagens.
- ✅ O formato `DADOS` **não mudou** (mesmas 8 listas; `SCHEMA_VERSION` = 6).

> Se algo do MVP parar de funcionar por causa de uma mudança da nuvem, é regressão — corrigir antes de seguir.

---

## Camada 3 — Teste de isolamento entre 2 contas (INEGOCIÁVEL)

O teste mais importante; sem ele, **não publicar** (⛔ mostrar resultado ao Felipe). Testar nas **três frentes**:

1. **Pelo app (UI):** logado em A não aparece **nada** de B (dados nem imagens), e vice-versa.
2. **Pelo banco (SQL):** tentar `select` da linha de B estando como A → 0 linhas.
3. **Pela API (REST):** tentar buscar a linha de B **direto pela API REST** usando a chave `anon` e o id de B → **negado** pelo RLS. (Prova que esconder na tela não é o que protege — o RLS protege.)

Inclui também: recarregar **mantém** o login; logar em **outro navegador/aparelho** mostra os **mesmos** dados (sincronizou).

---

## Camada 4 — Aceitação (os "Pronto quando" da SPEC)

No **site publicado**, rodar o roteiro dos **12 critérios de aceite** do `1-SPEC.md` de ponta a ponta (cadastro→confirmar→catalogar→sair→voltar em outro aparelho→isolamento→exportar→apagar conta). Todos têm de passar.

---

## Camada 5 — Testes EXTRAS para uma construção robusta (respondendo "é preciso mais?")

**Sim — estes evitam os problemas que só aparecem no uso real.** Recomendo incluir:

1. **Falha ao salvar / rede caindo:** simular o Supabase indisponível (chave errada/projeto pausado) e confirmar que o app **mostra um aviso claro** e **não perde** o que o usuário acabou de digitar (tenta de novo quando voltar). *O pior bug seria "salvou com sucesso" mascarando uma falha.*
2. **Recuperação da pausa de 7 dias:** após o projeto pausar, o 1º acesso falha até religar. Testar que o app **degrada com mensagem** ("serviço temporariamente indisponível, tente em 1 min"), e **não** dá tela branca.
3. **Sessão e sincronização:** a sessão **persiste** ao recarregar; abrir em "outro aparelho" traz os mesmos dados; **editar nos dois ao mesmo tempo** — documentar e testar o comportamento (o padrão é "quem salva por último vence"; usar `atualizado_em` para, no mínimo, avisar se a nuvem está mais nova que a tela).
4. **Importar o `dados.js` real do Felipe:** depois de importar, o catálogo fica **completo e válido** (rodar o validador sobre o dado importado). É a migração — não pode perder ficha nem imagem.
5. **Export → Import (round-trip de backup):** exportar de uma conta e importar numa conta nova deve dar um catálogo **idêntico** — prova que o backup é **restaurável** de verdade.
6. **Segurança aprofundada:**
   - ✅ a chave **`service_role` NÃO** aparece em nenhum arquivo publicado (buscar a chave no site/no bundle).
   - ✅ varredura de **segredos** antes de cada `git push`.
   - ✅ a tentativa de burlar o RLS pela REST (Camada 3.3) **falha**.
7. **Produção (config que costuma falhar):** o e-mail de **confirmação** e o de **reset de senha** funcionam **no domínio publicado** (Redirect URLs corretas) — testar no site real, não só no localhost.
8. **Limites/escala (sanidade):** um `DADOS` grande (muitas fichas) ainda salva; imagens saem comprimidas o suficiente para não estourar 1 GB com o tempo.
9. **Leitura em outro navegador:** confirmar que ao menos **carrega** fora do Chrome/Edge (salvar continua recomendado em Chrome/Edge).

---

## O que dá para automatizar (e como)

- **Headless (roda sozinho, sem Supabase real):** crie um `teste-online.mjs` que injeta uma **"camada de nuvem" fingida (mock)** no lugar do Supabase e verifica: 1º acesso cria esqueleto v6; **round-trip ler=salvar** dá objeto idêntico; o autosave é chamado após editar; logout limpa a memória. Isso pega regressões da lógica de dados **sem** depender da internet.
- **Semi-automático (SQL):** os testes de RLS (Camadas 2 e 3) podem virar um **script SQL** com 2 usuários de teste, rodado no SQL Editor.
- **Manual (navegador + Supabase real):** auth, Google, upload de imagem, isolamento na UI, site publicado, e-mails de produção → um **`CHECKLIST-ONLINE.md`** (como o `CHECKLIST.md` do MVP, mas para a nuvem).

---

## Definition of Done (testes) — marcar antes de "ir ao ar"

- [ ] `teste-carga` + `verificar-dados` do MVP **verdes** (regressão).
- [ ] Verificação de **cada passo** do DEPLOY passou (Camada 1).
- [ ] Round-trip **ler = salvar** confirmado (headless + na UI).
- [ ] **Isolamento entre 2 contas** passou nas 3 frentes (UI, SQL, REST) — mostrado ao Felipe. ⛔
- [ ] **Falha de salvamento** tratada (avisa e não perde dado); **pausa** degrada com mensagem.
- [ ] **Importar** o `dados.js` real e **export→import** dão catálogo íntegro.
- [ ] **`service_role` ausente** do site/bundle; sem segredos no git; RLS não burlável pela REST.
- [ ] Confirmação e reset de senha funcionam **em produção**.
- [ ] Os **12 critérios de aceite** da SPEC passam no site publicado.

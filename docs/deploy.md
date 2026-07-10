# Deploy — pôr no ar e manter (manual de operação)

> Receita reproduzível, **do zero ao ar**, com cliques e comandos concretos — e como manter depois. Onde houver **⛔ PARE**, é uma ação que exige conta/decisão do dono do projeto.
> **Reconfira** limites/telas dos serviços ao executar (mudam). Cada passo tem um "✅ Como verificar"; o detalhe completo dos testes está no `testing.md`.

---

## 0. Pré-requisitos

- Conta no **GitHub** (repo pode ser privado).
- Conta no **Supabase** e conta no **Cloudflare**.
- **Node.js** instalado (para as checagens em `tools/`).
- Uma conta de **e-mail** para contato de privacidade (ver `privacy.md`).

---

## 1. ⛔ PARE — Criar o projeto no Supabase

1. Crie conta no Supabase (pode ser com Google/GitHub).
2. **New project**: escolha a **região mais próxima** (ex.: South America / São Paulo), defina uma **senha do banco** e **guarde-a**.
3. Em **Project Settings → API**, anote:
   - **Project URL** (ex.: `https://xxxx.supabase.co`)
   - **chave `anon`** (a **pública** — vai no app)
   - a **`service_role`** (secreta): **NUNCA** vai para o app nem para o git (ver `security.md`).

**✅ Como verificar:** a **URL** e a **chave `anon`** existem em *Project Settings → API*, e um teste mínimo de conexão responde sem erro de credencial.

---

## 2. Criar o banco + a trava de segurança (RLS)

No Supabase, abra **SQL Editor** e rode este bloco:

```sql
create table public.catalogo_usuario (
  user_id       uuid primary key
                references auth.users (id) on delete cascade,
  dados         jsonb       not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_catalogo_user on public.catalogo_usuario (user_id);

alter table public.catalogo_usuario enable row level security;

create policy "catalogo: ler o proprio" on public.catalogo_usuario
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "catalogo: criar o proprio" on public.catalogo_usuario
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "catalogo: atualizar o proprio" on public.catalogo_usuario
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "catalogo: apagar o proprio" on public.catalogo_usuario
  for delete to authenticated using ((select auth.uid()) = user_id);
```

> Por que assim: o RLS garante **no banco** que ninguém vê a linha de outro. O UPDATE precisa também da policy de SELECT (já incluída).

**✅ Como verificar:** a tabela existe, o **RLS está LIGADO**, existem as **4 políticas**, e — sem login — `select * from public.catalogo_usuario;` **não devolve nada**.

---

## 3. Imagens — bucket no Storage (privado, por usuário)

1. Em **Storage**, crie um bucket chamado **`imagens`** e deixe-o **privado**.
2. No **SQL Editor**, rode as políticas por pasta de usuário:

```sql
create policy "imagens: ler as proprias" on storage.objects
  for select to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "imagens: enviar as proprias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "imagens: atualizar as proprias" on storage.objects
  for update to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "imagens: apagar as proprias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

3. **Como exibir** (bucket privado): guarde no campo `imagem` o **caminho** (`nuvem:{user_id}/arquivo`) e gere uma **URL assinada** ao renderizar (`createSignedUrl`, 1h). **Comprima as imagens no upload** (JPEG, máx. 1100px) para caber bem em 1 GB.

**✅ Como verificar:** upload de teste em `{user_id}/` funciona, a imagem **exibe** via URL assinada, **outra conta NÃO acessa** a imagem, e o arquivo enviado fica **menor** (compressão).

---

## 4. ⛔ PARE — Ligar o login (Auth)

Em **Authentication → Providers / Settings**:

1. **E-mail**: habilite **Email + Password** e **ative a confirmação de e-mail**.
2. **Google** (opcional): no **Google Cloud Console**, crie um **OAuth client ID** (Web), cole a **redirect URI** do Supabase, e cole o **Client ID/secret** no provider Google do Supabase.
3. Em **URL Configuration**, defina o **Site URL** (o endereço do Cloudflare Pages) e os **Redirect URLs** (inclua o de teste local e o de produção).

**✅ Como verificar:** cadastro → **e-mail de confirmação chega** → confirma → entra; **senha errada** barra; **"esqueci a senha"** funciona; **Google** funciona; **sair** volta ao login.

---

## 5. Conectar o app ao Supabase

1. O cliente (CDN) já vem incluído no `app/painel.html`, antes do `app/app.js`.
2. A **URL** + **chave `anon`** ficam em `app/supabase-config.js` (públicas — ver `security.md`).
3. **Auth/UI:** mostrar o painel só quando houver sessão; reagir a login/logout (`onAuthStateChange`).
4. **Carregar ao logar** e **autosave** (ver `data-model.md`): `select` da linha → `DADOS = data.dados ?? esqueletoVazioV6()`; a cada alteração, `salvarNaNuvem()` com **debounce ~1,5 s** (`upsert ... onConflict:'user_id'`).
5. Mantenha **ler = salvar** (invariante).
6. **Importar o `dados.js` atual**: botão que lê o arquivo e faz `upsert` do `DADOS`.

**✅ Como verificar:** 1º login cria a linha com `DADOS` **vazio padrão** (v6); editar uma ficha → **recarregar** → **persistiu**; **sair** limpa os dados da tela. Mantenha `npm run checar` verde.

---

## 6. Conta e LGPD no app (ver `privacy.md`)

Na área logada: **Sair**; **Exportar meus dados** (baixar o JSON); **Apagar minha conta e meus dados** (remove a linha do banco, as imagens da pasta `{user_id}` no Storage e a conta no Auth). Apagar no Auth exige uma **Edge Function** com a `service_role` (`supabase/functions/apagar-conta`).

**✅ Como verificar:** o **JSON exportado** contém o catálogo completo; **apagar a conta** remove linha + imagens + login — e depois **não dá mais para entrar**.

---

## 7. ⛔ PARE — Teste de isolamento (inegociável antes de publicar)

1. Crie **2 contas de teste** (A e B). Catalogue coisas diferentes em cada uma.
2. Logado como **A**, confirme que **não** dá para ver **nada** de B — nem dados, nem imagens.
3. Teste também: recarregar mantém o login; logar em **outro navegador** mostra os mesmos dados.
4. Rode as checagens em `tools/` → `npm run checar-online`.

**✅ Detalhe completo** *(testing.md, Camada 3)*: testar o isolamento nas **3 frentes** — pela **tela**, pelo **SQL** e pela **API REST**.

---

## 8. Publicar o site (Cloudflare Pages via GitHub)

1. `git push` do repositório para o **GitHub**.
2. No **Cloudflare** → **Workers & Pages → Create → Pages → Connect to Git**, escolha o repositório.
3. **Build settings** (site estático, sem build):
   - Framework preset: **None**.
   - Build command: **(vazio)**.
   - **Output directory: `app`** (a pasta que contém o `painel.html`).
4. **Deploy**. O Cloudflare dá um endereço `*.pages.dev`. **A cada `git push`, ele republica sozinho.**
5. Volte ao Supabase (**Auth → URL Configuration**) e adicione esse endereço em **Site URL** e **Redirect URLs**. Atualize também o redirect do Google se necessário.

> **Chaves:** a **URL** e a **`anon`** ficam no front (públicas por design; quem protege é o RLS). A **`service_role` NUNCA** entra no front nem no git.

**✅ Como verificar:** a **URL pública** abre o app; login funciona **em produção**; tudo funciona numa **janela anônima**; a **`service_role` não** aparece em nenhum arquivo publicado. Por fim, rode os **12 critérios de aceite** do `spec.md` no site no ar.

---

## 9. Operação contínua

- **Pausa do Supabase (7 dias sem acesso):** o projeto "dorme". Religar = abrir o painel do Supabase e **restaurar** (1 clique, ~60s). Com usuários acessando, não pausa.
- **Atualizar o site:** basta `git push` na branch publicada.
- **Acompanhar uso:** de olho no Storage (imagens) e nos limites (ver `architecture.md`).

---

## 10. Checklist "ir ao ar" (Definition of Done)

- [ ] Projeto Supabase criado; **URL + `anon`** no app; **`service_role` fora** do app/git.
- [ ] Tabela `catalogo_usuario` (jsonb) com **RLS** e as 4 políticas.
- [ ] Bucket `imagens` privado + políticas por pasta de usuário; compressão no upload.
- [ ] Login e-mail/senha (com confirmação) **e** Google funcionando; "esqueci a senha" ok.
- [ ] App **carrega da nuvem ao logar** e faz **autosave**; **importar `dados.js`** disponível.
- [ ] **Exportar dados** e **apagar conta/dados** funcionando.
- [ ] **Teste de isolamento entre 2 contas passou** (3 frentes).
- [ ] Site publicado no Cloudflare Pages (**Output directory: `app`**) e atualizando a cada push; URLs do Auth ajustadas.
- [ ] Política de Privacidade + aviso "fan-made" publicados (ver `privacy.md`).

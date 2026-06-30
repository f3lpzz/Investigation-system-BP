# DEPLOY — pôr no ar e manter (manual de operação)

> Receita reproduzível, **do zero ao ar**, com cliques e comandos concretos — e como manter depois. Onde houver **⛔ PARE (Felipe)**, é uma ação que exige conta/decisão do Felipe; mostre o resultado e espere o "ok".
> Faça tudo na branch `online` (ver `4-ARQUITETURA.md`), em commits pequenos. **Reconfira** limites/telas dos serviços ao executar (mudam).
> **Cada passo tem um "✅ Como verificar" resumido; o detalhe completo dos testes está no `8-TESTES.md`. Não avance sem a verificação do passo passar.**

---

## 0. Pré-requisitos

- Conta no **GitHub** (repo pode ser privado).
- Conta no **Supabase** e conta no **Cloudflare** (criar nos passos abaixo).
- **Node.js** instalado (para as checagens do MVP).
- O projeto já organizado e com **git** funcionando.
- Uma conta de **e-mail** para contato de privacidade (ver `7-PRIVACIDADE.md`).

```bash
# a partir do MVP organizado:
git checkout -b online      # tudo novo fica aqui; a versão local segue intacta na branch principal
```

**✅ Como verificar:** `git status` mostra a branch `online`; o app do MVP ainda abre normalmente.

---

## 1. ⛔ PARE — Criar o projeto no Supabase

1. Acesse o site do Supabase e crie conta (pode ser com Google/GitHub).
2. **New project**: escolha a **região mais próxima** (ex.: South America / São Paulo, se houver), defina uma **senha do banco** e **guarde-a** num lugar seguro.
3. Aguarde o projeto subir. Em **Project Settings → API**, anote:
   - **Project URL** (ex.: `https://xxxx.supabase.co`)
   - **chave `anon`** (a **pública** — vai no app)
   - existe também a **`service_role`** (secreta): **NUNCA** vai para o app nem para o git (ver `6-SEGURANCA.md`).

**✅ Como verificar** *(8-TESTES.md, Camada 1, Passo 1)*: a **URL** e a **chave `anon`** existem em *Project Settings → API*, e um teste mínimo de conexão responde sem erro de credencial.

---

## 2. Criar o banco + a trava de segurança (RLS)

No Supabase, abra **SQL Editor** e rode este bloco (cria a tabela e liga o RLS por usuário):

```sql
-- Tabela: 1 registro por usuário, guardando o DADOS inteiro como jsonb
create table public.catalogo_usuario (
  user_id       uuid primary key
                references auth.users (id) on delete cascade,
  dados         jsonb       not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_catalogo_user on public.catalogo_usuario (user_id);

-- Liga a Row Level Security
alter table public.catalogo_usuario enable row level security;

-- Cada um só lê/cria/atualiza/apaga a PRÓPRIA linha
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

> Por que assim: o RLS garante **no banco** que ninguém vê a linha de outro — é a peça-chave do "cada um o seu". O UPDATE precisa também da policy de SELECT (já incluída).

**✅ Como verificar** *(Camada 1, Passo 2)*: a tabela existe, o **RLS está LIGADO**, existem as **4 políticas**, e — sem login — `select * from public.catalogo_usuario;` **não devolve nada**.

---

## 3. Imagens — bucket no Storage (privado, por usuário)

1. Em **Storage**, crie um bucket chamado **`imagens`** e deixe-o **privado** (não público).
2. No **SQL Editor**, rode as políticas por pasta de usuário (cada arquivo fica em `imagens/{user_id}/...`):

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

3. **Como exibir** (bucket privado): guarde no campo `imagem` da ficha o **caminho** (`{user_id}/arquivo`) e gere uma **URL assinada** ao renderizar:

```js
// enviar
const caminho = `${user.id}/${Date.now()}-${nome}`;
await supabase.storage.from('imagens').upload(caminho, arquivoComprimido, { upsert: true });
// exibir (URL temporária; renovar quando expirar)
const { data } = await supabase.storage.from('imagens').createSignedUrl(caminho, 60 * 60); // 1h
img.src = data.signedUrl;
```

> Alternativa mais simples (menos privada): bucket **público** + `getPublicUrl` (guarda URL fixa). Aí qualquer um com o link vê a imagem. Como a SPEC pede isolamento **inclusive de imagens**, o padrão recomendado é o **privado + URL assinada**. Escolha uma e use em todo o app.
> **Comprima as imagens no upload** (reduzir resolução/qualidade) para caber bem em 1 GB.

**✅ Como verificar** *(Camada 1, Passo 3)*: upload de teste em `{user_id}/` funciona, a imagem **exibe** via URL assinada, **outra conta NÃO acessa** a imagem, e o arquivo enviado fica **menor** (compressão).

---

## 4. ⛔ PARE — Ligar o login (Auth)

No Supabase, em **Authentication → Providers / Settings**:

1. **E-mail**: habilite **Email + Password** e **ative a confirmação de e-mail** ("Confirm email").
2. **Google** (opcional, mas pedido):
   - No **Google Cloud Console**: crie um projeto → **APIs & Services → Credentials → Create OAuth client ID** (tipo *Web application*).
   - Em **Authorized redirect URIs**, cole a URL de callback que o Supabase mostra na tela do provider Google (algo como `https://xxxx.supabase.co/auth/v1/callback`).
   - Copie o **Client ID** e **Client secret** do Google e cole no provider **Google** do Supabase; salve.
3. Em **URL Configuration**, defina o **Site URL** (depois do deploy, o endereço do Cloudflare Pages) e os **Redirect URLs** permitidos (inclua o endereço local de teste, ex.: `http://localhost:3000`, e o de produção).

No **app**, crie uma **tela de login/cadastro** simples: entrar (e-mail/senha), criar conta, **esqueci a senha**, e botão **Entrar com Google**. Enquanto não logado, mostra essa tela; depois, o painel.

**✅ Como verificar** *(Camada 1, Passo 4)*: cadastro → **e-mail de confirmação chega** → confirma → entra; **senha errada** barra; **"esqueci a senha"** funciona; **Google** funciona; **sair** volta ao login.

---

## 5. Conectar o app ao Supabase (o coração da migração)

1. Inclua o cliente (CDN) no `painel.html`, **antes** do `app.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

2. No `app.js`, configure com a **URL** + **chave `anon`** (públicas — ver `6-SEGURANCA.md`):

```js
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

3. **Auth/UI:** mostrar o painel só quando houver sessão; reagir a login/logout:

```js
supabase.auth.onAuthStateChange((_e, session) => {
  if (session) { entrarNoApp(session.user); } else { mostrarLogin(); }
});
// login: supabase.auth.signInWithPassword({ email, password })
// google: supabase.auth.signInWithOAuth({ provider: 'google' })
// cadastro: supabase.auth.signUp({ email, password })
// esqueci: supabase.auth.resetPasswordForEmail(email)
// sair: supabase.auth.signOut()
```

4. **Carregar ao logar** e **autosave** (ver `3-MODELO-DE-DADOS.md` seção 4): `select` da linha → `DADOS = data.dados ?? esqueletoVazioV6()`; a cada alteração, `salvarNaNuvem()` com **debounce ~1–2 s** fazendo `upsert(..., { onConflict: 'user_id' })`.
5. **Reaproveite** `serializeDados()` como base do que vai para o `jsonb`. Mantenha **ler = salvar** (invariante).
6. **Importar o `dados.js` atual** (migração do Felipe): botão que lê o arquivo e faz `upsert` do `DADOS` na conta dele.

**✅ Como verificar** *(Camada 1, Passo 5)*: 1º login cria a linha com `DADOS` **vazio padrão** (v6); editar uma ficha → **recarregar** → **persistiu** (ida-e-volta na nuvem); o invariante **ler = salvar** dá objeto idêntico; **sair** limpa os dados da tela. Mantenha `npm run checar` verde (regressão — Camada 2).

---

## 6. Conta e LGPD no app (ver `7-PRIVACIDADE.md`)

Na área logada, adicione: **Sair**; **Exportar meus dados** (baixar o JSON do `DADOS`); **Apagar minha conta e meus dados** (remove a linha do banco, as imagens da pasta `{user_id}` no Storage e a conta no Auth). Apagar a conta no Auth costuma exigir uma função no servidor (Edge Function com a `service_role`) — documente esse ponto.

**✅ Como verificar** *(Camada 1, Passo 6)*: o **JSON exportado** contém o catálogo completo e válido (passa no validador); **apagar a conta** remove a linha do banco, as imagens da pasta `{user_id}` e o login — e depois **não dá mais para entrar**. Teste também **export → import** numa conta nova (catálogo idêntico — Camada 5).

---

## 7. ⛔ PARE — Teste de isolamento (inegociável antes de publicar)

1. Crie **2 contas de teste** (A e B). Catalogue coisas diferentes em cada uma.
2. Logado como **A**, confirme que **não** dá para ver **nada** de B — nem dados, nem imagens.
3. Teste também: recarregar mantém o login; logar em **outro navegador** mostra os mesmos dados (sincronizou).
4. Rode as checagens do MVP (`Ferramentas de código/` → `npm run checar`).
5. **Mostre o resultado ao Felipe** e só siga com o "ok".

**✅ Detalhe completo** *(8-TESTES.md, Camada 3)*: testar o isolamento nas **3 frentes** — pela **tela**, pelo **SQL** e pela **API REST** (tentar buscar a linha do outro com a chave `anon` → negado pelo RLS).

---

## 8. Publicar o site (Cloudflare Pages via GitHub)

1. Suba o projeto para um repositório no **GitHub** (pode ser privado): `git push`.
2. No **Cloudflare** → **Workers & Pages → Create → Pages → Connect to Git**, escolha o repositório.
3. **Build settings** (site estático, sem build):
   - Framework preset: **None**.
   - Build command: **(vazio)**.
   - Output directory: a pasta que contém o `painel.html` (ex.: `Painel (o app)`), ou ajuste a estrutura para a raiz publicável.
4. **Deploy**. O Cloudflare dá um endereço `*.pages.dev`. **A cada `git push`, ele republica sozinho.**
5. Volte ao Supabase (**Auth → URL Configuration**) e adicione esse endereço em **Site URL** e **Redirect URLs**. Atualize também o redirect do Google se necessário.

> **Chaves:** a **URL** e a **`anon`** ficam no front (são públicas por design; quem protege é o RLS). A **`service_role` NUNCA** entra no front nem no git.

**✅ Como verificar** *(Camada 1, Passo 8)*: a **URL pública** abre o app; login funciona **em produção** (Redirect URLs corretas); tudo funciona numa **janela anônima**; e a **`service_role` não** aparece em nenhum arquivo publicado (Camada 5). Por fim, rode os **12 critérios de aceite** da SPEC no site no ar (Camada 4).

---

## 9. Operação contínua

- **Pausa do Supabase (7 dias sem acesso):** o projeto "dorme". Religar = abrir o painel do Supabase e **restaurar** (1 clique, ~60s). Enquanto não houver uso diário, religue manualmente quando precisar, ou crie uma "batida" diária (um agendamento que acessa o app 1x/dia). Com usuários acessando, não pausa.
- **Atualizar o site:** basta `git push` na branch publicada.
- **Acompanhar uso:** de olho no Storage (imagens) e nos limites (ver `4-ARQUITETURA.md` seção 6).

**✅ Como verificar** *(Camada 5)*: simular o serviço indisponível/pausado e confirmar que o app **avisa** e **não perde** o que o usuário digitou (não dá tela branca).

---

## 10. Checklist "ir ao ar" (Definition of Done)

> Veja também o "Definition of Done (testes)" no fim do `8-TESTES.md`.

- [ ] Branch `online`; versão local intacta na principal.
- [ ] Projeto Supabase criado; **URL + `anon`** no app; **`service_role` fora** do app/git.
- [ ] Tabela `catalogo_usuario` (jsonb) com **RLS** e as 4 políticas.
- [ ] Bucket `imagens` privado + políticas por pasta de usuário; compressão no upload.
- [ ] Login e-mail/senha (com confirmação) **e** Google funcionando; "esqueci a senha" ok.
- [ ] App **carrega da nuvem ao logar** e faz **autosave**; **importar `dados.js`** disponível.
- [ ] **Exportar dados** e **apagar conta/dados** funcionando.
- [ ] **Teste de isolamento entre 2 contas passou** (3 frentes) — confirmado com o Felipe.
- [ ] **Testes de robustez** (Camada 5) passaram: falha de salvamento, pausa, import, export→import, segredos.
- [ ] Site publicado no Cloudflare Pages e atualizando a cada push; URLs do Auth ajustadas.
- [ ] Política de Privacidade + aviso "fan-made" publicados (ver `7-PRIVACIDADE.md`).
- [ ] `git tag online-v1`; resumo final ao Felipe (endereço do site, acesso ao Supabase, como religar se pausar, onde estão os documentos).

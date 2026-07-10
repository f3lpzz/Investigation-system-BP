# Arquitetura — como as peças se encaixam

> Mostra o desenho do sistema, o **caminho do dado** e o **porquê** de cada escolha. O passo a passo de configuração fica no `deploy.md`.

---

## 1. Visão geral

```
   Pessoa no navegador
            │
   ┌────────▼─────────┐   fala (HTTPS)   ┌────────────────────────────────────┐
   │  O APP (site       │ ───────────────▶ │  SUPABASE (backend, grátis):        │
   │  estático)         │ ◀─────────────── │   • Auth   (contas/login)           │
   │  + tela de login   │   supabase-js v2 │   • Postgres (catalogo_usuario)     │
   └───────────────────┘                   │   • Storage (imagens por usuário)   │
   hospedado de graça                       │   • RLS  (trava por usuário)        │
   (Cloudflare Pages, via GitHub)           └────────────────────────────────────┘
```

- **Frontend:** um site estático (HTML/CSS/JS puro), publicado de graça no Cloudflare Pages. Tem uma tela de login e carrega/salva na nuvem.
- **Backend:** **Supabase** — entrega login, banco e armazenamento de imagens **prontos**, sem servidor para manter. Tier gratuito.
- **Os dados:** o `DADOS` inteiro vira **1 registro por usuário** na tabela `catalogo_usuario` (coluna `jsonb`). Imagens vão para o Storage. (Ver `data-model.md`.)

---

## 2. O caminho do dado (fluxo)

```
1. Pessoa abre o site  ─▶  não logada? mostra LOGIN/CADASTRO.
2. Faz login (e-mail/senha ou Google)  ─▶  Supabase Auth devolve a sessão (e o user.id).
3. App busca a linha do usuário em catalogo_usuario:
      • existe   ─▶ carrega `dados` para o DADOS em memória  ─▶ renderiza o painel.
      • não existe (1º acesso) ─▶ cria a linha com um DADOS vazio padrão (esqueleto v6).
4. Pessoa usa o painel normalmente (criar/editar fichas, mapa, etc.).
5. A cada mudança ─▶ marca "sujo" ─▶ AUTOSAVE com atraso (~1–2 s, "debounce")
                  ─▶ salvarNaNuvem(): upsert do campo `dados` + atualiza `atualizado_em`.
6. Anexou imagem ─▶ upload no Storage (pasta {user_id}/) ─▶ guarda o caminho no campo `imagem`.
7. Em outro aparelho ─▶ login ─▶ passo 3 traz o mesmo catálogo (sincronizou).
```

**Observação:** o "miolo" do app (render, filtros, edição, mapa, quadros) **continua trabalhando com o `DADOS` em memória, do mesmo jeito**. Só trocam as **bordas**: de onde o `DADOS` vem (nuvem em vez de arquivo) e para onde vai (upsert em vez de gravar arquivo).

---

## 3. O que muda × o que continua igual

**Continua IGUAL (não pode quebrar):**
- O objeto `DADOS` e seu formato (esquema **v6**: `fichas`, `salas`, `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`).
- Toda a UI e a lógica do painel (telas, botões, filtros, mapa, quadros, desfazer/refazer).

**MUDA (de forma controlada):**
1. **De onde vêm / para onde vão os dados:** carregar da nuvem ao logar e **autosave** na nuvem.
2. **Entra uma tela de login/cadastro** antes do painel.
3. **Imagens** vão para o Storage; o campo `imagem` guarda o caminho (`nuvem:{user_id}/...`). URLs da web seguem como estão.
4. **O `dados.js` deixa de ser a fonte da verdade** (vira, no máximo, arquivo de importação).

---

## 4. Decisões e trade-offs (o "porquê")

| Escolha | Alternativa | Por que esta |
|---|---|---|
| **Supabase** (Postgres + Auth + Storage + RLS) | Firebase | O `DADOS` é grande; Postgres aguenta vários MB num registro e o **RLS** dá o isolamento "cada um o seu". Firestore limita ~1 MB/documento. |
| **1 registro jsonb por usuário** | Tabelas normalizadas (1 linha por ficha) | **Menor risco**: o miolo do app não muda (continua com o `DADOS` em memória). |
| **Cloudflare Pages** | Netlify/Vercel/GitHub Pages | **Banda ilimitada** no grátis; deploy automático do GitHub. |
| **Autosave com debounce (~1–2 s)** | Salvar a cada tecla / botão manual | Não martela o banco e mantém a experiência "salva sozinho". |
| **Login e-mail/senha + Google** | Só um deles / link mágico | Cobre o usuário comum (senha) e o cômodo (Google). |

**Riscos conhecidos e mitigação:**
- **Pausa do Supabase após 7 dias sem acesso** → religar é 1 clique (~60s). Com usuários acessando, não pausa.
- **Storage 1 GB** → **comprimir imagens no upload**.
- **Chave pública no front** → segura **se** o RLS estiver correto. Por isso o teste de isolamento (2 contas) é obrigatório antes de publicar (ver `security.md`).

---

## 5. Limites do tier gratuito (reconferir ao executar)

- **Supabase:** banco 500 MB; Storage 1 GB; ~5 GB tráfego/mês; 50.000 usuários ativos/mês; API ilimitada; pausa após 7 dias sem acesso; máx. 2 projetos.
- **Cloudflare Pages:** banda ilimitada; 500 builds/mês; até 20.000 arquivos/site; 25 MiB/arquivo.

Quando apertar, o gargalo provável é o Storage (imagens) — daí a compressão.

---

## 6. Componentes do app (visão de implementação)

1. **Cliente Supabase:** `@supabase/supabase-js` (CDN), configurado com **URL** + **chave `anon`** (em `app/supabase-config.js`).
2. **Camada de auth/UI:** tela de login/cadastro/esqueci-senha; mostrar painel só quando logado; `onAuthStateChange` para reagir a login/logout. (`app/online.js`)
3. **Camada de dados (a ponte):** `carregarDaNuvem()` (no login) e `salvarNaNuvem()` (autosave debounce). (`app/online.js`)
4. **Camada de imagens:** upload no Storage + exibição por URL assinada. (`app/online.js`)
5. **Conta/LGPD:** botões **Sair**, **Exportar meus dados**, **Apagar conta e dados**.
6. **Importação:** botão "Importar `dados.js`" para trazer o catálogo atual.

> Detalhe operacional (SQL, cliques, configuração) no `deploy.md`. Critério de isolamento em `spec.md` (critério 9) e `security.md`.

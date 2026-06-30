# ARQUITETURA — como as peças se encaixam

> Mostra o desenho do sistema (**hoje × alvo**), o **caminho do dado** e o **porquê** de cada escolha — para a IA construir na direção certa antes de escrever a primeira linha. O passo a passo de configuração fica no `5-DEPLOY.md`.

---

## 1. Hoje (MVP local)

```
   Pessoa no navegador (Chrome/Edge)
            │
   ┌────────▼─────────┐
   │  O APP (estático) │  lê/grava  ┌─────────────────┐
   │  painel.html +    │ ─────────▶ │  dados.js (arquivo│
   │  estilos + app.js │ ◀───────── │  no PC) + imagens/ │
   └──────────────────┘   File System └─────────────────┘
                          Access API
```

- Um site estático (HTML/CSS/JS puro). O catálogo é o objeto `DADOS`, que vive em `dados.js`.
- Salvar = escrever o arquivo no PC pela File System Access API (só Chrome/Edge). Imagens na pasta `imagens/`.
- **Limitação:** 1 usuário, 1 máquina; nada na nuvem.

---

## 2. Alvo (online, multiusuário)

```
   Pessoa no navegador
            │
   ┌────────▼─────────┐   fala (HTTPS)   ┌────────────────────────────────┐
   │  O APP (mesmo     │ ───────────────▶ │  SUPABASE (backend pronto, grátis):│
   │  site estático)   │ ◀─────────────── │   • Auth  (contas/login)          │
   │  + tela de login  │   supabase-js v2  │   • Postgres (banco: catalogo_usuario)│
   └──────────────────┘                   │   • Storage (imagens por usuário) │
   hospedado de graça                      │   • RLS (trava por usuário)        │
   (Cloudflare Pages, via GitHub)          └────────────────────────────────┘
```

- **Frontend:** o **mesmo app** de hoje, publicado de graça (Cloudflare Pages). Ganha uma tela de login e passa a carregar/salvar na nuvem.
- **Backend:** **Supabase** — entrega login, banco e armazenamento de imagens **prontos**, sem servidor para manter. Tier gratuito.
- **Os dados:** o `DADOS` inteiro vira **1 registro por usuário** na tabela `catalogo_usuario` (coluna `jsonb`). Imagens vão para o Storage. (Ver `3-MODELO-DE-DADOS.md`.)

---

## 3. O caminho do dado (fluxo)

```
1. Pessoa abre o site  ─▶  não logada? mostra LOGIN/CADASTRO.
2. Faz login (e-mail/senha ou Google)  ─▶  Supabase Auth devolve a sessão (e o user.id).
3. App busca a linha do usuário em catalogo_usuario:
      • existe   ─▶ carrega `dados` para o DADOS em memória  ─▶ renderiza o painel (igual ao MVP).
      • não existe (1º acesso) ─▶ cria a linha com um DADOS vazio padrão (esqueleto v6).
4. Pessoa usa o painel normalmente (criar/editar fichas, mapa, etc.).
5. A cada mudança ─▶ marca "sujo" ─▶ AUTOSAVE com atraso (~1–2 s, "debounce")
                  ─▶ salvarNaNuvem(): upsert do campo `dados` + atualiza `atualizado_em`.
6. Anexou imagem ─▶ upload no Storage (pasta {user_id}/) ─▶ guarda a URL no campo `imagem`.
7. Em outro aparelho ─▶ login ─▶ passo 3 traz o mesmo catálogo (sincronizou).
```

**Observação:** o "miolo" do app (render, filtros, edição, mapa, quadros) **continua trabalhando com o `DADOS` em memória, do mesmo jeito**. Só trocam as **bordas**: de onde o `DADOS` vem (nuvem em vez de arquivo) e para onde vai (upsert em vez de gravar arquivo).

---

## 4. O que muda × o que continua igual

**Continua IGUAL (não pode quebrar):**
- O objeto `DADOS` e seu formato (esquema **v6**: `fichas`, `salas`, `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`).
- Toda a UI e a lógica do painel (telas, botões, filtros, mapa, quadros, desfazer/refazer).

**MUDA (de forma controlada):**
1. **De onde vêm / para onde vão os dados:** sai o arquivo local (File System Access API); entra carregar da nuvem ao logar e **autosave** na nuvem.
2. **Entra uma tela de login/cadastro** antes do painel.
3. **Imagens** vão para o Storage (não mais `imagens/` local); o campo `imagem` guarda a URL. URLs da web seguem como estão.
4. **O `dados.js` deixa de ser a fonte da verdade** (vira, no máximo, arquivo de importação).

---

## 5. Decisões e trade-offs (o "porquê")

| Escolha | Alternativa | Por que esta |
|---|---|---|
| **Supabase** (Postgres + Auth + Storage + RLS) | Firebase | Os dados são interligados e o `DADOS` é grande; Postgres aguenta vários MB num registro e o **RLS** dá o isolamento "cada um o seu" de forma simples. Firestore limita ~1 MB/documento. |
| **1 registro jsonb por usuário** | Tabelas normalizadas (1 linha por ficha) | **Menor risco**: o miolo do app não muda (continua com o `DADOS` em memória). Normalizar daria mais trabalho e mais chance de quebrar. |
| **Cloudflare Pages** | Netlify/Vercel/GitHub Pages | **Banda ilimitada** no grátis; deploy automático do GitHub. |
| **Autosave com debounce (~1–2 s)** | Salvar a cada tecla / botão manual | Não martela o banco e mantém a experiência "salva sozinho" do MVP. |
| **Login e-mail/senha + Google** | Só um deles / link mágico | Cobre o usuário comum (senha) e o cômodo (Google). (Decisão do Felipe.) |

**Riscos conhecidos e mitigação:**
- **Pausa do Supabase após 7 dias sem acesso** → religar é 1 clique (~60s). Enquanto não houver uso diário, reativar manualmente ou criar uma "batida" diária. Com usuários acessando, não pausa.
- **Storage 1 GB** → **comprimir imagens no upload**.
- **Chave pública no front** → segura **se** o RLS estiver correto. Por isso o teste de isolamento (2 contas) é obrigatório antes de publicar (ver `6-SEGURANCA.md`).

---

## 6. Limites do tier gratuito (jun/2026 — reconferir ao executar)

- **Supabase:** banco 500 MB; Storage 1 GB; ~5 GB tráfego/mês; 50.000 usuários ativos/mês; API ilimitada; pausa após 7 dias sem acesso; máx. 2 projetos.
- **Cloudflare Pages:** banda ilimitada; 500 builds/mês; até 20.000 arquivos/site; 25 MiB/arquivo.

Para um app de catálogo (texto + imagens à parte), isso comporta **muitos** usuários antes de custar algo. Quando apertar, o gargalo provável é o Storage (imagens) — daí a compressão.

---

## 7. Estratégia de migração com segurança (git)

- Fazer **tudo numa branch `online`** (`git checkout -b online`), deixando a versão local **intacta** na branch principal. Assim o MVP continua funcionando enquanto a versão online é construída e testada.
- **Commits pequenos**; ao fim de cada passo, confirmar que o app ainda abre.
- Só **publicar** depois do **teste de isolamento entre 2 contas** passar (ver SPEC critério 9 e `6-SEGURANCA.md`).

---

## 8. Componentes a criar no app (visão de implementação)

Para a IA saber o que codar (detalhe operacional no `5-DEPLOY.md`):

1. **Cliente Supabase:** incluir `@supabase/supabase-js` (CDN), configurado com **URL** + **chave `anon`**.
2. **Camada de auth/UI:** tela de login/cadastro/esqueci-senha; mostrar painel só quando logado; `onAuthStateChange` para reagir a login/logout.
3. **Camada de dados (a ponte):** `carregarDaNuvem()` (no login) e `salvarNaNuvem()` (autosave debounce) — reaproveitando `serializeDados()` como base do que vai para o `jsonb`.
4. **Camada de imagens:** trocar o "anexar foto" local por upload no Storage + guardar URL.
5. **Conta/LGPD:** botões **Sair**, **Exportar meus dados**, **Apagar conta e dados**.
6. **Importação:** botão "Importar `dados.js`" para trazer o catálogo atual.

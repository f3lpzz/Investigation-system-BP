# Blue Prince — Painel de Pistas

App web **fan-made (não oficial)** para catalogar, transcrever e traduzir (inglês → português)
pistas, salas e personagens do jogo *Blue Prince*. Cada pessoa cria uma conta, os dados ficam
**na nuvem** e **sincronizam entre aparelhos** — cada usuário vê **só o próprio catálogo**.

**No ar:** https://investigation-system-bp.pages.dev

---

## Como funciona (resumo)

- **Frontend estático** (HTML/CSS/JS puro), em `app/` — é o que é publicado.
- **Supabase** (Auth + Postgres + Storage + RLS): contas, banco e imagens. O isolamento entre
  usuários é garantido pelo **RLS** (no banco), não só na tela.
- **Cloudflare Pages**: publica automaticamente a cada `git push` na branch de produção.

Detalhes em [`docs/architecture.md`](docs/architecture.md).

---

## Estrutura do repositório

```
.
├─ app/          → o aplicativo (site estático publicado). Entrada: app/painel.html
├─ supabase/     → backend: Edge Functions (apagar-conta, ia-processar)
├─ tools/        → testes e utilitários de desenvolvimento (Node)
└─ docs/         → documentação do sistema (comece por docs/README.md)
```

Principais arquivos do app (`app/`):

| Arquivo | O que é |
|---|---|
| `painel.html` | A página principal (o painel). |
| `app.js` | Estado do catálogo, fichas, edição e utilitários locais. |
| `mapa.js` / `quadros.js` / `arquivo.js` | Mapa de conexões, quadros e diretório/entidades/conta. |
| `catalogo.js` / `backup.js` / `controle-nuvem.js` | Validação segura, backup com imagens e fila de salvamento. |
| `iniciar.js` | Inicialização, depois dos demais módulos. |
| `online.js` | Camada online: login + carregar/salvar na nuvem + imagens. |
| `salas-base.js` | Lista-base das salas (dado do jogo; semeia o Diretório). |
| `estilos.css` / `online.css` | Estilos do painel e da tela de login. |
| `supabase-config.js` | Config pública (URL + chave `anon`) e liga o `MODO_ONLINE`. |
| `dados-vazio.js` | Esqueleto v6 vazio (a fonte real é a nuvem). |
| `ia.js` | Camada opcional de IA para processar pistas. |

---

## Rodar / testar localmente

O app abre direto em `app/painel.html` (de preferência no Chrome ou Edge).

As checagens ficam em `tools/`:

```bash
cd tools
npm ci                 # versões exatas do lockfile
npm run checar-online  # fixtures + carga + nuvem/IA + regressões + Postgres local
npm run lint           # todos os scripts do painel
```

> A chave secreta `service_role` do Supabase **nunca** vai no código nem no repositório.
> No frontend fica apenas a chave pública `anon` (ver [`docs/security.md`](docs/security.md)).

---

## Publicar

Antes de colocar esta revisão em produção, siga [a sequência de atualização](docs/revisao-confiabilidade.md#publicação-pelo-proprietário): migrações do banco, função de exclusão e teste de isolamento. O PR não publica o backend automaticamente.

O site é estático e é publicado pelo **Cloudflare Pages** com **Output directory: `app`**,
atualizando a cada `git push`. Passo a passo completo (Supabase + Cloudflare) em
[`docs/deploy.md`](docs/deploy.md).

---

## Documentação

Comece por [`docs/README.md`](docs/README.md). Atalhos:

- [Especificação](docs/spec.md) · [Regras de negócio](docs/business-rules.md) · [Arquitetura](docs/architecture.md) · [Modelo de dados](docs/data-model.md)
- [Deploy](docs/deploy.md) · [Segurança](docs/security.md) · [Privacidade](docs/privacy.md) · [Testes](docs/testing.md) · [Guia de conteúdo](docs/content-guide.md)

---

Projeto fan-made, sem afiliação com a desenvolvedora do jogo. Marcas e imagens de *Blue Prince*
pertencem aos seus respectivos donos.

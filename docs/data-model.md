# Modelo de dados — Blue Prince

> **A fonte da verdade do formato dos dados.** Liga o objeto `DADOS` (esquema v6, que o app usa em memória) ao formato na nuvem. Serve para criar a tabela e o código de ler/salvar **sem adivinhar nenhum nome de campo**.
> **Regra de ouro (invariante):** o que **lê** e o que **salva** têm de usar **exatamente o mesmo formato**. Se mudar um, muda o outro junto.

---

## 1. O objeto `DADOS` (esquema v6)

Todo o catálogo vive num único objeto global chamado `DADOS`. Ele tem **8 listas obrigatórias**. Se faltar alguma, o app entra em "modo de recuperação" para não sobrescrever nada.

| Lista | Guarda | Itens (resumo) |
|---|---|---|
| `fichas` | As **pistas** (o conteúdo principal) | ver seção 2 |
| `salas` | As salas do casarão | `nome`, `imagem`, `descricao`, `categorias[]`, `fatos[]`, `notas`, `descoberta`, `tipo`, `raridade`, `diretorio`, `num` |
| `personagens` | Pessoas citadas | `nome`, `imagem`, `descricao`, `fatos[]`, `notas`, `aliases[]` (apelidos) |
| `grupos` | Conjuntos de pistas (ex.: "Cartas Vermelhas") | `nome`, `cor`, `imagem`, `descricao`, `fatos[]`, `notas` |
| `colecoes` | Coleções ordenadas (legado; migrado p/ grupos) | `nome`, `ordenada`, … |
| `teorias` | Anotações de teoria | `titulo`, `texto` |
| `quadros` | Quadros estilo Miro | `nome`, `cam{x,y,s}`, `nodes[]`, `setas[]` |
| `tipos` | Tipos (legado de versões antigas) | `id`, `nome`, `cor` |

Há também um campo de versão (`DADOS.version`) e a constante `SCHEMA_VERSION` (hoje **6**) no `app/app.js`. **Não fixe o número** no código novo — leia do `app/app.js`.

> **Importante:** mesmo que algumas listas estejam "vazias" ou sejam de versões antigas (`colecoes`, `tipos`), elas **precisam existir** como arrays. O app já tem migrações que normalizam isso ao carregar; o formato na nuvem deve preservar o objeto inteiro como está.

---

## 2. Anatomia de uma ficha (pista)

Os campos `paginas[]` são o coração (cada página = uma face/imagem da carta, com original em inglês, tradução e explicação).

```json
{
  "id": "f1",
  "titulo": "Aviso ao pessoal — Ala Oeste fechada",
  "sala": "Servant's Quarters",
  "grupos": ["Avisos oficiais"],
  "personagens": ["Lady Clara Epson", "Mary Matthew Jones"],
  "conexoes": ["f2", "f5"],
  "notas": "Observação livre do usuário.",
  "pendente": false,
  "fav": false,
  "status": "",
  "paginas": [
    {
      "imagem": "nuvem:{user_id}/ficha-01.jpg",
      "original": "Texto original em inglês da carta.",
      "traducao": "Tradução em português.",
      "explica": "O que essa pista revela / por que importa.",
      "rotulo": "Frente"
    }
  ]
}
```

| Campo | Tipo | O que é |
|---|---|---|
| `id` | texto | Identificador **único** e não vazio (ex.: `f1`). Usado nas conexões. |
| `titulo` | texto | Nome da pista. |
| `sala` | texto | Nome de uma sala (deve existir em `salas`, ou vazio). |
| `grupos` | lista de textos | Nomes de grupos a que pertence. |
| `personagens` | lista de textos | Nomes citados (resolvem apelidos via `aliases`). |
| `conexoes` | lista de ids | Ligações manuais com **outras fichas** (cada id deve existir). |
| `notas` | texto | Anotações livres. |
| `pendente` / `fav` / `status` | bool/texto | Marcadores de fluxo do usuário. |
| `paginas` | lista | Cada página: `imagem`, `original`, `traducao`, `explica`, `rotulo`. |

(As regras de **conteúdo** das fichas — como transcrever sem spoiler — estão em `content-guide.md`.)

---

## 3. A regra de ouro (invariante "ler = salvar")

- O app **lê** o `DADOS` ao iniciar e **gera** o texto/JSON do `DADOS` ao salvar (função `serializeDados()` no `app/app.js`).
- As duas pontas **têm de casar**. Se a migração para a nuvem mudar a forma de **salvar**, a forma de **ler** muda junto.
- Mudanças de formato são **versionadas** (`SCHEMA_VERSION`) e acompanhadas de uma migração idempotente.

**Na prática, para a nuvem:** o que vai para o banco é **o mesmo objeto `DADOS`** (como JSON). Nada de "achatar" ou renomear campos.

---

## 4. Como o `DADOS` vira nuvem

Decisão (ver `architecture.md`): **1 registro por usuário**, guardando o `DADOS` inteiro como **`jsonb`**.

### Tabela `catalogo_usuario`

```sql
create table public.catalogo_usuario (
  user_id       uuid primary key
                references auth.users (id) on delete cascade,
  dados         jsonb       not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_catalogo_user on public.catalogo_usuario (user_id);
```

- `user_id` — o dono. É a **chave** e aponta para `auth.users` (`on delete cascade`).
- `dados` — o `DADOS` inteiro, em `jsonb`.
- `atualizado_em` — data/hora da última gravação.

### Trava por usuário (RLS) — resumo

A tabela tem **Row Level Security** ligada e políticas para que cada pessoa só leia/crie/altere **a própria linha** (`(select auth.uid()) = user_id`). O SQL completo está no **`deploy.md`** (e a explicação de por que isso protege os dados, no `security.md`).

### Ler e salvar (pseudo-fluxo)

```js
// AO LOGAR: carrega o DADOS do usuário (ou cria vazio no 1º acesso)
const { data } = await supabase
  .from('catalogo_usuario')
  .select('dados')
  .eq('user_id', user.id)
  .maybeSingle();
DADOS = data?.dados ?? esqueletoVazioV6();

// AO MUDAR ALGO: autosave com atraso (~1,5 s) -> upsert
async function salvarNaNuvem() {
  await supabase.from('catalogo_usuario').upsert(
    { user_id: user.id, dados: DADOS, atualizado_em: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}
```

---

## 5. Imagens

- **Online:** quando o usuário anexa uma foto, ela é **enviada para o Supabase Storage** (bucket **privado** `imagens`, pasta `{user_id}/...`) e o campo `imagem` passa a guardar o **caminho** com prefixo `nuvem:{user_id}/arquivo.jpg`. Para exibir, gera-se uma **URL assinada** temporária (o bucket é privado para o isolamento valer também nas imagens — ver `spec.md`).
- Imagens que já são **URL da web** continuam como estão. Base64 na importação é convertido para arquivo no Storage.
- **Comprimir no upload** (JPEG, máx. 1100px, qualidade 0,82) para caber bem em 1 GB.

### Diretório de salas compartilhado

Além da tabela por usuário, existe a tabela **`diretorio_salas`** (dados do **jogo**, iguais para todos). Ao carregar, os campos do jogo são sobrepostos por **nome** de sala, **preservando** o que é pessoal (`descoberta`, `notas`, `fatos`). Ver `business-rules.md` (RN-SALA).

---

## 6. Por que não Firestore (nota de decisão)

O Firestore (Firebase) limita **~1 MB por documento**. No Postgres (Supabase) um registro `jsonb` aguenta **vários MB**, então o modelo "1 registro por usuário" é seguro. (Mais em `architecture.md`.)

---

## 7. Mapa de migração (de → para)

| Hoje (local) | Online |
|---|---|
| `dados.js` (`const DADOS = {…}`) | linha em `catalogo_usuario.dados` (jsonb), 1 por usuário |
| Salvar arquivo (File System Access API) | `upsert` no banco (autosave) |
| `imagens/arquivo.png` (local) | upload no Storage `imagens/{user_id}/…` + caminho `nuvem:` no campo `imagem` |
| Imagens base64 embutidas | convertidas para arquivo no Storage |
| URLs da web | continuam como estão |

> **Migração do catálogo atual:** botão "Importar `dados.js`" que lê o arquivo e faz `upsert` do `DADOS` na conta (ver `spec.md` U11 e `architecture.md`).

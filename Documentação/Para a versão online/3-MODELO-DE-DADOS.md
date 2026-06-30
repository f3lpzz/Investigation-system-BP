# MODELO-DE-DADOS — Blue Prince

> **A fonte da verdade do formato dos dados.** Liga o objeto `DADOS` (esquema v6, que o app usa em memória) ao formato na nuvem. Serve para a IA criar a tabela e o código de ler/salvar **sem adivinhar nenhum nome de campo**.
> **Regra de ouro (invariante):** o que **lê** e o que **salva** têm de usar **exatamente o mesmo formato**. Se mudar um, muda o outro junto.

---

## 1. O objeto `DADOS` (esquema v6)

Hoje todo o catálogo vive num único objeto global chamado `DADOS`, definido em `dados.js` (`const DADOS = { … }`). Ele tem **8 listas obrigatórias**. Se faltar alguma, o app entra em "modo de recuperação" para não sobrescrever nada.

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

Há também um campo de versão (`DADOS.version`) e a constante `SCHEMA_VERSION` (hoje **6**) no `app.js`. **Não fixe o número** no código novo — leia do `app.js`.

> **Importante:** mesmo que algumas listas estejam "vazias" ou sejam de versões antigas (`colecoes`, `tipos`), elas **precisam existir** como arrays. O app já tem migrações que normalizam isso ao carregar; o formato na nuvem deve preservar o objeto inteiro como está.

---

## 2. Anatomia de uma ficha (pista)

Uma ficha em v6 tem esta forma. Os campos `paginas[]` são o coração (cada página = uma face/imagem da carta, com original em inglês, tradução e explicação).

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
      "imagem": "imagens/ficha-01.png",
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

(As regras de **conteúdo** das fichas — como transcrever sem spoiler — estão em `Documentação/COMO_PROCESSAR.md`; não repetir aqui.)

---

## 3. A regra de ouro (invariante "ler = salvar")

- O app **lê** o `DADOS` ao iniciar e **gera** o texto/JSON do `DADOS` ao salvar (função `serializeDados()` no `app.js`).
- As duas pontas **têm de casar**. Se a migração para a nuvem mudar a forma de **salvar**, a forma de **ler** muda junto — senão o app passa a gravar algo que ele mesmo não consegue mais carregar.
- Mudanças de formato são **versionadas** (`SCHEMA_VERSION`) e acompanhadas de uma migração idempotente, como o app já faz hoje.

**Na prática, para a nuvem:** o que vai para o banco é **o mesmo objeto `DADOS`** (como JSON). Nada de "achatar" ou renomear campos. Quem já sabe ler/escrever o `DADOS` (o app) quase não muda.

---

## 4. Como o `DADOS` vira nuvem

Decisão (ver ARQUITETURA): **1 registro por usuário**, guardando o `DADOS` inteiro como **`jsonb`**. Não normalizamos as fichas em linhas — é a migração de menor risco e o Postgres aguarda vários MB num registro sem problema.

### Tabela `catalogo_usuario`

```sql
create table public.catalogo_usuario (
  user_id       uuid primary key
                references auth.users (id) on delete cascade,
  dados         jsonb       not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- índice ajuda nas políticas por usuário
create index if not exists idx_catalogo_user on public.catalogo_usuario (user_id);
```

- `user_id` — o dono. É a **chave** e aponta para `auth.users` (quando a conta é apagada, a linha some junto: `on delete cascade`).
- `dados` — o `DADOS` inteiro, em `jsonb`.
- `atualizado_em` — data/hora da última gravação (útil para "última sincronização").

### Trava por usuário (RLS) — resumo

A tabela tem **Row Level Security** ligada e políticas para que cada pessoa só leia/crie/altere **a própria linha** (`(select auth.uid()) = user_id`). O SQL completo das políticas está no **`5-DEPLOY.md`** (e a explicação de por que isso é o que protege os dados, no `6-SEGURANCA.md`). Mantenha o mesmo SQL nos três lugares.

### Ler e salvar (pseudo-fluxo)

```js
// AO LOGAR: carrega o DADOS do usuário (ou cria vazio no 1º acesso)
const { data } = await supabase
  .from('catalogo_usuario')
  .select('dados')
  .eq('user_id', user.id)
  .maybeSingle();
DADOS = data?.dados ?? esqueletoVazioV6();   // mesmo "esqueleto" que o app já usa

// AO MUDAR ALGO: autosave com atraso (~1–2 s) -> upsert
async function salvarNaNuvem() {
  await supabase.from('catalogo_usuario').upsert(
    { user_id: user.id, dados: DADOS, atualizado_em: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}
```

> `esqueletoVazioV6()` = o mesmo objeto padrão que o app já cria quando não há dados (todas as 8 listas vazias + `version: 6`).

---

## 5. Imagens

- Hoje o campo `imagem` (em `paginas[]`, `salas`, `personagens`, `grupos`) pode ser: um caminho local `imagens/...`, uma imagem embutida (base64) ou uma URL da web.
- **Online:** quando o usuário anexa uma foto, ela é **enviada para o Supabase Storage** (bucket **privado** `imagens`, pasta `{user_id}/...`) e o campo `imagem` passa a guardar o **caminho** do arquivo (`{user_id}/...`). Para exibir, gera-se uma **URL assinada** temporária (o bucket é privado para o isolamento valer também nas imagens — ver `1-SPEC.md`).
- Imagens que já são **URL da web** (ex.: da wiki) continuam como estão (são apenas links).
- **Comprimir no upload** (reduzir resolução/qualidade) para caber bem em 1 GB de Storage.

```js
// enviar (comprimir antes) -> guardar o CAMINHO no campo "imagem" da ficha
const caminho = `${user.id}/${Date.now()}-${nomeArquivo}`;
await supabase.storage.from('imagens').upload(caminho, arquivoComprimido, { upsert: true });
// exibir -> gerar URL assinada temporária a partir do caminho guardado
const { data } = await supabase.storage.from('imagens').createSignedUrl(caminho, 60 * 60);
img.src = data.signedUrl;
```

O bucket é **privado** e tem políticas por pasta de usuário (SQL no `5-DEPLOY.md` seção 3), onde também consta a alternativa mais simples (bucket público + `getPublicUrl`) e seu trade-off.

---

## 6. Por que não Firestore (nota de decisão)

O Firestore (Firebase) limita **~1 MB por documento**. Guardar o `DADOS` inteiro num documento pode estourar se o catálogo crescer — exigiria quebrá-lo em vários documentos (mais retrabalho). No Postgres (Supabase) um registro `jsonb` aguenta **vários MB** tranquilamente, então o modelo "1 registro por usuário" é seguro. Por isso a recomendação é **Supabase**. (Mais em `4-ARQUITETURA.md`.)

---

## 7. Mapa de migração (de → para)

| Hoje (local) | Online |
|---|---|
| `dados.js` (`const DADOS = {…}`) | linha em `catalogo_usuario.dados` (jsonb), 1 por usuário |
| Salvar arquivo (File System Access API) | `upsert` no banco (autosave) |
| `imagens/arquivo.png` (local) | upload no Storage `imagens/{user_id}/…` + **caminho** no campo `imagem` (exibe via URL assinada) |
| Imagens base64 embutidas | converter para arquivo no Storage (como o app já faz na "migração de imagens") |
| URLs da web | continuam como estão |
| Posições do mapa em `localStorage` | continuam no navegador (não vão para a nuvem nesta versão) |

> **Migração do catálogo atual do Felipe:** prover um botão "Importar `dados.js`" que lê o arquivo e faz `upsert` do `DADOS` na conta dele — assim ele não perde nada (ver SPEC U11 e ARQUITETURA).

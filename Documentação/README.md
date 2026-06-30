# Blue Prince — Painel de Pistas

Organizador pessoal do jogo **Blue Prince**: um app que roda no navegador para **catalogar, transcrever e traduzir** (inglês → português) cartas, pistas, salas, personagens e grupos do jogo, com mapa de conexões e quadros estilo Miro. É um site **estático** (HTML + CSS + JavaScript puro) — sem servidor, sem banco de dados, sem framework.

> A pasta está organizada em 4 partes: **`Painel (o app)/`** (o programa), **`Documentação/`** (este e os outros textos), **`Ferramentas de código/`** (testes e configuração, só para quem edita o código) e **`_arquivo/`** (cópias antigas). Cada pasta tem um `LEIA-ME.txt`.

---

## Como rodar

São duas formas. Para **salvar automático** funcionar 100%, use a recomendada. Tudo acontece dentro da pasta **`Painel (o app)/`**.

**Simples (ver e mexer):** entre na pasta `Painel (o app)/` e dê dois cliques no `painel.html`. Use **Chrome ou Edge** — só eles permitem gravar direto no arquivo.

**Recomendada (salvar 100%):** sirva a pasta `Painel (o app)/` num servidor local e abra o endereço `localhost` que aparecer. Dentro de `Painel (o app)/`, rode um destes:

```bash
npx serve
# ou
python -m http.server
```

Depois abra, por exemplo, `http://localhost:3000` (ou a porta que aparecer) no Chrome/Edge.

> **Salvar exige Chrome ou Edge.** A gravação direta no arquivo usa a *File System Access API*, que não existe no Firefox/Safari. Nesses, o app abre e funciona, mas salvar vira download manual.

Na primeira vez, o painel pede para você **apontar o arquivo `dados.js`** (dentro de `Painel (o app)/`). Depois disso ele reconecta sozinho — no máximo pede um clique de "Reconectar".

---

## Estrutura das pastas

```
Blue Prince/
├─ Painel (o app)/         ← O APP. Abra o painel.html aqui para usar.
│  ├─ painel.html          (a página do app: estrutura + ligações p/ CSS e JS)
│  ├─ estilos.css          (toda a aparência)
│  ├─ app.js               (todo o comportamento; carregado DEPOIS do dados.js)
│  ├─ dados.js             (o "banco de dados": const DADOS = { ... })
│  ├─ imagens/             (fotos das cartas/salas)
│  └─ backups/             (backups automáticos do app — pasta viva, não é lixo)
├─ Documentação/           ← Textos explicativos (não é o programa)
│  ├─ README.md            (este arquivo)
│  ├─ CHECKLIST.md         (teste de fumaça manual)
│  └─ COMO_PROCESSAR.md    (regras de conteúdo do jogo)
├─ Ferramentas de código/  ← Só para quem for editar o código
│  ├─ verificar-dados.mjs  (valida o dados.js)
│  ├─ teste-carga.mjs      (abre o app "sem tela" e confere que não quebrou)
│  ├─ package.json, eslint.config.js
└─ _arquivo/               ← Cópias antigas e o painel.html original (rollback)
```

Os três arquivos do app (`painel.html`, `estilos.css`, `app.js`) e o `dados.js` precisam ficar **sempre juntos** na pasta `Painel (o app)/`, porque se referenciam por caminho relativo. A pasta `imagens/` também precisa ficar ao lado do `painel.html`.

---

## Como os dados funcionam

O `dados.js` define uma variável global `DADOS`, um objeto com estas listas (todas obrigatórias): **`fichas`** (as pistas), **`salas`**, **`personagens`**, **`colecoes`**, **`grupos`**, **`teorias`**, **`quadros`** e **`tipos`**. O formato é o **esquema versão 6**. Se faltar alguma dessas listas, o app entra em "modo de recuperação" para não sobrescrever nada.

Cada **ficha** (pista) tem um `id` único, um `titulo`, a `sala` de origem, listas de `personagens` e `grupos`, `conexoes` (ligações manuais com outras fichas), `notas` e `paginas` (cada página com imagem, texto original em inglês, tradução e explicação).

**Invariante "gravar = carregar":** o app lê o `DADOS` ao abrir **e** gera o texto do `dados.js` ao salvar (função `serializeDados`, no `app.js`). As duas pontas têm que combinar — por isso, ao mexer no formato dos dados, as duas precisam mudar juntas.

As regras de conteúdo (o que entra em cada ficha, como transcrever sem spoiler) estão no **[`COMO_PROCESSAR.md`](COMO_PROCESSAR.md)** (nesta mesma pasta).

---

## Como adicionar/editar uma ficha e como salvar

Tudo é feito **dentro do painel**, sem mexer em código:

- **Nova pista:** botão "＋ Nova pista" (ou cole uma imagem). Preencha título, sala, personagens, grupos, transcrição/tradução.
- **Editar:** abra a ficha e clique em "Editar". Campos como personagens, grupos e apelidos funcionam por "chips" (digite e tecle Enter).
- **Desfazer/Refazer:** `Ctrl+Z` / `Ctrl+Y` (ou os botões ↶ ↷ no topo).
- **Salvar:** é **automático**. O indicador de nuvem no canto mostra "Salvando…" e depois "Tudo salvo". A cada salvamento, o app também grava um **backup** em `Painel (o app)/backups/`.

---

## Como rodar as checagens (para quem editar o código)

Precisa do **Node.js** instalado. Entre na pasta **`Ferramentas de código/`** e rode:

```bash
npm install            # uma vez, instala as ferramentas
npm run verificar      # valida o dados.js (ids únicos, conexões, imagens, etc.)
npm run teste-carga    # abre o app "sem tela" e confere que carrega sem erro
npm run checar         # roda os dois acima
npm run format         # formata o código com Prettier
npm run lint           # analisa o app.js com ESLint
```

O `verificar-dados.mjs` não precisa de instalação (roda com `node verificar-dados.mjs` de dentro da pasta `Ferramentas de código/`). Há também o **`CHECKLIST.md`** para o teste visual manual (o único que precisa de uma pessoa, porque envolve clicar e salvar).

---

## Limitações conhecidas

- **Salvar automático só em Chrome ou Edge** (a *File System Access API* não existe em Firefox/Safari).
- **Precisa de internet para ficar 100%:** as fontes vêm do Google Fonts e algumas imagens de salas vêm de URLs da wiki do jogo. Sem internet, o app abre, mas perde as fontes e essas imagens.
- O recurso de **salvar** não dá para testar de forma automática (precisa de um clique humano) — por isso existe o `CHECKLIST.md`.

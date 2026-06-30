# Instruções para a IA — Estruturar o projeto "Blue Prince"

> **Para a IA que vai executar:** este documento foi escrito pelo Felipe, que **não programa** e construiu este projeto inteiramente com ajuda de IA. Sua missão é deixar o projeto **bem estruturado** sem quebrar nada que já funciona. Você tem **acesso ao terminal e aos arquivos** desta pasta — então **execute** os passos (rode comandos, edite arquivos), não apenas descreva. Trabalhe **de cima para baixo**, na ordem.
>
> Se você for uma IA **sem** acesso aos arquivos/terminal (só chat), avise o Felipe logo no começo: este guia presume que você consegue rodar comandos e editar os arquivos diretamente.

---

## 0. Antes de tudo: leia isto

### O que é este projeto
É o **organizador pessoal do jogo Blue Prince**: um app que roda no navegador para catalogar, transcrever e traduzir cartas/pistas/salas do jogo. Detalhes técnicos que você precisa respeitar:

- **Stack:** site **estático**. Não tem servidor, banco de dados nem framework. É HTML + CSS + JavaScript "puro" (vanilla).
- **Arquivos principais (a versão oficial fica na RAIZ da pasta):**
  - `painel.html` — o app inteiro hoje está aqui (HTML, CSS e JavaScript **embutidos no mesmo arquivo**).
  - `dados.js` — o "banco de dados" do Felipe. É um arquivo JS que define `const DADOS = { ... }`. O `painel.html` carrega ele com `<script src="dados.js"></script>`.
  - `imagens/` — fotos das cartas/salas que o `dados.js` referencia por caminho relativo (ex.: `imagens/ficha-01.png`).
  - `backups/` — **pasta viva**: o próprio app grava backups automáticos aqui (`dados-AAAAMMDD-HHMMSS.js`). **Não é lixo.**
  - `COMO_PROCESSAR.md` — as regras de conteúdo do jogo (sem spoiler etc.). É documentação, não código.
- **Cópias/arquivos que NÃO são a versão oficial** (tratar no passo de consolidação): `codebase-claude-design/` (cópia de referência), `mockups/` (rascunhos de design), `dados_backup_2026-06-14.js` (backup solto na raiz) e `blue-prince-organizer.skill` (a skill empacotada).

### O objetivo do Felipe (use isto para priorizar)
Ele escolheu três metas, nesta combinação: **(1) não quebrar** o que funciona, **(2) deixar o código limpo** para as próximas edições com IA serem mais fáceis e baratas, e **(3) documentar** para ele não se perder daqui a meses. Ele **autorizou refatorar** o código (pode separar arquivos, renomear, reorganizar) **desde que o app continue funcionando exatamente igual**. Publicar/compartilhar (GitHub) **não** é prioridade agora — fica como passo opcional no fim.

---

## ⚖️ Regras de ouro (valem para TODOS os passos)

1. **Nada de quebrar.** No fim de tudo, o app tem que funcionar **idêntico** ao que funciona hoje. Mesma aparência, mesmos botões, mesmo comportamento.
2. **Passos pequenos e reversíveis.** Faça **um commit do git por mudança pequena** (ver Passo 1). Assim qualquer coisa volta atrás em segundos.
3. **Verifique depois de cada mudança.** Rode as checagens do Passo 5 antes de seguir. Se algo ficou vermelho, conserte ou desfaça **antes** de continuar.
4. **Nunca apague — arquive.** Não delete arquivos de forma definitiva. Mova para uma pasta `_arquivo/`. O Felipe não pode perder dados.
5. **Pare nos checkpoints.** Onde estiver escrito **⛔ PARE**, mostre ao Felipe o que encontrou e **espere a confirmação** antes de prosseguir.
6. **Fale a língua dele.** Explique cada coisa em **português simples, sem jargão**. Quando usar um termo técnico, explique em uma frase. Há um glossário no fim — use-o.

---

## 🔒 O que NÃO pode quebrar (invariantes técnicos)

Estas são as "regras físicas" do app. Se você mexer e quebrar uma delas, o app para de funcionar. Confira todas ao terminar **cada** passo de código:

1. **O elo `painel.html` → `dados.js`.** O `painel.html` precisa continuar carregando `dados.js` via `<script src="dados.js"></script>`, e o `dados.js` precisa continuar definindo uma variável global `DADOS`.
2. **O formato do `DADOS` (esquema versão 6).** `DADOS` é um objeto com estas listas (arrays), todas obrigatórias: `fichas`, `salas`, `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`. O app valida isso na inicialização — se faltar, ele entra em "modo quebrado". **Não mude a forma do `DADOS`** sem atualizar o app inteiro junto.
3. **Gravar = carregar.** O app **escreve o `dados.js` de volta** usando a File System Access API (`showSaveFilePicker`), guarda o acesso no IndexedDB e faz auto-backup na pasta `backups/`. Se você mexer no formato dos dados, precisa atualizar **as duas pontas**: a parte que **lê** o `DADOS` (topo do script) **e** a função que **gera** o texto do `dados.js` (`serializeDados`). Se só uma mudar, o botão de salvar do Felipe passa a gerar um arquivo que o app não consegue mais ler.
4. **Navegador:** a gravação automática só funciona em **Chrome/Edge** (a File System Access API não existe no Firefox/Safari). Mantenha esse suporte e **documente** essa exigência.
5. **Caminhos das imagens.** O `dados.js` aponta para `imagens/...` de forma relativa. Se reorganizar pastas, ou mantém a pasta `imagens/` ao lado do `painel.html`, ou atualiza **todos** os caminhos de uma vez.
6. **Memória do navegador (localStorage).** O app guarda posições do "mapa" em `localStorage` (`bpMapPos`, `bpMapLayV`). Preserve essas chaves para o Felipe não perder o layout dele.

---

## Passo 1 — Rede de segurança: controle de versão local (git)

**Por quê (em simples):** o git é uma "máquina do tempo" para a pasta. Cada *commit* é um ponto de salvamento ao qual dá para voltar. Isso é o que torna todo o resto seguro — qualquer erro vira só "desfazer". Não precisa de GitHub nem internet para isso.

**A IA deve fazer:**

1. Na pasta do projeto, rode `git init`.
2. Crie um arquivo `.gitignore` com, no mínimo:
   ```gitignore
   # Lixo de sistema operacional
   Thumbs.db
   desktop.ini
   .DS_Store

   # Dependências e ferramentas (se forem adicionadas depois)
   node_modules/

   # Segredos (precaução — não deve haver nenhum aqui)
   .env
   .env.*

   # Backups automáticos do app e backups soltos (o git já guarda o histórico do dados.js)
   backups/
   dados_backup_*.js
   ```
3. Faça o **primeiro commit capturando o estado de hoje** (inclusive as cópias e rascunhos, antes de qualquer limpeza):
   ```bash
   git add -A
   git commit -m "Primeiro commit: projeto como estava antes de organizar"
   ```

**Antes de versionar, faça uma varredura rápida de segredos:** procure por chaves/API keys/senhas no código (ex.: termos como `apikey`, `api_key`, `secret`, `token`, `password`). Este projeto não deve ter nenhum, mas confirme. Se achar algo, **⛔ PARE** e avise o Felipe.

**Pronto quando:** `git log` mostra o primeiro commit e `git status` está limpo.

---

## Passo 2 — Entender o app e confirmar a versão oficial

**Por quê:** não se mexe no que não se entende. Antes de mudar qualquer linha, mapeie como o app funciona e confirme qual é a versão "de verdade".

**A IA deve fazer:**

1. Leia `painel.html` e `dados.js` e escreva um resumo curto (3–6 frases, em português simples) de **como o app funciona**: como carrega os dados, como o Felipe adiciona/edita fichas, como salva (File System Access API + `backups/`), e quais são os "modos" (lista, mapa etc.).
2. Confirme que a **versão oficial é a da raiz** (`painel.html` + `dados.js` da pasta principal). Compare com a cópia em `codebase-claude-design/` (veja datas e diferenças) para ter certeza de que a raiz é a mais nova.
3. Releia a seção **"O que NÃO pode quebrar"** acima e confirme que cada invariante bate com o que você viu no código (ex.: ache no `painel.html` o `<script src="dados.js">`, a validação do esquema, a `serializeDados`, o `showSaveFilePicker`).

**⛔ PARE:** mostre ao Felipe (a) o resumo de como o app funciona e (b) sua conclusão sobre qual é a versão oficial e o que pretende arquivar. Só siga após o "ok".

**Pronto quando:** o Felipe confirmou a versão oficial e a lista de invariantes.

---

## Passo 3 — Consolidar para UMA versão oficial

**Por quê:** hoje há duas cópias do app e arquivos soltos. Ter **uma única fonte da verdade** é metade do "bem estruturado" — evita editar a cópia errada.

**A IA deve fazer:**

1. Crie a pasta `_arquivo/`.
2. **Mova** (não apague) para `_arquivo/`: a pasta `codebase-claude-design/`, a pasta `mockups/`, o arquivo `dados_backup_2026-06-14.js` e a `blue-prince-organizer.skill` (se o Felipe não quiser ela à mão).
3. **NÃO** mexa na pasta `backups/` — ela é viva, o app grava nela.
4. Confirme que a raiz ficou com a versão oficial limpa: `painel.html`, `dados.js`, `imagens/`, `backups/`, `COMO_PROCESSAR.md` (+ este guia).
5. Commit: `git commit -am "Consolida em uma versão oficial; arquiva cópias e rascunhos em _arquivo/"`.

**Pronto quando:** a raiz tem só a versão oficial e o `_arquivo/` guarda o resto (tudo ainda recuperável pelo git).

---

## Passo 4 — Garantir que roda "do zero"

**Por quê:** o teste de verdade da estrutura é: alguém pega a pasta limpa e consegue rodar **só seguindo o que está escrito**. Se você não consegue, esse é o primeiro "bug" a corrigir.

**A IA deve fazer:**

1. Copie a versão oficial para uma pasta limpa temporária e tente abrir o `painel.html` "do nada".
2. Note que, para o recurso de **salvar automático** funcionar, o ideal é servir em `localhost` (a File System Access API exige contexto seguro). Documente as **duas formas de rodar**:
   - **Simples:** abrir `painel.html` no Chrome/Edge (basta dar dois cliques).
   - **Recomendada (para salvar funcionar 100%):** rodar um servidorzinho local na pasta, por exemplo `npx serve` ou `python -m http.server`, e abrir o endereço `localhost` que aparecer.
3. Anote as **dependências externas** (precisam de internet): as fontes do Google Fonts e algumas imagens de salas que vêm de URLs da wiki. Sem internet, o app abre mas perde fontes/algumas imagens. Registre isso como "limitação conhecida".
4. Se algo impedir a abertura limpa, **conserte** e faça commit.

**Pronto quando:** dá para abrir a versão oficial numa pasta limpa seguindo os passos escritos, e o app carrega os dados.

---

## Passo 5 — Rede de testes (checagens que pegam erros)

**Por quê:** com testes no lugar, você mexe na estrutura sem medo: se algo quebrar, a checagem acende vermelho na hora. Não buscamos 100% de cobertura — buscamos proteger **o que importa**: o app abrir e os dados estarem íntegros. Esses testes também viram documentação do comportamento esperado.

Monte **três** camadas (faça commit ao final):

**5a) Checklist de fumaça manual (para o Felipe rodar).** Crie um arquivo `CHECKLIST.md` com uma lista curta do tipo "abra no Chrome e confira": o painel carrega; as fichas aparecem; a busca funciona; os filtros funcionam; o modo Mapa abre; adicionar/editar uma ficha funciona; **salvar** grava o `dados.js`; o backup é criado. Esse checklist será reusado após cada mudança.

**5b) Teste automático de carga (recomendado).** Use um navegador "sem tela" (Playwright ou Puppeteer headless, via Node) para abrir o `painel.html` com o `dados.js`, e verificar automaticamente: **(i)** nenhum erro no console; **(ii)** os elementos principais renderizaram (ex.: aparecem fichas/seções). Isso pega sozinho o pior tipo de regressão (a "tela branca"). *Observação:* o recurso de **salvar** não dá para testar headless (precisa de clique humano) — fica para o checklist 5a.

**5c) Validador do `dados.js` (recomendado).** Escreva um script Node (ex.: `verificar-dados.mjs`) que carrega o `DADOS` e confere a integridade. Regras mínimas:
   - `fichas`, `salas`, `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos` existem e são arrays.
   - todo `id` de ficha é **único** e não vazio.
   - todo `tipo` de ficha existe em `DADOS.tipos` (ou nos tipos padrão).
   - toda `conexao` aponta para um `id` de ficha que existe.
   - toda `sala` citada por uma ficha existe na lista de salas (ou está vazia).
   - todo `imagem` que começa com `imagens/` aponta para um arquivo que **existe** no disco.

   Use o `SCHEMA_VERSION` do `painel.html` como referência (hoje é **6**) em vez de fixar o número no script.

**Pronto quando:** o teste de carga passa sem erros de console, o validador roda e aponta 0 problemas (corrija os que aparecerem), e o `CHECKLIST.md` existe.

---

## Passo 6 — Formatador automático (Prettier)

**Por quê:** um formatador deixa o código com estilo consistente (espaços, quebras de linha) sem ninguém discutir. É a melhor relação esforço/resultado: limpa o "ruído" para a revisão humana focar no que importa. Ele **não muda o comportamento**, só a aparência do código.

**A IA deve fazer:**

1. Rode o Prettier na versão oficial: `npx prettier --write "painel.html" "dados.js"` (e nos `.css`/`.js` que existirem).
2. Rode as checagens do Passo 5 (carga + validador) para confirmar que **nada** de comportamento mudou.
3. Commit: `git commit -am "Formata o código com Prettier (sem mudança de comportamento)"`.

*Se o Node/npx não estiver disponível no ambiente:* tente instalar; se realmente não der, pule esta etapa e **avise o Felipe** em vez de formatar na mão de forma arriscada.

**Pronto quando:** o código está formatado, checagens verdes, commit feito.

---

## Passo 7 — Refatoração estrutural (organizar de verdade)

**Por quê:** aqui mora o maior ganho de "bem estruturado". Hoje o `painel.html` tem HTML, CSS e JavaScript **tudo no mesmo arquivo gigante**. Separar e organizar deixa cada parte fácil de achar e editar. O Felipe **autorizou** isso — mas cada mudança é **pequena, com commit e checagem**.

**A IA deve fazer (uma coisa de cada vez, com commit + checagens entre elas):**

1. **Separar os arquivos:** extrair o CSS para `estilos.css` e o JavaScript para `app.js`, deixando o `painel.html` só com a estrutura HTML + os `<link>`/`<script>` apontando para eles. **Mantenha** `<script src="dados.js">` **antes** do `app.js` (o `app.js` depende do `DADOS` já existir). Depois de separar, rode as checagens.
2. **Uma responsabilidade por arquivo/trecho.** Se o `app.js` ficar enorme, agrupe por tema (dados, renderização/UI, mapa, salvar/exportar) — pode ser por seções bem comentadas ou por arquivos separados, o que for mais simples sem quebrar a ordem de carregamento.
3. **Nomes claros.** Renomeie variáveis/funções obscuras para nomes que digam o que fazem. Renomeie de uma vez só (busca e substitui com cuidado) e teste.
4. **Remover entulho:** código morto, trechos comentados que não servem mais, duplicação óbvia, e aquelas linhas de "compatibilidade com nomes antigos" se você confirmar que não são mais usadas.
5. **Funções que fazem cinco coisas:** quebre em funções menores com nome claro — só quando for seguro e testável.

**Depois de CADA item acima:** rode o teste de carga + o validador (Passo 5), confirme os invariantes (especialmente o elo `painel.html`↔`dados.js`↔`serializeDados`) e faça um commit pequeno com mensagem clara.

**⛔ PARE** se em algum momento o app deixar de abrir ou uma checagem ficar vermelha e você não resolver em poucos minutos: desfaça o último commit (`git revert` ou `git checkout`) e avise o Felipe.

**Pronto quando:** `painel.html` / `estilos.css` / `app.js` separados e organizados, sem código morto óbvio, e o app funciona idêntico (todas as checagens verdes).

---

## Passo 8 — Linter (análise que pega bugs)

**Por quê:** o linter lê o JavaScript e aponta problemas reais — variáveis não usadas, comparações erradas, bugs prováveis, padrões ruins. Funciona muito melhor **depois** da separação do Passo 7, porque agora o JS está num `app.js` limpo.

**A IA deve fazer:**

1. Configure o **ESLint** para o `app.js` (use uma config recomendada para navegador/JS puro).
2. Rode `npx eslint app.js` e corrija os apontamentos que forem seguros. Para cada correção não trivial: checagens + commit pequeno.
3. Itens que mudariam comportamento ou que você não tem certeza: **não** mexa por conta própria — liste para o Felipe decidir.

**Pronto quando:** o ESLint roda e os avisos relevantes foram resolvidos (ou listados para o Felipe), checagens verdes.

---

## Passo 9 — Documentação mínima (README)

**Por quê:** um bom README é o que faz "você daqui a seis meses" (ou a próxima IA) entender o projeto em 2 minutos.

**A IA deve fazer:** criar um `README.md` na raiz com:

1. **O que é** o projeto, em duas linhas.
2. **Como rodar** (as duas formas do Passo 4; deixar claro que salvar exige **Chrome/Edge**).
3. **Estrutura das pastas/arquivos** (o que é cada um: `painel.html`, `estilos.css`, `app.js`, `dados.js`, `imagens/`, `backups/`, `_arquivo/`).
4. **Como os dados funcionam** — um resumo do esquema do `DADOS` e um link para o `COMO_PROCESSAR.md` (que já explica as fichas). Avisar o invariante "gravar = carregar".
5. **Como adicionar/editar uma ficha** (pelo próprio painel) e **como o salvar/backup** funciona.
6. **Como rodar as checagens** (teste de carga + validador) e as ferramentas (Prettier/ESLint).
7. **Limitações conhecidas** (precisa de internet para fontes/algumas imagens; salvar só em Chrome/Edge).

Commit: `git commit -am "Adiciona README com visão geral, como rodar e estrutura"`.

**Pronto quando:** o `README.md` existe e cobre os 7 pontos.

---

## Passo 10 — Verificação final

**Por quê:** confirmar que tudo está "verde e limpo" antes de considerar pronto.

**A IA deve fazer:**

1. Numa pasta limpa, abrir a versão oficial e rodar o **checklist de fumaça** inteiro (peça ao Felipe para fazer o teste visual/clique, que é o único que precisa de humano).
2. Rodar o **teste de carga** (headless) e o **validador de dados** — tudo verde.
3. Rodar **Prettier** (checar formatação) e **ESLint** (sem erros pendentes).
4. Conferir os **6 invariantes**.
5. Marcar este ponto no git: `git tag v1-organizado` (uma "etiqueta" no estado bom).
6. Entregar ao Felipe um **resumo final**: o que mudou, onde ficou cada coisa, e como rodar as checagens daqui pra frente.

**Pronto quando:** todas as checagens verdes, app idêntico ao original em comportamento, e o resumo entregue.

---

## Passo 11 — (Opcional) Subir para o GitHub

Só se o Felipe quiser, mais tarde. Antes de subir: **revarra por segredos** (mesmo que não deva haver nenhum), confirme que o `.gitignore` cobre `node_modules/`, `.env*` e backups, escreva uma frase no README sobre licença/uso, e então crie o repositório (pode ser **privado**) e dê `git push`. Nada disso é necessário para o app funcionar — é só para guardar na nuvem ou compartilhar.

---

## 📋 Checklist final da IA (Definition of Done)

- [ ] `git init` feito; primeiro commit captura o estado original; `.gitignore` no lugar.
- [ ] Versão oficial confirmada com o Felipe; cópias/rascunhos movidos para `_arquivo/` (nada apagado).
- [ ] App roda numa pasta limpa; as duas formas de rodar estão documentadas.
- [ ] Checklist de fumaça (`CHECKLIST.md`), teste de carga headless e validador de `dados.js` criados e passando.
- [ ] Código formatado (Prettier) e analisado (ESLint), sem mudança de comportamento.
- [ ] `painel.html` / `estilos.css` / `app.js` separados e organizados; sem código morto óbvio.
- [ ] Os **6 invariantes** continuam intactos; o app funciona idêntico ao original.
- [ ] `README.md` cobre o que é, como rodar, estrutura, dados, checagens e limitações.
- [ ] Verificação final verde; `git tag v1-organizado`; resumo entregue ao Felipe.

---

## 📖 Glossário (português simples)

- **git / commit:** "máquina do tempo" do código. Cada *commit* é um ponto de salvamento ao qual dá para voltar. Tudo local, sem internet.
- **.gitignore:** lista de arquivos que o git deve ignorar (lixo, segredos, coisas geradas).
- **refatorar:** reorganizar o código por dentro **sem mudar** o que ele faz por fora.
- **formatador (Prettier):** arruma o estilo do código (espaços, alinhamento) automaticamente. Não muda comportamento.
- **linter (ESLint):** lê o código e aponta possíveis bugs e descuidos.
- **teste de fumaça:** verificação rápida do "será que liga e funciona o básico?".
- **headless:** navegador rodando "sem tela", controlado por script, para testar sozinho.
- **README:** o arquivo de apresentação do projeto: o que é e como usar.
- **invariante:** uma regra que tem que continuar verdadeira sempre, senão o app quebra.
- **localStorage / File System Access API:** recursos do navegador. O primeiro guarda pequenas preferências; o segundo deixa o app gravar arquivos no PC (só Chrome/Edge).
- **CDN:** servidor na internet de onde vêm coisas como as fontes do Google. Por isso o app precisa de internet para ficar 100%.

---

*Fim. Trabalhe de cima para baixo, em commits pequenos, verificando após cada passo. Na dúvida, pergunte ao Felipe em vez de adivinhar.*

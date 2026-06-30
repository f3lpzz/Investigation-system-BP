# Instruções para a IA — Colocar o "Blue Prince" online (multiusuário, com contas)

> **Para a IA que vai executar:** este documento foi escrito pelo Felipe, que **não programa** e construiu este projeto com IA. O objetivo é transformar o app local (hoje um site estático de um usuário só) em um **sistema online onde qualquer pessoa cria conta e cataloga o próprio jogo**, com dados salvos na nuvem e sincronizados entre aparelhos — gastando **zero ou quase zero**. Você tem acesso ao terminal e aos arquivos: **execute** os passos, não apenas descreva. Trabalhe de cima para baixo.
>
> **Para o Felipe:** este guia explica cada coisa em português simples (tem um glossário no fim). Colocar algo online com contas de outras pessoas é um passo maior que organizar o código — envolve responsabilidades (privacidade, segurança). Está tudo coberto aqui, em ordem e sem susto.

---

## ⭐ Pré-requisito recomendado

Antes de colocar online, rode o outro guia (**"Estruturar o Projeto"**): git, separar `painel.html` em arquivos, testes e checagens. Migrar para a nuvem **em cima de um código já organizado** é muito mais seguro e barato. Se ainda não fez, faça primeiro — ou, no mínimo, garanta que há **git** funcionando (máquina do tempo) antes de começar aqui.

---

## 0. A decisão em uma página (o que vamos construir e por quê)

**O que o Felipe quer (as 3 escolhas que guiam tudo):**
1. **Cada um o seu** — cada pessoa cataloga o próprio jogo; dados **privados** de cada usuário.
2. **Nuvem com login** — a pessoa cria conta e os dados **sincronizam entre dispositivos**.
3. **Grátis ou quase** — hospedagem e backend de tier gratuito.

**A arquitetura recomendada (em miúdos):**

```
   Pessoa no navegador
          │
   ┌──────▼───────┐        ┌───────────────────────────┐
   │  O APP (site  │  fala  │  SUPABASE (o "backend       │
   │  estático,    │◀──────▶│  pronto", de graça):        │
   │  o painel)    │        │   • Login/contas (Auth)     │
   └──────────────┘         │   • Banco de dados (Postgres)│
   hospedado de graça        │   • Imagens (Storage)        │
   (Cloudflare Pages)        │   • Segurança por usuário(RLS)│
                             └───────────────────────────┘
```

- **Frontend (a "cara"):** continua sendo o seu app atual (HTML/CSS/JS puro), publicado de graça.
- **Backend (o "cofre" na nuvem):** **Supabase** — um serviço que já entrega login, banco de dados e armazenamento de imagens **prontos**, sem você precisar programar nem manter servidor. Tem tier gratuito.
- **Como os dados ficam:** hoje todo o catálogo do app vive num objeto chamado `DADOS` (dentro de `dados.js`). Online, **guardamos esse mesmo `DADOS` como um "documento" na nuvem, um por usuário**. É a mudança de menor risco: o miolo do app (que já sabe trabalhar com o `DADOS` na memória) quase não muda — só troca **de onde** ele carrega e **para onde** ele salva.
- **Por que é de graça:** o site estático é hospedado grátis e o Supabase no plano gratuito aguenta tranquilamente o começo (números na seção 1).

**Por que Supabase (e não outro):** os dados do app são **interligados** (fichas ligadas a salas, personagens, conexões). O Supabase usa um banco relacional (Postgres) com **"RLS"** — uma trava que garante, no próprio banco, que **cada pessoa só enxerga os próprios dados**. Isso é exatamente o que "cada um o seu" exige, e é simples de configurar. Alternativa: **Firebase** (ver seção 1.3).

---

## 1. A arquitetura em detalhe

### 1.1 As peças
| Peça | O que faz | Quem usamos | Custo |
|---|---|---|---|
| Frontend (o painel) | A tela que a pessoa usa | O app atual, publicado | Grátis |
| Hospedagem do site | Põe o site no ar | **Cloudflare Pages** (banda ilimitada) | Grátis |
| Login/contas | Cadastro, login, "esqueci a senha" | **Supabase Auth** | Grátis |
| Banco de dados | Guarda o catálogo de cada usuário | **Supabase (Postgres)** | Grátis |
| Imagens | Guarda as fotos que o usuário envia | **Supabase Storage** | Grátis |
| Segurança por usuário | Garante que A não vê o de B | **Supabase RLS** | Grátis |

### 1.2 Limites do plano gratuito (verificados em **junho/2026** — confira na seção Fontes)
**Supabase (grátis):**
- Banco de dados: **500 MB** • Imagens (Storage): **1 GB** • Tráfego: ~**5 GB**/mês.
- Usuários ativos por mês: **50.000**.
- ⚠️ **Pausa após 7 dias sem nenhum acesso.** O projeto "dorme" e precisa ser reativado com um clique no painel do Supabase. *Mitigação:* enquanto não houver uso diário, criar uma "batida" automática (um agendamento simples que acessa o app 1x/dia) ou apenas reativar manualmente quando precisar. Quando houver usuários acessando, ele não pausa.

**Hospedagem (grátis):** Cloudflare Pages = **banda ilimitada**, 500 builds/mês. (Netlify/Vercel/GitHub Pages = 100 GB/mês.)

Para um app de catálogo (texto, com imagens guardadas à parte), esses limites comportam **muitos** usuários antes de custar qualquer coisa. A seção 7 diz quando passaria a custar.

### 1.3 Alternativa: Firebase
**Firebase (grátis/Spark):** banco 1 GB, ~50 mil leituras/dia, login até 50 mil usuários, Storage 1 GB + 10 GB download/mês, e **não pausa** por inatividade. É uma boa alternativa **se** a pausa do Supabase incomodar. Contras para o nosso caso: o banco do Firebase (Firestore) tem **limite de ~1 MB por documento**, então guardar o `DADOS` inteiro num documento só pode estourar se o catálogo crescer muito — exigiria quebrar os dados em vários documentos (mais retrabalho). Por isso o **Supabase é a recomendação principal** (no Postgres, um registro aguenta vários MB sem problema). Use Firebase só se o Felipe preferir, ciente desse detalhe.

---

## 2. O que muda no app — e o que continua igual

**Continua IGUAL (não pode quebrar):**
- O objeto `DADOS` e seu formato (esquema **versão 6**: `fichas`, `salas`, `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`). Todo o miolo que renderiza, filtra, edita e desenha o mapa **continua trabalhando com o `DADOS` na memória, do mesmo jeito**.
- A experiência de uso do painel (botões, telas, modos).

**MUDA (de forma controlada):**
1. **De onde vêm e para onde vão os dados.** Hoje o app lê o `dados.js` e grava o arquivo no PC pela File System Access API (só Chrome/Edge). Online isso **sai de cena**: o app passa a **carregar o `DADOS` da nuvem ao logar** e **salvar na nuvem** a cada mudança (com um pequeno atraso, "autosave").
2. **Entra uma tela de login/cadastro** antes do painel.
3. **As imagens enviadas pelo usuário** passam a ir para o Supabase Storage (em vez de caminho local `imagens/`); o link da imagem é guardado no campo `imagem` da ficha. Imagens que já são URLs da web continuam como estão.
4. **O `dados.js` deixa de ser a fonte da verdade.** Ele pode virar só uma **"semente" de demonstração** (catálogo de exemplo para quem entra sem conta), se o Felipe quiser.

**Regra de segurança:** faça tudo isto numa **branch do git** chamada `online`, deixando a versão local intacta na branch principal. Assim o app local continua funcionando enquanto a versão online é construída e testada.

---

## 3. Passo a passo para a IA

> Faça **commits pequenos** e, ao fim de cada passo, confirme que o app ainda abre e funciona. Onde houver **⛔ PARE**, mostre o resultado ao Felipe e espere o "ok".

### Passo 1 — Preparar o terreno
- Garanta git funcionando. Crie e troque para a branch: `git checkout -b online`.
- Confirme que o app local ainda abre normalmente antes de começar.

### Passo 2 — Criar a conta e o projeto no Supabase
- **⛔ PARE (precisa do Felipe):** criar conta exige e-mail/login dele. Oriente-o (ou faça junto): acessar o site do Supabase, criar conta (pode ser com o Google/GitHub), criar um **projeto novo** (região mais próxima do Brasil, ex.: São Paulo se disponível), e **definir uma senha do banco** (guardar num lugar seguro).
- Ao final, anote dois valores do projeto (em *Project Settings → API*): a **URL do projeto** e a **chave `anon`** (chave pública). Esses dois vão no app.
- **Importante (segurança):** existe também uma chave **`service_role`** (secreta). Ela **NUNCA** vai para o frontend nem para o git. Só a `anon` vai no app. (Ver seção 4.)

### Passo 3 — Criar o banco e a trava de segurança (RLS)
No Supabase (SQL Editor), crie a tabela que guarda o catálogo de cada usuário e ligue a trava por usuário:
- Tabela `catalogo_usuario` com colunas: `user_id` (identificador do dono, chave), `dados` (tipo **jsonb** — guarda o `DADOS` inteiro), `atualizado_em` (data/hora).
- **Ative o RLS** nessa tabela e crie políticas para que cada pessoa só possa **ler/criar/alterar a linha onde `user_id` = o id dela** (no Supabase, isso é `auth.uid()`).
- Resultado: mesmo que alguém tente, o banco **não deixa** um usuário ver os dados de outro. Essa é a peça-chave do "cada um o seu".

### Passo 4 — Ligar o login (Auth)
- No Supabase Auth, habilite **e-mail + senha** e, de preferência, **link mágico** (login por link no e-mail). Opcional: **login com Google** (mais cômodo).
- No app, crie uma **tela de login/cadastro** simples (entrar, criar conta, esqueci a senha). Enquanto a pessoa não está logada, mostra essa tela; depois de logar, mostra o painel.

### Passo 5 — Conectar o app ao Supabase (o coração da migração)
- Inclua o cliente do Supabase no app (via CDN, `@supabase/supabase-js`), configurado com a **URL** e a **chave `anon`**.
- **Ao logar:** buscar a linha do usuário em `catalogo_usuario`.
  - Se **existir**: carregar o campo `dados` para dentro do `DADOS` em memória e renderizar o painel normalmente.
  - Se **não existir** (primeiro acesso): criar a linha com um `DADOS` vazio padrão (o mesmo "esqueleto" versão 6 que o app já usa quando não há dados).
- **Ao mudar algo:** em vez de gravar arquivo, chamar uma função `salvarNaNuvem()` que faz *upsert* (cria ou atualiza) do campo `dados` com o `DADOS` atual. Use **autosave com atraso** (debounce, ~1–2 s) para não salvar a cada tecla. Atualize `atualizado_em`.
- **Reaproveite o que já existe:** a função que hoje serializa o `DADOS` para texto (`serializeDados`) pode virar a base do que mandamos para a nuvem (como JSON). A parte que **lê** o `DADOS` no início é a que passa a vir da nuvem. Mantenha as duas pontas em sincronia (invariante: ler e salvar têm que casar).
- **Migração dos dados atuais do Felipe:** dê um caminho para ele **importar o `dados.js` atual** para a conta dele (ex.: um botão "importar arquivo" que lê o `dados.js` e salva na nuvem). Assim ele não perde o catálogo já feito.

### Passo 6 — Imagens na nuvem (Storage)
- Crie um **bucket** no Supabase Storage (ex.: `imagens`) com políticas para que cada usuário só acesse a **própria pasta** (`{user_id}/...`).
- No app, onde hoje a pessoa anexa uma foto, **faça upload para o Storage** e guarde a **URL retornada** no campo `imagem` da ficha (em vez do caminho local).
- Imagens que já são URLs da web (ex.: as da wiki) continuam funcionando como links. (Ver seção 6 sobre direitos das imagens.)

### Passo 7 — Conta e dados do usuário (LGPD na prática)
Adicione, na área logada:
- **Sair** (logout).
- **Exportar meus dados** (baixar o próprio `dados.js`/JSON — também serve de backup pessoal).
- **Apagar minha conta e meus dados** (remove a linha do banco, as imagens do Storage e a conta no Auth). Isso é exigência básica de privacidade (seção 5).

### Passo 8 — Testar o isolamento (o teste mais importante)
- Crie **duas contas de teste** (A e B). Catalogue coisas diferentes em cada uma.
- Confirme que, logado como A, **não** dá para ver nada de B — nem dados, nem imagens. Teste também: recarregar a página mantém o login; logar em "outro aparelho" (outro navegador) mostra os mesmos dados (sincronizou).
- Rode as checagens do app (do guia de estruturação). **⛔ PARE** e mostre ao Felipe o resultado desse teste antes de publicar.

### Passo 9 — Publicar o site (deploy)
- Suba o projeto para um repositório no **GitHub** (pode ser privado).
- Conecte o repositório ao **Cloudflare Pages** (recomendado) — ele publica o site e atualiza sozinho a cada `git push`.
- **Variáveis:** a **URL** e a **chave `anon`** podem ficar no frontend (são públicas por design; quem protege os dados é o RLS). A **`service_role` NUNCA** entra no frontend nem no git.
- (Opcional) Um **domínio próprio** depois (ex.: `meuapp.com.br`) — custa poucos reais/ano; não é necessário para funcionar.

### Passo 10 — Criar a documentação do projeto (ver seção 8)
Gere os documentos: `README.md`, `ARQUITETURA.md`, `MODELO-DE-DADOS.md`, `DEPLOY.md`, `PRIVACIDADE.md`, `SEGURANCA.md`. Conteúdos na seção 8.

### Passo 11 — Privacidade, LGPD e direitos (seções 5 e 6)
Publique uma **Política de Privacidade** simples e um **aviso "fan-made"**. Detalhes nas seções 5 e 6.

### Passo 12 — Verificação final e "ir ao ar"
- App publicado abre numa janela anônima; cadastro/login funcionam; dados salvam e sincronizam; isolamento entre usuários confirmado; exportar e apagar conta funcionam.
- `git tag online-v1`. Entregue ao Felipe um **resumo**: o endereço do site, como entrar no painel do Supabase, como reativar se pausar, e onde estão os documentos.
- **Combine o monitoramento:** de olho na pausa de 7 dias e nos limites (seção 1.2/7).

---

## 4. 🔐 Segurança — leitura obrigatória
- **Duas chaves do Supabase:** `anon` (pública, pode ir no app) e `service_role` (secreta, **nunca** no frontend nem no git — ela ignora o RLS e dá acesso total). Coloque segredos em variáveis de ambiente e no `.gitignore`.
- **O que realmente protege os dados é o RLS** (Passo 3). Sem RLS bem configurado, a chave pública permitiria ler tudo. Por isso o **Passo 8 (teste de isolamento) é inegociável** antes de publicar.
- **Senhas:** quem cuida é o Supabase Auth (você não guarda senha nenhuma). Ative confirmação de e-mail.
- **Nunca** comite chaves, senhas ou o `service_role`. Faça a varredura de segredos antes de cada `git push`.

## 5. 🔏 Privacidade e LGPD (resumo prático — não é aconselhamento jurídico)
Como o app vai guardar dados de outras pessoas (e-mail + catálogo), o mínimo responsável no Brasil (LGPD):
- **Colete o mínimo:** basicamente e-mail (login) e o catálogo que a pessoa cria. Nada além do necessário.
- **Política de Privacidade** simples (`PRIVACIDADE.md` + uma página no app): o que é coletado, para quê, onde fica (Supabase), e como pedir exclusão.
- **Direito de apagar:** o botão "apagar minha conta e dados" (Passo 7) cobre isso.
- **Consentimento:** no cadastro, um aviso curto + link para a política.
- **Contato:** um e-mail para dúvidas de privacidade.
- Se um dia crescer muito ou virar negócio, vale procurar orientação jurídica de verdade.

## 6. ™️ Direitos do jogo e marca (Blue Prince)
Blue Prince é um jogo com **direitos autorais** de terceiros. Uma ferramenta **feita por fã**, onde cada usuário cataloga **as próprias capturas e anotações**, tende a ser de baixo risco — mas tome cuidados:
- **Aviso "fan-made":** deixe claro no site que é um projeto **não oficial, feito por fã, sem afiliação** com a desenvolvedora/publicadora.
- **Não embuta os arquivos do jogo** como parte do seu app. Prefira que **cada usuário envie as próprias imagens** (vão para a pasta dele no Storage).
- **Imagens da wiki por link** (hotlink) são frágeis e não são suas — evite depender delas no produto público; use-as no máximo como exemplo.
- Se quiser, verifique a política de conteúdo de fãs da publicadora. Isto não é aconselhamento jurídico.

## 7. 💸 Quando deixaria de ser grátis
Você só pagaria ao **passar** dos limites gratuitos. Os gargalos prováveis, em ordem:
1. **Imagens (1 GB no Storage):** o que enche mais rápido, porque foto pesa. Mitigue **comprimindo as imagens no upload** (reduzir resolução/qualidade) — dá para guardar muita coisa em 1 GB assim.
2. **Banco (500 MB):** texto ocupa pouco; comporta um número enorme de catálogos.
3. **Usuários ativos (50 mil/mês)** e **tráfego (~5 GB/mês no Supabase):** só viram tema com bastante audiência.
Quando chegar perto, o plano pago do Supabase começa na casa de poucas dezenas de dólares por mês. Para começar e crescer bastante: **R$ 0**. *(Hospedagem no Cloudflare Pages não é gargalo: banda ilimitada.)*

## 8. 📚 Documentação recomendada para o projeto (responde à sua 1ª pergunta)
As melhores documentações para um projeto assim, em ordem de importância:
1. **`README.md`** — o que é o app, link do site no ar, como rodar localmente, como publicar. A porta de entrada.
2. **`ARQUITETURA.md`** — o desenho das peças (frontend + Supabase Auth/Banco/Storage), como os dados fluem (login → carrega `DADOS` → autosave) e **por que** cada escolha. (Inclua o diagrama da seção 0.)
3. **`MODELO-DE-DADOS.md`** — o esquema do `DADOS` versão 6 (cada entidade e campo; pode estender o que o `COMO_PROCESSAR.md` já descreve das fichas) + a tabela `catalogo_usuario` e as políticas RLS.
4. **`DEPLOY.md` (manual de operação)** — passo a passo para recriar tudo: criar projeto Supabase, rodar o SQL das tabelas/RLS, configurar Auth/Storage, publicar no Cloudflare Pages, e **como reativar se o Supabase pausar**.
5. **`PRIVACIDADE.md`** — a política de privacidade (seção 5).
6. **`SEGURANCA.md`** — regra das chaves `anon`/`service_role`, RLS, o que nunca comitar (seção 4).
7. **`COMO_PROCESSAR.md`** (já existe) — mantenha; são as regras de conteúdo do jogo.
8. *(Opcional)* **`CHANGELOG.md`** — histórico de versões.

A IA deve **criar de fato** os itens 1–6 como parte do Passo 10.

---

## 📖 Glossário (português simples)
- **Backend:** a parte "dos bastidores" (login, banco, imagens) que fica num servidor — aqui, fornecida pronta pelo Supabase.
- **BaaS (Backend as a Service):** "backend pronto para usar" — você liga seu app e ele entrega login/banco/armazenamento sem você manter servidor.
- **Supabase / Firebase:** dois serviços de BaaS com plano gratuito.
- **Auth (autenticação):** o sistema de **contas e login**.
- **Banco de dados (Postgres):** onde os catálogos ficam guardados.
- **RLS (Row Level Security):** trava no banco que garante que **cada usuário só acessa os próprios dados**.
- **jsonb:** um tipo de coluna do Postgres que guarda um objeto JSON inteiro (aqui, o `DADOS`).
- **Storage:** o "porta-arquivos" na nuvem para as **imagens**.
- **chave `anon` vs `service_role`:** a pública (pode ir no app) e a secreta (nunca no app/git).
- **Deploy / publicar:** colocar o site no ar.
- **Cloudflare Pages:** serviço que hospeda o site de graça.
- **CDN:** rede que entrega o site rápido no mundo todo.
- **Branch (git):** uma "linha paralela" do projeto; aqui, `online`, para não mexer na versão local.
- **PWA / offline:** melhorias opcionais para o app funcionar até sem internet (não obrigatório agora).
- **LGPD:** a lei brasileira de proteção de dados pessoais.

---

## 🔎 Fontes (limites verificados em junho/2026)
- Supabase — limites do plano gratuito e pausa por inatividade: https://aiagencyplus.com/supabase-free-tier-limits/ e https://uibakery.io/blog/supabase-pricing
- Firebase — plano gratuito (Spark): https://firebase.google.com/docs/projects/billing/firebase-pricing-plans e https://firebase.google.com/pricing
- Hospedagem estática gratuita (Cloudflare Pages/Netlify/Vercel/GitHub Pages): https://danubedata.ro/blog/cloudflare-pages-vs-netlify-vs-vercel-static-hosting-2026
> Os números mudam com o tempo — a IA deve **reconferir** os limites atuais ao executar e ajustar o documento se algo tiver mudado.

---

## ✅ Checklist final da IA (Definition of Done)
- [ ] Branch `online`; versão local intacta na branch principal.
- [ ] Projeto Supabase criado; URL + chave `anon` no app; `service_role` fora do app/git.
- [ ] Tabela `catalogo_usuario` (jsonb) com **RLS** e políticas por usuário.
- [ ] Login/cadastro funcionando (e-mail+senha e/ou link mágico).
- [ ] App carrega o `DADOS` da nuvem ao logar e faz **autosave**; importação do `dados.js` atual do Felipe disponível.
- [ ] Imagens enviadas vão para o Storage; link salvo na ficha; compressão no upload.
- [ ] Exportar dados e **apagar conta/dados** funcionando (LGPD).
- [ ] **Teste de isolamento entre 2 contas passou** (A não vê B) — confirmado com o Felipe.
- [ ] Site publicado (Cloudflare Pages) e atualizando a cada push.
- [ ] Política de Privacidade + aviso "fan-made" publicados.
- [ ] Docs criados: README, ARQUITETURA, MODELO-DE-DADOS, DEPLOY, PRIVACIDADE, SEGURANCA.
- [ ] `git tag online-v1`; resumo final entregue (endereço, acessos, como reativar/monitorar).

---

*Fim. Construa numa branch, em commits pequenos, testando o isolamento entre usuários antes de publicar. Na dúvida, pergunte ao Felipe em vez de adivinhar.*

# Plano dos documentos — Blue Prince online

> **O que é este arquivo:** o *detalhamento* (blueprint) do que cada um dos 7 documentos precisa ter para guiar o **Claude Code** a transformar o MVP local num **app online com contas**. Não é a documentação final — é a régua que vamos seguir para escrever cada documento com profundidade. (Fase 1 do pedido do Felipe.)
>
> **Quem vai ler os documentos finais:** principalmente a **IA executora (Claude Code)** — então cada doc precisa ser *acionável* (passos, SQL, código de exemplo), não só conceitual. O Felipe é o leitor secundário: linguagem simples, com glossário quando precisar.

---

## Decisões já fechadas (valem para todos os documentos)

Estas escolhas foram confirmadas com o Felipe e **não devem ser reabertas** pelos documentos — devem ser tratadas como dadas:

1. **Stack:** site estático (o app atual) + **Supabase** (Auth + Postgres + Storage + RLS) + **Cloudflare Pages** (hospedagem) + **GitHub** (repositório/deploy).
2. **Modelo de dados na nuvem:** **1 registro por usuário** — o objeto `DADOS` inteiro guardado como **`jsonb`** numa tabela `catalogo_usuario`. Imagens à parte (Supabase Storage). É a migração de menor risco (o miolo do app continua trabalhando com `DADOS` na memória).
3. **Login:** **e-mail + senha** e **login com Google**. (Sem link mágico.) Com **confirmação de e-mail** ligada.
4. **Visitante sem conta:** vai **direto para a tela de login/cadastro** — **sem** catálogo de demonstração. App só aparece depois de logar.
5. **Fora de escopo da 1ª versão online** (declarar explicitamente em SPEC e ARQUITETURA): compartilhar/publicar catálogos entre usuários; funcionar offline/PWA; app nativo de celular; domínio próprio. Tudo isso fica para depois.
6. **Idioma dos documentos:** português simples. Termos técnicos explicados em 1 frase; glossário quando o doc for longo.
7. **Navegador-alvo:** Chrome/Edge (igual ao MVP). O app online funciona em qualquer navegador moderno para ler; a recomendação de Chrome/Edge persiste por consistência com o MVP.

---

## Fatos técnicos verificados (jun/2026) — usar como fonte nos documentos

Os documentos devem citar estes números e **mandar a IA reconferir** na hora de executar (mudam com o tempo).

- **Supabase (plano gratuito):** banco **500 MB**; Storage **1 GB**; egress ~**5 GB/mês**; **50.000** usuários ativos/mês; API ilimitada; **pausa após 7 dias** sem atividade (religar = 1 clique no painel, ~60s de "cold start"); máximo **2 projetos** ativos.
- **Cloudflare Pages (gratuito):** **banda ilimitada**; **500 builds/mês**; até **20.000 arquivos** por site; **25 MiB** por arquivo; deploy automático a cada `git push` no GitHub + *preview* por pull request.
- **supabase-js v2 (cliente JS, via CDN):** `auth.signInWithPassword({email,password})`, `auth.signUp(...)`, `auth.signInWithOAuth({provider:'google'})`, `auth.resetPasswordForEmail(...)`, `auth.signOut()`, `auth.getSession()/onAuthStateChange(...)`; dados: `.from('catalogo_usuario').upsert(row,{onConflict:'user_id'}).select()`; imagens: `.storage.from('imagens').upload(\`${userId}/arquivo.png\`, file, {upsert:true})` e `getPublicUrl(...)`.
- **RLS de tabela (Postgres):** habilitar RLS e criar policies por operação. Padrão por usuário: `USING ((select auth.uid()) = user_id)` no SELECT/UPDATE/DELETE e `WITH CHECK ((select auth.uid()) = user_id)` no INSERT/UPDATE. **Atenção:** UPDATE exige também uma policy de SELECT. Criar **índice** em `user_id`. Envolver `auth.uid()` num `(select ...)` melhora performance.
- **RLS de Storage:** policies em `storage.objects` com `bucket_id = 'imagens' AND (storage.foldername(name))[1] = (select auth.uid())::text` — garante que cada usuário só acessa a pasta com o próprio id.

Fontes (reconferir ao executar): supabase.com/pricing, supabase.com/docs (RLS, Storage, Auth, JS reference), developers.cloudflare.com/pages/platform/limits.

---

## Convenções da pasta

- Pasta única: **`Documentação/Para a versão online/`**.
- Nomes numerados pela ordem de leitura (a IA lê de cima para baixo):
  `0-PLANO-DOS-DOCUMENTOS.md` (este), `0-INDICE.md`, `1-SPEC.md`, `2-README.md`, `3-MODELO-DE-DADOS.md`, `4-ARQUITETURA.md`, `5-DEPLOY.md`, `6-SEGURANCA.md`, `7-PRIVACIDADE.md`.
- **Núcleo para construir** (ler primeiro): SPEC, README, MODELO-DE-DADOS, ARQUITETURA. **Para publicar:** DEPLOY, SEGURANCA, PRIVACIDADE.
- Vocabulário **consistente** entre todos: tabela `catalogo_usuario`; colunas `user_id`, `dados` (jsonb), `atualizado_em`; bucket `imagens`; função `salvarNaNuvem()`; branch `online`.

---

# Detalhamento por documento

Para cada um: **Objetivo**, **Seções obrigatórias**, **Artefatos concretos** (o que precisa vir pronto), **Profundidade** e **"Bom quando"** (como saber que ficou útil).

---

## 1-SPEC.md — o alvo (o documento mais importante)

**Objetivo:** descrever, sem ambiguidade, **o que** o app online faz quando estiver pronto — para a IA não inventar escopo nem esquecer nada. É o "contrato".

**Seções obrigatórias:**
- *Em 1 frase:* o que é e para quem.
- *Personas/uso:* o jogador de Blue Prince que quer catalogar o próprio jogo e acessar de vários aparelhos.
- *Histórias de usuário* (lista do que a pessoa faz), cada uma curta e testável: criar conta (e-mail/senha ou Google), confirmar e-mail, login, "esqueci a senha", criar/editar/excluir fichas, salvar na nuvem automaticamente, sincronizar entre aparelhos, enviar imagens, **importar o `dados.js` atual**, exportar os dados, sair, **apagar conta e dados**.
- *Regras de negócio:* cada usuário só vê o próprio catálogo; confirmação de e-mail obrigatória; tudo salvo na nuvem (não mais no arquivo local).
- *Requisitos não-funcionais:* custo ~zero (tiers grátis); privacidade (LGPD); isolamento por usuário (RLS); funciona em navegadores modernos (recomendado Chrome/Edge).
- *Fora de escopo agora* (lista explícita): compartilhar/publicar catálogos; offline/PWA; app nativo; domínio próprio; colaboração em tempo real.
- *Critérios de aceite ("Pronto quando"):* roteiro testável — "crio conta, confirmo e-mail, cataloguei, saí, voltei em outro navegador/aparelho e está tudo lá; criei 2ª conta e não vejo os dados da 1ª; exportei e apaguei a conta com sucesso".

**Artefatos concretos:** tabela de histórias de usuário com status; lista de critérios de aceite numerados (servem de roteiro de teste no fim).

**Profundidade:** média-alta; sem código. Foco em clareza e completude do escopo.

**Bom quando:** lendo só a SPEC, a IA (ou outra pessoa) consegue dizer exatamente o que construir e como saber que terminou — e o que **não** fazer.

---

## 2-README.md — a porta de entrada

**Objetivo:** orientar quem chega ao projeto (IA ou humano) em 2 minutos: o que é, em que estado está, e para onde ir.

**Seções obrigatórias:**
- *O que é*, em 2 linhas (app de catálogo do Blue Prince; fan-made).
- *Estado hoje x objetivo:* hoje = MVP local, 1 usuário, salva em arquivo (Chrome/Edge); objetivo = online, multiusuário, dados na nuvem sincronizados.
- *Como rodar o MVP atual:* abrir `Painel (o app)/painel.html` ou servir em localhost (apontar para o README do MVP que já existe, sem duplicar).
- *Mapa dos arquivos do app* (painel.html, estilos.css, app.js, dados.js, imagens/) e o que cada um é.
- *Índice da documentação online:* o que ler e em que ordem (apontar para SPEC, ARQUITETURA, MODELO-DE-DADOS, DEPLOY, SEGURANCA, PRIVACIDADE).
- *Como publicar* (resumo de 3 linhas apontando para o DEPLOY).

**Artefatos concretos:** árvore de arquivos; tabela "documento → para que serve → quando ler".

**Profundidade:** curta e navegacional. Não repetir o conteúdo dos outros; **linkar**.

**Bom quando:** alguém novo entende o projeto e acha qualquer informação a partir dele.

---

## 3-MODELO-DE-DADOS.md — para a IA não quebrar os dados

**Objetivo:** ser a referência única do formato dos dados, ligando o `DADOS` v6 (memória/arquivo) ao formato na nuvem — para ler e salvar nunca saírem de sincronia.

**Seções obrigatórias:**
- *O objeto `DADOS` v6:* as 8 listas obrigatórias (`fichas`, `salas`, `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`) e o que cada uma guarda.
- *Anatomia de uma ficha:* campos (`id`, `titulo`, `sala`, `personagens[]`, `grupos[]`, `conexoes[]`, `notas`, `paginas[]` com imagem/original/tradução/explica), com exemplo de uma ficha em JSON.
- *Regra de ouro (invariante):* ler e salvar usam o **mesmo** formato; `serializeDados` (gera o texto) e a leitura inicial precisam casar. Migrações de esquema são versionadas (`SCHEMA_VERSION`).
- *Como vira nuvem:* a tabela `catalogo_usuario` (`user_id` uuid PK/FK → `auth.users`, `dados` jsonb, `atualizado_em` timestamptz). Um registro = o `DADOS` inteiro de um usuário.
- *Imagens:* deixam de ser caminho `imagens/...` local e passam a ser **URL** do Storage (`imagens/{user_id}/arquivo`); o campo `imagem` da ficha guarda a URL; imagens que já são URL da web continuam como estão.
- *Limites práticos:* tamanho do `DADOS` num registro Postgres (vários MB ok); por que **não** usar Firestore (limite ~1 MB/documento).
- *Mapa de migração:* de onde para onde cada coisa vai (arquivo local → linha jsonb; `imagens/` local → bucket).

**Artefatos concretos:** **SQL** de criação da tabela `catalogo_usuario` (com PK, FK para `auth.users`, default de `atualizado_em`); exemplo de 1 ficha em JSON; tabela "campo → tipo → exemplo".

**Profundidade:** alta e precisa (é a fonte da verdade do formato). Reaproveitar/estender o que o `COMO_PROCESSAR.md` já descreve das fichas, sem contradizer.

**Bom quando:** a IA consegue criar a tabela e o código de ler/salvar sem adivinhar nenhum nome de campo.

---

## 4-ARQUITETURA.md — como as peças se encaixam

**Objetivo:** mostrar o desenho do sistema (hoje x alvo), o fluxo do dado e o **porquê** de cada escolha — para a IA construir na direção certa.

**Seções obrigatórias:**
- *Hoje:* site estático + `DADOS` em arquivo local (File System Access API, Chrome/Edge).
- *Alvo:* site estático (mesmo app) + Supabase (Auth, Postgres, Storage, RLS) + Cloudflare Pages. Incluir o **diagrama** (caixinhas: navegador ↔ app ↔ Supabase).
- *Fluxo do dado:* login → busca a linha do usuário → carrega `dados` para o `DADOS` em memória → renderiza → a cada alteração, `salvarNaNuvem()` com **autosave/debounce (~1–2 s)** → `upsert` → atualiza `atualizado_em`. Primeiro acesso cria linha com `DADOS` vazio padrão.
- *O que muda x o que continua igual* (lista clara): muda só "de onde carrega / para onde salva", a tela de login e o destino das imagens; **continua igual** o formato `DADOS` e toda a UI/lógica do painel.
- *Decisões e trade-offs ("por quê"):* Supabase vs Firebase (Postgres aguenta `DADOS` grande; RLS dá isolamento); blob jsonb vs tabelas normalizadas (menor risco, miolo do app intacto); Cloudflare Pages (banda ilimitada). Riscos conhecidos e mitigação (pausa de 7 dias; compressão de imagem).
- *Estratégia de migração com segurança:* tudo numa **branch `online`** do git; versão local intacta na branch principal.

**Artefatos concretos:** diagrama em ASCII/Mermaid; tabela "muda / continua igual"; tabela de decisões (escolha → alternativa → por que).

**Profundidade:** alta no conceito, sem virar tutorial de cliques (isso é o DEPLOY).

**Bom quando:** a IA entende o sistema inteiro e por que ele é assim antes de escrever a primeira linha.

---

## 5-DEPLOY.md — pôr no ar e manter (manual de operação)

**Objetivo:** receita reproduzível, do zero ao ar, com cliques e comandos concretos — e como manter depois.

**Seções obrigatórias:**
- *Pré-requisitos:* conta GitHub, conta Supabase, Node (para checagens), o projeto já organizado.
- *Criar o projeto Supabase:* região (São Paulo se houver), senha do banco (guardar), onde achar **URL** e **chave `anon`** (Project Settings → API). Avisar da `service_role` (não usar no front).
- *Criar banco + RLS:* o **SQL completo** (tabela `catalogo_usuario` + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + as 4 policies por operação + índice). Copiar/colar no SQL Editor.
- *Auth:* habilitar e-mail/senha + **confirmação de e-mail**; configurar **Google** (criar credenciais OAuth no Google Cloud, redirect URL do Supabase) — passo a passo.
- *Storage:* criar bucket `imagens` (privado), políticas por pasta de usuário (SQL).
- *Ligar o app:* incluir supabase-js v2 (CDN), preencher URL + `anon`; onde isso fica no código.
- *Publicar:* subir ao GitHub (repo privado), conectar ao **Cloudflare Pages** (build settings para site estático — sem build, "root" do app), URL pública; atualização automática a cada push.
- *Operação contínua:* **como reativar** se o Supabase pausar (7 dias); como acompanhar uso/limites; como atualizar o site.
- *Checklist de "ir ao ar"* (do guia): cadastro/login ok, salva/sincroniza, isolamento entre 2 contas, exportar/apagar conta, política publicada.

**Artefatos concretos:** **todos os blocos de SQL prontos**; comandos git; valores de configuração do Cloudflare Pages; lista de cliques do Google OAuth. Marcar com ⛔ os pontos que exigem o Felipe (criar contas).

**Profundidade:** muito alta e concreta — é o documento que "faz acontecer". Cada passo verificável.

**Bom quando:** seguindo só o DEPLOY, dá para sair de zero e chegar no site publicado e funcionando.

---

## 6-SEGURANCA.md — o que proteger

**Objetivo:** evitar os erros que vazam dados ou chaves. Curto, direto, inegociável.

**Seções obrigatórias:**
- *As duas chaves:* `anon` (pública, **pode** ir no app/front) x `service_role` (secreta, **nunca** no front nem no git; ignora o RLS). Onde guardar segredos (variáveis de ambiente / fora do git) e `.gitignore`.
- *RLS é o que protege:* sem RLS bem-feito, a chave pública leria tudo. Por isso o **teste de isolamento com 2 contas** é obrigatório **antes** de publicar (passo a passo do teste).
- *Senhas:* quem cuida é o Supabase Auth (você não guarda senha). Ligar confirmação de e-mail.
- *Higiene de repositório:* varredura de segredos antes de cada `git push`; nunca commitar chaves/senha do banco.
- *Checklist de segurança* (marcar antes de publicar).

**Artefatos concretos:** checklist; exemplo de `.gitignore` para segredos; roteiro do teste de isolamento (passos A/B).

**Profundidade:** média; tom de "regra de ouro". Coerente com o DEPLOY (mesmas chaves, mesmo RLS).

**Bom quando:** a IA não comete nenhum dos erros clássicos (chave secreta no front, RLS faltando, segredo no git).

---

## 7-PRIVACIDADE.md — dados dos usuários (LGPD)

**Objetivo:** cobrir o mínimo responsável para guardar dados de outras pessoas no Brasil, e o aviso de "fan-made". (Não é aconselhamento jurídico — registrar isso.)

**Seções obrigatórias:**
- *Que dados coleta e para quê:* e-mail (login) + o catálogo que a pessoa cria. Coletar o mínimo.
- *Onde ficam:* Supabase (citar). Quem tem acesso (só o próprio usuário, via RLS).
- *Direitos do titular:* exportar os próprios dados; **apagar conta e dados** (e o que isso remove: linha do banco, imagens do Storage, conta no Auth).
- *Consentimento:* aviso curto no cadastro + link para a política; confirmação de e-mail.
- *Contato:* um e-mail para dúvidas de privacidade.
- *Aviso fan-made / direitos do jogo:* projeto **não oficial, feito por fã, sem afiliação**; não embutir arquivos do jogo; cada usuário envia as próprias imagens; evitar depender de imagens da wiki por link no produto público.
- *Modelo de Política de Privacidade* pronto para publicar (texto-base preenchível).

**Artefatos concretos:** **modelo de Política de Privacidade** (texto pronto, com lacunas tipo [seu e-mail]); checklist LGPD; texto curto do consentimento no cadastro; texto do aviso fan-made.

**Profundidade:** média; linguagem clara. Deixar explícito "não é aconselhamento jurídico".

**Bom quando:** dá para publicar a política e o aviso copiando do documento, e os direitos de exportar/apagar estão refletidos no que o app precisa ter.

---

## Critérios de qualidade que valem para TODOS

- **Acionável:** cada doc dá à IA o que ela precisa para fazer, não só entender (SQL/código/cliques onde couber).
- **Coerente:** mesmos nomes (tabela/colunas/bucket/funções/branch) em todos; nenhum doc contradiz outro.
- **Honesto sobre o que muda:** sempre reforçar o invariante "ler = salvar" e "não quebrar o `DADOS` v6".
- **Reconferir fatos:** mandar a IA revalidar limites/APIs no momento de executar (mudam).
- **Simples para o Felipe:** explicar termos; marcar com ⛔ o que exige decisão/ação dele (criar contas, e-mail de contato, OAuth do Google).

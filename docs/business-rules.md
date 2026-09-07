# Regras de negócio — Blue Prince online

> **O que é este documento.** A lista única e rastreável das **regras que o sistema
> obedece** — o que sempre tem de valer, independentemente de tela ou implementação.
> Serve para você (e futuros devs) mexerem no código **sem quebrar uma regra sem querer**.
>
> **Precedência.** Em caso de conflito: **`spec.md` → este documento → demais docs**.
>
> **Fonte.** Derivado do código em `app/online.js`, `app/app.js`, `app/salas-base.js` e
> dos docs `spec.md`, `data-model.md`, `content-guide.md`. Reconferir ao evoluir o sistema.

---

## Como ler

- Cada regra tem um **ID** (`RN-XX-n`), um enunciado **testável**, o **porquê** e
  **onde é garantida** (arquivo/camada). IDs são estáveis: não renumere; ao aposentar
  uma regra, marque como *revogada* em vez de apagar.
- **"Garantida no banco"** significa que a proteção existe no Postgres/RLS, não só na
  tela — o front pode falhar/ser burlado e a regra ainda vale.

### Vocabulário

- Tabela do usuário: **`catalogo_usuario`** — `user_id` (uuid), `dados` (jsonb), `atualizado_em`.
- Tabela compartilhada: **`diretorio_salas`** — dados do **jogo** (iguais para todos).
- Bucket de imagens: **`imagens`** (privado), pasta `{user_id}/...`.
- Objeto em memória: **`DADOS`** (esquema **v6**, 8 listas obrigatórias).
- Autosave: **`salvarNaNuvem()`** / `agendarSalvar()` em `app/online.js`.
- Prefixo de imagem na nuvem: **`nuvem:{user_id}/arquivo.jpg`**.

---

## RN-C — Conta e acesso

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-C-1 | **Login obrigatório.** Sem sessão autenticada, o app mostra **só** a tela de login/cadastro; o painel fica escondido. Sem catálogo de demonstração público. | `online.js` (`mostrarLogin`/`entrarNoApp`); `spec.md` R2 |
| RN-C-2 | **Cadastro por e-mail + senha** com **confirmação de e-mail obrigatória**. Entrar antes de confirmar retorna "Confirme o seu e-mail". | `online.js` (`signUp`, `traduzErro`); `spec.md` U2/R3 |
| RN-C-3 | **Login com Google** (OAuth, 1 clique) como alternativa ao e-mail/senha. | `online.js` (`entrarComGoogle`); `spec.md` U4 |
| RN-C-4 | **Senha mínima de 6 caracteres**, validada no cadastro e na troca; as duas senhas têm de conferir. | `online.js` (`aoEnviar`) |
| RN-C-5 | **Recuperação de senha** por e-mail, com mensagem **neutra** ("se existir uma conta com esse e-mail…") — nunca confirma se o e-mail existe. | `online.js` (`reset`) |
| RN-C-6 | **Troca de senha** só dentro de sessão `PASSWORD_RECOVERY`; ao salvar, o usuário é **deslogado**. | `online.js` (`onAuthStateChange`, `nova-senha`) |
| RN-C-7 | **Sessão persistente** com refresh automático; login/logout numa aba reflete nas outras. | `online.js` (`createClient`, `onAuthStateChange`) |
| RN-C-8 | **Logout limpa a tela.** O `DADOS` em memória é zerado para não deixar o catálogo de quem saiu visível. | `online.js` (`sair`) |
| RN-C-9 | **Degradação visível.** Se o SDK da nuvem não carregar, mostra aviso e botão "Recarregar" — nunca um login mudo. | `online.js` (guarda inicial) |

## RN-P — Propriedade e isolamento dos dados

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-P-1 | **Cada usuário só vê e altera o próprio catálogo** — garantido **no banco** por RLS (`(select auth.uid()) = user_id`). | RLS em `catalogo_usuario` (SQL no `deploy.md`); `spec.md` R1 |
| RN-P-2 | **Isolamento também nas imagens.** Bucket `imagens` **privado**; cada arquivo em `{user_id}/...`; exibição por **URL assinada temporária**. | RLS em `storage.objects`; `online.js` (`resolverImg`) |
| RN-P-3 | **1 registro por usuário.** O catálogo inteiro é uma linha `jsonb` em `catalogo_usuario` (PK `user_id`, FK `auth.users`). | `data-model.md`; `online.js` (`upsert`) |
| RN-P-4 | **Teste de isolamento é pré-requisito para publicar** (2 contas, dados e imagens). | `spec.md` aceite #9; `security.md` |
| RN-P-5 | **Sem papéis/admin.** Todos os usuários são iguais. | `spec.md` (fora de escopo) |

## RN-D — Dados e catálogo (formato)

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-D-1 | **Invariante "ler = salvar".** Ler e gravar o `DADOS` usam o mesmo formato. | `app.js` (`serializeDados`); `data-model.md` |
| RN-D-2 | **8 listas obrigatórias** (`fichas`, `salas`, `personagens`, `colecoes`, `grupos`, `teorias`, `quadros`, `tipos`), sempre arrays. | `online.js` (`esqueletoVazioV6`, `LISTAS`) |
| RN-D-3 | **Modo de recuperação.** Se faltar uma lista obrigatória ao carregar, o app NÃO sobrescreve o catálogo. | `app.js`; `data-model.md` §1 |
| RN-D-4 | **Migração versionada** (`SCHEMA_VERSION`, idempotente); não fixar o número — ler de `app.js`. | `app.js` (`SCHEMA_VERSION`) |
| RN-D-5 | **`id` de ficha único e não vazio**; `sala`/`conexoes` devem referenciar itens existentes. | `data-model.md` §2 |
| RN-D-6 | **Conexões bidirecionais por convenção** (o `id` entra nos dois lados; vira a linha roxa no Mapa). | `content-guide.md` |
| RN-D-7 | **Nuvem é a fonte da verdade;** o `dados.js` local vira, no máximo, arquivo de importação. | `spec.md` R4 |

## RN-S — Salvamento e sincronização

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-S-1 | **Autosave com atraso (~1,5 s)**; edições em rajada colapsam numa gravação condicional (debounce). | `online.js` (`agendarSalvar`, 1500 ms) |
| RN-S-2 | **Não perde o que foi digitado.** Se falhar, reagenda (~5 s) e sinaliza "Falha — tentando de novo". | `online.js` (`salvarNaNuvem`) |
| RN-S-3 | **"Só logado depois de carregar."** Só marca logado após carregar com sucesso, para o autosave nunca gravar vazio por cima do catálogo real. | `online.js` (`entrarNoApp`) |
| RN-S-4 | **Sincronização entre aparelhos** (fonte na nuvem; `atualizado_em` marca a última gravação). | `online.js` (`carregarDaNuvem`); `spec.md` U9 |
| RN-S-5 | **1º acesso cria linha vazia** (esqueleto v6, salas do jogo "não descobertas"). | `online.js` (`carregarDaNuvem`) |
| RN-S-6 | **Estados de salvamento visíveis** ("Salvando…", "Salvo na nuvem", "Falha…"). | `online.js` (`statusNuvem`) |
| RN-S-7 | **Confirmação por edição.** Só mostrar salvo quando todas as edições locais tiverem sido confirmadas; snapshots em trânsito são imutáveis. | `controle-nuvem.js` |
| RN-S-8 | **Conflito não sobrescreve.** Se a versão mudou, pausar a gravação e permitir exportar a cópia local ou recarregar com confirmação. | `online.js` + trigger `catalogo_versao` |
| RN-S-9 | **Sair aguarda salvar.** Se houver falha, manter sessão e rascunho na memória. | `online.js` (`sair`) |

## RN-IMG — Imagens

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-IMG-1 | **Compressão no upload:** JPEG, máx. 1100 px, qualidade 0,82. | `online.js` (`comprimirParaBlob`) |
| RN-IMG-2 | **Caminho, não conteúdo.** O campo `imagem` guarda `nuvem:{user_id}/arquivo.jpg`. | `online.js` (`salvarImagemArquivo`) |
| RN-IMG-3 | **Exibição por URL assinada** (1 h; cache local ~50 min; placeholder enquanto resolve). | `online.js` (`resolverImg`) |
| RN-IMG-4 | **URLs da web e base64 preservados** (web = link; base64 na importação vira arquivo). | `online.js` (`subirImagemImport`) |
| RN-IMG-5 | **Nunca perder a imagem:** se o upload falhar, cai no base64 embutido. | `online.js` (`salvarImagemArquivo`) |

## RN-SALA — Diretório de salas compartilhado (dado do jogo)

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-SALA-1 | **Salas do jogo são dado compartilhado** (`diretorio_salas`, iguais para todos). | `online.js` (`carregarDiretorioSalas`) |
| RN-SALA-2 | **Sobreposição preserva o pessoal:** sobrepõe campos do jogo por **nome**, sem tocar em `descoberta`, `notas`, `fatos`. | `online.js` (`sobreporDiretorioSalas`) |
| RN-SALA-3 | **Cada um descobre no seu ritmo** (salas começam `descoberta:false`). | `online.js` (`esqueletoVazioV6`) |
| RN-SALA-4 | **Degradação graciosa:** se o diretório não carregar, mantém o que o usuário tinha. | `online.js` (`carregarDiretorioSalas`) |

## RN-IE — Importar e exportar

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-IE-1 | **Importar SUBSTITUI o catálogo** (troca o da nuvem pelo do arquivo); exige confirmação explícita. | `online.js` (`importarDados`) |
| RN-IE-2 | **Validação do arquivo:** valida as oito listas, tipos e IDs antes de substituir; sanitiza HTML e restaura imagens na conta de destino. | `online.js` (`migrarImagensDoImport`) |
| RN-IE-3 | **Exportar é backup pessoal portátil** (JSON com catálogo e imagens privadas; URLs externas continuam referências). | `app.js` (`exportarBackup`); `spec.md` U12 |

## RN-LGPD — Conta, privacidade e direitos do titular

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-LGPD-1 | **Coleta mínima:** apenas e-mail + o catálogo criado. | `spec.md`; `privacy.md` |
| RN-LGPD-2 | **Apagar conta remove tudo, para sempre** (catálogo + imagens + login); via Edge Function no servidor. | `online.js` (`apagarConta`) |
| RN-LGPD-3 | **Confirmação forte:** exige digitar **"APAGAR"** (exato) para confirmar. | `online.js` (`apagarConta`) |
| RN-LGPD-4 | **Botão de apagar só quando o servidor existe** (`window.APAGAR_CONTA_ATIVO`). | `online.js` (`ajustarUIConta`) |
| RN-LGPD-5 | **Direitos exportar/apagar sempre disponíveis** ao titular. | `spec.md` U12/U14 |
| RN-LGPD-6 | **Exclusão retomável.** Percorrer todas as páginas e subpastas; conferir erros; apagar Auth por último, com catálogo em cascata. A falha parcial é informada e permite repetir. | `apagar-conta/excluir-dados.mjs` |

## RN-CONT — Regras de conteúdo (catalogação)

> Regras de **como o conteúdo entra** no catálogo (ver `content-guide.md`).

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-CONT-1 | **Sem spoiler (inegociável):** nunca buscar soluções nem "resolver" enigmas; resumo **neutro**. | `content-guide.md` Regra nº 1 |
| RN-CONT-2 | **Ligações automáticas x manuais:** factuais liberadas; de raciocínio só quando o usuário pedir. | `content-guide.md` |
| RN-CONT-3 | **Faltou dado, perguntar** (sala desconhecida, texto ilegível, ambiguidade) — não inventar. | `content-guide.md` Regra nº 2 |
| RN-CONT-4 | **Transcrição fiel + tradução lado a lado** (`original`, `traducao`, `explica`). | `content-guide.md`; `data-model.md` §2 |

## RN-NF — Não-funcionais (regras de operação)

| ID | Regra | Onde é garantida |
|---|---|---|
| RN-NF-1 | **Custo ~zero:** operar dentro dos tiers gratuitos (Supabase + Cloudflare Pages). | `spec.md`; `architecture.md` |
| RN-NF-2 | **Segredo nunca no front/git:** `service_role` só no servidor; no front só a `anon`. | `security.md`; `online.js` |
| RN-NF-3 | **Pausa por inatividade:** Supabase gratuito pausa após 7 dias; religar é manual (~60 s). | `deploy.md`; `architecture.md` |
| RN-NF-4 | **Compatibilidade:** navegadores modernos; **Chrome/Edge** recomendados. | `spec.md` |
| RN-NF-5 | **Fan-made:** projeto não oficial; não embutir arquivos do jogo. | `README.md`; `privacy.md` |

---

## Fora de escopo (regras que NÃO valem nesta versão)

- **Compartilhar/publicar catálogos** entre usuários (todo catálogo é privado).
- **Offline/PWA** e **app nativo** de celular.
- **Colaboração em tempo real.**
- **Domínio próprio.**
- **Papéis/Admin** (ver RN-P-5).

---

## Matriz de rastreabilidade (regra → verificação)

| Grupo | Critério de aceite (`spec.md`) | Implementação principal |
|---|---|---|
| RN-C (conta/acesso) | #1 cadastro+confirmação, #2 Google, #3 esqueci-senha | `app/online.js` (auth) |
| RN-P (isolamento) | **#9 isolamento**, #7 imagens na nuvem | RLS + `app/online.js` |
| RN-D (formato) | #4 catalogar, #8 importar | `app/app.js`, `data-model.md` |
| RN-S (salvar/sync) | #5 autosave+persistência, #6 sincronizar | `app/online.js` |
| RN-IMG (imagens) | #7 imagens na nuvem | `app/online.js` (Storage) |
| RN-SALA (diretório) | #6 sincronizar (dado do jogo) | `app/online.js` + `diretorio_salas` |
| RN-IE (import/export) | #8 importar, #10 exportar | `app/online.js`, `app/app.js` |
| RN-LGPD (direitos) | #10 exportar, #11 apagar conta | `app/online.js` + Edge Function |

---

> **Manutenção deste documento.** Ao adicionar/alterar uma regra: (1) crie/edite o ID
> aqui, (2) aponte onde é garantida, (3) se for regra "de banco", confirme que o
> RLS/SQL correspondente existe, (4) reflita no critério de aceite do `spec.md`.
> Regras aposentadas ficam marcadas como *revogada* — não se apaga um ID.

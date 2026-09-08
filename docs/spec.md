# Especificação (SPEC) — Blue Prince online

> **O documento mais importante.** Descreve **o que** o app faz, sem ambiguidade. É o "contrato" do sistema.
> Se algo aqui conflitar com outro documento, **esta SPEC vence** (e o outro documento deve ser corrigido).

---

## Em 1 frase

Um app web onde **cada pessoa cria uma conta e cataloga o próprio jogo Blue Prince** (pistas, salas, personagens, mapa de conexões), com os dados **salvos na nuvem** e **sincronizados entre aparelhos** — gratuito para começar, e com cada usuário vendo **só os próprios dados**.

## Para quem é

O jogador de Blue Prince que quer: (a) não depender de um arquivo no computador, (b) acessar o catálogo de qualquer aparelho, e (c) que outras pessoas também possam ter o **próprio** catálogo, sem ver o dos outros.

---

## O que o usuário faz (histórias de usuário)

Cada item é curto e **testável**.

| # | Como usuário, eu quero… | Para… |
|---|---|---|
| U1 | Criar uma conta com **e-mail e senha** | ter meu espaço próprio |
| U2 | **Confirmar meu e-mail** por um link | provar que o e-mail é meu |
| U3 | Entrar com **e-mail e senha** | acessar meu catálogo |
| U4 | Entrar com **Google** (1 clique) | não precisar de senha |
| U5 | Recuperar acesso com **"esqueci a senha"** | voltar a entrar se esquecer |
| U6 | **Criar, editar e excluir fichas** (pistas) | catalogar o jogo |
| U7 | Usar salas, personagens, grupos, conexões, mapa e quadros | organizar o material |
| U8 | Ter tudo **salvo na nuvem automaticamente** | não perder nada e não clicar "salvar" |
| U9 | **Sincronizar entre aparelhos** | abrir no celular/outro PC e estar tudo lá |
| U10 | **Enviar imagens** das cartas/salas | ilustrar as fichas |
| U11 | **Importar o meu `dados.js` atual** | trazer o catálogo que já fiz |
| U12 | **Exportar meus dados** (JSON com imagens privadas) | ter backup pessoal |
| U13 | **Sair** (logout) | proteger minha conta em PC compartilhado |
| U14 | **Apagar minha conta e meus dados** | exercer meu direito (LGPD) |

---

## Regras (o que sempre tem de valer)

1. **Cada um só vê o próprio.** Nenhum usuário consegue ler ou alterar o catálogo ou as imagens de outro — garantido **no banco** (RLS), não só na tela.
2. **Login obrigatório.** Sem conta logada, mostra só a tela de login/cadastro. **Não há** catálogo de demonstração público.
3. **E-mail confirmado.** A conta só fica ativa após confirmar o e-mail.
4. **Nuvem é a fonte da verdade.** Online, os dados vivem na nuvem; o `dados.js` local deixa de ser onde se salva (vira, no máximo, um arquivo de importação).
5. **Formato dos dados intacto.** O objeto `DADOS` (esquema **v6**) e toda a lógica do painel continuam iguais — muda só **de onde** carrega e **para onde** salva (ver `data-model.md` e `architecture.md`).
6. **Custo ~zero para começar.** Usar apenas tiers gratuitos (Supabase + Cloudflare Pages).

> As regras de negócio completas e rastreáveis estão em `business-rules.md`.

---

## Requisitos não-funcionais

- **Privacidade/LGPD:** coletar o mínimo (e-mail + catálogo); permitir exportar e apagar; política de privacidade publicada (ver `privacy.md`).
- **Segurança:** isolamento por usuário via RLS; chave secreta nunca no front/git; teste de isolamento com 2 contas antes de publicar (ver `security.md`).
- **Desempenho/UX:** salvar com **autosave atrasado** (~1–2 s) para não gravar a cada tecla; carregar rápido ao logar.
- **Compatibilidade:** funciona em navegadores modernos; recomendado **Chrome/Edge**.
- **Custo:** dentro dos limites gratuitos (banco 500 MB, Storage 1 GB, ~5 GB tráfego/mês, 50 mil usuários/mês). Comprimir imagens no upload.
- **Fan-made:** aviso de projeto não oficial, sem afiliação com a desenvolvedora do jogo (ver `privacy.md`).

---

## Fora de escopo agora (NÃO construir nesta versão)

- **Compartilhar ou publicar catálogos** entre usuários (cada um é privado).
- **Funcionar offline / virar PWA** (app instalável).
- **App nativo de celular** (só o site no navegador, que já abre no celular).
- **Domínio próprio** (começar com o endereço grátis do Cloudflare Pages).
- **Colaboração em tempo real** (duas pessoas no mesmo catálogo).
- **Papéis/Admin** (todos os usuários são iguais).

---

## Critérios de aceite — "Pronto quando"

Roteiro testável. A versão online está pronta quando **todos** passam:

1. **Cadastro + confirmação:** crio conta com e-mail/senha, recebo o e-mail, confirmo e consigo entrar.
2. **Google:** consigo entrar com o Google em 1 clique.
3. **Esqueci a senha:** peço redefinição, recebo o e-mail e troco a senha.
4. **Catalogar:** crio/edito/excluo fichas, salas, personagens, conexões.
5. **Autosave + persistência:** faço uma alteração, aguardo a confirmação, recarrego e a alteração está lá. Edições feitas durante uma gravação também persistem. Sair aguarda salvar; em falha, conserva sessão e rascunho.
6. **Sincronizar:** abro em **outro navegador/aparelho**, faço login e vejo o **mesmo** catálogo, atualizado. Duas abas editando a mesma versão geram um aviso de conflito, sem sobrescrever a primeira gravação.
7. **Imagens na nuvem:** anexo uma foto numa ficha; ela é enviada para a nuvem e aparece ao recarregar em outro aparelho.
8. **Importar:** importo o meu `dados.js` atual e meu catálogo aparece completo.
9. **Isolamento (o mais importante):** crio uma **2ª conta**, catalogo coisas diferentes, e — logado em cada uma — **não vejo** nada da outra (nem dados, nem imagens).
10. **Exportar:** baixo meus dados como arquivo (JSON), incluindo as imagens privadas. Posso restaurar em outra conta sem depender das imagens da conta original; links externos continuam referências.
11. **Apagar conta:** apago a conta; meus dados, imagens e login somem; não consigo mais entrar com aquela conta.
12. **No ar:** o site está publicado num endereço público, abre numa janela anônima e tudo acima funciona lá.

> O critério **9 (isolamento)** é **inegociável** e deve ser testado antes de publicar (ver `deploy.md`/`security.md`).

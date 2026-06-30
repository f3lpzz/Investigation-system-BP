# SEGURANÇA — o que proteger

> Curto, direto e **inegociável**. Evita os erros clássicos que vazam dados ou chaves. Coerente com o `5-DEPLOY.md` (mesmas chaves, mesmo RLS).
> Regra mental: **o que protege os dados é o RLS no banco** — não a tela, não o "esconder" no código.

---

## 1. As duas chaves do Supabase (não confunda)

| Chave | É | Pode ir no app/git? | Para que serve |
|---|---|---|---|
| **`anon`** | Pública (por design) | **Sim** | O app usa para falar com o Supabase. Sozinha, **não** dá acesso aos dados de ninguém — o RLS barra. |
| **`service_role`** | **Secreta** | **NUNCA** | Ignora o RLS e dá **acesso total**. Só em servidor/funções de confiança (ex.: apagar conta). |

- A `anon` no frontend é **esperado e seguro** — desde que o **RLS esteja correto**.
- A `service_role` **nunca** entra no `app.js`, no HTML, no repositório nem em log. Se for preciso (ex.: apagar a conta no Auth), use uma **Edge Function** do Supabase, com a chave guardada nas **variáveis de ambiente** do servidor (nunca no front).
- Senha do **banco** (a do Passo 1 do DEPLOY): guardar fora do git, num gerenciador de senhas.

---

## 2. O RLS é o que realmente protege

- Como a chave `anon` é pública, **qualquer um** poderia tentar ler a tabela. Quem impede é a **Row Level Security**: as políticas (`(select auth.uid()) = user_id`) fazem o **banco** devolver só as linhas do próprio usuário, e o Storage só os arquivos da pasta dele.
- **Sem RLS, ou com RLS mal-feito, a chave pública leria tudo.** Por isso:
  - Confirme que o RLS está **habilitado** na tabela `catalogo_usuario` e no `storage.objects` (políticas do `5-DEPLOY.md`).
  - Lembre que **UPDATE exige também policy de SELECT** (já incluída no DEPLOY).
  - Tabela nova **sem** policy = ninguém acessa (bom default); **com RLS desligado** = todos acessam (perigo). Nunca deixe a tabela com dados e RLS desligado.

---

## 3. Teste de isolamento entre 2 contas (obrigatório antes de publicar)

Este teste prova que o RLS funciona. **Não publique sem ele.**

1. Crie **conta A** e **conta B** (e-mails diferentes), confirme os e-mails.
2. Logado em **A**, catalogue itens e anexe uma imagem.
3. Logado em **B**, catalogue **outros** itens e outra imagem.
4. Verifique, logado em **A**:
   - A lista/`select` só traz os dados de A (nenhuma linha de B).
   - A URL/imagem de B **não** abre para A (Storage barra).
   - Tentar buscar a linha de B pelo id de B **não retorna nada**.
5. Repita logado em **B** (não vê A).
6. **Mostre o resultado ao Felipe** (⛔ PARE) e só então publique.

> Dica: dá para testar "outro aparelho" abrindo a conta B numa **janela anônima** ou outro navegador.

---

## 4. Higiene de repositório (antes de cada `git push`)

- **Varredura de segredos:** procure por termos como `service_role`, `secret`, `apikey`, `api_key`, `password`, `BEGIN PRIVATE KEY`. Se achar algo sensível, **PARE** e remova antes de commitar.
- **`.gitignore`** deve cobrir segredos e arquivos gerados. Exemplo:

```gitignore
# segredos / ambiente
.env
.env.*
*.secret
# dependências e gerados
node_modules/
```

- Se um segredo **já foi** commitado, não basta apagar o arquivo: **rotacione/gere uma nova chave** no Supabase (a antiga deve ser considerada vazada) e limpe o histórico.
- A `anon` e a `URL` **podem** ficar no front; mas, por organização, é comum mantê-las num pequeno arquivo de config separado.

---

## 5. Contas e senhas

- **Você não guarda senha de ninguém** — quem cuida é o **Supabase Auth** (senhas ficam com hash, fora do seu alcance).
- **Ative a confirmação de e-mail** (DEPLOY Passo 4): evita cadastro com e-mail de terceiros.
- Considere proteções padrão do Supabase (limites de tentativa de login já vêm ligados).

---

## 6. Checklist de segurança (marque antes de publicar)

- [ ] `service_role` **não** aparece em nenhum arquivo do projeto nem no histórico do git.
- [ ] Só a **`anon`** e a **URL** estão no frontend.
- [ ] RLS **habilitado** em `catalogo_usuario` e nas imagens, com as políticas por usuário.
- [ ] **Teste de isolamento entre 2 contas passou** e foi mostrado ao Felipe.
- [ ] Confirmação de e-mail **ligada**.
- [ ] `.gitignore` cobre `.env*`/segredos; varredura de segredos feita antes do push.
- [ ] Senha do banco guardada num lugar seguro (fora do git).

> Resumo: **chave secreta nunca no front/git + RLS correto + teste de isolamento.** Esses três evitam praticamente todos os vazamentos comuns.

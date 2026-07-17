---
name: fechar-etapa
description: Fecha uma etapa de trabalho no Blue Prince — roda os dois testes, varre segredos, faz commit pequeno em português, push na branch de feature e abre o Pull Request. Use ao terminar qualquer mudança de código, antes de mostrar resultado ao Felipe. NUNCA faz merge na online (quem clica em Merge no PR é o Felipe).
---

# Fechar etapa: testar → varrer segredos → commitar → push → abrir PR

Ordem obrigatória. Se qualquer passo falhar, PARE, conserte e recomece do 1.

## 1. Testes (ambos verdes, sempre)

```powershell
# PowerShell — recarregar o PATH primeiro (npm não está no Git Bash):
$m=[Environment]::GetEnvironmentVariable("Path","Machine"); $u=[Environment]::GetEnvironmentVariable("Path","User"); $env:Path="$m;$u"
Set-Location "C:\Users\T-GAMER\Desktop\Blue Prince\tools"
node teste-online.mjs        # ~95 checagens; esperar "=== ONLINE OK ==="
npm run checar               # esperar "0 problemas" e "=== CARGA OK ==="
```

- Mudança visual? Rode antes a skill **verificar-visual** — teste verde
  não prova que a tela está certa.

## 2. Varredura de segredos (antes de todo push — regra do projeto)

```bash
cd "/c/Users/T-GAMER/Desktop/Blue Prince" && git add -A app/ && \
git diff --cached -U0 | grep -inE "service_role|eyJ[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9]{20,}" | head -3
```

- Saída vazia = limpo. Achou algo? **PARE** — não commite; avise o Felipe.
  (A chave `anon` é pública e pode; `service_role` JAMAIS.)
- Só versionar o que for do trabalho: `app/`, `docs/`, `tools/`,
  `supabase/`. Não arrastar arquivos soltos da raiz (ex.: `Tarefas.txt`).

## 3. Commit (pequeno, em português, no padrão do repo)

- **Modelo oficial: `.gitmessage` na raiz** (já ativado via
  `git config commit.template`). Siga-o: título imperativo ≤72 chars
  dizendo O QUE mudou p/ quem usa; corpo com o PORQUÊ; linha de testes;
  rodapé `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Mensagem multilinha no Git Bash: `git commit -q -F - <<'EOF' … EOF`.

## 4. Push na branch de feature (nunca na online)

```bash
git push -u origin <branch-atual>
```

- Branch de trabalho: `feature/<nome-curto>` com **≤ ~20 letras** (o alias
  de preview do Cloudflare limita 28 caracteres — `feature-<nome>` inteiro).
- Preview: `https://<branch-com-hifens>.investigation-system-bp.pages.dev`
  (ex.: `feature/design` → `feature-design.…`).

## 5. Abrir o Pull Request (o botão de produção é do Felipe)

Crie o PR pelo **GitHub CLI** (`gh`, já autenticado como f3lpzz) — no
PowerShell com PATH recarregado, ou Git Bash com o caminho completo
(`"/c/Program Files/GitHub CLI/gh.exe"`):

```bash
gh pr create --base online --title "Título curto em português" --body-file corpo.md
```

- **Corpo: siga o modelo oficial `.github/PULL_REQUEST_TEMPLATE.md`**
  (o site do GitHub o preenche sozinho; via gh/conector, copie a
  estrutura dele e preencha — inclusive marcando o checklist com a
  verdade: só marque o que foi realmente feito). Escreva o corpo num
  arquivo temporário (scratchpad) e passe com `--body-file`.
- Termine o corpo com:
  `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- **Plano B (gh indisponível/desautenticado):** conector do GitHub no
  Claude — ferramenta `create_pull_request`, `owner: f3lpzz`,
  `repo: Investigation-system-BP`, `base: online`.

- **Plano C (nem gh nem conector):** mande o Felipe abrir
  `https://github.com/f3lpzz/Investigation-system-BP/pull/new/<branch>`
  e cole a descrição pronta para ele.
- ⛔ **A IA NÃO mergeia.** Quem clica em **Merge** no PR é o Felipe,
  depois de conferir o preview. Merge na `online` = produção.
- **Empurrou commit novo numa branch com PR aberto? Atualize a
  DESCRIÇÃO do PR junto** (`gh pr edit <nº> --body-file corpo.md`) —
  a descrição deve refletir o conteúdo total; ninguém aprova o que
  não leu.
- Depois do merge dele: a branch remota o GitHub apaga sozinho
  (`delete_branch_on_merge` ativo). A cópia LOCAL é limpa no início da
  tarefa seguinte (regra 5 do CLAUDE.md): `git checkout online && git
  pull && git fetch --prune && git branch -d <mescladas>`.

## 6. Relatar

- Dizer o que mudou em português simples, com o link do **PR** e o do
  preview, e o resultado real dos testes. Se algo ficou de fora ou
  falhou, dizer claramente — nunca arredondar para "tudo pronto".

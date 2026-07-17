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

- 1 etapa = 1 commit. Título curto dizendo O QUE mudou para o usuário;
  corpo em lista dizendo o PORQUÊ quando não for óbvio.
- Rodapé sempre:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Termine o corpo com a linha de testes, ex.:
  `Testes: teste-online (95 checagens) e checar — verdes.`
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

Crie o PR pelo **conector do GitHub** (ferramenta `create_pull_request`):
`owner: f3lpzz` · `repo: Investigation-system-BP` · `base: online` ·
`head: <branch>` · título curto em português · corpo com este esqueleto:

```
## O que muda
(2–5 linhas em português simples, sem jargão)

## Por quê
(1–2 linhas)

## Como conferir
Preview: https://<branch>.investigation-system-bp.pages.dev
(o Cloudflare também comenta o link aqui no PR)
- passo a passo do que clicar/olhar

Testes: teste-online (~95 checagens) e checar — verdes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

- **Sem o conector?** Plano B: GitHub CLI (instalado; requer `gh auth login`
  feito 1x pelo Felipe) — no PowerShell com PATH recarregado:
  `gh pr create --base online --title "..." --body-file corpo.md`.
  Plano C: mande o Felipe abrir
  `https://github.com/f3lpzz/Investigation-system-BP/pull/new/<branch>`
  e cole a descrição pronta para ele.
- ⛔ **A IA NÃO mergeia.** Quem clica em **Merge** no PR é o Felipe,
  depois de conferir o preview. Merge na `online` = produção.
- Depois do merge dele: apagar a branch de feature (local e remota).

## 6. Relatar

- Dizer o que mudou em português simples, com o link do **PR** e o do
  preview, e o resultado real dos testes. Se algo ficou de fora ou
  falhou, dizer claramente — nunca arredondar para "tudo pronto".

# Instruções para agentes neste repositório

Leia `CLAUDE.md` e as skills locais `.claude/skills/verificar-visual/SKILL.md`
e `.claude/skills/fechar-etapa/SKILL.md` antes de alterar arquivos. Os caminhos
antigos nesses documentos devem ser interpretados a partir da raiz atual deste
repositório.

Toda alteração deve chegar ao GitHub no mesmo trabalho. Não considere uma
mudança concluída apenas porque os arquivos locais foram editados ou testados:

1. Sincronize `online` com `origin/online` e crie uma branch curta `feature/...`.
2. Faça as checagens do projeto. Para alterações visuais, capture e confira a
   interface real em desktop e celular.
3. Verifique o diff, inclusive segredos, e faça um commit pequeno em português.
4. Envie a branch ao GitHub e abra ou atualize um Pull Request para `online`,
   usando `.github/PULL_REQUEST_TEMPLATE.md`. Inclua o link do preview e diga
   quais testes realmente passaram.
5. Confirme que o commit local e o remoto coincidem e informe o link do PR.

Não faça merge em `online`: o proprietário confere o preview e faz o merge.
Se o acesso ao GitHub impedir push ou PR, relate o bloqueio com clareza; não
apresente a alteração local como publicada.

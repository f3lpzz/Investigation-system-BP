# Revisão de confiabilidade

## Escopo

| Problema | Implementação | Verificação |
|---|---|---|
| Logout perdia a edição no debounce | Aguarda flush; falha mantém sessão e memória | `teste-online.mjs` |
| Salvo aparecia com edição pendente | Snapshot imutável e contador de edições confirmadas | `teste-confiabilidade.mjs` |
| HTML executável em dados importados | Validação antes da substituição; reconstrução de HTML permitido; atributos escapados | `teste-confiabilidade.mjs` |
| IA deslocava páginas ao pular imagens | Pedido bloqueado se alguma página faltar; resposta precisa cobrir todas as páginas | `teste-online.mjs` |
| Testes dependiam do catálogo pessoal; lint ignorava app | Fixture fictícia versionada e lint na ordem do HTML | `checar-online`, `lint` |
| Backup dependia da conta original | Envelope JSON com bytes das imagens privadas; restauração remapeia caminhos | `teste-confiabilidade.mjs` |
| Exclusão parava em 1.000 imagens/ignorava erros | Paginação, subpastas e Auth por último; erros permitem retry | `teste-confiabilidade.mjs` |
| Arquivo principal muito grande | Mapa, quadros, arquivo e inicialização separados | Carga arquivo por arquivo e testes dos quadros |
| Aba antiga sobrescrevia outro aparelho | Update atômico comparando `atualizado_em`; conflito pausa fila | `teste-confiabilidade.mjs`, `teste-banco.mjs` |
| Banco configurado somente por cliques/SQL solto | Migrações idempotentes das tabelas, RLS, buckets e trigger | `teste-banco.mjs` executa migrações e seeds |

## Como conferir

Na pasta `tools`, execute `npm ci`, `npm run checar-online` e `npm run lint`.

No app, use duas abas da **mesma conta de teste**:

1. Abra as duas antes de editar. Edite e aguarde salvar na primeira.
2. Edite na segunda. Deve aparecer o aviso de conflito, sem substituir a primeira edição.
3. Exporte a cópia local. Só depois escolha carregar a nuvem e confirme o descarte local.
4. Edite e saia imediatamente. Ao entrar novamente, a edição deve existir.
5. Simule falta de rede, edite e tente sair. O app deve conservar sessão e alteração.
6. Exporte um catálogo com uma imagem privada. Importe o JSON em outra conta de teste: a imagem deve pertencer à pasta dessa segunda conta.

As capturas do Chrome ficam no artefato `capturas-painel` do workflow. Compare desktop e celular com o tema existente. O teste visual gera evidências; ele não substitui a inspeção humana dos PNGs.

## Publicação pelo proprietário

**Não fazer merge nem executar a exclusão em contas reais para testar.** O fluxo abaixo é do proprietário, após revisar o PR.

1. Faça um backup do banco e teste primeiro em um projeto Supabase de desenvolvimento. O PR não acessa nem muda o Supabase de produção.
2. Aplique, em ordem, `supabase/migrations/202609050001_base.sql` e `202609050002_concorrencia.sql`. Em uma instalação gerenciada pela CLI, use o fluxo normal de migrations; em uma instalação manual, execute os arquivos no SQL Editor. Não envie segredos para o Git.
3. Revise as políticas existentes no painel: as migrações substituem as políticas conhecidas pelos mesmos nomes, mas não removem políticas extras que o proprietário possa ter criado. Uma política permissiva adicional precisa ser revisada.
4. Publique `apagar-conta`, incluindo o novo módulo `excluir-dados.mjs`. Não há nova chave no frontend nem nova tabela de dados pessoais.
5. Faça o teste de isolamento com duas contas no Supabase real: catálogo e imagens, por UI e API. O teste Postgres local não atesta a configuração que já está instalada em produção.
6. Confira o preview. Depois faça o merge do PR em `online`, que publica o frontend no Cloudflare. Feche/recarregue abas com a versão antiga: clientes anteriores não fazem a comparação de versão.

## Limites deliberados

- Não há mesclagem automática, colaboração em tempo real ou PWA. Conflitos preservam a cópia local e pedem uma escolha explícita.
- Rascunhos ficam na memória enquanto esta aba estiver aberta. Encerrar o navegador à força antes de salvar ainda pode perdê-los.
- O backup inclui imagens privadas e preserva imagens já embutidas. URLs externas continuam links e dependem do site de origem.
- Backups antigos que só contêm o caminho privado podem ser usados na própria conta; para transferir imagens a outra conta, exporte o formato completo pela conta original.
- Uma exclusão que falhar após remover algumas imagens pode ter progresso parcial. O catálogo e o Auth são mantidos até a última etapa, e a operação pode ser repetida; não há promessa de rollback dos arquivos removidos.
- Os arquivos continuam sendo scripts clássicos com escopo compartilhado. A separação é gradual e conserva os handlers existentes.

## Estado desta entrega — 7 de setembro de 2026

- A branch `feature/confiabilidade` foi publicada e o PR #24 está aberto como rascunho para `online`.
- A atualização incorpora o PR #23, já integrado em `online`: imagens das salas usam a URL original, sem o endpoint de transformação pago e sem pré-carregar todas as artes. A implementação agora fica em `app/arquivo.js`, preservando a divisão em módulos.
- Os testes e a geração de capturas passaram no GitHub na primeira publicação. Cada atualização dispara uma nova execução; consulte os checks do PR para o resultado atual.
- Os PNGs estão no artefato `capturas-painel`. A inspeção visual continua pendente; gerar screenshots não equivale a aprovar o visual.
- Não houve execução das migrações nem publicação de funções no Supabase real. Siga o procedimento acima antes do merge pelo proprietário.

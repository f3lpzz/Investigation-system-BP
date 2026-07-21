# Notas de implementação — Redesign Magnify

## Mapeamento design → código
- NavRail = `aside.side` reestruturado (212px, #1d1710, item ativo #2b2114 + inset 3px #c9a35c)
- Cabeçalho de área = `.topbar` reaproveitada (título por visão, stats só em Fichas)
- ClueCard = `.card` do renderGrade reescrito (papel #ece1c9, texto #2b2317)
- ClueDetail = `#drawer` (520px desktop, página cheia mobile)
- Arquivo = novo `#arquivo` (abas salas/pessoas/grupos, dossiê 330px `#arqdossie`)
- Conta = novo `#conta`; usa funções do online.js (exportarBackup, importarDados,
  sairComConfirmacao, apagarConta, salvarTudo, statusNuvem)
- MobileTabBar/FAB = novos elementos fixos, só ≤720px

## Decisões
- Visões legadas (mundo, diretorio, modal Gerenciar) ficam no DOM, fora da navegação:
  os testes de tools/ as chamam direto (setView("mundo"), g-salas…). A lógica de dados é
  compartilhada, então não há duplicação de regra de negócio — só de apresentação.
  Pendência futura: migrar testes para o Arquivo e remover o legado.
- Cores de nó do mapa mudam nas constantes JS (COR_SALA→#6fa8c0, COR_PESSOA→#cf7f70,
  COR_MANUAL→#b8452e) — lição paga: cor vive no JS, não só no CSS.
- `estilos.css` é CRLF — edições em bloco via script node com normalização, ou Write completo.
- Molduras 390×820 do mockup são apresentação; não construir bezel.
- Tokens noir entram em `:root` reusando os MESMOS nomes de variável (--canvas, --s1…)
  para a cascata re-tematizar tudo; tokens novos ganham nomes --papel, --tinta etc.

## Validações executadas (17/07/2026)
- `npm run checar` (tools) — verde (dados íntegros, todas as visões renderizam, zero erros)
- `node teste-online.mjs` — verde (~95 checagens; 1 asserção de texto da legenda
  atualizada para o novo copy do design: "Ficha (cor do grupo)" / "Fio manual")
- Screenshots reais (Chrome headless, servidor-visual) comparados com os mockups:
  desktop 1240×820 → grade, detalhe, mapa, quadros (cortiça + vazio),
  arquivo salas/pessoas/grupos, dossiê de sala, conta, login;
  mobile 500×900 → grade (lista compacta + FAB + tabbar), detalhe (página cheia
  + barra Editar/Ver no mapa), arquivo, conta, quadros, login
- Vazamento de largura: `?seed=grade-diag` em 500/780/1000/1240 → SCROLLW == VW
  em todas (o ASIDE além da tela é a gaveta fechada, off-canvas por design)
- Varredura de azuis herdados: remap em massa (#0e1a33→#1d1710 etc.) em
  estilos.css e app.js; grep final zerado

## Divergências conscientes vs mockup
- Painel "Camadas" do mapa mantém os 4 toggles funcionais existentes; o item
  "Fios manuais" liga/desliga a camada (o mockup dizia "Só conexões manuais",
  semântica diferente da função existente — preservada a função)
- Mobile Fichas: sem a linha de chips "Todas / Pendentes / Incompletas" do
  mockup (os mesmos filtros existem na folha de Filtros); ← do detalhe é o ✕
- "Etiquetar" em lote (barra de seleção do mockup) não existe no app — não
  inventado; seleção tem Adicionar ao quadro/Excluir/IA
- Skeleton de carregamento não tem momento visível (a tela "Carregando…"
  cobre a carga); CSS pronto se um dia precisar
- Barra de seleção usa as ações reais (Selecionar visíveis etc.)

## Pendências futuras
- Migrar teste-online.mjs para exercitar o Arquivo/Conta novos e então remover
  as visões legadas (#mundo, #diretorio, modal Gerenciar) do DOM
- Tablet fora do escopo (decisão do handoff §10)

# Plano de implementação — Redesign Magnify (handoff Claude Design)

Fonte visual de verdade: projeto Claude Design `f5143d3b` → «Novo Design - Arquivo do Detetive»
(cópia local para consulta: scratchpad `novo-design-pretty.html`). Spec: «Handoff - Spec de Design».

Regras do repo respeitadas: esquema DADOS v6 intocado · salas somente-leitura ·
segredos fora do git · PR para `online` (merge é do Felipe) · verificar-visual antes de "pronto".

Decisão estrutural: as visões legadas (`#mundo`, `#diretorio`, modal Gerenciar) **permanecem
no DOM e funcionais** (fora da navegação) porque `tools/teste-online.mjs` e `teste-carga.mjs`
as exercitam diretamente; as novas áreas Arquivo e Conta reutilizam a mesma lógica de dados
(renomearEnt, mesclarPessoas, descobrirSala…). Migração dos testes = tarefa futura.

## Tarefas

- [x] T01 — Ler handoff + design alvo completos (19 telas) e auditar repo/testes (baseline verde)
- [x] T02 — Faxina git + branch `feature/magnify` + assets (magnify-logo.png / -ink.png em app/imagens)
- [x] T03 — Tokens noir em `:root` de estilos.css (cores/fontes/raios/sombras do §4 do handoff) + fonte Special Elite/Newsreader itálico no painel.html — cascata re-tematiza o grosso
- [x] T04 — Shell desktop: NavRail 212px (marca SVG lupa + logo, 4 itens com ícones SVG, status "Tudo salvo na nuvem", Conta com avatar) + cabeçalho de área (título serif + stats-filtros + busca + Filtros + ··· + ＋ Nova ficha) — painel.html + CSS + setView
- [x] T05 — setView: novas visões `arquivo` e `conta`; aliases mundo/diretorio continuam funcionando; ··· menu com Idioma/Selecionar/Ordenar/Desfazer/Refazer
- [x] T06 — Fichas/Lista: ClueCard papel kraft (#ece1c9, alfinete, P-00x vermelho, sala mono uppercase, ★, título serif, foto, resumo 2 linhas, rodapé grupo·pessoa, carimbos PENDENTE/RESOLVIDA, "falta tradução", "sem conexões ainda") + estados vazio/busca + skeleton
- [x] T07 — Fichas/Detalhe: gaveta 520px reestruturada (cabeçalho P-001 + ações, cartão papel com foto+TRANSCRIÇÃO+PT/EN+O QUE EXPLICA, ETIQUETAS, FIOS DA INVESTIGAÇÃO manual/auto, NOTAS DO DETETIVE post-it)
- [x] T08 — Nova ficha/Editar: restyle do formulário (labels mono uppercase, validação título, rodapé Cancelar/Salvar)
- [x] T09 — Mapa: cores de nó (sala #6fa8c0 · pessoa #cf7f70 · ficha cor do grupo · foco anel dourado), fio manual #b8452e sólido / auto tracejado #6f6046, fundo radial noir, painel Camadas, legenda de papel, minimapa re-colorido (SVG em JS!)
- [x] T10 — Quadros: fundo cortiça (radial #6b4f33→#573e27 + hachura), barra de abas + ferramentas + "＋ Ficha do arquivo", notas papel/post-it/Special Elite, barbante vermelho 2.5px com rótulo
- [x] T11 — Arquivo (nova área): abas Salas/Personagens/Grupos; Salas = DirectoryMenu (papel de arquivo) + RoomTile/locked + dossiê 330px; Personagens = cartões borda #cf7f70 + dossiê com renomear/mesclar; Grupos = cartões cor + swatches + dossiê
- [x] T12 — Conta (nova área): avatar/e-mail/Sair, status salvamento + Salvar agora, Exportar/Restaurar, Idioma PT/EN, Apagar conta (zona vermelha)
- [x] T13 — Login: cartão de papel (fita adesiva, carimbo CONFIDENCIAL, logo tinta, E-MAIL/SENHA mono, "Abrir o arquivo", erro em faixa rosa)
- [x] T14 — Mobile ≤720px: MobileTabBar 4 abas, FAB ＋, cabeçalho compacto, lista ClueCardCompact, filtros em folha inferior, detalhe página cheia com ← e barra de ações, alvos ≥44px
- [x] T15 — Estados e feedback: confirmações (excluir ficha/quadro, apagar conta dupla), toasts com Desfazer, banners de erro/offline
- [x] T16 — Varredura de emojis/azuis remanescentes (grep em JS + CSS; lição: cores vivem em JS)
- [x] T17 — Testes verdes (npm run checar + teste-online.mjs) — ajustar chamadas quebradas sem afrouxar
- [x] T18 — verificar-visual: screenshots desktop 1240 + mobile 390 de todas as áreas vs mockups; corrigir divergências; medir vazamento de largura
- [x] T19 — fechar-etapa: varredura de segredos, commits pt-BR, push, PR para `online`

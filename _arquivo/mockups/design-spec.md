# Design Spec — Redesign Blue Prince (extraído do export do Claude Design)
Referência fiel para reimplementar o visual no painel.html, etapa por etapa.

## Fontes (Google Fonts)
- Títulos/cabeçalhos (serifa): **Newsreader** (ex.: 500/600).
- UI/corpo: **IBM Plex Sans** (400/500/600).
- Rótulos/mono/contadores: **IBM Plex Mono**.
Import: `https://fonts.googleapis.com/css2?family=Newsreader:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap`

## Tokens de cor (objeto P do design)
- canvas `#0a1428` · superfícies s1 `#0e1a33` (sidebar/painéis) · s2 `#13213f` (cartões) · s3 `#182a4d` (elevado/hover)
- campos/inputs fundo `#0c1730` · variações de superfície `#0c1d3c` `#0e2044` `#16243f`
- linhas: padrão `#21345c` · ênfase/hover `#2c4a82`
- texto: ink `#eaf0fb` · ink2 `#9fb0d0` · hint `#6b7ea1`
- acento **gold `#d8b15a`** (hover `#e3c074`) — só ação primária, item ativo, foco, destaques
- funcionais: info `#5ea0ff` · ok `#4fbf8b` · warn `#e0a13a` · danger `#e2645f`
- entidades (mapa): sala `#5ec8ff` · personagem `#ff7e9a` · conexão manual `#a98bff`

## Cores de grupo (paleta curada — 8 matizes)
Recortes de jornal `#c9923f` · Cartas Vermelhas `#d9606b` · Plantas do solar `#5b9bd9` ·
Bilhetes `#4fbf8b` · Diário `#a98bff` · Fotografias `#e0934f` · Mapas `#5ec8ff` · Símbolos `#c77dff`
(novos grupos: atribuir desta paleta; cor edita no dossiê/gestão.)

## Forma, sombra, espaçamento, tipo
- Raios: controles **8px** (alguns 7px) · cartões/painéis **10–14px** · modais **16px**.
- Sombras: popover `0 12px 36px rgba(3,8,22,.5)` · drawer/modal `0 24px 70px rgba(3,8,22,.6)`.
- Espaçamento: base 4/6/8/10/12/16/18/20; gaps comuns 6/7/8/10.
- Alturas: controles/botões **34px**, inputs **36px**.
- Font-size: meta/rótulo **11px** (uppercase, letter-spacing .5) · UI **13px** · busca 13.5 · subtítulo 16–18 · título de tela **21–22** · serifa nos títulos.

## Receitas de componente (valores exatos)

### Sidebar (s1, recolhível)
- Coluna fixa à esquerda. Cabeçalho de seção "Visões" (sideHeadStyle: 11px uppercase, hint).
- Item de nav: `display:flex;gap` + ícone de linha 18px (stroke 1.6) + label + contador.
  Hover `background:#16243f`; **ativo**: fundo sutil + texto ink + acento dourado.
- Seções: Visões (Grade c/ contador de fichas, Mapa, Mundo, Diretório, Quadros) · Coleções (Grupos com bolinha de cor, Salas, Personagens) · rodapé (Gerenciar, Backups, status de salvar).
- Ícones (line, 18px, stroke 1.6): Grade=4 quadrados; Mapa=grafo (3 nós+linhas); Mundo=globo; etc.

### Top bar (contextual)
- Busca: caixa com lupa (stroke #6b7ea1), input transparente `color:#eaf0fb;font-size:13.5px`,
  placeholder "Buscar pistas, salas, personagens…  ⌘K", botão limpar (×).
- Ações por view (sc-if). Grade: **Filtros** (ícone funil), **Ordenar** (pílula com select, borda #21345c r8),
  **Selecionar** (ícone), **Nova pista** (primário).
- **Botão primário**: `height:34px;padding:0 15px;background:#d8b15a;border:1px solid #d8b15a;border-radius:8px;color:#0a1428;font-weight:600;font-size:13px` · hover `#e3c074` · active `scale(.98)`.
- **Botão secundário**: `height:34px;padding:0 13px;background:transparent;border:1px solid #21345c;border-radius:8px;color:#9fb0d0;font-size:13px` · hover `border-color:#2c4a82;color:#eaf0fb`.
- **Botão ícone**: igual ao secundário, quadrado ~34px, só ícone + aria-label/title.

### Campo de formulário (padrão)
- `label{display:flex;flex-direction:column;gap:5px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#6b7ea1}`
- `input/textarea{height:36px;padding:0 10px;background:#0c1730;border:1px solid #21345c;border-radius:8px;color:#eaf0fb;font-size:13px;outline:none}` (foco: borda dourada/anel).
- Caixa de aviso/nota: `background:#0c1730;border:1px solid #21345c;border-radius:8px;padding:8px 10px;font-size:12px;color:#9fb0d0` (destaque em `#d8b15a`).

### Cadastro rápido (Ctrl+V)
- Linha de miniaturas 62×62 (r8, borda #2c4a82, fundo hachura `repeating-linear-gradient(45deg,#0c1d3c,#0c1d3c 6px,#0e2044 6px,#0e2044 12px)`), badge de nº dourado no canto.
- Botão "＋ colar" tracejado (dashed #2c4a82; hover #5ea0ff).
- Campos: Sala (datalist), Título, Observação. Nota fixa "cole de novo para somar páginas".

### Cartão de pista (Grade)
- Superfície s2, raio ~12–14, **barra de acento à esquerda na cor do grupo**.
- Conteúdo: meta (🚪 sala, uppercase) · badge id (dourado, mono) · **título em Newsreader** ·
  miniatura (hachura/imagem; selo "📄 N" se multipágina) · trecho · pílulas de grupo (cor) · favorito.

### Drawer / modais
- Detalhe = **drawer lateral direito** (~480px) sobre o canvas, sombra de drawer.
- Modais centrais (cadastro rápido, gestão, backups, descobrir, confirmações): superfície s1/s2, raio 16, sombra de modal, overlay escuro `rgba(3,8,22,.5)`.

## Notas de IA por tela (resumo)
- **Grade**: top bar (busca + filtros/ordenar/selecionar/Nova pista) + grade de cartões; painel de filtros recolhível; chips ativos.
- **Mapa/Quadros**: canvas + toolbar/zoom; painel de camadas (mapa) / abas (quadros); minimapa.
- **Mundo**: seções Salas/Personagens/Grupos; dossiê com listas "aqui" / "mencionado em outro lugar"; editar cor (grupo).
- **Diretório**: categorias + salas (bloqueadas até descobrir) + progresso.
- **Detalhe (drawer)**: header (id+título+ações) · abas de página · imagem→lightbox · original|tradução · resumo · sala/grupos/personagens/conexões/notas.
- **Cadastro**: form padrão + seção de páginas com abas (＋/🗑).
- **Lightbox/Backups/Descobrir**: modais no padrão acima.

> Estado do protótipo (referência de comportamento): view, collapsed, search, filtros (fSala/fPessoa/fGrupo/fInc/fPend/fOrf/fFav), sortBy, selMode/sel, drawerMode/drawerFicha/drawerPage/drawerEntity, mapCam/mapLayers, boardIdx/boardCam, dirCat, modal, lightbox, toast.

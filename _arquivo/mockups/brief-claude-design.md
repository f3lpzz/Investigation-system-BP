# Brief — Redesign do zero · Painel "Blue Prince" (organizador de pistas)

> Objetivo: **redesenhar do zero** a UX/UI deste app, com qualidade **profissional e levemente
> moderna** no espírito de **Figma / Notion / Miro** — limpo, denso na medida certa, hierarquia
> clara, componentes consistentes. **Mantenha a paleta "Blueprint"** (azul‑noite + dourado, clima
> de mansão/mistério), mas com execução sóbria e moderna (linhas finas, espaçamento generoso,
> uso comedido de cor). Entregue HTML/CSS (JS mínimo) para implementação.
>
> Não se prenda ao layout atual: proponha a **melhor arquitetura de informação** possível.
> Anexos para herdar contexto: `painel.html` e `dados.js`.

---

## 1. Princípios de UX (norteadores de todas as telas)
1. **Conteúdo primeiro, chrome mínimo** (Notion): menos molduras, mais respiro; bordas em hairline.
2. **Uma ação primária por contexto** (dourada). O resto é secundário (ghost) ou ícone com tooltip.
   Acabar com "botões soltos": agrupar ações relacionadas; overflow em menu "⋯".
3. **Hierarquia tipográfica clara**: títulos com serifa elegante (identidade), corpo/UI em sans.
4. **Padrões previsíveis**: mesmos componentes, mesmos lugares, em todas as telas.
5. **Feedback sempre**: estados de hover/foco/ativo, toasts de confirmação, estados vazios úteis.
6. **Não destrutivo por padrão**: excluir/limpar pedem confirmação; tudo reversível quando possível.
7. **Teclado de primeira classe**: command palette (Ctrl/Cmd+K), atalhos, foco visível.
8. **Densidade ajustável**: pensar em centenas de pistas (cartões leves, listas virtualizáveis).

## 2. Arquitetura de informação & navegação
- **Sidebar esquerda fixa e recolhível** (estilo Notion), substituindo as abas soltas do topo:
  - Topo: marca (emblema + "Blue Prince").
  - Seção "Visões": Grade, Mapa, Mundo, Diretório, Quadros (ícone + rótulo; item ativo em dourado).
  - Seção "Coleções": atalhos por Grupo (lista com bolinha de cor), Salas, Personagens.
  - Rodapé: Gerenciar, Backups, e **indicador de status de salvamento** (salvo / salvando / pasta conectada).
- **Top bar contextual** dentro de cada visão: à esquerda título da visão + contador; ao centro busca
  global; à direita as ações específicas daquela visão (poucas, priorizadas).
- **Detalhe da pista = drawer lateral direito** (desliza por cima, ~480px), não modal de tela cheia —
  a lista permanece visível ao lado (peek estilo Notion / painel direito do Figma).
- **Command palette (Ctrl/Cmd+K)**: buscar e pular para qualquer pista/sala/personagem/grupo e disparar
  ações ("nova pista", "ir para Mapa", "abrir backups").

## 3. Design system

### Paleta (Blueprint refinada — escada de superfícies para densidade)
- Canvas/fundo: `#0a1428` (com textura de planta MUITO sutil, opcional/desligável).
- Superfícies: nível 1 (sidebar/painéis) `#0e1a33` · nível 2 (cartões) `#13213f` · nível 3 (hover/elevado) `#182a4d`.
- Bordas: hairline padrão `#21345c` · ênfase `#2c4a82`.
- Texto: primário `#eaf0fb` · secundário `#9fb0d0` · hint `#6b7ea1`.
- **Acento dourado** `#d8b15a`: SOMENTE ação primária, item de nav ativo, foco e destaques-chave (uso comedido).
- Funcionais: info `#5ea0ff` · sucesso `#4fbf8b` · alerta `#e0a13a` · perigo `#e2645f`.
- Cores de **grupo** (categóricas, escolhidas pelo usuário) — manter de um conjunto curado de ~8 matizes
  com bom contraste no escuro; a cor do 1º grupo colore a borda do cartão e o nó no mapa.
- Cores de entidade no mapa: Sala `#5ec8ff` · Personagem `#ff7e9a` · Conexão manual `#a98bff`.

### Tipografia
- Títulos/cabeçalhos: **serifa** (ex.: Cormorant Garamond / Spectral) — identidade "documento antigo".
- UI/corpo: **sans** limpa (ex.: Inter). Pesos: 400 e 500/600. **Sentence case** sempre.
- Escala sugerida: 12 (meta/label) · 13–14 (corpo/UI) · 16 (subtítulo) · 20–22 (título de seção) · 28 (título de tela).

### Grid, espaçamento, forma, elevação, ícones
- Espaçamento base **8px** (4/8/12/16/24/32). Layout com colunas fluidas; cartões `minmax(260px,1fr)`.
- Raios: 8px (controles), 12px (cartões/painéis), 16px (modais). Bordas em hairline (0.5–1px).
- Elevação: **2 níveis** só (drawer/modais e popovers). Nada de sombras pesadas/glow/gradiente forte.
- **Ícones de linha** (Lucide/Tabler), tamanho 16–20px; botões só‑ícone têm tooltip e aria-label.

## 4. Biblioteca de componentes (defina e reutilize)
- **Botões**: Primário (dourado), Secundário (ghost/outline), Terciário (texto), Ícone (toolbar), Perigo (ghost vermelho).
  Estados: hover, pressionado (scale .98), foco (anel), desabilitado. Tamanhos S/M.
- **Inputs**: campo de texto (36–40px), textarea, select, autocomplete (sala/personagem/grupo), color picker (grupo), toggle/switch.
- **Tags/pills**: pílula de **grupo** (cor + ícone), chip de filtro (removível), badge de **id** (dourado), badge de status ("pendente", "📄 N páginas").
- **Cartão de pista**: barra de acento (cor do grupo) à esquerda, miniatura, badge id, título (serifa), trecho EN/PT, pílulas de grupo, sala, favorito.
- **Estruturas**: sidebar, top bar, **drawer** (detalhe), **modal** (confirmações/cadastro), toast, tooltip, popover/menu "⋯", barra de seleção em lote, **estado vazio** (ilustração + ação).
- **Canvas (Mapa/Quadros)**: toolbar flutuante, controles de zoom (canto inferior direito: −/%/+/enquadrar), **minimapa**, painel de camadas/abas.

## 5. Padrões de interação
- **Detalhe** abre no drawer direito; editar é **inline** ou no mesmo drawer (sem trocar de tela).
- **Cadastro rápido (Ctrl+V)**: ao colar, abre o capturador; colar de novo **adiciona página**; salva como pendente.
- **Seleção em lote**: ao ativar, cartões ganham checkbox e surge uma barra inferior com ações (excluir, agrupar...).
- **Toasts** para salvar/restaurar/erros; **banner** quando o arquivo muda no disco (recarregar/manter).
- **Atalhos**: Ctrl+K (palette), Ctrl+V (colar pista), Esc (fechar), setas (navegar páginas no detalhe).

## 6. Modelo de dados (vocabulário das telas)
- **Pista:** título, sala, personagens[], grupos[], conexões[], notas, e **páginas[]** (cada página:
  imagem, original EN, tradução PT, resumo). Documento multi-página = UMA pista com abas de página.
- **Grupo:** conjunto de pistas, com **cor** própria. **Entidades:** Sala e Personagem (com dossiê;
  sala tem Diretório/descoberta). Não há "tipo/natureza" de ficha nem "símbolos".

## 7. Telas (TODAS — para cada: objetivo · layout · ações primárias/secundárias · estados)

1. **Grade** · objetivo: navegar/triar pistas. Layout: top bar (busca, ordenar, filtros) + grade de cartões.
   Primária: "Nova pista". Secundárias: filtros (grupo/sala/personagem/pendentes/favoritas/sem conexão/incompletas),
   ordenar, selecionar em lote. Estados: vazio (CTA colar/nova), filtrado (chips ativos + limpar), selecionando.
2. **Mapa** · grafo de força (infinity canvas) com nós de pista (cor do grupo), sala, personagem, grupo; arestas
   automáticas (sala/personagem) e manuais; **painel de camadas** (toggles), **minimapa**, zoom/pan, fundo em grade que move.
   Ações: camadas, enquadrar tudo, focar item.
3. **Mundo** · dossiês de Salas / Personagens / Grupos (abas internas ou seções). Cada dossiê: imagem, descrição,
   fatos, notas, **cor (grupo)**, e duas listas: "encontradas/citadas aqui" e "mencionadas em outro lugar". Ações: editar dossiê, focar no mapa.
4. **Diretório** · as salas do jogo em categorias; bloqueadas ("??????") até descobrir; clicar numa bloqueada abre
   **modal de confirmação** para revelar. Layout em grade/lista por categoria, com progresso (descobertas/total).
5. **Quadros** · canvas livre estilo Miro: **abas de quadros**; cartões de item (pista/sala/personagem), caixas de
   texto com @menção, **setas** (arrastar da alça), pan/zoom, fundo em grade que move. Toolbar: + item, + texto, novo quadro.
6. **Detalhe da pista (drawer)** · cabeçalho: badge id (dourado) + título (serifa) + ações (Editar, Focar no mapa, Excluir).
   **Barra de abas de página** quando >1. Por página: imagem grande clicável (→ lightbox), original | tradução lado a lado, resumo.
   Compartilhado: sala, grupos, personagens, conexões manuais, notas.
7. **Cadastro/edição** · no drawer: título, sala (autocomplete), personagens, grupos (autocomplete), status, notas; e
   **seção de páginas com abas** (＋ página / 🗑), cada uma com imagem (anexar), original, tradução, resumo. Primária: Aplicar.
8. **Cadastro rápido (Ctrl+V)** · modal compacto: cola imagem → abre; colar de novo **adiciona página** (miniaturas + "📄 N");
   campos sala/título/observação; salva como pendente. Dica visível: "cole de novo para somar páginas".
9. **Gestão** · listas de Salas, Personagens e Grupos (renomear/excluir/abrir dossiê; **grupo com seletor de cor**).
   Ações de dados: conectar pasta, salvar, backups, importar/exportar.
10. **Lightbox** · imagem em tela cheia, fundo escuro; zoom na roda **em direção ao cursor** (centralizado se fora da imagem);
    arrastar pra mover; duplo-clique reseta; fechar (✕/Esc). Mostrar dica discreta dos controles.
11. **Backups / recuperação** · lista de snapshots (navegador) e arquivos de backup (pasta) com data + nº de pistas; restaurar
    em 1 clique (com confirmação); estado de recuperação quando o arquivo está corrompido/vazio.
12. **Descobrir sala** · modal de confirmação ao revelar sala bloqueada: nome, tipo, raridade, efeito, descrição oficial; confirmar/cancelar.

## 8. Acessibilidade & responsividade
- Contraste AA no escuro; foco visível; alvos ≥ 36px; aria-labels nos botões só‑ícone.
- Desktop primeiro (1280–1600px). Sidebar recolhe < ~1100px; grade reflui; drawer vira modal full em telas estreitas.

## 9. Entregáveis & como trabalhar
- Comece pelo **design system + Grade**, depois **Detalhe (drawer)** e **Mapa**; itere tela por tela mantendo tokens consistentes.
- Entregar **HTML/CSS** (JS só onde necessário) e um guia de tokens/componentes para implementação no painel existente.

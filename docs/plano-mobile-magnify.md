# Plano de correção mobile — `feature/magnify`

> Documento de implementação para o Claude Code.
>
> Auditoria realizada em 17/07/2026 sobre a branch `feature/magnify`, commit-base
> `9c65f87`. O diagnóstico não usou a branch `online` nem outra versão do projeto
> como referência visual ou funcional.

## 1. Objetivo

Transformar a interface atual da branch `feature/magnify` em uma experiência
mobile completa, responsiva, acessível e operável por touchscreen, preservando
a experiência desktop e o esquema v6 do objeto `DADOS`.

O trabalho abrange:

- navegação e retorno entre vistas;
- rolagem e adaptação a diferentes tamanhos e orientações;
- detalhes, formulários, filtros, menus, modais e bottom sheets;
- autenticação, Conta, Arquivo e feedback de salvamento;
- Mapa, Quadros e lightbox com gestos e alternativas acessíveis;
- teclado virtual, barras móveis do navegador e áreas seguras;
- acessibilidade, legibilidade, desempenho percebido e testes em dispositivos
  reais.

Este não é um pedido de simples redução visual do desktop. Quando um componente
desktop não funcionar por toque, deve ser criada uma adaptação mobile própria.

## 2. Instruções obrigatórias para o executor

1. Trabalhar exclusivamente sobre o estado atual da branch `feature/magnify`.
2. Não copiar estruturas da branch `online`, da produção ou de versões antigas.
3. Antes de editar, ler integralmente:
   - `AGENTS.md`;
   - `.agents/skills/verificar-visual/SKILL.md`;
   - `.agents/skills/fechar-etapa/SKILL.md`;
   - `docs/data-model.md`;
   - `docs/testing.md`.
4. Não renomear ou remover campos do esquema v6 de `DADOS`.
5. Manter leitura e gravação de `DADOS` no mesmo formato.
6. Não alterar regras de salas vindas do diretório compartilhado.
7. Não introduzir segredo, chave privada ou `service_role` no frontend ou git.
8. Preservar mouse, teclado e atalhos da experiência desktop.
9. Não aplicar `touch-action:none` ou `overscroll-behavior:none` globalmente.
10. Não desabilitar zoom do navegador com `user-scalable=no`.
11. Preferir componentes e controladores reutilizáveis a correções locais
    repetidas.
12. Executar as etapas na ordem deste documento. Uma etapa só pode avançar após
    seus critérios de conclusão serem atendidos.
13. Após toda alteração visual, seguir a skill `verificar-visual`. Screenshot ou
    não aconteceu.
14. Ao terminar toda a implementação, seguir a skill `fechar-etapa`: testes,
    varredura de segredos, commit, push e Pull Request. Nunca fazer merge na
    `online`.

## 3. Decisões de produto adotadas

Estas decisões devem ser usadas como padrão de implementação. Só parar para
pedir confirmação se surgir uma limitação técnica concreta que torne alguma
delas inviável.

### 3.1 Navegação mobile

A barra inferior terá cinco destinos:

1. Fichas;
2. Mapa;
3. Quadros;
4. Arquivo;
5. Conta.

Conta não deve ficar escondida apenas em menu secundário.

### 3.2 Mapa

- O Mapa é uma vista dedicada; portanto, um dedo move o canvas.
- Pinch amplia e reduz.
- Tap seleciona um ponto.
- O detalhe selecionado permanece visível em bottom sheet.
- Devem existir botões de `+`, `−`, enquadrar e restaurar.
- Deve existir uma alternativa simples por lista ou ação de recentralização.
- Rotação por gesto não é necessária.

### 3.3 Quadros

- O modo padrão no mobile é “mão”.
- Tap seleciona um item.
- Ações contextuais aparecem em menu ou bottom sheet.
- Para criar barbante: selecionar o item de origem, tocar em “Conectar” e tocar
  no item de destino.
- Arraste pode continuar existindo, mas não pode ser a única forma de mover,
  conectar ou reconectar.

### 3.4 Detalhes e edição

- Ficha, dossiê longo e formulário de edição usam tela completa no mobile.
- Bottom sheet é reservado para informação contextual curta, como um ponto do
  Mapa ou menu de ações.
- A ação primária fica visível; ações secundárias ficam em “Mais”.

### 3.5 Layout compacto

- O comportamento não pode depender apenas de `innerWidth <= 720`.
- Espaço de layout, altura curta e capacidade de entrada são dimensões
  diferentes.
- CSS e JavaScript devem compartilhar a mesma definição por `matchMedia`.
- Dispositivos híbridos com toque e mouse devem continuar aceitando os dois.

### 3.6 Ações destrutivas

- Não disparar no `pointerdown`.
- Exigir confirmação quando a ação não for facilmente recuperável.
- Preferir “Desfazer” quando a recuperação local for segura.
- Nunca colocar excluir colado à ação primária frequente.

## 4. Estado atual e diagnóstico

### 4.1 Pontos positivos existentes

- A grade de fichas já reorganiza os cards de forma útil no mobile.
- Não houve rolagem horizontal da página nas nove vistas testadas em 360, 390 e
  430 px.
- A navegação inferior atual tem boa base estrutural.
- O FAB de nova ficha mede 56 px.
- Os botões principais de filtros e menu chegam a 44 px.
- Existem tentativas iniciais de filtros em sheet e Arquivo em duas colunas.

Esses elementos devem ser preservados e refinados, não reconstruídos sem
necessidade.

### 4.2 Problemas críticos

#### P01 — Fechar um detalhe remove a navegação mobile

- **Onde:** fichas, dossiês e edição.
- **Atual:** abrir um detalhe adiciona `drawer-aberta` ao `body`; fechar remove
  `.open` da gaveta, mas não remove `drawer-aberta`.
- **Impacto:** tabbar e FAB continuam escondidos e o usuário pode ficar preso na
  vista atual.
- **Esperado:** fechar, excluir ou navegar a partir do detalhe deve restaurar
  navegação, foco, scroll e acionador.
- **Correção:** centralizar abertura e fechamento em um controlador de overlay.
- **Relacionados:** “Ver no mapa”, editar, excluir, dossiês e botão Voltar.

#### P02 — A lista de salas não possui rolagem utilizável

- **Onde:** Arquivo › Salas.
- **Atual:** em 390×844, o `main` visível tem 770 px, mas `#arquivo` cresce para
  953 px. A sala Library começa em `y=804`, atrás da tabbar em `y=777`. Em
  812×375, o conteúdo chega a 1507 px dentro de uma área de 375 px.
- **Impacto:** parte das salas fica inacessível.
- **Esperado:** cabeçalho e tabbar permanecem estáveis e somente a lista central
  rola.
- **Correção:** corrigir a cadeia de flex/altura e definir exatamente um dono da
  rolagem por vista.
- **Relacionados:** Personagens, Grupos, dossiês, landscape e teclado.

#### P03 — O Mapa não funciona por toque

- **Onde:** Mapa.
- **Atual:** o código usa mouse e roda. Swipe, pinch, arraste e tap em marcador
  não alteraram o mapa nos testes. Houve marcador visual de apenas 4,4×4,4 px
  após o enquadramento.
- **Impacto:** o principal componente espacial vira uma imagem praticamente
  estática no celular.
- **Esperado:** pan com um dedo, pinch, tap persistente, controles de zoom e
  alternativa sem gesto complexo.
- **Correção:** controlador compartilhado de Pointer Events, captura de ponteiro,
  `pointercancel`, limiar de movimento, halos de 48 px e `touch-action` limitado
  ao canvas.
- **Relacionados:** camadas, legenda, tooltip, seleção, dossiês e orientação.

#### P04 — Quadros são desktop-only na prática

- **Onde:** Quadros.
- **Atual:** a toolbar some no mobile; swipe e pinch não movem a câmera; pinch
  amplia a página; arrastar nota não move o item; excluir, cor e abrir dependem
  de hover ou duplo clique.
- **Impacto:** não é possível organizar uma teoria completa sem mouse.
- **Esperado:** modo mão, pan/pinch, tap, menu contextual e conexão guiada.
- **Correção:** adaptação mobile própria construída sobre o mesmo controlador de
  Pointer Events do Mapa.
- **Relacionados:** notas, barbantes, menções, edição, abas e lightbox.

### 4.3 Problemas de alta prioridade

#### P05 — Conta e status de salvamento são inalcançáveis

- Sidebar some no mobile e a tabbar não possui Conta.
- Backup, restauração, logout, idioma, apagar conta e estado de sincronização
  ficam sem caminho de acesso.
- Adicionar Conta como quinta aba e mostrar status de salvamento em local visível
  no mobile.

#### P06 — Busca do Arquivo é escondida sem alternativa

- O input recebe `display:none`, mas o contêiner mantém `min-width:200px`.
- Sobra uma área larga e vazia com lupa sem ação.
- Transformar a lupa em botão real; expandir ou abrir busca dedicada, focar
  automaticamente e oferecer limpar/fechar.

#### P07 — Detalhe mobile não é uma tela completa

- O detalhe começa abaixo da topbar, deixa o fundo presente e esconde ações que
  existem no desktop.
- Ações como adicionar ao quadro, IA e excluir podem desaparecer.
- Implementar detalhe full-screen com cabeçalho próprio, ação primária e menu
  “Mais”.

#### P08 — Viewport, teclado e áreas seguras não são tratados

- O shell usa `height:100vh` e `overflow:hidden`.
- Não há `svh`, `dvh`, `safe-area-inset`, `visualViewport`, `inputmode` ou
  `enterkeyhint`.
- Inputs da autenticação usam aproximadamente 13,5 px.
- Conta, dossiês e autenticação ficam cortados em paisagem curta.
- Usar shell estável com `svh`, limite dinâmico de overlays com `dvh`, safe areas,
  corpo interno rolável e inputs mobile de pelo menos 16 px.

#### P09 — Quebra abrupta entre 720 e 721 px

- A 720 px existe tabbar; a 721 px aparece sidebar de 212 px.
- Arquivo perde área útil e o Mapa apresenta sobreposição.
- Criar modo responsivo coerente por espaço e altura, mantendo capacidade de
  entrada separada.

#### P10 — Botão e gesto Voltar ignoram a navegação interna

- Não há integração com History API.
- Voltar pode sair do app em vez de fechar filtro, detalhe ou modal.
- Ordem esperada: fechar overlay → voltar do detalhe → voltar de vista → sair.

#### P11 — Modais e filtros não têm comportamento modal completo

- Não há padrão comum de backdrop, foco preso, fundo inerte, scroll interno,
  restauração de foco, Back/Escape ou safe area.
- Criar controlador único para modal, bottom sheet, full-screen e popover.

#### P12 — Áreas de toque pequenas e ações dependentes de hover

Medições confirmadas:

- favorito: 12×14 px;
- limpar busca: 14×20 px;
- renomear pessoa: 15×19 px;
- idioma: 72×23 px;
- remover fio: 10×16 px;
- controles do Mapa: aproximadamente 31 px de altura.

Adotar 44×44 px como padrão geral e 48×48 px para Mapa, fechar, salvar e ações
frequentes. O ícone visual pode permanecer menor dentro de uma área interativa
maior, desde que os halos não se sobreponham.

#### P13 — Lightbox não aceita gestos mobile

- Usa roda, mouse e duplo clique.
- Reutilizar o controlador de gestos: pinch, pan quando ampliado, double-tap ou
  reset, reenquadrar e fechar com alvo de 48 px.

#### P14 — Estrutura acessível insuficiente

- Há muitos `div` e `span` clicáveis.
- Nós SVG não são focalizáveis.
- Campos gerados não possuem `<label>` associado.
- Tabs não expõem `aria-current` ou `aria-selected`.
- Drawer fechado pode continuar exposto ao foco/leitor.
- Imagens dinâmicas frequentemente não têm texto alternativo.

Usar elementos nativos, labels reais, foco administrado, `inert`, descrições e
alternativa em lista ou árvore para Mapa e Quadros.

#### P15 — Contraste, foco e legibilidade frágeis

Medições da paleta atual:

- `--hint` sobre superfícies escuras: 3,71:1 a 3,89:1;
- `--papel-hint` sobre papel: 3,16:1;
- foco global sobre superfícies escuras: aproximadamente 1,3:1.

Aplicar:

- 4,5:1 para texto comum;
- 3:1 para texto grande, foco, bordas e ícones funcionais;
- texto ampliável a 200%;
- componentes sem altura rígida que corte quebra de linha.

#### P16 — Feedback de salvamento, erro e progresso fica oculto

- Status principal vive na sidebar escondida.
- Toast e progresso podem cobrir tabbar e FAB.
- Não há regiões `aria-live`.
- Criar padrão compartilhado acima da tabbar/safe area, com feedback imediato e
  mensagens acessíveis.

#### P17 — Ajuda do Mapa cobre o grafo e ensina comandos impossíveis

- Ajuda e legenda ficam abertas e citam roda do mouse, Shift e Espaço.
- Fechar por padrão no mobile e abrir ajuda, legenda e camadas em sheet.
- Adaptar instruções a toque, mouse ou teclado conforme a capacidade detectada.

### 4.4 Problemas de média prioridade

#### P18 — Menus, abas e popups não são adaptativos

- Itens do menu “Mais” têm cerca de 35 px.
- Categorias do Arquivo têm cerca de 29 px.
- Abas de Quadros quebram em várias linhas.
- Popups não consideram teclado ou bordas da viewport.
- Ctrl+K, Ctrl+Z, Ctrl+Y e Ctrl+V continuam visíveis no mobile.

Usar menus de 44 px, uma única faixa/seletor para abas, popups limitados à
viewport visual e textos condicionais por capacidade.

#### P19 — Movimento reduzido não é respeitado

- Não existe tratamento de `prefers-reduced-motion`.
- Remover movimentos espaciais grandes quando a preferência estiver ativa,
  mantendo feedback breve por opacidade ou mudança de estado.

### 4.5 Melhoria futura condicionada à medição

#### P20 — Layout do Mapa pode perder fluidez com mais dados

- O layout executa até 500 iterações síncronas e compara pares de nós.
- Movimento pode reconstruir amplamente o SVG.
- Medir primeiro com dados representativos.
- Se o INP exceder 200 ms, processar em lotes ou worker, atualizar com
  `requestAnimationFrame` e evitar reconstrução total.

## 5. Padrões reutilizáveis a implementar

### 5.1 Shell e scroll

- Usar uma cadeia previsível de altura em `body`, app, `main` e vista.
- Aplicar `min-height:0` e `min-width:0` onde necessário em layouts flex/grid.
- Cada vista deve possuir um único dono de rolagem vertical.
- Canvas de Mapa/Quadros pode ser bidimensional, mas não pode alargar a página.
- Reservar espaço de tabbar, topbar e safe area com tokens compartilhados.

### 5.2 Tokens mobile

Criar ou consolidar tokens para:

- viewport estável e dinâmica;
- safe area superior, inferior e laterais;
- altura de topbar e tabbar;
- offset de FAB, toast e progresso;
- alvo de toque 44 e 48 px;
- foco visível;
- contraste de texto auxiliar;
- movimento normal e reduzido.

### 5.3 Navegação com estado

- Um estado central deve saber a vista, detalhe e overlay ativos.
- Integrar com History API.
- Garantir restauração de foco e scroll.
- Rotacionar ou redimensionar não deve trocar silenciosamente o tipo de conteúdo
  aberto.

### 5.4 Controlador de overlays

Deve atender:

- modal;
- bottom sheet modal;
- bottom sheet contextual não modal;
- detalhe full-screen;
- popover;
- lightbox.

Responsabilidades:

- foco inicial;
- armadilha de foco quando modal;
- fundo `inert`;
- fechar por botão, Back e Escape;
- devolver foco ao acionador;
- bloquear ou conter scroll corretamente;
- respeitar safe areas e teclado;
- corpo interno rolável;
- semântica de diálogo e estado expandido.

### 5.5 Controlador de Pointer Events

Compartilhado por Mapa, Quadros e lightbox:

- tap;
- double-tap opcional;
- limiar entre tap e arraste;
- pan;
- pinch;
- captura de ponteiro;
- `pointercancel`;
- conclusão de ações no `pointerup`;
- prevenção seletiva do gesto do navegador;
- fallback para mouse e teclado.

### 5.6 Ações contextuais

- Tap seleciona o item.
- Ações frequentes ficam visíveis.
- Ações secundárias aparecem em menu ou sheet.
- Nenhuma ação pode existir somente em hover ou duplo clique.
- Excluir deve ser separado e claramente identificado.

### 5.7 Formulários e teclado

- Inputs com fonte mínima de 16 px no mobile.
- Usar `type`, `inputmode`, `autocomplete` e `enterkeyhint` apropriados.
- Associar todo campo a um `<label>`.
- Erro descrito em texto e ligado ao campo.
- Foco inválido deve rolar para uma posição inteiramente visível.
- Ação primária permanece acessível com teclado aberto.

### 5.8 Feedback e estados

Padronizar:

- carregando;
- salvando;
- salvo;
- offline;
- erro;
- conflito;
- vazio;
- sem resultado;
- processamento da IA.

Usar `role="status"` ou região `aria-live="polite"` para atualizações normais e
`role="alert"` apenas para erro urgente.

## 6. Plano de execução obrigatório

### Etapa 0 — Baseline e contrato de aceite

#### Tarefas

- [ ] Confirmar branch e registrar commit inicial.
- [ ] Registrar o status do git e preservar alterações preexistentes.
- [ ] Ler todos os arquivos e skills obrigatórios.
- [ ] Usar as capturas existentes como baseline.
- [ ] Preparar matriz de vistas, estados e viewports para verificação repetível.
- [ ] Definir dados de teste representativos para Mapa e Quadros.

#### Dependências

Nenhuma.

#### Critério de conclusão

Matriz objetiva de aceite pronta antes da primeira alteração funcional.

### Etapa 1 — Shell, navegação e bloqueios estruturais

#### Tarefas

- [ ] Corrigir a permanência de `drawer-aberta`.
- [ ] Centralizar troca de vista e abertura/fechamento de detalhe.
- [ ] Corrigir a cadeia de altura e rolagem.
- [ ] Tornar todas as salas alcançáveis.
- [ ] Adicionar Conta à tabbar.
- [ ] Introduzir viewport e safe-area tokens.
- [ ] Corrigir o cliff de 720/721 px.
- [ ] Integrar vistas e overlays ao History API.
- [ ] Garantir que rotação preserve o estado atual.

#### Partes afetadas

Shell, tabbar, sidebar, Fichas, Arquivo, Conta, detalhes e Mapa.

#### Dependências

Etapa 0.

#### Critérios de conclusão

- [ ] Fechar qualquer detalhe restaura tabbar e FAB.
- [ ] Todas as salas são alcançáveis em retrato e paisagem.
- [ ] Não há perda de conteúdo entre 320 e 932 px.
- [ ] 720 e 721 px não produzem composições incompatíveis.
- [ ] Back fecha a camada correta antes de sair do app.
- [ ] Desktop permanece funcional.
- [ ] Screenshots da etapa aprovadas pela skill `verificar-visual`.

### Etapa 2 — Primitivas reutilizáveis

#### Tarefas

- [ ] Implementar controlador de overlays.
- [ ] Implementar controlador compartilhado de Pointer Events.
- [ ] Criar componente de ação contextual.
- [ ] Criar tokens de toque, foco, safe area e movimento.
- [ ] Padronizar toast, progresso e estado de salvamento.
- [ ] Definir estilos por `pointer`, `hover` e espaço disponível.
- [ ] Manter fallback de mouse e teclado.

#### Partes afetadas

Filtros, detalhes, Mapa, Quadros, lightbox, IA, pickers e modais.

#### Dependências

Etapa 1.

#### Critérios de conclusão

- [ ] Cada primitiva possui pelo menos um uso funcional validado.
- [ ] Foco entra, permanece e volta corretamente em overlay modal.
- [ ] Back/Escape e botão visível fecham corretamente.
- [ ] `pointercancel` não dispara ação acidental.
- [ ] Nenhuma regra de toque prejudica zoom global ou navegação do navegador.

### Etapa 3 — Fichas, Arquivo, Conta e autenticação

#### Tarefas

- [ ] Transformar detalhe e edição em full-screen mobile.
- [ ] Preservar todas as ações desktop em ações equivalentes mobile.
- [ ] Corrigir busca do Arquivo.
- [ ] Corrigir categorias e rolagem do Arquivo.
- [ ] Converter filtros em bottom sheet real.
- [ ] Tornar Conta totalmente acessível pela tabbar.
- [ ] Adaptar login, cadastro e redefinição a alturas curtas e teclado.
- [ ] Aplicar fonte mínima de 16 px e atributos de teclado aos campos.
- [ ] Reposicionar toast, progresso e salvamento.
- [ ] Corrigir estados vazios, erros e carregamento.

#### Dependências

Etapas 1 e 2.

#### Critérios de conclusão

- [ ] Todos os fluxos funcionam apenas por toque.
- [ ] Nenhuma ação some em relação ao desktop.
- [ ] Conta, logout, backup e idioma são alcançáveis.
- [ ] Busca do Arquivo abre, recebe foco, filtra, limpa e fecha.
- [ ] Formulários continuam utilizáveis em paisagem e com teclado aberto.
- [ ] Screenshots aprovadas em retrato e paisagem.

### Etapa 4 — Mapa touchscreen

#### Tarefas

- [ ] Implementar pan com um dedo.
- [ ] Implementar pinch zoom.
- [ ] Implementar tap persistente em nó.
- [ ] Criar controles `+`, `−`, enquadrar e restaurar com 48 px.
- [ ] Criar halos de toque para nós sem sobreposição indevida.
- [ ] Adaptar seleção múltipla para uma ação explícita.
- [ ] Mostrar detalhe do ponto em bottom sheet.
- [ ] Mover ajuda, legenda e camadas para controles compactos.
- [ ] Corrigir instruções por capacidade de entrada.
- [ ] Criar alternativa em lista/recentralização.
- [ ] Testar toque acidental, `pointercancel` e orientação.
- [ ] Medir desempenho com dados representativos.
- [ ] Otimizar layout somente se a medição indicar necessidade.

#### Dependências

Etapa 2.

#### Critérios de conclusão

- [ ] Pan, pinch e seleção funcionam em aparelho touchscreen.
- [ ] Todos os recursos principais funcionam sem mouse.
- [ ] Há alternativa para drag e gesto multiponto.
- [ ] Nenhum controle crítico mede menos de 48 px.
- [ ] O mapa não amplia a página por acidente.
- [ ] Ajuda e legenda não cobrem o conteúdo por padrão.
- [ ] INP do cenário representativo é de até 200 ms.
- [ ] Retrato, paisagem e desktop aprovados visualmente.

### Etapa 5 — Quadros e lightbox touchscreen

#### Tarefas

- [ ] Implementar modo mão padrão.
- [ ] Implementar pan e pinch do canvas.
- [ ] Implementar seleção por tap.
- [ ] Criar menu/sheet contextual por item.
- [ ] Permitir editar, abrir, mudar cor e excluir sem hover.
- [ ] Implementar conexão guiada por dois toques.
- [ ] Criar alternativa sem arraste para mover e reconectar.
- [ ] Compactar abas de Quadros em uma linha ou seletor.
- [ ] Ajustar menções e popups à viewport e teclado.
- [ ] Reutilizar gestos no lightbox.
- [ ] Corrigir dicas de desktop no mobile.

#### Dependências

Etapa 2 e conclusão funcional do controlador de gestos.

#### Critérios de conclusão

- [ ] Criar, editar, mover, conectar, reconectar e excluir funciona sem mouse.
- [ ] Nenhuma função depende apenas de hover ou duplo clique.
- [ ] Pinch amplia o canvas ou imagem, não a página.
- [ ] Alternativas simples existem para drag e pinch.
- [ ] Abas não consomem múltiplas linhas da tela.
- [ ] Retrato, paisagem e desktop aprovados visualmente.

### Etapa 6 — Acessibilidade e refinamento

#### Tarefas

- [ ] Converter elementos clicáveis em elementos nativos apropriados.
- [ ] Associar labels e mensagens de erro.
- [ ] Adicionar `aria-current`, `aria-selected`, nomes e descrições.
- [ ] Ocultar corretamente conteúdo inativo de leitores e foco.
- [ ] Criar alternativa acessível para Mapa e Quadros.
- [ ] Corrigir contraste de texto, foco e controles.
- [ ] Validar texto a 200%.
- [ ] Validar espaçamento de texto WCAG.
- [ ] Adicionar regiões live de status.
- [ ] Implementar `prefers-reduced-motion`.
- [ ] Refinar posição das ações para uso com uma mão.

#### Dependências

Etapas 3, 4 e 5.

#### Critérios de conclusão

- [ ] Fluxos principais funcionam por teclado.
- [ ] VoiceOver e TalkBack anunciam controles e estados corretamente.
- [ ] Foco nunca fica atrás de overlay ou barra fixa.
- [ ] Texto a 200% não perde conteúdo ou ação.
- [ ] Contrastes atendem 4,5:1 e 3:1 conforme o tipo.
- [ ] Movimento reduzido é respeitado.

### Etapa 7 — Validação final e regressões

#### Tarefas

- [ ] Repetir todas as screenshots da baseline.
- [ ] Executar matriz de viewports e estados.
- [ ] Testar em dispositivos reais.
- [ ] Testar teclado virtual e barras móveis.
- [ ] Testar notch, home indicator e safe areas.
- [ ] Testar botão Voltar e swipe-back.
- [ ] Testar mouse, teclado e atalhos desktop.
- [ ] Testar grande volume de dados.
- [ ] Rodar `npm run checar` na pasta `tools/`.
- [ ] Rodar `node teste-online.mjs` na pasta `tools/`.
- [ ] Verificar que o esquema v6 e as regras do diretório de salas permanecem
  intactos.
- [ ] Executar a skill `fechar-etapa`.

#### Dependências

Todas as etapas anteriores.

#### Critérios de conclusão

- [ ] Testes automatizados verdes.
- [ ] Capturas visuais aprovadas.
- [ ] Matriz de dispositivos aprovada.
- [ ] Nenhum fluxo principal depende de mouse.
- [ ] Nenhum conteúdo ou ação fica inalcançável.
- [ ] Nenhuma regressão desktop relevante.
- [ ] Nenhuma alteração incompatível em `DADOS` v6.
- [ ] Pull Request aberto para Felipe revisar; nenhum merge realizado pela IA.

## 7. Estratégia de testes

### 7.1 Viewports mínimas

Retrato:

- 320×568;
- 360×800;
- 390×844;
- 412×915;
- 430×932;
- 500×900.

Paisagem:

- 568×320;
- 667×375;
- 720×390;
- 721×390;
- 844×390;
- 900×500.

Tablet e desktop:

- 768×1024;
- 1024×768;
- 1240×820 ou baseline desktop equivalente.

### 7.2 Navegadores e aparelhos

- Safari em iPhone pequeno.
- Safari em iPhone com recorte e home indicator.
- Chrome Android em aparelho intermediário.
- Samsung Internet.
- Tablet e tela dividida.
- Chrome, Edge e Firefox desktop para regressão.

### 7.3 Gestos e toque

Testar:

- tap exato e tap impreciso;
- toque iniciado e cancelado fora do alvo;
- swipe horizontal e vertical;
- pan;
- pinch;
- double-tap onde aplicável;
- long press;
- dois dedos sobre Mapa e Quadros;
- rotação durante gesto, overlay ou edição;
- uso com uma mão;
- conflito com swipe-back do sistema.

### 7.4 Teclado virtual

- Focar todos os campos de autenticação, busca e edição.
- Confirmar que campo, erro e botão primário continuam visíveis.
- Testar Gboard, teclado Samsung e teclado iOS.
- Girar o aparelho com teclado aberto.
- Testar barras do navegador expandidas e recolhidas.
- Confirmar tipo de teclado e tecla Buscar/Próximo/Enviar.

### 7.5 Estados funcionais

- autenticação carregando, erro e sucesso;
- online, offline, salvando, salvo e conflito;
- lista vazia, sem resultado e grande volume;
- filtro aberto e aplicado;
- detalhe, edição e exclusão;
- mapa vazio, cheio, selecionado e com camadas;
- quadro vazio, populado, conectando e editando;
- modal curto e conteúdo longo;
- IA processando, concluída e falhando;
- importação, backup e ação destrutiva.

### 7.6 Acessibilidade

- teclado sem mouse;
- VoiceOver;
- TalkBack;
- zoom e texto a 200%;
- espaçamento de texto com:
  - `line-height:1.5`;
  - parágrafo `2em`;
  - letras `0.12em`;
  - palavras `0.16em`;
- contraste;
- foco visível;
- movimento reduzido;
- conteúdo anunciado em loading, erro, sucesso e vazio.

### 7.7 Desempenho

Metas mobile no percentil 75:

- LCP ≤ 2,5 s;
- INP ≤ 200 ms;
- CLS ≤ 0,1.

Medir especificamente:

- primeira renderização do Mapa;
- pan/pinch e seleção de nó;
- abrir detalhe, filtro e modal;
- criar/mover/conectar no Quadro;
- salvar;
- filtrar lista grande;
- rotação e resize.

## 8. Definição global de pronto

A implementação mobile só estará pronta quando todas as condições abaixo forem
verdadeiras:

- [ ] A página não possui rolagem horizontal a 320 CSS px.
- [ ] Mapa e Quadros mantêm sua região bidimensional contida.
- [ ] Nenhum conteúdo ou ação fica escondido sem rolagem possível.
- [ ] Todos os fluxos principais funcionam sem mouse.
- [ ] Todo gesto complexo possui alternativa simples.
- [ ] Alvos gerais possuem pelo menos 44×44 px.
- [ ] Controles críticos e do Mapa possuem pelo menos 48×48 px.
- [ ] Botão Voltar fecha a camada correta.
- [ ] Teclado, barras do navegador e safe areas não cobrem campos ou ações.
- [ ] Retrato e paisagem funcionam sem pedir ao usuário para girar o aparelho.
- [ ] Texto a 200% continua utilizável.
- [ ] Contraste e foco atendem os critérios definidos.
- [ ] Estados de salvamento, erro e carregamento são visíveis e anunciados.
- [ ] Movimento reduzido é respeitado.
- [ ] Desempenho atende as metas ou possui justificativa e plano medido.
- [ ] Desktop continua funcional.
- [ ] O esquema v6 de `DADOS` permanece compatível.
- [ ] Os dois testes do projeto estão verdes.
- [ ] Todas as mudanças visuais possuem screenshots verificadas.
- [ ] Pull Request aberto e nenhum merge realizado pela IA.

## 9. Evidências da auditoria

Diretório local:

`C:\Users\T-GAMER\.codex\visualizations\2026\07\17\019f7283-dc88-73f0-83c8-54ababbb43dd\qa-mobile-magnify`

Conteúdo principal:

- `portrait-500x900-<vista>.png`;
- `landscape-900x500-<vista>.png`;
- `cdp-390x844-<vista>.png`;
- `cdp-844x390-<vista>.png`;
- `cliff-720x500-*.png`;
- `cliff-721x500-*.png`;
- `cdp-390x844-nova-ficha.png`;
- `cdp-mobile-metrics.json`.

As vistas cobertas foram:

- grade;
- detalhe;
- mapa;
- teorias/Quadros;
- Conta;
- Arquivo de Salas;
- Arquivo de Pessoas;
- dossiê de sala;
- filtros da grade.

Os testes de toque da auditoria usaram emulação Chrome/CDP. Isso confirmou os
defeitos de interação, mas não substitui a validação final em aparelhos reais.

## 10. Referências oficiais

### Acessibilidade e toque

- [WCAG — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow)
- [WCAG — Orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation.html)
- [WCAG — Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WCAG — Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced)
- [WCAG — Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)
- [WCAG — Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures)
- [WCAG — Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation)
- [WCAG — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
- [WCAG — Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- [WCAG — Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
- [WAI-ARIA — Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG — Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

### Mobile e componentes adaptativos

- [Apple — Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/)
- [Apple — Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple — Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- [Android — Touch targets](https://developer.android.com/develop/ui/compose/accessibility/api-defaults)
- [Android — Adaptive apps](https://developer.android.com/develop/adaptive-apps/guides/get-started-with-adaptive-apps)
- [Android — Layout and navigation patterns](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)
- [Android — Bottom sheets](https://developer.android.com/develop/ui/compose/quick-guides/content/create-bottom-sheet)
- [Android — Edge-to-edge](https://developer.android.com/design/ui/mobile/guides/layout-and-content/edge-to-edge)

### APIs web

- [MDN — Viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)
- [MDN — `svh`, `lvh` e `dvh`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length)
- [MDN — Safe-area environment variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- [MDN — Visual Viewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
- [MDN — `inputmode`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode)
- [MDN — `enterkeyhint`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/enterkeyhint)
- [MDN — Pointer media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/pointer)
- [MDN — Hover media query](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/hover)
- [MDN — `touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)
- [MDN — `overscroll-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior)
- [MDN — `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)

### Desempenho

- [Core Web Vitals](https://web.dev/articles/vitals?hl=pt-br)
- [MDN — Perceived performance](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Perceived_performance)


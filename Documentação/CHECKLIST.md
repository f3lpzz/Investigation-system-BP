# ✅ Checklist de fumaça — Blue Prince

> Lista rápida para conferir, **no Chrome ou Edge**, se o app continua funcionando depois de qualquer mudança.
> "Fumaça" = só o básico: será que liga e o essencial funciona? Marque cada item. Se algum falhar, **não siga** — desfaça a última mudança e investigue.

## Como usar
1. Abra o `painel.html` (duplo clique) **ou**, melhor, sirva a pasta em `localhost` (veja o `README.md`) para o salvamento funcionar 100%.
2. Passe por cada item abaixo, na ordem. Demora ~2 minutos.

## Abertura
- [ ] O painel abre sem tela branca.
- [ ] As **fichas/pistas** aparecem na visão **Grade**.
- [ ] Não há erro vermelho no console do navegador (F12 → aba *Console*).

## Busca e filtros
- [ ] A **busca** (topo) filtra as fichas ao digitar.
- [ ] Os **filtros** (Filtros, Incompletas, Pendentes, Sem conexão, Favoritas) ligam/desligam e mudam a lista.
- [ ] **Ordenar** (Recentes / Sala / Título) reordena, e as opções do menu são legíveis.

## Visões
- [ ] **Mapa** abre, mostra a teia de conexões e não fica reembaralhando ao trocar de tela.
- [ ] **Mundo** (dossiês) mostra os cards de salas, personagens e grupos.
- [ ] **Diretório** abre.
- [ ] **Quadros** abre e mostra o quadro atual.

## Navegação do Mapa e Quadros
- [ ] Arrastar com o **botão esquerdo no vazio** abre a caixa de seleção (marquee).
- [ ] **Botão do meio** (ou **Espaço + arrastar**) move a tela; a **roda** dá zoom.
- [ ] Arrastar um item selecionado move o grupo junto.

## Adicionar / editar
- [ ] **Adicionar** uma ficha funciona (formulário abre e salva).
- [ ] **Editar** uma ficha existente funciona (inclusive os campos de "chips": personagens, grupos, apelidos).
- [ ] **Mesclar personagens** (em Gerenciar) une dois nomes sem erro.
- [ ] **Desfazer (Ctrl+Z)** e **Refazer (Ctrl+Y)** funcionam.

## Salvar e backup (o mais importante)
- [ ] Na 1ª abertura, o painel pede para **escolher o `dados.js`**; nas próximas, reconecta sozinho (ou pede 1 clique de "Reconectar").
- [ ] Ao alterar algo, o indicador no canto mostra **"Salvando…"** e depois **"Tudo salvo"**.
- [ ] O arquivo **`dados.js`** é realmente atualizado no disco.
- [ ] Um novo arquivo de **backup** aparece na pasta `backups/` (`dados-AAAAMMDD-HHMMSS.js`).
- [ ] **Não** aparece o aviso "o arquivo dados.js mudou fora do painel" durante o uso normal.

## Depois de recarregar
- [ ] Recarregue a página: os dados continuam lá e o **layout do mapa** se manteve.

---
*Se tudo acima estiver marcado, o app está saudável. Rode este checklist após cada mudança estrutural.*

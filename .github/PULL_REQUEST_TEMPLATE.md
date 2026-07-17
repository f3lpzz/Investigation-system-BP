<!-- Escreva em português simples: o dono do projeto não programa. -->

## O que muda

<!-- 2 a 5 linhas: o que quem USA o painel ganha ou vê de diferente. -->

## Por quê

<!-- 1 a 2 linhas: o problema ou pedido que motivou a mudança. -->

## Como conferir

Preview: https://SUBSTITUA-PELO-NOME-DA-BRANCH.investigation-system-bp.pages.dev

<!-- Passo a passo do que clicar/olhar no preview.
     Mudança visual? Diga o que conferir no desktop E no celular. -->

## Checklist de segurança e qualidade

- [ ] `node teste-online.mjs` verde (~95 checagens)
- [ ] `npm run checar` verde
- [ ] Varredura de segredos no diff (nada de `service_role`/chaves — só a `anon` pública)
- [ ] Mudança visual? Verificada com screenshot real (skill `verificar-visual`)
- [ ] Esquema v6 do `DADOS` intocado (campos só foram adicionados, nunca renomeados/removidos)
- [ ] "Ler = salvar": quem lê e quem grava o `DADOS` continuam falando o mesmo formato

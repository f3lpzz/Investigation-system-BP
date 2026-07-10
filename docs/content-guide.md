# Guia de conteúdo — como catalogar (playbook)

> Como o material do jogo Blue Prince é organizado e traduzido para o catálogo.
> Estas são **regras de conteúdo** (o que entra na ficha e como), não de infraestrutura.
> As regras rastreáveis correspondentes estão em `business-rules.md` (grupo RN-CONT).

---

## Regra nº 1 — SEM SPOILER (inegociável)

- **Nunca** buscar soluções de enigma, walkthroughs ou respostas. No máximo, a *estrutura/mecânica geral* já conhecida.
- **Nunca** interpretar pistas tentando "resolver" o enigma. O resumo de cada ficha é **neutro**: descreve só o que o texto literalmente diz.
- **Ligações entre pistas:**
  - *Automáticas (factuais, liberadas):* quem é citado onde (personagem) e de qual sala veio.
  - *Manuais (de raciocínio):* só quando **solicitado**. Nunca criadas sozinhas.

## Regra nº 2 — Se faltar dado, PERGUNTAR

Se a informação não tiver tudo que a ficha precisa, **perguntar** antes de preencher. Não inventar nem deduzir. Casos comuns:

- Não dá pra saber **de qual sala** é → perguntar.
- Texto **cortado / ilegível** na foto → avisar e perguntar.
- Dúvida se um nome é **personagem** ou outra coisa → perguntar.
- Ambíguo se é Pista, Carta, Mecânica etc. → perguntar (ou escolher e avisar).

---

## As 5 categorias (campo "tipo")

- `sala` — nome da sala, o que aparece nela, símbolos/detalhes visuais
- `pista` — textos, números, símbolos que parecem significar algo
- `carta` — bilhetes, cartas, panfletos, documentos com texto
- `pessoa` — personagens ou nomes que reaparecem
- `mecanica` — recursos e regras que aparecem escritos nas cartas

## Esquema de uma ficha (em `DADOS.fichas`)

O formato completo e atual está em `data-model.md`. Campos essenciais de conteúdo:

```js
{
  id:          "f1",               // único, sequencial (f1, f2, ...)
  titulo:      "Apelido curto",
  sala:        "Nome da Sala",     // "" se desconhecida -> PERGUNTAR
  personagens: ["Bill"],           // nomes citados
  conexoes:    [],                 // ligações manuais (só quando pedido)
  notas:       "",
  paginas: [
    { imagem:"", original:"Texto em inglês", traducao:"Texto em português", explica:"Resumo neutro", rotulo:"Frente" }
  ]
}
```

## Passo a passo para cada foto recebida

1. **Anexar** a imagem (vai para a nuvem, comprimida).
2. **Transcrever** o texto em inglês (fiel ao original).
3. **Traduzir** para o português (manter o original lado a lado).
4. **Identificar a sala**. Se a foto não disser → **perguntar**.
5. **Resumo neutro** em "explica" (sem adivinhar enigma).
6. **Detectar personagens** citados → preencher "personagens".
7. **Anotar símbolos/números** visuais relevantes.
8. **Criar a ficha** (novo id) em `DADOS.fichas`.
9. Se algo estiver incompleto/ilegível → **perguntar** antes de finalizar.

## Conexões manuais (quando solicitado)

Quando duas fichas se relacionam, adicionar o `id` de uma no array `conexoes` da outra
(de preferência nas duas, pra ligação ficar dos dois lados). Essas viram as **linhas
roxas contínuas** no modo Mapa.

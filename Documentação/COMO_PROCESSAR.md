# Blue Prince — Playbook de processamento

Guia fixo de como o Claude organiza e traduz o material do jogo Blue Prince
para o Felipe. Vale para esta pasta e como referência da skill instalável.

---

## Regra nº 1 — SEM SPOILER (inegociável)

- **Nunca** buscar na internet soluções de enigma, walkthroughs, respostas ou
  conteúdo do jogo. No máximo, consultar a *estrutura/mecânica geral* já conhecida.
- **Nunca** interpretar pistas tentando "resolver" o enigma. O resumo de cada
  ficha é **neutro**: descreve só o que o texto literalmente diz.
- **Ligações entre pistas:**
  - *Automáticas (factuais, liberadas):* quem é citado onde (personagem) e de
    qual sala veio. Não revelam solução.
  - *Manuais (de raciocínio):* só quando o **Felipe pedir**. O Claude nunca
    cria essas ligações sozinho.

## Regra nº 2 — Se faltar dado, PERGUNTAR

Se a informação enviada não tiver tudo que a ficha precisa, **perguntar ao
Felipe** antes de preencher. Não inventar nem deduzir. Casos comuns:

- Não dá pra saber **de qual sala** é → perguntar.
- Texto **cortado / ilegível** na foto → avisar e perguntar.
- Dúvida se um nome é **personagem** ou outra coisa → perguntar.
- Ambíguo se é Pista, Carta, Mecânica etc. → perguntar (ou escolher e avisar).

---

## Onde ficam os arquivos

```
Blue Prince/
├─ painel.html          → o painel visual (abre no navegador)
├─ dados.js             → banco de fichas (o Claude edita este)
├─ imagens/             → as fotos das cartas
└─ COMO_PROCESSAR.md    → este guia
```

## As 5 categorias (campo "tipo")

- `sala` — nome da sala, o que aparece nela, símbolos/detalhes visuais
- `pista` — textos, números, símbolos que parecem significar algo
- `carta` — bilhetes, cartas, panfletos, documentos com texto
- `pessoa` — personagens ou nomes que reaparecem
- `mecanica` — recursos e regras que aparecem escritos nas cartas

## Esquema de uma ficha (em dados.js, dentro de DADOS.fichas)

```js
{
  id:          "f1",               // único, sequencial (f1, f2, ...)
  titulo:      "Apelido curto",
  tipo:        "carta",            // sala|pista|carta|pessoa|mecanica
  imagem:      "imagens/arq.jpg",  // caminho da foto ("" se não houver)
  original:    "Texto em inglês",  // transcrição fiel
  traducao:    "Texto em português",
  explica:     "Resumo neutro do que diz",
  sala:        "Nome da Sala",     // "" se desconhecida → PERGUNTAR
  personagens: ["Bill"],           // nomes citados
  simbolos:    ["3 estrelas"],     // marcas/números/símbolos
  conexoes:    [],                 // ligações manuais (só quando pedido)
  notas:       ""
}
```

## Passo a passo para cada foto recebida

1. **Salvar** a imagem em `imagens/`.
2. **Transcrever** o texto em inglês (fiel ao original).
3. **Traduzir** para o português (manter o original lado a lado na ficha).
4. **Identificar a sala**. Se a foto não disser → **perguntar**.
5. **Resumo neutro** em "explica" (sem adivinhar enigma).
6. **Detectar personagens** citados → preencher "personagens".
7. **Anotar símbolos/números** visuais relevantes.
8. **Criar a ficha** (novo id) e adicioná-la a `DADOS.fichas` em `dados.js`.
9. Se algo estiver incompleto/ilegível → **perguntar** antes de finalizar.
10. Confirmar pro Felipe que a ficha entrou no painel.

## Conexões manuais (quando o Felipe pedir)

Quando ele disser que duas fichas se relacionam, adicionar o `id` de uma no
array `conexoes` da outra (de preferência nas duas, pra ligação ficar dos dois
lados). Essas viram as **linhas roxas contínuas** no modo Mapa.

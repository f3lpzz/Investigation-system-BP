/* Fronteira dos dados: valida antes de tocar no catálogo e reconstrói HTML
   permitido. Nunca executa o JavaScript de um dados.js importado. */
(function () {
  "use strict";
  var listas = [
    "fichas",
    "salas",
    "personagens",
    "colecoes",
    "grupos",
    "teorias",
    "quadros",
    "tipos",
  ];
  var idSeguro = /^[a-zA-Z0-9_-]+$/;
  function htmlSeguro(texto) {
    var origem = document.createElement("template");
    origem.innerHTML = String(texto || "");
    var saida = document.createElement("div");
    var tags = new Set([
      "B",
      "STRONG",
      "I",
      "EM",
      "U",
      "S",
      "STRIKE",
      "BR",
      "P",
      "DIV",
      "UL",
      "OL",
      "LI",
      "BLOCKQUOTE",
      "CODE",
      "PRE",
      "SPAN",
    ]);
    function copiar(node, pai) {
      if (node.nodeType === 3) {
        pai.appendChild(document.createTextNode(node.textContent));
        return;
      }
      if (node.nodeType !== 1) return;
      if (
        [
          "SCRIPT",
          "STYLE",
          "IFRAME",
          "OBJECT",
          "EMBED",
          "SVG",
          "MATH",
          "TEMPLATE",
        ].includes(node.tagName)
      )
        return;
      var alvo = pai;
      if (tags.has(node.tagName)) {
        alvo = document.createElement(node.tagName.toLowerCase());
        if (
          node.tagName === "SPAN" &&
          node.classList.contains("ment") &&
          ["pista", "sala", "pessoa", "grupo", "colecao"].includes(
            node.dataset.kind,
          ) &&
          node.dataset.ref
        ) {
          alvo.className = "ment";
          alvo.contentEditable = "false";
          alvo.dataset.kind = node.dataset.kind;
          alvo.dataset.ref = node.dataset.ref;
        }
        pai.appendChild(alvo);
      }
      Array.from(node.childNodes).forEach(function (filho) {
        copiar(filho, alvo);
      });
    }
    Array.from(origem.content.childNodes).forEach(function (node) {
      copiar(node, saida);
    });
    return saida.innerHTML;
  }
  function falhar(campo) {
    throw new Error(
      "Catálogo inválido: " + campo + ". Nenhum dado foi substituído.",
    );
  }
  function objeto(o, campo) {
    if (!o || typeof o !== "object" || Array.isArray(o)) falhar(campo);
  }
  function validar(o) {
    objeto(o, "objeto principal");
    if (o.version !== undefined && o.version > SCHEMA_VERSION)
      falhar("versão mais nova que este aplicativo");
    listas.forEach(function (k) {
      if (!Array.isArray(o[k])) falhar(k + " deve ser uma lista");
    });
    // Impede chaves especiais, tipos inesperados e valores usados em HTML/CSS.
    function visitar(v, caminho, nivel) {
      if (nivel > 40) falhar("estrutura muito profunda");
      if (!v || typeof v !== "object") return;
      Object.keys(v).forEach(function (k) {
        if (["__proto__", "prototype", "constructor"].includes(k))
          falhar("chave reservada");
        var x = v[k];
        if (["id"].includes(k) && (typeof x !== "string" || !idSeguro.test(x)))
          falhar(caminho + "." + k);
        if (
          [
            "nome",
            "titulo",
            "imagem",
            "texto",
            "original",
            "traducao",
            "rotulo",
            "descricao",
            "notas",
            "explica",
            "sala",
          ].includes(k) &&
          typeof x !== "string"
        )
          falhar(caminho + "." + k);
        if (
          ["x", "y", "w", "h", "s", "deT", "paraT"].includes(k) &&
          (typeof x !== "number" || !Number.isFinite(x))
        )
          falhar(caminho + "." + k);
        if (k === "num" && x !== null && !/^\d+$/.test(String(x)))
          falhar(caminho + ".num");
        if (
          k === "cor" &&
          typeof x === "string" &&
          !/^#[0-9a-f]{3,8}$/i.test(x)
        )
          falhar(caminho + ".cor");
        if (
          [
            "personagens",
            "grupos",
            "conexoes",
            "aliases",
            "categorias",
            "fatos",
          ].includes(k) &&
          caminho !== "dados" &&
          (!Array.isArray(x) ||
            x.some(function (s) {
              return typeof s !== "string";
            }))
        )
          falhar(caminho + "." + k);
        if (
          k === "imagem" &&
          x &&
          !/^(nuvem:|https?:\/\/|data:image\/(png|jpeg|jpg|webp|gif);base64,|imagens\/)/i.test(
            x,
          )
        )
          falhar("endereço de imagem");
        visitar(x, caminho + "." + k, nivel + 1);
      });
    }
    visitar(o, "dados", 0);
    listas.forEach(function (k) {
      o[k].forEach(function (item) {
        objeto(item, k);
      });
    });
    var ids = new Set();
    o.fichas.forEach(function (f) {
      if (!f.id || ids.has(f.id)) falhar("id de ficha ausente ou duplicado");
      ids.add(f.id);
      if (f.paginas !== undefined && !Array.isArray(f.paginas))
        falhar("páginas");
      (f.paginas || []).forEach(function (p) {
        objeto(p, "página");
      });
    });
    o.quadros.forEach(function (q) {
      if (!Array.isArray(q.nodes) || !Array.isArray(q.setas))
        falhar("cartões/barbantes");
      objeto(q.cam, "câmera do quadro");
      q.nodes.forEach(function (n) {
        objeto(n, "cartão");
        if (!n.id || !["texto", "ref"].includes(n.tipo))
          falhar("cartão sem id ou tipo válido");
        if (
          n.tipo === "ref" &&
          !["pista", "sala", "pessoa", "grupo", "colecao"].includes(n.kind)
        )
          falhar("tipo de referência");
        if (n.ref !== undefined && typeof n.ref !== "string")
          falhar("referência do cartão");
      });
      q.setas.forEach(function (s) {
        objeto(s, "barbante");
        [s.de, s.para].forEach(function (p) {
          if (typeof p !== "string" || !/^(seta:)?[a-zA-Z0-9_-]+$/.test(p))
            falhar("ponta do barbante");
        });
      });
    });
    return o;
  }
  function preparar(o) {
    validar(o);
    var copia = JSON.parse(JSON.stringify(o));
    copia.teorias.forEach(function (t) {
      if (t.texto) t.texto = htmlSeguro(t.texto);
    });
    copia.quadros.forEach(function (q) {
      q.nodes.forEach(function (n) {
        if (n.tipo === "texto") n.texto = htmlSeguro(n.texto);
      });
    });
    return copia;
  }
  function ler(texto) {
    var t = String(texto || "").trim();
    var inicio = t.indexOf("{"),
      fim = t.lastIndexOf("}");
    if (inicio < 0 || fim < inicio) falhar("arquivo sem JSON");
    return JSON.parse(t.slice(inicio, fim + 1));
  }
  window.Catalogo = {
    listas: listas,
    validar: validar,
    preparar: preparar,
    ler: ler,
    htmlSeguro: htmlSeguro,
  };
})();

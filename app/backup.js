/* Backup portátil: JSON v6 + arquivos privados, sem depender da conta antiga.
   URLs externas continuam referências. Uma falha aborta a exportação inteira. */
(function () {
  "use strict";
  function imagens(dados) {
    var campos = [];
    function visitar(o) {
      if (!o || typeof o !== "object") return;
      Object.keys(o).forEach(function (k) {
        if (k === "imagem" && typeof o[k] === "string" && o[k])
          campos.push({ obj: o, campo: k });
        else if (o[k] && typeof o[k] === "object") visitar(o[k]);
      });
    }
    visitar(dados);
    return campos;
  }
  function dataURL(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(r.result);
      };
      r.onerror = function () {
        reject(new Error("Falha ao ler uma imagem do backup"));
      };
      r.readAsDataURL(blob);
    });
  }
  function blobDe(url) {
    var m =
      /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([a-zA-Z0-9+/]*={0,2})$/.exec(
        url,
      );
    if (!m) throw new Error("Imagem inválida no backup");
    var bin = atob(m[2]),
      bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: m[1] });
  }
  async function criar(dados, storage) {
    var copia = window.Catalogo.preparar(dados),
      arquivos = {};
    for (var c of imagens(copia)) {
      var valor = c.obj[c.campo];
      if (valor.indexOf("nuvem:") !== 0 || arquivos[valor]) continue;
      var r = await storage.download(valor.slice(6));
      if (r.error || !r.data)
        throw (
          r.error ||
          new Error("Não consegui baixar uma imagem. Tente exportar novamente.")
        );
      var url = await dataURL(r.data);
      blobDe(url); // valida o tipo antes de produzir um backup restaurável
      arquivos[valor] = url;
    }
    return {
      formato: "magnify-backup",
      versao: 1,
      dados: copia,
      imagens: arquivos,
    };
  }
  async function restaurar(documento, uid, storage) {
    var completo = documento.formato === "magnify-backup";
    if (completo && documento.versao !== 1)
      throw new Error("Versão de backup não suportada");
    var copia = window.Catalogo.preparar(
      completo ? documento.dados : documento,
    );
    var arquivos = completo ? documento.imagens : {};
    if (!arquivos || typeof arquivos !== "object" || Array.isArray(arquivos))
      throw new Error("Lista de imagens inválida");
    var campos = imagens(copia),
      fontes = new Map(),
      enviados = new Map();
    // Valida TODAS as referências antes do primeiro upload.
    for (var c of campos) {
      var valor = c.obj[c.campo];
      if (valor.indexOf("nuvem:") === 0) {
        if (Object.prototype.hasOwnProperty.call(arquivos, valor))
          fontes.set(valor, blobDe(arquivos[valor]));
        else if (completo || valor.indexOf("nuvem:" + uid + "/") !== 0)
          throw new Error(
            "Este backup não contém uma das imagens. Exporte um backup completo na conta original.",
          );
      } else if (valor.indexOf("data:image/") === 0)
        fontes.set(valor, blobDe(valor));
      else if (valor.indexOf("imagens/") === 0) {
        var resp = await fetch(valor);
        if (!resp.ok) throw new Error("Imagem local ausente: " + valor);
        var local = await resp.blob();
        blobDe(await dataURL(local));
        fontes.set(valor, local);
      }
    }
    var criados = [];
    try {
      for (var entrada of fontes) {
        var caminho =
          uid +
          "/backup-" +
          crypto.randomUUID() +
          "." +
          entrada[1].type.split("/")[1];
        var up = await storage.upload(caminho, entrada[1], {
          contentType: entrada[1].type,
          upsert: false,
        });
        if (up.error) throw up.error;
        criados.push(caminho);
        enviados.set(entrada[0], "nuvem:" + caminho);
      }
    } catch (e) {
      // O catálogo ainda está intacto. A limpeza é apenas dos uploads desta tentativa.
      if (criados.length) await storage.remove(criados).catch(function () {});
      throw e;
    }
    campos.forEach(function (c) {
      if (enviados.has(c.obj[c.campo]))
        c.obj[c.campo] = enviados.get(c.obj[c.campo]);
    });
    return { dados: copia, imagens: enviados.size };
  }
  window.BackupCatalogo = { criar: criar, restaurar: restaurar };
})();

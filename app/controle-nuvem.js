/* Fila de gravação: snapshots imutáveis, confirmação por edição e retry.
   A UI e o Supabase entram por callbacks, permitindo testar rede lenta/falhas. */
(function () {
  "use strict";
  window.ControleNuvem = {
    criar: function (op) {
      var edicao = 0,
        confirmada = 0,
        remoto = op.versao;
      var timer = null,
        emCurso = null,
        encerrado = false,
        conflito = false,
        pausado = false;
      var status = "saved";
      function mostrar(s) {
        status = s;
        if (!encerrado) op.status(s);
      }
      function agendar(ms) {
        clearTimeout(timer);
        if (!encerrado && !conflito && !pausado) timer = setTimeout(salvar, ms);
      }
      async function gravar() {
        while (!encerrado && !conflito && !pausado && confirmada < edicao) {
          var enviada = edicao;
          var snapshot = JSON.parse(JSON.stringify(op.dados()));
          mostrar("saving");
          try {
            var versao = await op.gravar(snapshot, remoto);
            if (encerrado) return false;
            remoto = versao;
            confirmada = enviada;
            if (confirmada === edicao) {
              op.confirmar();
              mostrar("saved");
            }
          } catch (e) {
            if (encerrado) return false;
            conflito = e && e.code === "CONFLITO";
            mostrar(conflito ? "conflito" : "erro");
            if (!conflito) agendar(op.retryMs || 5000);
            return false;
          }
        }
        return !encerrado && !conflito && confirmada === edicao;
      }
      function salvar() {
        clearTimeout(timer);
        if (encerrado || conflito || pausado) return Promise.resolve(false);
        if (!emCurso)
          emCurso = gravar().finally(function () {
            emCurso = null;
          });
        return emCurso;
      }
      return {
        alterar: function () {
          if (encerrado) return;
          edicao++;
          mostrar(conflito ? "conflito" : "saving");
          agendar(op.atrasoMs || 1500);
        },
        salvar: salvar,
        pendente: function () {
          return confirmada < edicao;
        },
        estado: function () {
          return status;
        },
        pausar: async function () {
          pausado = true;
          clearTimeout(timer);
          if (emCurso) await emCurso;
        },
        retomar: function () {
          pausado = false;
          if (confirmada < edicao) agendar(1500);
        },
        encerrar: function () {
          encerrado = true;
          clearTimeout(timer);
        },
      };
    },
  };
})();

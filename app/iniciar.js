/* Inicia somente depois de todos os módulos clássicos carregarem. */
buildChips();
rebuildFilters();
render();
// No modo online quem comanda o início (login -> carregar da nuvem) é a camada online (online.js).
// Sem o modo online, segue o MVP: reconecta o arquivo local e, se não houver, mostra o onboarding.
if (!window.MODO_ONLINE) {
  reconectarAoCarregar()
    .then(function () {
      return lerMtime();
    })
    .then(function (m) {
      if (m) _diskMtime = m;
    })
    .catch(function () {})
    .then(function () {
      atualizarSalvar();
      if (!fileHandle && !DADOS_BROKEN) mostrarOnboard();
    });
}
snapshotDB(true);
histInit();
atualizarSalvar();
if (DADOS_BROKEN) {
  try {
    setAuto(false);
  } catch (e) {}
  abrirRecuperacao();
}
window.addEventListener("focus", async function () {
  try {
    if (fileHandle && autoSave && !DADOS_BROKEN && (await discoMudou()))
      bannerDisco();
  } catch (e) {}
});

/* Deleta o Auth por último: falhas preservam a conta e o catálogo para retry.
   Lista sempre a primeira página após removê-la (offset pularia arquivos).
   Pastas aninhadas também são percorridas. */
export async function excluirDadosDaConta(admin, uid) {
  const storage = admin.storage.from("imagens");
  async function limparPasta(pasta) {
    while (true) {
      const { data, error } = await storage.list(pasta, {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });
      if (error)
        throw new Error(
          "Falha ao listar imagens. Tente apagar novamente: " + error.message,
        );
      if (!data || !data.length) return;
      const arquivos = [];
      for (const item of data) {
        const caminho = pasta + "/" + item.name;
        if (!item.id) await limparPasta(caminho);
        else arquivos.push(caminho);
      }
      if (arquivos.length) {
        const removidos = await storage.remove(arquivos);
        if (removidos.error)
          throw new Error(
            "Falha ao remover imagens. Tente apagar novamente: " +
              removidos.error.message,
          );
      }
    }
  }
  await limparPasta(uid);
  // A FK ON DELETE CASCADE elimina o catálogo junto com o usuário.
  // Não apagar a linha antes: uma falha no Auth deixaria a conta vazia.
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error)
    throw new Error(
      "Falha ao apagar a conta. Tente novamente: " + error.message,
    );
}

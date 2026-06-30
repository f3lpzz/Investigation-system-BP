/* ============================================================
   Configuração PÚBLICA do Supabase (versão online do painel).

   Estas DUAS informações são públicas POR DESIGN — elas vão no
   navegador de todo mundo. Quem protege os dados de cada usuário
   é o RLS (a trava no banco), não o sigilo destas chaves.

   ⛔ NUNCA coloque aqui a chave "service_role" (a secreta).
      Só a URL e a chave "anon" (pública) entram neste arquivo.
   ============================================================ */
window.SUPABASE_URL = "https://gppfzdlqauygzvpodbdh.supabase.co";
window.SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcGZ6ZGxxYXV5Z3p2cG9kYmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzQ4NDgsImV4cCI6MjA5ODM1MDg0OH0.U9obRJiS2Ft_eAKB_H9_Ty7tObzW7ag_pmkBRjA_d7I";

/* Liga o "modo online": faz o app.js entregar o comando do início
   (login -> carregar da nuvem) para a camada online (online.js),
   em vez do fluxo de arquivo local do MVP. */
window.MODO_ONLINE = true;

/* O botão "Apagar minha conta" só aparece quando a Edge Function
   "apagar-conta" estiver publicada no Supabase. Mude para true depois
   de autorizar e publicar a função. */
window.APAGAR_CONTA_ATIVO = false;

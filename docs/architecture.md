# Arquitetura — como as peças se encaixam

## Visão geral

Frontend estático em HTML/CSS/JavaScript, publicado no Cloudflare Pages. Supabase fornece Auth, Postgres, Storage e Edge Functions. Cada conta tem uma linha JSONB com o catálogo v6; imagens privadas ficam na pasta do usuário. O RLS é a fronteira de acesso.

## Módulos do frontend

| Arquivo | Responsabilidade |
|---|---|
| `app.js` | Estado, normalizações legadas, fichas, filtros, histórico e ferramentas locais. |
| `mapa.js` | Grafo, câmera, seleção e navegação no mapa. |
| `quadros.js` | Cartões, barbantes, geometria, ferramentas e menções. |
| `arquivo.js` | Salas, personagens, grupos, diretório e área Conta. |
| `iniciar.js` | Inicializa filtros, renderização e histórico após os módulos. |
| `catalogo.js` | Validação sem mutação e reconstrução de HTML seguro. |
| `controle-nuvem.js` | Fila de snapshots, confirmação por edição, retry e conflitos. |
| `backup.js` | Exportação portátil com bytes das imagens e restauração na conta de destino. |
| `online.js` | Auth, ponte com banco/Storage, importação e avisos de sincronização. |
| `ia.js` | Envio completo das páginas, revisão e processamento em lote. |

São scripts clássicos, compartilhando o escopo atual para preservar os handlers existentes. `painel.html` define a ordem; os testes a leem do mesmo HTML e também verificam a execução arquivo por arquivo. Não há build obrigatório. A separação reduz o tamanho dos arquivos sem introduzir um framework ou reescrever o esquema.

## Carregamento e salvamento

1. Login válido → lê `dados` e `atualizado_em` do próprio usuário.
2. Se a linha não existir, tenta `insert`; se outro aparelho criar primeiro, relê sem sobrescrever.
3. Valida o catálogo inteiro, sobrepõe os dados compartilhados das salas e aplica na memória. Um catálogo inválido permanece intacto na nuvem; o app mostra erro.
4. Cada edição incrementa a revisão local e agenda uma gravação após ~1,5 s.
5. O controlador captura um snapshot imutável e faz `update` filtrando usuário **e versão lida** (`atualizado_em`). O trigger do banco gera uma nova versão monotônica.
6. Uma linha retornada confirma a gravação. Edições surgidas durante o request são gravadas na sequência; “Tudo salvo” só aparece quando todas foram confirmadas.
7. Zero linhas retornadas significa conflito. O app pausa o salvamento e oferece exportar uma cópia ou carregar a versão da nuvem com confirmação.
8. Falha de rede preserva a memória e agenda retry. O logout aguarda a fila e permanece conectado se salvar falhar. Callbacks de uma sessão encerrada não alteram a seguinte.

Não há colaboração em tempo real nem edição offline/PWA. Abrir o catálogo em outro aparelho carrega a última versão; editar simultaneamente é protegido por conflito, sem mesclagem automática. Fechar o navegador à força com alterações pendentes ainda pode perder conteúdo: o app conserva o aviso de saída e permite exportar uma cópia.

## Dados, imagens e backup

O `DADOS` mantém as oito listas v6. Imagens privadas são referenciadas por `nuvem:{uid}/arquivo`; exibição usa URL assinada. O novo backup é um JSON com envelope `magnify-backup`, catálogo e imagens privadas em data URLs. A restauração valida antes de substituir e envia as imagens para a conta de destino. URLs externas continuam referências. Backups legados sem bytes não transferem imagens privadas entre contas.

## Backend e operação

- `supabase/migrations/202609050001_base.sql`: tabelas, RLS e buckets; compatível com instalações feitas pelo guia manual.
- `supabase/migrations/202609050002_concorrencia.sql`: trigger de versão para gravação condicional.
- `apagar-conta`: verifica o token, remove imagens em páginas e subpastas e apaga o Auth por último. A FK elimina o catálogo na mesma exclusão do usuário. Falhas são reportadas e a operação pode ser repetida.
- `ia-processar`: token válido + allowlist no servidor. Segredos ficam exclusivamente nas variáveis de ambiente do Supabase.
- `.github/workflows/verificar.yml`: testes e capturas do Chrome em PRs e branches de trabalho.

A escolha de uma linha JSONB preserva o app atual, mas cada save ainda transfere o catálogo completo. A extração para tabelas por entidade seria uma evolução separada, motivada por medições de volume/latência. A fila evita gravações concorrentes e a comparação de versões protege o trabalho em múltiplos aparelhos.

Deploy e teste real de isolamento continuam sendo responsabilidade do proprietário antes do merge em produção; consulte `deploy.md`, `security.md` e `revisao-confiabilidade.md`.

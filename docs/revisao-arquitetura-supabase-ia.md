# Revisão da arquitetura — Supabase e IA

Revisão feita em 21/09/2026 sobre a branch `online`. Este documento separa o
que foi medido no código, o que foi corrigido nesta revisão e o que só deve ser
feito quando métricas reais justificarem uma migração maior.

## Mapa atual

```text
Navegador (HTML/CSS/JS, Cloudflare Pages)
  ├─ Supabase Auth ─────────────── sessão do usuário
  ├─ PostgREST + RLS
  │    ├─ catalogo_usuario ─────── um JSONB v6 por usuário
  │    ├─ diretorio_salas ─────── leitura compartilhada
  │    └─ ia_cotas ────────────── limite interno da Edge Function
  ├─ Supabase Storage
  │    ├─ imagens/{uid}/... ───── privado, URL assinada
  │    └─ salas/... ───────────── público
  └─ Edge Function ia-processar
       ├─ valida JWT e allowlist
       ├─ valida/limita entrada e consome cota atômica
       └─ OpenAI Responses API ── saída JSON estruturada
```

O catálogo continua deliberadamente como um único documento JSONB. Essa é a
forma de menor risco enquanto o volume cabe confortavelmente numa gravação: o
objeto `DADOS` permanece v6 e “ler = salvar” continua verdadeiro.

## Fluxos importantes

### Login e sincronização

O catálogo pessoal e o diretório compartilhado de salas agora começam a ser
buscados em paralelo. O catálogo é validado antes de entrar na memória. Cada
edição cria um snapshot e a gravação compara `atualizado_em`; o trigger gera a
próxima versão no servidor. Zero linhas atualizadas é conflito, não sucesso.

### Imagens

O upload continua no bucket privado e guarda `nuvem:{uid}/arquivo` no catálogo.
Ao chamar a IA, até três URLs assinadas são geradas em paralelo, na mesma ordem
das páginas. Qualquer página ausente bloqueia a transcrição inteira.

### IA

1. O navegador monta só o contexto necessário e envia o JWT.
2. A Edge Function valida o usuário no Supabase Auth e a allowlist `IA_EMAILS`.
3. A entrada é limitada antes de qualquer chamada paga.
4. `consumir_cota_ia` incrementa, de forma atômica, a janela por usuário e
   receita. Apenas `service_role` pode executar a função.
5. A Edge Function chama `/v1/responses` com JSON Schema estrito, `store:false`,
   identificador pseudônimo, timeout de 120 s e sem ferramentas externas.
6. O resultado é validado; no dossiê, a descrição final é montada por código.
7. O navegador aplica somente depois das verificações de páginas/duplicidade.

## Gargalos encontrados e decisão

| Gargalo | Impacto | Tratamento |
|---|---|---|
| Dossiê enviava até 60 pistas com EN + PT + resumo, potencialmente centenas de milhares de caracteres. | Custo, latência e estouro de contexto. | Limite global de 60 mil caracteres/30 pistas; usa PT e só recorre ao EN quando PT não existe. |
| URLs assinadas eram pedidas uma depois da outra. | Até três latências de Storage somadas. | Geração paralela, preservando a ordem. |
| Lote repetia qualquer erro, inclusive 4xx permanentes, e cancelar não abortava a rede. | Custo duplicado e UX presa. | Retry só para rede/408/5xx; timeout e abort compartilhados com logout, recarga e exclusão. |
| Allowlist era a única proteção de custo. | Uma sessão permitida podia gerar rajadas ilimitadas. | Cota atômica no Postgres, 60 chamadas/hora por receita por padrão, configurável por `IA_LIMITE_HORA`. |
| Edge Function podia esperar até o limite da plataforma sem controle. | Worker ocupado e erro opaco. | Timeout em 120 s, antes do limite de 150 s do plano gratuito. |
| Resposta da IA não tinha telemetria operacional. | Difícil distinguir modelo lento, tokens e falha local. | Log estruturado com receita, duração, modelo, tokens e request id, sem conteúdo nem e-mail. |
| Login buscava catálogo e diretório em série. | Uma viagem extra no caminho crítico. | Consultas iniciadas em paralelo e seleção explícita das colunas do diretório. |
| Todo autosave transfere o JSONB completo. | Cresce linearmente com o catálogo. | Mantido por segurança nesta etapa; medir antes de normalizar. |

## Por que não normalizar o catálogo agora

Separar fichas, páginas, quadros e entidades em tabelas muda quase todos os
fluxos: histórico, importação, backup, conflito e “ler = salvar”. Sem medida de
volume/latência, o custo e o risco superam o ganho. O próximo passo só se
justifica quando a telemetria mostrar, por exemplo, catálogo acima de 2 MB no
p95 ou gravações confirmadas acima de 1,5 s no p95.

Se o limiar for atingido, a migração recomendada é incremental: manter o JSONB
como snapshot compatível, extrair primeiro apenas fichas/páginas para tabelas
com `user_id`, gravar nos dois formatos por uma versão e só então trocar a
leitura. Não fazer uma troca total em um único deploy.

## Limites restantes

- O lote vive no navegador; recarregar a página interrompe a fila. Para lotes
  longos, a evolução correta é uma tabela de jobs + fila durável, não uma Edge
  Function longa.
- O teste local usa Auth/Storage simulados. Isolamento, URLs assinadas, e-mails e
  a chamada real à OpenAI ainda precisam do roteiro de produção com duas contas.
- `diretorio_salas` também existe como fallback estático. A duplicação é útil
  para degradação, mas exige que a geração continue sendo automatizada.

## Operação e implantação

Aplicar primeiro a migração `20260921143824_limitar_uso_ia.sql` e só depois
publicar `ia-processar`; a função falha fechada se a cota não estiver disponível.
`IA_LIMITE_HORA` é opcional (padrão 60, mínimo 1, máximo 10.000). Manter
`OPENAI_API_KEY`, `IA_EMAILS` e `SUPABASE_SERVICE_ROLE_KEY` apenas nos secrets.

Nos logs da função, acompanhar `duracao_ms`, `tokens_entrada`, `tokens_saida` e
`openai_request_id`. Alertar para crescimento sustentado de 429, 502, 503 ou
504; eles representam, respectivamente, cota, provedor, controle de cota e
timeout.

Referências: [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create),
[limites de Edge Functions](https://supabase.com/docs/guides/functions/limits) e
[autorização de Edge Functions](https://supabase.com/docs/guides/functions/auth-headers).

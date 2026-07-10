# Documentação — Blue Prince (Painel de Pistas)

Índice da documentação do sistema. Comece pela visão geral no [README raiz](../README.md).

| Documento | Sobre o que é |
|---|---|
| [`spec.md`](spec.md) | **Especificação**: o que o sistema faz, histórias de usuário e critérios de aceite. O "contrato". |
| [`business-rules.md`](business-rules.md) | **Regras de negócio** rastreáveis (RN-XX-n): o que sempre tem de valer e onde é garantido. |
| [`architecture.md`](architecture.md) | **Arquitetura**: como as peças se encaixam, o fluxo do dado e o porquê das escolhas. |
| [`data-model.md`](data-model.md) | **Modelo de dados**: o objeto `DADOS` (v6), a tabela na nuvem e o SQL. |
| [`deploy.md`](deploy.md) | **Deploy/operação**: do zero ao ar (SQL, Auth, Storage, Cloudflare) e como manter. |
| [`security.md`](security.md) | **Segurança**: chaves, RLS, teste de isolamento. |
| [`privacy.md`](privacy.md) | **Privacidade/LGPD**: coleta mínima, direitos do titular, modelo de política, aviso fan-made. |
| [`testing.md`](testing.md) | **Testes/QA**: como validar cada etapa e os testes de robustez. |
| [`content-guide.md`](content-guide.md) | **Guia de conteúdo**: como catalogar pistas (sem spoiler, transcrição/tradução). |

## Sugestão de leitura

- **Entender o sistema:** `spec.md` → `architecture.md` → `data-model.md`.
- **Mexer no código sem quebrar regras:** `business-rules.md`.
- **Pôr no ar / manter:** `deploy.md` + `security.md` + `privacy.md`.
- **Validar mudanças:** `testing.md`.

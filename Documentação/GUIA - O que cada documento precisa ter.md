# Guia — O que cada documento precisa ter

Para dar bom contexto à IA construir o app online a partir do MVP.
Comece pelos 3 primeiros (são o núcleo pra construir); o resto é pra hora de publicar.

---

## SPEC — o alvo (o mais importante)
- O que é e pra quem, em 1 frase
- O que o usuário faz: criar conta, login, adicionar/editar/excluir fichas, salvar na nuvem, sincronizar entre aparelhos, enviar imagens, exportar, apagar conta
- Regras: cada um só vê o próprio; funciona no Chrome/Edge
- O que **não** entra agora (pra não inventar escopo)
- "Pronto quando": crio conta, cataloguei, saí, voltei em outro aparelho e está tudo lá

## README — porta de entrada
- O que é o projeto, em 2 linhas
- Como rodar o MVP atual (abrir o painel / servidor local)
- Lista dos arquivos (painel, dados, imagens) e o que cada um é
- Estado hoje (local, 1 usuário) e objetivo (online, multiusuário)

## MODELO-DE-DADOS — pra IA não quebrar seus dados
- O objeto `DADOS` v6 e suas listas (fichas, salas, personagens, etc.)
- Os campos de uma ficha (id, título, tipo, imagem, sala, conexões…)
- Regra de ouro: ler e salvar têm que usar o mesmo formato
- Como isso vira nuvem: 1 registro por usuário; imagens guardadas à parte

## ARQUITETURA — como as peças se encaixam
- Hoje: site estático + arquivo de dados na máquina
- Alvo: site estático + Supabase (login, banco, imagens, trava por usuário)
- O caminho do dado: login → carrega da nuvem → salva sozinho
- Por que dessas escolhas (grátis, simples, cada um o seu)

## DEPLOY — pôr no ar e manter
- Criar o projeto Supabase e onde achar a URL + chave pública
- Criar a tabela e ligar a trava de segurança (RLS)
- Ativar login (e-mail/senha ou link no e-mail)
- Publicar o site (GitHub → Cloudflare Pages) e como atualizar
- Como reativar se o Supabase pausar por inatividade

## SEGURANÇA — o que proteger
- Chave pública (pode ir no app) vs secreta (nunca no código/git)
- A trava RLS é o que protege os dados — testar com 2 contas antes de publicar
- Nunca subir senhas/chaves; ativar confirmação de e-mail

## PRIVACIDADE — dados dos usuários (LGPD)
- Que dados coleta (e-mail + catálogo) e pra quê
- Direito de exportar e de apagar conta/dados
- Consentimento no cadastro + e-mail de contato
- Aviso "fan-made" (não oficial), pelo direito autoral do jogo

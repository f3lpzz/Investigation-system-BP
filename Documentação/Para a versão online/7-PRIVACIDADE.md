# PRIVACIDADE — dados dos usuários (LGPD) e direitos do jogo

> O mínimo responsável para guardar dados de outras pessoas no Brasil (LGPD), mais o aviso "fan-made".
> **Isto não é aconselhamento jurídico.** É um ponto de partida prático; se o projeto crescer muito ou virar negócio, procure orientação jurídica de verdade.

---

## 1. Princípio: colete o mínimo

O app deve guardar **só o necessário**:

| Dado | Por que precisa |
|---|---|
| **E-mail** | Login, recuperação de senha, confirmação de conta |
| **Senha** | Só no caso e-mail/senha — guardada **com hash pelo Supabase** (você não vê) |
| **O catálogo** (o `DADOS`) e **imagens** enviadas | É o que o app existe para guardar |

Nada de telemetria, rastreio de terceiros ou coleta extra. Quanto menos dado, menor a responsabilidade.

---

## 2. Onde os dados ficam e quem acessa

- Ficam no **Supabase** (banco Postgres + Storage), backend do projeto.
- **Só o próprio usuário** acessa o seu catálogo e as suas imagens — garantido pelo **RLS** (ver `6-SEGURANCA.md`).
- O administrador do projeto (Felipe) tem acesso técnico ao backend, mas o app não expõe os dados de um usuário a outro.

---

## 3. Direitos do titular (o que o app precisa oferecer)

A LGPD dá ao usuário direitos sobre os próprios dados. Na prática, o app deve ter:

- **Exportar meus dados:** botão que baixa o próprio catálogo (JSON) — serve de backup e cumpre o direito de portabilidade/acesso.
- **Apagar minha conta e meus dados:** botão que remove **a linha do banco**, **as imagens** da pasta do usuário no Storage e **a conta no Auth**. (Apagar no Auth costuma exigir uma Edge Function com a `service_role` — ver `5-DEPLOY.md`/`6-SEGURANCA.md`.)
- **Corrigir/atualizar:** já é natural no app (o usuário edita o próprio catálogo).

Esses dois botões (exportar e apagar) **fazem parte do escopo** (ver `1-SPEC.md` U12 e U14).

---

## 4. Consentimento e contato

- **No cadastro:** um aviso curto + caixa de aceite, com link para a Política de Privacidade. Sugestão de texto:
  > "Ao criar a conta, você concorda com a [Política de Privacidade]. Guardamos seu e-mail (login) e o catálogo que você criar; você pode exportar ou apagar seus dados a qualquer momento."
- **Confirmação de e-mail** ligada (evita cadastrar e-mail de terceiros).
- **Contato de privacidade:** publique um **e-mail** para dúvidas/solicitações (ex.: exclusão). Coloque-o na política.

---

## 5. Aviso "fan-made" e direitos do jogo (Blue Prince)

Blue Prince é um jogo com **direitos autorais de terceiros**. Uma ferramenta **feita por fã**, onde cada usuário cataloga **as próprias capturas e anotações**, tende a ser de baixo risco — mas tome cuidados:

- **Deixe claro no site** que é um projeto **não oficial, feito por fã, sem afiliação** com a desenvolvedora/publicadora do jogo.
- **Não embuta os arquivos do jogo** como parte do app. Prefira que **cada usuário envie as próprias imagens** (vão para a pasta dele no Storage).
- **Imagens da wiki por link (hotlink)** são frágeis e não são suas — não dependa delas no produto público; use no máximo como exemplo.
- Se quiser, verifique a **política de conteúdo de fãs** da publicadora.

Texto sugerido (rodapé do site):
> "Projeto fan-made, não oficial. Sem afiliação com os criadores de Blue Prince. Todas as marcas e imagens do jogo pertencem aos seus respectivos donos."

---

## 6. Modelo de Política de Privacidade (pronto para preencher e publicar)

> Publique como uma página simples no app (e/ou um `PRIVACIDADE.md` no repositório). Preencha os campos entre [colchetes].

---

### Política de Privacidade — Blue Prince (Painel de Pistas)

**Última atualização:** [data]

Este é um projeto **fan-made (não oficial)** para catalogar o jogo Blue Prince. Esta política explica, de forma simples, quais dados coletamos e o que você pode fazer com eles.

**1. Quem somos.** Projeto pessoal mantido por [seu nome/apelido]. Contato: **[seu e-mail de contato]**.

**2. Que dados coletamos.**
- Seu **e-mail** (para login, confirmação e recuperação de senha).
- O **catálogo** que você cria (textos, fichas) e as **imagens** que você envia.
Não coletamos mais do que isso e não usamos rastreadores de terceiros.

**3. Para que usamos.** Exclusivamente para o app funcionar: autenticar você e guardar/sincronizar o **seu** catálogo entre seus aparelhos.

**4. Onde ficam.** Em servidores do **Supabase** (banco de dados e armazenamento de imagens). Cada usuário só acessa os próprios dados (proteção por RLS).

**5. Compartilhamento.** **Não vendemos nem compartilhamos** seus dados. Eles ficam restritos a você.

**6. Seus direitos.** Você pode, dentro do app, a qualquer momento:
- **Exportar** seus dados (baixar uma cópia);
- **Apagar** sua conta e todos os seus dados (catálogo, imagens e login).
Para outras solicitações, escreva para [seu e-mail de contato].

**7. Segurança.** Senhas são guardadas com hash pelo provedor de login; o acesso aos dados é restrito por usuário. Ainda assim, nenhum sistema é 100% infalível.

**8. Crianças.** O serviço não é direcionado a menores de [idade]. 

**9. Mudanças.** Podemos atualizar esta política; a data no topo indica a última versão.

**10. Aviso de marca.** Projeto não oficial, sem afiliação com os criadores de Blue Prince. Marcas e imagens do jogo pertencem aos respectivos donos.

---

## 7. Checklist LGPD (marque antes de publicar)

- [ ] Política de Privacidade publicada (página no app + arquivo no repositório).
- [ ] Aviso **fan-made** visível no site.
- [ ] Caixa de **consentimento** + link para a política no cadastro.
- [ ] **Confirmação de e-mail** ligada.
- [ ] Botões **Exportar** e **Apagar conta/dados** funcionando (testados).
- [ ] **E-mail de contato** de privacidade publicado.
- [ ] Coleta mínima confirmada (só e-mail + catálogo; sem rastreadores).

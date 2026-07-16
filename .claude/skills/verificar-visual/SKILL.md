---
name: verificar-visual
description: Verifica mudança visual do app no render real — sobe o servidor de captura, tira screenshot no Chrome headless e compara com o modelo de design. Use SEMPRE que alterar CSS/HTML/JS que afete a tela, antes de dizer que "está pronto" ou fiel ao design. Também para medir vazamento de largura (responsividade).
---

# Verificar mudança visual no render real

**Regra de ouro: screenshot ou não aconteceu.** Sondar CSS computado, teste
headless (jsdom) ou HTTP 200 já causaram erro grave neste projeto (regra
`.drawer` morta, minimapa azul vindo de SVG inline). Falha ao capturar é
sinal de PARE e investigue — nunca de "verifico de outro jeito".

## 1. Subir o servidor de captura (1x por sessão)

```powershell
# PowerShell (o node precisa do PATH recarregado):
$m=[Environment]::GetEnvironmentVariable("Path","Machine"); $u=[Environment]::GetEnvironmentVariable("Path","User"); $env:Path="$m;$u"
Start-Process node -ArgumentList "servidor-visual.mjs" -WorkingDirectory "C:\Users\T-GAMER\Desktop\Blue Prince\tools" -WindowStyle Hidden
```

- Serve `app/` em `http://localhost:4599/painel.html`.
- `?seed=<vista>` injeta os dados do modelo e pula o login. Vistas:
  `grade`, `detalhe`, `teorias`, `mapa`, `conta`, `arquivo-salas`,
  `arquivo-pessoas`, `dossie-sala`, `grade-filtros`.
- **Editou o servidor? Reinicie o processo node** — o seed fica em memória:
  ```powershell
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*servidor-visual*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  ```
- Gotcha do app: `DADOS` é `const` (não está em `window`) — código injetado
  referencia `DADOS`/`setView` direto.

## 2. Capturar (Git Bash)

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --hide-scrollbars --window-size=1240,820 --screenshot=SAIDA.png \
  --virtual-time-budget=8000 "http://localhost:4599/painel.html?seed=grade"
```

- Salve em arquivo (ex.: no scratchpad da sessão) e **abra o PNG com Read**.
- Larguras de referência: desktop **1240×820**, celular **500×900**.
- **Piso do Windows:** a janela do Chrome não fica com menos de ~500px de
  largura. Pedir 390px corta a imagem e PARECE vazamento sem ser — não
  acredite em captura menor que 500. `--force-device-scale-factor` NÃO
  reduz o viewport CSS.
- O exit code 255 do Chrome é ruído; o que vale é a linha "bytes written".

## 3. Medir vazamento de largura (responsividade)

Use a vista `<vista>-diag` (ex.: `grade-diag`) e leia o `<title>`:

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless --disable-gpu \
  --window-size=780,900 --virtual-time-budget=8000 --dump-dom \
  "http://localhost:4599/painel.html?seed=grade-diag" > dom.txt 2>/dev/null
grep -o "<title>[^<]*</title>" dom.txt
```

- `SCROLLW > VW` = vazamento real; o título lista os elementos culpados.
- Teste 780 e 1000 além do desktop — a topbar já estourou entre 700–900px.
- O Browser pane do Claude bloqueia localhost; por isso o truque do title.

## 4. Comparar com o modelo de design

- Fonte da verdade: "Design de novo sistema.zip" (Downloads do Felipe) =
  projeto do Claude Design "Novo Design - Arquivo do Detetive".
- Compare lado a lado: screenshot do app × imagem/HTML da seção do modelo.
  Extraia valores exatos (cores, px) do HTML do modelo, não de memória.
- Não repinte por cima: porte a ESTRUTURA do modelo (ordem do usuário).

## 5. Pegadinhas de edição que afetam a verificação

- `estilos.css`/`online.css` usam **CRLF**: scripts Node de replace devem
  normalizar `\r\n → \n` antes e devolver CRLF ao salvar.
- Cores do tema antigo (azul-marinho `#0a1428`, `#0b1730`, `#5b8def`,
  `#9fc0ff`…) podem estar em **JS inline (SVG)**, não só no CSS.

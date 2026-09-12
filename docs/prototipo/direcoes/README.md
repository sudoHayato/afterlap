# Três direções visuais (sessão 11, Fase 4 parte 2)

O fluxo da sessão 10 fica (marca, ficha ao premir, passadeira por ritmo ou distância, modelos, apagar). O visual desenhou-se de novo, a partir da fórmula que o fundador pediu: fundo claro, tinta quase preta, um acento quente e forte, números grandes, contraste alto. O acento do Bricklap é o **terracota**, ligado ao nome. Nada do laranja do Strava, dos seus ícones, tipografia ou layouts.

Dois ecrãs, três direções, o mesmo conteúdo de exemplo (o 5×5 do fundador, série 3 em curso; e o resumo dessa sessão com três blocos por preencher). O markup é idêntico nos três ficheiros; só os tokens de tema e a atribuição de tema a cada ecrã mudam, para se compararem em igualdade.

| | Direção | Ficheiro | Capturas |
|---|---|---|---|
| **A** | **Claro em todo o lado.** Fundo branco-quente, tinta quase preta, acento terracota, na gravação e na consulta. É a leitura mais direta da fórmula pedida. | [a.html](a.html) | [gravação](capturas/a-gravacao.png) · [ficha](capturas/a-ficha.png) · [resumo](capturas/a-resumo.png) · [resumo inteiro](capturas/a-resumo-inteiro.png) |
| **B** | **Híbrido.** Consulta (resumo, histórico) clara; gravação escura, para ler ao sol e poupar OLED durante o treino. O mesmo acento nos dois temas. | [b.html](b.html) | [gravação](capturas/b-gravacao.png) · [ficha](capturas/b-ficha.png) · [resumo](capturas/b-resumo.png) · [resumo inteiro](capturas/b-resumo-inteiro.png) |
| **C** | **Escuro em todo o lado.** Fundo quase preto quente, tinta clara, o mesmo acento. Para o fundador comparar com a app atual, que é escura. | [c.html](c.html) | [gravação](capturas/c-gravacao.png) · [ficha](capturas/c-ficha.png) · [resumo](capturas/c-resumo.png) · [resumo inteiro](capturas/c-resumo-inteiro.png) |

Cada ficheiro abre do disco e mostra os três ecrãs lado a lado (precisa de internet para a fonte). Com `?ecra=gravacao`, `?ecra=ficha` ou `?ecra=resumo` mostra um ecrã a cheio, à altura da janela: é assim que as capturas são tiradas.

## Paleta

Tema claro (A inteira; consulta de B):

| Papel | Hex |
|---|---|
| Fundo | `#FBF8F4` |
| Superfície (cartões, folha) | `#FFFFFF` |
| Superfície 2 (pílulas, botões de passo, segmentos) | `#F3EEE7` |
| Linha | `#E6DFD6` |
| Tinta | `#16120F` |
| Tinta 2 (secundária) | `#5A524B` |
| Tinta 3 (rótulos) | `#948A81` |
| **Acento (terracota)** | **`#B8432A`** |
| Acento premido | `#963321` |
| Acento em texto sobre o fundo | `#A33A22` |
| Acento em fundo (cartão "por preencher") | `#F8E7E1` |

Tema escuro (C inteira; gravação de B):

| Papel | Hex |
|---|---|
| Fundo | `#121010` |
| Superfície | `#1C1917` |
| Superfície 2 | `#272220` |
| Linha | `#332D2A` |
| Tinta | `#F7F2EC` |
| Tinta 2 | `#B5ABA2` |
| Tinta 3 | `#776E67` |
| **Acento (terracota)** | **`#C94D31`** |
| Acento premido | `#A83D25` |
| Acento em texto sobre o fundo | `#F0836A` |
| Acento em fundo | `#3A1F18` |

Cor por desporto, discreta (uma barra de 3–5 px ou o ícone, nunca blocos): força `#6B4E3D` / `#B08A76`, passadeira `#2F6A94` / `#6FA6CF`, remo `#1F8079` / `#5FBDB4`, rua `#4E8A3C` / `#8AC176` (claro / escuro).

## Fonte

**Inter** (Google Fonts, licença OFL), pesos 400 a 900, com números tabulares (`tnum`) em tudo o que conta. Escolhida porque tem uma escala de pesos larga para a hierarquia pedida (o cronómetro a 800, os rótulos a 700 em maiúsculas pequenas, o texto a 500), números tabulares de série para o cronómetro não saltar, e lê-se bem em tamanhos pequenos num ecrã de telemóvel. Carrega de `fonts.googleapis.com`; sem internet cai para a fonte do sistema. Na app real embute-se o ficheiro.

## Hierarquia e estrutura (comuns às três)

- **Gravação**: o cronómetro total (96 px) puxa o olho primeiro; o botão **Marca** (104 px de altura, o único bloco de acento no ecrã) é o segundo. O bloco atual é um cartão com barra da cor do desporto, nome a 30 px e tempo do bloco a 40 px. As três últimas marcas em lista. Mudar e Parar com 56 px, sem acento (Parar em texto terracota).
- **Ficha rápida**: folha sobre a gravação, cabeçalho com o exercício, chips para trocar, dois campos com −/+ de 56 px, Guardar em acento.
- **Resumo**: o total (76 px) primeiro; o cartão "3 blocos por preencher", em fundo de acento e com o botão Preencher, segundo. A frase-parágrafo desapareceu: um cartão por exercício com o número principal à direita ("5×10", "2,0 km", "2 000 m") e o detalhe por baixo ("80–85 kg", "4 × 0,5 km @ 5:30"); o que falta em texto de acento dentro do cartão. Notas a seguir. A linha do tempo **por série** mantém-se, com rótulos dentro dos segmentos (largura proporcional ao tempo), a barra da cor do desporto, os blocos por preencher tracejados e com "?", e legenda com ícones.
- **Ícones** originais de linha, SVG inline, traço 2: força (barra com discos), passadeira (tapete com consola), remo (carril com banco e cabo), rua (traçado com dois pontos), marca (bandeira), mudar (setas), parar (quadrado), relógio, aviso, editar, voltar, notas.

## Como as capturas foram tiradas

Chrome do Windows em modo headless, a partir do WSL, escala 2 (PNG de 780 px de largura para 390 px lógicos):

```bash
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --hide-scrollbars --window-size=390,844 --force-device-scale-factor=2 --virtual-time-budget=6000 --screenshot="\\wsl.localhost\Ubuntu\<caminho>\capturas\a-gravacao.png" "file://wsl.localhost/Ubuntu/<caminho>/a.html?ecra=gravacao"
```

`--virtual-time-budget` dá tempo à fonte de chegar antes da captura. O "resumo inteiro" usa `--window-size=390,1600`, porque o resumo rola e a linha do tempo por série fica abaixo da dobra a 844 px.

Se o headless falhar noutra máquina: abrir `a.html?ecra=resumo` no Chrome, F12, Ctrl+Shift+M (modo dispositivo, 390×844), e no menu "⋮" do painel de dispositivo escolher "Capture screenshot" (ou "Capture full size screenshot" para o resumo inteiro).

## Três perguntas fechadas para o fundador

1. **Tema**: A (claro), B (híbrido: gravação escura, consulta clara) ou C (escuro)?
2. **Acento**: o terracota `#B8432A` é o vermelho-tijolo certo, ou quer mais vermelho (`#B03A2A`) ou mais laranja-terra (`#C2552B`)?
3. **Resumo**: os cartões por exercício com o número grande à direita substituem a frase, ou quer a frase de volta por cima dos cartões, como resumo de uma linha?

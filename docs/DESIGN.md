# Sistema visual do Bricklap

Documento vivo. É este documento que a implementação na app Android segue; o protótipo em [docs/prototipo/bricklap.html](prototipo/bricklap.html) é a sua primeira aplicação completa, nos nove ecrãs. Decidido na sessão 12 (2026-09-12) a partir da direção do fundador: fundo claro, tinta quase preta, **um** acento quente e forte, números grandes, contraste alto — sem copiar nada de nenhuma app de treino.

Quando houver conflito entre este documento e o protótipo, manda este documento.

## 1. Tema: escolha do atleta

Decisão do fundador (sessão 12): o tema é uma **preferência do atleta**, com três presets e a opção de seguir o sistema. Não há personalização livre de cores nem de tipografia.

| Preset | Treino (gravação) | Consulta (tudo o resto) |
|---|---|---|
| Claro | claro | claro |
| Escuro | escuro | escuro |
| **Híbrido (predefinido)** | **escuro** | **claro** |
| Seguir o sistema | segue `prefers-color-scheme` | idem |

**Porque o híbrido é o predefinido**, por ordem de peso:

1. **Legibilidade em treino.** O ecrã de gravação vê-se de relance, ao sol, com suor e com o braço em movimento: números claros sobre fundo escuro perdem menos com reflexos e brilho alto, e o cronómetro fica a única coisa luminosa no ecrã.
2. **Bateria.** O painel do telemóvel do fundador é OLED e a gravação é o único ecrã que fica minutos ligado durante o treino; um fundo quase preto gasta menos.
3. **Assinatura.** A app não se parece com nenhuma outra na única altura em que é usada em público — no ginásio, entre séries.

A consulta fica clara porque o histórico e o resumo lêem-se sentado, com tempo, e uma superfície clara com tinta quase preta é mais rápida a ler em texto corrido e em tabelas.

Regra de implementação: o tema é decidido **por ecrã**, não pela app. Uma função única recebe o ecrã e devolve `claro` ou `escuro`; nenhum componente sabe qual dos presets está ativo. No protótipo é `temaDoEcra(screen)`, com o conjunto `TREINO` a dizer quais são os ecrãs de treino.

## 2. Cor

Dois conjuntos de tokens. Nenhum componente usa um hex diretamente: usa sempre o token.

### Tema claro

| Token | Hex | Onde |
|---|---|---|
| `fundo` | `#FBF8F4` | fundo do ecrã |
| `sup` | `#FFFFFF` | cartões, folha, barra de separadores |
| `sup2` | `#F2ECE4` | pílulas, botões −/+, campos |
| `linha` | `#E6DFD6` | contornos e separadores |
| `tinta` | `#16120F` | texto principal |
| `tinta2` | `#5A524B` | texto secundário |
| `tinta3` | `#948A81` | rótulos em maiúsculas, ícones inertes |
| **`acento`** | **`#B03A2A`** | botão Marca, botões de ação, estado ativo |
| `acento-premido` | `#96301E` | acento enquanto se prime |
| `acento-tinta` | `#9A3122` | acento em **texto** sobre fundo claro |
| `acento-fundo` | `#F9EBE9` | fundo do que está por preencher |
| `sobre-acento` | `#FFFFFF` | texto sobre o acento |
| `junta` | `rgba(255,253,250,.72)` | o vinco da fiada |

### Tema escuro

| Token | Hex | Onde |
|---|---|---|
| `fundo` | `#121010` | fundo do ecrã |
| `sup` | `#1C1917` | cartões, folha |
| `sup2` | `#272220` | pílulas, botões −/+ |
| `linha` | `#332D2A` | contornos |
| `tinta` | `#F7F2EC` | texto principal |
| `tinta2` | `#B5ABA2` | texto secundário |
| `tinta3` | `#7A716A` | rótulos |
| **`acento`** | **`#D14F3D`** | o mesmo papel do `#B03A2A` claro |
| `acento-premido` | `#B03A2A` | |
| `acento-tinta` | `#E88073` | acento em texto sobre fundo escuro |
| `acento-fundo` | `#341714` | por preencher |
| `sobre-acento` | `#FFFFFF` | texto sobre o acento |
| `junta` | `rgba(14,12,12,.76)` | o vinco da fiada |

O acento é **vermelho-tijolo (terracota)**, matiz 7°, ligado ao nome do produto. O `#D14F3D` do tema escuro é o mesmo matiz e a mesma saturação do `#B03A2A`, com a luminosidade subida para manter o contraste: é o **mesmo acento**, calibrado, não uma segunda cor.

Contrastes medidos (WCAG 2.1, sobre o `fundo` do respetivo tema):

| Par | Razão |
|---|---|
| `tinta` / `fundo` (claro) | 17,6:1 |
| `tinta2` / `fundo` (claro) | 7,2:1 |
| `acento` / `fundo` (claro) | 5,7:1 |
| `sobre-acento` / `acento` (claro) | 6,0:1 |
| `tinta` / `fundo` (escuro) | 17,0:1 |
| `tinta2` / `fundo` (escuro) | 8,4:1 |
| `acento-tinta` / `fundo` (escuro) | 7,0:1 |
| `sobre-acento` / `acento` (escuro) | 4,1:1 (só em texto ≥ 24 px, que é o único uso: o botão Marca) |

`tinta3` fica em 3,2:1 (claro) e 4,0:1 (escuro): **só** para rótulos em maiúsculas pequenas e ícones decorativos, nunca para texto que tenha de ser lido.

### Cor por desporto

Identifica, não decora, e aparece em **dois sítios apenas**: o **ícone** do desporto e o troço de **fiada**. Nunca como fundo de um bloco, nunca em texto, e — desde a sessão 13b — **nunca como barra vertical na lateral de um cartão**: o ícone já identifica o bloco, e a barra era decoração a fingir que era dado (decisão do fundador, com o CTO de acordo).

| Desporto | Claro | Escuro |
|---|---|---|
| Força | `#6B4E3D` | `#C49A82` |
| Passadeira | `#2F6A94` | `#7FB2D9` |
| Remo indoor / Natação | `#1F8079` | `#5FBDB4` |
| Rua (corrida, caminhada) | `#4E8A3C` | `#8AC176` |
| Bicicleta | `#9A6A1E` | `#D9AE5E` |
| Transição | `#7C756B` | `#A9A199` |

## 3. Tipografia

Duas famílias, ambas de licença aberta, servidas pelo Google Fonts no protótipo e **embutidas** na app.

- **Texto: Inter**, pesos 400/500/600/700/800. Tudo o que é palavra: rótulos, nomes, explicações, botões.
- **Números: Archivo**, instância **Expanded** (eixo `wdth` 125), pesos 600/700/800/900, com `tabular-nums`. Tudo o que é medida: cronómetro, tempo de bloco, totais, valores dos cartões, número de série, distâncias, cargas.

**Porque Archivo Expanded.** Decisão do fundador na sessão 13a. A sessão 12 tinha proposto a Anybody Expanded pelos dígitos de formas quadradas, que em corpo grande parecem tijolos; o fundador viu-a aplicada e achou-a **robótica**, e tem razão: as contraformas fechadas e os terminais a esquadro dão ao cronómetro um ar de mostrador de máquina, que é precisamente o que a app não é. A **Archivo Expanded** mantém a largura e o peso que o cronómetro de 84 px precisa, com formas humanistas e contraformas abertas — sóbria sem ser fria. A comparação foi feita **nos ecrãs reais**, não num espécime: [gravação](prototipo/capturas/fonte-gravacao.png) e [resumo](prototipo/capturas/fonte-resumo.png), a mesma sessão, só a fonte a mudar.

A identidade não estava na fonte: está na fiada, nos ícones, no acento e na estrutura dos ecrãs (§7). Trocar os dígitos não tira ao Bricklap nada do que o distingue.

Medido, não suposto: a Archivo Expanded serve mesmo números tabulares — `00:00`, `11:11` e `88:88` medem os mesmos **291,66 px** a 84/800; sem `tnum` seriam 293,00 e 265,11, e o cronómetro saltaria a cada segundo. É também **6 % mais estreita** do que a Anybody (308,80 px), o que dá folga ao cronómetro num ecrã de 390 px.

Implementação na app: descarregar as instâncias estáticas `Archivo Expanded` nos pesos 600/700/800/900 (`wdth` 125); não depender do eixo variável em React Native. O Google Fonts serve as quatro faces a `stretch 125%` — verificado com `document.fonts.check`.

Escala (px), a mesma nos dois temas:

| Papel | Tamanho / peso |
|---|---|
| Cronómetro da gravação | 84 / 800, `letter-spacing -.035em` |
| Total de uma sessão | 72 / 800 |
| Tempo do bloco atual | 38 / 700 |
| Nome do bloco atual, rótulo do botão Marca | 28–29 / 800 |
| Título de ecrã | 27 / 800 |
| Valor principal de um cartão de exercício | 25 / 800 |
| Métrica secundária (distância, ritmo em treino) | 22 / 800 |
| Botão | 17 / 700 |
| Nome em lista, campo de ficha | 15–15,5 / 600–700 |
| Texto secundário, detalhe de cartão | 12,5–13,5 / 500–600 |
| Rótulo em maiúsculas (`kicker`) | 11 / 700, `letter-spacing .1em` |

Regras: números **nunca** em Inter; palavras **nunca** em Archivo; uma só coisa por ecrã acima de 40 px.

A abreviatura da unidade que pertence ao número (`km`, `m`, `kg`, `/km`, `reps`) fica **dentro** da corrida de Archivo: é parte da medida, não texto — `2 000 m` e `5:30 /km` lêem-se como uma coisa só. Palavras que descrevem a medida ("passadeira", "em movimento", "última vez") são Inter.

## 4. Espaçamento, raios, alvos

- Escala de espaçamento: **4, 8, 12, 16, 20, 24, 32**. Margem lateral dos ecrãs: 20.
- Raios: 8 (pequeno), 12 (botão, linha de tabela), 16 (cartão), 20 (botão Marca), 24 (folha), 999 (pílula, chip).
- Alvos de toque: **56 px** para tudo o que se toca durante o treino (botões, −/+, chips da ficha); 44 px para ações de consulta; o **botão Marca tem 108 px** e ocupa a largura toda.
- Um ecrã de treino nunca tem mais de três alvos: Marca, Mudar, Parar.

## 5. Ícones

Originais, desenhados para o Bricklap. Traço de **2 px**, extremos e junções redondos, grelha de 24×24, sem preenchimento, herdam a cor do texto (`currentColor`). São SVG inline, um `<symbol>` por ícone.

- **Desportos** — descrevem o aparelho, não a pessoa: força (barra com dois discos), passadeira (tapete com consola inclinada), remo indoor (carril com banco e cabo), natação (duas ondas), corrida (percurso angular com dois pontos), caminhada (percurso curvo com dois pontos), bicicleta (duas rodas e quadro), transição (duas setas em sentidos opostos).
- **Ações** — marca (bandeira num mastro), mudar, parar (quadrado), relógio, aviso, editar, voltar, notas, mais, menos, cima, baixo, fechar, apagar, certo.
- **Navegação** — repetem o motivo do produto: início é **um tijolo** (retângulo com a junta a meio e as juntas da fiada de baixo desencontradas), histórico são **três fiadas** de segmentos desencontrados, modelos são duas fiadas sobrepostas, definições são três reguladores sobre linhas.

Não usar ícone para: o nome de um exercício de força (o nome é o nome), o estado "por preencher" (é cor e texto), nem decoração em cartões de consulta.

## 6. Componentes

**Botão.** Altura 56 (44 em consulta), raio 12, contorno de 1,5 px em `linha`, fundo `sup`. Variantes: `acento` (fundo de acento, texto branco) — no máximo **um** por ecrã; `fantasma` (sem fundo nem contorno, texto `tinta2`) para ações de saída; `perigo` (texto `acento-tinta`) para Parar e Apagar. Ícone à esquerda do rótulo, 22 px.

**Botão Marca.** 108 px de altura, largura total, raio 20, fundo de acento, sombra de acento a 26 %. Rótulo a 29/800 com a bandeira, e uma linha de 12,5 px por baixo a dizer o que faz o toque longo e qual é o bloco seguinte. Toque = marca; **premir 0,5 s** = marca + ficha, com uma barra branca a 16 % a encher durante o gesto. Parar usa o mesmo gesto a 0,8 s, com a barra em acento a 16 %.

**Cartão.** Fundo `sup`, contorno `linha`, raio 16, sombra dupla suave, folga interior de 16. **Sem barra de cor na lateral** — um cartão que representa um bloco identifica-se pelo ícone do desporto, à esquerda do nome, e por mais nada.

**Chip.** Pílula de 40 px (56 na ficha), contorno `linha`; ativo = fundo `tinta`, texto `fundo`. Serve para escolher o exercício e para alternar entre ritmo e distância.

**Ficha rápida (folha).** Sobe do fundo, raio 24 em cima, pega de 36×4, até 93 % da altura. Cabeça com ícone do desporto + nome do bloco e uma linha de contexto ("Série 3 · 1:28 · o relógio já conta a passadeira"). No máximo **três campos**; cada campo é rótulo à esquerda e −/+ de 56 px com o valor a 29/800 à direita; um campo **calculado** mostra o valor sem controlo e diz de onde vem. Rodapé: "Depois" (fantasma) e "Guardar" (acento).

**Tabela de séries (expansível).** Substitui a "parede de tijolos" da sessão 10, que era ilegível. Cada série é uma linha fechada com: número da série, **fiada** proporcional ao tempo de cada bloco, tempo total da série, selo de acento com o número de blocos por preencher, e seta. Aberta, mostra uma linha por bloco: `ícone + nome` | `valor` | `tempo`; um bloco por preencher mostra no lugar do valor um botão tracejado **Preencher** em acento, que abre a ficha desse bloco. Sessões HIIT e de um só desporto não têm séries: mostram a lista plana de blocos, com a mesma linha. Numa volta de HIIT não há nada a preencher — a linha mostra só nome e tempo, e a sessão não conta blocos em falta (o atleta descreve o treino nas notas).

**Cartão "por preencher".** Um aviso **útil**, não um alarme (redesenhado na sessão 13b; antes era um retângulo de acento com o texto todo em vermelho e o botão encostado ao título). Fundo `acento-fundo`, sem contorno, raio 16, folga de 16/20. Quatro linhas, por esta ordem, que é a hierarquia: rótulo em maiúsculas `Por preencher` em `acento-tinta` com o ícone de aviso; **o que falta** a 16,5/800 em `tinta` — tinta normal, não acento; o **detalhe** a 13/500 em `tinta2`, a listar quais; e a **ação** numa linha só dela, alinhada à direita, com largura mínima de 140 px e 44 de altura. O acento fica no rótulo, no ícone e no botão, e mais nada.

O fundo tingido mantém-se de propósito: o resumo é uma pilha de cartões `sup` com contorno, e um aviso desenhado como eles camufla-se justamente naquilo que exige ação. Foi a razão de escolher este tratamento em vez de um em superfície normal ([comparativa](prototipo/capturas/aviso-tratamentos.png)).

**Cartão de exercício (resumo).** Nome com ícone à esquerda, valor principal grande à direita (`5×10`, `2,0 km`, `2 000 m`), detalhe por baixo do valor (`80–85 kg`, `4 × 0,5 km @ 5:30`) e, quando falta algo, uma linha em `acento-tinta` a dizer o quê. A frase-parágrafo do protótipo da sessão 10 **não volta** (fica reservada para texto de partilha).

**Seletor de tema.** Quatro opções, uma por linha: amostra (dois retângulos, treino e consulta, mais um fio de acento), nome, explicação de uma linha, e visto em acento na ativa. A predefinida traz a etiqueta "predefinido".

**Separadores de fundo.** Três: Início, Histórico, Modelos, com ícone e rótulo de 11,5 px; o ativo em `acento-tinta`. Definições entram pelo canto do ecrã inicial, não por separador.

## 7. Identidade: a fiada, os números, os ícones

O que faz um ecrã ser do Bricklap e de mais nenhuma app, por ordem de importância:

1. **A fiada** — uma **barra fina contínua de cantos arredondados**, **5 px** (7 quando é o total da sessão), desenhada a **72 % de opacidade** e sem contorno nem sombra, um troço por bloco, largura proporcional ao tempo, cor do desporto. É **contexto, não protagonista**: afinada na sessão 13b porque ainda se lia como um gráfico de barras. Aparece: sob o cronómetro durante a gravação (a sessão até agora, a crescer com cada marca), em cada linha da tabela de séries, em cada cartão do histórico e em cada cartão de modelo. É o mesmo objeto nos quatro sítios, e é sempre **dado**, nunca ornamento: nunca aparece sozinha sem rótulo nem tempo ao lado — foi isso que afundou a "parede" da sessão 10.

   **Como se desenha** (redesenhada na sessão 13a; a versão da sessão 12 eram segmentos separados por 2 px de argamassa, que o fundador rejeitou por dura e por parecer uma grelha):
   - **São as cores que separam os blocos**, não a argamassa: entre dois troços de cor diferente há uma transição curta (no máximo 2,2 pontos percentuais da largura da barra, e nunca mais de 45 % do troço mais curto que lhe toca).
   - **A junta** — **1 px** do token `junta`, um **vinco** da cor do fundo e não um corte — aparece **só onde a cor não muda**, que é o único sítio onde sem ela se perdia um bloco (força a seguir a força). É a exceção, não a regra: numa sessão de 25 blocos há três ou quatro juntas, não vinte e quatro. A 1,5 px e opaca, como ficou na primeira tentativa desta sessão, a junta **partia a barra** numa sessão de voltas iguais (um AMRAP de 14 voltas lia-se como uma régua tracejada) — o vinco mantém a silhueta contínua e continua a separar.
   - **O pior caso assume-se**: numa sessão de um só desporto com muitas voltas iguais, a fiada mostra tantos vincos quantas as voltas, porque é isso que a sessão é. O que não pode acontecer é o inverso — apagar os vincos e a fiada dizer que houve um bloco só.
   - **Piso de largura**: 82 % proporção ao tempo + 18 % repartido por igual, para que um bloco de 50 s não desapareça ao lado de um de 10 min.
   - **Sessões de um só desporto com voltas iguais: a fiada fica** (decisão do CTO, sessão 13b). Num AMRAP de 14 voltas a fiada mostra 14 troços e lê-se rítmica — a dúvida levantada na sessão 13a. Não se esconde: quantas voltas houve e quanto durou cada uma é informação útil, e o texto sozinho ("14 voltas") não a dá. Fica com o vinco suave e assume-se.
   - Os tratamentos comparados e o porquê da escolha estão em [docs/prototipo/fiada.html](prototipo/fiada.html) e na [captura](prototipo/capturas/fiada-tratamentos.png). Um degradé **sem** junta nenhuma foi testado e chumbou: três blocos de força seguidos ficavam uma barra lisa, e a fiada deixava de ser dado.
2. **Os números** — Archivo Expanded, sempre tabulares, sempre maiores do que se espera.
3. **Os ícones do desporto** — desenhados para o Bricklap (§5), e o **único** sítio, além da fiada, onde a cor do desporto aparece. O *entalhe* — a barra de 3 px na aresta esquerda dos cartões — era o terceiro elemento até à sessão 13b e **saiu**: era redundante com o ícone, e uma app não ganha identidade por repetir a mesma informação duas vezes no mesmo cartão.

## 8. Regras de distinção

Nenhum ecrã do Bricklap pode ser confundido de relance com outra app de treino, em nenhum tema. Em concreto:

- **Sem laranja.** O acento é vermelho-tijolo de matiz 7°. Nada entre 15° e 45° em nenhum token.
- **Sem mapa como fundo.** O mapa, quando existir, é um cartão com contorno, nunca o fundo de um ecrã.
- **Sem botão redondo de gravar.** A ação principal é um retângulo largo de cantos de 20 px, com rótulo escrito. Nenhum botão circular em nenhum ecrã.
- **Sem ícones de terceiros**, sem tipografia de terceiros, sem o seu vocabulário visual (medalhas, chamas, corações de kudos, gráficos de área em gradiente).
- **Uma só coisa grande por ecrã**, e é sempre um número: o cronómetro na gravação, o total no resumo.
- **Cor de desporto em fio**, nunca em bloco: é o que impede o resumo de virar um mosaico colorido.

## 9. O que este documento ainda não cobre

Fica para os briefs seguintes da Fase 4: ecrã de detalhe de um bloco, mapa de uma sessão de rua, gráficos (ritmo ao longo do tempo), estados de erro e de permissões, vazios de primeira utilização, animação de transição entre ecrãs, e o tratamento no relógio (Fase 5).

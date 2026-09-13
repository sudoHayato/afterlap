# Protótipo clicável — nove ecrãs (Fase 4, sessões 10 a 13c)

Ecrãs para o fundador **reagir**. Não é código de produto: não toca em `apps/mobile` nem no motor. Um ficheiro só, sem dependências: [`bricklap.html`](bricklap.html). Duplo clique abre no browser, a partir do disco (precisa de internet para as duas fontes; sem ela cai para a fonte do sistema e o desenho mantém-se).

| Sessão | O que trouxe |
|---|---|
| 10 | O **fluxo**: marca, ficha rápida ao premir, passadeira por ritmo **ou** distância, modelos, pós-treino, apagar. Aprovado pelo fundador e pelo CTO; não se reabriu. |
| 11 | Três **direções visuais** (claro, híbrido, escuro) sobre dois ecrãs — em [direcoes/](direcoes/README.md). **Registo histórico: não é o desenho atual** e ainda tem as barras de cor na lateral dos cartões, que saíram na 13b. Cada página traz agora uma faixa a dizê-lo. |
| 12 | O **sistema visual** aplicado aos nove ecrãs, com tema à escolha do atleta. O sistema está escrito em [docs/DESIGN.md](../DESIGN.md), que é o documento que a app vai seguir. |
| 13a | Dois acertos do fundador depois de ver as capturas: a **fiada** passou de segmentos duros a barra contínua e suave, e os **números** passaram para Archivo Expanded. Comparativas em [fiada.html](fiada.html). |
| 13b | Três correções: **fora as barras de cor** na lateral dos cartões, a **fiada** mais discreta, e o cartão **"por preencher"** redesenhado. |
| 13c | A fiada da 13b tinha ficado ilegível e foi **revertida e corrigida com números**; a última cor decorativa saiu da legenda; o **botão Marca** redesenhado. |

O ficheiro `blocos.html` da sessão 10 foi substituído por este; o fluxo é o mesmo.

## Como abrir e como se usa

No portátil aparece um telemóvel ao lado de um guia com os temas, a lista de ecrãs e os toques do ecrã atual. Num telemóvel real ocupa o ecrã todo (copiar o ficheiro e abrir com o Chrome).

- **Toque** = clique. **Premir** = manter meio segundo; o botão enche-se enquanto se prime.
- O relógio anda a tempo real; **×30** no guia acelera-o para ver blocos com tamanhos plausíveis sem esperar.
- Nada fica guardado: **Reiniciar** (ou F5) volta ao início. As sessões do histórico são inventadas, e os números da rua são fingidos a velocidade constante.
- Para ver um ecrã isolado (é assim que as capturas saem): `bricklap.html?solo=1&ecra=resumo&tema=claro`. Os `ecra` são `inicio`, `gravacao`, `ficha`, `hiit`, `pos`, `resumo`, `historico`, `modelos`, `definicoes`, mais `ficha-forca` e `modelo`; os `tema` são `claro`, `escuro`, `hibrido`, `sistema`.
- `&fonte=anybody` repõe a fonte de números da sessão 12 no ecrã real, para comparar com a atual sem sair do sítio.

## Os três temas

Decisão do fundador: **o tema é escolha do atleta**, três presets mais "seguir o sistema", sem personalização livre. O seletor está no nono ecrã (Definições) e também no guia, para comparar de imediato.

| Preset | Treino | Consulta |
|---|---|---|
| Claro | claro | claro |
| Escuro | escuro | escuro |
| **Híbrido (predefinido)** | escuro | claro |
| Seguir o sistema | o do telemóvel | o do telemóvel |

O híbrido vem de origem por três razões, nesta ordem: lê-se melhor ao sol e com suor, gasta menos no painel OLED durante os minutos em que o ecrã fica ligado, e dá à app uma assinatura própria na única altura em que é usada em público. Em **Escuro** a gravação é igual à do híbrido; a diferença vê-se no resumo e no histórico.

## Os nove ecrãs

| # | Ecrã | O que mostra | Captura |
|---|---|---|---|
| 1 | **Início** | Modelos em cima, desportos em baixo (Ginásio / Rua). Um toque começa. Roda dentada para as Definições. | [inicio](capturas/inicio.png) |
| 2 | **Gravação** | Cronómetro de 84 px, a **fiada** da sessão até agora, o bloco atual com a cor do desporto e o valor da última vez, as três últimas marcas, e o botão **Marca** de 108 px. | [gravacao](capturas/gravacao.png) |
| 3 | **Ficha rápida** | Abre sobre a gravação ao premir Marca, para o bloco que **acabou**, enquanto o relógio já conta o seguinte. Na passadeira, indica-se o ritmo **ou** a distância e a app calcula o outro com o tempo do bloco. | [passadeira](capturas/ficha.png) · [força](capturas/ficha-forca.png) |
| 4 | **Gravação em HIIT** | Só marcas: cada toque fecha uma volta, premir não abre ficha. As voltas não têm nada a preencher — descreve-se no fim, nas notas. | [hiit](capturas/hiit.png) |
| 5 | **Pós-treino** | Total, o que falta preencher com ação, a tabela de séries (a série com buracos já aberta), notas, Concluir. | [pos](capturas/pos.png) · [inteiro](capturas/pos-inteiro.png) |
| 6 | **Resumo por blocos** | Total, o que falta, **um cartão por exercício** com o número principal à direita (`5×8`, `2,0 km`, `2 000 m`), notas, e a tabela de séries. A frase-parágrafo da sessão 10 não voltou. | [resumo](capturas/resumo.png) · [inteiro](capturas/resumo-inteiro.png) |
| 7 | **Histórico** | Uma linha por sessão com a fiada dessa sessão, o que falta preencher, e apagar com confirmação no próprio cartão. | [historico](capturas/historico.png) |
| 8 | **Modelos** | Lista (iniciar ou editar) e a edição: nome, séries, modo Fichas/HIIT, blocos por ordem, adicionar por desporto. | [modelos](capturas/modelos.png) · [editar](capturas/modelo.png) |
| 9 | **Definições** | O seletor de tema com amostra de cada preset, a explicação do predefinido, unidades (métrico, fixo). | [definicoes](capturas/definicoes.png) |

Os nove lado a lado: [folha-de-contacto.png](capturas/folha-de-contacto.png). A gravação e o resumo nos outros dois temas: [gravação clara](capturas/gravacao-claro.png), [gravação escura](capturas/gravacao-escuro.png), [resumo claro](capturas/resumo-claro.png), [resumo escuro](capturas/resumo-escuro.png).

## Toques por ação

Contados no protótipo tal como está. "Premir" conta como um toque.

| Ação | Toques |
|---|---:|
| Começar um treino (desporto ou modelo) | **1** |
| Marca (fecha o bloco, abre o seguinte) | **1** |
| Marca + ficha com os valores da última vez | **2** |
| Marca + ficha, subir a carga 2,5 kg | 3 |
| Marca + ficha, trocar de exercício | 3 |
| Passadeira: passar do ritmo para a distância | +1 |
| Deixar a ficha para depois | 1 |
| Mudar de desporto | 2 |
| Marca em HIIT | 1 |
| Parar | **1** (premir) |
| Abrir ou fechar uma série no pós-treino | 1 |
| Preencher um bloco em falta | **2** |
| Ir ao próximo bloco em falta | 1 |
| Concluir | 1 |
| Abrir uma sessão no histórico | 1 |
| Apagar uma sessão | **2** |
| Mudar de tema | 1 |

Com o 5×5 completo (25 blocos), preencher tudo no momento são 25 marcas premidas + 25 Guardar = **50 toques em 42 minutos**. Só marcas: 25 toques, e o resto fica para o fim.

## O que é do Bricklap e de mais ninguém

O sistema completo está em [docs/DESIGN.md](../DESIGN.md). Em resumo, a identidade recorrente é:

1. **A fiada** — uma barra fina **contínua**, de cantos arredondados, um troço por bloco, largura proporcional ao tempo. Aparece na gravação (a sessão a crescer com cada marca), em cada linha da tabela de séries, em cada cartão do histórico e em cada cartão de modelo. É sempre dado, nunca ornamento: nunca aparece sem rótulo e tempo ao lado — foi isso que afundou a "parede de tijolos" da sessão 10. Desde a sessão 13c: **6 px** de altura (9 no total da sessão) e a cor do desporto a **84 % sobre o fundo** — nunca por opacidade, que apagava também o vinco.
2. **Os números** — Archivo Expanded, sempre tabulares e sempre maiores do que se espera.
3. **Os ícones do desporto** — desenhados para o Bricklap, e o único sítio, além da fiada, onde a cor do desporto aparece.

E as regras de distinção, a cumprir em todos os ecrãs: nada de laranja (o acento é vermelho-tijolo, matiz 7°), nada de mapas como fundo, nada de botão redondo de gravar, ícones e tipografia só nossos, uma só coisa grande por ecrã e é sempre um número, cor de desporto **só no ícone e na fiada** — nunca em barras na lateral dos cartões, que saíram na sessão 13b.

## As três correções da sessão 13b

1. **Fora as barras de cor na lateral dos cartões.** Eram redundantes — o ícone já identifica o exercício — e decoração a fingir que era dado. Saíram de todos os cartões, em todos os ecrãs e nos dois temas. A cor do desporto ficou onde faz falta: no ícone e na fiada.
2. **A fiada, mais discreta.** Ainda se lia como um gráfico de barras. Baixou para 5 px e passou a 72 % de opacidade. **Correu mal e foi revertido na sessão 13c**: a esse tamanho e com essa opacidade a fiada deixou de se ler, e uma fiada que não se conta não é dado nenhum. Ver a secção seguinte.
3. **O cartão "por preencher", redesenhado.** Era um retângulo vermelho com o botão encostado ao título e o detalhe a partir em três linhas. Dois tratamentos comparados nos dois temas ([aviso-tratamentos.png](capturas/aviso-tratamentos.png)): um em superfície normal e um tingido. **Ficou o tingido** — o outro era mais contido mas camuflava-se na pilha de cartões brancos do resumo, que é precisamente onde está a única coisa que exige ação. Agora tem folga a dobrar, hierarquia clara (o que falta, o detalhe, a ação), título em tinta normal em vez de vermelho, e o botão com largura própria numa linha só dele.

## A fiada, redesenhada (sessão 13a)

O fundador viu as capturas da sessão 12 e disse o que estava errado: **as barras segmentadas são duras e feias** — blocos separados num ecrã que devia ser suave. A fiada **fica**, como assinatura e como dado; muda a forma.

Quatro tratamentos, nos sítios reais e nos dois temas: [fiada-tratamentos.png](capturas/fiada-tratamentos.png), e ao vivo em [fiada.html](fiada.html).

| | Tratamento | Leitura |
|---|---|---|
| — | **Atual (sessão 12)** | Segmentos separados por 2 px de argamassa. Dura, e a parecer uma grelha. |
| 1 | **Esbatida** | Contínua e suave, mas **perde o dado**: três blocos de força seguidos ficam uma barra lisa, sem fronteiras. Chumbou. |
| 2 | **Junta** | Contínua, com uma junta ténue em cada marca. Legível, mas com 25 blocos ainda se lê como uma régua de 24 riscas. |
| 3 | **Nós** | Um nó redondo em cada marca. O nó rouba a atenção ao que separa, e com 25 blocos vira um colar de contas. |
| **2b** | **Junta só onde é precisa** ✓ | Contínua. **São as cores a passar umas para as outras** que separam os blocos; a junta fica só onde a cor não muda (força a seguir a força), que é o único sítio onde sem ela se perdia um bloco. |

**É a 2b que está aplicada**, nos quatro sítios. Numa sessão de 25 blocos há três ou quatro juntas em vez de vinte e quatro: lê-se como uma fita, não como uma grelha, e continua a contar-se bloco a bloco. O desenho exato (transições, junta, piso de largura) está em [docs/DESIGN.md](../DESIGN.md) §7.

## A fonte dos números

O fundador achou a **Anybody Expanded** da sessão 12 **robótica**, e trocou-a por **Archivo Expanded**. Está trocada.

A comparação foi feita **nos ecrãs reais**, não num espécime isolado — a mesma sessão, só a fonte a mudar: [gravação](capturas/fonte-gravacao.png) e [resumo](capturas/fonte-resumo.png). Para comparar ao vivo, `bricklap.html?fonte=anybody`.

Não contraproponho. O argumento da sessão 12 a favor da Anybody era que os dígitos quadrados amarravam o número ao nome do produto; vista aplicada, o que ela dá ao cronómetro é ar de mostrador de máquina. **A identidade não estava na fonte**: está na fiada, no entalhe, no acento e na estrutura dos ecrãs. A Archivo Expanded mantém a largura e o peso que o cronómetro de 84 px precisa, com formas mais abertas.

Duas coisas medidas, não supostas: a Archivo Expanded serve mesmo **números tabulares** (`00:00`, `11:11` e `88:88` medem os mesmos 291,66 px a 84/800 — sem isso o cronómetro saltava a cada segundo), e é **6 % mais estreita** do que a Anybody, o que dá folga num ecrã de 390 px. As candidatas da sessão 12 ficam como registo da escolha: [fontes-candidatas.png](capturas/fontes-candidatas.png).

## As correções da sessão 13c

### 1. As barras de cor — a busca completa

O fundador disse que ainda havia barras nas linhas da tabela "Por série" e dentro da série expandida. Fiz a busca que o brief mandou, por todas as formas de desenhar uma barra: `background` e `background-color` com a cor do desporto, `background-image`, `border`, `border-left`, `border-inline-start`, `outline`, `box-shadow` incluindo `inset`, `::before`, `::after`, gradientes, e elementos estreitos de 2 a 6 px.

**Resultado: zero barras verticais.** As quatro regras que as desenhavam (`.entalhe`, `.entalhe::before`, `.bloco-atual::before`, `.linha-bloco::before`) saíram na sessão 13b e não voltaram — hoje o ficheiro não tem um único `::before`. A revisão dos nove ecrãs nos dois temas confirma-o: [revisao-claro.png](capturas/revisao-claro.png) e [revisao-escuro.png](capturas/revisao-escuro.png).

**Mas havia mesmo cor decorativa a mais, e saiu**: os **quadradinhos de cor da legenda** (`.legenda .traco`, 14×8 px), no fundo do ecrã 5 e do ecrã 6 — barras de cor a repetir o que o ícone ao lado já dizia. Passaram a ser o **ícone do desporto**, que é o que o brief manda fazer quando a cor faz falta. Antes e depois: [antes-depois-legenda.png](capturas/antes-depois-legenda.png).

O que continua a ter cor nas linhas "Por série" é a **fiada** — barra horizontal, ao centro da linha, proporcional ao tempo de cada bloco. Não é decoração: é o dado da série. Foi corrigida no ponto 2, não removida.

### 2. A fiada — o que estava errado, em números

A fiada da 13b era um borrão. A causa não era só a 13b: era a **mistura entre cores**, que estava em `min(2,2 pontos percentuais; 45 % do troço mais curto)` **desde a 13a**.

Numa barra de 350 px com os 25 blocos do 5×5, o troço mais estreito tem 8,2 px. Com aquela fórmula, a mistura comia 7,4 px por junta e sobrava-lhe **0,9 px de cor cheia**. A 13b somou-lhe opacidade 72 % e altura 5 px, e o que era marginal passou a ilegível.

| | Antes (13a e 13b) | Depois (13c) |
|---|---:|---:|
| Mistura entre cores | `min(2,2 pp; 45 %)` | `min(0,9 pp; 18 %)` |
| Cor cheia no troço mais estreito | **0,9 px** | **5,8 px** |
| Cor cheia, média dos 25 troços | 3,9 px | **10,0 px** |
| Mistura por junta | 7,4 px | 2,9 px |
| Opacidade | 72 % | **100 %** |
| Saturação | por opacidade (apagava o vinco) | **84 % misturada com o fundo** |
| Altura | 5 px (7 no total) | **6 px** (9 no total) |
| Vinco | 1 px a 72 % | 1 px a 55 % |

**Critério de aceitação**, agora escrito no [DESIGN.md](../DESIGN.md) §7 e a cumprir em qualquer mudança futura: na fiada de 25 blocos da gravação tem de conseguir contar-se **15 troços de força, 5 de passadeira e 5 de remo**. Antes e depois, com a faixa ampliada 3×: [antes-depois-fiada.png](capturas/antes-depois-fiada.png). O estudo uma-coisa-de-cada-vez a partir da 13a: [fiada-variantes.png](capturas/fiada-variantes.png).

A saturação faz-se por **mistura com o fundo** e não por opacidade, porque a opacidade apagava também o vinco — e o vinco é o que separa dois blocos do mesmo desporto.

### 3. O botão Marca

Era "um retângulo de acento com uma bandeira e duas linhas de texto lá dentro, uma delas instruções" — e é o elemento mais importante do ecrã. Três tratamentos, no ecrã real e nos dois temas, com o **estado de premir forçado** para se poder comparar o que uma captura estática não mostra: [marca-tratamentos.png](capturas/marca-tratamentos.png).

| | Tratamento | Em repouso | No fim do premir |
|---|---|---|---|
| 1 | **Tampo e soquete** | Limpo. Tampo de 102 px sobre soquete de 108. | **Fraco** — a maré de luz tapa a própria aresta que era o sinal. Um botão que só empalidece não se vê ao sol. |
| 2 | **O anel que fecha** | Carril gravado **sempre visível**: lê-se como um botão dentro de um botão. | Forte: anel fechado a toda a volta. |
| **3** | **O tijolo de topo** ✓ | **O mais limpo**: o anel está inteiramente recortado, não existe. Uma palavra e uma bandeira. | Forte: anel branco de 3 px desenhado em toda a silhueta. |

**Ficou o 3.** É o único que responde ao "parece um botão de formulário": tem silhueta própria — 110 px de altura, cantos de **8 px à esquerda** (encosta ao que já está construído) e **30 px à direita** (é por ali que entra o bloco seguinte). A profundidade é geometria e não cor: casco em acento escuro, face 6 px acima, e ao premir a face desce 4 px e o leito encolhe para 2 — duas terracotas vizinhas são a mesma cor ao sol, mas uma aresta que encurta vê-se, e fica fora da zona que o polegar tapa. O anel de 500 ms dá o progresso do gesto longo. O rótulo passou para a esquerda, com 26 px de recuo, porque o polegar direito cai no terço direito do botão.

**Não adotei uma parte da proposta**: tirava o fundo ao Mudar e ao Parar para reforçar a hierarquia. No tema claro ficam a parecer desativados, e não foi pedido. Ficam como estavam.

As **instruções saíram** de dentro do botão nos três tratamentos, e o **"A seguir"** ganhou lugar próprio por cima, a 17/800 em tinta, com o rótulo em maiúsculas a 11/700. Em HIIT não há bloco seguinte e a linha não se desenha. Antes e depois, com o fim do premir: [antes-depois-marca.png](capturas/antes-depois-marca.png).

Para comparar ao vivo: `bricklap.html?marca=1`, `&marca=2`, `&marca=3`, e `&premido=1` para congelar o fim do gesto.

## O que o fundador já decidiu

1. **Tema predefinido**: fica o **Híbrido** (treino escuro, consulta clara), com os três presets à escolha no ecrã 9.
2. **Fonte dos números**: **Archivo Expanded**, em vez da Anybody.
3. **A fiada**: **fica** como assinatura, contínua, discreta — e legível: os blocos têm de contar-se.
4. **Barras de cor na lateral dos cartões**: **fora**, em todos os ecrãs. A cor do desporto vive no ícone e na fiada.

E duas decisões do CTO na sessão 13b, sem desenho nenhum: **medalhas e recordes pessoais** aceites para a Fase 6 (saem da base local, sem contas nem servidor), e **feed social e desafios entre atletas adiados sem fase atribuída**. Os motivos estão no [ROADMAP](../../ROADMAP.md) e na [VISAO](../VISAO.md).

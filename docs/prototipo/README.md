# Protótipo clicável — nove ecrãs (Fase 4, sessões 10 a 12)

Ecrãs para o fundador **reagir**. Não é código de produto: não toca em `apps/mobile` nem no motor. Um ficheiro só, sem dependências: [`bricklap.html`](bricklap.html). Duplo clique abre no browser, a partir do disco (precisa de internet para as duas fontes; sem ela cai para a fonte do sistema e o desenho mantém-se).

| Sessão | O que trouxe |
|---|---|
| 10 | O **fluxo**: marca, ficha rápida ao premir, passadeira por ritmo **ou** distância, modelos, pós-treino, apagar. Aprovado pelo fundador e pelo CTO; não se reabriu. |
| 11 | Três **direções visuais** (claro, híbrido, escuro) sobre dois ecrãs — em [direcoes/](direcoes/README.md), mantidas como registo da escolha. |
| 12 | O **sistema visual** aplicado aos nove ecrãs, com tema à escolha do atleta. O sistema está escrito em [docs/DESIGN.md](../DESIGN.md), que é o documento que a app vai seguir. |

O ficheiro `blocos.html` da sessão 10 foi substituído por este; o fluxo é o mesmo.

## Como abrir e como se usa

No portátil aparece um telemóvel ao lado de um guia com os temas, a lista de ecrãs e os toques do ecrã atual. Num telemóvel real ocupa o ecrã todo (copiar o ficheiro e abrir com o Chrome).

- **Toque** = clique. **Premir** = manter meio segundo; o botão enche-se enquanto se prime.
- O relógio anda a tempo real; **×30** no guia acelera-o para ver blocos com tamanhos plausíveis sem esperar.
- Nada fica guardado: **Reiniciar** (ou F5) volta ao início. As sessões do histórico são inventadas, e os números da rua são fingidos a velocidade constante.
- Para ver um ecrã isolado (é assim que as capturas saem): `bricklap.html?solo=1&ecra=resumo&tema=claro`. Os `ecra` são `inicio`, `gravacao`, `ficha`, `hiit`, `pos`, `resumo`, `historico`, `modelos`, `definicoes`, mais `ficha-forca` e `modelo`; os `tema` são `claro`, `escuro`, `hibrido`, `sistema`.

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

1. **A fiada** — barra de segmentos com 2 px de argamassa, um segmento por bloco, largura proporcional ao tempo. Aparece na gravação (a sessão a crescer com cada marca), em cada linha da tabela de séries e em cada cartão do histórico. É sempre dado, nunca ornamento: nunca aparece sem rótulo e tempo ao lado — foi isso que afundou a "parede de tijolos" da sessão 10.
2. **Os números** — Anybody Expanded, de formas quadradas, sempre tabulares e sempre maiores do que se espera. A escolha entre três candidatas está na [captura das fontes](capturas/fontes-candidatas.png).
3. **O entalhe** — 3 px da cor do desporto na aresta esquerda de tudo o que é bloco.

E as regras de distinção, a cumprir em todos os ecrãs: nada de laranja (o acento é vermelho-tijolo, matiz 7°), nada de mapas como fundo, nada de botão redondo de gravar, ícones e tipografia só nossos, uma só coisa grande por ecrã e é sempre um número, cor de desporto em fio e nunca em bloco.

## A fonte dos números

Três candidatas de exibição, todas com números tabulares e licença aberta, vistas com os mesmos valores:

| | Candidata | Leitura | Captura |
|---|---|---|---|
| 1 | Space Grotesk 700 | Tem carácter (o 1 com bandeira, o 4 aberto), mas afina em corpo grande. | [fonte-1](capturas/fonte-1-space-grotesk.png) |
| 2 | Archivo Expanded 800 | Sólida e neutra. É a mais segura e a menos nossa: podia ser de qualquer app desportiva. | [fonte-2](capturas/fonte-2-archivo-expanded.png) |
| 3 | **Anybody Expanded 800** | Dígitos quadrados de contraforma fechada: em corpo grande parecem **tijolos**. | [fonte-3](capturas/fonte-3-anybody-expanded.png) |

As três juntas, para comparar de uma vez: [fontes-candidatas.png](capturas/fontes-candidatas.png).

**Recomendação: a 3, Anybody Expanded**, e é a que está aplicada. É a única das três que amarra o número ao nome do produto e que ninguém confunde com o tipo de outra app de treino; a Archivo fica como alternativa sóbria se o fundador achar a 3 demasiado marcada. O texto corrido é Inter nas três hipóteses.

## Três perguntas fechadas para o fundador

1. **Tema predefinido**: fica o **Híbrido** (treino escuro, consulta clara), ou preferes que a app abra em **Claro** ou em **Escuro**? (Os três continuam à escolha no ecrã 9; a pergunta é só qual vem de origem.)
2. **Fonte dos números**: fica a **Anybody Expanded** (a dos dígitos quadrados, nas capturas), ou preferes a **Archivo Expanded**, mais sóbria? Compara na [captura das fontes](capturas/fontes-candidatas.png).
3. **A fiada**: fica como assinatura da app, nos três sítios onde aparece, ou tiro-a e deixo só os números e os nomes?

# Protótipo clicável — blocos de treino (sessão 10, Fase 4 parte 1)

Ecrãs para o fundador **reagir**. Não é código de produto: não toca em `apps/mobile` nem no motor, e nada do que aqui está decide a implementação. O objetivo é ver o modelo de produto do CTO (marcas, fichas rápidas, modelos, pós-treino por blocos) com o 5×5 do fundador como exemplo, e contar os toques de cada ação.

## Como abrir

Um ficheiro só, sem dependências: [`blocos.html`](blocos.html). Duplo clique abre no browser, a partir do disco, sem servidor. No portátil aparece um telemóvel ao lado de um guia com a lista de ecrãs e o número de toques do ecrã atual; num telemóvel real ocupa o ecrã todo (copiar o ficheiro e abrir com o Chrome).

- **Toque** = clique. **Premir** = manter meio segundo (o botão enche-se enquanto se prime).
- O relógio anda a tempo real; o botão **×30** no guia acelera-o para ver blocos com tamanhos plausíveis sem esperar.
- Nada fica guardado: **Reiniciar** (ou F5) volta ao início. As sessões do histórico são inventadas.
- Os números da rua (distância, ritmo) são fingidos a velocidade constante. Os do ginásio vêm do que se preenche.

## Os oito ecrãs

| # | Ecrã | O que mostra |
|---|------|--------------|
| 1 | **Início** | Modelos de treino em cima (Circuito 5×5, AMRAP 20 min, Corrida + força), desportos em baixo (Ginásio / Rua). Um toque em qualquer um começa a gravar. |
| 2 | **Gravação** | Cronómetro total, bloco atual em destaque com a cor do desporto, o tempo do bloco, os valores da última vez para esse exercício, as três últimas marcas, e o botão **Marca** grande. Com modelo, diz a série ("Série 1 de 5"), o bloco ("bloco 3 de 5") e o que vem a seguir. Mudar e Parar por baixo. |
| 3 | **Ficha rápida** | Abre sobre a gravação ao **premir** Marca: refere-se ao bloco que acabou de fechar, enquanto o relógio já corre no seguinte. Uma por desporto: força = exercício + repetições + carga; passadeira = ritmo **ou** distância, o outro calculado com o tempo do bloco; remo e piscina = metros; rua = nada. Máximo três campos, valores da última vez pré-preenchidos, botões −/+ grandes. "Depois" deixa o bloco por preencher. |
| 4 | **Gravação em HIIT** | O modelo AMRAP é só marcas: cada toque fecha uma volta, premir não abre ficha (avisa "preenche no fim"). Mostra as últimas voltas e o tempo de cada uma. |
| 5 | **Pós-treino** | Linha do tempo por série e por bloco. Cada bloco mostra o que está preenchido (chips cheios) e o que falta (chips tracejados "reps?", "carga?", "ritmo ou distância?"). Um aviso no topo conta os blocos em falta e leva ao próximo. Tocar num bloco abre a mesma ficha rápida. Notas livres. Concluir guarda como está. |
| 6 | **Resumo por blocos** | A frase: "Circuito 5×5 · 5 séries · 42:10 · supino 5×10 @ 80–85 kg · passadeira 5×0,5 km @ 5:30 · remo 5×500 m · …", gerada a partir dos blocos; o que falta aparece como "(+1 por preencher)" com botão para voltar a preencher. Por baixo, a **parede**: uma fiada por série, um tijolo por bloco, largura proporcional ao tempo. Totais, grupos por exercício, notas, linha do tempo. |
| 7 | **Histórico** | Lista de sessões com a fila de tijolos de cada uma. Apagar é um toque no "Apagar" da sessão e um segundo na confirmação, que aparece no próprio cartão. Inclui uma sessão de 0:17 marcada como teste, como a que ficou no telemóvel do fundador. |
| 8 | **Modelos** | Lista de modelos (iniciar ou editar) e a edição de um: nome, número de séries, modo (Fichas / HIIT), blocos por ordem com subir/descer/apagar, adicionar bloco por desporto. |

## Toques por ação

Contados no protótipo tal como está. "Premir" conta como um toque.

| Ação | Toques |
|------|-------:|
| Começar um treino (desporto ou modelo) | **1** |
| Marca (fecha o bloco, abre o seguinte) | **1** |
| Marca + ficha com os valores da última vez | **2** (premir + Guardar) |
| Marca + ficha, subir a carga 2,5 kg | 3 |
| Marca + ficha, trocar de exercício | 3 |
| Passadeira: ficha com o ritmo da última vez | 2 |
| Passadeira: passar a indicar a distância em vez do ritmo | +1 |
| Deixar a ficha para depois | 1 |
| Mudar de desporto (sem modelo) | 2 (Mudar + desporto) |
| Marca em HIIT | 1 |
| Parar | **1** (premir; um toque simples só avisa) |
| Pós-treino: preencher um bloco em falta | 2 + ajustes (bloco + Guardar) |
| Pós-treino: ir ao próximo bloco em falta | 1 |
| Concluir | 1 |
| Abrir uma sessão no histórico | 1 |
| Apagar uma sessão | **2** (Apagar + confirmar) |
| Iniciar um modelo a partir da lista de modelos | 1 |
| Reordenar um bloco de um modelo | 1 por posição |
| Adicionar um bloco a um modelo | 1 (+ nome, se for força) |

Com o 5×5 completo (25 blocos), preencher tudo no momento são 25 marcas premidas + 25 Guardar = **50 toques em 42 minutos**, sem alterar valores. Só marcas: 25 toques, e o resto fica para o fim.

## Decisões de desenho

**Sistema visual (primeira semente, documentado no topo do CSS).** Um treino é uma parede; cada bloco é um tijolo. Tudo o que representa um bloco tem cantos de tijolo e a cor do desporto: **tijolo** para força (e para a ação principal), **ardósia** para passadeira, **água** para remo e piscina, **musgo** para a rua, **ocre** para bicicleta, **pedra** para transição. Fundo quente (argamassa), cartões em cal, tinta escura. Um só acento. **Sem ícones**: texto, cor e forma. Tipografia do sistema, números tabulares para tudo o que conta. Escala de espaçamento 4/8/12/16/24/32. Tudo o que se toca durante o treino tem pelo menos 56 px de altura; o botão Marca tem 128 px e ocupa a largura toda, porque é o toque que se dá com a mão a tremer.

**Marca é o gesto central.** Um toque fecha o bloco e abre o seguinte sem perguntar nada. Premir faz o mesmo e abre a ficha do bloco que fechou, com os valores da última vez; o relógio já está a contar o bloco seguinte, para a ficha nunca atrasar o treino. Em HIIT nem isso: só toques.

**Parar é premir, sem diálogo.** Um toque acidental em Parar a meio de uma série custaria a sessão; um diálogo custaria um toque de cada vez. Premir 0,8 s resolve os dois; um toque simples mostra "Mantém premido para terminar".

**A ficha refere-se ao bloco que acabou.** Reps e carga sabem-se depois da série, não antes. Na passadeira o tempo do bloco já é conhecido, por isso basta o ritmo **ou** a distância que a máquina mostrava: a app calcula o outro. É isto que tira os quilómetros falsos da passadeira que continua a rolar: o que conta é o que o atleta diz que fez, sobre o tempo que a app mediu.

**Duas portas, mesma ficha.** Durante o treino (premir Marca) e depois (tocar no bloco na linha do tempo) abre-se exatamente a mesma folha. O que ficou por preencher está sempre visível como chips tracejados, e nunca bloqueia: Concluir guarda como está.

**Modelos preenchem os nomes, não obrigam.** Com um modelo, as marcas avançam pela lista e voltam ao início quando a série acaba; a série 6 aparece como "extra", não como erro. Sem modelo, cada marca abre outro bloco do mesmo desporto e o nome escolhe-se na ficha.

**O resumo é uma frase.** A frase por blocos ("supino 5×10 @ 80–85 kg") é o que se conta a alguém; a parede é o que se vê de relance; a linha do tempo é o detalhe. Intervalos ("80–85 kg") em vez de médias.

**Apagar sem ecrã à parte.** A confirmação aparece dentro do cartão da sessão. Dois toques, sem sair da lista.

**Atalhos de protótipo, não de produto.** O nome de um exercício novo num modelo é pedido com uma caixa de texto do browser. A rua anda a velocidade constante. Não há teclado numérico: só −/+ em passos (1 rep, 2,5 kg, 5 s/km, 100 m, 50 m no remo, 25 m na piscina).

## Perguntas para o fundador (depois de usar)

Sobre o gesto:

1. Premir Marca durante meio segundo para abrir a ficha: sai naturalmente com a mão suada, ou preferes dois botões separados ("Marca" e "Marca + ficha")?
2. Parar por premir 0,8 s sem diálogo: chega, ou já paraste sem querer?
3. Numa série de força, o **descanso** faz parte do bloco da série (como está: a marca é no fim do descanso) ou é um bloco próprio? Se for próprio, quando marcas: no fim das reps e outra vez no fim do descanso?

Sobre a ficha:

4. Três campos com −/+ chegam para força, ou precisas de escrever números (teclado)? Os passos (1 rep, 2,5 kg) são os certos?
5. Na passadeira: o que olhas na máquina no fim, o ritmo ou a distância? A ficha abre no ritmo; é a porta certa?
6. O remo pede só metros. Faltam o ritmo /500 m ou o tempo do monitor?
7. Quando premes "Depois", esperas que a app te lembre ainda durante o treino, ou só no fim?

Sobre o HIIT:

8. Em AMRAP só há marcas por volta. As voltas são a unidade certa, ou queres marcar cada exercício dentro da volta (5 marcas por volta)?
9. "Descrever no fim": as notas livres chegam, ou queres preencher volta a volta na linha do tempo?

Sobre o fim:

10. A frase do resumo é o que contarias a alguém sobre o treino? O que sobra e o que falta?
11. A parede (uma fiada por série) diz-te alguma coisa, ou é decoração?
12. O que falta preencher aparece como chips tracejados e um aviso no topo. Incomoda a cada abertura, ou está bem?

Sobre modelos e histórico:

13. Os modelos são por ordem fixa e repetem por séries. O teu 5×5 é mesmo assim, ou a ordem muda de série para série?
14. Apagar com confirmação no próprio cartão: chega, ou queres "desfazer" em vez de confirmar?
15. O que queres ver de cada sessão na lista do histórico: a fila de tijolos, a frase, ou só nome e tempo?

Sobre o visual:

16. A parede de tijolos como imagem da app: fica ou vai? As cores por desporto lêem-se no ginásio, com luz má?
17. Sem ícones, só texto: sente-se falta de alguma coisa?

O que sair daqui alimenta o brief da parte 2 da Fase 4 (design e histórico a sério, sobre o motor).

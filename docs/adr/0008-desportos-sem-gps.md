# ADR 0008 — Desportos sem GPS: segmentos só de tempo, watcher ligado ao segmento

**Estado**: aceite (sessão 05, 2026-09-10). **Decisão do CTO**, executada pela equipa de desenvolvimento.

## Contexto

O treino habitual do fundador é HIIT em circuito dentro do ginásio — exercícios de peso do corpo intercalados com remo indoor e passadeira. Sem GPS. Sem isto a app não serve para o treino dele e o *dogfooding* nunca começa. É também o caso N=1 mais simples do motor: um segmento sem amostras de posição.

O motor até aqui assumia que todo o segmento tinha um feed de posição: `samplesBetween` interpolava uma amostra em qualquer fronteira com amostras dos dois lados, e `sessionMetrics` calculava a distância sobre todas as amostras da sessão de uma vez. Com um segmento de ginásio entre duas corridas, isso inventava uma amostra na fronteira e contava como distância o deslocamento entre a última posição antes do ginásio e a primeira depois.

## Decisão

1. **Quatro desportos novos**, todos sem GPS e sem ritmo: `strength` (Força), `rowing_indoor` (Remo indoor), `treadmill` (Passadeira), `swimming_pool` (Natação em piscina). Só tempo por agora; metros de remo, piscinas e distância da passadeira ficam para uma fase futura com introdução manual.
2. **`SPORT_HAS_GPS` no motor**, ao lado de `SPORT_PACE_KIND`: é lógica de domínio (que desporto tem feed de posição), não texto de interface. `sportHasGps(sport)` é a única pergunta que a app faz.
3. **Um segmento sem GPS não tem amostras** — nem as que por acaso existam no seu intervalo de tempo, nem as que caiam exatamente nas suas fronteiras. Distância 0, velocidade 0, ritmo nenhum. É uma propriedade do desporto, não da presença de dados.
4. **A interpolação nunca atravessa um segmento sem GPS.** Para um segmento com GPS, as amostras candidatas à interpolação de fronteira são só as do troço contíguo de segmentos com GPS a que ele pertence (`gpsSpan`). Entre a última posição antes do ginásio e a primeira depois não há troço nenhum; nos dois lados, o segmento com GPS fica com os seus fixes e mais nada.
5. **A distância da sessão é a soma das distâncias dos segmentos.** Deixa de ser um cálculo à parte sobre todas as amostras: assim só os segmentos com GPS contam e a regra 4 vale também para o total. Para sessões só de rua o resultado é o mesmo de antes (a interpolação partilhada nas fronteiras já garantia a soma).
6. **O watcher de posição segue o segmento.** Só há subscrição ao `expo-location` (ou intervalo do simulador) enquanto o desporto do segmento atual tiver GPS. Mudar para um desporto sem GPS desliga-o; mudar para um com GPS liga-o. Poupa bateria e não grava posições dentro de um ginásio. O último fix conhecido é esquecido quando o watcher pára — o segmento com GPS seguinte começa de um fix fresco.
7. **A permissão de localização pede-se quando faz falta pela primeira vez.** Uma sessão que começa em força não pede nada; se a meio mudar para corrida, o pedido aparece aí. Uma sessão que começa na rua pede antes de começar, como até aqui, para que uma recusa fique tratada no ecrã inicial e não um segmento depois.
8. **Amostra de fronteira só quando o segmento que acaba tem GPS.** Ao mudar de corrida para força, o último fix é re-carimbado com a hora do evento e escrito antes dele (fecha a distância da corrida); ao mudar de força para corrida não há nada para carimbar.
9. **Ecrã de gravação num segmento sem GPS**: o cronómetro do segmento e o da sessão, o nome do desporto, e a lista de segmentos. Nada de distância **do segmento**, ritmo ou linha de coordenadas. O resumo lista cada segmento com o seu tempo. A **distância total** aparece sempre que a sessão tenha pelo menos um segmento com GPS — no ecrã de gravação e no resumo, pela mesma regra (`hasGpsSegment`): os quilómetros já corridos não desaparecem do ecrã porque o fundador passou para a máquina de remo. Numa sessão só de ginásio não há distância nenhuma a mostrar, e "0 m" seria ruído.

   *Emenda ao ponto 9 (aprovada pelo CTO no fecho da sessão 05).* A primeira versão escondia também a distância total durante um segmento sem GPS, à letra do brief; ficou registada como dúvida no relatório da sessão 05 §5 e o CTO aprovou a regra acima, igual à do resumo. A distância **do segmento atual** e o ritmo continuam escondidos quando o segmento não tem GPS.
10. **A persistência não muda** (ADR 0006). O evento `sport_changed` já carrega o desporto; a ausência de amostras é informação suficiente. O `replay` valida o desporto contra `SPORTS` do motor, por isso aceita os novos sem alteração.
11. **Ecrã inicial: um toque para começar, oito chips em duas linhas** — "Rua" (os quatro com GPS) e "Ginásio / Piscina" (os quatro sem). Sem menus nem passos extra. Design a sério é Fase 4; aqui é só não piorar.

## Alternativas rejeitadas

- **Um único desporto "indoor"** em vez de quatro. Perde a informação que o fundador quer ver no resumo (o que fez, por quanto tempo) e não custa nada ter os quatro: são entradas numa tabela e nos dicionários.
- **`hasGps` como campo de `Segment`.** Redundante com o desporto e mudava a forma de um tipo que os testes comparam por igualdade estrutural. `sportHasGps(segment.sport)` chega.
- **Filtrar as amostras à entrada** (não guardar nada durante um segmento sem GPS e confiar nisso). A app já não grava nada nesses segmentos, mas a regra tem de viver no motor para que uma base antiga, um simulador ou um erro da app não produzam distância num segmento de ginásio.
- **Manter `sessionMetrics` sobre todas as amostras e só filtrar por segmento.** Contaria o deslocamento ginásio→rua no total. A soma por segmentos é a única forma de o total obedecer às mesmas regras que as partes.
- **Pedir a permissão sempre ao iniciar.** Contraria o pedido explícito do CTO e é a experiência errada para quem só treina no ginásio.
- **Agrupar os chips por menu ou ecrã de escolha.** Passo extra; o brief pede um toque.

## Consequências

- `SPORTS` tem oito entradas; `SPORT_PACE_KIND`, `SIM_SPEED_MPS` (0 para os sem GPS: o simulador não se move) e os dois dicionários acompanham por tipo. O lab web ganha os oito chips e ícones sem outra alteração; o seu simulador continua a gerar amostras durante um segmento de ginásio, e o motor ignora-as — o lab não é o produto.
- `nextSport` (usado pelo mostrador de relógio do lab) percorre os oito, incluindo os sem GPS.
- O teste de recuperação no dispositivo continua a usar corrida simulada; nada muda para ele.
- O filtro de ritmo e o segundo plano continuam por fazer (sessões seguintes da Fase 3). Esta sessão não lhes toca.

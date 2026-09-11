# Visão do produto

**Decisão do fundador, 2026-09-11.** Uma página. A tese fica registada; não se constrói agora — é o ponto de partida da Fase 4.

## A tese

Um treino HIIT/AMRAP é **uma sessão**. Não é "um treino de força" com uma corrida ao lado, nem "uma corrida" com um aquecimento no ginásio: é uma sequência de blocos, cada um com as suas métricas, tudo compactado no mesmo treino.

- **Força** — exercício, repetições, carga.
- **Passadeira** — ritmo × distância → tempo.
- **Remo indoor** — metros, tempo.
- **Corrida na rua** — GPS: distância, ritmo.

Um exemplo concreto do treino do fundador: **5 séries de 5 exercícios com corrida incluída**. Hoje nenhuma app regista isto como uma coisa só. As de força (Hevy, Strong) não sabem o que é uma corrida; as de corrida (Garmin, Strava) tratam a força como um bloco opaco de tempo. O Bricklap trata cada bloco como o que é e a sessão como o que é: uma sequência.

## Porque o motor já serve

O motor foi desenhado para isto desde a Fase 0: **Session → Event → Segment**. START uma vez, CHANGE sem parar, STOP no fim; os eventos são a verdade, os segmentos e as métricas derivam-se. Um bloco de força é um segmento; a corrida é outro; a passadeira, outro. O ADR 0008 já fez o primeiro passo — segmentos só de tempo para força, remo, passadeira e natação — e provou no telemóvel que uma sessão mista rua/ginásio se grava e se retoma sem inventar distância no ginásio. O que falta não é o modelo: são as métricas de cada bloco e a forma de as introduzir.

## Três frases fixas (a respeitar em todas as fases)

1. **A diferenciação do Bricklap é a combinação** de força + passadeira + remo indoor + corrida na rua **no mesmo treino**, cada bloco com as suas métricas. Não competir com Hevy/Strong nem com o Garmin no registo de força isolado.
2. **O problema difícil é a introdução de dados durante o treino, não o cálculo.** Resolve-se na Fase 5 (relógio) e/ou por introdução **após** o treino sobre os segmentos já gravados.
3. **A tese fica registada, não se constrói agora.** É o ponto de partida da Fase 4 (design e histórico). Nenhuma fase anterior antecipa UI ou código por causa dela.

## O que isto implica, sem desenhar nada

- Os segmentos de ginásio continuam só de tempo até à Fase 4. Reps, carga, metros e ritmo × distância são linhas no BACKLOG (marcadas Fase 4+), não código.
- A Fase 3 acaba o que é da Fase 3: fiabilidade da gravação (segundo plano). O ritmo e a exportação ficaram fechados na sessão 06 (ADR 0009).
- Quando a Fase 4 arrancar, parte daqui: o resumo e o histórico devem mostrar a sessão como o fundador a treina — blocos, cada um com o que mediu — e a introdução após o treino é a primeira via a estudar, porque não depende do relógio.

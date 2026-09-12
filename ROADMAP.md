# Roadmap

## Visão do produto

Decisão do fundador (2026-09-11), uma página em [docs/VISAO.md](docs/VISAO.md): um treino HIIT/AMRAP é **uma sessão** com blocos de força (exercício, reps, carga), passadeira (ritmo × distância → tempo), remo indoor e corrida na rua, cada bloco com as suas métricas, tudo no mesmo treino. O motor Session → Event → Segment já foi desenhado para isto. Três frases fixas, a respeitar em todas as fases:

1. **A diferenciação do Bricklap é a combinação** de força + passadeira + remo indoor + corrida na rua **no mesmo treino**, cada bloco com as suas métricas. Não competir com Hevy/Strong nem com o Garmin no registo de força isolado.
2. **O problema difícil é a introdução de dados durante o treino, não o cálculo**; resolve-se na Fase 5 (relógio) e/ou por introdução após o treino sobre os segmentos já gravados.
3. **A tese fica registada, não se constrói agora**: é o ponto de partida da Fase 4 (design e histórico). Nenhuma fase anterior antecipa UI ou código por causa dela.

## Fases

Fases 0–6. As Fases 3–6 são **proposta a validar pelo fundador**; as Fases 0, 1 e 2 estão concluídas.

## Fase 0 — Laboratório web (concluída)

- **Objetivo**: provar a ideia "sessão = sequência de desportos" num protótipo jogável.
- **Entregáveis**: motor (eventos → segmentos → métricas), app web START/CHANGE/STOP, ecrã `/watch`, textos legais pt-PT/UE.
- **Estado**: feito pelo Grok / Grok Build em setembro de 2026 (nome Afterlap). Ver [docs/HISTORY.md](docs/HISTORY.md).

## Fase 1 — Base do produto e esqueleto Android (concluída em 2026-09-10)

- **Objetivo**: repositório limpo, motor testado e reutilizável, app Android a arrancar, produto pronto para ser global.
- **Entregáveis**: monorepo (`packages/engine`, `packages/i18n`, `apps/web-lab`, `apps/mobile`), rename para Bricklap, testes do motor a 100%, app Expo com START/CHANGE/STOP em GPS simulado, i18n mínimo (inglês base, pt-PT primeira tradução, sem strings cravadas nos componentes), primeiro APK de desenvolvimento, documentação e ADRs.
- **Critério de saída**: `npm test`, `npm run typecheck`, `npm run build:web` e `expo export --platform android` verdes; APK de desenvolvimento **compilado localmente** (sem EAS), instalado e a correr no telemóvel do fundador, com o Metro a servir o bundle.
- **Estado**: **concluída em 2026-09-10**, com o critério de saída cumprido de ponta a ponta. Código e documentação da sessão 01 (2026-09-09) em `main`. Sessão 02: i18n, correções aprovadas, ambiente em Node 24, toolchain Android local, **APK instalado no telemóvel e Metro a ligar**. START/CHANGE/STOP validado no dispositivo, em português, com a soma dos segmentos a fechar exatamente com o total. Ver `docs/reports/2026-09-09-sessao-02.md`.

## Fase 2 — GPS real e persistência local (concluída em 2026-09-10)

- **Objetivo**: uma sessão real, gravada no telemóvel, com o ecrã ligado.
- **Entregáveis**: `expo-location` em primeiro plano; adaptador de persistência da app (mesma semântica de eventos; chave/esquema versionado); recuperação de sessão ao reabrir a app (`recovered` real); textos de permissões em pt-PT.
- **Critério de saída**: treino de 30 min gravado sem perda de amostras; fechar e reabrir a app mantém a sessão.
- **Estado**: **concluída em 2026-09-10**. Parte 1 (sessão 03, [ADR 0006](docs/adr/0006-persistencia-sqlite-append-only.md)): persistência SQLite append-only, replay puro, `recovered` real ao reabrir, teste de recuperação no dispositivo 6/6. Parte 2 (sessão 04, [ADR 0007](docs/adr/0007-gps-primeiro-plano.md)): `expo-location` em primeiro plano a 1 Hz, ecrã mantido ligado, permissões en + pt-PT com todos os estados de recusa tratados, registo bruto com a precisão, exportação para GeoJSON. **Prova**: caminhada real do fundador com o build de release, sem Metro e sem cabo — 18:37, 1097 amostras a ≈ 1 Hz, 1,489 km, um único buraco (o fecho/reabertura deliberado), 0 fixes fracos, `recovered` na base. Ver `docs/reports/2026-09-10-sessao-04.md` §6. A caminhada foi de 18:37 e não dos 30 min do critério; **o CTO deu os dois comportamentos por provados e fechou a fase**. Fica para a Fase 3 o ritmo em caminhada, que pareceu mal calibrado ao fundador (§6.1).

## Fase 3 — Segundo plano e fiabilidade (concluída em 2026-09-12)

- **Objetivo**: gravar com o ecrã desligado e a app em segundo plano — e servir para o treino do fundador, que é dentro do ginásio.
- **Parte 1 (sessão 05, feita)**: desportos sem GPS — força, remo indoor, passadeira, natação em piscina — como segmentos só de tempo; o watcher de posição segue o segmento e a permissão pede-se quando faz falta. Ver [ADR 0008](docs/adr/0008-desportos-sem-gps.md) e `docs/reports/2026-09-10-sessao-05.md`.
- **Parte 2 (sessão 06, feita)**: ritmo decidido com os dados das duas sessões de campo — **a caminhada estava bem calibrada**; o que o fundador viu foi o ritmo médio do segmento diluído por 103 s de paragens. **Sem filtro na distância** na altura (as referências ficam a 1,489 km e 4,213 km, a 0,7 % do Strava; revertido na sessão 09 com dados de telemóvel parado — ADR 0009, "Revisão"); "ritmo atual" dos últimos 30 s ao lado do ritmo médio; precisão de cada fix na base (esquema v2); registo bruto só em dev, rodado por sessão; botão de exportação no histórico. Ver [ADR 0009](docs/adr/0009-ritmo-precisao-exportacao.md) e `docs/reports/2026-09-11-sessao-06.md`.
- **Parte 3a (sessão 07, feita)**: investigação, experiência instrumentada e teste de campo de 17,5 min com o ecrã apagado — 977 amostras a 1 Hz, zero buracos > 10 s, bateria sem descida visível. **Decisão** ([ADR 0010](docs/adr/0010-segundo-plano.md)): o `expo-location` chega — tarefa de localização com serviço em primeiro plano e notificação persistente, sem `ACCESS_BACKGROUND_LOCATION`; exceção de bateria pedida ao utilizador. Ver `docs/reports/2026-09-11-sessao-07.md`.
- **Parte 3b (sessão 08, feita)**: versão final sobre o ADR 0010: um único caminho de gravação (o watcher antigo e o `expo-keep-awake` saíram), `t` = timestamp do fix, notificação persistente (refrescada no START/CHANGE/Continuar — a API não permite mais sem reiniciar o pedido), textos da bateria no i18n e aviso persistente quando a exceção é recusada, `recovered_headless` na base quando é o Android a reanimar o processo, diagnóstico só em dev. Dois testes de dispositivo: processo morto com `kill -9` a meio (reanimação + hidratação headless) e reinício do telemóvel (retoma ao abrir a app; perde-se o intervalo até ao "Continuar"). Ver `docs/reports/2026-09-11-sessao-08.md`.
- **Parte 3c (sessão 09, feita)**: teste de campo analisado e notificação corrigida. O **cronómetro falso saiu** da notificação — o tempo decorrido só era refrescado no Iniciar / Mudar / Continuar, ficava parado em "00:00" todo o treino e o fundador leu-o como avariado; ficou título só com o desporto e corpo só com a hora de início ("A gravar desde as HH:MM"), com o teste do dicionário a proibir os marcadores antigos. Um cronómetro **a andar** é Fase 4. O **filtro por precisão** entrou no motor na mesma sessão, por decisão do CTO sobre os 348 m de deriva do teste: `k = 0,25 × precisão`, validado nas três sessões de referência (deriva −75 %, distâncias −1,27 % / −0,01 %, ritmo a correr inalterado) — [ADR 0009](docs/adr/0009-ritmo-precisao-exportacao.md), "Revisão". Ver `docs/reports/2026-09-12-sessao-09.md`.
- **Critério de saída (revisto pelo CTO em 2026-09-12): 1 h** de gravação contínua com o telemóvel no bolso, **sem buracos superiores a 10 s com o atleta em movimento**, sessão íntegra e deriva desprezável — **não 2 h**. A cláusula "com o atleta em movimento" é correção de redação, não abrandamento: com o telemóvel imóvel o Android suprime fixes repetidos de propósito (um a cada 6 s), e um buraco aí mede o sistema, não a app — o resultado real foi zero buracos em movimento e um de 10,047 s parado. Razão, e não é conveniência: o que o critério quer provar é o modo agressivo do Android, e o *doze* profundo instala-se ao fim de ~30 min imóvel e sem carregar. Um teste de 2 h sempre em movimento nunca lá chega (os das sessões 04, 06 e 07 não chegaram); um de 1 h com meia hora de telemóvel pousado chega. Ver [ADR 0010](docs/adr/0010-segundo-plano.md).
- **Critério cumprido**: teste feito pelo fundador a **2026-09-12** (28 min na rua + 33 min com o telemóvel pousado) e analisado no relatório da sessão 08 §8. **Sessão íntegra, sem reservas**: 3289 amostras, zero `recovered`, serviço em primeiro plano a hora inteira, **zero buracos em movimento**, app a gastar 1,6 % de bateria na hora. A deriva de 348 m com o telemóvel parado levou o CTO a reverter a rejeição do filtro ([ADR 0009](docs/adr/0009-ritmo-precisao-exportacao.md), "Revisão"): com `k = 0,25 × precisão` no motor a deriva cai para 87 m, as referências ficam a −1,27 % e −0,01 %, e o ritmo a correr não muda numa casa decimal. **Fase 3 concluída em 2026-09-12**; `feat/segundo-plano-spike` fundido em `main`.

## Fase 4 — Design e histórico (em curso desde 2026-09-12)

- **Objetivo**: valor para o atleta além do registo. **Parte de [docs/VISAO.md](docs/VISAO.md)**: o resumo e o histórico mostram a sessão como o fundador a treina — blocos de força, passadeira, remo e corrida, cada um com as suas métricas — e a introdução de dados **após** o treino, sobre os segmentos já gravados, é a primeira via a estudar (a introdução durante o treino é da Fase 5).
- **Parte 1 (sessão 10, feita)**: protótipo clicável em [docs/prototipo/](docs/prototipo/README.md) para o fundador reagir — um ficheiro HTML, sem código de produto. Modelo do CTO a prototipar: evento **Marca** (fecha um bloco sem mudar de desporto; premir abre a ficha rápida), fichas por desporto com três campos no máximo, modelos de treino, pós-treino por blocos com o que falta visível, resumo numa frase, histórico com apagar. Toques contados por ação e dezassete perguntas para o fundador no README.
- **Entregáveis**: histórico e resumo por sessão na app (por blocos), introdução após o treino das métricas dos blocos de ginásio (reps, carga, metros, ritmo × distância), ritmo em movimento no resumo, exportação GPX (e FIT, a estudar), identidade do responsável pelo tratamento preenchida, textos legais adaptados à app nativa (permissões de localização, retenção local).
- **Critério de saída**: uma sessão exportada abre corretamente numa ferramenta externa; uma sessão de 5 séries de 5 exercícios com corrida incluída lê-se no resumo como o fundador a fez.

## Fase 5 — Relógio (proposta)

- **Objetivo**: as mesmas três ações no pulso; o telemóvel como registo.
- **Entregáveis**: estudo Wear OS vs Garmin Connect IQ; protótipo com START/CHANGE/STOP e sincronização de eventos para o telemóvel.
- **Critério de saída**: uma sessão iniciada no relógio aparece completa no telemóvel.

## Fase 6 — Contas, sincronização, iOS e lançamento (proposta)

- **Objetivo**: produto público.
- **Entregáveis**: contas e sincronização opcionais (novo tratamento de dados: RGPD, avaliação de impacto, política atualizada), iOS, distribuição nas lojas.
- **Critério de saída**: publicação com textos legais completos e responsável identificado.

## Fora do âmbito por agora

Herdado das notas do Grok e mantido: contas, nuvem, feed social, auto-deteção de desporto, dados de saúde (frequência cardíaca, VO₂). Qualquer um destes é um tratamento de dados novo e exige decisão do fundador antes de entrar no roadmap.

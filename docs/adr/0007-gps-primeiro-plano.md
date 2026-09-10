# ADR 0007 — GPS real em primeiro plano, ecrã ligado, dados crus guardados

**Estado**: aceite (sessão 04, 2026-09-10). **Decisão do CTO**, executada pela equipa de desenvolvimento.

## Contexto

A Fase 2 termina com um treino real: uma caminhada de 30 min gravada no telemóvel, ecrã ligado, sem perda de amostras, e a sessão a sobreviver a fechar e reabrir a app. A persistência está fechada (ADR 0006); o que falta é trocar o simulador por posições verdadeiras sem mexer em mais nada.

Gravar com o ecrã desligado, em segundo plano, com serviço em primeiro plano e gestão de bateria, é a Fase 3 — não esta.

## Decisão

1. **`expo-location`, só em primeiro plano.** `ACCESS_FINE_LOCATION` (o Android exige `ACCESS_COARSE_LOCATION` declarada ao lado; a biblioteca declara as duas). **Nada** de `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE` ou `FOREGROUND_SERVICE_LOCATION`: o plugin fica com `isAndroidBackgroundLocationEnabled: false` e `isAndroidForegroundServiceEnabled: false`, explícitos em `app.json`, e o manifesto gerado confirma-o.
2. **`expo-keep-awake` enquanto grava.** O critério de saída é "ecrã ligado" e o Android bloqueia-o em 30 s por defeito; sem isto o teste é impossível. O `useKeepAwake()` vive no ecrã ao vivo e desarma-se quando ele desmonta.
3. **1 Hz, precisão máxima, todos os fixes.** `Accuracy.BestForNavigation`, `timeInterval: 1000`, `distanceInterval: 0` — parado também produz amostras.
4. **Precisão fraca não descarta.** Um fix com `accuracy > 30 m` (ou sem precisão) é guardado como qualquer outro; fica **marcado**, não filtrado. O motor já rejeita saltos acima de 55 m/s; os filtros a sério decidem-se na Fase 3 sobre dados crus, não sobre palpites.
5. **A persistência não muda.** A base guarda cada fix como amostra `gps` com as cinco colunas de sempre. A marca e o resto do fix — precisão, altitude, rumo, o timestamp do próprio fix, `mocked` — vão para um **registo bruto** `files/gps-raw.jsonl`, uma linha JSON por fix, ao lado da base. É um ficheiro de depuração: nunca lança para dentro do caminho de gravação, e a app não o lê.
6. **Sem mapa.** Uma linha de texto no ecrã ao vivo com latitude, longitude, precisão e número de amostras guardadas chega para confirmar que o GPS está vivo. Olhar para o traçado faz-se fora da app: um script converte a base (e o registo bruto) em GeoJSON para qualquer visualizador.
7. **O simulador fica, mas só em desenvolvimento.** Interruptor no ecrã inicial, visível apenas com `__DEV__`; um build de release grava sempre GPS real. Uma sessão retomada segue a fonte da sua última amostra — misturar posições simuladas e reais num só traçado seria absurdo, e é isso que permite ao teste de recuperação no dispositivo continuar a correr dentro de casa.
8. **Amostra de fronteira a partir do último fix.** No CHANGE e no STOP, o fix mais recente é re-carimbado com a hora do evento e escrito antes dele, como o simulador já fazia; sem fix ainda, o evento passa na mesma, só sem amostra na fronteira.

## Alternativas rejeitadas

- **Filtrar por precisão já.** Perde-se exatamente a informação necessária para escolher o filtro certo.
- **Coluna `accuracy` na tabela `samples` (migração v2).** Seria a solução limpa, mas o ADR 0006 está fechado nesta sessão por decisão explícita; a migração fica como opção para quando a Fase 3 decidir o que fazer com a precisão.
- **Fonte do GPS por variável de ambiente do Metro** (`EXPO_PUBLIC_*`). Exige reiniciar o Metro para trocar, e o dev client do fundador partilha o Metro com o teste de dispositivo. O interruptor em runtime não pede nada a ninguém.
- **Mapa no ecrã.** Uma dependência nova e pesada para uma pergunta ("está vivo?") que uma linha de texto responde.

## Consequências

- O relatório da sessão 04 tem uma secção de teste de campo a preencher pelo fundador: duração, amostras, buracos > 5 s, sobrevivência a fechar/reabrir.
- O build tem de ser de **release** para a caminhada: o dev client precisa do Metro, e o Metro fica em casa.
- A Fase 3 herda: permissão de segundo plano, serviço em primeiro plano, filtro de amostras decidido sobre `gps-raw.jsonl`, e possivelmente a migração v2 com `accuracy`.

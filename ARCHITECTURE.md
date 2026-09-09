# Arquitetura

## Modelo de dados

```
amostras (GPS ou simulador)  →  eventos  →  segmentos (derivados)  →  métricas
```

- **`Session`** — `id`, `createdAt`, `status` (`live` | `stopped`), `events[]`, `samples[]`.
- **`SessionEvent`** — `started {at, sport}`, `sport_changed {at, sport}`, `stopped {at}`, `recovered {at}`. É o registo de verdade: nada derivado é guardado.
- **`Sample`** — `t`, `lat`, `lng`, `speedMps`, `source` (`sim` | `gps`).
- **`Segment`** — derivado: `index`, `sport`, `startAt`, `endAt | null` (aberto), `sampleStart`, `sampleEnd`.
- **`SegmentMetrics`** — `durationMs`, `distanceM`, `avgSpeedMps`.
- **`Sport`** — `run`, `bike`, `walk`, `transition`. Metadados em `SPORT_META` (rótulo, texto ao vivo, tipo de ritmo).

## Invariantes do motor

1. Só `started`, `sport_changed` e `stopped` criam, fecham ou alteram segmentos. `recovered` é informativo.
2. Segmentos são contíguos: `endAt` de um é `startAt` do seguinte.
3. Atribuição de amostras a segmentos usa **limites inclusivos**: uma amostra exatamente na fronteira pertence aos dois segmentos adjacentes. É deliberado — a distância fica contínua na mudança de desporto e a soma das distâncias dos segmentos iguala a distância da sessão.
4. `distanceMeters` ignora um troço cuja velocidade implícita exceda **55 m/s** (teletransporte GPS); com timestamps iguais usa um mínimo de 1 ms.
5. `applyRecovered` não repete um `recovered` a menos de **2000 ms** do anterior.
6. `applyChange`, `applyStop`, `appendSample` e `applyRecovered` são puras e imutáveis: devolvem a mesma referência quando não há nada a fazer (sessão parada, mesmo desporto).
7. `sessionBounds`: início = primeiro `started` (ou `createdAt`); fim = `stopped`, senão última amostra, senão início.

## API pública de `@bricklap/engine`

Tudo é exportado por `packages/engine/src/index.ts`.

| Grupo | Funções |
|---|---|
| Transições | `createLiveSession(sport, at?, id?)`, `applyChange`, `applyStop`, `applyRecovered`, `appendSample`, `recoverLiveSessions` |
| Derivação | `segmentsFromEvents`, `currentSport`, `sessionBounds`, `durationMs` |
| Amostras e métricas | `samplesInRange`, `samplesForSegment`, `distanceMeters`, `metricsFor`, `segmentMetrics`, `sessionMetrics` |
| Formatação | `formatDuration`, `formatDistance`, `formatPace`, `formatSpeedKmh`, `formatClock(ts, locale?)`, `formatDay(ts, locale?)` |
| Geo e simulador | `haversineMeters`, `destination`, `toRad`, `LISBON`, `createSim`, `stepSim(state, sport, dtMs, rng?)`, `sampleFromSim`, `sampleFromGps(GpsCoords, t)`, `typicalSpeed` |
| Dados de demonstração | `seedSessions()` (duas sessões paradas, determinísticas) |
| Utilidades | `nowMs`, `newId`, `SPORTS`, `SPORT_META`, `SIM_SPEED_MPS`, `nextSport` |

`GpsCoords` é um tipo estrutural (`latitude`, `longitude`, `speed?`) compatível com o `GeolocationCoordinates` do browser e com o `LocationObjectCoords` do Expo, sem importar nenhum dos dois.

## Fronteiras entre pacotes

- **`packages/engine`** não importa DOM, React, React Native, zustand nem armazenamento. Recebe tempos (`at`) e aleatoriedade (`rng`) por parâmetro, o que torna os testes determinísticos.
- **Adaptadores vivem nas apps.** O lab web tem `apps/web-lab/src/lib/store.ts` (zustand + `localStorage`, chave `bricklap.v1`, migração única de `afterlap.v1`). A app Android, na Fase 1, guarda a sessão apenas em memória (`useState` em `App.tsx`).
- Cada app tem o seu próprio "relógio" e o seu próprio fornecedor de amostras (simulador hoje; GPS real na Fase 2), e limita-se a chamar as funções puras do motor.

## Mecânica do monorepo

- npm workspaces (`packages/*`, `apps/*`), um só `package-lock.json` na raiz, uma só versão de TypeScript (6.0), React (19.2.3) e `@types/react`.
- O motor é consumido **como código-fonte TypeScript**: `package.json` do motor aponta `exports` para `./src/index.ts`. Vite (web) e Metro (Expo) transpilam pacotes do workspace; não há passo de build nem `dist/` do motor. Ver [docs/adr/0001-monorepo.md](docs/adr/0001-monorepo.md).
- Expo SDK 52+ deteta monorepos e configura o Metro sozinho; não há `metro.config.js`.

## Como cada app corre

| App | Dev | Build / prova |
|---|---|---|
| `apps/web-lab` | `npm run dev:web` (Vite, porta 8080) | `npm run build:web` → `apps/web-lab/dist` (SPA estática) |
| `apps/mobile` | `npm run dev:mobile` (Metro para dev client) | `npm run export:android -w @bricklap/mobile` (bundle Hermes); APK via EAS Build ou `expo run:android` |

## Estratégia de testes

- **Motor**: vitest, `packages/engine/test/*.test.ts`, 104 testes, cobertura 100% (statements, branches, functions, lines) sobre `packages/engine/src`. Os testes fixam os limiares (55 m/s, 2000 ms, fronteiras inclusivas) de forma a falharem se alguém os alterar.
- **Apps**: verificação por `tsc`, `vite build` (web) e `expo export --platform android` (mobile). Sem testes de UI nesta fase.

## O que ainda não existe

- GPS real, persistência e recuperação na app Android.
- Gravação em segundo plano (foreground service), gestão de bateria.
- Exportação (GPX/FIT), histórico na app.
- Relógio (Wear OS / Garmin Connect IQ), contas, nuvem, iOS.

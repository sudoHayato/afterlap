# @bricklap/engine

Motor de sessão do Bricklap. Puro TypeScript: sem DOM, sem React Native, sem
armazenamento. Consumido pela web lab (`apps/web-lab`) e pela app Android
(`apps/mobile`).

```
amostras (GPS/sim)  →  eventos  →  segmentos (derivados)  →  métricas
```

- `types.ts` — `Sport`, `SessionEvent`, `Sample`, `Session`, `Segment`, metadados.
- `engine.ts` — derivação de segmentos, métricas, transições (`createLiveSession`,
  `applyChange`, `applyStop`, `applyRecovered`, `appendSample`), formatação.
- `geo.ts` — haversine, simulador de percurso, conversão de fixes GPS.
- `seed.ts` — sessões de demonstração determinísticas.

Testes: `npm test` na raiz do repositório (vitest).

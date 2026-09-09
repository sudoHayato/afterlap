# @bricklap/engine

Motor de sessão do Bricklap. Puro TypeScript: sem DOM, sem React Native, sem
armazenamento. Consumido pela web lab (`apps/web-lab`) e pela app Android
(`apps/mobile`).

```
amostras (GPS/sim)  →  eventos  →  segmentos (derivados)  →  métricas
```

- `types.ts` — `Sport`, `SessionEvent`, `Sample`, `GpsCoords`, `Session`, `Segment`, metadados.
- `engine.ts` — derivação de segmentos, atribuição de amostras (fronteiras inclusivas e
  interpoladas), métricas, transições (`createLiveSession`, `applyChange`, `applyStop`,
  `applyRecovered`, `appendSample`), formatação.
- `geo.ts` — haversine, simulador de percurso, conversão de fixes GPS.
- `seed.ts` — sessões de demonstração determinísticas.

Regras e invariantes: ver `ARCHITECTURE.md` na raiz.

Testes: `test/*.test.ts` (vitest), 124 testes, cobertura 100% sobre `src/`.
Correr `npm test` ou `npm run test:coverage` na raiz do repositório. `vitest` e
`typescript` estão declarados como `devDependencies` deste pacote mas são
instalados (hoisted) pela raiz do workspace.

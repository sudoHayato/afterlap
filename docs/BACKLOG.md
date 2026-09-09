# Backlog

Prioridades: **P0** bloqueia a próxima sessão; **P1** próxima fase; **P2** quando calhar. Itens marcados "a decidir" precisam do CTO.

## P0 — Fase 1, fecho

- [ ] **APK de desenvolvimento no telemóvel** (EAS Build ou build local com Android SDK na WSL 2). Opções com prós e contras no relatório da sessão 01.
- [ ] **Conta/projeto EAS** (a decidir: quem é o dono; `projectId` em `app.json`).
- [ ] **`android.package` definitivo** (a decidir; hoje `com.bricklap.app` placeholder; mudar depois de publicar é doloroso).
- [ ] **Node 24 LTS e npm 11 na máquina de desenvolvimento** (`nvm install 24 && nvm use`, `npm i -g npm@11`).
- [ ] Merge de `chore/monorepo-cleanup` em `main` (a decidir pelo CTO após revisão).

## P1 — Fase 2

- [ ] `expo-location` em primeiro plano; textos de permissão em pt-PT; `sampleFromGps` já aceita `LocationObjectCoords`.
- [ ] Adaptador de persistência na app Android (eventos + amostras; esquema versionado; mesma semântica que `bricklap.v1` no lab).
- [ ] `recovered` real ao reabrir a app (`recoverLiveSessions` já existe no motor).
- [ ] Ícones, splash e cor de fundo definitivos (hoje assets do template Expo).
- [ ] Decidir `newArchEnabled` explícito em `app.json` (SDK 57 já usa a nova arquitetura por defeito; deixar explícito evita surpresas).
- [ ] CI (GitHub Actions): `npm test`, `npm run typecheck`, `npm run build:web`, `expo export --platform android`.

## P2 — Qualidade e dívida

- [ ] Motor: `Segment.sampleStart`/`sampleEnd` duplicam `startAt`/`endAt` — simplificar ou dar-lhes significado (índices de amostras).
- [ ] Motor: `newId()` usa `Math.random`; considerar `crypto.randomUUID` quando disponível nas duas plataformas.
- [ ] Motor: `formatClock`/`formatDay` dependem do locale do runtime quando não recebem `locale`; as apps devem passar `"pt-PT"` explicitamente.
- [ ] Motor: `SPORT_META` tem rótulos em inglês (usados pelo lab e pela app Android); decidir i18n mínima.
- [ ] Lab: referência ao caminho antigo `src/lib/legal/config.ts` em `legal.index.tsx`, `LEGAL.md` e `LICENSE` (a decidir: atualizar para `apps/web-lab/src/lib/legal/config.ts`).
- [ ] `NOTICE`: acrescentar Expo / React Native quando a app for distribuída (a decidir; texto legal).
- [ ] Lab: decidir ESLint/Prettier (hoje só `.prettierrc` como convenção de editor) e um smoke test e2e.
- [ ] Lab: `formatDay`/`formatClock` sem locale explícito (ver item do motor).
- [ ] Mobile: `TOP_INSET` calculado à mão a partir de `StatusBar.currentHeight`; substituir por `react-native-safe-area-context` quando houver mais ecrãs.
- [ ] Badge de cobertura e relatório HTML publicado (opcional).
- [ ] Vitest avisa que Node 23 está fora de `engines`; desaparece com Node 24.

# História do projeto

Este ficheiro substitui `GROK.md` e `AGENTS.project.md`. É cronologia e contexto, não instruções.

## Setembro de 2026 — Afterlap, laboratório web (Grok Build)

O laboratório web original foi **desenhado e escrito pelo Grok / Grok Build (xAI)**, a pedido do dono do projeto. Não foi escrito pelo dono. O sandbox Grok Build gerou também a plataforma à volta (auth, base de dados, PWA, scripts de preview), que não fazia parte do produto.

Intenção de produto tal como o Grok a implementou:

- Uma sessão de treino não está presa a um desporto. É uma sequência. Start uma vez, mudar de modalidade sem parar, Stop só no fim.
- Modelo: `amostras → eventos → segmentos (derivados) → métricas`. Eventos `started`, `sport_changed`, `stopped`, `recovered`. Mudar de desporto não fecha a sessão.
- Interface: Start → Change/Lap → Stop. O ecrã `/watch` era um estudo visual de relógio, não uma app Garmin. GPS simulado.

Língua e lei, como o Grok configurou: textos em português de Portugal (pt-PT); jurisdição Portugal e União Europeia (RGPD, Lei 58/2019, CNPD). Não foi aplicada lei brasileira. A identidade do responsável pelo tratamento ficou como placeholder.

O que o Grok considerou o passo seguinte (opinião): portar o motor para Dart/Flutter com GPS real e, mais tarde, um ecrã Connect IQ com as mesmas três ações. O Grok Build não compila nativo nem Garmin, por isso o trabalho saiu desse ambiente.

Fora do que o Grok construiu: contas, nuvem, feed social, auto-deteção de desporto, dados de saúde.

Commits desta época no `main`: `18df422` (lab + base legal), `79f19fc` (locale e lei fixados em pt-PT/UE), `3224605` e `cc65c7f` (notas de passagem para o Claude Code: "portar o motor, não reconstruir o lab").

## 2026-09-09 — Bricklap, sessão 01: limpeza e monorepo

O projeto passou a chamar-se **Bricklap** (o repositório GitHub já tinha sido renomeado). Na sessão 01, orientada pelo CTO e executada pelo Claude Code, o repositório foi reestruturado no branch `chore/monorepo-cleanup`:

- **Removido**: `src/lib/auth`, `src/lib/multiplayer`, `src/lib/db.ts`, `src/lib/app-data`, `migrations/`, `server/`, `scripts/` (grok-pwa, preview, browser-smoke, check-auth-invariant, migrate, brand-check), `startup.sh`, ESLint, TanStack Start/nitro/SSR, e todas as dependências de UI que o lab não usava (Radix exceto `react-slot`, recharts, react-query, react-table, react-hook-form, zod, date-fns, sonner, vaul, cmdk, playwright, better-auth, kysely, pg, pglite, jose).
- **Mantido**: o motor (agora `packages/engine`, `@bricklap/engine`, puro e com testes), o lab web (agora `apps/web-lab`, Vite SPA), os textos legais (movidos intactos, só o nome do produto trocado).
- **Novo**: `apps/mobile` (Expo SDK 57, Android only, START/CHANGE/STOP com GPS simulado), documentação (ARCHITECTURE, ROADMAP, STATUS, CLAUDE.md, ADRs, BACKLOG) e o relatório `docs/reports/2026-09-09-sessao-01.md`.
- **Mudança face à sugestão do Grok**: em vez de Dart/Flutter, a app nativa é React Native via Expo, para reutilizar o motor TypeScript tal como está. Ver [adr/0002-react-native-expo.md](adr/0002-react-native-expo.md). Android primeiro, por decisão do fundador: [adr/0003-android-first.md](adr/0003-android-first.md).

Os textos legais continuam a ser os redigidos pelo Grok. Não são parecer jurídico.

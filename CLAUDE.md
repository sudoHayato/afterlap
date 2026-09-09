# CLAUDE.md — instruções para agentes de código

Bricklap: uma sessão de treino é uma sequência de desportos. START uma vez, CHANGE sem parar, STOP no fim. Eventos são a fonte de verdade; segmentos e métricas derivam-se.

## Ler primeiro

1. `README.md` → `STATUS.md` → `ARCHITECTURE.md` → `ROADMAP.md`.
2. O relatório mais recente em `docs/reports/`.
3. `packages/engine/src/index.ts` (API do motor) e `git log --oneline | head -30`.

## Layout

- `packages/engine` — motor puro (`src/`), testes (`test/`).
- `apps/web-lab` — lab web (Vite SPA). Páginas legais em `src/routes/legal.*.tsx`, `src/lib/legal/`, `LEGAL.md`.
- `apps/mobile` — app Android (Expo, dev client).
- `docs/adr`, `docs/BACKLOG.md`, `docs/HISTORY.md`, `docs/reports/`.

## Comandos

```bash
npx -y npm@11 install      # npm 10 falha neste repo (bug do arborist)
npm test                   # motor (vitest)
npm run test:coverage
npm run typecheck          # todos os workspaces
npm run dev:web            # lab em http://localhost:8080
npm run build:web
npm run dev:mobile         # Metro para dev client
npm run export:android -w @bricklap/mobile   # prova Metro/monorepo sem SDK Android
```

Node 24 LTS (`.nvmrc`). Não alterar versões de Node/npm da máquina sem pedir.

## Convenções

- TypeScript `strict` + `noUncheckedIndexedAccess` em todo o lado. Uma só versão de TypeScript, React e `@types/react` no workspace.
- **O motor fica puro**: sem DOM, React, React Native, zustand, `localStorage`, `AsyncStorage`, `fetch`. Tempo (`at`) e aleatoriedade (`rng`) entram por parâmetro. Adaptadores (persistência, GPS, relógio) vivem nas apps.
- **Eventos são a verdade**: nunca guardar segmentos ou métricas; derivar sempre com `segmentsFromEvents` e afins.
- Identificadores em inglês no código; documentação, mensagens de commit descritivas e cópia da app Android em **pt-PT** (não pt-BR: ficheiro, utilizador, equipa, ecrã). A cópia do lab web mantém-se em inglês como está.
- Commits pequenos, no imperativo, com corpo a explicar o porquê, terminados em `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Branches: `chore/`, `feat/`, `fix/`, `docs/`.
- Nova dependência só com uma linha no relatório da sessão a justificar. Instalar sempre a partir da raiz.
- `apps/mobile/android` e `ios` são gerados (`expo prebuild`) e ignorados pelo git.
- `apps/web-lab/src/routeTree.gen.ts` é gerado pelo router plugin e **fica** no repo.

## Definition of Done

Uma tarefa só está feita quando:

1. `npm test` verde, com cobertura do motor a 100% mantida.
2. `npm run typecheck` verde em todos os workspaces.
3. `npm run build:web` verde.
4. `npm run export:android -w @bricklap/mobile` verde (Metro resolve o monorepo).
5. `STATUS.md` atualizado e relatório da sessão em `docs/reports/AAAA-MM-DD-sessao-NN.md` (feito, por fazer, decisões, dúvidas para o CTO, próximos passos).
6. Nenhuma dependência nova sem justificação escrita.
7. Textos legais intocados (salvo pedido explícito do CTO).

## Nunca

- Nunca alterar a redação dos textos legais (`apps/web-lab/LEGAL.md`, `src/lib/legal/`, `src/routes/legal.*.tsx`, `LICENSE`, `NOTICE`) sem pedido explícito do CTO. Só nome do produto, chave de armazenamento e caminhos de import.
- Nunca configurar iOS na Fase 1 (sem bloco `ios` em `app.json`, sem scripts iOS, sem Xcode).
- Nunca importar zustand, `localStorage`, `AsyncStorage`, DOM ou React Native em `packages/engine`.
- Nunca fazer commit de `apps/mobile/android`, `apps/mobile/ios`, `dist/`, `coverage/`, `.expo/`.
- Nunca correr `npm install` com npm 10 neste repositório; usar npm 11.
- Nunca fazer push para `main`, nunca `push --force`, nunca reescrever histórico já publicado.
- Nunca apagar ou reescrever relatórios em `docs/reports/`.
- Nunca guardar segredos (tokens EAS, keystores) no repositório.
- Nunca mudar `android.package`, o nome da app ou a slug sem decisão do CTO.
- Nunca guardar segmentos/métricas derivados como estado persistido.

## Dúvidas para o CTO

Não bloquear: registar em "Dúvidas para o CTO" no relatório da sessão, tomar a decisão reversível mais simples, e escrever o porquê.

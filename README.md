# Bricklap

**Start once. Train freely.** Uma sessão de treino não é um desporto — é uma sequência.

O atleta carrega em START uma vez, muda de modalidade sem parar (CHANGE) e só no fim faz STOP. Os eventos são a fonte de verdade; segmentos e métricas derivam-se deles.

Língua do produto: **inglês** é a língua-base; **pt-PT** é a primeira tradução, detetada automaticamente pelo dispositivo. Os textos legais são a exceção — continuam pt-PT, jurisdição Portugal e União Europeia, sem tradução. Fase 1: **Android only**.

## O que há neste repositório

Monorepo com npm workspaces:

| Caminho | Pacote | O que é |
|---|---|---|
| `packages/engine` | `@bricklap/engine` | Motor de sessão. TypeScript puro: sem DOM, sem React Native, sem armazenamento, sem texto de interface. 124 testes, cobertura 100%. |
| `packages/i18n` | `@bricklap/i18n` | Dicionários de tradução (en base, pt-PT) tipados, e formatação por unidade (metric hoje, imperial declarado). 25 testes, cobertura 100%. |
| `apps/web-lab` | `@bricklap/web-lab` | Laboratório web (Vite + React + TanStack Router + Tailwind). GPS simulado. Inclui as páginas legais (pt-PT, fora do i18n) e 9 testes do store. **Não é o produto.** |
| `apps/mobile` | `@bricklap/mobile` | App Android (Expo SDK 57, dev client). Fase 2: START/CHANGE/STOP com GPS real em primeiro plano, persistência SQLite append-only, recuperação ao reabrir; simulador só em desenvolvimento. |
| `docs/` | — | ADRs, backlog, história, relatórios de sessão. |

Leitura recomendada, por esta ordem: este ficheiro → [STATUS.md](STATUS.md) → [ARCHITECTURE.md](ARCHITECTURE.md) → [ROADMAP.md](ROADMAP.md) → o relatório mais recente em `docs/reports/`. Agentes de código: [CLAUDE.md](CLAUDE.md).

## Requisitos

- **Node 24 LTS** (ver `.nvmrc`; `nvm use`). Node 23 funciona mas está fora do intervalo suportado pelo react-native e pelo vitest.
- **npm ≥ 11**. O npm 10.9 falha neste repositório com `Cannot read properties of null (reading 'edgesOut')` (bug do arborist com peers opcionais em workspaces). Sem atualizar o npm global:

```bash
npx -y npm@11 install
```

## Arranque rápido

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run dev:web
```

O lab fica em http://localhost:8080. Para a app Android ver [apps/mobile/README.md](apps/mobile/README.md) (precisa de um build de desenvolvimento — EAS Build ou Android SDK local).

## Scripts na raiz

| Script | Faz |
|---|---|
| `npm test` / `npm run test:coverage` | Testes do motor, do i18n e do store do lab (vitest); a cobertura em `coverage/` mede motor + i18n |
| `npm run typecheck` | `tsc` em todos os workspaces |
| `npm run dev:web` / `npm run build:web` | Lab web: servidor de desenvolvimento / build para `apps/web-lab/dist` |
| `npm run dev:mobile` | Metro para um dev client já instalado (`expo start --dev-client`) |
| `npm run android` | `expo run:android` (precisa de Android SDK + JDK locais) |

## Mapa do repositório

```
.
├── packages/engine/        motor (src/, test/)
├── packages/i18n/          dicionários en/pt-PT + unidades (src/, test/)
├── apps/web-lab/           lab web (src/routes, src/components/bricklap, src/lib/legal, LEGAL.md)
├── apps/mobile/            app Expo (App.tsx, i18n.ts, app.json)
├── docs/
│   ├── adr/                decisões de arquitetura
│   ├── reports/            relatório por sessão de trabalho
│   ├── BACKLOG.md
│   └── HISTORY.md          origem (Grok Build) e cronologia
├── ARCHITECTURE.md · ROADMAP.md · STATUS.md · CLAUDE.md
├── LICENSE · NOTICE        todos os direitos reservados; marcas de terceiros
└── package.json            workspaces, vitest, TypeScript
```

## Memória do projeto

O repositório GitHub é a memória do projeto. Um chat não o é. Quem abrir uma conversa nova deve partir do `main` atual: `README.md`, `STATUS.md`, `ARCHITECTURE.md`, `packages/engine/src`, `git log` e o último relatório em `docs/reports/`.

## Marcas e licença

Sem afiliação a Garmin, Strava, Apple, Google ou Ironman. Ver [NOTICE](NOTICE). Todos os direitos reservados — ver [LICENSE](LICENSE). Textos legais do lab em `apps/web-lab/LEGAL.md` e `apps/web-lab/src/lib/legal/`.

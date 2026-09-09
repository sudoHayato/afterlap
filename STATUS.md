# Estado do projeto

**Data**: 2026-09-09 · **Branch**: `chore/monorepo-cleanup` (sessão 01) · **Fase**: 1 em curso

## Por pacote

| Pacote | Estado | Prova |
|---|---|---|
| `@bricklap/engine` | Motor puro, API estável, sem dependências de runtime | `npm test`: 124 testes em 8 ficheiros; cobertura 100% statements / branches / functions / lines; `tsc` limpo; limiares verificados por mutação |
| `@bricklap/web-lab` | SPA Vite + TanStack Router; consome o motor; chave `bricklap.v1` com migração de `afterlap.v1` | `tsc` limpo; 9 testes ao store; `vite build` ok (17 chunks JS, principal 283 kB); dev server responde em `/` e `/legal/privacidade` |
| `@bricklap/mobile` | Expo SDK 57, dev client, `platforms: ["android"]`; um ecrã START/CHANGE/STOP com GPS simulado; sem persistência | `tsc` limpo; `expo export --platform android` ok (585 módulos, bundle Hermes 1.5 MB). **Ainda não correu num telemóvel** |

## O que existe

- Monorepo npm workspaces, lockfile único, 571 pacotes instalados (o template Grok tinha ~70 dependências declaradas e milhares instaladas).
- Rename Afterlap → Bricklap completo (nomes de pacote, título, wordmark, chave de persistência, LICENSE/NOTICE, textos legais só no nome).
- Documentação: README, ARCHITECTURE, ROADMAP, STATUS, CLAUDE.md, `docs/adr/0001–0003`, `docs/BACKLOG.md`, `docs/HISTORY.md`, `docs/reports/2026-09-09-sessao-01.md`.

## Limitações conhecidas

- GPS simulado em ambas as apps; sem GPS real.
- App Android sem persistência: a sessão perde-se ao fechar.
- `android.package` é um placeholder (`com.bricklap.app`); os ícones são os do template Expo; não há splash configurado (o Android mostra o ícone por defeito).
- Identidade do responsável pelo tratamento continua por preencher (`apps/web-lab/src/lib/legal/config.ts`).
- Os textos legais mencionam o caminho antigo `src/lib/legal/config.ts`; o `NOTICE` lista TanStack Start/Query/Table (removidos) e não lista Expo/React Native (não alterados por instrução do CTO).
- Rótulos de desporto (`SPORT_META`) em inglês dentro da app pt-PT.
- Sem CI, sem lint.

## Ambiente de desenvolvimento

- Windows + WSL 2 (Ubuntu). Node 23.11 via nvm (recomendado: Node 24 LTS, `.nvmrc`). npm 10.9 não instala este repositório — usar `npx -y npm@11 install`.
- Sem Android SDK/JDK na WSL; sem `adb`. O APK de desenvolvimento ainda não foi produzido.

## Próximo passo

Pôr o APK de desenvolvimento no telemóvel (EAS Build ou build local) e validar o ecrã START/CHANGE/STOP. Detalhe e opções: [docs/reports/2026-09-09-sessao-01.md](docs/reports/2026-09-09-sessao-01.md).

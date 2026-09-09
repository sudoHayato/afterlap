# Estado do projeto

**Data**: 2026-09-09 · **Branch**: `feat/i18n-e-primeiro-apk` (sessão 02; sessão 01 já em `main`) · **Fase**: 1 em curso

## Por pacote

| Pacote | Estado | Prova |
|---|---|---|
| `@bricklap/engine` | Motor puro, API estável, sem dependências de runtime, sem texto de interface (`SPORT_PACE_KIND` é lógica, não rótulo) | `npm test`: 124 testes em 8 ficheiros; cobertura 100%; `tsc` limpo; limiares verificados por mutação |
| `@bricklap/i18n` | Dicionários `en` (base) e `pt-PT`, tipados; `t(key)` tipado; unidades metric/imperial (imperial declarado, não implementado) | 25 testes em 4 ficheiros; cobertura 100%; `tsc` limpo |
| `@bricklap/web-lab` | SPA Vite + TanStack Router; consome motor + i18n; chave `bricklap.v1` com migração de `afterlap.v1`; toda a cópia via `t()` | `tsc` limpo; 9 testes ao store; `vite build` ok; dev server responde em `/` e `/legal/privacidade` |
| `@bricklap/mobile` | Expo SDK 57, dev client, `platforms: ["android"]`; um ecrã START/CHANGE/STOP com GPS simulado; toda a cópia via `t()`; sem persistência | `tsc` limpo; `expo export --platform android` ok (592 módulos, bundle Hermes 1.5 MB) |

## O que existe

- Monorepo npm workspaces, lockfile único (577 pacotes instalados).
- Rename Afterlap → Bricklap completo (sessão 01).
- **i18n mínimo (sessão 02)**: inglês como língua-base, pt-PT como primeira tradução, deteção automática pelo dispositivo com fallback para inglês. Nenhuma string de interface cravada nos componentes do lab ou da app — tudo via `t()`. Os textos legais continuam pt-PT/UE, fora do i18n (exceção pedida pelo CTO).
- Camada de unidades (`@bricklap/i18n/units`): métrico implementado hoje; imperial declarado no tipo, não implementado (lança em vez de adivinhar).
- Ambiente de desenvolvimento em Node 24.21.0 LTS / npm 11.19.0 (instalado via nvm nesta sessão).
- Documentação: README, ARCHITECTURE, ROADMAP, STATUS, CLAUDE.md, `docs/adr/0001–0004`, `docs/BACKLOG.md`, `docs/HISTORY.md`, `docs/reports/`.

## Limitações conhecidas

- GPS simulado em ambas as apps; sem GPS real.
- App Android sem persistência: a sessão perde-se ao fechar.
- `android.package` é um placeholder (`com.bricklap.app`); os ícones são os do template Expo; não há splash configurado (o Android mostra o ícone por defeito).
- Identidade do responsável pelo tratamento continua por preencher (`apps/web-lab/src/lib/legal/config.ts`).
- Sistema de unidades imperial não implementado (só métrico).
- Sem ecrã de definições: língua e unidades detetam-se uma vez no arranque, sem forma de o utilizador escolher à mão.
- `pt-BR` (e qualquer variante não listada) cai em `pt-PT`, não em inglês — decisão deliberada (ver `packages/i18n/README.md`), a rever se vier a fazer sentido uma tradução `pt-BR` própria.
- Sem CI, sem lint.

## Ambiente de desenvolvimento

- Windows + WSL 2 (Ubuntu). **Node 24.21.0 LTS instalado via nvm nesta sessão** (`nvm install 24`, alias `default`); npm 11.19.0 (bundlado). `npm install` volta a funcionar sem o workaround `npx npm@11` da sessão 01.
- Sem Android SDK/JDK na WSL; sem `adb`. Ver `docs/reports/2026-09-09-sessao-02.md` para o resultado do EAS Build.

## Próximo passo

Instalar o APK de desenvolvimento no telemóvel a partir do link do EAS Build e validar o ecrã START/CHANGE/STOP. Detalhe: [docs/reports/2026-09-09-sessao-01.md](docs/reports/2026-09-09-sessao-01.md) (opções) e o relatório desta sessão.

# Estado do projeto

**Data**: 2026-09-10 · **Branch**: `main` · **Fase**: 1 concluída; **Fase 2, parte 1 (persistência local) concluída**; parte 2 (GPS real) por iniciar

## Por pacote

| Pacote | Estado | Prova |
|---|---|---|
| `@bricklap/engine` | Motor puro, API estável, sem dependências de runtime, sem texto de interface (`SPORT_PACE_KIND` é lógica, não rótulo). Não mudou nesta sessão | `npm test`: cobertura 100%; `tsc` limpo; limiares verificados por mutação |
| `@bricklap/i18n` | Dicionários `en` (base) e `pt-PT`, tipados; `t(key)` tipado; unidades metric/imperial (imperial declarado, não implementado) | cobertura 100%; `tsc` limpo |
| `@bricklap/web-lab` | SPA Vite + TanStack Router; consome motor + i18n; chave `bricklap.v1` com migração de `afterlap.v1`; toda a cópia via `t()` | `tsc` limpo; `vite build` ok |
| `@bricklap/mobile` | Expo SDK 57, dev client, `platforms: ["android"]`; ecrãs START/CHANGE/STOP + resumo/histórico com GPS simulado; toda a cópia via `t()`; **persistência local SQLite append-only (ADR 0006), recuperação real ao reabrir** | `tsc` limpo; `expo export --platform android` ok; testes de unidade do adaptador em `apps/mobile/test/persistence.test.ts` (18 testes, `node:sqlite`); **teste de recuperação no dispositivo real (`npm run test:device -w @bricklap/mobile`) 6/6 a passar** no Galaxy S24 Ultra — ver `docs/reports/2026-09-10-sessao-03.md` §5 |

## O que existe

- Monorepo npm workspaces, lockfile único (577 pacotes instalados).
- Rename Afterlap → Bricklap completo (sessão 01).
- **i18n mínimo (sessão 02)**: inglês como língua-base, pt-PT como primeira tradução, deteção automática pelo dispositivo com fallback para inglês. Nenhuma string de interface cravada nos componentes do lab ou da app — tudo via `t()`. Os textos legais continuam pt-PT/UE, fora do i18n (exceção decidida pelo fundador).
- Camada de unidades (`@bricklap/i18n/units`): métrico implementado hoje; imperial declarado no tipo, não implementado (lança em vez de adivinhar).
- Ambiente de desenvolvimento em Node 24.21.0 LTS / npm 11.19.0 e toolchain Android local (JDK 17 + SDK 36), tudo instalado nesta sessão.
- Documentação: README, ARCHITECTURE, ROADMAP, STATUS, CLAUDE.md, `docs/adr/0001–0006`, `docs/BACKLOG.md`, `docs/HISTORY.md`, `docs/reports/`.
- **Persistência local no Android (sessão 03)**: base SQLite append-only (`apps/mobile/persistence/`), replay puro, ecrã de resumo ao arrancar (continuar/descartar), histórico mínimo. Apagamento de sessão a pedido do utilizador (RGPD) é um `DELETE` real, decisão registada para a Fase 4. Ver [ADR 0006](docs/adr/0006-persistencia-sqlite-append-only.md) e o relatório da sessão.

## Limitações conhecidas

- GPS simulado em ambas as apps; sem GPS real.
- CHANGE (mudar de desporto) não tem cobertura automatizada no teste de dispositivo Android: `uiautomator dump` não consegue ler o ecrã ao vivo desta app (confirmado, não depende de `testID`/`resource-id`). Cobertura fica pelos testes de unidade do motor e do adaptador; procedimento manual documentado no relatório da sessão 03 §5.2.
- Os ícones são os do template Expo; não há splash configurado (o Android mostra o ícone por defeito). (`android.package` = `com.bricklap.app` ficou **decidido** pelo fundador na sessão 02.)
- Identidade do responsável pelo tratamento continua por preencher (`apps/web-lab/src/lib/legal/config.ts`).
- Sistema de unidades imperial não implementado (só métrico).
- Sem ecrã de definições: língua e unidades detetam-se uma vez no arranque, sem forma de o utilizador escolher à mão.
- `pt-BR` (e qualquer variante não listada) cai em `pt-PT`, não em inglês — decisão deliberada (ver `packages/i18n/README.md`), a rever se vier a fazer sentido uma tradução `pt-BR` própria.
- Sem CI, sem lint.

## Ambiente de desenvolvimento

- Windows 10 Home 22H2 (build 19045) + WSL 2 (Ubuntu). **Node 24.21.0 LTS via nvm**, npm 11.19.0. `npm install` funciona sem o workaround `npx npm@11` da sessão 01.
- **Toolchain Android instalada em modo utilizador** (sem `root`, porque `sudo` pede palavra-passe): JDK 17 Temurin em `~/opt/jdk-17`; Android SDK em `~/Android/Sdk` com `platform-tools` 37.0.1, `platforms;android-36` e `build-tools;36.0.0`. `JAVA_HOME`/`ANDROID_HOME`/`PATH` fixados no `~/.bashrc`.
- **Sem EAS** (decisão do fundador, sem conta Expo): build local com `npx expo run:android`. Ver [docs/adr/0005-build-local-android.md](docs/adr/0005-build-local-android.md).
- Telemóvel ligado por **depuração sem fios** (`adb pair` / `adb connect`); Metro alcançável por `adb reverse tcp:8081 tcp:8081`. O modo espelhado da WSL não é opção em Windows 10.

## Próximo passo

**Fase 2, parte 2 — GPS real**: trocar `sampleFromSim` por `sampleFromGps` (`expo-location` em primeiro plano); a persistência não muda (ADR 0006). Ver [ROADMAP.md](ROADMAP.md) e o relatório da sessão 03.

Antes disso, uma validação que falta e não exige código novo: uma sessão longa com o telemóvel no bolso, sabendo que a app ainda não grava em segundo plano. Setup, problemas e validação funcional da Fase 1: [docs/reports/2026-09-09-sessao-02.md](docs/reports/2026-09-09-sessao-02.md) §10 e §11.

# Estado do projeto

**Data**: 2026-09-10 · **Branch**: `main` · **Fase**: 1 e **2 concluídas** (2026-09-10); **Fase 3 por iniciar**

## Por pacote

| Pacote | Estado | Prova |
|---|---|---|
| `@bricklap/engine` | Motor puro, API estável, sem dependências de runtime, sem texto de interface (`SPORT_PACE_KIND` é lógica, não rótulo). Não mudou nesta sessão | `npm test`: cobertura 100%; `tsc` limpo; limiares verificados por mutação |
| `@bricklap/i18n` | Dicionários `en` (base) e `pt-PT`, tipados; `t(key)` tipado; unidades metric/imperial (imperial declarado, não implementado) | cobertura 100%; `tsc` limpo |
| `@bricklap/web-lab` | SPA Vite + TanStack Router; consome motor + i18n; chave `bricklap.v1` com migração de `afterlap.v1`; toda a cópia via `t()` | `tsc` limpo; `vite build` ok |
| `@bricklap/mobile` | Expo SDK 57, dev client, `platforms: ["android"]`; ecrãs START/CHANGE/STOP + resumo/histórico; toda a cópia via `t()`; **persistência local SQLite append-only (ADR 0006), recuperação real ao reabrir; GPS real em primeiro plano com ecrã ligado, pedido a 1 Hz (ADR 0007)**, simulador só por interruptor de dev; registo bruto `gps-raw.jsonl` e script GeoJSON | `tsc` limpo; `expo export --platform android` ok; 18 testes do adaptador em Node; **teste de recuperação no dispositivo 6/6** com o build novo; **GPS real validado à mão no telemóvel** (permissão recusada/aceite/localização desligada tratadas; 121 fixes, kill → retoma → descarta) — ver `docs/reports/2026-09-10-sessao-04.md` §4. **Build de release verificado a arrancar e a gravar sem Metro** (§4.5) e **caminhada real do fundador: 18:37, 1097 amostras a ≈ 1 Hz, 1,489 km, um buraco de 16 s (o fecho/reabertura deliberado), 0 fixes fracos, `recovered` na base** (§6) |

## O que existe

- Monorepo npm workspaces, lockfile único (577 pacotes instalados).
- Rename Afterlap → Bricklap completo (sessão 01).
- **i18n mínimo (sessão 02)**: inglês como língua-base, pt-PT como primeira tradução, deteção automática pelo dispositivo com fallback para inglês. Nenhuma string de interface cravada nos componentes do lab ou da app — tudo via `t()`. Os textos legais continuam pt-PT/UE, fora do i18n (exceção decidida pelo fundador).
- Camada de unidades (`@bricklap/i18n/units`): métrico implementado hoje; imperial declarado no tipo, não implementado (lança em vez de adivinhar).
- Ambiente de desenvolvimento em Node 24.21.0 LTS / npm 11.19.0 e toolchain Android local (JDK 17 + SDK 36), tudo instalado nesta sessão.
- Documentação: README, ARCHITECTURE, ROADMAP, STATUS, CLAUDE.md, `docs/adr/0001–0006`, `docs/BACKLOG.md`, `docs/HISTORY.md`, `docs/reports/`.
- **GPS real no Android (sessão 04)**: `expo-location` em primeiro plano a 1 Hz com o ecrã mantido ligado, permissões en + pt-PT com os estados de recusa tratados no ecrã, registo bruto `gps-raw.jsonl` com a precisão de cada fix, script de exportação para GeoJSON. **Validado por uma caminhada real** (relatório da sessão 04 §6) — é o que fechou a Fase 2. Ver [ADR 0007](docs/adr/0007-gps-primeiro-plano.md).
- **Persistência local no Android (sessão 03)**: base SQLite append-only (`apps/mobile/persistence/`), replay puro, ecrã de resumo ao arrancar (continuar/descartar), histórico mínimo. Apagamento de sessão a pedido do utilizador (RGPD) é um `DELETE` real, decisão registada para a Fase 4. Ver [ADR 0006](docs/adr/0006-persistencia-sqlite-append-only.md) e o relatório da sessão.

## Limitações conhecidas

- GPS real só em **primeiro plano, com o ecrã ligado** (a app trata de o manter ligado); em segundo plano ou com o ecrã desligado não grava — Fase 3. O lab web continua com GPS simulado.
- A precisão de cada fix (e a marca "fraco" > 30 m) só existe no registo bruto `gps-raw.jsonl`, não na base (ADR 0007 §5); a migração v2 fica para a Fase 3.
- **O ritmo em caminhada parece mal calibrado** (nota do fundador, relatório da sessão 04 §6.1): em corrida pareceu bem. Hipótese: ruído do GPS proporcionalmente maior a velocidades baixas. A tratar com o filtro/suavização da Fase 3 — é o candidato a primeiro item da fase.
- Com o telemóvel **imóvel**, o sistema entrega um fix a cada 4–6 s em vez de 1 Hz (supressão de fixes repetidos, não defeito da app). Em movimento entrega ≈ 1 Hz, medido na caminhada. Só importa para quem interpretar gravações feitas em cima de uma mesa.
- **A base não se exporta do build de release**: `run-as` exige um APK depurável. Contorna-se instalando o APK de debug por cima e reinstalando o release depois (mesma chave, dados intactos) — procedimento no README. Exportar de dentro da app está no BACKLOG.
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
- Telemóvel ligado por **USB**, com o `adb.exe` do Windows chamado diretamente da WSL (a firewall bloqueia a ponte para o `adb` da WSL; a depuração sem fios exige Wi-Fi e o fundador trabalha muitas vezes em hotspot). O Metro alcança-se por `adb.exe reverse tcp:8081 tcp:8082` através de um relé IPv4, porque o Metro da WSL só se expõe em `[::1]:8081` — ver o README da app. O modo espelhado da WSL não é opção em Windows 10.

## Próximo passo

**Fase 3 — segundo plano e fiabilidade** (por iniciar): gravar com o ecrã desligado e a app em segundo plano (foreground service com notificação persistente, bateria/doze) e o **filtro/suavização de amostras**, começando pelo ritmo em caminhada que o fundador achou mal calibrado (relatório da sessão 04 §6.1). Os dados crus para decidir o filtro já existem em `gps-raw.jsonl`. Critério de saída no [ROADMAP.md](ROADMAP.md): 2 h de gravação contínua com o telemóvel no bolso, sem buracos superiores a 10 s. Restantes itens no [BACKLOG](docs/BACKLOG.md).

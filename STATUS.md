# Estado do projeto

**Data**: 2026-09-11 · **Branch**: `feat/ritmo-e-exportacao` · **Fase**: 1 e 2 concluídas (2026-09-10); **Fase 3 em curso — partes 1 (desportos sem GPS, sessão 05) e 2 (ritmo, precisão na base, exportação, sessão 06) feitas; falta o segundo plano (sessão 07)**

## Por pacote

| Pacote | Estado | Prova |
|---|---|---|
| `@bricklap/engine` | Motor puro, API estável, sem dependências de runtime, sem texto de interface (`SPORT_PACE_KIND` e `SPORT_HAS_GPS` são lógica, não rótulos). Oito desportos, quatro sem GPS; a distância da sessão é a soma dos segmentos (ADR 0008). **Sessão 06** (ADR 0009): `Sample.accuracyM` opcional; `recentMetrics` — o ritmo dos últimos 30 s de um segmento; **sem filtro na distância**, decidido sobre as duas sessões de campo | `npm test`: 169 testes, cobertura 100% (declarações, ramos, funções, linhas); `tsc` limpo; `test/pace.test.ts` corre sobre excertos reais anonimizados (só Δt, distância, precisão) |
| `@bricklap/i18n` | Dicionários `en` (base) e `pt-PT`, tipados; `t(key)` tipado; unidades metric/imperial (imperial declarado, não implementado). Nomes dos oito desportos, rótulos dos grupos "Rua" / "Ginásio / Piscina", "Ritmo atual" / "Velocidade atual", "Exportar dados" | cobertura 100%; `tsc` limpo |
| `@bricklap/web-lab` | SPA Vite + TanStack Router; consome motor + i18n; chave `bricklap.v1` com migração de `afterlap.v1`; toda a cópia via `t()` | `tsc` limpo; `vite build` ok |
| `@bricklap/mobile` | Expo SDK 57, dev client, `platforms: ["android"]`; ecrãs START/CHANGE/STOP + resumo/histórico; toda a cópia via `t()`; **persistência local SQLite append-only (ADR 0006; esquema v2 com a precisão de cada fix, ADR 0009), recuperação real ao reabrir; GPS real em primeiro plano com ecrã ligado, pedido a 1 Hz (ADR 0007); desportos de ginásio e piscina só de tempo, watcher ligado ao segmento, permissão pedida quando faz falta (ADR 0008); ritmo médio do segmento + "Ritmo atual" dos últimos 30 s; botão "Exportar dados" no histórico (cópia consistente da base pela folha de partilha)**; simulador só por interruptor de dev; registo bruto `gps-raw.jsonl` só em dev, rodado por sessão; scripts GeoJSON e de análise do ruído | `tsc` limpo; `expo export --platform android` ok; 21 testes do adaptador em Node (migração v1 → v2 incluída); **teste de recuperação no dispositivo 6/6** com o build da sessão 06 (à segunda corrida — relatório §4.2); **migração v2, precisão gravada, rotação do registo bruto e exportação provadas no telemóvel** (relatório da sessão 06 §4.3: folha de partilha com a base inteira, `integrity_check = ok`). Caminhada real (sessão 04): 18:37, 1097 amostras a ≈ 1 Hz; corrida real (2026-09-11): 25:02, 1481 amostras, 4,21 km — Strava 4,24 km. **Release da sessão 06 compilado mas ainda não instalado** (relatório §4.4 e §6) |

## O que existe

- Monorepo npm workspaces, lockfile único (577 pacotes instalados).
- Rename Afterlap → Bricklap completo (sessão 01).
- **i18n mínimo (sessão 02)**: inglês como língua-base, pt-PT como primeira tradução, deteção automática pelo dispositivo com fallback para inglês. Nenhuma string de interface cravada nos componentes do lab ou da app — tudo via `t()`. Os textos legais continuam pt-PT/UE, fora do i18n (exceção decidida pelo fundador).
- Camada de unidades (`@bricklap/i18n/units`): métrico implementado hoje; imperial declarado no tipo, não implementado (lança em vez de adivinhar).
- Ambiente de desenvolvimento em Node 24.21.0 LTS / npm 11.19.0 e toolchain Android local (JDK 17 + SDK 36), tudo instalado nesta sessão.
- Documentação: README, ARCHITECTURE, ROADMAP, STATUS, CLAUDE.md, `docs/adr/0001–0009`, `docs/VISAO.md`, `docs/BACKLOG.md`, `docs/HISTORY.md`, `docs/reports/`.
- **Visão do produto (sessão 06, decisão do fundador)**: um treino HIIT/AMRAP é uma sessão com blocos de força, passadeira, remo e corrida, cada um com as suas métricas — [docs/VISAO.md](docs/VISAO.md), três frases fixas no topo do ROADMAP. Registada, não construída: é o ponto de partida da Fase 4.
- **Ritmo, precisão e exportação (sessão 06)**: a caminhada estava bem calibrada — o ritmo médio do segmento diluía 103 s de paragens; sem filtro na distância (1,489 km e 4,213 km inalterados); "Ritmo atual" dos últimos 30 s; precisão de cada fix na base (v2); registo bruto só em dev, rodado; botão de exportação. Ver [ADR 0009](docs/adr/0009-ritmo-precisao-exportacao.md) e `docs/reports/2026-09-11-sessao-06.md`.
- **Desportos sem GPS (sessão 05)**: força, remo indoor, passadeira, natação em piscina como segmentos só de tempo; sessões mistas rua/ginásio; watcher de posição só enquanto o segmento atual tiver GPS; permissão sob demanda; oito chips em duas linhas. Ver [ADR 0008](docs/adr/0008-desportos-sem-gps.md) e `docs/reports/2026-09-10-sessao-05.md`.
- **GPS real no Android (sessão 04)**: `expo-location` em primeiro plano a 1 Hz com o ecrã mantido ligado, permissões en + pt-PT com os estados de recusa tratados no ecrã, registo bruto `gps-raw.jsonl` com a precisão de cada fix, script de exportação para GeoJSON. **Validado por uma caminhada real** (relatório da sessão 04 §6) — é o que fechou a Fase 2. Ver [ADR 0007](docs/adr/0007-gps-primeiro-plano.md).
- **Persistência local no Android (sessão 03)**: base SQLite append-only (`apps/mobile/persistence/`), replay puro, ecrã de resumo ao arrancar (continuar/descartar), histórico mínimo. Apagamento de sessão a pedido do utilizador (RGPD) é um `DELETE` real, decisão registada para a Fase 4. Ver [ADR 0006](docs/adr/0006-persistencia-sqlite-append-only.md) e o relatório da sessão.

## Limitações conhecidas

- **O ecrã de gravação não é legível pelo `uiautomator`** em nenhum build (falha com `could not get idle state`: o relógio re-renderiza 4×/s). Consequência prática: mudar de desporto a meio de uma sessão não se automatiza por `uiautomator` — na sessão 05 fez-se por navegação de foco com o teclado, cuja ordem não é controlável. A via para automatizar é o *broadcast receiver* de depuração que está no BACKLOG desde a sessão 03.

- GPS real só em **primeiro plano, com o ecrã ligado** (a app trata de o manter ligado); em segundo plano ou com o ecrã desligado não grava — sessão 07. O lab web continua com GPS simulado.
- **Sem filtro por precisão** (decisão com dados, ADR 0009): nas duas sessões de campo a precisão foi de 3–5 m e um limiar relativo à precisão só retirava deriva com o telemóvel parado. Se uma sessão real mostrar fixes fracos, a coluna `accuracy` está na base para reabrir a questão. Um troço isolado a > 6 m/s numa caminhada passa pelo corte de 55 m/s (≈ 5 m num segmento).
- O ritmo médio do segmento inclui as paragens; o "ritmo atual" (30 s) mostra-as como "—". Um **ritmo em movimento** (média sem paragens) fica para o resumo da Fase 4.
- Com o telemóvel **imóvel**, o sistema entrega um fix a cada 4–10 s em vez de 1 Hz (supressão de fixes repetidos, não defeito da app). Em movimento entrega ≈ 1 Hz, medido na caminhada e na corrida. Só importa para quem interpretar gravações feitas em cima de uma mesa.
- O `expo-file-system` não expõe a pasta externa da app: a exportação sai só pela folha de partilha do sistema. Num build de dev a folha aparece duas vezes (base, depois registo bruto).
- CHANGE (mudar de desporto) não tem cobertura automatizada no teste de dispositivo Android: `uiautomator dump` não consegue ler o ecrã ao vivo desta app (confirmado, não depende de `testID`/`resource-id`). Cobertura fica pelos testes de unidade do motor e do adaptador; procedimento manual documentado no relatório da sessão 03 §5.2. Pela mesma razão, "Ritmo atual" só está coberto por testes de unidade.
- O teste de dispositivo falhou uma vez por margem (5 s depois de "Continuar" sem amostra nova, logo após um Metro `--clear`) e passou 6/6 à segunda sem alterações — relatório da sessão 06 §4.2.
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

**Imediato**: instalar o release da sessão 06 no telemóvel e confirmar o arranque a frio sem Metro (ficou pendente de um toque no diálogo de depuração USB — relatório da sessão 06 §6). Depois, **Fase 3, sessão 07 — segundo plano**: gravar com o ecrã desligado e a app em segundo plano (foreground service com notificação persistente, bateria/doze). Critério de saída no [ROADMAP.md](ROADMAP.md): 2 h de gravação contínua com o telemóvel no bolso, sem buracos superiores a 10 s. A Fase 4 parte de [docs/VISAO.md](docs/VISAO.md). Restantes itens no [BACKLOG](docs/BACKLOG.md).

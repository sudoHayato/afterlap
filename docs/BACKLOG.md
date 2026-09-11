# Backlog

Prioridades: **P0** bloqueia a próxima sessão; **P1** próxima fase; **P2** quando calhar. Itens marcados "a decidir" precisam do fundador.

## P0 — Fase 1, fecho

- [ ] **Instalar e correr o APK no telemóvel** (build local, `npx expo run:android --device`) e validar START/CHANGE/STOP com os quatro desportos e as duas línguas.

Decidido pelo fundador na sessão 02, já não é backlog: `android.package` = `com.bricklap.app` é **definitivo**; **EAS abandonado** (sem conta Expo) — o caminho é build local, ver `docs/adr/0005-build-local-android.md`.

## P1 — Fase 2 (concluída em 2026-09-10)

Feito na sessão 03 (ADR 0006): adaptador de persistência SQLite append-only e `recovered` real ao reabrir a app. Feito na sessão 04 (ADR 0007): `expo-location` em primeiro plano, textos de permissão en + pt-PT, ecrã ligado enquanto grava, registo bruto `gps-raw.jsonl`, exportação GeoJSON. **Teste de campo do fundador feito** (relatório da sessão 04 §6): 18:37, 1097 amostras a ≈ 1 Hz, um buraco (o fecho/reabertura deliberado), `recovered` na base. Fase 2 fechada pelo CTO. Fica por fazer, sem bloquear nada:

- [ ] Ícones e cor de fundo definitivos (hoje assets do template Expo); splash com `expo-splash-screen` (não configurado; `assets/splash-icon.png` está por usar).
- [ ] Decidir `newArchEnabled` explícito em `app.json` (SDK 57 já usa a nova arquitetura por defeito; deixar explícito evita surpresas).
- [ ] Antes de distribuir: `android.blockedPermissions` para `READ/WRITE_EXTERNAL_STORAGE` (e `INTERNET` enquanto não for usada) — vêm do template do Expo, não do `app.json`.
- [ ] Tema escuro a nível de sistema (diálogos, teclado): exige `expo-system-ui`; hoje a app pinta as suas cores e o `userInterfaceStyle` foi retirado por não ter efeito sem esse módulo.
- [ ] CI (GitHub Actions): `npm test`, `npm run typecheck`, `npm run build:web`, `expo export --platform android`.

## Visão do produto — blocos por métrica (Fase 4+, sem desenho)

Decisão do fundador em [docs/VISAO.md](VISAO.md): um treino HIIT/AMRAP é uma sessão com blocos, cada um com as suas métricas. Uma linha por bloco futuro, **todos Fase 4+**, nenhum desenhado agora:

- [ ] **Força com exercício, repetições e carga** por segmento (Fase 4+). Introdução após o treino sobre o segmento já gravado é a primeira via a estudar; durante o treino é Fase 5 (relógio).
- [ ] **Passadeira por ritmo × distância → tempo** (Fase 4+): o atleta introduz o ritmo e a distância da máquina; o tempo já está gravado.
- [ ] **Remo indoor com metros** (Fase 4+): metros do monitor do remo, introduzidos após o treino.
- [ ] **Natação em piscina com piscinas/metros** (Fase 4+), pela mesma via.

## P1 — Fase 3 (herdado da sessão 04; partes 1, 2 e 3 feitas nas sessões 05–08; fecho pendente do teste de 2 h)

- [x] **Desportos sem GPS** (sessão 05, ADR 0008): força, remo indoor, passadeira, natação em piscina; segmentos só de tempo; watcher ligado ao segmento; permissão sob demanda; oito chips em duas linhas.
- [ ] **Introdução manual de distância nos desportos sem GPS** — absorvido pelos blocos da visão do produto acima (Fase 4+).
- [ ] **Chips do ecrã inicial com oito desportos**: duas linhas rotuladas chegam para não piorar; um desenho a sério (ícones, ordem por uso, último usado primeiro) é Fase 4.

- [x] ~~**Cadência de amostras**~~ — **resolvido pelo teste de campo** (sessão 04 §6): em movimento a app entrega ≈ 1 Hz (58,9 amostras/min em 18:37). Os 4–6 s medidos com o telemóvel parado eram supressão de fixes repetidos pelo sistema (`Location Change Trigger`), não um defeito. Nada a fazer.
- [x] ~~**Ritmo em caminhada mal calibrado**~~ — **resolvido com dados na sessão 06** ([ADR 0009](adr/0009-ritmo-precisao-exportacao.md)): a caminhada estava bem; o ritmo médio do segmento diluía 103 s de paragens (14:06/km em vez de ≈ 12:20 a andar). A hipótese do ruído confirmou-se por troço (cv 0,49 a andar vs 0,14 a correr) mas o ecrã nunca o mostrava. Sem filtro na distância; "ritmo atual" dos últimos 30 s no ecrã de gravação.
- [ ] **Ritmo em movimento no resumo** (excluir paragens, como o Strava) — **Fase 4, decisão do CTO no fecho da sessão 06**. Definição provisória de "parado": velocidade < 0,5 m/s durante 5 s. A velocidade Doppler do provider pode servir para detetar "parado", **nunca para distância** (decisão do CTO: é 6–12 % lenta face à haversine).
- [ ] **Filtro por precisão** (limiar de deslocamento relativo à precisão): **rejeitado com números na sessão 06** — nas duas sessões de campo só retira 1 % de deriva com o telemóvel parado e torna o ritmo em janela mais nervoso; a precisão (mediana 3–4 m) não distingue fixes bons de maus. Reabrir só com uma sessão real com fixes fracos; a coluna `accuracy` está na base para isso.
- [ ] **Limite de plausibilidade por desporto** (decisão do CTO no fecho da sessão 06: fica no BACKLOG). Hoje só há o corte de 55 m/s para todos; uma caminhada da sessão 04 teve um troço a > 6 m/s em 329 (≈ 5 m a mais, 1 % do segmento) que esse corte não apanha. Um limite por desporto (p. ex. 5 m/s a andar) é uma tabela ao lado de `SIM_SPEED_MPS`. Sem data.
- [x] ~~**Exportação de dentro da app**~~ — **feito na sessão 06**: botão "Exportar dados" no histórico (`VACUUM INTO` + folha de partilha do sistema via `expo-sharing`). **Decisão do CTO**: a partilha do sistema chega, sem módulo nativo para a pasta externa da app; a folha dupla num build de dev (base, depois registo bruto) é aceitável. O procedimento de duas instalações fica no README como alternativa.
- [x] ~~**Segundo plano — versão final (sessão 08)**~~ — **feito na sessão 08** sobre o [ADR 0010](adr/0010-segundo-plano.md): watcher antigo e `expo-keep-awake` fora; textos da bateria no i18n e aviso persistente na recusa; `bg-diag.jsonl` só em dev, rodado por sessão; `recovered_headless` na base; teste de dispositivo com `kill -9` a meio (reanimação + hidratação headless) e reinício do telemóvel. Fica a amostra de fronteira como estava (decisão do CTO).
- [ ] **Teste de campo de 2 h** (critério de saída da Fase 3): com o release da sessão 08, telemóvel no bolso, bateria longe dos 100 %, um troço parado (ginásio). Quando o fundador avisar: análise pela secção "Teste de campo de 2 h" do relatório da sessão 08, fecho da fase, merge em `main`. Inclui o **custo da escrita por lote** (decisão do CTO), lido do resumo `files/write-cost.json`. **Gatilho do CTO**: se o teste mostrar perdas, passa-se ao módulo Kotlin (ADR 0010 §5b) sem nova discussão.
- [ ] **Remendo ao `expo-task-manager`** (`patches/expo-task-manager+57.0.17.patch`, sessão 08): gestor de tarefas perdido quando a app abre no motor React headless. Tirar quando houver correção a montante (issue no ADR 0010) e rever a cada atualização do SDK. **À quarta surpresa na camada expo, módulo Kotlin** (regra do CTO).
- [ ] **Precisão no bolso** (decisão do CTO na sessão 08: **sem filtro nesta sessão**): no teste da sessão 07 a precisão mediana foi 8,7 m (4 m na mão), com fixes até 196 m. Guardar os dados do teste de 2 h e reavaliar o filtro rejeitado no ADR 0009 sobre dados de bolso, pela mesma regra (distância ±2 %, ritmo não piora), na sessão seguinte.
- [ ] **Notificação com cronómetro a andar e distância**: a API do `expo-location` só aceita título/corpo como opções da tarefa, e mudá-los reinicia o pedido de localização (ADR 0010, "Notificação"). Hoje mostra o desporto e o tempo decorrido à data do último START/CHANGE/Continuar, com essa hora no corpo. Um cronómetro ao vivo exige um serviço nosso (ADR 0010 §5b) ou `expo-notifications` por cima da notificação do serviço. Fase 4, se compensar.
- [ ] **Amostras fora de ordem na fronteira**: um fix tirado antes do CHANGE/STOP mas entregue depois fica na base atrás da amostra de fronteira (≤ 1 s em campo). A distância não muda; ≤ 1 s de movimento pode cair no segmento errado. Só corrigir se alguma análise o mostrar.
- [ ] **Retoma automática depois de um reinício do telemóvel**: o Android não deixa o `expo-location` arrancar o serviço com a app em segundo plano ao `BOOT_COMPLETED`; a retoma é ao abrir a app (decisão do CTO: chega). Se um dia fizer falta, é um serviço nosso arrancado pelo `BOOT_COMPLETED` (ADR 0010 §5b).
- [ ] **Teste de dispositivo: margem depois de "Continuar"** (decisão do CTO no fecho da sessão 06): se voltar a falhar por margem, alargar a espera de 5 s para 10 s e registar os tempos reais (quanto demorou a primeira amostra nova) no relatório dessa sessão.
- [x] ~~**Precisão junto da amostra**~~ — **feito na sessão 06**: migração v2 (`samples.accuracy REAL NULL`), `Sample.accuracyM` opcional, adaptador a gravar a precisão de cada fix.
- [x] ~~**Registo bruto cresce sem limite**~~ — **feito na sessão 06**: só em builds de desenvolvimento, rodado por sessão (`gps-raw.prev.jsonl` guarda o anterior).
- [ ] `scripts/geojson.mjs` ainda lê a precisão do registo bruto; podia lê-la da base (v2). Não é urgente.
- [x] ~~`t` da amostra = hora de chegada~~ — **desde a sessão 08 (ADR 0010, decisão do CTO) `t` é o timestamp do fix**; o registo bruto (dev) guarda `arrivedAt` para medir o atraso de entrega.

## P1 — i18n (sessão 02)

- [ ] **Sistema de unidades imperial**: `UnitSystem` já declara `"imperial"`; `formatDistanceForUnit`/`formatSpeedForUnit`/`formatPaceForUnit` lançam em vez de o implementar. Implementar quando houver pedido real (milhas, pés, mph).
- [ ] **Ecrã de definições** para escolher língua e sistema de unidades à mão — hoje é só deteção automática do dispositivo, uma vez, no arranque (sem troca em runtime).
- [ ] **Dicionário `pt-BR` próprio, se o Brasil vier a ser mercado.** O fundador aprovou que, por agora, `pt-BR` (e qualquer variante de português não listada) caia em `pt-PT` — é melhor do que inglês. Se o Brasil passar a ser mercado, merece dicionário próprio: vocabulário (ecrã/tela, telemóvel/celular, ficheiro/arquivo) e ortografia divergem o suficiente para soar estrangeiro.
- [ ] Textos legais: quando a app nativa tiver as suas próprias páginas legais (Fase 4), decidir se continuam só pt-PT/UE ou se passam a ter tradução — hoje a decisão do fundador foi mantê-los fora do i18n.
- [ ] `apps/web-lab/src/lib/i18n.ts` e `apps/mobile/i18n.ts` calculam o locale uma vez, no arranque do módulo — não reagem a uma mudança de língua do sistema operativo enquanto a app está aberta (aceitável sem ecrã de definições).

## P2 — Qualidade e dívida

- [ ] Motor: `Segment.sampleStart`/`sampleEnd` duplicam `startAt`/`endAt` — simplificar ou dar-lhes significado (índices de amostras).
- [ ] Motor: `newId()` usa `Math.random`; considerar `crypto.randomUUID` quando disponível nas duas plataformas.
- [ ] Lab: decidir ESLint/Prettier (hoje só `.prettierrc` como convenção de editor) e um smoke test e2e.
- [ ] Lab: `apps/mobile/.gitignore` ainda lista `/ios` e `web-build/` (inofensivo; limpar quando se mexer no ficheiro).
- [ ] Mobile: insets calculados à mão (`StatusBar.currentHeight` em cima, 64 dp em baixo); substituir por `react-native-safe-area-context` quando houver mais ecrãs.
- [ ] Mobile: "Nova sessão" fica desativado 700 ms depois de Parar para um toque duplo não apagar a sessão; substituir por confirmação quando houver persistência.
- [ ] Badge de cobertura e relatório HTML publicado (opcional).
- [ ] `testID` não mapeia para `resource-id` no `uiautomator dump` desta app (RN 0.86, Android) — confirmado na sessão 03 (`docs/reports/2026-09-10-sessao-03.md` §5.1). Revisitar só se a app vier a precisar de Detox/Appium a sério.
- [ ] Cobrir CHANGE no teste de dispositivo Android: hoje impossível por `uiautomator` (ver `docs/reports/2026-09-10-sessao-03.md` §5.2 — o ecrã ao vivo nunca fica "idle"). Se algum dia for preciso, a via é um *broadcast receiver* de depuração que dispare a troca de desporto diretamente na app, sem tocar no ecrã — não `uiautomator`.

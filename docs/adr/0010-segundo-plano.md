# ADR 0010 — Segundo plano: tarefa de localização do expo-location com serviço em primeiro plano

**Estado**: **proposto, condicionado ao teste de campo** (sessão 07, 2026-09-11). A decisão final fecha-se com os números da Parte C do relatório da sessão 07; o que está abaixo é o desenho, a investigação e o critério de decisão. **Decisão do CTO** quanto ao método; **decisões do fundador** já tomadas e não reabertas: notificação persistente durante a gravação; pedir ao utilizador a exceção de otimização de bateria (a app explica e abre as definições, não contorna); permissão "enquanto usa a app" com serviço em primeiro plano, "sempre" só se se provar que não há outra forma.

## Contexto

A app grava só com o ecrã ligado (ADR 0007: watcher em primeiro plano + `expo-keep-awake`). O objetivo da Fase 3, parte 3, é gravar com o ecrã apagado e o telemóvel no bolso; critério de saída da fase: 2 h contínuas sem buracos > 10 s. Esta sessão não constrói a versão final — produz uma experiência instrumentada e os dados para decidir.

## Investigação (Parte A)

### 1. `expo-location` no SDK 57 — o que exige, provado no código nativo e no manifesto

`startLocationUpdatesAsync(taskName, options)` em `LocationModule.kt` (expo-location 57.0.16) faz quatro verificações, por esta ordem:

1. `ACCESS_FINE_LOCATION` ou `ACCESS_COARSE_LOCATION` concedida — senão `LocationBackgroundUnauthorizedException`.
2. **`ACCESS_BACKGROUND_LOCATION` só é exigida quando `options.foregroundService` não é dado.** O comentário no código é explícito: "*a user-initiated foreground service with notification does NOT require the background location permission*".
3. A app tem de estar **em primeiro plano** no momento do arranque (`AppForegroundedSingleton.isForegrounded`) — senão `ForegroundServiceStartNotAllowedException`. É a regra do Android 12+ para arrancar serviços em primeiro plano; a app arranca-o no "Iniciar", com o ecrã aberto, e o serviço sobrevive ao ecrã apagar-se.
4. Com `foregroundService`, em SDK 34+: `FOREGROUND_SERVICE` **e** `FOREGROUND_SERVICE_LOCATION` no manifesto — senão `ForegroundServicePermissionsException`.

O plugin de configuração (`withLocation.js`) só declara `ACCESS_BACKGROUND_LOCATION` com `isAndroidBackgroundLocationEnabled: true`, e `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION` com `isAndroidForegroundServiceEnabled: true`. O manifesto da biblioteca declara o serviço `LocationTaskService` com `foregroundServiceType="location"`. Configuração escolhida em `app.json`: **`isAndroidBackgroundLocationEnabled: false`, `isAndroidForegroundServiceEnabled: true`** — o manifesto gerado tem as duas permissões de serviço e **não** tem `ACCESS_BACKGROUND_LOCATION` (verificado no `AndroidManifest.xml` gerado e no manifesto fundido do release; ver relatório §4.1).

Resposta à pergunta do brief: **funciona só com `ACCESS_FINE_LOCATION` + `FOREGROUND_SERVICE_LOCATION`**, pelo código — e **provado no telemóvel** (Android 16, One UI 8.5): com o manifesto sem `ACCESS_BACKGROUND_LOCATION`, o `ActivityManager` registou `Background started FGS: Allowed … cmp=com.bricklap.app/expo.modules.location.services.LocationTaskService … uidState: TOP`, e o `LocationManagerService` abriu o pedido `Request[@+1s0ms HIGH_ACCURACY … WorkSource{com.bricklap.app}]` via `fused_location_provider`. A permissão "sempre" não é precisa para este caminho.

**Uma exigência que nenhuma documentação diz — descoberta no primeiro fix.** O `expo-task-manager` agenda os *jobs* como **persistentes** (`JobInfo.Builder.setPersisted(true)`, para sobreviverem a um *reboot*), e o Android recusa-os com `IllegalArgumentException: Requested job cannot be persisted without holding android.permission.RECEIVE_BOOT_COMPLETED`. Nem o `expo-task-manager` nem o `expo-location` declaram essa permissão no manifesto da biblioteca, e o plugin de configuração também não; o primeiro build de experiência **rebentou** (`FATAL EXCEPTION` em `TaskManagerUtils.updateOrScheduleJob`) ao chegar o primeiro fix, e voltou a rebentar no `TaskBroadcastReceiver` a cada tentativa seguinte. Correção: `android.permission.RECEIVE_BOOT_COMPLETED` em `android.permissions` no `app.json` — permissão normal, sem diálogo. Fica registado para a versão final e para quem vier a ler a documentação do Expo sem este aviso.

### 2. Como os fixes chegam à tarefa — e o que isso obriga

`LocationTaskConsumer.kt`: o consumidor pede posições ao `FusedLocationProviderClient` com um `PendingIntent`; cada resultado passa por `handleLocationUpdate`. Em primeiro plano reporta de imediato; em segundo plano acumula num *buffer* e reporta quando `deferredUpdatesInterval`/`deferredUpdatesDistance` (ambos 0 por omissão) estão satisfeitos — com 0 e 0, a cada resultado. **Em qualquer dos casos o caminho é `taskManagerUtils.scheduleJob` → `JobScheduler` → `TaskJobService` → `didExecuteJob` → `mTask.execute`**: as posições viajam serializadas num `PersistableBundle` e a tarefa JS recebe `{ locations: [...] }`. Com a app viva, executa no contexto JS existente; com o processo morto, o `expo-task-manager` arranca um contexto *headless* (`HeadlessAppLoader`) só para correr a tarefa.

Consequências para o desenho:

- **`t` da amostra = timestamp do próprio fix**, não a hora de chegada (o `JobScheduler` pode atrasar um lote segundos, em *doze* mais). Muda em relação ao ADR 0007, onde `t` era a hora de chegada.
- **O contexto *headless* não tem React nem store em memória.** A tarefa tem de abrir o store como *singleton* de módulo, hidratá-lo (o que regista `recovered`, como qualquer arranque) e, se não houver sessão ao vivo, **parar a tarefa** — senão fica um serviço zombie a gastar bateria.
- **A tarefa tem de estar definida no arranque de qualquer contexto JS** — em `index.ts`, antes do `registerRootComponent`. Uma tarefa definida depois do primeiro *job* que a nomeia é descartada.
- O `JobScheduler` tem os seus próprios limites (quotas por app em *standby buckets*, *doze*); é exatamente isto que a exceção de bateria e o teste de campo medem.

### 3. Arquitetura da experiência

```
index.ts            defineRecordingTask()  ← antes do React, em todos os contextos
gps/background.ts   tarefa: locations → store.pushSample(sampleFromGps(coords, fix.timestamp))
                    start/stop do serviço; latestLocation() para a fronteira e a linha do GPS
gps/diag.ts         BRICKLAP_BG no logcat + files/bg-diag.jsonl (serviço, lotes, bateria/min)
gps/battery.ts      isBatteryOptimised() (expo-battery) · requestBatteryExemption() (intent)
store.ts            inalterado: já era um singleton de módulo — serve a tarefa e o ecrã
persistence/        inalterado (esquema v2 chega)
App.tsx             feed real = start/stop da tarefa; o relógio relê getStore().live() a cada tick;
                    sem keep-awake; cartão da exceção de bateria no ecrã inicial
```

O que muda e o que não muda: **`persistence/` não muda** (o store já era um *singleton* por processo com `hydrate()` a repor a sessão ao vivo por *replay*); **`gps/location.ts` mantém** a permissão e o watcher (o simulador e o lab não o usam; fica para a versão final decidir se sai); **`App.tsx`** troca a subscrição pela tarefa e passa a ler o store no relógio em vez de receber *callbacks*. A interface já lia a sessão por *replay* da base na retoma — agora fá-lo também durante a gravação, quatro vezes por segundo, a partir da cópia em memória do store (sem ler a base).

### 4. Bateria

- **Pedir**: intent `android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` com `data = package:com.bricklap.app`, que neste telemóvel resolve para `com.android.settings/.fuelgauge.RequestIgnoreBatteryOptimizations` — o diálogo sim/não do sistema para a app. Exige `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` no manifesto (declarada em `app.json`). O `Linking.sendIntent` do react-native não passa o `data`; daí `expo-intent-launcher`.
- **Detetar**: `PowerManager.isIgnoringBatteryOptimizations(package)`, exposto por `expo-battery` como `isBatteryOptimizationEnabledAsync()`. Relido sempre que a app volta a primeiro plano.
- **Samsung "apps a dormir"**: os intents conhecidos (`com.samsung.android.sm.ACTION_BATTERY`, `ACTION_SM_MAIN`) **não resolvem** em One UI 8.5 (verificado com `cmd package resolve-activity`); `android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS` também não. O que existe é a página de detalhes da app (`APPLICATION_DETAILS_SETTINGS`), onde a One UI mostra "Bateria → Sem restrições". A app pede o diálogo direto; se falhar, abre os detalhes da app.

### 5. Alternativas se A falhar

**a) `react-native-background-geolocation` (Transistor Software).** Biblioteca nativa madura (Android + iOS) com plugin de configuração para Expo: deteção de movimento por acelerómetro (pára o GPS quando o telemóvel está imóvel), persistência própria em SQLite, *heartbeat*, reinício após *reboot*, tratamento das particularidades de cada fabricante. **Custo**: licença paga para builds de release Android (na ordem das centenas de dólares por app, uma vez); uma dependência nativa grande que passa a ser a dona do GPS e da bateria; um segundo SQLite (o dela) ao lado do nosso, ou um *bridge* para o nosso store a partir dos *callbacks* dela; menos controlo sobre a cadência (a biblioteca decide quando parar o GPS). **Quando faria sentido**: se o `expo-location` perder fixes por causa do `JobScheduler`/*doze* de forma que a exceção de bateria não resolva, ou se a fase seguinte precisar de iOS a sério — é o caminho com menos risco de engenharia e mais custo de dependência.

**b) Módulo nativo mínimo em Kotlin via plugin de configuração.** Um `Service` em primeiro plano nosso (`foregroundServiceType="location"`) com um `LocationCallback` do `FusedLocationProviderClient` a 1 Hz, que escreve **diretamente no SQLite** (mesmo esquema, `INSERT` em `samples`) sem passar pelo JS, ou que acorda o JS por `HeadlessJsTaskService` só para os eventos. **Custo**: ~300–500 linhas de Kotlin + um plugin de configuração + um módulo Expo para START/STOP a partir do JS; dois escritores na mesma base (o Kotlin para amostras, o JS para eventos) — o esquema v2 e o modo WAL aguentam, mas a regra "só o adaptador escreve" do ADR 0006 passa a ter uma exceção documentada; manutenção nossa a cada SDK. **Vantagens**: nenhum `JobScheduler` no caminho (o *callback* corre no processo do serviço), nenhum contexto *headless*, melhor bateria possível, zero dependências novas. **Quando faria sentido**: se o problema do `expo-location` for o atraso/quotas do `JobScheduler` e não o GPS em si.

Ordem de preferência se A falhar: **b) antes de a)** — o problema, a existir, está no transporte dos fixes até ao JS, não no GPS; um módulo nosso resolve exatamente isso sem licença nem dependência grande. Nenhuma das duas foi instalada.

## Decisão (a fechar com o teste)

**`expo-location` chega** se, no teste de 30 min com o ecrã apagado e o telemóvel no bolso, sem cabo:

1. não houver buracos > 10 s entre amostras (fora do arranque);
2. o serviço não for morto (nem pelo Android nem pela One UI) — `service_stop` só no "Parar";
3. a bateria descer **claramente menos** do que a referência do fundador (4–5 % em 25 min com o ecrã sempre ligado e o Strava a gravar em simultâneo) — meta: ≤ 3 % em 30 min.

Se chegar: a sessão 08 implementa a versão final sobre este desenho (ver a proposta no relatório §8). Se não chegar: alternativa **b)** primeiro, com os dados do teste a dizer o quê (atraso dos lotes → `JobScheduler`; buracos com o serviço vivo → GPS/One UI; serviço morto → bateria/One UI).

## Consequências (da experiência)

- Três dependências novas, todas emparelhadas com o SDK 57 e justificadas no relatório: `expo-task-manager`, `expo-battery`, `expo-intent-launcher`.
- Manifesto: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` e `RECEIVE_BOOT_COMPLETED` a mais; `ACCESS_BACKGROUND_LOCATION` continua ausente.
- O registo bruto (`gps-raw.jsonl`, só dev) deixa de ser escrito pela tarefa; a precisão já vive na base (ADR 0009).
- O texto do cartão da exceção de bateria está fora do i18n, de propósito (o brief congelou os dicionários); passa para lá na sessão 08 se o desenho ficar.

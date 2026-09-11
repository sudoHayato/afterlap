# @bricklap/mobile

Aplicação Android do Bricklap (Expo SDK 57, TypeScript, dev client). **Fase 3 — desportos sem GPS; ritmo, precisão na base e exportação; gravação em segundo plano** (sobre a Fase 2: GPS real e persistência local).

## O que é

Um único ecrã que percorre a ideia central do produto: uma sessão de treino é uma
**sequência** de desportos, não um só desporto.

- **Iniciar** uma vez (escolhendo o desporto inicial — oito chips em duas linhas: **Rua** com corrida, bicicleta, caminhada e transição; **Ginásio / Piscina** com força, remo indoor, passadeira e natação).
- **Mudar** de desporto quantas vezes quiseres, sem parar o relógio — também entre a rua e o ginásio.
- **Parar** no fim e ver o resumo (tempo total, distância dos segmentos com GPS, segmentos).

Toda a lógica vem de `@bricklap/engine` (workspace do monorepo, consumido como
fonte TypeScript, sem passo de build): os eventos são a fonte de verdade,
segmentos e métricas são derivados.

Nesta fase:

- **Desportos sem GPS** ([ADR 0008](../../docs/adr/0008-desportos-sem-gps.md)): força, remo indoor, passadeira e natação em piscina são só tempo. O watcher de posição existe apenas enquanto o segmento atual for de um desporto com GPS; a permissão de localização só se pede na primeira vez que faz falta (uma sessão que começa no ginásio não pede nada). Num segmento sem GPS o ecrã mostra o cronómetro do segmento e o total, sem distância, ritmo nem coordenadas.
- **GPS real em segundo plano** ([ADR 0010](../../docs/adr/0010-segundo-plano.md),
  sobre o [ADR 0007](../../docs/adr/0007-gps-primeiro-plano.md)): uma tarefa de
  localização do `expo-location` (1 Hz, precisão máxima) com **serviço em
  primeiro plano e notificação persistente** — grava com o ecrã apagado e o
  telemóvel no bolso, sem `ACCESS_BACKGROUND_LOCATION` (só `ACCESS_FINE_LOCATION`
  + as permissões de serviço e `RECEIVE_BOOT_COMPLETED` no manifesto). A tarefa
  escreve cada fix na base com o **timestamp do próprio fix**; se o Android
  matar o processo, reanima-o para o lote seguinte e a tarefa hidrata o store
  sozinha (`recovered_headless` na base). A notificação mostra o desporto e o
  tempo decorrido à data do último Iniciar / Mudar / Continuar (a API não deixa
  refrescá-la sem reiniciar o pedido de localização). A app pede a **exceção de
  otimização de bateria** e explica porquê; se for recusada grava na mesma e
  avisa no ecrã de gravação. Sem keep-awake. O simulador (`createSim` /
  `stepSim` / `sampleFromSim`) continua disponível por um interruptor no ecrã
  inicial, **só em builds de desenvolvimento**; uma sessão retomada segue a
  fonte da sua última amostra.
- **Ritmo, precisão e exportação** ([ADR 0009](../../docs/adr/0009-ritmo-precisao-exportacao.md)): o ecrã de gravação mostra o ritmo médio do segmento **e** o ritmo dos últimos 30 s ("Ritmo atual"; "Velocidade atual" na bicicleta) — uma paragem lê "—". Não há filtro na distância: a análise das duas sessões de campo mostrou que a caminhada estava bem calibrada e que o ritmo médio só diluía as paragens. Cada fix leva a sua precisão para a base (esquema v2, `samples.accuracy`).
- **Persistência local** em SQLite append-only (`persistence/`,
  [ADR 0006](../../docs/adr/0006-persistencia-sqlite-append-only.md)); a sessão
  sobrevive a fechar ou matar a app, e a um reinício do telemóvel (retoma ao
  abrir a app; perde-se o intervalo até ao "Continuar"). Em builds de
  **desenvolvimento** cada fix vai também para um registo bruto
  `files/gps-raw.jsonl` (altitude, rumo, velocidade Doppler, hora de chegada) e
  a tarefa em segundo plano escreve um diagnóstico `files/bg-diag.jsonl`
  (serviço, lotes, atraso de entrega, bateria por minuto); ambos rodados por
  sessão (`*.prev.jsonl` guarda o anterior); o release não escreve nenhum.
- **Exportar dados** no histórico: uma cópia consistente da base (`VACUUM INTO`,
  um só ficheiro, WAL incluído) entregue à folha de partilha do sistema, e o
  registo bruto a seguir se existir. Ver *Exportar*.
- **Não há navegação** nem mapa. Dependências: `expo`, `expo-battery`,
  `expo-dev-client`, `expo-file-system`, `expo-intent-launcher`,
  `expo-location`, `expo-sharing`, `expo-sqlite`, `expo-status-bar`,
  `expo-task-manager`, `react`, `react-native` e os workspaces
  `@bricklap/engine` e `@bricklap/i18n`.
- **Só Android.** Não existe configuração iOS nem web.

## Exportar

**De dentro da app** (sessão 06): Histórico → **Exportar dados**. A app faz um
`VACUUM INTO` da base para a sua cache (`bricklap-AAAAMMDD-HHMM.db`, completo,
sem `-wal`/`-shm`) e abre a partilha do sistema — Drive, e-mail, "Guardar em
Ficheiros", o que houver. Num build de desenvolvimento partilha a seguir o
registo bruto (`gps-raw-AAAAMMDD-HHMM.jsonl`). Não precisa de cabo, de `adb`
nem de trocar de APK. O Expo não expõe a pasta externa da app
(`Android/data/…/files`), por isso não há cópia para lá.

**Pelo cabo** (alternativa de depuração): puxa-se a base e o registo bruto
do telemóvel e converte-se em GeoJSON, que qualquer visualizador abre
(geojson.io, QGIS, …). `adb` abaixo é o `adb` da WSL ou o `adb.exe` do Windows,
conforme a ligação (ver mais abaixo).

> **`run-as` só funciona num build depurável.** No APK de release instalado para
> o teste de campo, `run-as` responde `package not debuggable` e a base fica
> inacessível — os dados estão em armazenamento privado da app. Como os dois
> builds são assinados com a **mesma** chave (`signingConfigs.debug`, ver
> `android/app/build.gradle`), instala-se o APK de debug **por cima** do release
> sem perder dados, exporta-se, e volta-se a instalar o release:
>
> ```sh
> adb shell pm install -r /data/local/tmp/bricklap-debug.apk   # dados mantêm-se
> # … exportar (comandos abaixo) …
> adb shell pm install -r /data/local/tmp/bricklap-release.apk # tapar "Não enviar" no Play Protect
> ```
>
> Verificado nesta sessão nos dois sentidos: o histórico e a base sobreviveram às
> duas instalações. **Nunca** `pm uninstall` — isso apaga as sessões gravadas.
> A alternativa decente (um botão de exportação dentro da app, sem `adb` nem
> troca de APK) está no BACKLOG.

```sh
mkdir -p /tmp/bricklap-pull && cd /tmp/bricklap-pull
for x in "" -wal -shm; do
  adb exec-out "run-as com.bricklap.app cat files/SQLite/bricklap.db$x" > "bricklap.db$x"
done
adb exec-out "run-as com.bricklap.app cat files/gps-raw.jsonl" > gps-raw.jsonl
node <repo>/apps/mobile/scripts/geojson.mjs bricklap.db gps-raw.jsonl > traçado.geojson
```

Os ficheiros `-wal` e `-shm` **fazem parte da base** (modo WAL): sem eles faltam
os últimos commits. O registo bruto é opcional; sem ele o script não sabe a
precisão dos fixes. O `-shm` pode não existir se a base já foi consolidada.

O script escreve o GeoJSON no `stdout` (uma `LineString` por segmento, com o
desporto; um `Point` por fix fraco — precisão > 30 m ou desconhecida) e, no
`stderr`, um resumo por sessão: duração, amostras, distância, buracos
superiores a 5 s (quantos e o maior), fixes fracos. `--session <id>` limita a uma
sessão. É esse resumo que a secção "Teste de campo" do relatório pede.

O script é autónomo (`node:sqlite`, sem dependências) e reimplementa o corte de
segmentos por `sport_changed` / `stopped` — se essa regra mudar no motor, muda
aqui também.

**Análise do ruído** (`scripts/gps-noise.mjs`): por segmento com GPS, a
distribuição da velocidade instantânea, a velocidade Doppler do provider, a
precisão e a relação entre as duas, a estabilidade do ritmo que o atleta lê
(médio e em janelas de 5–60 s) e o efeito de um limiar de deslocamento relativo
à precisão. Nunca imprime coordenadas. É o que produziu os números do ADR 0009.

```sh
node apps/mobile/scripts/gps-noise.mjs bricklap.db gps-raw.jsonl --session <id> [--svg ritmo.svg]
```

Os ficheiros puxados do telemóvel contêm as coordenadas de quem treinou:
ficam **fora do repositório** (o `.gitignore` recusa `*.db`, `*.geojson` e
`gps-raw*`, e `git status` deve ficar limpo antes de qualquer commit).

## Comandos

Correr a partir da raiz do monorepo (`npm run dev:mobile`, `npm run android`) ou
dentro de `apps/mobile`:

| Comando | O que faz |
| --- | --- |
| `npm run start` | `expo start --dev-client` — arranca o Metro para um dev client já instalado |
| `npm run android` | `expo run:android` — gera `android/`, compila e instala no dispositivo/emulador ligado |
| `npm run prebuild:android` | `expo prebuild --platform android` — só gera a pasta nativa `android/` (ignorada pelo git) |
| `npm run export:android` | `expo export --platform android --output-dir dist` — bundle JS de produção via Metro |
| `npm run typecheck` | `tsc -p tsconfig.json --noEmit` |
| `npm run doctor` | `expo-doctor` — verifica versões e configuração |

Verificações úteis:

```sh
npx expo config --type public   # configuração resolvida (não deve ter chaves ios/web)
npx -y expo-doctor@latest
```

## Dev client obrigatório

A app usa `expo-dev-client`, por isso **não corre no Expo Go**: é preciso um
build de desenvolvimento (APK) instalado no telemóvel. O Metro (`npm run start`)
serve apenas o JavaScript; o binário nativo tem de existir primeiro.

**O caminho é o build local.** O EAS Build (nuvem da Expo) foi abandonado por
decisão do fundador — sem conta Expo. Ver
[docs/adr/0005-build-local-android.md](../../docs/adr/0005-build-local-android.md).

### Toolchain (uma vez)

Instalada em modo utilizador, sem `root` (o `sudo` desta máquina pede
palavra-passe):

| Componente | Versão | Onde |
| --- | --- | --- |
| JDK (Temurin) | 17 | `~/opt/jdk-17` |
| Android command-line tools | build 16111833 | `~/Android/Sdk/cmdline-tools/latest` |
| platform-tools (`adb`) | 37.0.1 | `~/Android/Sdk/platform-tools` |
| Plataforma | `android-36` | `~/Android/Sdk/platforms` |
| build-tools | 36.0.0 | `~/Android/Sdk/build-tools` |

As versões são as que o `expo prebuild` do SDK 57 pede (Gradle 9.3.1,
`compileSdk`/`targetSdk` 36). `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT` e
`PATH` estão fixados num bloco marcado no `~/.bashrc`.

### Ligar o telemóvel (depuração sem fios)

USB em WSL 2 exigiria `usbipd-win` e privilégios de administrador, e tira o
telemóvel ao Windows enquanto estiver anexado. Por Wi-Fi não é preciso nada
disso — a WSL fala com a rede local sem configuração.

No telemóvel (Android 11+): Opções de programador → *Depuração sem fios* →
*Emparelhar dispositivo com código*. Esse diálogo mostra um IP:porta e um código
de 6 dígitos, **e tem de ficar aberto** enquanto corres o `adb pair`.

```sh
adb pair <IP>:<PORTA-DE-EMPARELHAMENTO> <CODIGO>
adb connect <IP>:<PORTA-DE-LIGACAO>   # porta diferente, no ecrã principal
adb devices -l
```

Notas aprendidas à força:

- A **porta de ligação não é a de emparelhamento** e muda a cada arranque da
  depuração sem fios.
- `adb mdns services` **não descobre nada** a partir da WSL (o multicast não
  atravessa a NAT da WSL 2), nem do Windows quando o diálogo está fechado.
- Se o ecrã principal não estiver à mão, as portas abertas do telemóvel podem
  ser encontradas por varrimento (30000–49999); só uma aceita o `adb connect`,
  as outras entram como `offline` e limpam-se com `adb disconnect`.

### Ligar o telemóvel por USB (sem Wi-Fi)

A depuração sem fios exige Wi-Fi: num *hotspot* móvel o Android desliga-a.
A WSL 2 não vê USB, mas o **adb do Windows** vê — e corre a partir da WSL:

1. `platform-tools` para Windows (zip, sem instalador, sem admin) em
   `/mnt/c/Users/<utilizador>/platform-tools`.
2. Cabo ligado, *Depuração USB* ativa, aceitar o pop-up no telemóvel:
   ```sh
   /mnt/c/Users/<utilizador>/platform-tools/adb.exe devices -l
   ```
3. Instalar o APK compilado na WSL. **O que funciona** (sessões 04–06, debug de
   178 MB e release de 76 MB): copiar para o disco do Windows, `push` para
   `/data/local/tmp` com **caminho Windows**, e `pm install -r` no telemóvel.
   ```sh
   cp android/app/build/outputs/apk/release/app-release.apk /mnt/c/Users/<utilizador>/bricklap-release.apk
   adb.exe push "C:\Users\<utilizador>\bricklap-release.apk" /data/local/tmp/bricklap-release.apk
   adb.exe shell md5sum /data/local/tmp/bricklap-release.apk   # comparar com md5sum no PC
   adb.exe shell pm install -r /data/local/tmp/bricklap-release.apk
   ```
   Regras aprendidas à força:
   - **Caminho Windows no `push`.** Com `/mnt/c/...` o `adb.exe` responde
     `cannot stat` — e um `pm install -r` a seguir instala **em silêncio o APK
     antigo** que ainda esteja em `/data/local/tmp`. Daí o `md5sum`.
   - **Nada de outros comandos `adb` enquanto o `push` corre.** Na sessão 06 um
     `push` de 76 MB lançado em paralelo com `uiautomator dump` e `am force-stop`
     morreu com `no response: connection reset` e prendeu o transporte USB; o
     mesmo ficheiro, sozinho, passou em 1 s (93,6 MB/s). Se o transporte prender:
     matar os processos `adb.exe` pendurados **pelo PID** (`pkill -f` apanha a
     própria shell), `taskkill.exe /F /IM adb.exe`, `adb.exe start-server` — e o
     telemóvel volta como `unauthorized` até alguém tocar "Permitir" no ecrã.
   - O `adb.exe install` direto (em *streaming*) prendeu o transporte uma vez na
     sessão 04; fica como alternativa, não como caminho normal.
   - Um release pode abrir o diálogo do Play Protect e o `pm install` fica à
     espera — ver *Build de release* abaixo.
4. `adb.exe reverse tcp:8081 tcp:8081`. O `localhost:8081` do telemóvel passa a
   ser o `localhost:8081` **do Windows**, que a WSL 2 encaminha para o Metro —
   confirma com `curl.exe http://localhost:8081/status` no Windows.

   **Se `adb.exe shell curl localhost:8081/status` falhar com `exit=52`** e o
   `curl.exe` do Windows funcionar: a WSL só expôs o Metro em `[::1]:8081`
   (IPv6) — vê-se com `netstat.exe -an | findstr 8081` — e o túnel do `adb`
   liga-se por IPv4. Um relé IPv4 na WSL resolve (`socat`, ou um `net.createServer`
   em Node a encaminhar `0.0.0.0:8082 → 127.0.0.1:8081`), seguido de
   `adb.exe reverse tcp:8081 tcp:8082`. Nesta máquina já existe um relé em
   `8082` (sessão 04).
5. Testes de dispositivo (`BRICKLAP_ADB=/mnt/c/Users/<utilizador>/platform-tools/adb.exe`):
   - `npm run test:device` — recuperação depois de `am force-stop`, com o
     simulador; precisa do **build de debug** (dev client) instalado e do Metro
     alcançável (passo 4).
   - `npm run test:device:background` — gravação em segundo plano com o **GPS
     real**: `kill -9` do processo com a tarefa a correr, reanimação pelo
     Android, hidratação headless (`recovered_headless` na base), retoma pelo
     "Continuar". Precisa do **release *debuggable*** (ver *Build de release*)
     e da localização ligada; uma secretária perto de uma janela chega.
   Os dois leem os ecrãs estáticos com `uiautomator` (o ecrã de gravação
   nunca) e puxam a base com `run-as`, que só um build *debuggable* permite.
   O telemóvel tem de estar **desbloqueado** antes de correr: com um PIN, o
   `wm dismiss-keyguard` do teste não passa o ecrã de bloqueio.

O que **não** funciona nesta máquina: apontar o `adb` da WSL ao servidor do
Windows (`adb.exe -a nodaemon server` + `ADB_SERVER_SOCKET=tcp:<ip-host>:5037`).
O servidor arranca em `0.0.0.0:5037`, mas a firewall do Windows (perfil público)
bloqueia a ligação vinda da WSL, e abrir a porta exige administrador. Por isso
o `expo run:android` (que usa o `adb` da WSL) não vê o telemóvel por USB —
compila-se com `./gradlew assembleDebug` e instala-se com o `adb.exe`.

### Compilar e instalar

```sh
npx expo run:android
```

Com um único dispositivo ligado, **não passes `--device <serial>`**: esse flag
espera um *nome* de dispositivo e falha com `Could not find device with name`.

## Metro tem de ser alcançável pelo telemóvel

Estar na mesma rede Wi-Fi **não chega** em WSL 2: a WSL tem um IP interno
(172.x) que o telemóvel não alcança, e o Expo aponta a app para esse IP.

**O que funciona, e é o caminho normal:**

```sh
adb reverse tcp:8081 tcp:8081
npm run dev:mobile
```

O `adb reverse` faz o `localhost:8081` do telemóvel apontar para o Metro dentro
da WSL, através da própria ligação `adb` — sem encaminhamento de portas nem
serviços externos. O Expo CLI costuma fazê-lo sozinho quando há um dispositivo
ligado. Para confirmar do lado do telemóvel:

```sh
adb shell curl -s http://localhost:8081/status   # -> packager-status:running
```

Se a app tiver sido aberta a apontar para o IP da WSL, relança-a já com o
`localhost`:

```sh
adb shell am start -a android.intent.action.VIEW \
  -d "exp+bricklap://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

Alternativas, por ordem de preferência:

- **`npx expo start --dev-client --tunnel`** — atravessa NAT e firewall sem
  configurar nada, mas é mais lento. Recurso se o `adb reverse` falhar.
- **Modo de rede *mirrored* da WSL** (`.wslconfig` com `networkingMode=mirrored`)
  — **não é opção nesta máquina**: exige Windows 11 22H2+, e esta é Windows 10
  Home 22H2.

## Estrutura

```
apps/mobile/
  App.tsx          ecrãs: início / ao vivo / resumo / retomar / histórico
  store.ts         uma instância do adaptador de persistência por processo
  i18n.ts          locale do dispositivo (I18nManager) -> t() de @bricklap/i18n
  index.ts         defineRecordingTask() antes de registerRootComponent(App): a tarefa existe em todos os contextos JS
  export.ts        cópia consistente da base (VACUUM INTO) + folha de partilha do sistema
  gps/             background.ts (tarefa de localização + serviço, ADR 0010), location.ts (permissão),
                   battery.ts (exceção de bateria), diag.ts e rawLog.ts (só dev, rodados por sessão)
  persistence/     SQLite append-only: esquema (v2: accuracy), replay, store (ADR 0006, 0009, 0010)
  device/          testes num telemóvel real: recuperação (test:device) e segundo plano (test:device:background)
  scripts/         geojson.mjs — base + registo bruto -> GeoJSON e resumo; gps-noise.mjs — análise do ruído
  test/            testes em Node (node:sqlite) do adaptador
  app.json         configuração Expo (só Android; package com.bricklap.app; plugin expo-location sem segundo plano)
  tsconfig.json    extends expo/tsconfig.base + strict + noUncheckedIndexedAccess
  assets/          ícones do template (placeholders)
  android/         gerada por `expo prebuild`, ignorada pelo git
```

## Build de release para um treino a sério

O dev client carrega o JavaScript do Metro, e o Metro fica em casa. Para uma
caminhada de 30 min a app tem de levar o bundle consigo: build de **release**
(assinado com a chave de debug que o `expo prebuild` gera — serve para instalar
no telemóvel, não para distribuir).

```sh
cd apps/mobile
npx expo prebuild --platform android --clean --no-install
cd android && ./gradlew assembleRelease
# APK em app/build/outputs/apk/release/app-release.apk
```

Instalar por cima do build de debug mantém os dados (mesmo package, mesma
chave). Para voltar ao desenvolvimento com Metro, instala-se outra vez o
`assembleDebug` — também sem perder a base.

Instalar um APK de **release** com `pm install` abre no telemóvel um diálogo do
**Google Play Protect** ("Enviar a app para uma verificação de segurança?") e o
comando fica bloqueado até alguém responder — **"Não enviar"** (não há razão para
enviar o binário do Bricklap à Google). Os builds de debug não perguntam.

Verificado no telemóvel a 2026-09-10, com o cabo a servir só de observação
(Metro morto, `adb reverse --list` vazio): arranque a frio 118 ms, ecrã inicial
em pt-PT, GPS real a gravar, o ecrã aceso 75 s com o tempo de espera do sistema
a 30 s (na altura com `expo-keep-awake`; desde a sessão 08 o ecrã apaga-se e a
gravação continua), sessão a sobreviver a `am force-stop` e a continuar ao
reabrir. O bundle vai dentro do APK (`assets/index.android.bundle`, 1,4 MB) —
a app nunca procura o Metro.

**Release *debuggable*** (para o teste `test:device:background` e para puxar a
base de um build que arranca sem Metro): o mesmo release com `debuggable true`,
que `run-as` aceita. `android/` é gerada e ignorada pelo git, por isso é um
retoque local depois do `prebuild`, desfeito a seguir:

```sh
cd apps/mobile/android
sed -i 's/^\(\s*\)signingConfig signingConfigs.debug$/&/; /buildTypes {/,/^    }/ s/^\(\s*release {\)$/\1\n            debuggable true/' app/build.gradle
./gradlew assembleRelease && cp app/build/outputs/apk/release/app-release.apk /mnt/c/Users/<utilizador>/bricklap-release-dbg.apk
git checkout -- . 2>/dev/null || sed -i '/^\s*debuggable true$/d' app/build.gradle
```

Instala-se como qualquer APK (mesma chave, os dados mantêm-se). **O fundador
treina com o release normal**, nunca com este.

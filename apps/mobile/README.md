# @bricklap/mobile

Aplicação Android do Bricklap (Expo SDK 57, TypeScript, dev client). **Fase 2 — GPS real e persistência local.**

## O que é

Um único ecrã que percorre a ideia central do produto: uma sessão de treino é uma
**sequência** de desportos, não um só desporto.

- **Iniciar** uma vez (escolhendo o desporto inicial).
- **Mudar** de desporto quantas vezes quiseres, sem parar o relógio.
- **Parar** no fim e ver o resumo (tempo total, distância, segmentos).

Toda a lógica vem de `@bricklap/engine` (workspace do monorepo, consumido como
fonte TypeScript, sem passo de build): os eventos são a fonte de verdade,
segmentos e métricas são derivados.

Nesta fase:

- **GPS real em primeiro plano** (`expo-location`, 1 Hz, precisão máxima, só
  `ACCESS_FINE_LOCATION`; nada de segundo plano — ver
  [ADR 0007](../../docs/adr/0007-gps-primeiro-plano.md)). O ecrã fica ligado
  enquanto grava (`expo-keep-awake`). O simulador (`createSim` / `stepSim` /
  `sampleFromSim`) continua disponível por um interruptor no ecrã inicial,
  **só em builds de desenvolvimento**; uma sessão retomada segue a fonte da sua
  última amostra.
- **Persistência local** em SQLite append-only (`persistence/`,
  [ADR 0006](../../docs/adr/0006-persistencia-sqlite-append-only.md)); a sessão
  sobrevive a fechar ou matar a app. Cada fix vai também para um registo bruto
  `files/gps-raw.jsonl` com a precisão (ver *Exportar o traçado*).
- **Não há navegação** nem mapa. Dependências: `expo`, `expo-dev-client`,
  `expo-file-system`, `expo-keep-awake`, `expo-location`, `expo-sqlite`,
  `expo-status-bar`, `react`, `react-native` e os workspaces `@bricklap/engine`
  e `@bricklap/i18n`.
- **Só Android.** Não existe configuração iOS nem web.

## Exportar o traçado (depuração)

A app não mostra mapa. Para ver o que gravou, puxa-se a base e o registo bruto
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
3. Instalar o APK compilado na WSL (o ficheiro está em `/mnt/c`? não — o
   `adb.exe` lê caminhos WSL via `\\wsl$`; mais simples é copiar):
   ```sh
   cp android/app/build/outputs/apk/debug/app-debug.apk /mnt/c/Users/<utilizador>/bricklap-debug.apk
   adb.exe install -r "C:\Users\<utilizador>\bricklap-debug.apk"
   ```
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
5. Teste de recuperação: `BRICKLAP_ADB=/mnt/c/Users/<utilizador>/platform-tools/adb.exe npm run test:device`.

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
  index.ts         registerRootComponent(App)
  gps/             expo-location (permissão, watcher a 1 Hz) e o registo bruto gps-raw.jsonl
  persistence/     SQLite append-only: esquema, replay, store (ADR 0006)
  device/          teste de recuperação num telemóvel real (npm run test:device)
  scripts/         geojson.mjs — base + registo bruto -> GeoJSON e resumo
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
em pt-PT, GPS real a gravar, `expo-keep-awake` a segurar o ecrã aceso 75 s com o
tempo de espera do sistema a 30 s, sessão a sobreviver a `am force-stop` e a
continuar ao reabrir. O bundle vai dentro do APK (`assets/index.android.bundle`,
1,4 MB) — a app nunca procura o Metro.

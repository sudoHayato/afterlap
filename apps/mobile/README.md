# @bricklap/mobile

Aplicação Android do Bricklap (Expo SDK 57, TypeScript, dev client). **Fase 1 — esqueleto.**

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

- O GPS é **simulado** (`createSim` / `stepSim` / `sampleFromSim`), uma amostra por segundo.
- **Não há persistência** — a sessão perde-se ao fechar a app.
- **Não há navegação** nem dependências extra: só `expo`, `expo-dev-client`, `expo-status-bar`, `react`, `react-native` e os workspaces `@bricklap/engine` e `@bricklap/i18n`.
- **Só Android.** Não existe configuração iOS nem web.

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
  App.tsx        ecrã único: Iniciar / Mudar / Parar com GPS simulado
  i18n.ts        locale do dispositivo (I18nManager) -> t() de @bricklap/i18n
  index.ts       registerRootComponent(App)
  app.json       configuração Expo (só Android; package com.bricklap.app)
  tsconfig.json  extends expo/tsconfig.base + strict + noUncheckedIndexedAccess
  assets/        ícones do template (placeholders)
  android/       gerada por `expo prebuild`, ignorada pelo git
```

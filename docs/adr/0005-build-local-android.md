# ADR 0005 — Build Android local, sem EAS

**Data**: 2026-09-09 · **Estado**: aceite

## Contexto

A sessão 01 deixou duas opções para pôr a app no telemóvel a partir de uma máquina Windows com WSL 2: (a) EAS Build, o serviço de compilação na nuvem da Expo, e (b) build local com JDK e Android SDK dentro da WSL. A sessão 02 preparou a opção (a) até ao ponto em que exigia autenticação: `apps/mobile/eas.json` com o perfil `development`, e um pedido ao fundador para correr `eas login`.

O fundador decidiu **não abrir conta Expo**. Isso elimina a opção (a): o EAS Build exige conta, e sem ela nem o `build:configure` nem o `build` funcionam.

## Decisão

- **Build local** com `npx expo run:android --device`. O `eas.json` foi apagado; não há nenhuma dependência de serviços da Expo na cadeia de compilação.
- Toolchain **instalada em modo utilizador**, sem `root`: `sudo` nesta máquina pede palavra-passe, e uma palavra-passe não passa por uma sessão de agente. Em vez de `apt`:
  - **JDK 17** (Eclipse Temurin 17.0.20.1+1) em `~/opt/jdk-17`.
  - **Android command-line tools** (build 16111833) em `~/Android/Sdk/cmdline-tools/latest`.
  - Via `sdkmanager`: `platform-tools` (37.0.1), `platforms;android-36`, `build-tools;36.0.0` — as versões que o `expo prebuild` do SDK 57 pede (`compileSdk`/`targetSdk` 36, Gradle 9.3.1).
  - `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT` e `PATH` fixados no `~/.bashrc`.
- **Ligação ao telemóvel por Wi-Fi** (depuração sem fios do Android 11+), não por USB. A WSL 2 não tem acesso nativo ao USB; passá-lo exigiria `usbipd-win` no Windows, privilégios de administrador e tira o telemóvel ao Windows enquanto estiver anexado. O `adb pair`/`adb connect` sai da WSL para a rede local sem qualquer configuração (confirmado: a WSL alcança o gateway da LAN).
- **Metro alcançável pelo telemóvel** por `adb reverse tcp:8081 tcp:8081`, que o Expo CLI faz sozinho quando há um dispositivo ligado por `adb`. O túnel (`expo start --dev-client --tunnel`) fica como recurso se o `adb reverse` falhar.

## Consequências

- Sem contas, sem custos, sem filas de espera na nuvem, e o código não sai da máquina.
- O ciclo nativo passa a ser local: o primeiro `assembleDebug` demorou **12m20s** (427 tarefas, download do Gradle 9.3.1 e de todas as dependências); os seguintes são incrementais e muito mais rápidos.
- Ocupação em disco: ~1,5 GB entre JDK, SDK, Gradle e caches. A máquina tinha 858 GB livres.
- A pasta `android/` passa a existir localmente (gerada por `expo prebuild`, continua ignorada pelo git — a configuração vive em `app.json`).
- **`networkingMode=mirrored` não é opção**: a máquina é Windows 10 Home 22H2 (build 19045) e o modo espelhado da WSL exige Windows 11 22H2 ou superior. Fica registado para quando/se houver Windows 11.
- Sem EAS, não há distribuição interna por link/QR: para pôr a app noutro telemóvel é preciso copiar o APK à mão (`android/app/build/outputs/apk/debug/app-debug.apk`) ou reconsiderar a decisão.
- Um build de *release* assinado (para loja) continua por resolver: exige um keystore próprio, que nunca deve entrar no repositório.

## Alternativas consideradas

- **EAS Build**: descartado por decisão do fundador (sem conta Expo).
- **`apt install openjdk-17-jdk`**: exigiria a palavra-passe de `sudo`. O tarball do Temurin em `$HOME` faz o mesmo trabalho sem privilégios.
- **USB com `usbipd-win`**: mais peças móveis (serviço no Windows, `bind` como administrador, regras `udev`), e desliga o telemóvel do Windows enquanto anexado. O Wi-Fi dá o mesmo resultado com menos atrito.
- **Compilar no Windows** (Android Studio no Windows, repositório em `\\wsl$`): o I/O entre os dois sistemas de ficheiros torna o build muito mais lento, e passaria a haver duas toolchains a manter. Há um SDK Android no Windows (`C:\Android`), que fica por usar.

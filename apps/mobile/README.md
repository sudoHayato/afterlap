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

Há duas formas de obter o APK a partir do WSL 2:

### (a) EAS Build na cloud

Não precisa de Android SDK nem de JDK locais.

```sh
npx eas-cli login
npx eas-cli build:configure            # associa um projeto EAS (uma vez); eas.json já existe no repo
npx eas-cli build --platform android --profile development
```

`eas.json` já está no repositório com o perfil `development`
(`developmentClient: true`, `distribution: "internal"`,
`android.buildType: "apk"`). `build:configure` só precisa de ligar o projeto a
uma conta EAS (`extra.eas.projectId` em `app.json`) — não apaga o perfil.

No fim, o EAS mostra um link/QR code; abre-o no telemóvel e instala o APK
(é preciso permitir a instalação de apps de fontes desconhecidas).

### (b) Build local no WSL 2

Precisa de **JDK 17** e do **Android SDK** (command-line tools, platform-tools,
build-tools e platform da versão alvo) instalados dentro do WSL 2, com
`ANDROID_HOME` e `JAVA_HOME` definidos.

```sh
npx expo run:android          # compila e instala no dispositivo visto pelo adb
```

Para o `adb` do WSL 2 ver o telemóvel:

- **USB via `usbipd-win`** (no Windows): `usbipd list`, `usbipd bind --busid <id>`,
  `usbipd attach --wsl --busid <id>`; depois `adb devices` no WSL.
- **Wi-Fi (sem passagem de USB)**, Android 11+: no telemóvel activa
  *Depuração sem fios* em Opções de programador, escolhe *Emparelhar com código*
  e no WSL corre `adb pair <ip>:<porta-de-emparelhamento>` seguido de
  `adb connect <ip>:<porta>`. Evita completamente o USB.

## Metro tem de ser alcançável pelo telemóvel

Depois de instalar o dev client, corre `npm run start` e abre a app. O telemóvel
tem de conseguir chegar ao Metro:

- **Mesma rede Wi-Fi** — normalmente basta; no WSL 2 pode ser necessário
  reencaminhar a porta 8081 do Windows para o WSL (`netsh interface portproxy`)
  ou usar o modo de rede *mirrored* do WSL.
- **`npx expo start --dev-client --tunnel`** — atravessa NAT/firewall sem
  configurar nada na rede (mais lento).

Também é possível usar `adb reverse tcp:8081 tcp:8081` quando o dispositivo está
ligado ao `adb` (USB ou Wi-Fi).

## Estrutura

```
apps/mobile/
  App.tsx        ecrã único: Iniciar / Mudar / Parar com GPS simulado
  i18n.ts        locale do dispositivo (I18nManager) -> t() de @bricklap/i18n
  index.ts       registerRootComponent(App)
  app.json       configuração Expo (só Android)
  eas.json       perfil "development" para o EAS Build (ver acima)
  tsconfig.json  extends expo/tsconfig.base + strict + noUncheckedIndexedAccess
  assets/        ícones do template (placeholders)
```

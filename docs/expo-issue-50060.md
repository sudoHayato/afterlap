# Issue a montante no `expo-task-manager` — texto para reenviar

**Estado**: [expo/expo#50060](https://github.com/expo/expo/issues/50060) foi aberto a 2026-09-11 às 20:00 e **fechado um minuto depois pelo bot da Expo**, com a etiqueta `incomplete issue: missing or invalid repro`. O bot pede um **projeto mínimo de reprodução** num issue novo; passos sobre a nossa app não contam. Nenhuma pessoa da Expo leu o relato.

O defeito está descrito no [ADR 0010](adr/0010-segundo-plano.md) e corrigido no nosso repositório por `patches/expo-task-manager+57.0.17.patch`, por isso **isto não bloqueia nada nosso**. Vale a pena reenviar para a correção chegar a montante e o remendo poder sair.

**Quem envia**: o fundador, na sua conta do GitHub. O primeiro issue foi aberto com a conta que está autenticada nesta máquina.

## O que é preciso preparar primeiro

Uma app Expo em branco com três ficheiros alterados. Não precisa do Bricklap, nem de base de dados, nem de interface.

```sh
npx create-expo-app@latest etm-repro --template blank
cd etm-repro
npx expo install expo-location expo-task-manager expo-dev-client
```

**`app.json`** — acrescentar ao bloco `expo`:

```json
"android": {
  "package": "com.example.etmrepro",
  "permissions": ["android.permission.RECEIVE_BOOT_COMPLETED", "android.permission.POST_NOTIFICATIONS"]
},
"plugins": [["expo-location", { "isAndroidBackgroundLocationEnabled": false, "isAndroidForegroundServiceEnabled": true }]]
```

**`index.js`** (ponto de entrada, antes do componente; se o projeto usar `App.js`, importar este ficheiro primeiro):

```js
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { registerRootComponent } from "expo";
import App from "./App";

const TASK = "repro-location";
let batches = 0;

TaskManager.defineTask(TASK, ({ data, error }) => {
  if (error) return console.log("REPRO task error", error.message);
  const n = data?.locations?.length ?? 0;
  console.log(`REPRO batch ${++batches} with ${n} location(s)`);
});

export async function start() {
  await Location.requestForegroundPermissionsAsync();
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 0,
    foregroundService: { notificationTitle: "Repro", notificationBody: "recording" },
  });
}

registerRootComponent(App);
```

**`App.js`**: um botão que chama `start()`. Nada mais.

Build de release (o `dev client` serve, mas o motor JS tem de vir no APK para o caso *headless* ser o real):

```sh
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Passos de reprodução, no telemóvel

```sh
adb shell am start -n com.example.etmrepro/.MainActivity   # e tocar no botão
adb logcat -c
adb shell run-as com.example.etmrepro kill -9 $(adb shell pidof com.example.etmrepro)
# esperar que o processo seja reanimado e que apareça, no logcat:
#   TaskService: Finished task 'repro-location'
# e, MENOS DE 2 s DEPOIS dessa linha:
adb shell am start -n com.example.etmrepro/.MainActivity
```

**O que se observa**: `ReactNativeJS: Running "main"` no mesmo PID, sem `Creating ReactInstance` nem `Starting React Native destruction` pelo meio (o motor headless foi reutilizado). A partir daí, cada lote de posições regista `Handling job with task name 'repro-location'` mas **nunca** `Finished task`, e a tarefa JS não volta a correr: `REPRO batch …` deixa de aparecer. Abrir a app **mais** de 2 s depois da linha `Finished task` funciona.

## Texto do issue novo

> **Title**: [expo-task-manager][android] Task manager is dropped when an Activity reuses the headless React instance (bridgeless): background tasks stop running

O corpo é o do issue #50060, que está guardado em `docs/expo-issue-50060-body.md`, com duas mudanças:

1. Trocar a secção "Steps to reproduce" pelos passos acima, sobre o projeto mínimo.
2. Acrescentar o link do projeto mínimo (repositório público ou *zip*) no topo, que é o que o bot exige.

## Se preferires não enviar

O remendo fica no repositório e é revisto a cada atualização do SDK (o `patch-package` falha de forma ruidosa se o ficheiro mudar). A regra do CTO sobre a camada expo está no ADR 0010: à quarta surpresa, ou se o teste de 2 h mostrar perdas, passa-se ao módulo Kotlin.

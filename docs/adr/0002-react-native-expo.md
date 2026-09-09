# ADR 0002 — App nativa em React Native via Expo (dev client, CNG)

**Data**: 2026-09-09 · **Estado**: aceite

## Contexto

O Grok sugeriu portar o motor para Dart/Flutter. O motor existe em TypeScript, está testado a 100% e é puro. O CTO desenvolve em Windows/WSL 2, sem macOS, e o telemóvel-alvo é Android.

## Decisão

- App em **React Native com Expo** (SDK 57, o estável mais recente à data), TypeScript, **expo-dev-client**.
- **Continuous Native Generation**: `android/` gera-se com `expo prebuild` e não é versionado; a configuração nativa vive em `app.json` e em config plugins.
- Fase 1 sem bibliotecas além de `expo`, `expo-dev-client`, `expo-status-bar`, `react`, `react-native`.

## Consequências

- O motor é reutilizado **tal como está** — a app Android e o lab web importam `@bricklap/engine`.
- Uma só linguagem e um só conjunto de convenções em todo o repo.
- Builds possíveis a partir de WSL 2: EAS Build (nuvem) sem SDK local, ou `expo run:android` com Android SDK + JDK na WSL.
- O dev client permite módulos nativos (localização em segundo plano, foreground service) que o Expo Go não permite.
- Contrapartidas: tamanho do binário maior do que Kotlin puro; gravação em segundo plano exige cuidado (módulos nativos, permissões, doze); cada alteração nativa obriga a um novo build do dev client.

## Alternativas consideradas

- **Flutter/Dart** (sugestão do Grok): reescrever e manter dois motores; rejeitado.
- **Kotlin nativo**: melhor controlo do foreground service, mas reescrita do motor e sem partilha com o lab; possível mais tarde apenas para módulos específicos via config plugin.
- **PWA/Capacitor**: GPS em segundo plano e fiabilidade insuficientes no Android para um registador de treino.
- **Expo Go em vez de dev client**: bloqueia módulos nativos necessários na Fase 2/3.

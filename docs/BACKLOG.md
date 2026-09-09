# Backlog

Prioridades: **P0** bloqueia a próxima sessão; **P1** próxima fase; **P2** quando calhar. Itens marcados "a decidir" precisam do CTO.

## P0 — Fase 1, fecho

- [ ] **`android.package` definitivo** (a decidir; hoje `com.bricklap.app` placeholder; mudar depois de publicar é doloroso).
- [ ] **Instalar o APK no telemóvel** a partir do link/QR do EAS Build da sessão 02 e validar o ecrã START/CHANGE/STOP com os três desportos e as duas línguas.
- [ ] Decidir se `npm install --global eas-cli` fica na máquina, ou se se continua a invocar via `npx eas-cli@latest` (sessão 02 usou `npx`, sem instalação global).

## P1 — Fase 2

- [ ] `expo-location` em primeiro plano; textos de permissão em pt-PT; `sampleFromGps` já aceita `LocationObjectCoords`.
- [ ] Adaptador de persistência na app Android (eventos + amostras; esquema versionado; mesma semântica que `bricklap.v1` no lab).
- [ ] `recovered` real ao reabrir a app (`recoverLiveSessions` já existe no motor).
- [ ] Ícones e cor de fundo definitivos (hoje assets do template Expo); splash com `expo-splash-screen` (não configurado; `assets/splash-icon.png` está por usar).
- [ ] Decidir `newArchEnabled` explícito em `app.json` (SDK 57 já usa a nova arquitetura por defeito; deixar explícito evita surpresas).
- [ ] Antes de distribuir: `android.blockedPermissions` para `READ/WRITE_EXTERNAL_STORAGE` (e `INTERNET` enquanto não for usada) — vêm do template do Expo, não do `app.json`.
- [ ] Tema escuro a nível de sistema (diálogos, teclado): exige `expo-system-ui`; hoje a app pinta as suas cores e o `userInterfaceStyle` foi retirado por não ter efeito sem esse módulo.
- [ ] CI (GitHub Actions): `npm test`, `npm run typecheck`, `npm run build:web`, `expo export --platform android`.

## P1 — i18n (sessão 02)

- [ ] **Sistema de unidades imperial**: `UnitSystem` já declara `"imperial"`; `formatDistanceForUnit`/`formatSpeedForUnit`/`formatPaceForUnit` lançam em vez de o implementar. Implementar quando houver pedido real (milhas, pés, mph).
- [ ] **Ecrã de definições** para escolher língua e sistema de unidades à mão — hoje é só deteção automática do dispositivo, uma vez, no arranque (sem troca em runtime).
- [ ] Decidir se `pt-BR` deve continuar a cair em `pt-PT` (decisão desta sessão, ver `packages/i18n/README.md` e ADR 0004) ou passar a ter dicionário próprio quando houver utilizadores brasileiros reais.
- [ ] Textos legais: quando a app nativa tiver as suas próprias páginas legais (Fase 4), decidir se continuam só pt-PT/UE ou se passam a ter tradução — hoje a decisão do CTO foi mantê-los fora do i18n.
- [ ] `apps/web-lab/src/lib/i18n.ts` e `apps/mobile/i18n.ts` calculam o locale uma vez, no arranque do módulo — não reagem a uma mudança de língua do sistema operativo enquanto a app está aberta (aceitável sem ecrã de definições).

## P2 — Qualidade e dívida

- [ ] Motor: `Segment.sampleStart`/`sampleEnd` duplicam `startAt`/`endAt` — simplificar ou dar-lhes significado (índices de amostras).
- [ ] Motor: `newId()` usa `Math.random`; considerar `crypto.randomUUID` quando disponível nas duas plataformas.
- [ ] Lab: decidir ESLint/Prettier (hoje só `.prettierrc` como convenção de editor) e um smoke test e2e.
- [ ] Lab: `apps/mobile/.gitignore` ainda lista `/ios` e `web-build/` (inofensivo; limpar quando se mexer no ficheiro).
- [ ] Mobile: insets calculados à mão (`StatusBar.currentHeight` em cima, 64 dp em baixo); substituir por `react-native-safe-area-context` quando houver mais ecrãs.
- [ ] Mobile: "Nova sessão" fica desativado 700 ms depois de Parar para um toque duplo não apagar a sessão; substituir por confirmação quando houver persistência.
- [ ] Badge de cobertura e relatório HTML publicado (opcional).

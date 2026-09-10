# Backlog

Prioridades: **P0** bloqueia a próxima sessão; **P1** próxima fase; **P2** quando calhar. Itens marcados "a decidir" precisam do fundador.

## P0 — Fase 1, fecho

- [ ] **Instalar e correr o APK no telemóvel** (build local, `npx expo run:android --device`) e validar START/CHANGE/STOP com os quatro desportos e as duas línguas.

Decidido pelo fundador na sessão 02, já não é backlog: `android.package` = `com.bricklap.app` é **definitivo**; **EAS abandonado** (sem conta Expo) — o caminho é build local, ver `docs/adr/0005-build-local-android.md`.

## P1 — Fase 2

Feito na sessão 03 (ADR 0006): adaptador de persistência SQLite append-only e `recovered` real ao reabrir a app. Feito na sessão 04 (ADR 0007): `expo-location` em primeiro plano, textos de permissão en + pt-PT, ecrã ligado enquanto grava, registo bruto `gps-raw.jsonl`, exportação GeoJSON. **Falta o teste de campo do fundador** (relatório da sessão 04 §6) para fechar a Fase 2. Fica por fazer:

- [ ] Ícones e cor de fundo definitivos (hoje assets do template Expo); splash com `expo-splash-screen` (não configurado; `assets/splash-icon.png` está por usar).
- [ ] Decidir `newArchEnabled` explícito em `app.json` (SDK 57 já usa a nova arquitetura por defeito; deixar explícito evita surpresas).
- [ ] Antes de distribuir: `android.blockedPermissions` para `READ/WRITE_EXTERNAL_STORAGE` (e `INTERNET` enquanto não for usada) — vêm do template do Expo, não do `app.json`.
- [ ] Tema escuro a nível de sistema (diálogos, teclado): exige `expo-system-ui`; hoje a app pinta as suas cores e o `userInterfaceStyle` foi retirado por não ter efeito sem esse módulo.
- [ ] CI (GitHub Actions): `npm test`, `npm run typecheck`, `npm run build:web`, `expo export --platform android`.

## P1 — Fase 3 (herdado da sessão 04)

- [ ] **Precisão junto da amostra**: migração v2 (`samples.accuracy REAL NULL`) quando a Fase 3 decidir filtros; hoje a precisão e a marca "fraco" (> 30 m) vivem só no registo bruto `files/gps-raw.jsonl` (ADR 0007 §5, relatório da sessão 04 §5). A decidir com o CTO no arranque da Fase 3.
- [ ] **Registo bruto cresce sem limite** (≈ 230 bytes por fix; ≈ 400 KB por 30 min). Rodar por sessão ou apagar quando o filtro estiver decidido.
- [ ] Filtro de amostras (precisão, saltos) decidido sobre `gps-raw.jsonl` de treinos reais — já era Fase 3 no ROADMAP.
- [ ] `t` da amostra = hora de chegada; `fixAt` do provider fica no registo bruto. Rever se a Fase 3 preferir o timestamp do fix (uma linha em `App.tsx`).

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

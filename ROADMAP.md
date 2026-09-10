# Roadmap

Fases 0–6. As Fases 2–6 são **proposta a validar pelo fundador**; as Fases 0 e 1 estão concluídas.

## Fase 0 — Laboratório web (concluída)

- **Objetivo**: provar a ideia "sessão = sequência de desportos" num protótipo jogável.
- **Entregáveis**: motor (eventos → segmentos → métricas), app web START/CHANGE/STOP, ecrã `/watch`, textos legais pt-PT/UE.
- **Estado**: feito pelo Grok / Grok Build em setembro de 2026 (nome Afterlap). Ver [docs/HISTORY.md](docs/HISTORY.md).

## Fase 1 — Base do produto e esqueleto Android (concluída em 2026-09-10)

- **Objetivo**: repositório limpo, motor testado e reutilizável, app Android a arrancar, produto pronto para ser global.
- **Entregáveis**: monorepo (`packages/engine`, `packages/i18n`, `apps/web-lab`, `apps/mobile`), rename para Bricklap, testes do motor a 100%, app Expo com START/CHANGE/STOP em GPS simulado, i18n mínimo (inglês base, pt-PT primeira tradução, sem strings cravadas nos componentes), primeiro APK de desenvolvimento, documentação e ADRs.
- **Critério de saída**: `npm test`, `npm run typecheck`, `npm run build:web` e `expo export --platform android` verdes; APK de desenvolvimento **compilado localmente** (sem EAS), instalado e a correr no telemóvel do fundador, com o Metro a servir o bundle.
- **Estado**: **concluída em 2026-09-10**, com o critério de saída cumprido de ponta a ponta. Código e documentação da sessão 01 (2026-09-09) em `main`. Sessão 02: i18n, correções aprovadas, ambiente em Node 24, toolchain Android local, **APK instalado no telemóvel e Metro a ligar**. START/CHANGE/STOP validado no dispositivo, em português, com a soma dos segmentos a fechar exatamente com o total. Ver `docs/reports/2026-09-09-sessao-02.md`.

## Fase 2 — GPS real e persistência local (proposta)

- **Objetivo**: uma sessão real, gravada no telemóvel, com o ecrã ligado.
- **Entregáveis**: `expo-location` em primeiro plano; adaptador de persistência da app (mesma semântica de eventos; chave/esquema versionado); recuperação de sessão ao reabrir a app (`recovered` real); textos de permissões em pt-PT.
- **Critério de saída**: treino de 30 min gravado sem perda de amostras; fechar e reabrir a app mantém a sessão.

## Fase 3 — Segundo plano e fiabilidade (proposta)

- **Objetivo**: gravar com o ecrã desligado e a app em segundo plano.
- **Entregáveis**: foreground service com notificação persistente, gestão de bateria/doze, filtro de amostras (precisão, saltos), testes em campo com bicicleta e corrida, métricas de fiabilidade.
- **Critério de saída**: 2 h de gravação contínua com o telemóvel no bolso, sem buracos superiores a 10 s.

## Fase 4 — Histórico, resumo e exportação (proposta)

- **Objetivo**: valor para o atleta além do registo.
- **Entregáveis**: histórico e resumo por sessão na app, exportação GPX (e FIT, a estudar), identidade do responsável pelo tratamento preenchida, textos legais adaptados à app nativa (permissões de localização, retenção local).
- **Critério de saída**: uma sessão exportada abre corretamente numa ferramenta externa.

## Fase 5 — Relógio (proposta)

- **Objetivo**: as mesmas três ações no pulso; o telemóvel como registo.
- **Entregáveis**: estudo Wear OS vs Garmin Connect IQ; protótipo com START/CHANGE/STOP e sincronização de eventos para o telemóvel.
- **Critério de saída**: uma sessão iniciada no relógio aparece completa no telemóvel.

## Fase 6 — Contas, sincronização, iOS e lançamento (proposta)

- **Objetivo**: produto público.
- **Entregáveis**: contas e sincronização opcionais (novo tratamento de dados: RGPD, avaliação de impacto, política atualizada), iOS, distribuição nas lojas.
- **Critério de saída**: publicação com textos legais completos e responsável identificado.

## Fora do âmbito por agora

Herdado das notas do Grok e mantido: contas, nuvem, feed social, auto-deteção de desporto, dados de saúde (frequência cardíaca, VO₂). Qualquer um destes é um tratamento de dados novo e exige decisão do fundador antes de entrar no roadmap.

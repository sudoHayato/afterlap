# Afterlap

Start once. Train freely. Uma sessão não é um desporto — é uma sequência.

## O que isto é (lê isto)

Isto **não** é ainda a app nativa Android/iOS nem uma app Garmin Connect IQ.

Isto **é**:

1. O **motor de produto** (`Session → Event → Segment → métricas`), com timeseries como fonte de verdade.
2. Um **laboratório web jogável**: Start / Change / Stop, histórico local, face de relógio (estudo de UX).
3. A **base legal mínima** para um pré-lançamento na UE/Portugal (privacidade, cookies, termos, copyright).

Estamos a construir o produto a sério no domínio. A superfície atual é um protótipo web funcional — rápido de iterar, honesto sobre GPS simulado, insuficiente para quem treina só com o relógio.

O caminho de produção:

```
domínio Afterlap  →  Flutter (telefone)  →  Connect IQ (Garmin)
                         ↑
                   este repo (lab + leis)
```

## Lei (Portugal / UE)

Textos na app:

- [/legal/privacidade](src/routes/legal.privacidade.tsx) — RGPD + Lei 58/2019
- [/legal/cookies](src/routes/legal.cookies.tsx) — armazenamento local essencial, sem banner de teatro
- [/legal/termos](src/routes/legal.termos.tsx)
- [/legal/direitos-autor](src/routes/legal.direitos-autor.tsx)

**Antes de um lançamento público** preenche [`src/lib/legal/config.ts`](src/lib/legal/config.ts): nome, morada, NIF, email. Sem responsável identificado, o art. 13.º do RGPD não está cumprido. Estes textos não são parecer jurídico — revê-os com um advogado português antes de tratar dados de utilizadores reais em escala, contas na nuvem, ou dados de saúde (FC, etc.).

Versão atual: **sem contas, sem cookies de rastreio, treinos só no dispositivo.**

## Stack do lab web

TanStack Start, React, Tailwind, Zustand, `localStorage`.

Não há autenticação nem base de dados de utilizador.

## Domínio (o que deve ir para o nativo)

`src/lib/afterlap/`

- `types.ts` — Sport, Session, Event, Sample, Segment
- `engine.ts` — rebuild de segmentos a partir do log de eventos; métricas
- `store.ts` — persistência local e recuperação de sessão viva

UI não é a fonte de verdade. Os eventos são.

## Marcas

Sem afiliação a Garmin, Strava, Apple ou Ironman. Ver `NOTICE` e a página de direitos de autor.

## Licença

Todos os direitos reservados. Ver `LICENSE`.

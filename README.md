# Afterlap

Start once. Train freely. Uma sessão não é um desporto — é uma sequência.

Laboratório web **desenhado e escrito pelo Grok / Grok Build (xAI)**. O dono do projeto instrui o desenvolvimento a partir daqui. Outras ferramentas podem alterar ou melhorar este código.

Língua do lab: português de Portugal (pt-PT). Lei considerada no lab: Portugal e UE. Ver `GROK.md`.

## O que existe neste `main`

1. Motor em `src/lib/afterlap/` — `Session` / `Event` / `Segment` / `Sample`. Eventos são a fonte de verdade; os segmentos derivam-se.
2. App web jogável: Start / Change / Stop, histórico em `localStorage`, ecrã `/watch` (estudo de UX, GPS simulado).
3. Páginas legais em `/legal/*` (privacidade, cookies, termos, direitos de autor). Responsável pelo tratamento ainda não identificado (`src/lib/legal/config.ts`).

Isto ainda **não** é a app nativa Android/iOS nem Connect IQ.

## Ponto de situação

O repositório GitHub é a memória do projeto. Um chat não o é. Quem abrir uma conversa nova deve ler o `main` actual (pelo menos `README.md`, `GROK.md`, `src/lib/afterlap/`, `git log`).

## Stack deste lab

TanStack Start, React, Tailwind, Zustand, `localStorage`. Sem contas.

## Marcas

Sem afiliação a Garmin, Strava, Apple ou Ironman. Ver `NOTICE`.

## Licença

Todos os direitos reservados. Ver `LICENSE`.

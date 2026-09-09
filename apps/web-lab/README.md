# @bricklap/web-lab

Laboratório web do Bricklap: um protótipo de browser para experimentar a ideia
de produto — um treino é uma **sequência de desportos**, não um desporto. O
atleta carrega em START uma vez, em CHANGE para mudar de desporto sem parar, e
em STOP no fim. Os eventos são a fonte de verdade; segmentos e métricas são
derivados pelo motor `@bricklap/engine` (`packages/engine`).

**Não é o produto.** É uma SPA em Vite + React + TanStack Router usada para
validar a interação (telemóvel e "watch face"). O GPS é **simulado**: o
percurso é gerado por `createSim`/`stepSim` do motor, não pelo dispositivo.

## Comandos (a partir da raiz do repositório)

```
npm run dev:web      # servidor de desenvolvimento em http://0.0.0.0:8080
npm run build:web    # build de produção em apps/web-lab/dist
npm run typecheck    # tsc em todos os workspaces (inclui este)
```

Dentro de `apps/web-lab`: `npm run dev`, `npm run build`, `npm run preview`
(porta 8081) e `npm run typecheck`.

O ficheiro `src/routeTree.gen.ts` é gerado pelo `@tanstack/router-plugin` ao
arrancar o dev server ou o build, e fica no repositório.

## Rotas

| Rota | O que mostra |
|---|---|
| `/` | Início: escolher o primeiro desporto, START, histórico de sessões |
| `/record` | Sessão ao vivo no telemóvel: cronómetro, mapa, CHANGE, STOP |
| `/watch` | Estudo de interação de um mostrador de relógio (START / LAP / STOP) |
| `/session/$id` | Resumo de uma sessão: segmentos, distância, ritmo |
| `/legal` | Índice legal (pt-PT, Portugal/UE) |
| `/legal/privacidade`, `/legal/cookies`, `/legal/termos`, `/legal/direitos-autor` | Textos legais |

## Persistência

As sessões ficam apenas no browser, em `localStorage`, sob a chave
`bricklap.v1` (`STORAGE_KEY` em `src/lib/store.ts`). Não há contas nem
servidor.

Migração: se `bricklap.v1` não existir e a chave antiga `afterlap.v1` existir
com conteúdo válido, o conteúdo é adotado, gravado em `bricklap.v1` e a chave
antiga é removida. A migração nunca lança exceções; em caso de falha a app
arranca com as sessões de demonstração.

## Estrutura

- `index.html`, `src/main.tsx` — arranque da SPA.
- `src/routes/` — rotas em ficheiros (`__root.tsx` hidrata o store e importa
  `styles.css`).
- `src/components/bricklap/` — vistas e componentes do lab.
- `src/lib/store.ts` — estado (zustand) e persistência.
- `src/lib/legal/config.ts` — identidade e parâmetros dos textos legais
  (ver `LEGAL.md`).

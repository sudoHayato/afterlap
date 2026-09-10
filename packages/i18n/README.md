# @bricklap/i18n

Dicionários de tradução do Bricklap e uma camada de formatação por sistema de
unidades. TypeScript puro: sem DOM, sem React Native. Consumido pela web lab
(`apps/web-lab`) e pela app Android (`apps/mobile`).

Inglês é a língua-base do produto; pt-PT é a primeira tradução. **Os textos
legais são a exceção** — continuam pt-PT/UE, escritos diretamente nas rotas
`apps/web-lab/src/routes/legal.*.tsx`, e não passam por este módulo.

## API

```ts
import { resolveLocale, translatorFor } from "@bricklap/i18n";

const locale = resolveLocale(navigator.languages); // ou candidatos do dispositivo
const t = translatorFor(locale);

t("common.start"); // "Start" | "Iniciar", consoante o locale
t("sport.run.label");
```

- `resolveLocale(candidates)` — escolhe o melhor locale suportado a partir de
  uma lista de tags BCP-47 (mais preferido primeiro). Correspondência exacta
  ganha; senão tenta a língua-base (`pt-BR` cai para `pt-PT`); sem
  correspondência, `DEFAULT_LOCALE` (`en`). Cada app junta os seus próprios
  candidatos (`navigator.languages` no browser; uma API nativa no telemóvel) —
  este módulo não sabe nada de DOM nem de React Native.
- `translatorFor(locale)` devolve uma função `t(key, params?)`. `key` é um
  caminho com pontos (`"common.start"`) **tipado**: uma chave em falta ou mal
  escrita é erro de compilação, não uma string em branco em produção.
  `params` substitui `{placeholders}` na string traduzida.
- `getDictionary(locale)` devolve o dicionário completo, se precisares dele
  diretamente.

## Chaves e traduções

`src/dictionary.ts` define a **forma** (`Dictionary`) — chaves aninhadas,
folhas `string`. `src/dictionaries/en.ts` e `src/dictionaries/pt-PT.ts`
implementam essa forma; como `en: Dictionary = {...}` e
`ptPT: Dictionary = {...}` são anotados com o mesmo tipo, uma chave em falta
num dos ficheiros — ou uma chave a mais — é erro de compilação em `npm run
typecheck`, não algo que só se descobre a correr a app.

`sport` está indexado por `Sport` (importado de `@bricklap/engine`, só o
tipo): acrescentar um quinto desporto ao motor obriga os dois dicionários a
descrevê-lo antes do build passar.

## Unidades (`src/units.ts`)

```ts
import { formatDistanceForUnit, DEFAULT_UNIT_SYSTEM } from "@bricklap/i18n";

formatDistanceForUnit(1234); // metric por omissão — delega no formatDistance do motor
formatDistanceForUnit(1234, "imperial"); // lança: não implementado ainda
```

`UnitSystem` é `"metric" | "imperial"`. Métrico está implementado (delega
diretamente nos formatadores do motor). Imperial está **declarado no tipo mas
não implementado** — todas as funções lançam em vez de mostrar números
métricos com um rótulo errado. Ver `docs/BACKLOG.md`.

## Testes

`test/*.test.ts` (vitest), cobertura 100%: as duas listas de chaves são
verificadas iguais em runtime (para além da garantia do compilador),
`resolveLocale` é testado com correspondência exacta, língua-base, ordem de
preferência e todos os fallbacks; `createTranslator` cobre interpolação,
placeholders em falta e os dois caminhos de erro defensivos; `units.ts` cobre
o valor por omissão e o lançamento em `"imperial"`.

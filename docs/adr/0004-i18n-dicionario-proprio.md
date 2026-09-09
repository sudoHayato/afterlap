# ADR 0004 — Dicionário de tradução próprio; i18next mais tarde

**Data**: 2026-09-09 · **Estado**: aceite

## Contexto

O produto passou a ser pensado como global: inglês é a língua-base, pt-PT é a primeira tradução. Isso implica extrair toda a cópia de interface do lab web e da app Android para um sítio comum, com alguma garantia de que as duas línguas não divergem (chave traduzida numa e esquecida na outra) e de que uma chave em falta se descobre antes de a app arrancar, não a meio de uma demonstração.

As opções óbvias eram: (a) escrever um módulo próprio, pequeno, tipado em TypeScript; (b) trazer `i18next` (+ `react-i18next` para a web, + adaptador para React Native), que resolve plurais complexos (línguas com mais de duas formas), interpolação rica, namespaces carregados em runtime, e tem um ecossistema maduro de ferramentas de tradução.

Hoje há **duas línguas**, ambas com regras de plural simples (singular/plural, sem formas especiais para "poucos"/"muitos" como em polaco ou árabe), e todas as strings são conhecidas em build-time — nada precisa de ser carregado por HTTP ou trocado sem reiniciar a app.

## Decisão

Escrever `packages/i18n`: um dicionário `Dictionary` (TypeScript, chaves aninhadas, folhas `string`), duas implementações (`en.ts`, `pt-PT.ts`) verificadas contra o mesmo tipo, e uma função `t(key, params?)` cuja chave é um tipo gerado a partir do próprio dicionário (`DictKey<Dictionary>`). Sem `i18next` nem qualquer outra dependência externa nova.

Critério explícito para trocar por `i18next` (ou equivalente) mais tarde: quando o produto tiver **mais de ~3 línguas** a manter, ou precisar de **regras de plural complexas** (uma forma para "1", outra para "poucos", outra para "muitos" — o inglês e o português não precisam disto, mas polaco, russo ou árabe precisam). Nessa altura o custo de uma biblioteca dedicada compensa a complexidade que ela traz (carregamento assíncrono, contexto de React, formatos de ficheiro próprios).

## Consequências

- Uma chave em falta, ou escrita com erro, é **erro de compilação** em `npm run typecheck` — não um texto em falta descoberto a testar a app manualmente. `packages/i18n/test/dictionary.test.ts` confirma o mesmo em runtime.
- Zero dependências novas: `@bricklap/i18n` só depende do `@bricklap/engine` do próprio monorepo (tipo `Sport` e os formatadores métricos).
- Plurais são resolvidos à mão no código chamador (`t(count === 1 ? "summary.segmentsOne" : "summary.segmentsOther")`), que chega para inglês e português. Não escala bem para uma terceira ou quarta língua com regras diferentes — é o sinal para migrar.
- Sem carregamento assíncrono de traduções: todas as strings entram no bundle. Para duas línguas pequenas isto é insignificante (poucos KB); deixaria de ser verdade com muitas línguas.
- Deteção de locale (`resolveLocale`) é feita uma vez, no arranque da app; não há troca de língua em runtime nem ecrã de definições — fica para quando for pedido.

## Alternativas consideradas

- **`i18next` + `react-i18next`**: resolveria tudo isto e mais, mas traz dependências novas (contra a regra da sessão de "sem dependências além das necessárias"), uma API mais larga do que o produto precisa hoje, e nenhum ganho imediato com só duas línguas de plural simples.
- **Strings soltas em cada componente, sem módulo comum**: era o estado antes desta sessão (mobile em pt-PT direto no JSX, lab em inglês direto no JSX) — sem garantia de paridade entre línguas e sem chave nenhuma para localizar uma string a partir do código.
- **Um único ficheiro JSON por língua, sem tipos**: perde a verificação em compilação, que é o benefício principal desta decisão.

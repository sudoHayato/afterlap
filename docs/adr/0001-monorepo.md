# ADR 0001 — Monorepo com npm workspaces e motor como pacote de código-fonte

**Data**: 2026-09-09 · **Estado**: aceite

## Contexto

O motor de sessão tem de ser partilhado entre o laboratório web e a app Android sem divergir. O repositório herdado do Grok Build misturava o motor com a plataforma do sandbox. A máquina de desenvolvimento tem npm; não tem pnpm nem yarn moderno.

## Decisão

- Um repositório, três workspaces: `packages/engine` (`@bricklap/engine`), `apps/web-lab`, `apps/mobile`. Ferramenta: **npm workspaces**, lockfile único na raiz.
- O motor é consumido **como TypeScript de origem**: `exports` aponta para `./src/index.ts`. Vite e Metro transpilam pacotes ligados por symlink; não há `tsup`/`tsc` nem `dist/`.
- Uma só versão de TypeScript, React e `@types/react` em todo o workspace, fixada nas apps (Metro não tolera dois Reacts).
- Testes do motor com vitest na raiz.

## Consequências

- Alterar o motor reflete-se imediatamente nas duas apps, sem passo de build.
- Uma dependência nova numa app instala-se sempre a partir da raiz.
- O npm 10.9 tem um bug (arborist, `edgesOut`) com este grafo; exige npm ≥ 11 (`npx -y npm@11 install`). Documentado no README.
- Se um dia o motor for publicado fora do repo, passa a precisar de build e de `exports` com `dist/` — decisão futura, não bloqueia nada hoje.

## Alternativas consideradas

- **Repositórios separados** (motor publicado no npm): versionamento e releases antes de haver produto; rejeitado.
- **pnpm / turborepo / nx**: mais ferramentas para três pacotes e uma pessoa; o npm chega. Revisitar quando houver CI e mais pacotes.
- **Motor com build (`dist/`)**: um artefacto a manter sincronizado sem benefício até publicação externa.

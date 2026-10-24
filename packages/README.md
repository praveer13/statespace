# packages

Pure TypeScript shared by the two apps (ARCHITECTURE.md sections 17.1 and 17.2). The layout and the rules below are the scaffold's; each package arrives with the task that owns it.

## The rules

- **Pure.** A package has no `window`, DOM, IndexedDB or network, and no Node module, so it runs unchanged on the main origin, in a worker and in Node (the gates run it in Node). Two layers enforce this:
  - its `tsconfig.json` compiles `src/` with `lib: ["ES2022"]` and `types: []`, so a name such as `window` or `fetch` is a compile error;
  - `npm run lint:purity` (`packages/purity-lint`) parses every `packages/*/src` file and fails on a platform global, a `globalThis` reach-around, a Node or URL import, and an import of `apps/`.
- **Vendored code only through a wrapper.** `vendor/kernelspace/` is never edited in place and never imported directly. The wrapper homes are `packages/rng/`, `packages/learner/src/schedule/`, `apps/site/src/sw/`, `apps/instruments/src/sw/` and `apps/instruments/src/lane-a/`; the same lint fails an import of `vendor/` from anywhere else.
- **Erasable TypeScript, `.ts` in imports.** `erasableSyntaxOnly` and `allowImportingTsExtensions` are on (`tsconfig.base.json`), so Node runs a package's sources and tests as they are, with no build step [X RUN-scaffold], and Vite bundles them the same way. No enums, namespaces or parameter properties.
- **Seeded paths are deterministic.** Anything that draws from a seed takes the seed as a parameter; `Math.random`, `Date.now` and entropy reads belong to the apps (the determinism lint, GATE-generators).

## Adding a package

1. `packages/<name>/package.json` named `@statespace/<name>`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, scripts `typecheck` and `test`.
2. `packages/<name>/tsconfig.json` extending `../../tsconfig.base.json` with `lib: ["ES2022"]`, `types: []` and `include: ["src"]`; `test/tsconfig.json` with `types: ["node"]` for the tests, which may use `node:test`.
3. Sources in `src/`, tests in `test/*.test.ts`. Tests sit outside the lint's scope on purpose.
4. Run `npm install` at the root to link the workspace, then `npm run typecheck`, `npm test` and `npm run lint:purity`.

## What is here

| Package | What | Built by |
|---|---|---|
| `purity-lint` | the lint above, with planted fixtures that must trip it | W0-S12 |
| `rng` | the seeded RNG, a wrapper over the vendored kernelspace module | W0-S12 |
| `learner` | the schedule (FSRS-6), a wrapper over the vendored module; derived learner state later | W0-S12; W1 |
| `ids`, `schema`, `runs` | the ID registry, the generated schema types, the run registry loader | W0-T03, W0-T02, W0-T08 |

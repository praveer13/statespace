# @statespace/schema

Types, a dependency-free validator and the statement hash for the course's records. Everything in `src/generated/` is written by `node schemas/codegen/generate.mjs` from the one JSON Schema source in [`schemas/`](../../schemas/README.md); do not edit it. GATE-schema (`node scripts/verify-schema.mjs`) fails when it is stale.

| File | What |
|---|---|
| `src/generated/types.ts` | one type per schema and per nested object: `Claim`, `LedgerEvent`, `IR`, ...; `RecordTypes` maps a record's `schema` tag to its type and `SchemaTypes` maps a schema name |
| `src/generated/schemas.ts` | the schemas, embedded |
| `src/generated/statement-hash-spec.ts` | the code points the statement hash trims |
| `src/validate.ts` | `validate`, `validateRecord`, `isRecord`, `isValid`, `compileSchema`, and `createRegistry` for a set of schemas of your own; the same verdicts as Python's `jsonschema` on every fixture and mutant GATE-schema tries |
| `src/statement-hash.ts` | `trimRight`, `statementHashOfText`, `statementHashOfBytes` and `StatementHashError`; the specification is in `schemas/README.md` section 3 |

The package is pure (the purity lint passes): no DOM, storage, network or Node module. The hash uses `crypto.subtle`, `TextEncoder` and `TextDecoder`, which the main origin, workers and Node 22 all have.

```
npm run typecheck -w @statespace/schema    # tsc over src and test
npm test -w @statespace/schema             # the shared hash vectors, the fixtures and type-level checks
```

The Python side is `bench/statespace/schema/`.

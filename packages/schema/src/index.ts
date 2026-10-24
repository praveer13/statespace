// @statespace/schema: types, validation and the statement hash for the course's records.
// Generated from the one JSON Schema source in schemas/ (see schemas/README.md). Pure TypeScript.

export type * from './generated/types.ts';
export { SCHEMA_DIGEST, SCHEMA_DOCUMENTS } from './generated/schemas.ts';
export type { SchemaDocument } from './generated/schemas.ts';
export { SCHEMA_NAMES, compileSchema, createRegistry, isRecord, isValid, validate, validateRecord } from './validate.ts';
export type { Registry, ValidationIssue, ValidationResult, Validator } from './validate.ts';
export {
  STATEMENT_HASH_SPEC_ID,
  StatementHashError,
  assertWellFormed,
  decodeStatementBytes,
  statementHashOfBytes,
  statementHashOfText,
  statementPreimage,
  statementText,
  trimRight,
} from './statement-hash.ts';
export type { StatementHashErrorCode } from './statement-hash.ts';

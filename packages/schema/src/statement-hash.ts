// The statement hash, statement-hash@1: SHA-256 over a statement's text with trailing whitespace
// removed plus one newline, the rule of Comparator Live's challenge hash,
// sha256(challenge.trimRight() + "\n").
//
// The one written specification is x-statementHash in schemas/defs.schema.json. This file and the
// Python implementation (bench/statespace/schema/statement_hash.py) follow it and are tested against
// the same vectors, schemas/vectors/statement-hash.json, by GATE-schema.
//
// Pure: no DOM, storage or network. It needs only the Web Crypto, TextEncoder and TextDecoder
// globals that the main origin, workers and Node all provide.

import { STATEMENT_HASH_SPEC_ID, TRIM_RIGHT_CODE_POINTS } from './generated/statement-hash-spec.ts';

export { STATEMENT_HASH_SPEC_ID };

export type StatementHashErrorCode = 'invalid-utf8' | 'ill-formed-text';

export class StatementHashError extends Error {
  readonly code: StatementHashErrorCode;

  constructor(code: StatementHashErrorCode, message: string) {
    super(message);
    this.name = 'StatementHashError';
    this.code = code;
  }
}

interface Runtime {
  crypto?: { subtle?: { digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> } };
  TextEncoder?: new () => { encode(text: string): Uint8Array };
  TextDecoder?: new (label: string, options: { fatal: boolean; ignoreBOM: boolean }) => { decode(bytes: Uint8Array): string };
}

const runtime = globalThis as unknown as Runtime;

const TRIM_RIGHT = new Set<number>(TRIM_RIGHT_CODE_POINTS);

/**
 * Remove trailing code points listed in the specification, repeatedly. Every listed code point is a
 * single UTF-16 code unit, so scanning code units from the end is exact. This is not
 * String.prototype.trimEnd and not a regular expression: the set comes from the schema, so a change
 * in an engine's whitespace tables cannot change a hash.
 */
export function trimRight(text: string): string {
  let end = text.length;
  while (end > 0 && TRIM_RIGHT.has(text.charCodeAt(end - 1))) end -= 1;
  return end === text.length ? text : text.slice(0, end);
}

/** Throws StatementHashError('ill-formed-text') if the string holds a lone surrogate. */
export function assertWellFormed(text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        i += 1;
        continue;
      }
      throw new StatementHashError('ill-formed-text', `a lone high surrogate at index ${i}`);
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) throw new StatementHashError('ill-formed-text', `a lone low surrogate at index ${i}`);
  }
}

/** The text that is hashed: trimRight(text) followed by one U+000A. */
export function statementText(text: string): string {
  assertWellFormed(text);
  return `${trimRight(text)}\n`;
}

function encoder(): { encode(text: string): Uint8Array } {
  if (!runtime.TextEncoder) throw new Error('TextEncoder is not available in this runtime');
  return new runtime.TextEncoder();
}

/** The UTF-8 bytes that are hashed. */
export function statementPreimage(text: string): Uint8Array {
  return encoder().encode(statementText(text));
}

/**
 * Decode a statement file's bytes as UTF-8, strictly. Invalid UTF-8 throws
 * StatementHashError('invalid-utf8'). A leading byte order mark is kept as U+FEFF, which is why
 * ignoreBOM is true: a decoder's default would drop it and change the hash.
 */
export function decodeStatementBytes(bytes: Uint8Array): string {
  if (!runtime.TextDecoder) throw new Error('TextDecoder is not available in this runtime');
  try {
    return new runtime.TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new StatementHashError('invalid-utf8', 'the statement is not valid UTF-8');
  }
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const subtle = runtime.crypto?.subtle;
  if (!subtle) throw new Error('Web Crypto (crypto.subtle) is not available in this runtime');
  const digest = new Uint8Array(await subtle.digest('SHA-256', data));
  let hex = '';
  for (const byte of digest) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/** The statement hash of a string. Rejects with StatementHashError for an ill-formed string. */
export async function statementHashOfText(text: string): Promise<string> {
  return sha256Hex(statementPreimage(text));
}

/** The statement hash of a file's bytes: strict UTF-8, no line-ending translation. Rejects for invalid UTF-8. */
export async function statementHashOfBytes(bytes: Uint8Array): Promise<string> {
  return statementHashOfText(decodeStatementBytes(bytes));
}

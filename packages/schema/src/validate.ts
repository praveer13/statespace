// A dependency-free validator for the published schemas.
//
// It interprets the JSON Schema subset that schemas/codegen/subset.mjs allows, over the documents
// embedded in ./generated/schemas.ts, and it is the validator the tab uses on imported records. It is
// tested against Python's `jsonschema` on every fixture and on generated mutants of them by
// GATE-schema, so the TypeScript and Python sides accept and reject the same records.
//
// Pure: no DOM, storage or network.

import { SCHEMA_DOCUMENTS } from './generated/schemas.ts';
import type { SchemaDocument } from './generated/schemas.ts';
import type { RecordTypes, SchemaTypes } from './generated/types.ts';

export interface ValidationIssue {
  /** JSON Pointer to the offending value in the record. */
  instancePath: string;
  /** JSON Pointer to the failing keyword in the schema document that holds it. */
  schemaPath: string;
  /** The failing keyword, such as "required", "pattern" or "additionalProperties". */
  keyword: string;
  message: string;
}

export type ValidationResult = { ok: true } | { ok: false; issues: ValidationIssue[] };

export type Validator = (value: unknown) => ValidationIssue[];

export interface Registry {
  /** The names of the schemas in the registry, such as "claim". */
  readonly names: readonly string[];
  /**
   * Compile a validator for a schema, named by file name ("claim"), by $id ("urn:statespace:claim@1")
   * or by its record tag ("statespace/claim@1"). The result is cached.
   */
  compileSchema(ref: string): Validator;
  /** Validate a value against a schema. */
  validate(ref: string, value: unknown): ValidationResult;
  /**
   * Validate a record by its own `schema` field. A record with no `schema` field, or one the registry
   * does not hold, is not valid.
   */
  validateRecord(value: unknown): ValidationResult;
}

type Check = (value: unknown, path: string, out: ValidationIssue[]) => void;
type Schema = boolean | { readonly [key: string]: unknown };

interface Target {
  doc: SchemaDocument;
  node: Schema;
  pointer: string;
}

const isObject = (v: unknown): v is { [key: string]: unknown } => v !== null && typeof v === 'object' && !Array.isArray(v);

const escapeKey = (key: string): string => key.replaceAll('~', '~0').replaceAll('/', '~1');

function typeMatches(value: unknown, type: string): boolean {
  switch (type) {
    case 'null': return value === null;
    case 'boolean': return typeof value === 'boolean';
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'integer': return typeof value === 'number' && Number.isInteger(value);
    case 'array': return Array.isArray(value);
    case 'object': return isObject(value);
    default: throw new Error(`unknown type ${type}`);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isObject(a)) {
    if (!isObject(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

/** The number of Unicode code points, which is what minLength and maxLength count. */
function codePointLength(s: string): number {
  let n = 0;
  for (const _ of s) n += 1;
  return n;
}

const regexCache = new Map<string, RegExp>();
function regexFor(pattern: string): RegExp {
  let re = regexCache.get(pattern);
  if (!re) {
    re = new RegExp(pattern, 'u');
    regexCache.set(pattern, re);
  }
  return re;
}

/** Build a registry over a set of schema documents. The package's own registry holds the published ones. */
export function createRegistry(documents: readonly SchemaDocument[]): Registry {
  const byId = new Map<string, SchemaDocument>();
  const byName = new Map<string, SchemaDocument>();
  const bySchema = new Map<string, SchemaDocument>();
  for (const doc of documents) {
    byId.set(doc.id, doc);
    byName.set(doc.name, doc);
    if (doc.schema !== null) bySchema.set(doc.schema, doc);
  }
  const compiled = new Map<string, Check>();

  function resolveRef(ref: string, base: SchemaDocument): Target {
    const hash = ref.indexOf('#');
    const target = hash === -1 ? ref : ref.slice(0, hash);
    const fragment = hash === -1 ? '' : ref.slice(hash + 1);
    const doc = target === '' ? base : byId.get(target);
    if (!doc) throw new Error(`$ref ${ref} names no schema in the registry`);
    let node: unknown = doc.json;
    if (fragment !== '') {
      if (!fragment.startsWith('/')) throw new Error(`$ref ${ref}: only JSON Pointer fragments are supported`);
      for (const raw of fragment.slice(1).split('/')) {
        const key = decodeURIComponent(raw).replaceAll('~1', '/').replaceAll('~0', '~');
        if (!isObject(node) || !Object.hasOwn(node, key)) throw new Error(`$ref ${ref} does not resolve`);
        node = node[key];
      }
    }
    return { doc, node: node as Schema, pointer: fragment };
  }

  function compileTarget(target: Target): Check {
    const key = `${target.doc.id}#${target.pointer}`;
    let check = compiled.get(key);
    if (!check) {
      // A forwarding stub goes in first, so a recursive $ref finds a check while the schema is being built.
      let built: Check | undefined;
      const stub: Check = (value, path, out) => (built as Check)(value, path, out);
      compiled.set(key, stub);
      built = compileNode(target.node, target.doc, target.pointer);
      compiled.set(key, built);
      check = built;
    }
    return check;
  }

  function compileNode(node: Schema, doc: SchemaDocument, pointer: string): Check {
    if (node === true) return () => {};
    if (node === false) {
      return (_value, path, out) => out.push({ instancePath: path, schemaPath: pointer, keyword: 'false', message: 'no value is valid here' });
    }
    const checks: Check[] = [];
    const at = (keyword: string): string => `${pointer}/${keyword}`;
    const fail = (out: ValidationIssue[], path: string, keyword: string, message: string): void => {
      out.push({ instancePath: path, schemaPath: at(keyword), keyword, message });
    };
    const sub = (child: unknown, keyword: string): Check => compileNode(child as Schema, doc, at(keyword));
    const valid = (check: Check, value: unknown, path: string): boolean => {
      const tmp: ValidationIssue[] = [];
      check(value, path, tmp);
      return tmp.length === 0;
    };

    if (typeof node.$ref === 'string') {
      const ref = node.$ref;
      let resolved: Check | undefined;
      checks.push((value, path, out) => {
        resolved ??= compileTarget(resolveRef(ref, doc));
        resolved(value, path, out);
      });
    }

    if ('type' in node) {
      const types = (Array.isArray(node.type) ? node.type : [node.type]) as string[];
      checks.push((value, path, out) => {
        if (!types.some((t) => typeMatches(value, t))) fail(out, path, 'type', `must be ${types.join(' or ')}`);
      });
    }
    if (Array.isArray(node.enum)) {
      const options = node.enum as unknown[];
      checks.push((value, path, out) => {
        if (!options.some((o) => deepEqual(o, value))) fail(out, path, 'enum', 'must be one of the listed values');
      });
    }
    if ('const' in node) {
      const expected = node.const;
      checks.push((value, path, out) => {
        if (!deepEqual(expected, value)) fail(out, path, 'const', `must equal ${JSON.stringify(expected)}`);
      });
    }

    // Strings
    if (typeof node.pattern === 'string') {
      const re = regexFor(node.pattern);
      const pattern = node.pattern;
      checks.push((value, path, out) => {
        if (typeof value === 'string' && !re.test(value)) fail(out, path, 'pattern', `must match ${pattern}`);
      });
    }
    if (typeof node.minLength === 'number') {
      const min = node.minLength;
      checks.push((value, path, out) => {
        if (typeof value === 'string' && codePointLength(value) < min) fail(out, path, 'minLength', `must have at least ${min} characters`);
      });
    }
    if (typeof node.maxLength === 'number') {
      const max = node.maxLength;
      checks.push((value, path, out) => {
        if (typeof value === 'string' && codePointLength(value) > max) fail(out, path, 'maxLength', `must have at most ${max} characters`);
      });
    }

    // Numbers
    for (const [keyword, test] of [
      ['minimum', (v: number, bound: number) => v >= bound],
      ['maximum', (v: number, bound: number) => v <= bound],
      ['exclusiveMinimum', (v: number, bound: number) => v > bound],
      ['exclusiveMaximum', (v: number, bound: number) => v < bound],
    ] as const) {
      const bound = node[keyword];
      if (typeof bound === 'number') {
        checks.push((value, path, out) => {
          if (typeof value === 'number' && !test(value, bound)) fail(out, path, keyword, `must satisfy ${keyword} ${bound}`);
        });
      }
    }

    // Arrays. prefixItems checks the leading items one by one; items then covers the rest.
    const prefix = Array.isArray(node.prefixItems) ? node.prefixItems.map((m, i) => compileNode(m as Schema, doc, `${at('prefixItems')}/${i}`)) : [];
    if (prefix.length > 0) {
      checks.push((value, path, out) => {
        if (Array.isArray(value)) prefix.forEach((check, i) => i < value.length && check(value[i], `${path}/${i}`, out));
      });
    }
    if (isObject(node.items) || typeof node.items === 'boolean') {
      const rule = node.items;
      const rest = rule === false ? undefined : sub(rule, 'items');
      checks.push((value, path, out) => {
        if (!Array.isArray(value) || value.length <= prefix.length) return;
        if (rule === false) fail(out, path, 'items', `has ${value.length - prefix.length} more than the ${prefix.length} items allowed`);
        else if (rest) value.forEach((item, i) => i >= prefix.length && rest(item, `${path}/${i}`, out));
      });
    }
    if (typeof node.minItems === 'number') {
      const min = node.minItems;
      checks.push((value, path, out) => {
        if (Array.isArray(value) && value.length < min) fail(out, path, 'minItems', `must have at least ${min} items`);
      });
    }
    if (typeof node.maxItems === 'number') {
      const max = node.maxItems;
      checks.push((value, path, out) => {
        if (Array.isArray(value) && value.length > max) fail(out, path, 'maxItems', `must have at most ${max} items`);
      });
    }
    if (node.uniqueItems === true) {
      checks.push((value, path, out) => {
        if (!Array.isArray(value)) return;
        for (let i = 0; i < value.length; i += 1) {
          for (let j = i + 1; j < value.length; j += 1) {
            if (deepEqual(value[i], value[j])) {
              fail(out, path, 'uniqueItems', `items ${i} and ${j} are equal`);
              return;
            }
          }
        }
      });
    }

    // Objects
    if (Array.isArray(node.required)) {
      const required = node.required as string[];
      checks.push((value, path, out) => {
        if (!isObject(value)) return;
        const missing = required.filter((k) => !Object.hasOwn(value, k));
        if (missing.length > 0) fail(out, path, 'required', `is missing ${missing.join(', ')}`);
      });
    }
    const propertyChecks = new Map<string, Check>();
    if (isObject(node.properties)) {
      for (const [key, child] of Object.entries(node.properties)) {
        propertyChecks.set(key, compileNode(child as Schema, doc, `${at('properties')}/${escapeKey(key)}`));
      }
      checks.push((value, path, out) => {
        if (!isObject(value)) return;
        for (const [key, check] of propertyChecks) if (Object.hasOwn(value, key)) check(value[key], `${path}/${escapeKey(key)}`, out);
      });
    }
    if ('additionalProperties' in node) {
      const rule = node.additionalProperties;
      const extra = rule === false ? undefined : sub(rule, 'additionalProperties');
      checks.push((value, path, out) => {
        if (!isObject(value)) return;
        const extras = Object.keys(value).filter((k) => !propertyChecks.has(k));
        if (extras.length === 0) return;
        if (rule === false) fail(out, path, 'additionalProperties', `has unknown properties ${extras.join(', ')}`);
        else if (extra) for (const k of extras) extra(value[k], `${path}/${escapeKey(k)}`, out);
      });
    }
    if (typeof node.minProperties === 'number') {
      const min = node.minProperties;
      checks.push((value, path, out) => {
        if (isObject(value) && Object.keys(value).length < min) fail(out, path, 'minProperties', `must have at least ${min} properties`);
      });
    }
    if (typeof node.maxProperties === 'number') {
      const max = node.maxProperties;
      checks.push((value, path, out) => {
        if (isObject(value) && Object.keys(value).length > max) fail(out, path, 'maxProperties', `must have at most ${max} properties`);
      });
    }

    // Combinators
    if (Array.isArray(node.allOf)) {
      const members = node.allOf.map((m, i) => compileNode(m as Schema, doc, `${at('allOf')}/${i}`));
      checks.push((value, path, out) => members.forEach((m) => m(value, path, out)));
    }
    if (Array.isArray(node.anyOf)) {
      const members = node.anyOf.map((m, i) => compileNode(m as Schema, doc, `${at('anyOf')}/${i}`));
      checks.push((value, path, out) => {
        if (!members.some((m) => valid(m, value, path))) fail(out, path, 'anyOf', 'must match at least one of the alternatives');
      });
    }
    if (Array.isArray(node.oneOf)) {
      const members = node.oneOf.map((m, i) => compileNode(m as Schema, doc, `${at('oneOf')}/${i}`));
      checks.push((value, path, out) => {
        const count = members.filter((m) => valid(m, value, path)).length;
        if (count !== 1) {
          fail(out, path, 'oneOf', count === 0 ? 'must match exactly one of the alternatives, and matches none' : 'must match exactly one of the alternatives, and matches several');
        }
      });
    }
    if ('not' in node) {
      const inner = sub(node.not, 'not');
      checks.push((value, path, out) => {
        if (valid(inner, value, path)) fail(out, path, 'not', 'must not match the excluded schema');
      });
    }
    if ('if' in node) {
      const cond = sub(node.if, 'if');
      const then = 'then' in node ? sub(node.then, 'then') : undefined;
      const otherwise = 'else' in node ? sub(node.else, 'else') : undefined;
      checks.push((value, path, out) => {
        if (valid(cond, value, path)) then?.(value, path, out);
        else otherwise?.(value, path, out);
      });
    }

    return (value, path, out) => {
      for (const check of checks) check(value, path, out);
    };
  }

  function documentFor(ref: string): SchemaDocument {
    const doc = byId.get(ref) ?? byName.get(ref) ?? bySchema.get(ref);
    if (!doc) throw new Error(`no schema ${JSON.stringify(ref)}; known: ${[...byName.keys()].join(', ')}`);
    return doc;
  }

  const compileSchema = (ref: string): Validator => {
    const doc = documentFor(ref);
    const check = compileTarget({ doc, node: doc.json as Schema, pointer: '' });
    return (value) => {
      const out: ValidationIssue[] = [];
      check(value, '', out);
      return out;
    };
  };

  const validate = (ref: string, value: unknown): ValidationResult => {
    const issues = compileSchema(ref)(value);
    return issues.length === 0 ? { ok: true } : { ok: false, issues };
  };

  const validateRecord = (value: unknown): ValidationResult => {
    const tag = isObject(value) ? value.schema : undefined;
    if (typeof tag !== 'string' || !bySchema.has(tag)) {
      return { ok: false, issues: [{ instancePath: '/schema', schemaPath: '', keyword: 'schema', message: 'is not a published record schema' }] };
    }
    return validate(tag, value);
  };

  return { names: [...byName.keys()], compileSchema, validate, validateRecord };
}

const published = createRegistry(SCHEMA_DOCUMENTS);

/** The names of the published schemas, such as "claim". */
export const SCHEMA_NAMES: readonly string[] = published.names;

/** Compile a validator for a published schema, by file name ("claim"), by $id or by record tag. */
export const compileSchema = (ref: string): Validator => published.compileSchema(ref);

/** Validate a value against a published schema. */
export const validate = (ref: string, value: unknown): ValidationResult => published.validate(ref, value);

/**
 * Validate a record by its own `schema` field, such as "statespace/claim@1". A record with no
 * `schema` field, or one this package does not publish, is not valid.
 */
export const validateRecord = (value: unknown): ValidationResult => published.validateRecord(value);

/** A type guard: true when the value is a valid record, by its `schema` tag such as "statespace/claim@1". */
export function isRecord<K extends keyof RecordTypes>(schema: K, value: unknown): value is RecordTypes[K] {
  return published.validate(schema, value).ok;
}

/** A type guard: true when the value is valid against the published schema of that name, such as "event". */
export function isValid<K extends keyof SchemaTypes>(name: K, value: unknown): value is SchemaTypes[K] {
  return published.validate(name, value).ok;
}

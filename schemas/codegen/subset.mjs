// The JSON Schema subset the course's schemas may use, and the lint that keeps patterns portable.
//
// One schema source feeds a TypeScript validator, Python's `jsonschema` and the type generators. A
// keyword that one of them ignores or reads differently would let the two languages disagree, so a
// published schema may use only the keywords below, and every `pattern` must mean the same thing to
// ECMAScript (with the `u` flag) and to Python's `re.search`. The gate runs both checks.

export const DIALECT = 'https://json-schema.org/draft/2020-12/schema';

/** Keywords that only describe: no validator acts on them. */
export const ANNOTATION_KEYWORDS = new Set([
  '$schema', '$id', '$comment', 'title', 'description', 'format', 'default', 'examples',
]);

/** Keywords that constrain a value. */
export const VALIDATION_KEYWORDS = new Set([
  'type', 'enum', 'const', 'required',
  'pattern', 'minLength', 'maxLength',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum',
  'minItems', 'maxItems', 'uniqueItems',
  'minProperties', 'maxProperties',
]);

/** Keywords whose value holds subschemas. */
export const APPLICATOR_KEYWORDS = {
  $ref: 'ref',
  $defs: 'map',
  properties: 'map',
  items: 'schema',
  prefixItems: 'list',
  additionalProperties: 'schema',
  not: 'schema',
  if: 'schema',
  then: 'schema',
  else: 'schema',
  oneOf: 'list',
  anyOf: 'list',
  allOf: 'list',
};

export const ALLOWED_KEYWORDS = new Set([
  ...ANNOTATION_KEYWORDS,
  ...VALIDATION_KEYWORDS,
  ...Object.keys(APPLICATOR_KEYWORDS),
]);

export const TYPE_NAMES = new Set(['string', 'number', 'integer', 'boolean', 'null', 'array', 'object']);

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Visit every subschema of a document. `visit(schema, pointer)` receives each schema object and its
 * JSON Pointer inside the document. Boolean schemas are reported through `visit` as booleans.
 */
export function walkSchemas(root, visit) {
  const walk = (schema, pointer) => {
    visit(schema, pointer);
    if (!isObject(schema)) return;
    for (const [keyword, kind] of Object.entries(APPLICATOR_KEYWORDS)) {
      if (!(keyword in schema)) continue;
      const value = schema[keyword];
      if (kind === 'schema') walk(value, `${pointer}/${keyword}`);
      else if (kind === 'map' && isObject(value)) {
        for (const [key, sub] of Object.entries(value)) walk(sub, `${pointer}/${keyword}/${escapePointer(key)}`);
      } else if (kind === 'list' && Array.isArray(value)) {
        value.forEach((sub, i) => walk(sub, `${pointer}/${keyword}/${i}`));
      }
    }
  };
  walk(root, '');
}

export const escapePointer = (s) => s.replaceAll('~', '~0').replaceAll('/', '~1');

/** Problems with the keywords a published schema uses; an empty list means it stays in the subset. */
export function checkKeywords(doc) {
  const problems = [];
  walkSchemas(doc, (schema, pointer) => {
    const where = pointer === '' ? '(root)' : pointer;
    if (typeof schema === 'boolean') return;
    if (!isObject(schema)) {
      problems.push(`${where}: a schema must be an object or a boolean`);
      return;
    }
    for (const key of Object.keys(schema)) {
      if (ALLOWED_KEYWORDS.has(key) || key.startsWith('x-')) continue;
      problems.push(`${where}: keyword "${key}" is outside the supported subset`);
    }
    if ('type' in schema) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      for (const t of types) if (!TYPE_NAMES.has(t)) problems.push(`${where}: unknown type ${JSON.stringify(t)}`);
    }
    if ('required' in schema && !(Array.isArray(schema.required) && schema.required.every((r) => typeof r === 'string'))) {
      problems.push(`${where}: required must be an array of strings`);
    }
    if ('enum' in schema && !(Array.isArray(schema.enum) && schema.enum.length > 0)) {
      problems.push(`${where}: enum must be a non-empty array`);
    }
    for (const key of ['allOf', 'anyOf', 'oneOf']) {
      if (key in schema && !(Array.isArray(schema[key]) && schema[key].length > 0)) {
        problems.push(`${where}: ${key} must be a non-empty array`);
      }
    }
    if ('pattern' in schema) {
      if (typeof schema.pattern !== 'string') problems.push(`${where}: pattern must be a string`);
      else for (const p of lintPattern(schema.pattern)) problems.push(`${where}: pattern ${JSON.stringify(schema.pattern)}: ${p}`);
    }
    if ('$ref' in schema && typeof schema.$ref !== 'string') problems.push(`${where}: $ref must be a string`);
    if ('additionalProperties' in schema && typeof schema.additionalProperties !== 'boolean' && !isObject(schema.additionalProperties)) {
      problems.push(`${where}: additionalProperties must be a boolean or a schema`);
    }
    if ('items' in schema && !isObject(schema.items) && typeof schema.items !== 'boolean') {
      problems.push(`${where}: items must be a schema or a boolean`);
    }
    if ('prefixItems' in schema) {
      // A tuple: a fixed number of leading items, each with its own schema. Both generators and both
      // validators read it the same way only when every leading item is required, so minItems must say so.
      const n = Array.isArray(schema.prefixItems) ? schema.prefixItems.length : 0;
      if (n === 0) problems.push(`${where}: prefixItems must be a non-empty array of schemas`);
      else if (schema.minItems !== n) problems.push(`${where}: a tuple needs minItems equal to the length of prefixItems (${n}), so that no leading item is optional`);
    }
  });
  return problems;
}

/**
 * Problems that make a regular expression mean different things to ECMAScript (flag `u`) and to
 * Python's `re.search`. Measured differences this guards against: Python's `$` also matches before a
 * final newline; Python's `\d`, `\w` and `\s` read Unicode classes; ECMAScript's `.` excludes more
 * line terminators than Python's. Write `[0-9]` and `(?![\s\S])` instead.
 */
export function lintPattern(pattern) {
  const problems = [];
  try {
    new RegExp(pattern, 'u');
  } catch (e) {
    problems.push(`does not compile as an ECMAScript pattern with the u flag (${e.message})`);
    return problems;
  }
  let inClass = false;
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === '\\') {
      const n = pattern[i + 1];
      i += 1;
      if (n === undefined) {
        problems.push('ends with a lone backslash');
      } else if ('dDwWsSbBpPkzZAhHRX'.includes(n)) {
        problems.push(`\\${n} reads differently in Python`);
      } else if (/[0-9]/.test(n)) {
        problems.push(`\\${n} is a back reference or an octal escape, which the two languages read differently`);
      } else if (n === 'u' && pattern[i + 1] === '{') {
        problems.push('\\u{...} is not valid in Python');
      } else if (n === 'c') {
        problems.push('\\c is not valid in Python');
      }
      continue;
    }
    if (inClass) {
      if (c === ']') inClass = false;
      else if (c === '[') problems.push('a [ inside a class reads differently in Python');
      continue;
    }
    if (c === '[' && (pattern.startsWith('[\\s\\S]', i) || pattern.startsWith('[\\S\\s]', i))) {
      i += 6; // [\s\S] is any character in both languages: the portable end-of-input idiom is (?![\s\S])
      continue;
    }
    if (c === '[') {
      inClass = true;
      if (pattern[i + 1] === '^') i += 1;
      if (pattern[i + 1] === ']') problems.push('a class that starts with ] reads differently in ECMAScript');
      continue;
    }
    if (c === '$') problems.push('$ also matches before a final newline in Python; use (?![\\s\\S]) for the end of the input');
    if (c === '.') problems.push('. excludes different line terminators in the two languages; use a class');
    if (c === '(' && pattern[i + 1] === '?') {
      const rest = pattern.slice(i + 2, i + 4);
      const ok = rest.startsWith(':') || rest.startsWith('=') || rest.startsWith('!');
      if (!ok) problems.push(`(?${rest[0] ?? ''}... is a construct only one of the languages reads (named groups, lookbehind, flags)`);
    }
    if ((c === '+' || c === '*' || c === '?' || c === '}') && pattern[i + 1] === '+') {
      problems.push('a possessive quantifier is not valid in ECMAScript');
    }
  }
  if (inClass) problems.push('has an unclosed character class');
  return problems;
}

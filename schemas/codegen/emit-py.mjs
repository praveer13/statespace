// Python emitter: TypedDict records, the embedded schema documents and the statement-hash constants.
// Targets Python 3.11 or later (typing.NotRequired).

import { header, wrap } from './emit-ts.mjs';

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KEYWORDS = new Set([
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
  'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
]);

export function pyLiteral(value, level = 0) {
  const pad = '    '.repeat(level);
  const inner = '    '.repeat(level + 1);
  if (value === null) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((v) => v === null || ['string', 'number', 'boolean'].includes(typeof v)) && JSON.stringify(value).length <= 80) {
      return `[${value.map((v) => pyLiteral(v)).join(', ')}]`;
    }
    return `[\n${value.map((v) => `${inner}${pyLiteral(v, level + 1)},`).join('\n')}\n${pad}]`;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${pyLiteral(v, level + 1)},`).join('\n')}\n${pad}}`;
}

function pyType(node, defined, uses) {
  switch (node.t) {
    case 'prim':
      switch (node.prim) {
        case 'string': return 'str';
        case 'integer': return 'int';
        case 'number': return 'float';
        case 'boolean': return 'bool';
        case 'null': return 'None';
        case 'unknown': uses.add('Any'); return 'Any';
        case 'never': uses.add('Never'); return 'Never';
        default: throw new Error(`unknown primitive ${node.prim}`);
      }
    case 'lit':
      if (node.value === null) return 'None';
      uses.add('Literal');
      return `Literal[${pyLiteral(node.value)}]`;
    case 'ref':
      return defined.has(node.name) ? node.name : JSON.stringify(node.name);
    case 'union': {
      const lits = node.items.filter((n) => n.t === 'lit' && n.value !== null);
      const parts = [];
      if (lits.length > 0) {
        uses.add('Literal');
        parts.push(`Literal[${lits.map((n) => pyLiteral(n.value)).join(', ')}]`);
      }
      for (const n of node.items) if (!(n.t === 'lit' && n.value !== null)) parts.push(pyType(n, defined, uses));
      if (parts.some((p) => p.startsWith('"'))) {
        uses.add('Union');
        return `Union[${parts.join(', ')}]`;
      }
      return parts.join(' | ');
    }
    case 'array':
      return `list[${pyType(node.item, defined, uses)}]`;
    case 'tuple': {
      const rest = node.rest ? [`*tuple[${pyType(node.rest, defined, uses)}, ...]`] : [];
      return `tuple[${[...node.items.map((n) => pyType(n, defined, uses)), ...rest].join(', ')}]`;
    }
    case 'record':
      return `dict[str, ${pyType(node.value, defined, uses)}]`;
    default:
      throw new Error(`cannot print ${JSON.stringify(node)}`);
  }
}

const docstring = (parts, indent) => {
  const text = parts.filter(Boolean).join('\n\n');
  if (!text) return [];
  const safe = text.replaceAll('\\', '\\\\').replaceAll('"""', '\\"\\"\\"');
  const lines = wrap(safe, 100 - indent.length - 3);
  if (lines.length === 1) return [`${indent}"""${lines[0]}"""`];
  return [`${indent}"""${lines[0]}`, ...lines.slice(1).map((l) => (l === '' ? '' : `${indent}${l}`)), `${indent}"""`];
};

const comment = (text, indent) => (text ? wrap(text, 100 - indent.length - 2).map((l) => `${indent}# ${l}`) : []);

export function emitRecords(model, digest) {
  const defined = new Set();
  const uses = new Set(['TypedDict']);
  const body = [];
  for (const d of model.decls) {
    if (d.kind === 'object') {
      const fields = d.props.map((p) => {
        let t = pyType(p.type, defined, uses);
        if (p.optional) {
          uses.add('NotRequired');
          t = `NotRequired[${t}]`;
        }
        return { key: p.key, type: t, description: p.description };
      });
      const classOk = fields.every((f) => IDENT.test(f.key) && !KEYWORDS.has(f.key) && !f.key.startsWith('__'));
      if (classOk) {
        body.push(`class ${d.name}(TypedDict):`);
        const doc = docstring([d.title, d.description], '    ');
        body.push(...doc);
        for (const f of fields) {
          body.push(...comment(f.description, '    '));
          body.push(`    ${f.key}: ${f.type}`);
        }
        if (fields.length === 0 && doc.length === 0) body.push('    pass');
        body.push('', '');
      } else {
        body.push(...comment([d.title, d.description].filter(Boolean).join('. '), ''));
        body.push(`${d.name} = TypedDict(`, `    ${JSON.stringify(d.name)},`, '    {');
        for (const f of fields) body.push(`        ${JSON.stringify(f.key)}: ${f.type},`);
        body.push('    },', ')', '', '');
      }
    } else {
      body.push(...comment(d.description, ''));
      body.push(`${d.name} = ${pyType(d.node, defined, uses)}`, '', '');
    }
    defined.add(d.name);
  }
  body.push('# Record types by the value of their `schema` field.');
  body.push('RECORD_TYPES: dict[str, type] = {');
  for (const r of model.records) body.push(`    ${JSON.stringify(r.schemaConst)}: ${r.typeName},`);
  body.push('}', '');
  body.push('# The type each published schema describes, by schema name.');
  body.push('SCHEMA_TYPES: dict[str, type] = {');
  for (const r of model.roots) body.push(`    ${JSON.stringify(r.name)}: ${r.typeName},`);
  body.push('}', '');
  const names = model.decls.map((d) => d.name);
  const all = ['RECORD_TYPES', 'SCHEMA_TYPES', ...names].sort();
  body.push('', '__all__ = [', ...all.map((n) => `    ${JSON.stringify(n)},`), ']', '');
  const order = ['Any', 'Literal', 'Never', 'NotRequired', 'TypedDict', 'Union'];
  const imports = `from typing import ${order.filter((n) => uses.has(n)).join(', ')}`;
  return [header(digest, '#').trimEnd(), '# Requires Python 3.11 or later (typing.NotRequired).', '', imports, '', '', ...body].join('\n').replace(/\n{4,}/g, '\n\n\n');
}

export function emitSchemas(docs, model, digest) {
  const records = new Map(model.records.map((r) => [r.id, r.schemaConst]));
  const out = [header(digest, '#')];
  out.push('from typing import Any, TypedDict', '', '');
  out.push('class SchemaDocument(TypedDict):');
  out.push('    name: str  # the file name without .schema.json');
  out.push('    id: str  # the $id of the document, urn:statespace:<name>@<major>');
  out.push("    schema: str | None  # the value of the record's `schema` field; None for shared definitions");
  out.push('    json: dict[str, Any]  # the schema, as parsed JSON', '', '');
  out.push(`SCHEMA_DIGEST = ${JSON.stringify(digest)}`, '');
  out.push('SCHEMA_DOCUMENTS: list[SchemaDocument] = [');
  for (const d of docs) {
    out.push('    {');
    out.push(`        "name": ${JSON.stringify(d.name)},`);
    out.push(`        "id": ${JSON.stringify(d.doc.$id)},`);
    out.push(`        "schema": ${pyLiteral(records.get(d.doc.$id) ?? null)},`);
    out.push(`        "json": ${pyLiteral(d.doc, 2)},`);
    out.push('    },');
  }
  out.push(']', '');
  return out.join('\n');
}

export function emitStatementHashSpec(spec, digest) {
  const out = [header(digest, '#')];
  out.push(`STATEMENT_HASH_SPEC_ID = ${JSON.stringify(spec.id)}`, '');
  out.push('# The code points that trim_right removes from the end of a statement, in ascending order. The one');
  out.push('# written source is x-statementHash in schemas/defs.schema.json. str.rstrip() is not used: it removes a');
  out.push('# different set.');
  out.push('TRIM_RIGHT_CODE_POINTS: tuple[int, ...] = (');
  for (const c of spec.codePoints) out.push(`    0x${c.value.toString(16).toUpperCase().padStart(4, '0')},  # ${c.name}`);
  out.push(')', '');
  return out.join('\n');
}

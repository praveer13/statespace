// Loads the published schemas and builds the language-neutral type model that both emitters walk.
//
// The model is a list of named declarations. Each declaration is an object type (a record with
// properties) or an alias (an enum, a primitive, a union, an array). Nested objects are hoisted into
// named declarations so that TypeScript and Python get the same names. Validation-only keywords
// (if/then/else, not, shapeless allOf/anyOf/oneOf, patterns, bounds) do not change a type; the
// validators enforce them.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export const ID_RE = /^urn:statespace:([a-z][a-z0-9-]*)@([0-9]+)$/;
const FILE_RE = /^([a-z][a-z0-9-]*)\.schema\.json$/;

/** Text with line endings normalised to LF, so a CRLF checkout hashes and compares the same. */
export const lf = (text) => text.replaceAll('\r\n', '\n');

export const sha256Hex = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');

/** The published schemas: schemas/*.schema.json, sorted by file name. Drafts are not published. */
export function loadPublished(schemasDir) {
  const files = fs.readdirSync(schemasDir).filter((f) => FILE_RE.test(f)).sort();
  return files.map((file) => loadSchemaFile(path.join(schemasDir, file)));
}

export function loadSchemaFile(filePath) {
  const file = path.basename(filePath);
  const text = lf(fs.readFileSync(filePath, 'utf8'));
  let doc;
  let parseError = null;
  try {
    doc = JSON.parse(text);
  } catch (e) {
    parseError = e.message;
  }
  const name = (FILE_RE.exec(file) ?? [])[1] ?? file;
  const idMatch = isObject(doc) && typeof doc.$id === 'string' ? ID_RE.exec(doc.$id) : null;
  return { name, file, text, doc, parseError, id: isObject(doc) ? doc.$id : undefined, major: idMatch ? Number(idMatch[2]) : undefined };
}

/** One digest over every published schema, written into each generated file's header. */
export function schemaDigest(docs) {
  return sha256Hex(docs.map((d) => `${d.file}\n${d.text}\n`).join(''));
}

export function pascal(text) {
  return text
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

const hasShape = (s) => {
  if (!isObject(s)) return false;
  if (['type', 'properties', 'items', 'prefixItems', '$ref', 'const', 'enum', 'additionalProperties'].some((k) => k in s)) return true;
  return ['oneOf', 'anyOf', 'allOf'].some((k) => Array.isArray(s[k]) && s[k].some(hasShape));
};

const unescapePointer = (s) => decodeURIComponent(s).replaceAll('~1', '/').replaceAll('~0', '~');

/**
 * Build the model from loaded documents (published ones, and any extra documents such as the
 * self-test schema). Throws an Error with a message that names the schema location on anything the
 * generator does not support, so an unsupported construct is never silently typed as `unknown`.
 */
export function buildModel(loaded) {
  const byId = new Map(loaded.map((d) => [d.doc.$id, d]));
  const decls = [];
  const names = new Map(); // declaration name -> source, to catch collisions

  const rootName = (d) => d.doc['x-typeName'] ?? pascal(d.name);
  const prefixOf = (d) => (d.name === 'defs' ? '' : rootName(d));
  const defName = (d, key) => {
    const sub = isObject(d.doc.$defs) ? d.doc.$defs[key] : undefined;
    return isObject(sub) && typeof sub['x-typeName'] === 'string' ? sub['x-typeName'] : `${prefixOf(d)}${pascal(key)}`;
  };
  const hasRoot = (d) => 'type' in d.doc || 'properties' in d.doc;

  const claimName = (name, source) => {
    if (names.has(name)) throw new Error(`type name ${name} is produced twice (${names.get(name)} and ${source}); rename a property or a $defs entry`);
    names.set(name, source);
  };

  const resolveRef = (ref, from) => {
    const hash = ref.indexOf('#');
    const target = hash === -1 ? ref : ref.slice(0, hash);
    const fragment = hash === -1 ? '' : ref.slice(hash + 1);
    const doc = target === '' ? from : byId.get(target);
    if (!doc) throw new Error(`${from.file}: $ref ${JSON.stringify(ref)} names no loaded schema`);
    if (fragment === '') {
      if (!hasRoot(doc)) throw new Error(`${from.file}: $ref ${JSON.stringify(ref)} points at a document with no root type`);
      return rootName(doc);
    }
    const m = /^\/\$defs\/([^/]+)$/.exec(fragment);
    if (!m) throw new Error(`${from.file}: $ref ${JSON.stringify(ref)}: only #, #/$defs/<name> and urn:...#/$defs/<name> are supported`);
    const key = unescapePointer(m[1]);
    if (!isObject(doc.doc.$defs) || !(key in doc.doc.$defs)) throw new Error(`${from.file}: $ref ${JSON.stringify(ref)} names no $defs entry`);
    return defName(doc, key);
  };

  const union = (items) => {
    const flat = [];
    const seen = new Set();
    for (const item of items) {
      for (const part of item.t === 'union' ? item.items : [item]) {
        const key = JSON.stringify(part);
        if (!seen.has(key)) {
          seen.add(key);
          flat.push(part);
        }
      }
    }
    return flat.length === 1 ? flat[0] : { t: 'union', items: flat };
  };

  // Declare an object type with properties under `name`.
  const declareObject = (schema, name, source, from) => {
    claimName(name, source);
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    const props = [];
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      props.push({
        key,
        optional: !required.has(key),
        type: nodeOf(sub, `${name}${pascal(key)}`, `${source}/properties/${key}`, from),
        description: isObject(sub) ? sub.description : undefined,
      });
    }
    for (const key of required) {
      if (!(key in (schema.properties ?? {}))) props.push({ key, optional: false, type: { t: 'prim', prim: 'unknown' }, description: undefined });
    }
    const open = schema.additionalProperties !== false;
    if (isObject(schema.additionalProperties)) {
      throw new Error(`${source}: an object with properties and an additionalProperties schema is not supported`);
    }
    decls.push({ name, kind: 'object', source, title: schema.title, description: schema.description, props, open });
    return { t: 'ref', name };
  };

  function nodeOf(schema, name, source, from) {
    if (schema === true || (isObject(schema) && Object.keys(schema).every((k) => ['description', 'title', '$comment', 'default', 'examples'].includes(k) || k.startsWith('x-')))) {
      return { t: 'prim', prim: 'unknown' };
    }
    if (schema === false) return { t: 'prim', prim: 'never' };
    if (!isObject(schema)) throw new Error(`${source}: not a schema`);

    if (Array.isArray(schema.allOf) && schema.allOf.some(hasShape)) {
      throw new Error(`${source}: allOf with a member that has a shape (type, properties, $ref, ...) is not supported; allOf may hold only constraints`);
    }
    if ('$ref' in schema) return { t: 'ref', name: resolveRef(schema.$ref, from) };
    if ('const' in schema) return { t: 'lit', value: schema.const };
    if ('enum' in schema) return union(schema.enum.map((value) => ({ t: 'lit', value })));

    for (const key of ['oneOf', 'anyOf']) {
      if (Array.isArray(schema[key]) && schema[key].some(hasShape)) {
        if ('properties' in schema) throw new Error(`${source}: properties beside ${key} is not supported`);
        return union(schema[key].map((member, i) => nodeOf(member, `${name}Case${i + 1}`, `${source}/${key}/${i}`, from)));
      }
    }

    const types = 'type' in schema ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
    if (types.length === 0) {
      if ('properties' in schema) types.push('object');
      else if ('items' in schema || 'prefixItems' in schema) types.push('array');
      else return { t: 'prim', prim: 'unknown' };
    }
    const nodes = types.map((type) => {
      switch (type) {
        case 'string': return { t: 'prim', prim: 'string' };
        case 'number': return { t: 'prim', prim: 'number' };
        case 'integer': return { t: 'prim', prim: 'integer' };
        case 'boolean': return { t: 'prim', prim: 'boolean' };
        case 'null': return { t: 'prim', prim: 'null' };
        case 'array': {
          if (Array.isArray(schema.prefixItems)) {
            // A tuple. The lint requires minItems to equal the number of leading items, so none is optional.
            const items = schema.prefixItems.map((member, i) => nodeOf(member, `${name}Item${i + 1}`, `${source}/prefixItems/${i}`, from));
            const open = !('items' in schema) || schema.items === true || isObject(schema.items);
            const rest = !open ? null : isObject(schema.items) ? nodeOf(schema.items, `${name}Rest`, `${source}/items`, from) : { t: 'prim', prim: 'unknown' };
            return { t: 'tuple', items, rest };
          }
          return { t: 'array', item: 'items' in schema ? nodeOf(schema.items, `${name}Item`, `${source}/items`, from) : { t: 'prim', prim: 'unknown' } };
        }
        case 'object':
          if ('properties' in schema) return declareObject(schema, types.length > 1 ? `${name}Object` : name, source, from);
          if (isObject(schema.additionalProperties)) {
            return { t: 'record', value: nodeOf(schema.additionalProperties, `${name}Value`, `${source}/additionalProperties`, from) };
          }
          return { t: 'record', value: { t: 'prim', prim: 'unknown' } };
        default:
          throw new Error(`${source}: unknown type ${type}`);
      }
    });
    return union(nodes);
  }

  for (const d of loaded) {
    if (hasRoot(d)) {
      const name = rootName(d);
      const node = nodeOf(d.doc, name, `${d.file}`, d);
      if (node.t !== 'ref' || node.name !== name) {
        claimName(name, d.file);
        decls.push({ name, kind: 'alias', source: d.file, title: d.doc.title, description: d.doc.description, node });
      }
    }
    for (const [key, sub] of Object.entries(isObject(d.doc.$defs) ? d.doc.$defs : {})) {
      const name = defName(d, key);
      const source = `${d.file}#/$defs/${key}`;
      const node = nodeOf(sub, name, source, d);
      if (node.t !== 'ref' || node.name !== name) {
        claimName(name, source);
        decls.push({ name, kind: 'alias', source, title: undefined, description: isObject(sub) ? sub.description : undefined, node });
      }
    }
  }

  // Dependency order: a declaration comes after the declarations it refers to (cycles keep source order).
  const byName = new Map(decls.map((d) => [d.name, d]));
  const refsOf = (node, out = new Set()) => {
    if (!node) return out;
    if (node.t === 'ref') out.add(node.name);
    else if (node.t === 'union') node.items.forEach((n) => refsOf(n, out));
    else if (node.t === 'array') refsOf(node.item, out);
    else if (node.t === 'tuple') {
      node.items.forEach((n) => refsOf(n, out));
      refsOf(node.rest, out);
    } else if (node.t === 'record') refsOf(node.value, out);
    return out;
  };
  const depsOf = (d) => (d.kind === 'object' ? d.props.flatMap((p) => [...refsOf(p.type)]) : [...refsOf(d.node)]);
  const ordered = [];
  const state = new Map();
  const visit = (d) => {
    if (state.get(d.name)) return;
    state.set(d.name, 'visiting');
    for (const dep of depsOf(d)) {
      const target = byName.get(dep);
      if (!target) throw new Error(`${d.source}: refers to ${dep}, which no schema declares`);
      visit(target);
    }
    state.set(d.name, 'done');
    ordered.push(d);
  };
  decls.forEach(visit);

  const roots = loaded
    .filter(hasRoot)
    .map((d) => ({
      name: d.name,
      id: d.doc.$id,
      typeName: rootName(d),
      schemaConst: isObject(d.doc.properties) && isObject(d.doc.properties.schema) && 'const' in d.doc.properties.schema ? d.doc.properties.schema.const : null,
    }));
  const records = roots.filter((r) => r.schemaConst !== null);

  return { decls: ordered, roots, records };
}

/** A name -> { keys, required, optional } table of the object declarations (keys in declaration order), for the sync check. */
export function manifestOf(model) {
  const out = {};
  for (const d of model.decls) {
    if (d.kind !== 'object') continue;
    out[d.name] = {
      keys: d.props.map((p) => p.key),
      required: d.props.filter((p) => !p.optional).map((p) => p.key),
      optional: d.props.filter((p) => p.optional).map((p) => p.key),
    };
  }
  return out;
}

/** The statement-hash annotation, read from the one place it is written. */
export function statementHashSpec(docs) {
  const defs = docs.find((d) => d.name === 'defs');
  const spec = defs?.doc?.$defs?.statementSha256?.['x-statementHash'];
  if (!spec) throw new Error('schemas/defs.schema.json: $defs.statementSha256 has no x-statementHash annotation');
  const list = spec.trimRight?.codePoints;
  if (!Array.isArray(list) || list.length === 0) throw new Error('x-statementHash.trimRight.codePoints must be a non-empty list');
  const codePoints = list.map((entry) => {
    const m = /^U\+([0-9A-F]{4,6})$/.exec(entry.cp);
    if (!m) throw new Error(`x-statementHash: bad code point ${JSON.stringify(entry.cp)}; write U+ and 4 to 6 uppercase hexadecimal digits`);
    return { value: parseInt(m[1], 16), ...entry };
  });
  const values = codePoints.map((c) => c.value);
  if (new Set(values).size !== values.length) throw new Error('x-statementHash: a code point is listed twice');
  if (values.some((v, i) => i > 0 && v <= values[i - 1])) throw new Error('x-statementHash: list the code points in ascending order');
  if (values.some((v) => v > 0xffff)) throw new Error('x-statementHash: the implementations trim UTF-16 code units, so every listed code point must be in the Basic Multilingual Plane');
  return { id: spec.id, codePoints };
}

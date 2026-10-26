// content/assurance/gate-claims.json: which course claims a gate backs (W1-T42; extended by W5-T08).
//
// The file maps a gate ID to the course claim IDs the gate backs, as one JSON object: { "GATE-interp": ["SEAM-13"] }.
// The nightly lane reads exactly that shape (scripts/spikes/W0-T04/lane.mjs, loadClaims): when a gate is red, the claims
// listed under it are written to status/nightly.json as the claims "unverified since <date>" (ARCHITECTURE.md 13.4;
// status/README.md section 3). The lane checks the shape and nothing else, so a mistyped gate or claim ID would
// downgrade nothing. These checks are what keeps the file honest: every key is a registered gate, every claim a
// registered ID, and the mappings the spine itself names are present.

import fs from 'node:fs';
import path from 'node:path';

export const GATE_CLAIMS_FILE = 'content/assurance/gate-claims.json';

/**
 * The mappings the spine names, each from the "Tested by" cell of a held seam (spine 5.3) or ARCHITECTURE.md 13.4:
 * SEAM-13 is the course's own claim "INS-interp agrees with the Lean reference" (GATE-interp, and the pocket-checker
 * differential in GATE-conformance); SEAM-14 is "PostgreSQL 18.6's SERIALIZABLE gives serializable outcomes"
 * (GATE-specimens, nightly, including the upstream update-conflict-out spec). The file may hold more, never less.
 */
export const SPINE_NAMED = Object.freeze({
  'GATE-interp': Object.freeze(['SEAM-13']),
  'GATE-conformance': Object.freeze(['SEAM-13']),
  'GATE-specimens': Object.freeze(['SEAM-14']),
});

/** The registered IDs, by kind: packages/ids/src/registry.json, plus the IDs that packages/ids/proposals.json holds. */
export function readIdKinds(root) {
  const kinds = new Map();
  let readable = false;
  const registry = path.join(root, 'packages', 'ids', 'src', 'registry.json');
  if (fs.existsSync(registry)) {
    try {
      for (const e of JSON.parse(fs.readFileSync(registry, 'utf8')).entries ?? []) kinds.set(e.id, e.kind);
      readable = true;
    } catch {
      /* reported by the caller as an unreadable registry */
    }
  }
  const proposals = path.join(root, 'packages', 'ids', 'proposals.json');
  if (fs.existsSync(proposals)) {
    try {
      for (const p of JSON.parse(fs.readFileSync(proposals, 'utf8')).proposals ?? []) if (typeof p?.id === 'string' && !kinds.has(p.id)) kinds.set(p.id, 'proposed');
    } catch {
      /* a malformed proposals file is GATE-links' to report */
    }
  }
  return { kinds, readable };
}

/**
 * Read and check the file under a tree.
 * @returns {{map: Record<string, string[]>|null, file: string, problems: string[]}}
 */
export function loadGateClaims(root) {
  const abs = path.join(root, GATE_CLAIMS_FILE);
  const problems = [];
  if (!fs.existsSync(abs)) return { map: null, file: GATE_CLAIMS_FILE, problems: [`${GATE_CLAIMS_FILE} does not exist: a red night would downgrade no course claim`] };
  let map;
  try {
    map = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (e) {
    return { map: null, file: GATE_CLAIMS_FILE, problems: [`${GATE_CLAIMS_FILE} is not JSON: ${e instanceof Error ? e.message : e}`] };
  }
  const shaped = map && typeof map === 'object' && !Array.isArray(map) && Object.values(map).every((v) => Array.isArray(v) && v.every((x) => typeof x === 'string'));
  if (!shaped) return { map: null, file: GATE_CLAIMS_FILE, problems: [`${GATE_CLAIMS_FILE} must be one object mapping a gate ID to a list of claim IDs: the nightly lane refuses any other shape and runs nothing`] };

  const { kinds, readable } = readIdKinds(root);
  if (!readable) problems.push('packages/ids/src/registry.json is missing or unreadable: the IDs in the claims file cannot be checked');
  for (const [gate, claims] of Object.entries(map)) {
    if (readable && kinds.get(gate) !== 'gate') problems.push(`${GATE_CLAIMS_FILE}: ${JSON.stringify(gate)} is not a registered gate ID, so no night could ever turn it red`);
    if (claims.length === 0) problems.push(`${GATE_CLAIMS_FILE}: ${gate} lists no claim`);
    const seen = new Set();
    for (const claim of claims) {
      if (seen.has(claim)) problems.push(`${GATE_CLAIMS_FILE}: ${gate} lists ${claim} twice`);
      seen.add(claim);
      if (readable && !kinds.has(claim)) problems.push(`${GATE_CLAIMS_FILE}: ${gate} backs ${JSON.stringify(claim)}, which the spine does not register (a new ID goes in packages/ids/proposals.json first)`);
    }
  }
  for (const [gate, named] of Object.entries(SPINE_NAMED)) {
    const have = map[gate] ?? [];
    for (const claim of named) if (!have.includes(claim)) problems.push(`${GATE_CLAIMS_FILE}: ${gate} must back ${claim} (spine 5.3 names it)`);
  }
  return { map, file: GATE_CLAIMS_FILE, problems };
}

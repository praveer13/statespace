// W0-T07: a reference implementation of content/governance/keepkill-rules.yaml, so that the
// allocation, interval and decision rules written there in prose have test vectors that a later
// implementation (the event log and SCR-assurance) must reproduce. Dependency-free and pure: no
// clock, no storage, no randomness. Integer arithmetic for hashing, IEEE 754 doubles with only
// + - * / and sqrt for intervals, integers for every point-difference test (the file's
// common.estimate.exact_tests).

/** parameters.z of the rules file: the double nearest to the 0.975 normal quantile. */
export const Z = 1.9599639845400543;

/** FNV-1a over 32 bits on UTF-16 code units (the rules' common.allocation.hash32). */
export function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** MurmurHash3's 32-bit finalizer (common.allocation.fmix32). */
export function fmix32(h0) {
  let h = h0 >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

/** common.allocation.key: "<comparison id>:<unit id>:<expSeed in decimal>". */
export function allocationKey(comparisonId, unitId, expSeed) {
  if (!Number.isInteger(expSeed) || expSeed < 0 || expSeed > 0xffffffff) throw new RangeError(`expSeed must be a uint32, got ${expSeed}`);
  return `${comparisonId}:${unitId}:${expSeed.toString(10)}`;
}

/** The parity of the low bits of a string's UTF-16 code units: 1 when an odd number of them are odd. */
export function codeUnitParity(s) {
  let p = 0;
  for (let i = 0; i < s.length; i++) p ^= s.charCodeAt(i) & 1;
  return p;
}

const stageNumber = (stratum) => {
  const m = /^S([1-9][0-9]*)$/.exec(stratum);
  if (!m) throw new Error(`a stratum must be a stage S<n>, got ${stratum}`);
  return Number(m[1]);
};

const codeUnitCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * common.allocation.rule for a KC comparison: units ordered stratum by stratum (stage number
 * order), within a stratum by v = fmix32(hash32(key)) ascending (ties by unit ID in code-unit
 * order), arms alternating along the whole order, the first arm from the lowest bit of the first v.
 * @param {{id: string, arms: [string, string], units: Record<string, string[]>}} comparison
 * @param {number} expSeed
 */
export function allocate(comparison, expSeed) {
  const strata = Object.keys(comparison.units).sort((a, b) => stageNumber(a) - stageNumber(b));
  const order = [];
  for (const stratum of strata) {
    const rows = comparison.units[stratum].map((unit) => {
      const key = allocationKey(comparison.id, unit, expSeed);
      return { unit, stratum, key, hash32: hash32(key), v: fmix32(hash32(key)) };
    });
    rows.sort((a, b) => a.v - b.v || codeUnitCompare(a.unit, b.unit));
    order.push(...rows);
  }
  if (order.length === 0) return [];
  const first = order[0].v & 1;
  return order.map((row, position) => ({ ...row, position, arm: comparison.arms[(first + position) % 2] }));
}

/** Comparison 4: window 1's arm, from the lowest bit of fmix32(hash32("reserve-weeks:window-1:<expSeed>")). */
export function firstWindowArm(comparison, expSeed) {
  const key = allocationKey(comparison.id, 'window-1', expSeed);
  const v = fmix32(hash32(key));
  return { key, v, arm: comparison.arms[v & 1] };
}

/** Wilson score interval for x of n (common.estimate.wilson), clamped to [0, 1]. */
export function wilson(x, n, z = Z) {
  if (!Number.isInteger(x) || !Number.isInteger(n) || n <= 0 || x < 0 || x > n) throw new RangeError(`wilson needs 0 <= x <= n, n > 0; got ${x} of ${n}`);
  const z2 = z * z;
  const c = (x + z2 / 2) / (n + z2);
  const h = (z / (n + z2)) * Math.sqrt((x * (n - x)) / n + z2 / 4);
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

/** Newcombe's hybrid score interval (method 10) for p1 - p2 (common.estimate.interval). */
export function newcombe(x1, n1, x2, n2, z = Z) {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const [l1, u1] = wilson(x1, n1, z);
  const [l2, u2] = wilson(x2, n2, z);
  const d = p1 - p2;
  const a = p1 - l1;
  const b = u2 - p2;
  const c = u1 - p1;
  const e = p2 - l2;
  return { p1, p2, l1, u1, l2, u2, d, L: d - Math.sqrt(a * a + b * b), U: d + Math.sqrt(c * c + e * e) };
}

/** common.estimate.exact_tests: x1/n1 - x2/n2 >= k points, in integers. */
export function leadsByAtLeast(x1, n1, x2, n2, k) {
  return 100 * (x1 * n2 - x2 * n1) >= k * n1 * n2;
}

/**
 * The common decisions (comparisons 2 and 3). Arm a is the default, arm b the alternative; the
 * estimate is b minus a.
 * @param {{xb: number, nb: number, xa: number, na: number, phase: 'interim' | 'final', cheaperAlternative: boolean, alternativeCheaperInTime?: boolean}} input
 * @param {{min_outcomes_per_arm: number, harm_read_outcomes_per_arm: number, switch_min_points: number, non_inferiority_margin_points: number}} p
 */
export function decideCommon(input, p) {
  const { xb, nb, xa, na, phase, cheaperAlternative, alternativeCheaperInTime = false } = input;
  if (na < p.harm_read_outcomes_per_arm || nb < p.harm_read_outcomes_per_arm) return { decision: 'not enough data', rule: 'below the harm-read count; no read', interval: null };
  const iv = newcombe(xb, nb, xa, na);
  if (iv.U < 0) return { decision: 'harm stop', rule: 'U < 0: the alternative is withdrawn and the default stands', interval: iv };
  if (phase === 'interim') return { decision: 'continue', rule: 'interim reads judge harm only', interval: iv };
  if (na < p.min_outcomes_per_arm || nb < p.min_outcomes_per_arm) return { decision: 'not enough data', rule: 'below the minimum; the default stands', interval: iv };
  if (iv.L > 0 && leadsByAtLeast(xb, nb, xa, na, p.switch_min_points)) return { decision: 'switch', rule: 'L > 0 and the alternative leads by at least the switch points', interval: iv };
  if (cheaperAlternative && alternativeCheaperInTime && iv.L > -p.non_inferiority_margin_points / 100) return { decision: 'switch', rule: 'non-inferior (L above minus the margin) and cheaper in time', interval: iv };
  return { decision: 'inconclusive', rule: 'the default stands', interval: iv };
}

/**
 * Comparison 1, read in either direction. The estimate is open minus collapsed.
 * @param {{xo: number, no: number, xc: number, nc: number, phase: 'interim' | 'final'}} input
 */
export function decideNote(input, p) {
  const { xo, no, xc, nc, phase } = input;
  if (no < p.harm_read_outcomes_per_arm || nc < p.harm_read_outcomes_per_arm) return { decision: 'not enough data', withdrawn: [], interval: null };
  const iv = newcombe(xo, no, xc, nc);
  const withdrawn = [];
  if (iv.U < 0) withdrawn.push('open, from expert-treatment units');
  if (iv.L > 0) withdrawn.push('collapsed, from novice-treatment units');
  if (phase === 'interim') return { decision: withdrawn.length > 0 ? 'harm stop' : 'continue', withdrawn, interval: iv };
  if (no < p.min_outcomes_per_arm || nc < p.min_outcomes_per_arm) return { decision: 'not enough data', withdrawn, interval: iv };
  if (iv.L > 0 && leadsByAtLeast(xo, no, xc, nc, p.switch_min_points)) return { decision: 'open in every eligible KC', withdrawn, interval: iv };
  if (iv.U < 0 && leadsByAtLeast(xc, nc, xo, no, p.switch_min_points)) return { decision: 'collapsed in every eligible KC', withdrawn, interval: iv };
  return { decision: 'inconclusive: the shipped defaults stand', withdrawn, interval: iv };
}

/**
 * Comparison 4. counts: counted weeks with graded or Bench work per complete window; acc: KCs first
 * learned in the arm's windows {x correct, n with an outcome}; ms: time on task per window.
 */
export function decideWindows(input, p) {
  const { reserve, noReserve, accReserve, accNoReserve, msReserve, msNoReserve, phase } = input;
  const m = p.window_margin_weeks;
  const harmReady = reserve.length >= p.harm_read_windows_per_arm && noReserve.length >= p.harm_read_windows_per_arm;
  if (harmReady && Math.max(...noReserve) <= Math.min(...reserve) - m) return { decision: 'harm stop', rule: 'every no-reserve window counts at least the margin fewer weeks than every reserve window' };
  if (phase === 'interim') return { decision: harmReady ? 'continue' : 'no read yet', rule: 'window ends judge harm only' };
  if (reserve.length < p.min_windows_per_arm || noReserve.length < p.min_windows_per_arm) return { decision: 'not enough data', rule: 'below the minimum; the default stands' };
  const ordered = Math.min(...noReserve) >= Math.max(...reserve) + m;
  const accOk = accReserve.n > 0 && accNoReserve.n > 0 && accNoReserve.x * accReserve.n >= accReserve.x * accNoReserve.n;
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const msOk = sum(msNoReserve) * msReserve.length >= sum(msReserve) * msNoReserve.length;
  if (ordered && accOk && msOk) return { decision: 'switch', rule: 'ordered with the margin, and both secondary outcomes no worse' };
  return { decision: 'default stands', rule: `ordered with the margin: ${ordered}; accuracy no worse: ${accOk}; time no worse: ${msOk}` };
}

/** The chance that a no-reserve windows all outrank d reserve windows, with exchangeable windows and no ties: 1 / C(a + d, a). */
export function orderingChance(a, d) {
  let c = 1;
  for (let i = 1; i <= a; i++) c = (c * (d + i)) / i;
  return { a, d, oneIn: Math.round(c) };
}

/*
 * W0-S04 harness driver: runs one job (a TLA+ spec plus a TLC configuration)
 * through Spectacle's interpreter at the pinned commit, and checks the result
 * against TLC's recorded outputs carried in the job.
 *
 * This is a classic script. It runs unchanged on a page (main thread), in a
 * classic dedicated worker (importScripts) and under Node (vm.runInThisContext),
 * after Spectacle's own scripts: lodash, hash-sum, tree-sitter.js and eval.js.
 * It reads Spectacle's globals (TLASpec, TlaInterpreter, Context, TLAState,
 * the value classes, evalExpr, parseExprToNode) and touches no DOM.
 *
 * Everything here is the course's adapter code, not Spectacle's: a
 * breadth-first search in TLC's order with invariant and deadlock checks, exact
 * (canonical) state keys beside Spectacle's 32-bit fingerprints, and the
 * state-pair check (is (s, t) a step of Next, and which action takes it).
 */
var W0S04 = (function () {
  'use strict';

  const now = () => performance.now();
  let quiet = true;
  const saved = {};

  function silence() {
    if (!quiet) return;
    for (const k of ['log', 'info', 'debug']) {
      if (!saved[k]) saved[k] = console[k];
      console[k] = function () {};
    }
  }
  function unsilence() {
    for (const k of Object.keys(saved)) { console[k] = saved[k]; delete saved[k]; }
  }

  // ---------------------------------------------------------------------
  // Parser bootstrap.
  // ---------------------------------------------------------------------
  async function initParser(opts) {
    const t0 = now();
    await TreeSitter.init(opts.locateFile ? { locateFile: opts.locateFile } : undefined);
    const p = new TreeSitter();
    const lang = await TreeSitter.Language.load(opts.languageUrl);
    p.setLanguage(lang);
    // eval.js reads the parser through a global binding named `parser`.
    globalThis.parser = p;
    try { parser = p; } catch (e) { /* no lexical binding: the global property serves */ }
    return { ms: now() - t0 };
  }

  // ---------------------------------------------------------------------
  // Exact canonical keys for TLA+ values (independent of 32-bit fingerprints).
  // Tuples and records are functions, as in TLA+: <<a, b>> equals
  // (1 :> a @@ 2 :> b), and [f |-> 1] equals ("f" :> 1).
  // ---------------------------------------------------------------------
  function fcnCanon(pairs) {
    pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return '[' + pairs.map((p) => p[0] + ':' + p[1]).join(',') + ']';
  }
  function canonVal(v) {
    if (v instanceof IntValue) return 'i' + v.val;
    if (v instanceof BoolValue) return v.val ? 'T' : 'F';
    if (v instanceof StringValue) return 's' + JSON.stringify(v.val);
    if (v instanceof ModelValue) return 'm' + v.val;
    if (v instanceof SetValue) {
      const els = Array.from(new Set(v.getElems().map(canonVal))).sort();
      return '{' + els.join(',') + '}';
    }
    if (v instanceof TupleValue) {
      return fcnCanon(v.elems.map((e, i) => ['i' + (i + 1), canonVal(e)]));
    }
    if (v instanceof FcnRcdValue) {
      const vals = v.getValues();
      return fcnCanon(v.getDomain().map((d, i) => [canonVal(d), canonVal(vals[i])]));
    }
    throw new Error('canonVal: unsupported value ' + (v && v.constructor ? v.constructor.name : String(v)));
  }
  function canonState(st) {
    const vars = st.stateVars;
    return Object.keys(vars).sort().map((k) => k + '=' + canonVal(vars[k])).join(';');
  }

  // ---------------------------------------------------------------------
  // Module loading. mode "fetch": the root module has a served path and every
  // EXTENDS target is fetched by Spectacle from the same directory. mode
  // "shim": fetch is replaced, for the parse only, by a lookup in the job's
  // module table, so nothing touches the network. mode "overrides": Spectacle's
  // own module_overrides argument with the real fetch left in place.
  // ---------------------------------------------------------------------
  async function parseSpec(job, mode, requestLog) {
    const t0 = now();
    const root = job.modules[job.root];
    let spec;
    const realFetch = globalThis.fetch;
    if (mode === 'shim') {
      globalThis.fetch = function (url) {
        const name = String(url).split('/').pop().replace(/\.tla$/, '');
        if (requestLog) requestLog.push(String(url));
        if (Object.prototype.hasOwnProperty.call(job.modules, name)) {
          return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(job.modules[name]) });
        }
        return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') });
      };
    }
    try {
      if (mode === 'overrides') {
        const ov = {};
        for (const k of Object.keys(job.modules)) if (k !== job.root) ov[k] = job.modules[k];
        spec = new TLASpec(root, undefined, 'Next', ov);
      } else {
        spec = new TLASpec(root, job.servedPath);
      }
      await spec.parse();
    } finally {
      if (mode === 'shim') globalThis.fetch = realFetch;
    }
    return { spec, ms: now() - t0, modulesResolved: Object.keys(spec.moduleTable || {}) };
  }

  function evalConstants(spec, constInputs) {
    const vals = {};
    for (const k of Object.keys(constInputs)) {
      const ctx = new Context(null, new TLAState({}), spec.spec_obj['op_defs'], {}, vals);
      ctx.evalModelVals = true;
      vals[k] = evalExprStrInContext(ctx, constInputs[k]);
    }
    return vals;
  }

  // Build a TLAState from a TLC state formula: one "/\ var = value" conjunct per
  // variable; long values may wrap onto continuation lines.
  function splitFormula(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const conj = [];
    for (const line of lines) {
      if (/^\/\\ /.test(line)) conj.push(line.slice(3));
      else if (line.trim() !== '' && conj.length) conj[conj.length - 1] += ' ' + line.trim();
    }
    if (conj.length === 0 && text.trim() !== '') conj.push(text.trim().replace(/^\/\\\s*/, ''));
    const out = {};
    for (const c of conj) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*)$/.exec(c.trim());
      if (!m) throw new Error('cannot split state conjunct: ' + c);
      out[m[1]] = m[2];
    }
    return out;
  }
  function stateFromFormula(env, text) {
    const parts = splitFormula(text);
    const vars = {};
    for (const v of Object.keys(parts)) {
      const ctx = new Context(null, new TLAState({}), env.spec.spec_obj['op_defs'], {}, env.consts);
      ctx.evalModelVals = true;
      vars[v] = evalExprStrInContext(ctx, parts[v]);
    }
    return new TLAState(vars);
  }

  // ---------------------------------------------------------------------
  // Successors and invariants.
  // ---------------------------------------------------------------------
  function makeEnv(spec, consts, job) {
    const interp = new TlaInterpreter();
    const nextDef = spec.getDefinitionByName(job.next);
    if (!nextDef) throw new Error('no definition named ' + job.next);
    const actions = spec.parseActionsFromNode(nextDef.node);
    const invNodes = (job.invariants || []).map((name) => ({ name, node: parseExprToNode(name) }));
    return { spec, consts, interp, job, actions, invNodes };
  }

  function successorsWhole(env, st) {
    return env.interp
      .computeNextStates(env.spec.spec_obj, env.consts, [st], undefined, env.spec, env.job.next)
      .map((c) => c.state.deprimeVars());
  }

  function opName(actionName) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(actionName || '');
    return m ? m[1] : actionName;
  }

  // Per action, as Spectacle's own UI computes them (worker.js recomputeNextStates).
  function successorsByAction(env, st) {
    const out = [];
    if (env.actions.length <= 1) {
      for (const s of successorsWhole(env, st)) out.push({ state: s, action: env.actions.length ? env.actions[0].name : env.job.next });
      return out;
    }
    for (const a of env.actions) {
      const res = env.interp.computeNextStates(env.spec.spec_obj, env.consts, [st], a.node, env.spec, env.job.next);
      for (const c of res) out.push({ state: c.state.deprimeVars(), action: a.name });
    }
    return out;
  }

  function evalInvariant(env, st, inv) {
    const ctx = new Context(null, st, env.spec.spec_obj['op_defs'], {}, env.consts);
    ctx['defns_curr_context'] = Object.keys(env.spec.spec_obj['op_defs']);
    ctx.setGlobalDefTable(env.spec.globalDefTable);
    ctx.setSpecObj(env.spec);
    const v = evalExpr(inv.node, ctx)[0]['val'];
    if (!(v instanceof BoolValue)) throw new Error('invariant ' + inv.name + ' did not evaluate to a Boolean');
    return v.val;
  }
  function firstViolated(env, st) {
    for (const inv of env.invNodes) if (!evalInvariant(env, st, inv)) return inv.name;
    return null;
  }

  // ---------------------------------------------------------------------
  // Breadth-first search in TLC's order (one worker): invariants are checked
  // on each new state as it is generated, the deadlock check (when on) when a
  // state with no successor is expanded. The search keeps going after the
  // first event, to the complete reachable set or the state bound, so one pass
  // yields the verdict, the counts at the verdict and the complete counts.
  // Distinct states are keyed by Spectacle's fingerprint, as Spectacle does;
  // exact keys are kept beside them to detect fingerprint collisions.
  // ---------------------------------------------------------------------
  function explore(env, opts) {
    const maxStates = opts.maxStates || Infinity;
    const keepGraph = !!opts.keepGraph;
    const t0 = now();
    const init = env.interp.computeInitStates(env.spec.spec_obj, env.consts, false, env.spec, env.job.init);
    const tInit = now();
    const seen = new Map(); // fingerprint -> index
    const nodes = []; // {fp, key, depth, pred}
    const states = [];
    const exactKeys = new Set();
    const queue = [];
    let qi = 0;
    let generated = 0;
    let first = null;
    let deadlockStates = 0;
    let violatingStates = 0;
    let stopped = null;
    const initKeys = [];

    function add(st, pred, depth) {
      const fp = st.fingerprint();
      if (seen.has(fp)) return { idx: seen.get(fp), isNew: false };
      const key = canonState(st);
      const idx = nodes.length;
      seen.set(fp, idx);
      exactKeys.add(key);
      nodes.push({ fp, key, depth, pred });
      states.push(st);
      return { idx, isNew: true };
    }
    function trace(idx) {
      const out = [];
      for (let i = idx; i !== null && i !== undefined; i = nodes[i].pred) out.push(i);
      return out.reverse();
    }
    function event(kind, idx, extra) {
      if (first) return;
      first = Object.assign({ kind, distinct: nodes.length, depth: nodes[idx].depth, traceStates: trace(idx).length, ms: now() - t0 }, extra || {});
      first.traceKeys = trace(idx).map((i) => nodes[i].key);
    }

    for (const st of init) {
      generated++;
      const r = add(st, null, 1);
      if (r.isNew) {
        initKeys.push(nodes[r.idx].key);
        const bad = firstViolated(env, st);
        if (bad) { violatingStates++; event('violated', r.idx, { invariant: bad }); }
        queue.push(r.idx);
      }
    }
    while (qi < queue.length) {
      if (nodes.length >= maxStates) { stopped = 'bound'; break; }
      if (opts.wallMs && now() - t0 > opts.wallMs) { stopped = 'wall'; break; }
      const idx = queue[qi++];
      const st = states[idx];
      const succ = successorsWhole(env, st).map((s) => ({ state: s }));
      if (succ.length === 0) {
        deadlockStates++;
        if (opts.deadlockCheck) event('deadlock', idx);
      }
      for (const s of succ) {
        generated++;
        const r = add(s.state, idx, nodes[idx].depth + 1);
        if (r.isNew) {
          const bad = firstViolated(env, s.state);
          if (bad) { violatingStates++; event('violated', r.idx, { invariant: bad }); }
          queue.push(r.idx);
        }
      }
    }
    const t1 = now();
    let depth = 0;
    for (const n of nodes) if (n.depth > depth) depth = n.depth;
    return {
      initStates: initKeys.length,
      distinct: nodes.length,
      distinctExact: exactKeys.size,
      generated,
      depth,
      deadlockStates,
      violatingStates,
      first,
      stopped,
      complete: !stopped,
      initMs: tInit - t0,
      ms: t1 - t0,
      statesPerSec: nodes.length / ((t1 - t0) / 1000),
      graph: keepGraph ? { keys: nodes.map((n) => n.key), initKeys } : null
    };
  }

  // Spectacle's own checker, unchanged (TlaInterpreter.computeReachableStates):
  // it hard-codes the definitions Init and Next, checks the invariant on
  // successor states only, and has no deadlock check.
  function nativeCheck(env, invExpr) {
    if (env.job.init !== 'Init' || env.job.next !== 'Next') {
      return { applicable: false, reason: 'computeReachableStates ignores the configured names and uses Init and Next; this spec uses INIT ' + env.job.init + ' and NEXT ' + env.job.next };
    }
    const t0 = now();
    try {
      const r = env.interp.computeReachableStates(env.spec.spec_obj, env.consts, invExpr, env.spec);
      return {
        applicable: true,
        invHolds: r.invHolds,
        numStatesExplored: r.numStatesExplored,
        hashTraceLength: r.hashTrace ? r.hashTrace.length : null,
        reachable: r.invHolds ? r.states.length : null,
        ms: now() - t0
      };
    } catch (e) {
      return { applicable: true, error: String(e && e.message ? e.message : e), ms: now() - t0 };
    }
  }

  // ---------------------------------------------------------------------
  // State-pair check: is (s, t) a step of Next, a stuttering step, or neither?
  // Successors are enumerated from s, so s may be any state, reachable or not.
  // ---------------------------------------------------------------------
  function pairCheck(env, s, t) {
    const tk = canonState(t);
    const sk = canonState(s);
    const succ = successorsByAction(env, s);
    const actions = [];
    for (const x of succ) if (canonState(x.state) === tk) actions.push(x.action);
    return { step: actions.length > 0, stutter: sk === tk, actions: Array.from(new Set(actions)) };
  }

  // Compare against TLC's complete state graph (from -dump dot,actionlabels):
  // every TLC state is rebuilt in Spectacle from TLC's own formula, and its
  // Spectacle successors are compared with TLC's edges. This checks every TLC
  // edge as an accepted state pair, finds extra successors, and checks a
  // deterministic sample of non-edges as rejected pairs.
  function graphCheck(env, tlcGraph, explored, opts) {
    const t0 = now();
    const n = tlcGraph.nodes.length;
    const tStates = new Array(n);
    const tKeys = new Array(n);
    for (let i = 0; i < n; i++) {
      tStates[i] = stateFromFormula(env, tlcGraph.nodes[i]);
      tKeys[i] = canonState(tStates[i]);
    }
    const tKeySet = new Set(tKeys);
    const sKeySet = new Set(explored.graph.keys);
    const missingInSpectacle = tKeys.filter((k) => !sKeySet.has(k)).length;
    const extraInSpectacle = explored.graph.keys.filter((k) => !tKeySet.has(k)).length;
    const tInit = new Set(tlcGraph.init.map((i) => tKeys[i]));
    const sInit = new Set(explored.graph.initKeys);
    const initEqual = tInit.size === sInit.size && Array.from(tInit).every((k) => sInit.has(k));

    // TLC successors per node.
    const tSucc = new Array(n);
    for (let i = 0; i < n; i++) tSucc[i] = new Map();
    for (const [a, b, label] of tlcGraph.edges) {
      const m = tSucc[a];
      const k = tKeys[b];
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(label);
    }

    let tlcEdges = 0, accepted = 0, rejectedTlcEdge = 0, extraEdges = 0;
    let labelComparable = 0, labelAgree = 0;
    let pairMs = 0;
    const sSuccKeys = new Array(n);
    const mismatches = [];
    for (let i = 0; i < n; i++) {
      const p0 = now();
      const succ = successorsByAction(env, tStates[i]);
      pairMs += now() - p0;
      const sm = new Map();
      for (const x of succ) {
        const k = canonState(x.state);
        if (!sm.has(k)) sm.set(k, new Set());
        sm.get(k).add(x.action);
      }
      sSuccKeys[i] = sm;
      for (const [k, labels] of tSucc[i]) {
        tlcEdges++;
        if (sm.has(k)) {
          accepted++;
          for (const l of labels) {
            if (l === 'Next' || l === env.job.next) continue;
            labelComparable++;
            const ops = Array.from(sm.get(k)).map(opName);
            if (ops.includes(l)) labelAgree++;
          }
        } else {
          rejectedTlcEdge++;
          if (mismatches.length < 5) mismatches.push({ kind: 'tlc-edge-rejected', from: i, toKey: k });
        }
      }
      for (const k of sm.keys()) {
        if (!tSucc[i].has(k)) {
          extraEdges++;
          if (mismatches.length < 5) mismatches.push({ kind: 'extra-successor', from: i, toKey: k });
        }
      }
    }

    // Negative pairs: (i, j) with j neither a TLC successor of i nor i itself.
    const sampleMax = opts.negativeSample || 400;
    let negTested = 0, negRejected = 0;
    if (n > 1) {
      const stride = Math.max(1, Math.floor((n * n) / sampleMax));
      for (let x = 0; x < n * n && negTested < sampleMax; x += stride) {
        const i = Math.floor(x / n), j = (x * 7919 + 13) % n;
        if (i === j || tSucc[i].has(tKeys[j]) || tKeys[i] === tKeys[j]) continue;
        negTested++;
        if (!sSuccKeys[i].has(tKeys[j])) negRejected++;
        else if (mismatches.length < 5) mismatches.push({ kind: 'non-edge-accepted', from: i, to: j });
      }
    }
    // Stuttering pairs: (i, i) is always allowed by [Next]_vars.
    let selfLoopsTlc = 0, selfLoopsSpectacle = 0;
    for (let i = 0; i < n; i++) {
      if (tSucc[i].has(tKeys[i])) selfLoopsTlc++;
      if (sSuccKeys[i].has(tKeys[i])) selfLoopsSpectacle++;
    }
    return {
      tlcStates: n,
      missingInSpectacle,
      extraInSpectacle,
      initEqual,
      tlcEdges,
      accepted,
      rejectedTlcEdge,
      extraEdges,
      labelComparable,
      labelAgree,
      negTested,
      negRejected,
      selfLoopsTlc,
      selfLoopsSpectacle,
      graphEqual: missingInSpectacle === 0 && extraInSpectacle === 0 && initEqual && rejectedTlcEdge === 0 && extraEdges === 0,
      meanPairCheckMs: n ? pairMs / n : null,
      ms: now() - t0,
      mismatches,
      tKeys
    };
  }

  // Replay a TLC counterexample (text trace) step by step with the state-pair
  // check, then replay a mutant with one state removed and compare the verdict
  // on the new pair with TLC's graph when one is available.
  function traceCheck(env, tr, initKeySet, tlcGraph, tKeys) {
    const t0 = now();
    const sts = tr.states.map((f) => stateFromFormula(env, f));
    const keys = sts.map(canonState);
    const firstIsInit = initKeySet ? initKeySet.has(keys[0]) : null;
    const steps = [];
    for (let i = 0; i + 1 < sts.length; i++) {
      const r = pairCheck(env, sts[i], sts[i + 1]);
      steps.push({ i, step: r.step, stutter: r.stutter, actions: r.actions, tlcLabel: tr.labels[i + 1] || null });
    }
    let lasso = null;
    if (tr.backTo) {
      const r = pairCheck(env, sts[sts.length - 1], sts[tr.backTo - 1]);
      lasso = { backTo: tr.backTo, step: r.step, actions: r.actions };
    }
    let stutterEnd = null;
    if (tr.stutterEnd) stutterEnd = { stutter: true, note: 'TLC ends the lasso with stuttering; [Next]_vars allows it by definition' };
    let mutant = null;
    if (sts.length >= 3) {
      const m = Math.floor(sts.length / 2);
      const r = pairCheck(env, sts[m - 1], sts[m + 1]);
      let tlcTruth = null;
      if (tlcGraph && tKeys) {
        const ia = tKeys.indexOf(keys[m - 1]);
        const ib = keys[m + 1];
        if (ia >= 0) tlcTruth = tlcGraph.edges.some(([a, b]) => a === ia && tKeys[b] === ib) || keys[m - 1] === ib;
      }
      mutant = { removedState: m + 1, spectacleStep: r.step || r.stutter, tlcStep: tlcTruth, agree: tlcTruth === null ? null : (r.step || r.stutter) === tlcTruth };
    }
    const allAccepted = steps.every((s) => s.step || s.stutter) && (!lasso || lasso.step);
    let labelComparable = 0, labelAgree = 0;
    for (const s of steps) {
      if (!s.tlcLabel || s.tlcLabel === 'Next' || s.tlcLabel === env.job.next) continue;
      labelComparable++;
      if (s.actions.map(opName).includes(s.tlcLabel)) labelAgree++;
    }
    return { name: tr.name, states: sts.length, firstIsInit, allAccepted, steps: steps.length, labelComparable, labelAgree, lasso, stutterEnd, mutant, ms: now() - t0 };
  }

  // Pairs whose source state may be unreachable (a counterexample to induction).
  // TLC's ground truth comes from a run whose INIT is the source state: the
  // pair is a step exactly when the target is a successor of that state.
  function explicitPairs(env, pairs) {
    const out = [];
    for (const p of pairs || []) {
      const t0 = now();
      try {
        const s = stateFromFormula(env, p.from), t = stateFromFormula(env, p.to);
        const r = pairCheck(env, s, t);
        let tlcStep = null, tlcFromIsInit = null;
        if (p.tlcGraph) {
          const g = p.tlcGraph;
          const keys = g.nodes.map((f) => canonState(stateFromFormula(env, f)));
          const i0 = keys.indexOf(canonState(s));
          const tk = canonState(t);
          tlcFromIsInit = g.init.includes(i0);
          tlcStep = i0 >= 0 && g.edges.some(([a, b]) => a === i0 && keys[b] === tk);
        }
        out.push({ name: p.name, step: r.step, stutter: r.stutter, actions: r.actions, tlcStep, tlcFromIsInit, agree: tlcStep === null ? null : r.step === tlcStep, ms: now() - t0 });
      } catch (e) {
        out.push({ name: p.name, error: String(e && e.message ? e.message : e) });
      }
    }
    return out;
  }

  // Evaluate a temporal or action formula as if it were an invariant, to record
  // what Spectacle does with it (it must not silently report "holds").
  function temporalProbe(env, exprName) {
    try {
      const init = env.interp.computeInitStates(env.spec.spec_obj, env.consts, false, env.spec, env.job.init);
      const ctx = new Context(null, init[0], env.spec.spec_obj['op_defs'], {}, env.consts);
      ctx['defns_curr_context'] = Object.keys(env.spec.spec_obj['op_defs']);
      ctx.setGlobalDefTable(env.spec.globalDefTable);
      ctx.setSpecObj(env.spec);
      const v = evalExpr(parseExprToNode(exprName), ctx)[0]['val'];
      return { expr: exprName, outcome: 'value', value: v && v.toString ? v.toString() : String(v) };
    } catch (e) {
      return { expr: exprName, outcome: 'error', error: String(e && e.message ? e.message : e).slice(0, 300) };
    }
  }

  // ---------------------------------------------------------------------
  // Operator inventory, from the tree-sitter parse of every module the job
  // carries. Constructs inside definitions reachable from INIT, NEXT and the
  // checked invariants are the ones Spectacle evaluates; the rest (Spec,
  // fairness, temporal properties) are only parsed.
  // ---------------------------------------------------------------------
  const TAGS = {
    bounded_quantification: null, unbounded_quantification: 'unbounded \\E/\\A', choose: 'CHOOSE',
    set_filter: '{x \\in S : P}', set_map: '{e : x \\in S}', function_literal: '[x \\in S |-> e]',
    set_of_functions: '[S -> T]', record_literal: '[f |-> e]', set_of_records: '[f : S]', record_value: 'r.f',
    function_evaluation: 'f[x]', except: 'EXCEPT', prev_func_val: '@', tuple_literal: '<<...>>',
    finite_set_literal: '{a, b}', if_then_else: 'IF THEN ELSE', case: 'CASE', other_arm: 'OTHER',
    let_in: 'LET IN', recursive_declaration: 'RECURSIVE', lambda: 'LAMBDA', instance: 'INSTANCE',
    nat_number_set: 'Nat', int_number_set: 'Int', boolean_set: 'BOOLEAN', string_set: 'STRING',
    step_expr_or_stutter: '[A]_v', step_expr_no_stutter: '<<A>>_v', fairness: 'WF_/SF_',
    conj_list: 'bulleted /\\ list', disj_list: 'bulleted \\/ list', function_definition: 'f[x \\in S] ==',
    operator_definition: null
  };
  const SYM = {
    in: '\\in', notin: '\\notin', cup: '\\cup', cap: '\\cap', setminus: '\\ (set minus)', subseteq: '\\subseteq',
    dots_2: '..', plus: '+', minus: '-', mul: '*', mod: '%', div: '\\div', eq: '=', neq: '/=', lt: '<', leq: '=<',
    gt: '>', geq: '>=', land: '/\\', lor: '\\/', implies: '=>', equiv: '<=>', leads_to: '~>', lnot: '~',
    unchanged: 'UNCHANGED', always: '[]', eventually: '<>', powerset: 'SUBSET', domain: 'DOMAIN', enabled: 'ENABLED',
    prime: "'", map_to: ':>', compose: '@@', concat: '\\o', circ: '\\o', negative: '- (prefix)', union: 'UNION'
  };
  const SKIP = new Set(['comment', 'block_comment', 'pcal_algorithm', 'extramodular_text']);
  function inventory(job) {
    const defs = {}; // name -> {constructs:Set, refs:Set}
    const extendsList = [];
    for (const name of Object.keys(job.modules)) {
      const tree = parser.parse(job.modules[name] + '\n');
      const walkDef = (node, acc) => {
        if (SKIP.has(node.type)) return;
        if (node.isNamed()) {
          if (node.type === 'identifier_ref') acc.refs.add(node.text);
          if (node.type === 'bound_op') {
            const n0 = node.namedChildren[0];
            if (n0) acc.refs.add(n0.text), acc.apps.add(n0.text);
          }
          if (node.type === 'bounded_quantification') {
            const q = node.namedChildren[0];
            acc.constructs.add(q && q.type === 'forall' ? '\\A x \\in S' : '\\E x \\in S');
          } else if (node.type === 'bound_infix_op' || node.type === 'bound_prefix_op' || node.type === 'bound_postfix_op') {
            const sym = node.childForFieldName('symbol');
            if (sym) acc.constructs.add(SYM[sym.type] || sym.type);
          } else if (TAGS[node.type]) acc.constructs.add(TAGS[node.type]);
        }
        for (let i = 0; i < node.childCount; i++) walkDef(node.child(i), acc);
      };
      const root = tree.rootNode;
      const visit = (node) => {
        if (SKIP.has(node.type)) return;
        if (node.type === 'extends') for (const c of node.namedChildren) extendsList.push(c.text);
        if (node.type === 'operator_definition' || node.type === 'function_definition') {
          const nm = node.childForFieldName('name') || node.namedChildren[0];
          const acc = { constructs: new Set(), refs: new Set(), apps: new Set() };
          walkDef(node, acc);
          if (node.type === 'function_definition') acc.constructs.add(TAGS.function_definition);
          defs[nm.text] = acc;
          return;
        }
        for (let i = 0; i < node.childCount; i++) visit(node.child(i));
      };
      visit(root);
    }
    const roots = [job.init, job.next].concat(job.invariants || []).filter(Boolean);
    const reached = new Set();
    const stack = roots.slice();
    while (stack.length) {
      const d = stack.pop();
      if (reached.has(d) || !defs[d]) continue;
      reached.add(d);
      for (const r of defs[d].refs) if (defs[r] && !reached.has(r)) stack.push(r);
    }
    const evaluated = new Set(), parsedOnly = new Set(), library = new Set();
    for (const [name, d] of Object.entries(defs)) {
      const into = reached.has(name) ? evaluated : parsedOnly;
      for (const c of d.constructs) into.add(c);
      for (const a of d.apps) if (!defs[a]) library.add(a);
    }
    // A reachable definition that refers to itself is a RECURSIVE operator.
    for (const n of reached) if (defs[n].refs.has(n)) evaluated.add('RECURSIVE');
    for (const c of evaluated) parsedOnly.delete(c);
    const stdModules = ['TLC', 'TLCExt', 'FiniteSets', 'Sequences', 'Integers', 'Bags', 'Naturals', 'Reals', 'Randomization'];
    return {
      extends: Array.from(new Set(extendsList)),
      localExtends: Array.from(new Set(extendsList.filter((m) => !stdModules.includes(m) && Object.prototype.hasOwnProperty.call(job.modules, m)))),
      unresolvedExtends: Array.from(new Set(extendsList.filter((m) => !stdModules.includes(m) && !Object.prototype.hasOwnProperty.call(job.modules, m)))),
      evaluated: Array.from(evaluated).sort(),
      parsedOnly: Array.from(parsedOnly).sort(),
      libraryOperators: Array.from(library).sort(),
      reachedDefinitions: reached.size
    };
  }

  // ---------------------------------------------------------------------
  // One job.
  // ---------------------------------------------------------------------
  async function runJob(job, opts) {
    opts = opts || {};
    const result = { id: job.id, mode: opts.mode, ok: false, errors: [] };
    const requestLog = [];
    silence();
    try {
      try { result.inventory = inventory(job); } catch (e) { result.inventory = { error: String(e && e.message ? e.message : e) }; }
      let parsed;
      try {
        parsed = await parseSpec(job, opts.mode || 'fetch', requestLog);
      } catch (e) {
        result.parse = { ok: false, error: String(e && e.message !== undefined ? e.message : e).slice(0, 400) };
        result.shimRequests = requestLog;
        return result;
      }
      result.parse = { ok: true, ms: parsed.ms, modulesResolved: parsed.modulesResolved };
      if (opts.mode === 'shim') result.shimRequests = requestLog;
      if (job.parseOnly) { result.ok = true; return result; }

      const c0 = now();
      const consts = evalConstants(parsed.spec, job.constants || {});
      result.constantsMs = now() - c0;
      const env = makeEnv(parsed.spec, consts, job);
      result.actions = env.actions.map((a) => a.name);

      for (const p of job.temporalProbes || []) {
        (result.temporalProbes = result.temporalProbes || []).push(temporalProbe(env, p));
      }

      const keepGraph = !!job.graph && !opts.skipGraph;
      const ex = explore(env, { deadlockCheck: !!job.deadlockCheck, maxStates: opts.maxStates || job.maxStates, wallMs: opts.wallMs, keepGraph });
      result.explore = Object.assign({}, ex, { graph: undefined });
      if (ex.first) result.explore.first = Object.assign({}, ex.first, { traceKeys: undefined });

      if (opts.native && !job.skipNative) {
        const invExpr = (job.invariants && job.invariants.length) ? job.invariants.map((x) => '(' + x + ')').join(' /\\ ') : undefined;
        result.native = nativeCheck(env, invExpr);
        if (result.native.applicable && invExpr) result.nativeFull = nativeCheck(env, undefined);
      }

      if (keepGraph && ex.complete) {
        const gc = graphCheck(env, job.graph, ex, { negativeSample: job.negativeSample });
        result.pairs = Object.assign({}, gc, { tKeys: undefined, mismatches: gc.mismatches });
        const initSet = new Set(ex.graph.initKeys);
        result.traces = (job.traces || []).map((tr) => traceCheck(env, tr, initSet, job.graph, gc.tKeys));
      } else if (job.traces && job.traces.length) {
        result.traces = job.traces.map((tr) => traceCheck(env, tr, null, null, null));
      }
      if (job.pairs && job.pairs.length) result.explicitPairs = explicitPairs(env, job.pairs);
      result.ok = true;
    } catch (e) {
      // Message first: in Firefox and WebKit, e.stack holds only the frames.
      const msg = e && e.message !== undefined ? (e.name || 'Error') + ': ' + e.message : String(e);
      result.errors.push((msg + (e && e.stack ? '\n' + e.stack : '')).slice(0, 800));
    } finally {
      unsilence();
    }
    return result;
  }

  // Raw fingerprint behaviour on n distinct states built directly from values.
  function fingerprintProbe(nx, ny) {
    const t0 = now();
    const fps = new Set();
    for (let x = 0; x < nx; x++) {
      for (let y = 0; y < ny; y++) {
        fps.add(new TLAState({ x: new IntValue(x), y: new IntValue(y) }).fingerprint());
      }
    }
    const n = nx * ny;
    return { states: n, distinctFingerprints: fps.size, collisions: n - fps.size, uniform32Expected: (n * (n - 1)) / 2 / 4294967296, ms: now() - t0 };
  }

  return { initParser, runJob, fingerprintProbe, canonState, setQuiet: (q) => { quiet = q; } };
})();

// node z3_wasm.mjs <path-to-node_modules-dir>
import { createRequire } from 'node:module';
const require = createRequire(process.argv[2] + '/');
const { init, killThreads } = require('z3-solver');

const api = await init();
const { Z3, Context } = api;
console.log('wasm Z3 version:', Z3.get_full_version ? Z3.get_full_version() : JSON.stringify(Z3.get_version()));

const { Solver, Int } = new Context('main');
const [a, b, amount] = [Int.const('a'), Int.const('b'), Int.const('amount')];
let s = new Solver();
s.add(a.ge(0), b.ge(0), amount.gt(0), a.sub(amount).lt(0));
let r = await s.check();
console.log('[starter]', r, r === 'sat' ? s.model().sexpr().replace(/\s+/g, ' ') : '');

// Fermat n=3 with a 3 s timeout: does the wasm timeout fire and what reason is reported?
const [x, y, z] = [Int.const('x'), Int.const('y'), Int.const('z')];
s = new Solver();
s.set('timeout', 3000);
s.add(x.gt(0), y.gt(0), z.gt(0), x.mul(x).mul(x).add(y.mul(y).mul(y)).eq(z.mul(z).mul(z)));
let t0 = Date.now();
r = await s.check();
console.log('[fermat3, timeout 3000]', r, ((Date.now() - t0) / 1000).toFixed(2) + 's', 'reason=' + s.reasonUnknown());

// SMT-LIB path (what a VC generator would emit)
const out = await Z3.eval_smtlib2_string(new Z3.mk_context ? Z3.mk_context(Z3.mk_config()) : null,
  '(declare-const p Int)(declare-const q Int)(assert (> q 1))(assert (= (^ p q) 8))(check-sat)(get-info :reason-unknown)').catch(e => 'ERR ' + e);
console.log('[smtlib x^y=8]', String(out).replace(/\s+/g, ' '));

await killThreads(api.em);

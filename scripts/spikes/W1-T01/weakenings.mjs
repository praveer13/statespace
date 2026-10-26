// Weakenings of GATE-stamps' and GATE-codes' rules, for `mutate.mjs mutate --mutants scripts/spikes/W1-T01/weakenings.mjs
// --listed-only`: each [name, gate, [[from, to], …]] removes or narrows one rule, as a reviewer would to test the
// self-check. Every one must leave a planted fault missed. The first group is the verifier's list from the W1 repair
// round (adapted where the code moved), the rest the rules that round's findings added.

export default [
  // ---------------------------------------------------------------- GATE-codes
  ['codes: drop "safe" from the status words', 'codes', [
    ['const STATUS_RE = /\\b(verified|correct|safe|proven|guaranteed)\\b/gi', 'const STATUS_RE = /\\b(verified|correct|proven|guaranteed)\\b/gi'],
    ['const STATUS_WORD = /^(?:verified|correct|safe|proven|guaranteed)$/i', 'const STATUS_WORD = /^(?:verified|correct|proven|guaranteed)$/i'],
  ]],
  ['codes: drop the allow-list comparisons with the spine and packages/stamps', 'codes', [
    ['if (JSON.stringify(spineCodes) !== JSON.stringify([...stampCodes])) fail(', 'if (false) fail('],
    ['if (JSON.stringify(spineTags) !== JSON.stringify([...tagCodes])) fail(', 'if (false) fail('],
    ['for (const c of stampCodes) if (tagCodes.has(c)) fail(', 'for (const c of stampCodes) if (false) fail('],
  ]],
  ['codes: drop only the disjointness of the two sets', 'codes', [['for (const c of stampCodes) if (tagCodes.has(c)) fail(', 'for (const c of stampCodes) if (false) fail(']]],
  ["codes: drop only the comparison with the spine's tags", 'codes', [['if (JSON.stringify(spineTags) !== JSON.stringify([...tagCodes])) fail(', 'if (false) fail(']]],
  ['codes: skip JSON files', 'codes', [['for (const u of jsonUnits(text)) {', 'for (const u of []) {']]],
  ['codes: skip YAML block scalars', 'codes', [["if (BLOCK_SCALAR.test(value)) scalarAt = col\n        start(line, BLOCK_SCALAR.test(value) ? '' : value)", "if (BLOCK_SCALAR.test(value)) { scalarAt = col; flush(); return }\n        start(line, value)"]]],
  ['codes: drop "settled" from the learner states', 'codes', [['const STATE_RE = /(?<![\\w-])(signed off|settled|kept|mounted|parked)', 'const STATE_RE = /(?<![\\w-])(signed off|kept|mounted|parked)']]],
  ['codes: learner states only in lower case', 'codes', [['parked)\\s*\\[(?:P|M|T|E|C|A|\\?|N|R)\\]/gi', 'parked)\\s*\\[(?:P|M|T|E|C|A|\\?|N|R)\\]/g']]],
  ["codes: drop the wrong-code pair check", 'codes', [['for (const m of masked.matchAll(PAIR_RE)) if (CODE_OF[m[1]] !== m[2]) out.push', 'for (const m of masked.matchAll(PAIR_RE)) if (false) out.push']]],
  ['codes: drop apps/instruments/src', 'codes', [["const SOURCE_ROOTS = ['apps/site/src', 'apps/instruments/src']", "const SOURCE_ROOTS = ['apps/site/src']"]]],
  ['codes: drop labs/README.md and labs/template/ from learner copy', 'codes', [[', /^labs\\/README\\.md$/, /^labs\\/template\\//', '']]],
  ['codes: skip Markdown headings', 'codes', [["if (b.kind === 'heading' || b.kind === 'title') {\n      units.push({ text: b.text, offset: 0, lineOf: b.lineOf, evaluated: false })\n      continue\n    }", "if (b.kind === 'heading' || b.kind === 'title') continue"]]],
  ['codes: let [X] alone pass as a tag', 'codes', [["return /^RUN-[a-z0-9]+(?:-[a-z0-9]+)*(?:#[\\w.[\\]-]+)?$/.test(first) || evidenceKeys.includes(first)\n  }", "return /^RUN-[a-z0-9]+(?:-[a-z0-9]+)*(?:#[\\w.[\\]-]+)?$/.test(first) || evidenceKeys.includes(first)\n  }\n  if (inner === 'X') return true"]]],
  ['codes: a bare code exempts a sentence from the status rule', 'codes', [["const STAMP_IN_UNIT = new RegExp(`(?:(?<![\\\\w-])(?:${WORD_ALT})\\\\s*)?\\\\[(?:P|M|T|E|C|A|\\\\?|N|R)\\\\]\\\\s*·\\\\s*\\\\S`)", "const STAMP_IN_UNIT = /\\[(?:P|M|T|E|C|A|\\?|N|R)\\]/"]]],
  ["codes: straight single quotes count as quotation marks", 'codes', [["for (const re of [/\"[^\"\\n]*\"/g, /“[^”\\n]*”/g, /‘[^’\\n]*’/g, /«[^»\\n]*»/g])", "for (const re of [/\"[^\"\\n]*\"/g, /'[^'\\n]*'/g, /“[^”\\n]*”/g, /‘[^’\\n]*’/g, /«[^»\\n]*»/g])"]]],
  ['codes: an option-like key holds every value under it', 'codes', [["return EVALUATED_KEYS.has(own) || (own === 'text' && keys.slice(0, -1).some((k) => OPTION_KEYS.has(k)))", "return EVALUATED_KEYS.has(own) || own === 'text'"]]],
  ["codes: drop the HTML page's copy attributes", 'codes', [["const COPY_ATTRS = /^(?:title|alt|aria-label|aria-description|aria-roledescription|placeholder|label)$/i", 'const COPY_ATTRS = /^$/']]],
  ['codes: a known-debt line matches by file and check alone', 'codes', [['const debt = hash !== null && KNOWN_DEBT.some((d) => d.file === file && d.check === f.check && d.sha256 === hash)', 'const debt = KNOWN_DEBT.some((d) => d.file === file && d.check === f.check)']]],

  // ---------------------------------------------------------------- GATE-stamps: the verifier's list, adapted
  ['stamps: drop the grammar check and the package-text check', 'stamps', [
    ["for (const p of stampGrammarProblems(stamp, wordOf)) fail('grammar', where, p)", 'void 0'],
    ['if (S.stampText(stamp) !== stampTextOf(stamp)) fail(', 'if (false) fail('],
  ]],
  ['stamps: call the package\'s own grammar check instead of the gate\'s', 'stamps', [["for (const p of stampGrammarProblems(stamp, wordOf)) fail('grammar', where, p)", "for (const p of S.grammarProblems(stamp.code, stamp.qualifier)) fail('grammar', where, p)"]]],
  ['stamps: drop the buildStrip probes for [P] as primary and supporting', 'stamps', [
    ["if (S.buildStrip({ claim: 'CL-1.1', title: 'gate', requirement: { primary: pStamp } }).ok) fail(", 'if (false) fail('],
    ["if (S.buildStrip({ claim: 'CL-1.1', title: 'gate', requirement: { primary: aStamp, supporting: [pStamp] } }).ok) fail(", 'if (false) fail('],
  ]],
  ["stamps: drop the agent's-claim probe", 'stamps', [["if (S.buildStrip({ claim: 'local', title: 'gate', agent: true, proposition: { primary: pStamp } }).ok) fail(", 'if (false) fail(']]],
  ["stamps: drop the agent quote's UNREVIEWED and no-frame checks", 'stamps', [["if (!m.includes('UNREVIEWED')) fail(", 'if (false) fail('], ['if (/class="stamp[ "]/.test(m)) fail(', 'if (false) fail(']]],
  ['stamps: drop the spoken-name check', 'stamps', [['if (!m.includes(`<span class="visually-hidden">${spoken}</span>`)) fail(', 'if (false) fail(']]],
  ['stamps: drop both stroke-dasharray checks', 'stamps', [
    ["if (d.prop === 'stroke-dasharray' && !/^(none|0)$/.test(d.value) && !allSelectors(rule, inLineScope)) fail(", 'if (false) fail('],
    ['if (/^(strokeDasharray|stroke-dasharray)$/.test(name)) problems.push(', 'if (false) problems.push('],
  ]],
  ['stamps: drop the hand-built object and cast checks', 'stamps', [
    ["if (code && ts.isStringLiteral(code.initializer) && /^\\[(P|M|T|E|C|A|\\?|N|R)\\]$/.test(code.initializer.text) && (names.has('word') || names.has('qualifier'))) problems.push(", 'if (false) problems.push('],
    ['if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && namesStampType(node.type.getText(sf))) problems.push(', 'if (false) problems.push('],
  ]],
  ['stamps: drop the every-row-has-a-fixture check', 'stamps', [['for (const row of S.ALL_ROWS) if (!covered.has(row.key)) fail(', 'for (const row of S.ALL_ROWS) if (false) fail(']]],
  ["stamps: drop section 8.7's vocabulary check", 'stamps', [["if (!spec || spec.word !== word || spec.code !== code.replace(/`/g, '')) fail(", 'if (false) fail('], ['else if (requires !== spec.requires && !requires.startsWith(`${spec.requires}, for example `)) fail(', 'else if (false) fail(']]],
  ['stamps: drop the forced-colors cue checks', 'stamps', [
    ["if (!forcedLight.p.sides.every((s) => s === 'solid:4')) fail(", 'if (false) fail('],
    ["if (forcedLight.q.sides[3] !== 'solid:6') fail(", 'if (false) fail('],
    ["if (forcedLight.r.ring === 'none') fail(", 'if (false) fail('],
  ]],
  ['stamps: drop the font license check', 'stamps', [['if (!fs.existsSync(p) || sha256(fs.readFileSync(p)) !== hash) problems.push(', 'if (false) problems.push(']]],
  ["stamps: drop which-stamp's part check", 'stamps', [['if (f.part !== undefined && !(d.kind === \'stamp\' && d.stamp.qualifier.includes(f.part))) return void', 'if (false) return void']]],
  ['stamps: drop the identifying-stroke contrast check', 'stamps', [["if (r < 3) fail('grayscale'", "if (false) fail('grayscale'"]]],
  ['stamps: lower the text contrast threshold', 'stamps', [["if (worst < 4.5) fail('grayscale'", "if (worst < 4.4) fail('grayscale'"]]],
  ['stamps: lower the stroke contrast threshold', 'stamps', [["if (r < 3) fail('grayscale'", "if (r < 2.9) fail('grayscale'"]]],
  ['stamps: drop the forced-colors collision check', 'stamps', [['for (const [s, cs] of fsigs) if (cs.length > 1) fail(', 'for (const [s, cs] of fsigs) if (false) fail(']]],
  ['stamps: drop the markup hue scan', 'stamps', [["if (hit || /var\\(\\s*--st-/.test(line)) fail('hue'", "if (false) fail('hue'"]]],

  // ---------------------------------------------------------------- GATE-stamps: the rules this round added
  ['stamps: drop the line rule for style properties in scripts', 'stamps', [['if (ts.isPropertyAssignment(node)) drawnLine(nameOf(node.name), node.initializer, node)', '']]],
  ['stamps: drop the line rule for variables named after a style property', 'stamps', [['if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) drawnLine(node.name.text, node.initializer, node)', '']]],
  ["stamps: drop the line rule for assignments to an element's style", 'stamps', [['drawnLine(ts.isPropertyAccessExpression(l) ? l.name.text :', 'void (ts.isPropertyAccessExpression(l) ? l.name.text :']]],
  ['stamps: drop the line rule for setProperty', 'stamps', [["if (method === 'setProperty' && first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) drawnLine(first.text, second, node)", '']]],
  ['stamps: drop the canvas dash pattern rule', 'stamps', [["if (method === 'setLineDash' && !(first && ts.isArrayLiteralExpression(first) && first.elements.length === 0)) problems.push(", 'if (false) problems.push(']]],
  ['stamps: drop the gradient-in-a-string rule', 'stamps', [["if (!ts.isJsxText(node) && /gradient\\(/i.test(s)) problems.push(", 'if (false) problems.push(']]],
  ['stamps: drop the markup line rule', 'stamps', [["for (const p of markupLineProblems(rel, /\\.mdx?$/.test(rel) ? maskMarkdownCode(text) : text)) fail('line', p.where, p.detail)", '']]],
  ['stamps: read only the inline style object, as before this round', 'stamps', [['if (ts.isPropertyAssignment(node)) drawnLine(nameOf(node.name), node.initializer, node)', 'if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.parent) && ts.isJsxExpression(node.parent.parent)) drawnLine(nameOf(node.name), node.initializer, node)']]],
  ['stamps: take the checker from the record, not the configuration that printed the lines', 'stamps', [['const checker = S.checkerOf(engine, holders[0].version)', 'const checker = S.checkerOf(String(run.record.engine), String(run.record.version))']]],
  ['stamps: let configurations of several checkers stand for one', 'stamps', [['if (checkers.size > 1) return { problem: `configurations of', 'if (false) return { problem: `configurations of']]],
  ['stamps: read a cvc5 answer alone', 'stamps', [["if (!/^(?:z3|z3-solver)$/i.test(engine)) {", 'if (false) {']]],
  ['stamps: let a cross-check come from the same solver', 'stamps', [['if (second.name === checker.name) {', 'if (false) {']]],
  ["stamps: compare the records' gathered inputs for sameInput", 'stamps', [['const readers = (holders) => (holders.some((h) => !h.isRecord) ? holders.filter((h) => !h.isRecord) : holders)', 'const readers = (holders) => [...holders, ...holders.flatMap((h) => (h.isRecord ? [] : [{ inputs: [] }]))]']]],
  ["stamps: drop the cross-check's query-name comparison", 'stamps', [['if (ours.size > 0 && named.size > 0 && ![...named].some((n) => ours.has(n))) report(', 'if (false) report(']]],
  ['stamps: drop the rlimit equality', 'stamps', [['if (rlimit !== undefined && rlimit !== ran.value) {', 'if (false) {']]],
  ['stamps: match context numbers as substrings, as before this round', 'stamps', [["const re = new RegExp(`(?<![0-9.])${String(n).replace(/[.]/g, '\\\\.')}(?![0-9.])`)", "const re = new RegExp(String(n).replace(/[.]/g, '\\\\.'))"]]],
  ["stamps: count a record's gathered outputs as its own", 'stamps', [['units.filter((u) => holding(u, !u.isRecord || units.length === 1))', 'units.filter((u) => holding(u, true))']]],
  ['stamps: take the trace version from the record', 'stamps', [['return S.rawFromTraces(inputs, { engine: [...checkers.values()][0], property: rest.property })', 'return S.rawFromTraces(inputs, { engine: S.checkerOf(String(run.record.engine), String(run.record.version)), property: rest.property })']]],

  // ---------------------------------------------------------------- the kinds the W1 repair round 3 adds
  // (1) each list of exemptions widened by one plausible entry, and (2) each exact match that decides a finding turned
  // into a prefix match (the generated entries below), plus the verifiers' round-3 weakenings that these do not repeat.
  ...widenings(),
]

/** One weakening that replaces `from` by `to` in one gate. */
function edit(gate, name, from, to) {
  return [`${gate}: ${name}`, gate, [[from, to]]]
}

function widenings() {
  const codesExempt = "const EXEMPT = ['docs/history/', 'design/canvas/', 'content/pg-catalog/']"
  const codesSkip = "'fixtures', 'generated'])"
  const learner = '/^content\\/(?!governance\\/)/'
  const evaluated = "'says', 'assertion', 'unreviewed'])"
  const nonCopy = 'const NON_COPY_ATTR = /^(?:className|class|id|'
  const codesQuotes = 'for (const re of [/"[^"\\n]*"/g, /“[^”\\n]*”/g, /‘[^’\\n]*’/g, /«[^»\\n]*»/g]) for (const m of text.matchAll(re)) spans.push([m.index, m.index + m[0].length])\n  return spans'
  const isNameEnd = '    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true\n    return false'
  const stampsSkip = "'target', '.lake', '_solutions'])"
  const handExempt = 'const HAND_EXEMPT = [/^packages\\/stamps\\//,'
  const hueExempt = 'export const HUE_EXEMPT = [/^apps\\/site\\/src\\/components\\/(stamp|strip)\\//,'
  const stampScope = "const inStampScope = (cls) => cls.some((c) => /^(stamp|strip)(-|$)/.test(c) || c === 'line-violation' || c === 'line-crack')"
  const vermilionScope = "const inVermilionScope = (cls) => cls.some((c) => c === 'stamp-r' || c === 'line-violation' || c === 'line-crack')"
  const lineScope = "const inLineScope = (cls) => cls.some((c) => c === 'line-assumed' || c === 'line-bounded' || c === 'stamp-a' || c === 'stamp-m')"
  const patternScope = "const inPatternScope = (cls) => cls.some((c) => c === 'stamp-q' || c === 'line-crack')"
  const placement = 'export const PLACEMENT = /^(?:box-sizing|'
  const layout = 'export const LAYOUT = /^(?:display|position|'
  const transient = "const TRANSIENT = new Set(['focus', 'focus-visible', 'focus-within', 'active'])"
  const notOnBox = 'const NOT_ON_THE_BOX = /^(?:selection|'
  const negBefore = "const NEGATION_BEFORE = /\\b(?:never|not|no|nor|cannot|can't|isn't|aren't|without)\\s+(?:(?:a|an|the|one|any)\\s+)?(?:PROVED\\s+)?$/i"
  const negAfter = 'const NEGATION_AFTER = /^\\s*(?:(?:is|are|was)\\s+)?(?:never|not)\\b/i'
  const stampsQuotes = 'for (const re of [/"[^"\\n]*"/g, /“[^”\\n]*”/g, /‘[^’\\n]*’/g, /«[^»\\n]*»/g]) for (const m of text.matchAll(re)) spans.push([m.index, m.index + m[0].length])\n  return [...text.matchAll(P_MARK)]'
  const keys = "const keys = d.kind === 'stamp' ? [S.stampText(d.stamp), S.codeText(d.stamp)] : d.kind === 'modulo' ? [d.text] : [`none (${d.reason})`]"
  return [
    // ---------------------------------------------------------------- GATE-codes: exemption lists widened
    ...['docs/spikes/', 'docs/waves/', 'curriculum/', 'tracker/', 'design/', 'labs/', 'content/drawers/', 'content/stages/'].map((d) => edit('codes', `widen the exempt folders with ${d}`, codesExempt, codesExempt.replace("']", `', '${d}']`))),
    ...['screens', 'drawers', 'audit', 'claims', 'specimens', 'generators', 'template', 'spikes', 'waves', 'instrument', 'S1', 'public'].map((d) => edit('codes', `widen the skipped directories with ${d}`, codesSkip, `'fixtures', 'generated', '${d}'])`)),
    ...['drawers', 'audit', 'claims', 'specimens', 'generators', 'kc', 'assurance', 'registry', 'stages'].map((d) => edit('codes', `widen learner copy's governance exemption with content/${d}/`, learner, `/^content\\/(?!governance\\/|${d}\\/)/`)),
    edit('codes', 'widen the names with "the verified transfer"', 'const NAMES = [/\\bthe verified ledger\\b/gi]', 'const NAMES = [/\\bthe verified ledger\\b/gi, /\\bthe verified transfer\\b/gi]'),
    ...['title', 'body', 'label', 'prompt', 'note', 'explanation', 'description', 'caption', 'heading', 'intro', 'answer', 'message', 'tip', 'hint', 'hints', 'feedback', 'why', 'summary', 'right', 'fix', 'text'].map((k) => edit('codes', `widen the evaluated keys with ${k}`, evaluated, `'says', 'assertion', 'unreviewed', '${k}'])`)),
    edit('codes', 'widen the option keys with hints', "const OPTION_KEYS = new Set(['options', 'distractors', 'distractor', 'choices'])", "const OPTION_KEYS = new Set(['options', 'distractors', 'distractor', 'choices', 'hints'])"),
    ...['title', 'aria-label', 'alt', 'placeholder', 'label', 'value', 'aria-description', 'aria-roledescription', 'aria-valuetext'].map((a) => edit('codes', `widen the non-copy attributes with ${a}`, nonCopy, `const NON_COPY_ATTR = /^(?:${a}|className|class|id|`)),
    edit('codes', 'widen the quotation marks with parentheses', codesQuotes, codesQuotes.replace('/“[^”\\n]*”/g', '/\\([^)\\n]*\\)/g, /“[^”\\n]*”/g')),
    edit('codes', 'widen the quotation marks with square brackets', codesQuotes, codesQuotes.replace('/“[^”\\n]*”/g', '/\\[[^\\]\\n]*\\]/g, /“[^”\\n]*”/g')),
    edit('codes', 'widen the names with return values', isNameEnd, '    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true\n    if (ts.isReturnStatement(p)) return true\n    return false'),
    edit('codes', "widen the names with an array's elements", isNameEnd, '    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true\n    if (ts.isArrayLiteralExpression(p)) return true\n    return false'),
    edit('codes', "widen the names with a parameter's default", isNameEnd, '    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true\n    if (ts.isParameter(p) && p.initializer === node) return true\n    return false'),
    edit('codes', "widen the names with a call's arguments", isNameEnd, '    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true\n    if (ts.isCallExpression(p) && p.arguments.includes(node)) return true\n    return false'),
    edit('codes', "widen the names with a constructor's arguments", isNameEnd, '    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true\n    if (ts.isNewExpression(p)) return true\n    return false'),
    edit('codes', "widen the names with a variable's value", isNameEnd, '    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true\n    if (ts.isVariableDeclaration(p) && p.initializer === node) return true\n    return false'),
    edit('codes', 'widen the names with the branches of ?:', isNameEnd, '    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true\n    if (ts.isConditionalExpression(p) && p.condition !== node) return true\n    return false'),
    edit('codes', 'make a one-word status word copy only when it is capitalized or punctuated', 'if (!(STATUS_WORD.test(s.trim()) || /^\\s*[A-Z]/.test(s) || /[^\\w\\s-]/.test(s))) return', 'if (!(/^\\s*[A-Z]/.test(s) || /[^\\w\\s-]/.test(s))) return'),
    edit('codes', 'widen the names with the operands of || and ??', 'ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword])', 'ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken])'),
    edit('codes', "widen the console exemption to window's calls", "node.expression.expression.text === 'console') return", "(node.expression.expression.text === 'console' || node.expression.expression.text === 'window')) return"),
    edit('codes', 'widen the console exemption to every method call', "if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'console') return", 'if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) return'),
    edit('codes', 'widen the kebab-case names to sentences', 'return /\\s/.test(t.trim()) ? t : t.replace(', 'return t.replace('),
    edit('codes', 'widen what is not copy with emphasis', '  t = t.replace(/https?:\\/\\/[^\\s)>\\]]+/g, blank)', '  t = t.replace(/https?:\\/\\/[^\\s)>\\]]+/g, blank)\n  t = t.replace(/\\*{1,2}[^*\\n]+\\*{1,2}/g, blank)'),
    edit('codes', 'widen what is not copy with raw HTML elements', '  t = t.replace(/https?:\\/\\/[^\\s)>\\]]+/g, blank)', '  t = t.replace(/https?:\\/\\/[^\\s)>\\]]+/g, blank)\n  t = t.replace(/<(\\w+)[^>]*>[^<]*<\\/\\1>/g, blank)'),
    edit('codes', 'widen what is not copy with a flow sequence', '  const flow = /^\\s*[[{]/.test(content)', '  if (/^\\s*\\[/.test(content)) return content.replace(/[^\\n]/g, " ")\n  const flow = /^\\s*[[{]/.test(content)'),
    edit('codes', 'widen the stamps that exempt a sentence to a stamp word alone', "const STAMP_IN_UNIT = new RegExp(`(?:(?<![\\\\w-])(?:${WORD_ALT})\\\\s*)?\\\\[(?:P|M|T|E|C|A|\\\\?|N|R)\\\\]\\\\s*·\\\\s*\\\\S`)", 'const STAMP_IN_UNIT = new RegExp(`(?<![\\\\w-])(?:${WORD_ALT})(?![\\\\w-])`)'),
    // ---------------------------------------------------------------- GATE-codes: exact matches made prefix matches
    edit('codes', 'match the [V], [D], [U] and [KS] tags as a prefix', 'return /^(?:V|D|U|KS)(?:[\\s:,;].*)?$/.test(inner)', 'return /^(?:V|D|U|KS)/.test(inner)'),
    edit('codes', 'match an [X RUN-id] tag as a prefix', 'return /^RUN-[a-z0-9]+(?:-[a-z0-9]+)*(?:#[\\w.[\\]-]+)?$/.test(first) || evidenceKeys.includes(first)', 'return /^RUN-[a-z0-9]+(?:-[a-z0-9]+)*(?:#[\\w.[\\]-]+)?/.test(first) || evidenceKeys.includes(first)'),
    edit('codes', "match an [X key] tag's evidence key as a prefix", 'evidenceKeys.includes(first)', 'evidenceKeys.some((k) => first.startsWith(k))'),
    edit('codes', 'match the evaluated keys as a prefix', 'return EVALUATED_KEYS.has(own) ||', 'return [...EVALUATED_KEYS].some((k) => own.startsWith(k)) ||'),
    edit('codes', 'match the option keys as a prefix', 'keys.slice(0, -1).some((k) => OPTION_KEYS.has(k))', 'keys.slice(0, -1).some((k) => [...OPTION_KEYS].some((o) => k.startsWith(o)))'),
    edit('codes', "drop the apps' own text files", '  const files = [...SCAN.flatMap((s) => walk(root, s, (p) => TEXT_EXT.has(path.extname(p)))), ...appText]', '  const files = SCAN.flatMap((s) => walk(root, s, (p) => TEXT_EXT.has(path.extname(p))))'),
    edit('codes', "widen the apps' text files that are not copy with every Markdown file", 'const APP_TEXT_NOT_COPY = /(?:^|\\/)README\\.md$|\\.generated\\.json$/', 'const APP_TEXT_NOT_COPY = /\\.md$|\\.generated\\.json$/'),
    edit('codes', "widen the apps' text files that are not copy with every JSON file", 'const APP_TEXT_NOT_COPY = /(?:^|\\/)README\\.md$|\\.generated\\.json$/', 'const APP_TEXT_NOT_COPY = /(?:^|\\/)README\\.md$|\\.json$/'),
    edit('codes', 'match the name "the verified ledger" as a prefix', 'const NAMES = [/\\bthe verified ledger\\b/gi]', 'const NAMES = [/\\bthe verified\\b/gi]'),
    // copy a document holds inside quoted syntax: a tag's copy attributes and a link's title
    edit('codes', "drop a Markdown tag's copy attributes and link titles", '    for (const e of embeddedCopy(b.text)) units.push(', '    for (const e of []) units.push('),
    edit('codes', "drop a YAML value's tag attributes", '      for (const e of embeddedCopy(unquoteYaml(b.text))) units.push(', '      for (const e of []) units.push('),
    edit('codes', 'drop link titles', "    if (k !== undefined && /\\S/.test(m[k])) out.push({ text: m[k], offset: m.indices[k][0] })", '    void k'),
    edit('codes', "read only a tag's double-quoted attributes", "      const k = [2, 3, 4, 5].find((g) => a[g] !== undefined)", "      const k = [2].find((g) => a[g] !== undefined)"),

    // ---------------------------------------------------------------- GATE-stamps: exemption lists widened
    ...['screens', 'stages', 'public', 'instruments'].map((d) => edit('stamps', `widen the skipped directories with ${d}`, stampsSkip, `'target', '.lake', '_solutions', '${d}'])`)),
    ...['apps\\/site\\/src\\/components\\/', 'apps\\/instruments\\/', 'packages\\/generators\\/', 'apps\\/site\\/src\\/screens\\/'].map((d) => edit('stamps', `widen the hand check's exempt files with ${d.replace(/\\/g, '')}`, handExempt, `const HAND_EXEMPT = [/^${d}/, /^packages\\/stamps\\//,`)),
    ...['apps\\/instruments\\/', 'apps\\/site\\/src\\/components\\/', 'apps\\/site\\/src\\/screens\\/'].map((d) => edit('stamps', `widen the hue check's exempt files with ${d.replace(/\\/g, '')}`, hueExempt, `export const HUE_EXEMPT = [/^${d}/, /^apps\\/site\\/src\\/components\\/(stamp|strip)\\//,`)),
    edit('stamps', "widen the stamp scope with claim classes", stampScope, stampScope.replace('(stamp|strip)', '(stamp|strip|claim)')),
    edit('stamps', 'widen the stamp scope with any line- class', stampScope, stampScope.replace('(stamp|strip)', '(stamp|strip|line)')),
    edit('stamps', 'widen the stamp scope with any class holding "stamp"', stampScope, stampScope.replace('/^(stamp|strip)(-|$)/.test(c)', '/stamp|^strip(-|$)/.test(c)')),
    edit('stamps', 'widen the vermilion scope with any stamp- class', vermilionScope, vermilionScope.replace("c === 'stamp-r'", '/^stamp-/.test(c)')),
    edit('stamps', 'widen the vermilion scope with strip classes', vermilionScope, vermilionScope.replace("c === 'stamp-r'", "c === 'stamp-r' || /^strip/.test(c)")),
    edit('stamps', 'widen the vermilion scope with any line- class', vermilionScope, vermilionScope.replace("c === 'stamp-r'", "c === 'stamp-r' || /^line-/.test(c)")),
    edit('stamps', 'widen the line scope with any line- class', lineScope, lineScope.replace("c === 'line-assumed' || c === 'line-bounded'", '/^line-/.test(c)')),
    edit('stamps', 'widen the line scope with any stamp- class', lineScope, lineScope.replace("c === 'stamp-a' || c === 'stamp-m'", '/^stamp-/.test(c)')),
    edit('stamps', 'widen the line scope with strip classes', lineScope, lineScope.replace("c === 'stamp-m'", "c === 'stamp-m' || /^strip/.test(c)")),
    edit('stamps', 'widen the pattern scope with any stamp class', patternScope, patternScope.replace("c === 'stamp-q'", '/^stamp/.test(c)')),
    edit('stamps', 'widen the pattern scope with strip classes', patternScope, patternScope.replace("c === 'stamp-q'", "c === 'stamp-q' || /^strip/.test(c)")),
    edit('stamps', 'widen the pattern scope with any line- class', patternScope, patternScope.replace("c === 'line-crack'", '/^line-/.test(c)')),
    ...['visibility', 'transform', 'letter-spacing', 'text-indent', 'clip', 'content', 'text-transform', 'font-family', 'font-weight', 'filter', 'display', 'width', 'opacity', 'font-size', 'color'].map((prop) => edit('stamps', `widen placement with ${prop}`, placement, `export const PLACEMENT = /^(?:${prop}|box-sizing|`)),
    ...['visibility', 'overflow', 'opacity', 'transform', 'content', 'clip', 'font-size', 'content-visibility'].map((prop) => edit('stamps', `widen layout with ${prop}`, layout, `export const LAYOUT = /^(?:${prop}|display|position|`)),
    edit('stamps', 'drop display: none from what hides a stamp', 'const HIDES = { display: /^none$/ }', 'const HIDES = {}'),
    edit('stamps', 'widen the resets with visibility: hidden', "if (prop === 'visibility' || prop === 'content-visibility') return /^(?:visible|auto|", "if (prop === 'visibility' || prop === 'content-visibility') return /^(?:visible|hidden|collapse|auto|"),
    edit('stamps', 'widen the resets with any forced-color-adjust', "if (prop === 'forced-color-adjust') return v === 'auto'", "if (prop === 'forced-color-adjust') return true"),
    edit('stamps', 'widen the properties that change no signature with border widths', 'const NO_SIGNATURE = /^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$|', 'const NO_SIGNATURE = /^border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius$|^border-(?:top|right|bottom|left)-width$|'),
    ...['hover', 'disabled', 'checked'].map((s) => edit('stamps', `widen the passing states with :${s}`, transient, transient.replace("'active'])", `'active', '${s}'])`))),
    ...['before', 'after'].map((s) => edit('stamps', `widen the pseudo-elements that draw on no box with ::${s}`, notOnBox, `const NOT_ON_THE_BOX = /^(?:${s}|selection|`)),
    edit('stamps', 'widen the negations before a [P] with "is"', negBefore, negBefore.replace('without)', 'without|is)')),
    edit('stamps', 'widen the negations before a [P] to any earlier on the line', negBefore, "const NEGATION_BEFORE = /\\b(?:never|not|no|nor|cannot|can't|isn't|aren't|without)\\b/i"),
    edit('stamps', 'widen the negations after a [P] to any later on the line', negAfter, 'const NEGATION_AFTER = /\\b(?:never|not)\\b/i'),
    edit('stamps', 'widen the quotation marks with parentheses', stampsQuotes, stampsQuotes.replace('/“[^”\\n]*”/g', '/\\([^)\\n]*\\)/g, /“[^”\\n]*”/g')),
    edit('stamps', 'widen the quotation marks with straight single quotes', stampsQuotes, stampsQuotes.replace('/“[^”\\n]*”/g', "/'[^'\\n]*'/g, /“[^”\\n]*”/g")),
    edit('stamps', 'widen the which-stamp keys with the bare code', keys, keys.replace('S.codeText(d.stamp)]', 'S.codeText(d.stamp), d.stamp.code]')),
    edit('stamps', 'widen the which-stamp keys with the word and code', keys, keys.replace('S.codeText(d.stamp)]', 'S.codeText(d.stamp), `${d.stamp.word} ${d.stamp.code}`]')),
    ...['lane', 'source', 'row', 'code', 'word', 'qualifier', 'defeaters'].map((f) => edit('stamps', `narrow the stamp fields a copy may not change by ${f}`, "export const STAMP_FIELDS = ['code', 'word', 'qualifier', 'lane', 'defeaters', 'row', 'source']", `export const STAMP_FIELDS = ${JSON.stringify(['code', 'word', 'qualifier', 'lane', 'defeaters', 'row', 'source'].filter((x) => x !== f)).replace(/"/g, "'").replace(/,/g, ', ')}`)),
    edit('stamps', 'name a stamp only by the exact name stamp', 'if (ts.isIdentifier(n)) return STAMP_NAME.test(n.text)', "if (ts.isIdentifier(n)) return n.text === 'stamp'"),
    edit('stamps', "drop the Stamp type's import aliases", 'if ((el.propertyName ?? el.name).text === \'Stamp\') typeNames.add(el.name.text)', 'void el'),
    edit('stamps', 'drop the stamp attribute and property as stamp positions', "if (ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent)) return /^stamps?$/.test(p.parent.name.getText(sf))", 'if (ts.isJsxExpression(p)) return false'),
    edit('stamps', 'drop the stamp property as a stamp position', "if (ts.isPropertyAssignment(p) && p.initializer === n) return /^stamps?$/.test(propName(p.name) ?? '')", 'if (ts.isPropertyAssignment(p) && p.initializer === n) return false'),
    edit('stamps', 'drop a declared type as a stamp position', 'if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isPropertyDeclaration(p)) && p.initializer === n) return !!p.type && namesStampType(p.type.getText(sf))', 'if ((ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isPropertyDeclaration(p)) && p.initializer === n) return false'),
    edit('stamps', 'drop satisfies as a stamp position', 'if (ts.isSatisfiesExpression?.(p)) return namesStampType(p.type.getText(sf))', 'if (ts.isSatisfiesExpression?.(p)) return false'),
    edit('stamps', "drop a function's return type as a stamp position", 'return !!fn?.type && namesStampType(fn.type.getText(sf))', 'return false'),
    edit('stamps', 'drop the fields only a stamp has', "const own = set.has('qualifier') || set.has('defeaters') || literal('code', STAMP_CODE_LITERAL) || literal('word', STAMP_WORD_LITERAL)", "const own = literal('code', STAMP_CODE_LITERAL) || literal('word', STAMP_WORD_LITERAL)"),
    edit('stamps', 'drop the stamp code and word literals', "const own = set.has('qualifier') || set.has('defeaters') || literal('code', STAMP_CODE_LITERAL) || literal('word', STAMP_WORD_LITERAL)", "const own = set.has('qualifier') || set.has('defeaters')"),
    edit('stamps', 'drop Object.assign', "node.expression.expression.text === 'Object' && node.expression.name.text === 'assign'", 'false'),
    edit('stamps', 'drop the cast check alone', 'if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && namesStampType(node.type.getText(sf))) problems.push(', 'if (false) problems.push('),
    edit('stamps', 'drop JSON.parse typed as a stamp', "node.expression.expression.text === 'JSON' && node.expression.name.text === 'parse' && inStampPosition(node)", 'false'),
    edit('stamps', "match tokens.css's token blocks as a prefix: any rule whose selector starts with :root", "export const ROOT_BLOCK = /^:root(?:\\[[^\\]]*\\]|:not\\([^()]*\\))*$/", 'export const ROOT_BLOCK = /^:root/'),
    edit('stamps', 'widen the line rule\'s variables to none: read a style value only where it is written', "if (ts.isIdentifier(node) && !through.has(node.text)) return (declared.get(node.text) ?? []).flatMap((init) => textsOf(init, new Set([...through, node.text])))", 'void through'),
    edit('stamps', 'drop the line rule for a dashed CSS value in any string', 'if (!ts.isJsxText(node) && DASHED_LINE_VALUE.test(s)) problems.push(', 'if (false) problems.push('),
    edit('stamps', 'drop the line rule for JSON keys', "if (rel.endsWith('.json')) for (const p of jsonLineProblems(rel, text)) fail('line', p.where, p.detail)", 'void jsonLineProblems'),
    edit('stamps', 'compare fonts by size alone', 'if (sha256(bytes) !== f.sha256 || bytes.length !== f.bytes) problems.push(', 'if (bytes.length !== f.bytes) problems.push('),
    // the hand check's copies that only the compiler's types can tell, its untyped files and the text functions
    edit('stamps', "drop the compiler's types from the hand check", '    answers = typedAsStamp(root, asks)', '    answers = asks.map(() => false)'),
    edit('stamps', "read a union's members as no stamp", 'if (t.isUnion()) return t.types.some(isStamp)', 'if (t.isUnion()) return false'),
    edit('stamps', 'read an intersection as no stamp', 'if (t.isIntersection()) return t.types.some(isStamp) || branded(t)', 'if (t.isIntersection()) return false'),
    edit('stamps', 'treat untyped script files as typed', '(untyped && copied.length > 0)', 'false'),
    edit('stamps', 'read .js files only as untyped', 'const untyped = /\\.[cm]?jsx?$/.test(rel)', "const untyped = rel.endsWith('.js')"),
    edit('stamps', "drop the package's text functions as stamp positions", 'if (ts.isCallExpression(p) && p.arguments.includes(n)) return STAMP_TEXT_FUNCTIONS', 'if (false) return STAMP_TEXT_FUNCTIONS'),
    edit('stamps', 'read a text function only by a bare name', "ts.isPropertyAccessExpression(p.expression) ? p.expression.name.text : ''", "''"),
    ...[['any name', 'ts.isIdentifier(n)'], ['property reads', 'ts.isPropertyAccessExpression(n)'], ['calls', 'ts.isCallExpression(n)'], ['element reads', 'ts.isElementAccessExpression(n)']].map(([what, test]) => edit('stamps', `widen what is made where it stands with ${what}`, "(ts.isIdentifier(n) && n.text === 'undefined')", `(ts.isIdentifier(n) && n.text === 'undefined') || ${test}`)),
    // spoken names typed by hand, and the apps' pages
    edit('stamps', 'drop the spoken name from typed stamps', ' || SPOKEN_STAMP.test(text)', ''),
    edit('stamps', "drop the apps' pages from the hand check", '  for (const rel of pages) {\n    const page = ', '  for (const rel of []) {\n    const page = '),
    edit('stamps', "drop a page's tag attributes", '    for (const tag of page.matchAll(/<[^>]*>/g)) if (typedStamp(tag[0])) report(tag.index, tag[0])', '    void typedStamp'),
    edit('stamps', "drop each app's own pages", "...fs.readdirSync(path.join(appsDir, a)).filter((n) => n.endsWith('.html')).sort().map((n) => `apps/${a}/${n}`), ...['src', 'public'].flatMap((d) => walk(root, `apps/${a}/${d}`, (p) => /\\.(?:html|svg)$/.test(p) && !HAND_EXEMPT", "...['src', 'public'].flatMap((d) => walk(root, `apps/${a}/${d}`, (p) => /\\.(?:html|svg)$/.test(p) && !HAND_EXEMPT"),
    edit('stamps', "read the pages under src/ only", "...['src', 'public'].flatMap((d) => walk(root, `apps/${a}/${d}`, (p) => /\\.(?:html|svg)$/.test(p) && !HAND_EXEMPT", "...['src'].flatMap((d) => walk(root, `apps/${a}/${d}`, (p) => /\\.(?:html|svg)$/.test(p) && !HAND_EXEMPT"),
    edit('stamps', "read a page's text line by line", "    for (const re of [STAMP_TEXT, CODE_FIRST, SPOKEN_STAMP]) for (const m of shown.matchAll(new RegExp(re.source, 'g'))) report(m.index, shown.slice(m.index, m.index + 80))", "    for (const re of [STAMP_TEXT, CODE_FIRST, SPOKEN_STAMP]) for (const m of shown.matchAll(new RegExp(re.source.replace(/\\\\s\\*/g, ' ?'), 'g'))) report(m.index, shown.slice(m.index, m.index + 80))"),
    // ---------------------------------------------------------------- GATE-stamps: exact matches made prefix matches
    edit('stamps', 'match the modelled .stamp-frame rule as a prefix', "if (s === '.stamp-frame') return rule.at.length === 0", "if (s.startsWith('.stamp-frame')) return rule.at.length === 0"),
    edit('stamps', 'match the modelled .stamp-<code> .stamp-frame rule as a prefix', 'return /^\\.stamp-[pmtecaqnr] \\.stamp-frame$/.test(s)', 'return /^\\.stamp-[pmtecaqnr] \\.stamp-frame/.test(s)'),
    edit('stamps', 'match the forced-colors query as a prefix', 'const FORCED_COLORS = /^@media\\s*\\(\\s*forced-colors\\s*:\\s*active\\s*\\)$/', 'const FORCED_COLORS = /^@media\\s*\\(\\s*forced-colors\\s*:\\s*active\\s*\\)/'),
    edit('stamps', 'match the which-stamp key as a prefix of the derived stamp', 'if (!keys.includes(f.key.trim())) return void', 'if (!keys.some((k) => k.startsWith(f.key.trim()))) return void'),
    edit('stamps', "match a context bound as a prefix", 'bound: (v) => typeof v === \'string\' && /^depth \\d+$/.test(v),', "bound: (v) => typeof v === 'string' && /^depth \\d+/.test(v),"),
    edit('stamps', "match the [P] grammar's version anywhere in the first part", 'if (code === \'[P]\' && !/^[A-Za-z][\\w+.-]*\\s+v?\\d+(?:\\.\\d+)+(?![\\w.])/.test(first)) out.push(', "if (code === '[P]' && !/[A-Za-z][\\w+.-]*\\s+v?\\d+(?:\\.\\d+)+/.test(first)) out.push("),
  ]
}

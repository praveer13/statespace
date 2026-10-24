"""An independent re-computation of GATE-budget's timeline figures (W0-T06).

It shares no code with scripts/verify-budget.mjs: its own parser for the spine's tables, PyYAML for the budget file,
integer units of six seconds. It rebuilds the two published paths, places every claim, specimen and planned record on
them at the high estimate, and compares the event counts, the hours and the five longest gaps with the gate's --json
output. Run:

    uv run --quiet --with pyyaml python -I scripts/spikes/W0-T06/crosscheck.py

Exit status 0 when the two agree on both paths, 1 when they differ.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
spine = (ROOT / 'docs/spine/SPINE.md').read_text(encoding='utf8').split('\n')
budget = yaml.safe_load((ROOT / 'content/stages/budget.yaml').read_text(encoding='utf8'))

lessons, labs, spec_lesson, claim_cell = {}, {}, {}, {}
for line in spine:
    m = re.match(r'^\| (S\d+\.L\d+) \| (boot|core|bridge|step) \|', line)
    if m:
        lessons[m.group(1)] = m.group(2)
    m = re.match(r'^\| (LAB-\d+\.\d+) \| (.*) \| (\d+)(?: \(9 passes\))? \| ', line)
    if m:
        labs[m.group(1)] = {'title': m.group(2), 'minutes': int(m.group(3)), 'stretch': '`[stretch]`' in m.group(2)}
    m = re.match(r'^\| (SP-\d+\.\d+) \|.*\| (S\d+\.L\d+) \|', line)
    if m:
        spec_lesson[m.group(1)] = m.group(2)
    m = re.match(r'^\| (CL-\d+\.\d+) \| [^|]*\| ([^|]*) \|', line)
    if m:
        claim_cell[m.group(1)] = m.group(2)

P = budget['parameters']
U = 600  # units per hour
stages = budget['stages']


def mu(minutes):
    return round(minutes * 10)


def tokens(sid):
    return stages[sid]['sequence'].split()


def unit_hours(sid, tok):
    sp = stages[sid]
    if re.fullmatch(r'DEFENCE(:[A-Z0-9]+)?', tok):
        lo, hi = [round(float(x) * U) for x in sp['rows']['defence'].split('–')]
        parts = [t for t in tokens(sid) if t.startswith('DEFENCE')]
        n, k = len(parts), parts.index(tok)
        part = lambda t: t - (t // n) * (n - 1) if k == n - 1 else t // n
        return part(lo), part(hi)
    if tok in sp.get('extras', {}):
        a, b = sp['extras'][tok]['minutes']
        return mu(a), mu(b)
    if tok in lessons:
        if tok in sp.get('lesson_minutes', {}):
            a, b = sp['lesson_minutes'][tok]
            return mu(a), mu(b)
        tier = lessons[tok]
        if tier == 'boot':
            return mu(P['lessons']['boot_min']), mu(P['lessons']['boot_min'])
        rng = P['lessons']['bridge_min'] if tier == 'bridge' else P['lessons']['core_min']
        return mu(rng[0]), mu(rng[1])
    lab = labs[tok]
    write = 'write stage' in lab['title'] or tok in sp.get('write_stages', [])
    proof = (not write) and re.search(r'\(proof stage\b', lab['title'])
    lo = mu(lab['minutes'])
    return lo, lo * (P['labs']['proof_multiplier'] if proof else P['labs']['other_multiplier'])


def expand(sel):
    m = re.fullmatch(r'(S\d+\.L)(\d+)–(S\d+\.L)(\d+)', sel) or re.fullmatch(r'(LAB-\d+\.)(\d+)–(LAB-\d+\.)(\d+)', sel)
    return [f'{m.group(1)}{n}' for n in range(int(m.group(2)), int(m.group(4)) + 1)] if m else [sel]


def path_units(pid, defn):
    if pid == 'default':
        return [(s, t) for s in stages for t in tokens(s)]
    taken = {s: set() for s in stages}
    units = []
    for raw in defn['blocks']:
        b = {'id': raw, 'stage': raw} if isinstance(raw, str) else raw
        sid = b['stage']
        if 'take' not in b:
            want = set(tokens(sid))
        elif b['take'] == 'rest':
            want = {t for t in tokens(sid) if t not in taken[sid]}
        else:
            want = {t for s in b['take'] for t in expand(s)}
        for t in tokens(sid):
            if t in want:
                taken[sid].add(t)
                units.append((sid, t))
    return units


def timeline(units):
    out, lo, hi = [], 0, 0
    for sid, tok in units:
        a, b = unit_hours(sid, tok)
        out.append({'tok': tok, 'start': (lo, hi), 'end': (lo + a, hi + b)})
        lo, hi = lo + a, hi + b
    return out


def events(tl):
    pos = {u['tok']: i for i, u in enumerate(tl)}
    ev = []
    for sp, lesson in spec_lesson.items():
        e = tl[pos[lesson]]['end']
        ev.append((sp, lesson, e[0], e[1]))
    for cl, cell in claim_cell.items():
        in_labs, in_lessons = re.findall(r'LAB-\d+\.\d+', cell), re.findall(r'S\d+\.L\d+', cell)
        if cl in budget.get('claim_mints', {}):
            unit = budget['claim_mints'][cl]['unit']
        else:
            if any(labs[x]['stretch'] for x in in_labs):
                continue
            pool = in_labs if in_labs else in_lessons
            unit = sorted([x for x in pool if x in pos], key=lambda x: tl[pos[x]]['end'][1])[-1]
        e = tl[pos[unit]]['end']
        ev.append((cl, unit, e[0], e[1]))
    for r in budget.get('planned_records', []):
        u = tl[pos[r['unit']]]
        passes = stages['S10']['passes'][r['unit']]
        frac = sum(passes[:r['after_pass']]) / sum(passes)
        ev.append((r['id'], r['unit'],
                   u['start'][0] + round(frac * (u['end'][0] - u['start'][0])),
                   u['start'][1] + round(frac * (u['end'][1] - u['start'][1]))))
    return sorted(ev, key=lambda e: (e[3], e[2], e[0]))


record_ids = {r['id'] for r in budget.get('planned_records', [])}
limit = round(P['cadence']['max_gap_weeks'] * P['stage_work_h']['h6'] * U)


def worst_gap(evs):
    """The longest gap between consecutive events (the first in time order when two tie) and the events that bound it."""
    best, prev = None, ('the start of the path', None, 0, 0)
    for e in evs:
        if best is None or e[3] - prev[3] > best[0]:
            best = (e[3] - prev[3], prev, e)
        prev = e
    return best


mine = {}
for pid, defn in budget['paths'].items():
    tl = timeline(path_units(pid, defn))
    ev = events(tl)
    gaps, prev = [], ('start', None, 0, 0)
    for e in ev:
        gaps.append((e[3] - prev[3], prev[0], e[0]))
        prev = e
    gaps.sort(reverse=True)
    # the same path without the planned records, which no claim template covers: does the cadence hold only with them?
    without = None
    if record_ids:
        gap, a, b = worst_gap([e for e in ev if e[0] not in record_ids])
        without = (worst_gap(ev)[0] <= limit < gap, a[0], b[0], round(gap / U, 4), round((b[2] - a[2]) / U, 4))
    mine[pid] = {'events': len(ev), 'hours': [tl[-1]['end'][0] / U, tl[-1]['end'][1] / U],
                 'top': [(round(g[0] / U, 2), g[1], g[2]) for g in gaps[:5]], 'without': without}

gate = json.loads(subprocess.run(['node', 'scripts/verify-budget.mjs', '--json'], cwd=ROOT, capture_output=True, text=True, check=False).stdout)
bad = 0
for p in gate['paths']:
    rec = p['cadence']['plannedRecords']
    w = rec['longestGapWithoutThem']
    theirs = (p['cadence']['events'], [round(h, 4) for h in p['totalHours']],
              [(round(g['hours'], 2), g['from'], g['to']) for g in p['cadence']['longestGaps']],
              w and (rec['holdsOnlyWithThem'], w['from'], w['to'], round(w['hours'], 4), round(w['lowEstimateHours'], 4)))
    ours = (mine[p['id']]['events'], [round(h, 4) for h in mine[p['id']]['hours']], mine[p['id']]['top'], mine[p['id']]['without'])
    same = theirs == ours
    bad += not same
    note = ''
    if ours[3]:
        note = (f"; without the {len(record_ids)} planned records the longest gap is {ours[3][3]} h between {ours[3][1]} and {ours[3][2]} "
                f"({ours[3][4]} h at the low estimate), so the cadence {'holds only with them' if ours[3][0] else 'holds without them'}")
    print(f"{'PASS' if same else 'FAIL'}: {p['id']}: {ours[0]} events, {ours[1][0]}-{ours[1][1]} h of sequenced work, "
          f"longest gap {ours[2][0][0]} h between {ours[2][0][1]} and {ours[2][0][2]}{note}"
          f"{'' if same else f'; the gate has {theirs}'}")
sys.exit(1 if bad else 0)

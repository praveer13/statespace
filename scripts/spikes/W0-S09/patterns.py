"""W0-S09: the seeded grid and the pattern library behind the catalog's pool rows.

A *pattern* is a small concurrent program (two or three sessions, a few steps
each) written as isolationtester steps. A *cell* fixes its numbers: the starting
balance, the amounts and the isolation level of each session. A cell renders to
one isolationtester spec whose `permutation` lines are the interleavings that
cannot hang the tester. Rows H01, H02, H04, H05, H06 and H22 of the catalog are
the cells at the canonical numbers; the grid is every cell.

Standard library only. The seeded generator is mulberry32 fed by FNV-1a-32 of a
text seed, both specified in grid.json with test vectors, so the generator that
W4-T20 writes can reproduce the draws.
"""
import itertools
import re

# --------------------------------------------------------------------------
# the seeded stream
# --------------------------------------------------------------------------

GRID_SEED = "statespace/GEN-anomaly-id/grid/1"
MASK = 0xFFFFFFFF


def fnv1a32(text):
    h = 0x811C9DC5
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & MASK
    return h


class Mulberry32:
    """mulberry32, the public-domain 32-bit generator; next_u32 returns the same
    value as `(t ^ t >>> 14) >>> 0` in the usual JavaScript statement of it."""

    def __init__(self, seed32):
        self.a = seed32 & MASK

    def next_u32(self):
        self.a = (self.a + 0x6D2B79F5) & MASK
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & MASK
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & MASK)) & MASK
        return (t ^ (t >> 14)) & MASK

    def randint(self, lo, hi):
        """Uniform integer in [lo, hi]; integer arithmetic only, so every
        language gives the same answer: lo + floor(u32 * range / 2^32)."""
        rng = hi - lo + 1
        return lo + (self.next_u32() * rng) // (1 << 32)


def stream(purpose, seed=GRID_SEED):
    return Mulberry32(fnv1a32(f"{seed}/{purpose}"))


def test_vectors(purpose="vectors", n=5, seed=GRID_SEED):
    r = stream(purpose, seed)
    return {"seed": seed, "purpose": purpose, "fnv1a32": fnv1a32(f"{seed}/{purpose}"),
            "first_u32": [r.next_u32() for _ in range(n)]}


# --------------------------------------------------------------------------
# cells: balances and amounts
# --------------------------------------------------------------------------

LEVELS = {"rc": "READ COMMITTED", "rr": "REPEATABLE READ", "ser": "SERIALIZABLE"}
UNIFORM_LEVELS = ["rc", "rr", "ser"]
CANONICAL_BALANCE = 100


def balances(seed=GRID_SEED):
    """Three starting balances: the canonical 100 of the executed spikes, and two
    seeded multiples of 10 between 60 and 200."""
    r = stream("balances", seed)
    out = [CANONICAL_BALANCE]
    while len(out) < 3:
        b = 10 * r.randint(6, 20)
        if b not in out:
            out.append(b)
    return sorted(out)


def _pair(r, cap, cls):
    """Two amounts on a lattice of 5, by class, against a capacity `cap`.
    contend: each fits alone, together they exceed cap.
    exact: together they equal cap.
    fit: together they leave room."""
    if cls == "contend":
        lo = (cap // 2 // 5 + 1) * 5
        hi = cap
        a1 = lo + 5 * r.randint(0, (hi - lo) // 5)
        a2 = lo + 5 * r.randint(0, (hi - lo) // 5)
    elif cls == "exact":
        a1 = 10 + 5 * r.randint(0, (cap - 20) // 5)
        a2 = cap - a1
    elif cls == "fit":
        top1 = cap // 2 - 5
        a1 = 10 + 5 * r.randint(0, (top1 - 10) // 5)
        top2 = cap - 10 - a1
        a2 = 10 + 5 * r.randint(0, (top2 - 10) // 5)
    else:
        raise ValueError(cls)
    return a1, a2


PAIR_CLASSES = ["contend", "exact", "fit"]


def pair_cells(family, cap_of, canonical, seed=GRID_SEED):
    """One cell per (balance, class): [{balance, class, amounts}]. `canonical`
    is the pair fixed at the canonical balance's 'contend' class, so the grid
    contains the numbers of the executed spikes."""
    cells = []
    for b in balances(seed):
        for cls in PAIR_CLASSES:
            r = stream(f"amounts/{family}/{b}/{cls}", seed)
            a = _pair(r, cap_of(b), cls)
            if b == CANONICAL_BALANCE and cls == "contend":
                a = canonical
            cells.append({"key": f"b{b}-{cls}", "balance": b, "class": cls, "amounts": list(a)})
    return cells


def single_cells(family, seed=GRID_SEED):
    """One transfer amount per (balance, class) for the read-skew patterns."""
    cells = []
    for b in balances(seed):
        for cls in ("small", "half", "large"):
            r = stream(f"amounts/{family}/{b}/{cls}", seed)
            if cls == "small":
                m = 10 + 5 * r.randint(0, (b // 4 - 10) // 5)
            elif cls == "half":
                m = (b // 2 // 5) * 5 + 5 * r.randint(-2, 2)
            else:
                m = (3 * b // 4 // 5) * 5 + 5 * r.randint(0, ((b - 10) - (3 * b // 4 // 5) * 5) // 5)
            if b == CANONICAL_BALANCE and cls == "half":
                m = 50
            cells.append({"key": f"b{b}-{cls}", "balance": b, "class": cls, "amounts": [m]})
    return cells


def move_cells(family, seed=GRID_SEED):
    """Two transfer amounts, each within the balance, for the lock-order patterns."""
    cells = []
    for b in balances(seed):
        for cls in ("equal", "less", "greater"):
            r = stream(f"amounts/{family}/{b}/{cls}", seed)
            x = 10 + 5 * r.randint(0, (b - 10) // 5)
            if cls == "equal":
                a = (x, x)
            else:
                y = 10 + 5 * r.randint(0, (b - 10) // 5)
                while y == x:
                    y = 10 + 5 * r.randint(0, (b - 10) // 5)
                lo, hi = min(x, y), max(x, y)
                a = (lo, hi) if cls == "less" else (hi, lo)
            if b == CANONICAL_BALANCE and cls == "equal":
                a = (10, 10)
            cells.append({"key": f"b{b}-{cls}", "balance": b, "class": cls, "amounts": list(a)})
    return cells


BIGINT_MAX = 9223372036854775807


def overflow_cells(seed=GRID_SEED):
    """Credits past 2^63-1: three gaps below the maximum, three credits that exceed
    each. The balance is a string, because JSON numbers lose bigint precision."""
    r = stream("amounts/overflow", seed)
    gaps = []
    while len(gaps) < 3:
        g = r.randint(1, 50)
        if g not in gaps:
            gaps.append(g)
    cells = []
    for g in sorted(gaps):
        for cls, extra in (("just-over", 1), ("over", r.randint(2, 20)), ("far-over", r.randint(21, 100))):
            cells.append({"key": f"gap{g}-{cls}", "balance": str(BIGINT_MAX - g), "gap": g, "class": cls,
                          "amounts": [g + extra]})
    return cells


def unique_cells(seed=GRID_SEED):
    """Three keys for the unique-violation retry pattern."""
    r = stream("amounts/unique", seed)
    keys = []
    while len(keys) < 3:
        k = r.randint(1, 99)
        if k not in keys:
            keys.append(k)
    return [{"key": f"k{k}", "balance": None, "class": "key", "amounts": [k]} for k in sorted(keys)]


# --------------------------------------------------------------------------
# step vocabulary
# --------------------------------------------------------------------------

RET = "RETURNING old.bal AS old_bal, new.bal AS new_bal;"
SETUP_ACCT = ("CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL, team int);\n"
              "  INSERT INTO acct VALUES (1, {b}, 1), (2, {b}, 1);")
SETUP_HOLDS = SETUP_ACCT + "\n  CREATE TABLE holds(acct int, amt bigint);"
TEARDOWN_ACCT = "DROP TABLE acct;"
TEARDOWN_HOLDS = "DROP TABLE acct, holds;"
CHK_ACCT = "SELECT id, bal FROM acct ORDER BY id;"
CHK_TEAM = "SELECT id, bal FROM acct ORDER BY id; SELECT sum(bal) AS team_total FROM acct WHERE team = 1;"
CHK_HOLDS = ("SELECT (SELECT bal FROM acct WHERE id = 1) AS bal, "
             "coalesce(sum(amt), 0) AS held FROM holds;")


def begin_sql(level):
    return f"BEGIN ISOLATION LEVEL {LEVELS[level]};"


class Step:
    def __init__(self, name, sql, kind, writes=(), certain=False):
        self.name = name
        self.sql = sql
        self.kind = kind          # begin | read | write | commit
        self.writes = frozenset(writes)
        self.certain = certain    # the write certainly takes its row lock


class Model:
    """A rendered-ready pattern instance: sessions with ordered steps."""

    def __init__(self, title, setup, teardown, chk, deadlock_possible=False):
        self.title = title
        self.setup = setup
        self.teardown = teardown
        self.chk = chk
        self.sessions = []       # [(name, level, [Step])]  (first step is the begin)
        self.deadlock_possible = deadlock_possible
        self.extra_perm_steps = []

    def add(self, name, level, steps):
        self.sessions.append((name, level, steps))

    def step_owner(self):
        return {s.name: sess for sess, _lv, steps in self.sessions for s in steps}

    def step_meta(self):
        return {s.name: s for _sess, _lv, steps in self.sessions for s in steps}

    def op_sequences(self):
        """{session: [op step names]} without the begin step."""
        return {sess: [s.name for s in steps if s.kind != "begin"] for sess, _lv, steps in self.sessions}

    def begin_of(self):
        return {sess: next(s.name for s in steps if s.kind == "begin") for sess, _lv, steps in self.sessions}


def _rmw_steps(i, amount, level, tbl_row=1):
    p = f"s{i}"
    return [
        Step(p + "b", begin_sql(level), "begin"),
        Step(p + "r", "CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT bal FROM acct WHERE id = %d; SELECT bal FROM seen;" % tbl_row, "read"),
        Step(p + "w", "UPDATE acct SET bal = (SELECT bal FROM seen) - %d WHERE id = %d AND (SELECT bal FROM seen) >= %d %s"
             % (amount, tbl_row, amount, RET), "write", writes={f"acct:{tbl_row}"}),
        Step(p + "c", "COMMIT;", "commit"),
    ]


def _cond_steps(i, amount, level, sfx=""):
    p = f"s{i}"
    return [
        Step(p + "b" + sfx, begin_sql(level), "begin"),
        Step(p + "w" + sfx, "UPDATE acct SET bal = bal - %d WHERE id = 1 AND bal >= %d %s" % (amount, amount, RET),
             "write", writes={"acct:1"}),
        Step(p + "c" + sfx, "COMMIT;", "commit"),
    ]


def _team_steps(i, amount, level):
    p = f"s{i}"
    return [
        Step(p + "b", begin_sql(level), "begin"),
        Step(p + "r", "CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT sum(bal) AS total FROM acct WHERE team = 1; SELECT total FROM seen;", "read"),
        Step(p + "w", "UPDATE acct SET bal = bal - %d WHERE id = %d AND (SELECT total FROM seen) - %d >= 0 %s"
             % (amount, i, amount, RET), "write", writes={f"acct:{i}"}),
        Step(p + "c", "COMMIT;", "commit"),
    ]


def _holds_steps(i, amount, level, sfx=""):
    p = f"s{i}"
    return [
        Step(p + "b" + sfx, begin_sql(level), "begin"),
        Step(p + "r" + sfx, "CREATE TEMP TABLE seen ON COMMIT DROP AS SELECT a.bal - coalesce((SELECT sum(h.amt) FROM holds h WHERE h.acct = 1), 0) AS avail "
             "FROM acct a WHERE a.id = 1; SELECT avail FROM seen;", "read"),
        Step(p + "w" + sfx, "INSERT INTO holds SELECT 1, %d WHERE (SELECT avail FROM seen) >= %d RETURNING acct, amt;" % (amount, amount), "write"),
        Step(p + "c" + sfx, "COMMIT;", "commit"),
    ]


def _transfer_two_statements(frm, to, amount):
    return ("UPDATE acct SET bal = bal - %d WHERE id = %d %s UPDATE acct SET bal = bal + %d WHERE id = %d %s"
            % (amount, frm, RET, amount, to, RET))


# --------------------------------------------------------------------------
# patterns: each builds a Model for one cell
# --------------------------------------------------------------------------

def build_rmw2(cell, levels):
    b = cell["balance"]
    a1, a2 = cell["amounts"]
    m = Model("two read-modify-write debits of one balance", SETUP_ACCT.format(b=b), TEARDOWN_ACCT, CHK_ACCT)
    m.add("s1", levels["s1"], _rmw_steps(1, a1, levels["s1"]))
    m.add("s2", levels["s2"], _rmw_steps(2, a2, levels["s2"]))
    return m


def build_rmw3(cell, levels):
    b = cell["balance"]
    a1, a2, a3 = cell["amounts"]
    m = Model("three read-modify-write debits of one balance", SETUP_ACCT.format(b=b), TEARDOWN_ACCT, CHK_ACCT)
    for i, a in ((1, a1), (2, a2), (3, a3)):
        m.add(f"s{i}", levels[f"s{i}"], _rmw_steps(i, a, levels[f"s{i}"]))
    return m


def build_cond2(cell, levels):
    b = cell["balance"]
    a1, a2 = cell["amounts"]
    m = Model("two conditional UPDATE debits of one balance", SETUP_ACCT.format(b=b), TEARDOWN_ACCT, CHK_ACCT)
    m.add("s1", levels["s1"], _cond_steps(1, a1, levels["s1"]))
    m.add("s2", levels["s2"], _cond_steps(2, a2, levels["s2"]))
    return m


def build_teamsum2(cell, levels):
    b = cell["balance"]
    d1, d2 = cell["amounts"]
    m = Model("team-sum write skew: each session checks the team total, then debits its own account",
              SETUP_ACCT.format(b=b), TEARDOWN_ACCT, CHK_TEAM)
    m.add("s1", levels["s1"], _team_steps(1, d1, levels["s1"]))
    m.add("s2", levels["s2"], _team_steps(2, d2, levels["s2"]))
    return m


def build_holds2(cell, levels):
    b = cell["balance"]
    h1, h2 = cell["amounts"]
    m = Model("holds write skew: each session reads what is available, then inserts a hold",
              SETUP_HOLDS.format(b=b), TEARDOWN_HOLDS, CHK_HOLDS)
    m.add("s1", levels["s1"], _holds_steps(1, h1, levels["s1"]))
    m.add("s2", levels["s2"], _holds_steps(2, h2, levels["s2"]))
    return m


def build_readskew2(cell, levels):
    b = cell["balance"]
    (amt,) = cell["amounts"]
    m = Model("read skew: a reader reads two balances while a transfer commits between the reads",
              SETUP_ACCT.format(b=b), TEARDOWN_ACCT, CHK_ACCT)
    m.add("rd", levels["rd"], [
        Step("rdb", begin_sql(levels["rd"]), "begin"),
        Step("rd1", "SELECT bal FROM acct WHERE id = 1;", "read"),
        Step("rd2", "SELECT bal FROM acct WHERE id = 2;", "read"),
        Step("rdc", "COMMIT;", "commit"),
    ])
    m.add("mv", levels["mv"], [
        Step("mvb", begin_sql(levels["mv"]), "begin"),
        Step("mvt", _transfer_two_statements(1, 2, amt), "write", writes={"acct:1", "acct:2"}),
        Step("mvc", "COMMIT;", "commit"),
    ])
    return m


def build_readskew3(cell, levels):
    b = cell["balance"]
    (amt,) = cell["amounts"]
    m = Model("read skew with three transactions: two readers in opposite orders and one transfer",
              SETUP_ACCT.format(b=b), TEARDOWN_ACCT, CHK_ACCT)
    m.add("ra", levels["ra"], [
        Step("rab", begin_sql(levels["ra"]), "begin"),
        Step("ra1", "SELECT bal FROM acct WHERE id = 1;", "read"),
        Step("ra2", "SELECT bal FROM acct WHERE id = 2;", "read"),
        Step("rac", "COMMIT;", "commit"),
    ])
    m.add("rb", levels["rb"], [
        Step("rbb", begin_sql(levels["rb"]), "begin"),
        Step("rb2", "SELECT bal FROM acct WHERE id = 2;", "read"),
        Step("rb1", "SELECT bal FROM acct WHERE id = 1;", "read"),
        Step("rbc", "COMMIT;", "commit"),
    ])
    m.add("mv", levels["mv"], [
        Step("mvb", begin_sql(levels["mv"]), "begin"),
        Step("mvt", _transfer_two_statements(1, 2, amt), "write", writes={"acct:1", "acct:2"}),
        Step("mvc", "COMMIT;", "commit"),
    ])
    return m


def build_opposite2(cell, levels):
    b = cell["balance"]
    m1, m2 = cell["amounts"]
    m = Model("opposite-order moves: A moves 1 to 2 while B moves 2 to 1, each debiting first",
              SETUP_ACCT.format(b=b), TEARDOWN_ACCT, CHK_ACCT, deadlock_possible=True)
    m.add("s1", levels["s1"], [
        Step("s1b", begin_sql(levels["s1"]), "begin"),
        Step("s1d", "UPDATE acct SET bal = bal - %d WHERE id = 1 AND bal >= %d %s" % (m1, m1, RET), "write", writes={"acct:1"}, certain=True),
        Step("s1k", "UPDATE acct SET bal = bal + %d WHERE id = 2 %s" % (m1, RET), "write", writes={"acct:2"}, certain=True),
        Step("s1c", "COMMIT;", "commit"),
    ])
    m.add("s2", levels["s2"], [
        Step("s2b", begin_sql(levels["s2"]), "begin"),
        Step("s2d", "UPDATE acct SET bal = bal - %d WHERE id = 2 AND bal >= %d %s" % (m2, m2, RET), "write", writes={"acct:2"}, certain=True),
        Step("s2k", "UPDATE acct SET bal = bal + %d WHERE id = 1 %s" % (m2, RET), "write", writes={"acct:1"}, certain=True),
        Step("s2c", "COMMIT;", "commit"),
    ])
    return m


def build_ordered2(cell, levels):
    """The same two moves, but B issues its statements in ascending account
    order (credit account 1, then debit account 2), as A does."""
    b = cell["balance"]
    m1, m2 = cell["amounts"]
    m = Model("ascending-order moves: both sessions touch account 1 before account 2",
              SETUP_ACCT.format(b=b), TEARDOWN_ACCT, CHK_ACCT, deadlock_possible=True)
    m.add("s1", levels["s1"], [
        Step("s1b", begin_sql(levels["s1"]), "begin"),
        Step("s1d", "UPDATE acct SET bal = bal - %d WHERE id = 1 AND bal >= %d %s" % (m1, m1, RET), "write", writes={"acct:1"}, certain=True),
        Step("s1k", "UPDATE acct SET bal = bal + %d WHERE id = 2 %s" % (m1, RET), "write", writes={"acct:2"}, certain=True),
        Step("s1c", "COMMIT;", "commit"),
    ])
    m.add("s2", levels["s2"], [
        Step("s2b", begin_sql(levels["s2"]), "begin"),
        Step("s2k", "UPDATE acct SET bal = bal + %d WHERE id = 1 %s" % (m2, RET), "write", writes={"acct:1"}, certain=True),
        Step("s2d", "UPDATE acct SET bal = bal - %d WHERE id = 2 AND bal >= %d %s" % (m2, m2, RET), "write", writes={"acct:2"}, certain=True),
        Step("s2c", "COMMIT;", "commit"),
    ])
    return m


def _with_retry(model, builder, amounts, levels, sessions):
    """Add to each session the steps of the same command again (suffix _r): the
    whole-command retry that follows a failed attempt."""
    for (sess, _lv, steps), (i, a) in zip(model.sessions, enumerate(amounts, start=1)):
        steps.extend(builder(i, a, levels[sess], sfx="_r"))
    return model


def _opposite_steps(i, amount, level, sfx=""):
    frm, to = (1, 2) if i == 1 else (2, 1)
    p = f"s{i}"
    return [
        Step(p + "b" + sfx, begin_sql(level), "begin"),
        Step(p + "d" + sfx, "UPDATE acct SET bal = bal - %d WHERE id = %d AND bal >= %d %s" % (amount, frm, amount, RET),
             "write", writes={f"acct:{frm}"}, certain=True),
        Step(p + "k" + sfx, "UPDATE acct SET bal = bal + %d WHERE id = %d %s" % (amount, to, RET),
             "write", writes={f"acct:{to}"}, certain=True),
        Step(p + "c" + sfx, "COMMIT;", "commit"),
    ]


def build_retry_holds(cell, levels):
    m = build_holds2(cell, levels)
    m.title = "holds write skew with a whole-command retry of the failed session"
    return _with_retry(m, _holds_steps, cell["amounts"], levels, ["s1", "s2"])


def build_retry_cond(cell, levels):
    m = build_cond2(cell, levels)
    m.title = "conditional UPDATE twin with a whole-command retry of the failed session"
    return _with_retry(m, _cond_steps, cell["amounts"], levels, ["s1", "s2"])


def build_retry_opposite(cell, levels):
    m = build_opposite2(cell, levels)
    m.title = "opposite-order moves with a whole-command retry of the deadlock victim"
    return _with_retry(m, _opposite_steps, cell["amounts"], levels, ["s1", "s2"])


def build_overflow1(cell, levels):
    (c,) = cell["amounts"]
    m = Model("a credit past the largest bigint, retried unchanged",
              "CREATE TABLE acct(id int PRIMARY KEY, bal bigint NOT NULL, team int);\n"
              "  INSERT INTO acct VALUES (1, %s, 1), (2, 100, 1);" % cell["balance"], TEARDOWN_ACCT, CHK_ACCT)
    lv = levels["s1"]

    def steps(sfx):
        return [Step("s1b" + sfx, begin_sql(lv), "begin"),
                Step("s1x" + sfx, "UPDATE acct SET bal = bal + %d WHERE id = 1 %s" % (c, RET), "write", writes={"acct:1"}),
                Step("s1c" + sfx, "COMMIT;", "commit")]

    m.add("s1", lv, steps("") + steps("2"))
    return m


def build_unique1(cell, levels):
    (k,) = cell["amounts"]
    m = Model("two blind inserts of one key, then the loser retries blind or re-checks",
              "CREATE TABLE kv (k int PRIMARY KEY, v text NOT NULL);", "DROP TABLE kv;",
              "SELECT k, v FROM kv ORDER BY k;")
    for i, name in ((1, "s1"), (2, "s2")):
        lv = levels[name]
        st = [Step(f"{name}b", begin_sql(lv), "begin"),
              Step(f"{name}ins", "INSERT INTO kv VALUES (%d, '%s') RETURNING k, v;" % (k, name), "write", writes={f"kv:{k}"}),
              Step(f"{name}c", "COMMIT;", "commit")]
        if i == 2:
            st += [Step("s2b2", begin_sql(lv), "begin"),
                   Step("s2ins2_blind", "INSERT INTO kv VALUES (%d, 's2') RETURNING k, v;" % k, "write", writes={f"kv:{k}"}),
                   Step("s2ins2_guarded", "INSERT INTO kv SELECT %d, 's2' WHERE NOT EXISTS (SELECT 1 FROM kv WHERE k = %d) RETURNING k, v;" % (k, k),
                        "write", writes={f"kv:{k}"}),
                   Step("s2c2", "COMMIT;", "commit")]
        m.add(name, lv, st)
    return m


# --------------------------------------------------------------------------
# interleavings and the validity filter
# --------------------------------------------------------------------------

def interleavings(seqs):
    """All interleavings of the op sequences, each session's order kept.
    seqs: {session: [step names]} -> list of lists of step names."""
    names = list(seqs)
    out = []

    def rec(idx, cur):
        done = True
        for k, s in enumerate(names):
            if idx[k] < len(seqs[s]):
                done = False
                idx[k] += 1
                cur.append(seqs[s][idx[k] - 1])
                rec(idx, cur)
                cur.pop()
                idx[k] -= 1
        if done:
            out.append(list(cur))

    rec([0] * len(names), [])
    return out


def valid(order, model):
    """True when `order` cannot hang the tester (see analyze_order)."""
    return analyze_order(order, model)[0]


def analyze_order(order, model):
    """Conservative check that isolationtester cannot hang on `order`.

    A write step is *possibly blocking* when another session still has a write
    to the same resource in an open transaction. isolationtester launches a
    session's next step only after that session's previous step has finished, so
    a possibly-blocked session must not be scheduled again until every possible
    blocker has ended its transaction. The one exception is a deadlock: when
    every involved write is certain (model.deadlock_possible and Step.certain)
    and the blocked sessions wait on each other in a cycle, the server aborts
    one of them after deadlock_timeout and both steps finish.

    The check is sound and incomplete: it can reject an order that would have run
    (a write whose guard turns out false does not block) but never accepts one
    that hangs. The runner records what actually waited and checks it against
    this prediction.

    Returns (ok, the steps that were possibly blocking when they ran)."""
    owner = model.step_owner()
    meta = model.step_meta()
    sessions = [s for s, _lv, _st in model.sessions]
    open_w = {s: set() for s in sessions}
    blocked_on = {s: set() for s in sessions}
    since = {}
    ended = set()
    maybe = set()
    for pos, step in enumerate(order):
        s = owner[step]
        st = meta[step]
        if blocked_on[s]:
            if not model.deadlock_possible:
                return False, maybe
            # find a wait-for cycle through s among certain edges
            cyc = _cycle_through(s, blocked_on)
            if not cyc:
                return False, maybe
            victim = min(cyc, key=lambda x: since[x])
            # the victim aborts: its locks go, nobody waits on it any more
            open_w[victim] = set()
            blocked_on[victim] = set()
            ended.add(victim)
            for t in sessions:
                blocked_on[t].discard(victim)
            if blocked_on[s]:
                return False, maybe
        if st.kind == "commit":
            open_w[s] = set()
            ended.add(s)
            blocked_on[s] = set()
            for t in sessions:
                blocked_on[t].discard(s)
        elif st.writes:
            if s in ended:
                continue  # a step of an aborted transaction: errors at once, locks nothing
            blockers = {t for t in sessions if t != s and t not in ended and (open_w[t] & st.writes)}
            if blockers:
                maybe.add(step)
                blocked_on[s] = set(blockers)
                since[s] = pos
            open_w[s] |= st.writes
    return True, maybe


def _cycle_through(start, blocked_on):
    """Sessions on a wait-for cycle that contains `start`, or []."""
    path = []

    def dfs(node, seen):
        for nxt in blocked_on.get(node, ()):
            if nxt == start:
                return path + [node]
            if nxt in seen:
                continue
            seen.add(nxt)
            path.append(node)
            r = dfs(nxt, seen)
            path.pop()
            if r:
                return r
        return None

    r = dfs(start, {start})
    return r or []


def glue_begins(order, model):
    """Put each session's begin step right before its first op step, and the
    observer's check last."""
    begin = model.begin_of()
    owner = model.step_owner()
    seen = set()
    out = []
    for step in order:
        s = owner[step]
        if s not in seen:
            out.append(begin[s])
            seen.add(s)
        out.append(step)
    out.append("chk")
    return out


def permutations_for(model, limit=None, sample_stream=None):
    """The valid interleavings of a model as lists of step names (begins glued,
    check last). With `limit`, a seeded sample of that many, in the order drawn."""
    allp = interleavings(model.op_sequences())
    ok = [p for p in allp if valid(p, model)]
    if limit is not None and len(ok) > limit:
        r = sample_stream
        idx = list(range(len(ok)))
        # Fisher-Yates with the seeded stream
        for i in range(len(idx) - 1, 0, -1):
            j = r.randint(0, i)
            idx[i], idx[j] = idx[j], idx[i]
        chosen = sorted(idx[:limit])
        ok = [ok[i] for i in chosen]
    return [glue_begins(p, model) for p in ok], len(allp), len([p for p in allp if valid(p, model)])


# --------------------------------------------------------------------------
# rendering
# --------------------------------------------------------------------------

def render(model, perms, header_lines=()):
    used = {n for q in perms for n in q}
    out = []
    for h in header_lines:
        out.append(("# " + h).rstrip())
    if header_lines:
        out.append("")
    out.append("setup\n{\n  " + model.setup + "\n}")
    out.append("")
    out.append("teardown\n{\n  " + model.teardown + "\n}")
    out.append("")
    for sess, _lv, steps in model.sessions:
        keep = [s for s in steps if s.name in used]   # isolationtester warns about unused steps
        if not keep:
            continue
        out.append(f"session {sess}")
        for s in keep:
            assert "}" not in s.sql and "\n" not in s.sql, s.name
            out.append(f"step {s.name} {{ {s.sql} }}")
        out.append("")
    out.append("session obs")
    out.append(f"step chk {{ {model.chk} }}")
    out.append("")
    for p in perms:
        out.append("permutation " + " ".join(p))
    return "\n".join(out) + "\n"


def render_multilevel(pattern_name, cell, header_lines=(), headline=None):
    """One spec for a catalog row: every uniform level in one file. Each session has
    a begin step per level (s1b_rc, s1b_rr, s1b_ser); the permutation lines run all
    the interleavings that cannot hang the tester, level by level, the headline
    interleaving (the one the report names) first. Returns (spec text, permutation
    count per level)."""
    p = PATTERNS[pattern_name]
    models = {lk: p["build"](cell, {s: lk for s in p["sessions"]}) for lk in UNIFORM_LEVELS}
    base = models["rc"]
    combined = Model(base.title, base.setup, base.teardown, base.chk, base.deadlock_possible)
    for sess, _lv, steps in base.sessions:
        combined.add(sess, None, [Step(f"{sess}b_{lk}", begin_sql(lk), "begin") for lk in UNIFORM_LEVELS]
                     + [s for s in steps if s.kind != "begin"])
    perms = []
    counts = {}
    for lk in UNIFORM_LEVELS:
        m = models[lk]
        ps, _all, _ok = permutations_for(m)
        begin_names = set(m.begin_of().values())

        def ops(perm):
            return [x for x in perm if x not in begin_names and x != "chk"]

        if headline is not None:
            ps.sort(key=lambda q: 0 if ops(q) == headline else 1)  # stable
        counts[lk] = len(ps)
        for q in ps:
            perms.append([f"{x}_{lk}" if x in begin_names else x for x in q])
    return render(combined, perms, header_lines), counts


# --------------------------------------------------------------------------
# pattern registry
# --------------------------------------------------------------------------

def _uni(names):
    return lambda lv: {n: lv for n in names}


# name -> definition. `levels` yields the per-session level assignment for a
# level key; `cells` the numbers; `limit` caps the interleavings drawn by seed.
PATTERNS = {
    "rmw2": {"template": "t1", "band": 1, "build": build_rmw2, "title": "read-modify-write, two sessions",
             "sessions": ["s1", "s2"], "cells": lambda seed: pair_cells("rmw", lambda b: b, (80, 80), seed)},
    "cond2": {"template": "t1", "band": 2, "build": build_cond2, "title": "conditional UPDATE twin, two sessions",
              "sessions": ["s1", "s2"], "cells": lambda seed: pair_cells("rmw", lambda b: b, (80, 80), seed)},
    "rmw3": {"template": "t1", "band": 3, "build": build_rmw3, "title": "read-modify-write, three sessions",
             "sessions": ["s1", "s2", "s3"], "limit": 8, "triples": True,
             "cells": lambda seed: triple_cells(seed)},
    "teamsum2": {"template": "t2", "band": 1, "build": build_teamsum2, "title": "team-sum write skew",
                 "sessions": ["s1", "s2"], "cells": lambda seed: pair_cells("teamsum", lambda b: 2 * b, (150, 150), seed)},
    "holds2": {"template": "t2", "band": 2, "build": build_holds2, "title": "holds write skew",
               "sessions": ["s1", "s2"], "cells": lambda seed: pair_cells("rmw", lambda b: b, (80, 80), seed)},
    "readskew2": {"template": "t3", "band": 1, "build": build_readskew2, "title": "read skew, two transactions",
                  "sessions": ["rd", "mv"], "cells": lambda seed: single_cells("readskew", seed)},
    "readskew3": {"template": "t3", "band": 2, "build": build_readskew3, "title": "read skew, three transactions",
                  "sessions": ["ra", "rb", "mv"], "limit": 12, "cells": lambda seed: single_cells("readskew", seed)},
    "readskew2-mixed": {"template": "t3", "band": 3, "build": build_readskew2, "title": "read skew, mixed isolation levels",
                        "sessions": ["rd", "mv"], "mixed": True, "cells": lambda seed: single_cells("readskew", seed)},
    "opposite2": {"template": "t4", "band": 2, "build": build_opposite2, "title": "opposite-order moves",
                  "sessions": ["s1", "s2"], "cells": lambda seed: move_cells("move", seed)},
    "ordered2": {"template": "t4", "band": 2, "build": build_ordered2, "title": "ascending-order moves",
                 "sessions": ["s1", "s2"], "cells": lambda seed: move_cells("move", seed)},
}


PATTERNS.update({
    # derived from the recorded outcomes of a base pattern: the permutations whose
    # recorded history has a retryable failure, with the failed session's retry
    # appended (see run_grid.py)
    "retry-holds": {"template": "t4", "band": 3, "build": build_retry_holds, "base": "holds2", "levels": ["ser"],
                    "title": "attempt log: holds at SERIALIZABLE, failed session retries",
                    "sessions": ["s1", "s2"], "cells": lambda seed: pair_cells("rmw", lambda b: b, (80, 80), seed)},
    "retry-cond": {"template": "t4", "band": 3, "build": build_retry_cond, "base": "cond2", "levels": ["rr", "ser"],
                   "title": "attempt log: conditional UPDATE, failed session retries",
                   "sessions": ["s1", "s2"], "cells": lambda seed: pair_cells("rmw", lambda b: b, (80, 80), seed)},
    "retry-opposite": {"template": "t4", "band": 3, "build": build_retry_opposite, "base": "opposite2",
                       "levels": ["rc", "rr", "ser"], "title": "attempt log: opposite-order moves, deadlock victim retries",
                       "sessions": ["s1", "s2"], "cells": lambda seed: move_cells("move", seed)},
    # fixed permutations
    "retry-overflow": {"template": "t4", "band": 3, "build": build_overflow1, "fixed": True,
                       "title": "attempt log: a credit past the largest bigint, retried unchanged",
                       "sessions": ["s1"], "cells": lambda seed: overflow_cells(seed)},
    "retry-unique": {"template": "t4", "band": 3, "build": build_unique1, "fixed": True,
                     "title": "attempt log: a unique violation, retried blind and retried with a check",
                     "sessions": ["s1", "s2"], "cells": lambda seed: unique_cells(seed)},
})


def triple_cells(seed=GRID_SEED):
    """Three debits for the three-session pattern: one cell per balance. The
    amounts are the 'contend' pair plus a third on the same lattice."""
    cells = []
    for b in balances(seed):
        r = stream(f"amounts/rmw3/{b}", seed)
        lo = (b // 2 // 5 + 1) * 5
        a = [lo + 5 * r.randint(0, (b - lo) // 5) for _ in range(3)]
        if b == CANONICAL_BALANCE:
            a = [80, 80, 80]
        cells.append({"key": f"b{b}-contend3", "balance": b, "class": "contend3", "amounts": a})
    return cells


MIXED_LEVELS = [("rc", "rr"), ("rc", "ser"), ("rr", "rc"), ("rr", "ser"), ("ser", "rc"), ("ser", "rr")]


def level_assignments(pattern_name):
    """[(level key, {session: level})] for a pattern."""
    p = PATTERNS[pattern_name]
    sess = p["sessions"]
    if p.get("mixed"):
        return [(f"{a}-{b}", {"rd": a, "mv": b}) for a, b in MIXED_LEVELS]
    return [(lv, {s: lv for s in sess}) for lv in p.get("levels", UNIFORM_LEVELS)]


def cell_id(pattern, cell, levelkey):
    return f"{pattern}/{cell['key']}/{levelkey}"


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")

"""W0-S09 helpers: run PostgreSQL's own isolationtester in a container, parse the
spec and the output it prints, and attach SQLSTATEs from the server's csv log.

Standard library only. Run scripts that import this with `python3 -I`.

Why the csv log: isolationtester prints `ERROR:  <primary message>` and never the
SQLSTATE, but the course's retry policy is stated in SQLSTATEs. The server logs
every error with its SQLSTATE (csvlog column `sql_state_code`) and the session's
application_name, which isolationtester extends with the session name. This
module joins the two and refuses to continue when they disagree, error for
error and session by session.
"""
import csv
import hashlib
import io
import json
import os
import re
import subprocess
import time

CONTAINER = os.environ.get("W0S09_CONTAINER", "w0s09-pg")
# Paths inside the container. The tester is built from the PostgreSQL 18.6 source
# tarball and mounted read-only; the server's csv log is in its data directory.
TESTER = "/opt/pgsrc/src/test/isolation/isolationtester"
CONNINFO = "host=/var/run/postgresql user=postgres dbname=iso"
CSVLOG = "/var/lib/postgresql/18/docker/log/pg.csv"
# Seconds. isolationtester gives up on a step after 2 * this and exits after 4 *.
# A deadlock needs deadlock_timeout (1 s) to resolve, so 10 is generous.
STEP_TIMEOUT = 10


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha256_text(text):
    return sha256_bytes(text.encode("utf-8"))


def sha256_file(path):
    with open(path, "rb") as fh:
        return sha256_bytes(fh.read())


def utc_now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


# --------------------------------------------------------------------------
# docker
# --------------------------------------------------------------------------

def docker_exec(args, stdin=None, env=None, timeout=600):
    cmd = ["docker", "exec"]
    if stdin is not None:
        cmd.append("-i")
    for k, v in (env or {}).items():
        cmd += ["-e", f"{k}={v}"]
    cmd.append(CONTAINER)
    cmd += args
    return subprocess.run(cmd, input=stdin, capture_output=True, timeout=timeout)


def psql(sql, db="postgres"):
    r = docker_exec(["psql", "-U", "postgres", "-d", db, "-At", "-v", "ON_ERROR_STOP=1", "-c", sql])
    if r.returncode != 0:
        raise RuntimeError(f"psql failed: {r.stderr.decode()}")
    return r.stdout.decode()


def ensure_database():
    if psql("SELECT 1 FROM pg_database WHERE datname = 'iso'").strip() != "1":
        psql("CREATE DATABASE iso")


def reset_database():
    """Drop whatever a crashed run left behind (tables, and the roles H17 creates)."""
    ensure_database()
    psql("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;", db="iso")
    for role in ("alice", "bob", "mallory", "rls_user"):
        psql(f"DROP ROLE IF EXISTS {role};", db="iso")


class RunResult:
    def __init__(self, stdout, stderr, rc, secs, tag, argv):
        self.stdout = stdout
        self.stderr = stderr
        self.rc = rc
        self.secs = secs
        self.tag = tag
        self.argv = argv


def run_spec(spec_text, tag, step_timeout=STEP_TIMEOUT, datestyle=None, timeout=900):
    """Run one spec through isolationtester. `tag` becomes the application_name
    prefix, so the server log can be joined back to this run."""
    env = {"PGAPPNAME": tag, "PG_TEST_TIMEOUT_DEFAULT": str(step_timeout)}
    if datestyle:
        env["PGDATESTYLE"] = datestyle
    t0 = time.time()
    r = docker_exec([TESTER, CONNINFO], stdin=spec_text.encode("utf-8"), env=env, timeout=timeout)
    return RunResult(r.stdout.decode("utf-8"), r.stderr.decode("utf-8"), r.returncode,
                     time.time() - t0, tag, [TESTER, CONNINFO])


# --------------------------------------------------------------------------
# spec parsing
# --------------------------------------------------------------------------

class Spec:
    def __init__(self):
        self.setup = []        # main setup blocks
        self.teardown = None
        self.sessions = []     # [(name, [step names])]
        self.steps = {}        # step name -> (session name, sql)
        self.permutations = [] # [[(step name, markers)]]
        self.session_setup = {}

    def session_of(self, step):
        return self.steps[step][0]


_NAME = r'(?:"[^"]*"|[A-Za-z_][A-Za-z0-9_]*)'


def _unquote(name):
    return name[1:-1] if name.startswith('"') else name


def parse_spec(text):
    """Parse an isolationtester spec (the subset the README documents)."""
    spec = Spec()
    pos = 0
    n = len(text)
    session = None
    in_permutations = False

    def skip_ws_comments(p):
        while p < n:
            if text[p].isspace():
                p += 1
            elif text[p] == "#":
                while p < n and text[p] != "\n":
                    p += 1
            else:
                break
        return p

    def read_block(p):
        p = skip_ws_comments(p)
        if text[p] != "{":
            raise ValueError(f"expected '{{' at offset {p}")
        q = text.index("}", p)
        # like specscanner.l: horizontal whitespace after '{' and before '}' is
        # dropped; newlines inside the block are kept
        return text[p + 1:q].lstrip(" \t\r\f").rstrip(" \t\r\f"), q + 1

    kw = re.compile(r"[A-Za-z_]+")
    while True:
        pos = skip_ws_comments(pos)
        if pos >= n:
            break
        m = kw.match(text, pos)
        if not m:
            raise ValueError(f"unexpected character at offset {pos}: {text[pos:pos+20]!r}")
        word = m.group(0)
        pos = m.end()
        if word == "setup":
            block, pos = read_block(pos)
            if session is None:
                spec.setup.append(block)
            else:
                spec.session_setup[session] = block
        elif word == "teardown":
            block, pos = read_block(pos)
            if session is None:
                spec.teardown = block
        elif word == "session":
            pos = skip_ws_comments(pos)
            nm = re.compile(_NAME).match(text, pos)
            session = _unquote(nm.group(0))
            pos = nm.end()
            spec.sessions.append((session, []))
        elif word == "step":
            pos = skip_ws_comments(pos)
            nm = re.compile(_NAME).match(text, pos)
            step = _unquote(nm.group(0))
            pos = nm.end()
            sql, pos = read_block(pos)
            spec.steps[step] = (session, sql)
            spec.sessions[-1][1].append(step)
        elif word == "permutation":
            perm = []
            while True:
                pos = skip_ws_comments(pos)
                if pos >= n:
                    break
                nm = re.compile(_NAME).match(text, pos)
                if not nm:
                    break
                # a following keyword at the start of a token ends the permutation
                if nm.group(0) in ("permutation", "session", "setup", "teardown", "step") and not text.startswith("(", nm.end()):
                    break
                pos = nm.end()
                markers = None
                if pos < n and text[pos] == "(":
                    q = text.index(")", pos)
                    markers = text[pos + 1:q]
                    pos = q + 1
                perm.append((_unquote(nm.group(0)), markers))
            spec.permutations.append(perm)
        else:
            raise ValueError(f"unknown keyword {word!r}")
    return spec


# --------------------------------------------------------------------------
# output parsing
# --------------------------------------------------------------------------

LEVELS = {
    "READ COMMITTED": "READ COMMITTED",
    "REPEATABLE READ": "REPEATABLE READ",
    "SERIALIZABLE": "SERIALIZABLE",
}
_LEVEL_RE = re.compile(r"ISOLATION LEVEL (READ COMMITTED|REPEATABLE READ|SERIALIZABLE)", re.I)
_SEP_RE = re.compile(r"^-+(\+-+)*$")
_ROWS_RE = re.compile(r"^\((\d+) rows?\)$")
_STEP_RE = re.compile(r"^step (\S+): (.*)$")
_ERR_RE = re.compile(r"^(ERROR|FATAL|PANIC):  (.*)$")
_NOTICE_RE = re.compile(r"^(\S+): (NOTICE|WARNING|INFO):  (.*)$")
WAITING = " <waiting ...>"


def split_output(text):
    """Return (header, [(permutation step names, lines)]). The header is the
    'Parsed test spec' line. Raises if the text has anything else before the
    first permutation."""
    lines = text.split("\n")
    header = lines[0]
    blocks = []
    cur = None
    for ln in lines[1:]:
        if ln.startswith("starting permutation:"):
            cur = (ln[len("starting permutation:"):].split(), [])
            blocks.append(cur)
        elif cur is None:
            if ln.strip():
                raise ValueError(f"text before first permutation: {ln!r}")
        else:
            cur[1].append(ln)
    return header, blocks


def block_text(perm_names, lines):
    """Rebuild the verbatim text of one permutation block, as isolationtester
    printed it (a blank line, the 'starting permutation' line, the body)."""
    body = list(lines)
    while body and body[-1] == "":
        body.pop()
    return "starting permutation: " + " ".join(perm_names) + "\n" + "\n".join(body) + "\n"


def parse_block(perm_names, lines, spec):
    """Turn one permutation block into events.

    Events (dicts): step (name, sql, waiting), completed (name), rows (step,
    cols, rows), error (step, session, message), notice (session, text).
    Every line must be recognised; an unknown line raises, so nothing the tester
    printed is dropped silently."""
    events = []
    cur_step = None
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln == "":
            i += 1
            continue
        m = _STEP_RE.match(ln)
        if m:
            name, rest = m.group(1), m.group(2)
            i += 1
            if rest == "<... completed>":
                events.append({"type": "completed", "step": name})
            else:
                # a step whose SQL spans lines is printed over several lines; the
                # spec says how many, so take exactly that many
                extra = spec.steps[name][1].count("\n") if name in spec.steps else 0
                for _ in range(extra):
                    rest += "\n" + lines[i]
                    i += 1
                waiting = rest.endswith(WAITING)
                sql = rest[: -len(WAITING)] if waiting else rest
                if name in spec.steps and sql != spec.steps[name][1]:
                    raise ValueError(f"step {name}: printed SQL differs from the spec's")
                events.append({"type": "step", "step": name, "sql": sql, "waiting": waiting})
            cur_step = name
            continue
        m = _ERR_RE.match(ln)
        if m:
            events.append({"type": "error", "step": cur_step, "session": spec.session_of(cur_step),
                           "severity": m.group(1), "message": m.group(2)})
            i += 1
            continue
        m = _NOTICE_RE.match(ln)
        if m:
            events.append({"type": "notice", "step": cur_step, "session": m.group(1),
                           "severity": m.group(2), "message": m.group(3)})
            i += 1
            continue
        if ln.startswith("isolationtester: canceling step"):
            events.append({"type": "canceled", "step": cur_step, "text": ln})
            i += 1
            continue
        # a result table: header, separator, rows, "(N rows)"
        if i + 1 < len(lines) and _SEP_RE.match(lines[i + 1]):
            cols = [c.strip() for c in ln.split("|")]
            j = i + 2
            rows = []
            while j < len(lines) and not _ROWS_RE.match(lines[j]):
                rows.append([c.strip() for c in lines[j].split("|")])
                j += 1
            if j >= len(lines):
                raise ValueError(f"unterminated result table at {ln!r}")
            if int(_ROWS_RE.match(lines[j]).group(1)) != len(rows):
                raise ValueError(f"row count mismatch in table under step {cur_step}")
            events.append({"type": "rows", "step": cur_step, "cols": cols, "rows": rows})
            i = j + 1
            continue
        raise ValueError(f"unrecognised line in output: {ln!r}")
    return events


def summarize_block(perm_names, events, spec):
    """Derive what a reader of the history needs, mechanically from the events.

    Per session, transactions are split at steps whose SQL starts with BEGIN and
    closed at steps whose SQL is COMMIT, ROLLBACK or ABORT. A transaction that
    saw an error is an abort, because PostgreSQL ends it at the error and the
    later COMMIT only rolls back. The abort carries the SQLSTATE of the first
    error; later errors in the same transaction (25P02, "current transaction is
    aborted") are listed apart. This is a reading of the output, not a key:
    classifying the history is the history checker's job."""
    sessions = {}
    errors = []
    waits = []
    results = {}
    for ev in events:
        if ev["type"] == "step":
            if ev["waiting"]:
                waits.append(ev["step"])
        elif ev["type"] == "rows":
            results.setdefault(ev["step"], []).append({"cols": ev["cols"], "rows": ev["rows"]})
        elif ev["type"] == "error":
            errors.append({"session": ev["session"], "step": ev["step"], "message": ev["message"],
                           "sqlstate": ev.get("sqlstate")})
    # a session whose setup block begins a transaction (upstream specs do) starts the
    # permutation inside it; the level, if the setup names one, is recorded
    for sess, setup_sql in spec.session_setup.items():
        if setup_sql.lstrip().upper().startswith(("BEGIN", "START TRANSACTION")):
            lv = _LEVEL_RE.search(setup_sql)
            sessions[sess] = {"txns": [], "open": {
                "begin": "(session setup)", "level": lv.group(1).upper() if lv else None, "end": None,
                "error_step": None, "sqlstate": None, "message": None, "later_errors": []}}
    for step in perm_names:
        sess, sql = spec.steps[step]
        s = sessions.setdefault(sess, {"txns": [], "open": None})
        head = sql.lstrip().upper()
        if head.startswith("BEGIN") or head.startswith("START TRANSACTION"):
            lv = _LEVEL_RE.search(sql)
            s["open"] = {"begin": step, "level": lv.group(1).upper() if lv else None, "end": None,
                         "error_step": None, "sqlstate": None, "message": None, "later_errors": []}
        step_errs = [e for e in errors if e["step"] == step]
        if s["open"] is not None:
            for e in step_errs:
                if s["open"]["error_step"] is None:
                    s["open"]["error_step"] = step
                    s["open"]["sqlstate"] = e["sqlstate"]
                    s["open"]["message"] = e["message"]
                else:
                    s["open"]["later_errors"].append({"step": step, "sqlstate": e["sqlstate"]})
        tail = sql.strip().rstrip(";").strip().upper().split(";")[-1].strip()
        if s["open"] is not None and tail in ("COMMIT", "ROLLBACK", "ABORT", "END"):
            t = s["open"]
            t["end_step"] = step
            if t["error_step"] is not None:
                t["end"] = "abort"
            elif tail in ("COMMIT", "END"):
                t["end"] = "commit"
            else:
                t["end"] = "rollback"
            s["txns"].append(t)
            s["open"] = None
    for sess, s in sessions.items():
        if s["open"] is not None:
            s["open"]["end"] = "open"
            s["txns"].append(s["open"])
        del s["open"]
    return {"waits": waits, "errors": errors, "sessions": sessions, "results": results}


def perm_record(perm_names, summary):
    """The compact, reviewable record of one permutation."""
    levels = []
    outcome = {}
    for name in sorted(summary["sessions"]):
        txns = summary["sessions"][name]["txns"]
        if not txns:
            continue
        outs = []
        for t in txns:
            if t["level"] and t["level"] not in levels:
                levels.append(t["level"])
            outs.append(f"abort:{t['sqlstate']}" if t["end"] == "abort" else t["end"])
        outcome[name] = outs
    rec = {"permutation": perm_names, "levels": levels, "outcome": outcome, "waits": summary["waits"],
           "errors": [{"step": e["step"], "sqlstate": e["sqlstate"], "message": e["message"]}
                      for e in summary["errors"]]}
    later = [(n, t["later_errors"]) for n, s in summary["sessions"].items() for t in s["txns"] if t["later_errors"]]
    if later:
        rec["after_abort"] = [{"session": n, "later_errors": le} for n, le in later]
    return rec


def signature(rec):
    """One string for the outcome of a permutation: 's1=commit s2=abort:40001'."""
    return " ".join(f"{s}=" + "+".join(o) for s, o in sorted(rec["outcome"].items()))


# --------------------------------------------------------------------------
# server log
# --------------------------------------------------------------------------

CSV_FIELDS = ["log_time", "user_name", "database_name", "process_id", "connection_from", "session_id",
              "session_line_num", "command_tag", "session_start_time", "virtual_transaction_id",
              "transaction_id", "error_severity", "sql_state_code", "message", "detail", "hint",
              "internal_query", "internal_query_pos", "context", "query", "query_pos", "location",
              "application_name", "backend_type", "leader_pid", "query_id"]


def read_csvlog():
    r = docker_exec(["cat", CSVLOG])
    if r.returncode != 0:
        raise RuntimeError("cannot read the server csv log: " + r.stderr.decode())
    rows = []
    for rec in csv.reader(io.StringIO(r.stdout.decode("utf-8"))):
        if len(rec) != len(CSV_FIELDS):
            raise ValueError(f"csv log row has {len(rec)} fields, expected {len(CSV_FIELDS)}")
        rows.append(dict(zip(CSV_FIELDS, rec)))
    return rows


def errors_by_tag(rows):
    """{tag: {session: [row, ...]}} for ERROR and FATAL rows whose application
    name looks like '<tag>/<session>'. Rows are in log order."""
    out = {}
    for row in rows:
        if row["error_severity"] not in ("ERROR", "FATAL"):
            continue
        app = row["application_name"]
        if "/" not in app:
            continue
        tag, sess = app.split("/", 1)
        out.setdefault(tag, {}).setdefault(sess, []).append(row)
    return out


def attach_sqlstates(parsed_blocks, log_errors_for_tag):
    """Give every error event a SQLSTATE from the log.

    parsed_blocks: the list of per-permutation event lists of one tester run, in
    order. log_errors_for_tag: {session: [csv rows]} for the same run. For each
    session the messages printed by the tester must equal the messages logged by
    the server, in order; otherwise this raises."""
    printed = {}
    for events in parsed_blocks:
        for ev in events:
            if ev["type"] == "error":
                printed.setdefault(ev["session"], []).append(ev)
    sessions = set(printed) | set(log_errors_for_tag or {})
    for sess in sorted(sessions):
        p = printed.get(sess, [])
        l = (log_errors_for_tag or {}).get(sess, [])
        pm = [e["message"] for e in p]
        lm = [r["message"] for r in l]
        if pm != lm:
            raise ValueError(f"session {sess}: tester printed {pm} but the server logged {lm}")
        for ev, row in zip(p, l):
            ev["sqlstate"] = row["sql_state_code"]
            ev["detail"] = row["detail"]
            ev["hint"] = row["hint"]
    return sum(len(v) for v in printed.values())


def normalize_detail(text):
    """Process and transaction ids change from run to run; the words around them do not."""
    text = re.sub(r"[Pp]rocess \d+", "Process <pid>", text)
    text = re.sub(r"(transaction|pivot) \d+", r"\1 <xid>", text)
    text = re.sub(r"(relation|database) \d+", r"\1 <oid>", text)
    return text


def sqlstate_map(rows):
    """{message: {sqlstate: count}} over the ERROR rows of the log, with the
    detail and hint the server attached. Used to check that one message always
    maps to one SQLSTATE, and to record the server's own retry advice."""
    m = {}
    for row in rows:
        if row["error_severity"] not in ("ERROR", "FATAL"):
            continue
        e = m.setdefault(row["message"], {"sqlstates": {}, "details": {}, "hints": {}})
        e["sqlstates"][row["sql_state_code"]] = e["sqlstates"].get(row["sql_state_code"], 0) + 1
        if row["detail"]:
            d = normalize_detail(row["detail"])
            e["details"][d] = e["details"].get(d, 0) + 1
        if row["hint"]:
            e["hints"][row["hint"]] = e["hints"].get(row["hint"], 0) + 1
    return m


def server_info():
    """Which server and tester produced the outputs, for the indexes to carry."""
    version = psql("select version()").strip()
    tester_v = docker_exec([TESTER, "-V"]).stdout.decode().strip()
    tester_sha = docker_exec(["sha256sum", TESTER]).stdout.decode().split()[0]
    image = subprocess.run(["docker", "inspect", CONTAINER, "--format", "{{.Image}}"],
                           capture_output=True, text=True).stdout.strip()
    return {"server_version": version, "server_image_id": image, "tester_version": tester_v,
            "tester_binary_sha256": tester_sha}


def dumps(obj):
    return json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=False)

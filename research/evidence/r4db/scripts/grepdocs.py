import re, sys, html, os
d = sys.argv[1]
def text(name):
    s = open(os.path.join(d, f"doc-{name}.html"), encoding="utf-8", errors="replace").read()
    s = re.sub(r"<script.*?</script>|<style.*?</style>", " ", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s); s = html.unescape(s); return re.sub(r"\s+", " ", s)
def show(name, pats, width=260):
    t = text(name)
    for p in pats:
        ms = list(re.finditer(p, t))
        print(f"--- [{name}] /{p}/ hits={len(ms)}")
        for m in ms[:2]:
            print("   ", t[max(0, m.start()-width//2): m.end()+width].strip())
show("ddl-constraints", [r"check constraint is satisfied if the check expression evaluates to true or the null value"])
show("errcodes-appendix", [r"22003", r"40001", r"40P01", r"23505", r"23514"], 60)
show("functions-sequence", [r"never rolled back", r"not reclaimed"])
show("sql-createfunction", [r"LEAKPROOF indicates", r"[Oo]nly superusers"])
show("functions-admin", [r"is_local"])
show("explicit-locking", [r"pg_isolation_test_session_is_blocked", r"[Aa]dvisory locks"], 200)
show("transaction-iso", [r"Read Uncommitted", r"phantom"], 120)

import json, sys, glob, os, re
d = sys.argv[1]
p = json.load(open(os.path.join(d, 'pglite.json')))
print("PGLITE dist-tags:", p.get('dist-tags'))
t = p.get('time', {})
vs = [v for v in t if re.match(r'0\.(4|5)\.\d+$', v)]
for v in sorted(vs, key=lambda s: [int(x) for x in s.split('.')]):
    print("  ", v, t[v][:10])
latest = p['dist-tags']['latest']
vi = p['versions'][latest]
print("latest deps:", vi.get('dependencies'), "unpackedSize:", vi.get('dist',{}).get('unpackedSize'))
print("exports keys:", list((vi.get('exports') or {}).keys())[:60])
readme = p.get('readme','')
for kw in ['single', 'connection', 'Worker', 'multi', 'Postgres 1', 'PostgreSQL 1', 'size', 'MB', 'extension']:
    for m in re.finditer(kw, readme):
        s = max(0, m.start()-150); print(f"[{kw}]", readme[s:m.start()+200].replace('\n',' ')); break
print()
for f in sorted(glob.glob(os.path.join(d, 'crate_*.json'))):
    try:
        j = json.load(open(f)); c = j['crate']
        print(f"{c['name']}: max_stable={c.get('max_stable_version')} newest={c.get('newest_version')} updated={c.get('updated_at','')[:10]} downloads={c.get('downloads')} repo={c.get('repository')}")
    except Exception as e:
        print(f, 'ERR', e)

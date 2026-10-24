# Extracts a zip into an empty directory, keeping the unix modes and refusing any path that escapes. Run with python -I.
# Used by record-scaffold.mjs for the cvc5 release archive (the host has no unzip).
import os, stat, sys, zipfile
src, dest = sys.argv[1], os.path.abspath(sys.argv[2])
assert os.path.isdir(dest) and not os.listdir(dest), 'destination must be an empty directory'
with zipfile.ZipFile(src) as z:
    for info in z.infolist():
        target = os.path.abspath(os.path.join(dest, info.filename))
        if not (target == dest or target.startswith(dest + os.sep)):
            raise SystemExit(f'refusing {info.filename}')
        if info.is_dir():
            os.makedirs(target, exist_ok=True)
            continue
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with z.open(info) as r, open(target, 'wb') as w:
            w.write(r.read())
        mode = info.external_attr >> 16
        if stat.S_ISREG(mode) or mode == 0:
            os.chmod(target, (mode & 0o777) or 0o644)
print('extracted', len(z.infolist()), 'entries')

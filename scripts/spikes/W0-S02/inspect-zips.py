"""W0-S02: what is inside the two zip-like engine files, and what repeats.

Usage: python3 -I inspect-zips.py <out.json> <z3 wheel> <python_stdlib.zip>

Reads only the zip directories (names, sizes, CRCs, methods); nothing is extracted or executed. The first
load counts the wheel's bytes once, so an entry stored twice shows up here as bytes the browser downloads
twice: the report lists every group of entries with the same CRC-32 and size.
"""
import json
import sys
import zipfile
from collections import defaultdict


def inspect(path):
    z = zipfile.ZipFile(path)
    infos = z.infolist()
    methods = defaultdict(int)
    groups = defaultdict(list)
    for i in infos:
        methods[{0: "stored", 8: "deflated"}.get(i.compress_type, str(i.compress_type))] += 1
        if i.file_size >= 100_000:
            groups[(i.CRC, i.file_size)].append(i)
    repeated = [
        {
            "entries": [i.filename for i in g],
            "uncompressed_bytes_each": g[0].file_size,
            "compressed_bytes_each": g[0].compress_size,
            "extra_compressed_bytes": g[0].compress_size * (len(g) - 1),
            "symlink_flags": [bool((i.external_attr >> 16) & 0o120000 == 0o120000) for i in g],
        }
        for g in groups.values() if len(g) > 1
    ]
    largest = sorted(infos, key=lambda i: -i.compress_size)[:5]
    return {
        "file": path.split("/")[-1],
        "entries": len(infos),
        "methods": dict(methods),
        "compressed_bytes_total": sum(i.compress_size for i in infos),
        "uncompressed_bytes_total": sum(i.file_size for i in infos),
        "largest_by_compressed_size": [{"name": i.filename, "compressed": i.compress_size, "uncompressed": i.file_size} for i in largest],
        "repeated_large_entries": repeated,
    }


if __name__ == "__main__":
    out, *paths = sys.argv[1:]
    with open(out, "w") as f:
        json.dump([inspect(p) for p in paths], f, indent=1)
        f.write("\n")

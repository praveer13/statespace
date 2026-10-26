"""Subset the three self-hosted faces (DESIGN.md section 3.4) to WOFF2, deterministically.

    uv run --no-project --with fonttools==4.67.0 --with brotli==1.1.0 \
        python -I scripts/spikes/W1-T01/subset-fonts.py <plan.json> <out_dir>

The plan names each output: its source file, an axis plan (a range to keep, or a value to pin), the code points
to keep and the OpenType features; and the fallback faces to measure. The script writes the WOFF2 files and
prints a JSON report on stdout: per output, the code points kept and missing, the glyph count, the vertical
metrics and the average advance over the plan's sample text; per fallback, the same average. Timestamps are not
recalculated, so the same inputs give the same bytes.
"""

import json
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer


def average_advance(font: TTFont, sample: str) -> float:
    """The mean advance width of the sample's characters, in units of the em (missing characters skipped)."""
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    widths = [hmtx[cmap[ord(c)]][0] for c in sample if ord(c) in cmap]
    return sum(widths) / len(widths) / font["head"].unitsPerEm


def main(plan_path: str, out_dir: str) -> None:
    with open(plan_path, encoding="utf-8") as fh:
        plan = json.load(fh)
    report = []
    for item in plan["outputs"]:
        font = TTFont(item["source"], recalcTimestamp=False, recalcBBoxes=True)
        if "fvar" in font and item.get("axes"):
            limits = {}
            for tag, value in item["axes"].items():
                if isinstance(value, list):
                    limits[tag] = (value[0], value[1])
                elif value == "default":
                    axis = next(a for a in font["fvar"].axes if a.axisTag == tag)
                    limits[tag] = axis.defaultValue
                else:
                    limits[tag] = value
            font = instancer.instantiateVariableFont(font, limits, updateFontNames=False)
        cmap = font.getBestCmap()
        wanted = sorted(set(item["codepoints"]))
        kept = [cp for cp in wanted if cp in cmap]
        missing = [cp for cp in wanted if cp not in cmap]
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = item["features"]
        options.hinting = False
        options.desubroutinize = True
        options.notdef_outline = True
        options.name_IDs = [0, 1, 2, 3, 4, 5, 6]
        options.recalc_timestamp = False
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=kept)
        subsetter.subset(font)
        out = f"{out_dir}/{item['file']}"
        font.flavor = "woff2"
        font.save(out)
        head, hhea, os2 = font["head"], font["hhea"], font["OS/2"]
        report.append({
            "codepoints": kept,
            "averageAdvance": average_advance(font, plan["sample"]) if item.get("measure") else None,
            "file": item["file"],
            "glyphs": len(font.getGlyphOrder()),
            "kept": len(kept),
            "missing": [f"U+{cp:04X}" for cp in missing],
            "axes": [{"tag": a.axisTag, "min": a.minValue, "default": a.defaultValue, "max": a.maxValue} for a in font["fvar"].axes] if "fvar" in font else [],
            "metrics": {
                "unitsPerEm": head.unitsPerEm,
                "hheaAscender": hhea.ascent,
                "hheaDescender": hhea.descent,
                "hheaLineGap": hhea.lineGap,
                "typoAscender": os2.sTypoAscender,
                "typoDescender": os2.sTypoDescender,
                "typoLineGap": os2.sTypoLineGap,
                "winAscent": os2.usWinAscent,
                "winDescent": os2.usWinDescent,
                "useTypoMetrics": bool(os2.fsSelection & (1 << 7)),
                "xAvgCharWidth": os2.xAvgCharWidth,
                "capHeight": getattr(os2, "sCapHeight", None),
                "xHeight": getattr(os2, "sxHeight", None),
            },
        })
    fallbacks = {}
    for name, path in plan.get("fallbacks", {}).items():
        fb = TTFont(path, recalcTimestamp=False)
        fallbacks[name] = {"averageAdvance": average_advance(fb, plan["sample"]), "version": fb["head"].fontRevision}
    json.dump({"outputs": report, "fallbacks": fallbacks}, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

"""Glyph coverage of JuliaMono against the course's own content (RUN-juliamono-glyphs).

Run by record-juliamono.mjs, in isolated mode, with fontTools pinned:

    uv run --no-project --with fonttools==4.67.0 python -I glyph-coverage.py <corpus.json> <Regular.ttf> <SemiBold.ttf>

corpus.json maps a repository path to the committed text of that file. The script splits each Markdown file
into code (fenced blocks and inline code spans, which the design sets in JuliaMono) and prose (set in the
reading and structure faces), collects every non-ASCII code point, and checks each against the cmap of the
two JuliaMono weights the design uses (regular and semibold). It also checks the symbols of the design's
speech map (docs/DESIGN.md section 10.6, parsed from the corpus) and the symbols the design review names
(A7-15), and measures the advance widths of the covered code points.

Prints one JSON document on standard output.
"""
import json
import re
import sys
import unicodedata
from collections import Counter

from fontTools.ttLib import TTFont

# The symbols the design review's glyph measurement names (A7-15): "∀ ∃ ⊢ ⊨ □ ◇ ⟦ ⟧ ℤ ℕ ≜ ⇒ ∨ ∧ ↦ λ ⟨ ⟩ ∈ ⊆ ∪ ∩ ⊤ ⊥ ≡",
# and the two it says no Google Fonts face has, ᵢ and ⁻. That is 27 of the 49 it sampled; the other 22 are not
# listed on disk, so this run does not claim to reproduce the review's 49.
REVIEW_NAMED = "∀∃⊢⊨□◇⟦⟧ℤℕ≜⇒∨∧↦λ⟨⟩∈⊆∪∩⊤⊥≡ᵢ⁻"

# Ranges whose characters are logic or mathematical notation (or sub- and superscripts used in it).
NOTATION_RANGES = [
    (0x2070, 0x209F, "sub- and superscripts"),
    (0x2100, 0x214F, "letterlike symbols"),
    (0x2190, 0x21FF, "arrows"),
    (0x2200, 0x22FF, "mathematical operators"),
    (0x2300, 0x23FF, "miscellaneous technical"),
    (0x25A0, 0x25FF, "geometric shapes"),
    (0x27C0, 0x27EF, "miscellaneous mathematical symbols A"),
    (0x27F0, 0x27FF, "supplemental arrows A"),
    (0x2900, 0x297F, "supplemental arrows B"),
    (0x2980, 0x29FF, "miscellaneous mathematical symbols B"),
    (0x2A00, 0x2AFF, "supplemental mathematical operators"),
    (0x1D400, 0x1D7FF, "mathematical alphanumeric symbols"),
]


def notation_block(cp):
    for lo, hi, name in NOTATION_RANGES:
        if lo <= cp <= hi:
            return name
    return None


FENCE = re.compile(r"^(\s*)(`{3,}|~{3,})")
SPAN = re.compile(r"(`+)(.+?)(?<!`)\1(?!`)")


def split_markdown(text):
    """Return (code, prose) strings. Fenced blocks and inline code spans are code."""
    code, prose = [], []
    fence = None
    for line in text.split("\n"):
        m = FENCE.match(line)
        if fence is None and m:
            fence = m.group(2)[0] * len(m.group(2))
            continue
        if fence is not None:
            if line.strip().startswith(fence) and set(line.strip()) <= set(fence[0]):
                fence = None
            else:
                code.append(line)
            continue
        for span in SPAN.finditer(line):
            code.append(span.group(2))
        prose.append(SPAN.sub(" ", line))
    return "\n".join(code), "\n".join(prose)


def speech_map_symbols(text):
    """The non-ASCII symbols in the first column of the speech map table (DESIGN.md section 10.6)."""
    start = text.find("### 10.6 Notation speech map")
    end = text.find("GATE-glyphs fails on a symbol missing from this map", start)
    if start < 0 or end < 0:
        raise SystemExit("the speech map section was not found in docs/DESIGN.md")
    symbols = []
    for row in text[start:end].split("\n"):
        if not row.startswith("|") or row.startswith("|---") or row.startswith("| Symbol"):
            continue
        cell = row.split("|")[1]
        for token in re.split(r"\s+", cell.replace("·", " ").strip()):
            if token and all(ord(c) > 127 for c in token):
                symbols.extend(token)
    return list(dict.fromkeys(symbols))


def main(corpus_path, regular_path, semibold_path):
    corpus = json.load(open(corpus_path, encoding="utf-8"))
    fonts = {}
    for weight, path in (("regular", regular_path), ("semibold", semibold_path)):
        f = TTFont(path)
        fonts[weight] = {"font": f, "cmap": f.getBestCmap()}
    reg = fonts["regular"]["font"]
    name_table = reg["name"]

    in_code, in_prose = Counter(), Counter()
    per_file = {}
    for path, text in corpus.items():
        code, prose = split_markdown(text)
        c = Counter(ch for ch in code if ord(ch) > 127)
        p = Counter(ch for ch in prose if ord(ch) > 127)
        in_code.update(c)
        in_prose.update(p)
        per_file[path] = {"code_codepoints": len(c), "prose_codepoints": len(p)}

    speech = speech_map_symbols(corpus["docs/DESIGN.md"])
    review = list(REVIEW_NAMED)
    everything = sorted(set(in_code) | set(in_prose) | set(speech) | set(review), key=ord)

    def covered(weight, ch):
        return ord(ch) in fonts[weight]["cmap"]

    rows = []
    for ch in everything:
        cp = ord(ch)
        rows.append({
            "codepoint": f"U+{cp:04X}",
            "char": ch,
            "name": unicodedata.name(ch, "UNNAMED"),
            "category": unicodedata.category(ch),
            "notation_block": notation_block(cp),
            "in_code": in_code.get(ch, 0),
            "in_prose": in_prose.get(ch, 0),
            "in_speech_map": ch in speech,
            "in_review_sample": ch in review,
            "regular": covered("regular", ch),
            "semibold": covered("semibold", ch),
        })

    def missing(selector, weight="regular"):
        return [f"{r['codepoint']} {r['char']} {r['name']}" for r in rows if selector(r) and not r[weight]]

    code_rows = [r for r in rows if r["in_code"]]
    prose_rows = [r for r in rows if r["in_prose"]]
    prose_notation = [r for r in prose_rows if r["notation_block"] or r["category"] == "Sm"]

    # one advance width? widths of the covered code points that carry a mark (width 0 is a combining mark)
    advances = Counter()
    hmtx = reg["hmtx"]
    for r in rows:
        if (r["in_code"] or r["in_speech_map"] or r["in_review_sample"]) and r["regular"]:
            glyph = fonts["regular"]["cmap"][ord(r["char"])]
            advances[hmtx[glyph][0]] += 1

    result = {
        "font": {
            "family": name_table.getDebugName(1),
            "version_string": name_table.getDebugName(5),
            "units_per_em": reg["head"].unitsPerEm,
            "regular_glyphs": len(reg.getGlyphOrder()),
            "regular_cmap_codepoints": len(fonts["regular"]["cmap"]),
            "semibold_glyphs": len(fonts["semibold"]["font"].getGlyphOrder()),
            "semibold_cmap_codepoints": len(fonts["semibold"]["cmap"]),
            "is_fixed_pitch": bool(reg["post"].isFixedPitch),
            "fonttools": __import__("fontTools").version,
            "python": sys.version.split()[0],
        },
        "corpus": {"files": len(corpus), "per_file": per_file},
        "speech_map": {
            "symbols": len(speech),
            "missing_regular": missing(lambda r: r["in_speech_map"]),
            "missing_semibold": missing(lambda r: r["in_speech_map"], "semibold"),
        },
        "review_named": {
            "symbols": len(review),
            "missing_regular": missing(lambda r: r["in_review_sample"]),
            "missing_semibold": missing(lambda r: r["in_review_sample"], "semibold"),
        },
        "code_role": {
            "distinct_non_ascii": len(code_rows),
            "occurrences": sum(r["in_code"] for r in code_rows),
            "missing_regular": missing(lambda r: r["in_code"]),
            "missing_semibold": missing(lambda r: r["in_code"], "semibold"),
        },
        "prose_role": {
            "distinct_non_ascii": len(prose_rows),
            "occurrences": sum(r["in_prose"] for r in prose_rows),
            "notation_symbols": len(prose_notation),
            "notation_occurrences": sum(r["in_prose"] for r in prose_notation),
            "notation_in_juliamono": sum(1 for r in prose_notation if r["regular"]),
            "notation_missing_regular": [f"{r['codepoint']} {r['char']} {r['name']}" for r in prose_notation if not r["regular"]],
            "not_in_juliamono": len([r for r in prose_rows if not r["regular"]]),
        },
        "advance_widths": {str(k): v for k, v in sorted(advances.items())},
        "rows": rows,
    }
    json.dump(result, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main(*sys.argv[1:4])

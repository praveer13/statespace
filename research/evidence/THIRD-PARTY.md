# Third-party code used by the spikes

The spike harnesses in this folder ran against the upstream components below. Their copies are not committed, because this folder publishes evidence (our harnesses, logs and outputs), not other projects' code. To re-run a harness, restore each component at its pinned version into the path shown. `.gitignore` keeps the restored copies out of commits.

| Restore into | Component | Pin | License | How to restore |
|---|---|---|---|---|
| `A5v2/spectacle-run/site/spectacle/` | [Spectacle](https://github.com/will62794/spectacle), with the libraries it bundles under `js/lib/` (jQuery 3.3.1, Bootstrap, Popper, Lodash, CodeMirror, Mithril, Immutable, cytoscape-dagre, Clusterize) and its tree-sitter TLA+ parser | commit `5827c22` (2026-09-30) | MIT; each bundled library keeps its own license | `git clone https://github.com/will62794/spectacle A5v2/spectacle-run/site/spectacle && git -C A5v2/spectacle-run/site/spectacle checkout 5827c22` |
| `A5spike/browser/site/pyodide/` and `A5r3/xorigin/inst/pyodide/` | [Pyodide](https://github.com/pyodide/pyodide) npm package | `pyodide@314.0.7` | MPL-2.0 | `npm pack pyodide@314.0.7`, then extract the package's files into each folder |
| `exp/site/coi/coi-serviceworker.js` | [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) | `coi-serviceworker@0.1.7` | MIT | `npm pack coi-serviceworker@0.1.7`, then copy `coi-serviceworker.js` |
| `exp/site/cvc5/cvc5.js` | an Emscripten JavaScript loader for a cvc5 build, kept without its `.wasm` binary | provenance not recorded | unknown | Not restorable, and no cited run depends on it. The course's cvc5 facts come from cvc5 1.4.2 on the Bench (`labs/TOOLS.md`), and the docs still record a cvc5 WASM build as not found [U]. |

Every other file in this folder is the course's own harness, log or output, or a saved public API response (npm and PyPI metadata, with personal maintainer emails replaced by `[email removed]`).

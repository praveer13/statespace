### fast lane: FAIL in 33.8 s (budget 300 s)

| Step | Result | Seconds | Verdict |
|---|---|---:|---|
| vendor-verify | pass | 0.4 | vendor-drift: ok (34 files match VENDOR.md at 5ab8883e8431) |
| lint-purity | pass | 0.3 | purity-lint: ok (25 package files pure; 7 app files import vendor/ only through a wrapper home) |
| typecheck | pass | 5.0 | no output |
| unit-tests | fail | 7.2 | 145 tests, 143 passed, 1 failed, 1 skipped |
| build | pass | 3.4 | ✓ built in 628ms |
| lane-tests | pass | 4.4 | 68 tests, 67 passed, 0 failed, 1 skipped |
| GATE-numbers | pass | 0.5 | GATE-numbers: PASS (2634 tokens in 40 files, 73 known; 0.5 s) |
| GATE-facts | pass | 0.4 | GATE-facts: PASS (3 value tags stated, 1 value reference, 13 facts, 0 TTL warnings; 0.3 s) |
| GATE-links | fail | 0.2 | GATE-links: FAIL (1 finding(s)) |
| GATE-budget | pass | 0.1 | GATE-budget: green (4 warnings), 4 notes |
| GATE-privacy | fail | 0.8 | vendor-license vendor/kernelspace/  a vendored directory (inside vendor/) without its own license file |
| GATE-schema | pass | 5.7 | GATE-schema: PASS (22 checks; 5.7 s) |
| GATE-runs | pass | 0.1 | GATE-runs: PASS (67 records, 1695 resolved references; 0.1 s) |

Not built yet (15): GATE-calls (W1-T05), GATE-interp (W2-T08), GATE-items (W1-T39), GATE-audit-blind (W1-T40), GATE-generators (W1-T05), GATE-kc (W1-T04), GATE-stamps (W1-T01), GATE-codes (W1-T01), GATE-claims (W1-T15), GATE-coverage, GATE-glyphs (W6-T03), GATE-bundle (W1-T41), GATE-guardrails (W1-T18), GATE-lessons (W1-T38), GATE-erosions (W2-T42).


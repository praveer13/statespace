# broken/: your checker, miscompiled on purpose (LAB-4.7)

TODO(you): copy your finished `miniplinth-check/` crate here (`Cargo.toml` and `src/`), then miscompile one
construct so that a known-false obligation is reported PROVED. Tag the line you changed with a comment
`// MISCOMPILE` and say what the source says, for example `// MISCOMPILE: source says le`.

Dropping a frame conjunct is not enough: it only gives a false alarm. Over-constrain instead: strengthen a
guard, drop an effect, or widen a frame. Nothing in `broken/` is ever deleted (labs/README.md section 9.3).

The check builds this crate and `fixed/` side by side. The template's files (`src/json.rs`, `src/ir.rs`,
`src/smt.rs`, `src/main.rs`) must be the same bytes in both, and reverting the hunk tagged `MISCOMPILE`
must give REFUTED again, so locating the bug is graded.

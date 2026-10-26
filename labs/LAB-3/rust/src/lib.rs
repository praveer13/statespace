//! Your Mini-Plinth front end and interpreter (LAB-3.8 to LAB-3.11).
//!
//! The template supplies `json` and `ir` (read-only) and the driver in `main.rs`. You write:
//!
//! - `parser::parse_program`: the toy syntax to IR (LAB-3.8);
//! - `typecheck::typecheck`: your `HasType`, rule for rule (LAB-3.9);
//! - `interp::exec`: your evaluator, outcome for outcome, under any policy (LAB-3.10).
//!
//! `cargo test` runs your own tests; `statespace check lab3.8` (and .9, .10, .11) builds the crate with
//! `cargo build --release --offline` and runs the `mp3` binary on the corpus and the goldens. Keep the library
//! free of I/O, so that it also builds to a wasm module with no imports for the tab.
pub mod interp;
pub mod ir;
pub mod json;
pub mod parser;
pub mod typecheck;

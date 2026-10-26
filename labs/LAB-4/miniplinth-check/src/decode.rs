//! LAB-4.5 (capstone S10.L3): `model_decode` and `verdict_compose`.
//!
//! `model_decode` request: `{"program": Program, "command": "<name>", "model": {"a": "5", "a_p": "(- 1)",
//! "p_amount": "6", ...}}`, the constants of Z3's model as Z3 printed their values. Reply:
//! `{"pre": {"a": 5, ...}, "params": {"amount": 6}, "post": {"a": -1, ...}}`: a Mini-Plinth state, the
//! parameters and the post-state. The host replays it in the course's interpreter.
//!
//! `verdict_compose` request: `{"mode": "check", "command": "<name>",
//!   "obligation": {"verdict": "sat"|"unsat"|"unknown", "replay": "violation"|"no-replay"|null},
//!   "premise": {"verdict": "sat"|"unsat"|null, "replay": "success"|"no-replay"|null},
//!   "solver": {"name": "Z3", "version": "5.3.1", "rlimit": 5000000}}`.
//! Reply: `{"verdict": "PROVED"|"REFUTED"|"SPURIOUS"|"VACUOUS"|"UNKNOWN", "stamp": "...", "defeaters": [...]}`.
//! The stamp of a proof reads `PROVED [P] · Z3 <version> unsat · uncertified · rlimit <rlimit>`, and of
//! a refutation `REFUTED [R] · 1 step`. A model that does not replay is a defect in the generator: report
//! it as SPURIOUS, never as REFUTED.

use crate::json::Value;

// TODO(you): LAB-4.5: read each model value (an Int prints as 5 or (- 5)) and split the names into the
// pre-state, the parameters and the post-state.
pub fn model_decode(arg: &Value) -> Result<Value, String> {
    let _ = arg;
    Err("TODO(you): model_decode is not written yet (LAB-4.5)".into())
}

// TODO(you): LAB-4.5: the table of S4.L7: what each answer and replay result lets the checker report.
pub fn verdict_compose(arg: &Value) -> Result<Value, String> {
    let _ = arg;
    Err("TODO(you): verdict_compose is not written yet (LAB-4.5)".into())
}

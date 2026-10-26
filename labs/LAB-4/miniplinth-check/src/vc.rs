//! LAB-4.4: `vc_emit`, the obligation `Inv ∧ Guard ∧ Step ∧ ¬Inv′` of one command, as SMT-LIB.
//!
//! Request: `{"program": Program, "command": "<name>", "inv": Form, "route": "forward" | "wp"}`.
//! Reply: `{"defs": [...], "assert": "<SMT-LIB Bool term>"}`. The host declares the accounts (`x`), their
//! post-state (`x_p`) and the parameters (`p_<name>`), adds your defs and one `(assert <your term>)`, and
//! asks `(check-sat)`. Declare nothing yourself.
//!
//! Name the conjuncts with `(! term :named name)`: `inv_pre`, `guard`, `step_<i>` for each equation of the
//! step, `frame_<k>` for each account k the command leaves alone, and `neg_inv_post`. The checks find
//! them by name: the premise witness is your query without `neg_inv_post`, and LAB-4.4 deletes each
//! `frame_<k>` in turn.

use crate::json::Value;

// TODO(you): LAB-4.4: the forward route (symbolic execution of the body, a step equation per written
// account, a frame per untouched account) and the wp route (Inv ∧ Guard ∧ ¬wp(body, Inv)).
pub fn vc_emit(arg: &Value) -> Result<Value, String> {
    let _ = arg;
    Err("TODO(you): vc_emit is not written yet (LAB-4.4)".into())
}

//! LAB-4.2 and LAB-4.3: `wp_emit`, the weakest precondition of a command, as SMT-LIB.
//!
//! Request: `{"program": {"accounts": [...], "commands": []}, "params": [...], "cmd": Cmd, "post": Form}`.
//! Reply: `{"defs": ["(define-fun ...)", ...], "formula": "<SMT-LIB Bool term>"}`, a formula over the
//! accounts (before the command) and the parameters (`p_<name>`). `defs` may be empty. Names that start
//! `ref_` are the reference's; use any others.
//!
//! LAB-4.2 grades assignments and ResourceOps (`move`), aliasing and capture-prone postconditions
//! included. LAB-4.3 adds `seq`, `if` and the four readings of a guard, and a chain of 12 sequential
//! `if`s whose reply must stay small.

use crate::json::Value;

// TODO(you): LAB-4.2: wp of skip, assign and move, by substitution into the postcondition. Read the
// request with crate::ir (ir::program, ir::name_list, ir::cmd, ir::form) and print with crate::smt.
// TODO(you): LAB-4.3: seq, if, and the guard under abort, assert, assume and reject.
pub fn wp_emit(arg: &Value) -> Result<Value, String> {
    let _ = arg;
    Err("TODO(you): wp_emit is not written yet (LAB-4.2)".into())
}

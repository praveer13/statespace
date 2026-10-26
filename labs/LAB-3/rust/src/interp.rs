//! LAB-3.10: your reference interpreter, outcome for outcome the same as your Lean `exec`
//! (labs/LAB-3/Lab3/Eval.lean), under any policy the request names: the same outcome order, the same lists in
//! the same order in the state. Balances are `i128`: the boundary goldens step past 2^63 - 1.

use crate::ir::{Call, Err, Outcome, Policy, Program, State};

pub fn exec(_pol: &Policy, _p: &Program, c: &Call, _s: &State) -> Outcome {
    // TODO(you)
    Outcome::Error(Err::UnknownCommand(c.name.clone()))
}

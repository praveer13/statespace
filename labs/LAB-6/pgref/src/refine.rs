//! Your refinement relation R(S, D) (LAB-6.7). D is the database as rows; S is the abstract state the
//! reference semantics runs on. `statespace check lab6.7` asks the course's abstract-serializability
//! checker to classify the fixtures in labs/LAB-6/fixtures/ with your alpha and your R.

#[allow(unused_imports)]
use crate::model::{Db, State};

/// TODO(you): alpha(D), the abstract state a database stands for: each account's balance, and the amount
/// held against each account (the sum of its holds).
pub fn alpha(d: &Db) -> State {
    let mut s = State::default();
    for (id, bal) in &d.acct {
        s.bal.insert(id.unwrap_or(0), bal.unwrap_or(0));
    }
    s
}

/// TODO(you): wf(D), the databases that stand for some state at all.
pub fn wf(_d: &Db) -> bool {
    true
}

/// TODO(you): R(S, D).
pub fn r(s: &State, d: &Db) -> bool {
    let total: i64 = s.bal.values().sum();
    let other: i64 = alpha(d).bal.values().sum();
    wf(d) && total == other
}

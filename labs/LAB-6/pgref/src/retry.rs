//! Your retry policy (LAB-6.6). `statespace check lab6.6` feeds your `decide` the attempts of a command one
//! by one, from the course's attempt fixtures and from a live serialization failure on PostgreSQL, and
//! reads what you decide after each: retry the whole command from BEGIN, stop with the attempt's outcome,
//! or give up.

#[allow(unused_imports)]
use crate::model::{Attempt, Outcome};

/// TODO(you): your retry budget: how many attempts a command gets in all.
pub const K: u32 = 3;

/// What your policy declares about a command.
pub struct Policy {
    /// The command re-reads the key before it writes, so a retry decides again on fresh data.
    #[allow(dead_code)]
    pub rereads_key: bool,
}

pub enum Decision {
    Retry,
    Stop,
    GaveUp,
}

/// TODO(you): decide after the last of `attempts`. Retry the decision, not the statement.
pub fn decide(_policy: &Policy, attempts: &[Attempt]) -> Decision {
    match attempts.last() {
        Some(Attempt::Sqlstate(code)) if code == "40001" => Decision::Retry,
        _ => Decision::Stop,
    }
}

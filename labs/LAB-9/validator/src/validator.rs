//! LAB-9.11 · your validator: does a generated plan mean what its source command means?
//!
//! Lift each statement to the IR's terms, run the plan and the source over every instance within your bound,
//! and compare outcome classes: committed with the same balances, a typed error, or a SQLSTATE such as 23514
//! (the CHECK on `bal >= 0`). Reject with an instance that tells them apart. A shape check (two UPDATEs, each
//! `WHERE id = $k`, each expecting one row) is not enough: the shape-only mutant passes it.

use crate::plan::Case;

/// A database instance and the parameters of one call.
pub struct Instance {
    pub accounts: Vec<(i64, i64)>, // (id, bal), each row schema-valid: distinct ids, bal >= 0
    pub params: Vec<i64>,          // $1, $2, ... in order
}

pub enum Verdict {
    Accept { bound: String },
    Reject { bound: String, instance: Instance, source: (usize, usize, usize) },
}

impl Verdict {
    /// The line `statespace check` reads. Every verdict prints its bound (or its n).
    pub fn line(&self) -> String {
        match self {
            Verdict::Accept { bound } => format!("accept {bound}"),
            Verdict::Reject { bound, instance, source } => {
                let accounts = if instance.accounts.is_empty() { "none".to_string() } else { instance.accounts.iter().map(|(i, b)| format!("{i}:{b}")).collect::<Vec<_>>().join(",") };
                let p = |k: usize| instance.params.get(k - 1).copied().unwrap_or(0);
                format!("reject {bound} instance accounts={accounts} from={} to={} amount={}", p(source.0), p(source.1), p(source.2))
            }
        }
    }
}

/// TODO(you): the semantic check. The placeholder accepts every plan and states no bound, so it fails all
/// four parts of LAB-9.c11.
pub fn validate(_case: &Case) -> Verdict {
    Verdict::Accept { bound: String::new() }
}

//! Your differential harness's generator and comparison (LAB-6.4). `statespace check lab6.4` runs your
//! compiled plans on the commands you generate, from the accounts in model.rs ACCOUNTS, and asks your
//! comparison whether each result matches the reference interpreter's. It then runs the course's three
//! mutants of your plan (a guard left to the CHECK constraint, an unchecked credit, and the case-merge)
//! and asks your comparison again: your suite must catch each one.

#[allow(unused_imports)]
use crate::model::{Observation, Outcome, Rng, Transfer, ACCOUNTS};

/// TODO(you): draw n commands from the seed. A test reaches only what its generator draws: which
/// commands does each mutant get wrong?
pub fn generate(seed: u64, n: usize) -> Vec<Transfer> {
    let mut rng = Rng::new(seed);
    (0..n)
        .map(|_| {
            let from = rng.range(1, ACCOUNTS.len() as i64);
            let to = from % ACCOUNTS.len() as i64 + 1;
            Transfer { from, to, amount: rng.range(1, 50) }
        })
        .collect()
}

/// TODO(you): is what the database did the same as what the reference did?
pub fn compare(reference: &Observation, observed: &Observation) -> bool {
    reference.balances == observed.balances
}

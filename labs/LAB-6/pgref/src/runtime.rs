//! Your transaction runtime (LAB-6.8): what opens each transaction, and what it accepts as the session's
//! isolation level. `statespace check lab6.8` runs every command through it on its own connection: your
//! `begin` statements, then `SHOW transaction_isolation`, which your `level_ok` must accept, then your
//! compiled plan and COMMIT, with your retry policy deciding after each attempt.

/// TODO(you): the statements that open a transaction.
pub fn begin() -> Vec<String> {
    vec!["BEGIN".to_string()]
}

/// TODO(you): whether the level the session reads back is one your claims can rest on.
pub fn level_ok(_read_back: &str) -> bool {
    true
}

//! Your compiler: Transfer -> Plan (LAB-6.2, LAB-6.3). Read model.rs for what a plan is and how
//! `statespace check` runs it.

#[allow(unused_imports)]
use crate::decision::{SelfTransferDecision, SELF_TRANSFER};
#[allow(unused_imports)]
use crate::model::{Expect, Outcome, Plan, Role, Side, Step, Transfer};

/// TODO(you): compile a transfer into a plan in which every statement expects exactly the rows it must
/// touch, and every zero becomes a named outcome: `Insufficient`, `NoSuchAccount(From)` or
/// `NoSuchAccount(To)`, in the reference's order (model.rs). Put your self-transfer decision into the plan
/// (LAB-6.3). The plan below debits and credits with no guard and no expectation: run `statespace check
/// lab6.2` to see what that does.
pub fn compile(t: &Transfer) -> Plan {
    Plan {
        decided: None,
        steps: vec![
            Step {
                role: Role::Debit,
                sql: "UPDATE acct SET bal = bal - $2 WHERE id = $1".to_string(),
                params: vec![t.from, t.amount],
                expect: Expect::Any,
                on_mismatch: Outcome::Insufficient,
            },
            Step {
                role: Role::Credit,
                sql: "UPDATE acct SET bal = bal + $2 WHERE id = $1".to_string(),
                params: vec![t.to, t.amount],
                expect: Expect::Any,
                on_mismatch: Outcome::NoSuchAccount(Side::To),
            },
        ],
    }
}

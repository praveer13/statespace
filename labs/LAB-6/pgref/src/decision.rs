//! Your self-transfer decision (LAB-6.3; the decision you recorded in LAB-3.7). A transfer from an account
//! to itself either is refused (`Refuse`: the outcome is SelfTransfer) or commits and changes nothing
//! (`NoOp`: the outcome is Committed). The reference interpreter grades your plans against the decision
//! you state here.

#[allow(dead_code)]
pub enum SelfTransferDecision {
    Refuse,
    NoOp,
}

// TODO(you): state your decision, the one your LAB-3.7 decision record names.
pub const SELF_TRANSFER: SelfTransferDecision = SelfTransferDecision::Refuse;

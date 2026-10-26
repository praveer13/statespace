//! LAB-3.9: your type checker, mirroring your Lean `HasType` (labs/LAB-3/Lab3/Typing.lean) rule for rule and
//! in the same order: R-param (`dupParam`), the guard (R-var `unknownParam`, R-expr `wrongType`, a `bool`),
//! then the statement from left to right (R-amount `nonPositive`, R-cover `unguardedDebit`, R-set
//! `assignsResource`, R-hold `wrongType`).

use crate::ir::{Cmd, TypeErr};

pub fn typecheck(_c: &Cmd) -> Result<(), TypeErr> {
    // TODO(you)
    Err(TypeErr::WrongType)
}

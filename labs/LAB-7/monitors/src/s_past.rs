//! S-past, "revocation removes what was already read": after `Revoke(u, d)`, no page of d is in u's
//! delivered log, `□[Revoke(u, d) ⇒ d ∉ delivered′[u]]_vars`. It is the refuted twin of S-new: write it
//! faithfully, so that a real trace refutes it. TODO(you)
//!
//! Reject a trace at the first `Revoke` step after which the revoked user's log still holds a page of the
//! revoked document (a page is `<doc>@<version>`); accept it otherwise.

use crate::{Event, Verdict};

pub fn check(trace: &[Event]) -> Verdict {
    // TODO(you): find each Revoke step, and look at what the revoked user's log holds right after it.
    let _ = trace;
    Verdict::Accept
}

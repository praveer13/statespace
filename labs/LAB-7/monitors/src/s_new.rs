//! S-new, "after revocation, no new read succeeds": every successful read is one the authoritative state
//! allows, the safety property `□[ReadOK(u, d) ⇒ canread(u, d)]_vars` of S7.L8. TODO(you)
//!
//! Accept a trace in which every `ReadOK` step has `canread`; reject it at the first step that has not.

use crate::{Event, Verdict};

pub fn check(trace: &[Event]) -> Verdict {
    // TODO(you): walk the trace and reject at the first ReadOK step whose state does not allow the read.
    let _ = trace;
    Verdict::Accept
}

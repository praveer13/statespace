//! LAB-8.7: turn a failing run into a specimen that replays from its seed. The harness calls `mount` for every
//! run that broke a property, and writes what it returns to `specimens/sim/seed-<seed>.json`. A specimen is
//! labeled from its run, never typed by hand: take every field from the failure and the outcome.
//!
//! `statespace check lab8.7` plants a failure (a fresh key per attempt) under fault seeds it draws, and checks
//! that every failing seed is mounted, and that replaying the specimen's seed breaks the same property at the
//! same step.

use crate::world::{Outcome, Violation};

/// A specimen record. The harness writes it as JSON.
pub struct Specimen {
    pub seed: u64,
    /// the mutant the run was made with ("none" for your own machine)
    pub mutant: String,
    /// the property the run broke: NoDoubleCharge, AckedIsDurable or NoLostIntent
    pub violates: String,
    /// the harness step at which it broke
    pub step: u32,
    /// the number of trace lines when it broke
    pub line: usize,
    /// what broke, in the harness's words
    pub because: String,
    /// the faults the schedule injected
    pub faults: u32,
    /// the SHA-256 of the run's trace, so a replay can be compared
    pub trace_sha256: String,
}

/// Label a failing run. Return None to mount nothing.
pub fn mount(seed: u64, mutant: &str, violation: &Violation, outcome: &Outcome, trace_sha256: &str) -> Option<Specimen> {
    // TODO(you): build the specimen from the run: its seed, the property and step it broke, and its trace hash.
    let _ = (seed, mutant, violation, outcome, trace_sha256);
    None
}

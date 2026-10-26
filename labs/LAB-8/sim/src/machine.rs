//! LAB-8.4: your outbox worker as a sans-I/O machine. It has no clock, no randomness, no network and no disk:
//! everything it learns arrives as an `Input`, and everything it does is an `Output` the harness carries out
//! (`world.rs` says what each one does and which log line it writes). The same inputs must give the same outputs,
//! step after step.
//!
//! What the checks hold it to (LAB-8.4): with a deduplicating provider, no double charge; no intent left behind;
//! an intent acknowledged only once its result is stored; and identical traces for a seed run twice. Recovery
//! acts on what is durable: after `Restarted(rows)` your memory is empty, and the rows are all you know.
//! Use one key per intent, the key minted at commit, for every attempt.

use crate::world::{Input, Output};

/// What the worker keeps in memory. A crash drops it, and the harness makes a new one with `Machine::new()`.
pub struct Machine {
    // TODO(you): the worker's memory.
}

impl Machine {
    pub fn new() -> Machine {
        Machine {}
    }

    /// One step: an input in, the outputs the harness carries out, in order.
    pub fn step(&mut self, input: Input) -> Vec<Output> {
        // TODO(you): handle Commit, Tick, Reply and Restarted. As written, the worker does nothing, so every
        // committed intent is left behind.
        let _ = input;
        Vec::new()
    }
}

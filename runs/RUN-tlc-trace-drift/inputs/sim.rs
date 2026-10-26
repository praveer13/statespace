// RUN-tlc-trace-drift: a minimal outbox simulator for AUD-8.2 (content/audit/AUD-8.2.yaml). One command, c1, on a
// fault-free schedule (seed 1: no crash, no timer firing, the provider answers once). The worker's path is the
// case's own worker.rs, included below; the log is NDJSON in the shape S8.L6 reads, one event per line. The
// provider's Accept is not logged, as in the lesson. `rustc --test` builds the end-state suite instead of main.
use std::collections::{HashMap, HashSet};
use std::io::Write;

pub struct Reply { pub cmd: String }

#[derive(Default)]
pub struct Worker {
    log: Vec<String>,
    tx: Vec<String>,                 // rows written in the open transaction
    pub status: HashMap<String, &'static str>,
    pub durable: HashSet<String>,
    attempts: HashMap<String, u32>,
    inflight: Vec<(String, u32)>,    // requests on the wire: (command, attempt)
    seen: HashSet<String>,           // the provider's idempotency table
    pub charges: HashMap<String, u32>,
    got: HashSet<String>,
}

impl Worker {
    fn emit(&mut self, line: String) { self.log.push(line); }
    pub fn begin(&mut self) { self.tx.clear(); }
    pub fn insert_command(&mut self, c: &str) { self.tx.push(format!("command {c}")); }
    pub fn insert_intent(&mut self, c: &str) { self.tx.push(format!("intent {c}")); }
    pub fn commit(&mut self, c: &str) {
        self.tx.clear();
        self.status.insert(c.into(), "pending");
        self.emit(format!(r#"{{"event":"Commit","cmd":"{c}"}}"#));
    }
    pub fn dispatch(&mut self, c: &str) {
        let a = self.attempts.get(c).copied().unwrap_or(0) + 1;
        self.attempts.insert(c.into(), a);
        self.inflight.push((c.into(), a));
        self.status.insert(c.into(), "inflight");
        self.emit(format!(r#"{{"event":"Dispatch","cmd":"{c}","key":["{c}",0],"att":{a}}}"#));
    }
    pub fn arm_timer(&mut self, c: &str) { self.emit(format!(r#"{{"event":"TimerArmed","cmd":"{c}"}}"#)); }
    /// The provider: performs the effect unless it has seen the key. Not logged.
    pub fn provider_accept(&mut self, c: &str) -> Reply {
        let i = self.inflight.iter().position(|(x, _)| x == c).expect("a request in flight");
        self.inflight.remove(i);
        if self.seen.insert(format!("{c}/0")) { *self.charges.entry(c.into()).or_insert(0) += 1; }
        Reply { cmd: c.into() }
    }
    pub fn receive(&mut self, c: &str, reply: Reply) {
        assert_eq!(reply.cmd, c);
        self.got.insert(c.into());
        self.emit(format!(r#"{{"event":"Receive","cmd":"{c}"}}"#));
    }
    pub fn persist(&mut self, c: &str) {
        self.got.remove(c);
        self.durable.insert(c.into());
        self.emit(format!(r#"{{"event":"Persist","cmd":"{c}"}}"#));
    }
    pub fn ack(&mut self, c: &str) {
        self.status.insert(c.into(), "acked");
        self.emit(format!(r#"{{"event":"Ack","cmd":"{c}"}}"#));
    }
    pub fn end(&mut self) { self.emit(r#"{"event":"End"}"#.into()); }
}

include!("worker.rs");

/// Seed 1: submit c1, the provider answers once, the worker handles the reply.
pub fn simulate() -> Worker {
    let mut w = Worker::default();
    submit(&mut w, "c1");
    let reply = w.provider_accept("c1");
    on_reply(&mut w, "c1", reply);
    w.end();
    w
}

#[allow(dead_code)]
fn main() {
    let path = std::env::args().nth(1).expect("the trace file to write");
    let w = simulate();
    let mut f = std::fs::File::create(&path).expect("create the trace file");
    for l in &w.log { writeln!(f, "{l}").unwrap(); }
    println!("seed 1: {} trace lines written to {path}", w.log.len());
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_committed_intent_is_acked() {
        let w = simulate();
        assert_eq!(w.status.get("c1"), Some(&"acked"));
        assert!(w.durable.contains("c1"));
    }
    #[test]
    fn provider_is_charged_once() {
        let w = simulate();
        assert_eq!(w.charges.get("c1"), Some(&1));
    }
}

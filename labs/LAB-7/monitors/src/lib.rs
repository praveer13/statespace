//! LAB-7.6's monitors over interpreter traces. This file and `main.rs` are the course's half (reference
//! module, earns nothing): the trace reader and the verdict type. Your half is `s_new.rs` and `s_past.rs`.
//!
//! A trace is what the S7 interpreter printed for one run of commands, one step per line, tab separated,
//! after a header line. Each step records the command and the state right after it:
//!
//! | column      | meaning                                                                          |
//! |-------------|----------------------------------------------------------------------------------|
//! | `i`         | the step's number, from 1                                                        |
//! | `kind`      | `Share`, `Revoke`, `Edit` or `Open`                                              |
//! | `by`        | who issued it (the opener, for `Open`)                                           |
//! | `user`      | whom it concerns: the user shared with or revoked, the opener; `-` for `Edit`    |
//! | `doc`       | the document                                                                     |
//! | `ok`        | for `Open`, `yes` when a page was returned; `-` otherwise                        |
//! | `page`      | for `Open`, the page returned, `<doc>@<version>`; `-` otherwise                  |
//! | `canread`   | `yes` when, in the authoritative state after the step, `user` may read `doc`    |
//! | `delivered` | the pages delivered to `user` so far, comma separated, or `-`                    |
//!
//! `ReadOK(u, d)` is an `Open` step by `u` on `d` with `ok` = `yes`. `delivered` only grows: the interpreter
//! never removes a page from an observer's log.

pub mod s_new;
pub mod s_past;

/// One step of a trace.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Event {
    pub i: usize,
    pub kind: String,
    pub by: String,
    pub user: String,
    pub doc: String,
    pub ok: bool,
    pub page: Option<String>,
    pub canread: bool,
    pub delivered: Vec<String>,
}

impl Event {
    pub fn is_revoke(&self, user: &str, doc: &str) -> bool {
        self.kind == "Revoke" && self.user == user && self.doc == doc
    }
    pub fn is_read_ok(&self) -> bool {
        self.kind == "Open" && self.ok
    }
}

/// A monitor's verdict on a whole trace.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Verdict {
    Accept,
    /// The first step at which the property fails, and why, in a few words.
    Reject { step: usize, why: String },
}

const HEADER: &str = "i\tkind\tby\tuser\tdoc\tok\tpage\tcanread\tdelivered";

/// Read a trace file.
pub fn read_trace(text: &str) -> Result<Vec<Event>, String> {
    let mut lines = text.lines();
    if lines.next() != Some(HEADER) {
        return Err(format!("the first line is not the header `{}`", HEADER.replace('\t', " ")));
    }
    let mut out = Vec::new();
    for (n, line) in lines.enumerate() {
        if line.is_empty() {
            continue;
        }
        let c: Vec<&str> = line.split('\t').collect();
        if c.len() != 9 {
            return Err(format!("line {}: {} columns, expected 9", n + 2, c.len()));
        }
        let i = c[0].parse().map_err(|_| format!("line {}: step `{}` is not a number", n + 2, c[0]))?;
        out.push(Event {
            i,
            kind: c[1].into(),
            by: c[2].into(),
            user: c[3].into(),
            doc: c[4].into(),
            ok: c[5] == "yes",
            page: if c[6] == "-" { None } else { Some(c[6].into()) },
            canread: c[7] == "yes",
            delivered: if c[8] == "-" { Vec::new() } else { c[8].split(',').map(String::from).collect() },
        });
    }
    Ok(out)
}

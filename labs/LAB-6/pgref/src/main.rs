//! `pgref`: the command line `statespace check` drives for LAB-6. Course-supplied glue: reference module,
//! earns nothing. Each subcommand reads lines on standard input and prints lines on standard output, so
//! the crate needs no dependency and builds offline (`cargo build --release --offline`).
//!
//!   pgref compile          `transfer <from> <to> <amount>` lines -> one plan block each (compile.rs)
//!   pgref decision         your self-transfer decision: refuse or noop (decision.rs)
//!   pgref gen <seed> <n>   your generator's n commands (gen.rs)
//!   pgref compare          `<ref outcome> <ref balances> <got outcome> <got balances>` -> same | differs
//!   pgref retry            attempt cases -> your decisions (retry.rs)
//!   pgref refine           start and r queries over D and S (refine.rs)
//!   pgref begin            your runtime's statements that open a transaction (runtime.rs)
//!   pgref level-ok <word>  whether your runtime accepts this read-back isolation level (runtime.rs)
//!
//! You can run any of them yourself, for example `echo "transfer 1 2 30" | cargo run -q -- compile`.

mod compile;
mod decision;
mod gen;
mod model;
mod refine;
mod retry;
mod runtime;

use model::*;
use std::io::{self, Read, Write};

fn stdin_lines() -> Vec<String> {
    let mut text = String::new();
    io::stdin().read_to_string(&mut text).expect("standard input is not UTF-8");
    text.lines().map(|l| l.trim().to_string()).filter(|l| !l.is_empty()).collect()
}

fn fail(message: &str) -> ! {
    eprintln!("pgref: {}", message);
    std::process::exit(2);
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut out = String::new();
    match args.first().map(String::as_str) {
        Some("compile") => {
            for line in stdin_lines() {
                let t = parse_transfer(&line).unwrap_or_else(|| fail(&format!("not a transfer line: {}", line)));
                out.push_str(&write_plan(&t, &compile::compile(&t)));
            }
        }
        Some("decision") => {
            out.push_str(match decision::SELF_TRANSFER {
                decision::SelfTransferDecision::Refuse => "refuse\n",
                decision::SelfTransferDecision::NoOp => "noop\n",
            });
        }
        Some("gen") => {
            let seed: u64 = args.get(1).and_then(|s| s.parse().ok()).unwrap_or_else(|| fail("usage: pgref gen <seed> <n>"));
            let n: usize = args.get(2).and_then(|s| s.parse().ok()).unwrap_or_else(|| fail("usage: pgref gen <seed> <n>"));
            for t in gen::generate(seed, n) {
                out.push_str(&write_transfer(&t));
                out.push('\n');
            }
        }
        Some("compare") => {
            for line in stdin_lines() {
                let p: Vec<&str> = line.split_whitespace().collect();
                if p.len() != 4 {
                    fail(&format!("not a comparison line: {}", line));
                }
                let reference = parse_observation(p[0], p[1]).unwrap_or_else(|| fail(&format!("cannot read {}", line)));
                let observed = parse_observation(p[2], p[3]).unwrap_or_else(|| fail(&format!("cannot read {}", line)));
                out.push_str(if gen::compare(&reference, &observed) { "same\n" } else { "differs\n" });
            }
        }
        Some("retry") => {
            out.push_str(&format!("k {}\n", retry::K));
            let lines = stdin_lines();
            let mut i = 0;
            while i < lines.len() {
                let head: Vec<&str> = lines[i].split_whitespace().collect();
                if head.len() != 3 || head[0] != "case" {
                    fail(&format!("expected `case <id> <rereads yes|no>`, not {}", lines[i]));
                }
                let policy = retry::Policy { rereads_key: head[2] == "yes" };
                let mut attempts = Vec::new();
                i += 1;
                while i < lines.len() && lines[i] != "end" {
                    let token = lines[i].strip_prefix("attempt ").unwrap_or_else(|| fail(&format!("expected `attempt <result>`, not {}", lines[i])));
                    attempts.push(parse_attempt(token).unwrap_or_else(|| fail(&format!("cannot read the attempt {}", token))));
                    i += 1;
                }
                i += 1;
                for k in 1..=attempts.len() {
                    let word = match retry::decide(&policy, &attempts[..k]) {
                        retry::Decision::Retry => "retry",
                        retry::Decision::Stop => "stop",
                        retry::Decision::GaveUp => "gaveup",
                    };
                    out.push_str(&format!("decide {} {} {}\n", head[1], k, word));
                }
            }
        }
        Some("refine") => {
            let lines = stdin_lines();
            let mut i = 0;
            let mut n = 0;
            while i < lines.len() {
                let kind = lines[i].clone();
                i += 1;
                let start = i;
                while i < lines.len() && lines[i] != "end" {
                    i += 1;
                }
                let body: Vec<&str> = lines[start..i].iter().map(String::as_str).collect();
                i += 1;
                n += 1;
                let (d, s) = parse_db_and_state(&body).unwrap_or_else(|| fail(&format!("cannot read query {}", n)));
                out.push_str(&format!("result {}\n", n));
                match kind.as_str() {
                    "start" => {
                        let s0 = refine::alpha(&d);
                        out.push_str(&write_state(&s0));
                        out.push_str(if refine::r(&s0, &d) { "r yes\n" } else { "r no\n" });
                    }
                    "r" => out.push_str(if refine::r(&s, &d) { "r yes\n" } else { "r no\n" }),
                    other => fail(&format!("a refine query is start or r, not {}", other)),
                }
                out.push_str("end\n");
            }
        }
        Some("begin") => {
            for statement in runtime::begin() {
                out.push_str(&statement.replace('\n', " "));
                out.push('\n');
            }
        }
        Some("level-ok") => {
            let word = args.get(1).unwrap_or_else(|| fail("usage: pgref level-ok <read-back level>"));
            out.push_str(if runtime::level_ok(word) { "yes\n" } else { "no\n" });
        }
        _ => fail("usage: pgref compile | decision | gen <seed> <n> | compare | retry | refine | begin | level-ok <word>"),
    }
    io::stdout().write_all(out.as_bytes()).expect("cannot write standard output");
}

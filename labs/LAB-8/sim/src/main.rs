//! The simulator's command line. Course-supplied harness; `statespace check lab8.4`, `lab8.6` and `lab8.7` run it,
//! and so can you:
//!
//!   cargo run --release -q -- trace --seed 7 --out ../traces/seed-7.ndjson    one run, its NDJSON log written
//!   cargo run --release -q -- suite --seeds 1,2,3                             each seed run twice, properties checked
//!   cargo run --release -q -- systematic                                      one crash in each of CW1 to CW4
//!
//! Options: --rate <faults per thousand> (150), --steps <cap of the faulty phase> (200), --commands <n> (2),
//! --mutant none|ack-before-store|fresh-key|resend-stored, --mount <dir> (suite: write a specimen for each failing seed),
//! --crash-in CW1|CW2|CW3|CW4 (one crash, the first time c1 is in that window, and no other fault).
//! Every line it prints that starts with `seed `, `window ` or `suite:` is a verdict line the checks read.

mod faults;
mod machine;
mod specimen;
mod world;

use std::process::ExitCode;
use world::{run, sha256_hex, Config, Mutant, Outcome};

struct Args {
    cmd: String,
    seeds: Vec<u64>,
    cfg: Config,
    mutant_name: String,
    out: Option<String>,
    mount: Option<String>,
}

fn parse() -> Result<Args, String> {
    let mut it = std::env::args().skip(1);
    let cmd = it.next().ok_or("usage: outbox-sim trace|suite|systematic [options]")?;
    let mut cfg = Config::new(1);
    let mut seeds = Vec::new();
    let mut out = None;
    let mut mount = None;
    let mut mutant_name = "none".to_string();
    while let Some(a) = it.next() {
        let mut val = || it.next().ok_or(format!("{a} needs a value"));
        match a.as_str() {
            "--seed" => seeds = vec![val()?.parse().map_err(|_| "--seed takes a number")?],
            "--seeds" => {
                seeds = val()?.split(',').filter(|s| !s.is_empty()).map(|s| s.trim().parse::<u64>()).collect::<Result<_, _>>().map_err(|_| "--seeds takes numbers separated by commas")?
            }
            "--rate" => cfg.rate = val()?.parse().map_err(|_| "--rate takes a number")?,
            "--steps" => cfg.steps = val()?.parse().map_err(|_| "--steps takes a number")?,
            "--commands" => cfg.commands = val()?.parse().map_err(|_| "--commands takes a number")?,
            "--mutant" => {
                mutant_name = val()?;
                cfg.mutant = Mutant::parse(&mutant_name).ok_or("--mutant is none, ack-before-store, fresh-key or resend-stored")?
            }
            "--out" => out = Some(val()?),
            "--mount" => mount = Some(val()?),
            "--crash-in" => {
                cfg.crash_in = Some(match val()?.as_str() {
                    "CW1" => "CW1",
                    "CW2" => "CW2",
                    "CW3" => "CW3",
                    "CW4" => "CW4",
                    _ => return Err("--crash-in is CW1, CW2, CW3 or CW4".into()),
                })
            }
            other => return Err(format!("unknown option {other}")),
        }
    }
    Ok(Args { cmd, seeds, cfg, mutant_name, out, mount })
}

fn first_difference(a: &[String], b: &[String]) -> usize {
    let n = a.len().max(b.len());
    (0..n).find(|&i| a.get(i) != b.get(i)).map(|i| i + 1).unwrap_or(0)
}

fn describe(seed: u64, o: &Outcome, sha: &str) -> String {
    match &o.violation {
        None => format!("seed {seed}: ok (steps {}, faults {}: crash {}, tick {}, dup {}; {} lines, sha256 {sha})", o.steps, o.faults(), o.crashes, o.ticks, o.dups, o.log.len()),
        Some(v) => format!("seed {seed}: FAIL {} at step {} (line {}): {}", v.property, v.step, v.line, v.detail),
    }
}

fn json_str(s: &str) -> String {
    let mut out = String::from("\"");
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn main() -> ExitCode {
    let args = match parse() {
        Ok(a) => a,
        Err(e) => {
            eprintln!("outbox-sim: {e}");
            return ExitCode::from(2);
        }
    };
    let mut failed = 0usize;
    match args.cmd.as_str() {
        "trace" => {
            let seed = *args.seeds.first().unwrap_or(&1);
            let o = run(Config { seed, ..args.cfg.clone() });
            let text = o.ndjson();
            let sha = sha256_hex(text.as_bytes());
            if let Some(path) = &args.out {
                if let Err(e) = std::fs::write(path, &text) {
                    eprintln!("outbox-sim: cannot write {path}: {e}");
                    return ExitCode::from(2);
                }
            } else {
                print!("{text}");
            }
            println!("{}", describe(seed, &o, &sha));
            if o.violation.is_some() {
                failed += 1;
            }
        }
        "suite" => {
            if args.seeds.is_empty() {
                eprintln!("outbox-sim: suite needs --seeds");
                return ExitCode::from(2);
            }
            let (mut faults, mut ok) = (0u32, 0usize);
            for &seed in &args.seeds {
                let cfg = Config { seed, ..args.cfg.clone() };
                let a = run(cfg.clone());
                let b = run(cfg);
                let sha = sha256_hex(a.ndjson().as_bytes());
                faults += a.faults();
                if a.log != b.log {
                    println!("seed {seed}: FAIL Determinism: two runs of seed {seed} wrote different traces, first at line {}", first_difference(&a.log, &b.log));
                    failed += 1;
                    continue;
                }
                println!("{}", describe(seed, &a, &sha));
                match &a.violation {
                    None => ok += 1,
                    Some(v) => {
                        failed += 1;
                        if let Some(dir) = &args.mount {
                            match specimen::mount(seed, &args.mutant_name, v, &a, &sha) {
                                None => println!("seed {seed}: not mounted"),
                                Some(s) => {
                                    let body = format!(
                                        "{{\"schema\":\"statespace/sim-specimen@0\",\"seed\":{},\"mutant\":{},\"violates\":{},\"step\":{},\"line\":{},\"because\":{},\"faults\":{},\"trace_sha256\":{}}}\n",
                                        s.seed,
                                        json_str(&s.mutant),
                                        json_str(&s.violates),
                                        s.step,
                                        s.line,
                                        json_str(&s.because),
                                        s.faults,
                                        json_str(&s.trace_sha256)
                                    );
                                    let path = format!("{dir}/seed-{seed}.json");
                                    let _ = std::fs::create_dir_all(dir);
                                    match std::fs::write(&path, body) {
                                        Ok(()) => println!("seed {seed}: mounted {path}"),
                                        Err(e) => println!("seed {seed}: not mounted ({e})"),
                                    }
                                }
                            }
                        }
                    }
                }
            }
            println!("suite: {ok} of {} seeds ok; {faults} faults injected (rate {} per thousand, step cap {}, {} commands)", args.seeds.len(), args.cfg.rate, args.cfg.steps, args.cfg.commands);
        }
        "systematic" => {
            let mut ok = 0;
            for w in ["CW1", "CW2", "CW3", "CW4"] {
                let o = run(Config { seed: 1, crash_in: Some(w), ..args.cfg.clone() });
                let sha = sha256_hex(o.ndjson().as_bytes());
                match &o.violation {
                    Some(v) => {
                        failed += 1;
                        println!("window {w}: FAIL {} at step {} (line {}): {}", v.property, v.step, v.line, v.detail);
                    }
                    None if o.crashes != 1 => {
                        failed += 1;
                        println!("window {w}: FAIL no crash landed in {w}: the machine never put c1 there");
                    }
                    None => {
                        ok += 1;
                        println!("window {w}: ok (one crash in {w}; {} lines, sha256 {sha})", o.log.len());
                    }
                }
            }
            println!("suite: {ok} of 4 windows ok");
        }
        other => {
            eprintln!("outbox-sim: unknown command {other}");
            return ExitCode::from(2);
        }
    }
    if failed > 0 {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    }
}

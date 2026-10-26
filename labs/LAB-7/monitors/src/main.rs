//! The monitors' command line, supplied by the course:
//!
//!   lab7-monitors s-new <trace file>...    one line per trace: `<file>\taccept` or `<file>\treject\t<step>\t<why>`
//!   lab7-monitors s-past <trace file>...
//!
//! `statespace check lab7.6` runs both over the traces it draws.

use lab7_monitors::{read_trace, s_new, s_past, Verdict};
use std::{env, fs, process};

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 3 || !(args[1] == "s-new" || args[1] == "s-past") {
        eprintln!("usage: lab7-monitors s-new|s-past <trace file>...");
        process::exit(2);
    }
    for path in &args[2..] {
        let text = fs::read_to_string(path).unwrap_or_else(|e| {
            eprintln!("lab7-monitors: cannot read {path}: {e}");
            process::exit(2)
        });
        let trace = read_trace(&text).unwrap_or_else(|e| {
            eprintln!("lab7-monitors: {path}: {e}");
            process::exit(2)
        });
        let verdict = if args[1] == "s-new" { s_new::check(&trace) } else { s_past::check(&trace) };
        match verdict {
            Verdict::Accept => println!("{path}\taccept"),
            Verdict::Reject { step, why } => println!("{path}\treject\t{step}\t{}", why.replace(['\t', '\n'], " ")),
        }
    }
}

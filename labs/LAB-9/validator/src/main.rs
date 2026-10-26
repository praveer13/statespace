//! LAB-9.11 · the SQL validator's command line (the template's part).
//!
//! `lab9-validator <cases file>` reads the cases, asks `validator::validate` for a verdict on each, and prints
//! one line per case, which `statespace check lab9.11` reads:
//!
//! ```text
//! <case id> accept <bound or n>
//! <case id> reject <bound or n> instance accounts=<id>:<bal>,... from=<v> to=<v> amount=<v>
//! ```
//!
//! `accounts=none` is the empty table. The check replays every rejection's instance on PostgreSQL for the
//! plan and in the course's interpreter for the source, and the outcome classes must differ.

mod plan;
mod validator;

use std::process::ExitCode;

fn main() -> ExitCode {
    let Some(path) = std::env::args().nth(1) else {
        eprintln!("usage: lab9-validator <cases file>");
        return ExitCode::from(2);
    };
    let text = match std::fs::read_to_string(&path) {
        Ok(t) => t,
        Err(e) => { eprintln!("lab9-validator: {path}: {e}"); return ExitCode::from(2); }
    };
    let cases = match plan::parse_cases(&text) {
        Ok(c) => c,
        Err(e) => { eprintln!("lab9-validator: {e}"); return ExitCode::from(2); }
    };
    for case in &cases {
        println!("{} {}", case.id, validator::validate(case).line());
    }
    ExitCode::SUCCESS
}

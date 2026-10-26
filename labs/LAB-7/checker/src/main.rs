//! The checker's command line, supplied by the course:
//!
//!   lab7-checker product <view file> <observer file>   prints the self-composed query for the view
//!   lab7-checker premise <view file> <observer file>   prints the premise witness query
//!
//! `statespace check lab7.5` runs both on every view it checks and puts each query through Z3.

use lab7_checker::{noninterference, read_observer, read_view};
use std::{env, fs, process};

fn read(path: &str) -> String {
    fs::read_to_string(path).unwrap_or_else(|e| {
        eprintln!("lab7-checker: cannot read {path}: {e}");
        process::exit(2)
    })
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() != 4 || !(args[1] == "product" || args[1] == "premise") {
        eprintln!("usage: lab7-checker product|premise <view file> <observer file>");
        process::exit(2);
    }
    let view = read_view(&read(&args[2])).unwrap_or_else(|e| {
        eprintln!("lab7-checker: {}: {e}", args[2]);
        process::exit(2)
    });
    let observer = read_observer(&read(&args[3])).unwrap_or_else(|e| {
        eprintln!("lab7-checker: {}: {e}", args[3]);
        process::exit(2)
    });
    let query = if args[1] == "product" { noninterference::product(&view, &observer) } else { noninterference::premise(&view, &observer) };
    print!("{query}");
}

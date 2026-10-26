//! The host: one request per line on standard input, one reply per line on standard output. Supplied by
//! the template, and the same in every build. `statespace check lab4.<k>` starts a fresh process of this
//! binary for each batch it sends, and runs Z3 between batches.
//!
//! Request: `{"fn": "wp_emit", "arg": {...}}`. Reply: `{"ok": <value>}` or `{"error": "<message>"}`.
//! Try it: `echo '{"fn":"wp_emit","arg":{...}}' | cargo run --release -q`.

use std::io::{self, BufRead, Write};

use miniplinth_check::json::{self, Value};

fn main() {
    let stdin = io::stdin();
    let mut out = io::stdout().lock();
    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        let reply = match json::parse(&line) {
            Err(e) => Value::obj(vec![("error", Value::str(format!("the request is not JSON: {e}")))]),
            Ok(req) => match (req.get("fn").and_then(Value::as_str), req.get("arg")) {
                (Some(name), Some(arg)) => match miniplinth_check::call(name, arg) {
                    Ok(v) => Value::obj(vec![("ok", v)]),
                    Err(e) => Value::obj(vec![("error", Value::str(e))]),
                },
                _ => Value::obj(vec![("error", Value::str("a request is {\"fn\": name, \"arg\": value}"))]),
            },
        };
        let _ = writeln!(out, "{}", reply.to_json());
        let _ = out.flush();
    }
}

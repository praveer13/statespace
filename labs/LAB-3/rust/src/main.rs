//! `mp3`: the driver `statespace check` runs (template, read-only). Reference module, earns nothing.
//!
//! It reads one JSON request per line on standard input and writes one JSON answer per line:
//!
//!   {"op": "parse", "id": ..., "text": "..."}                     -> {"id": ..., "ok": <program>} or {"id": ..., "error": {"line", "column", "message"}}
//!   {"op": "typecheck", "id": ..., "command": <cmd>}               -> {"id": ..., "verdict": {"ok": true} | {"error": "<rule>"}}
//!   {"op": "exec", "id": ..., "policy", "program", "call", "pre"}  -> {"id": ..., "outcome": <outcome>}
//!
//! A request it cannot read, or a panic in your code, answers {"id": ..., "fault": "..."}.

use mini_plinth::ir;
use mini_plinth::json::{self, Json};
use std::io::{self, BufRead, Write};

fn answer(req: &Json) -> Result<Vec<(&'static str, Json)>, String> {
    let op = req.get("op").and_then(Json::str).ok_or("no op")?;
    match op {
        "parse" => {
            let text = req.get("text").and_then(Json::str).ok_or("no text")?;
            Ok(match mini_plinth::parser::parse_program(text) {
                Ok(p) => vec![("ok", ir::program_json(&p))],
                Err(e) => vec![("error", Json::obj(vec![("line", Json::Num(e.line as i128)), ("column", Json::Num(e.column as i128)), ("message", Json::s(&e.message))]))],
            })
        }
        "typecheck" => {
            let c = ir::cmd(req.get("command").ok_or("no command")?)?;
            Ok(vec![("verdict", ir::type_outcome_json(&mini_plinth::typecheck::typecheck(&c)))])
        }
        "exec" => {
            let pol = ir::policy(req.get("policy").ok_or("no policy")?)?;
            let p = ir::program(req.get("program").ok_or("no program")?)?;
            let c = ir::call(req.get("call").ok_or("no call")?)?;
            let s = ir::state(req.get("pre").ok_or("no pre")?)?;
            Ok(vec![("outcome", ir::outcome_json(&mini_plinth::interp::exec(&pol, &p, &c, &s)))])
        }
        other => Err(format!("unknown op {other}")),
    }
}

fn main() {
    std::panic::set_hook(Box::new(|_| {}));
    let stdin = io::stdin();
    let mut out = io::stdout().lock();
    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        let (id, fields) = match json::parse(&line) {
            Err(e) => (Json::Null, vec![("fault", Json::s(&format!("the request is not JSON: {e}")))]),
            Ok(req) => {
                let id = req.get("id").cloned().unwrap_or(Json::Null);
                let got = std::panic::catch_unwind(|| answer(&req));
                match got {
                    Ok(Ok(fields)) => (id, fields),
                    Ok(Err(e)) => (id, vec![("fault", Json::s(&e))]),
                    Err(p) => {
                        let msg = p.downcast_ref::<String>().cloned().or_else(|| p.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_default();
                        (id, vec![("fault", Json::s(&format!("your code panicked: {msg}")))])
                    }
                }
            }
        };
        let mut all = vec![("id", id)];
        all.extend(fields);
        let _ = writeln!(out, "{}", Json::obj(all).canonical());
    }
}

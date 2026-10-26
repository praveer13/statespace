//! The plans `statespace check lab9.11` hands your validator, parsed (the template's part).
//!
//! A case is one source command and the plan your LAB-6 compiler generated for it, one statement per line:
//!
//! ```text
//! case k3
//! source transfer from=$2 to=$3 amount=$1
//! plan
//! ASSERT $1 > 0 ELSE NonPositive
//! SELECT bal FROM accounts WHERE id = $2 INTO r1 EXPECT 1 ELSE NoSuchAccount
//! ASSERT r1 >= $1 ELSE Insufficient
//! UPDATE accounts SET bal = bal - $1 WHERE id = $2 EXPECT 1 ELSE NoSuchAccount
//! UPDATE accounts SET bal = bal + $1 WHERE id = $3 EXPECT 1 ELSE NoSuchAccount
//! end
//! ```
//!
//! The schema is `accounts (id bigint PRIMARY KEY, bal bigint NOT NULL CHECK (bal >= 0))`. `ASSERT` is a
//! condition the runtime checks, mapped to a typed error; `EXPECT 1 ELSE e` is the rowcount check; an
//! `INSERT ... ON CONFLICT` is an upsert. A plan runs as one transaction: an error rolls every write back.

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Operand {
    Bal,          // the row's current balance, inside an UPDATE
    Param(usize), // $k
    Reg(usize),   // rN, set by SELECT ... INTO
    Lit(i64),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cmp { Gt, Ge, Lt, Le, Eq, Ne }

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Arith { Add, Sub }

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Stmt {
    /// ASSERT a <cmp> b ELSE error
    Assert { a: Operand, cmp: Cmp, b: Operand, error: String },
    /// SELECT bal FROM accounts WHERE id = $k INTO rN EXPECT 1 ELSE error
    Select { id: usize, into: usize, error: String },
    /// UPDATE accounts SET bal = a [+|- b] WHERE id = $k [EXPECT 1 ELSE error]
    Update { a: Operand, op: Option<(Arith, Operand)>, id: usize, expect: Option<String> },
    /// INSERT INTO accounts (id, bal) VALUES ($i, $v) ON CONFLICT (id) DO UPDATE SET bal = accounts.bal + $d
    Upsert { id: usize, value: usize, delta: usize },
}

/// The source command: `transfer` with the parameter that carries each argument.
#[derive(Clone, Debug)]
pub struct Source { pub from: usize, pub to: usize, pub amount: usize }

#[derive(Clone, Debug)]
pub struct Case { pub id: String, pub source: Source, pub plan: Vec<Stmt> }

fn operand(t: &str) -> Result<Operand, String> {
    if t == "bal" { return Ok(Operand::Bal); }
    if let Some(k) = t.strip_prefix('$') { return k.parse().map(Operand::Param).map_err(|_| format!("{t} is not a parameter")); }
    if let Some(n) = t.strip_prefix('r') { if let Ok(n) = n.parse() { return Ok(Operand::Reg(n)); } }
    t.parse().map(Operand::Lit).map_err(|_| format!("{t} is not an operand"))
}

fn param(t: &str) -> Result<usize, String> {
    t.strip_prefix('$').and_then(|k| k.trim_end_matches([',', ')']).parse().ok()).ok_or(format!("{t} is not a parameter"))
}

fn reg(t: &str) -> Result<usize, String> {
    t.strip_prefix('r').and_then(|k| k.parse().ok()).ok_or(format!("{t} is not a register"))
}

pub fn parse_stmt(line: &str) -> Result<Stmt, String> {
    let t: Vec<&str> = line.split_whitespace().collect();
    match t.as_slice() {
        ["ASSERT", a, c, b, "ELSE", e] => {
            let cmp = match *c { ">" => Cmp::Gt, ">=" => Cmp::Ge, "<" => Cmp::Lt, "<=" => Cmp::Le, "=" => Cmp::Eq, "<>" => Cmp::Ne, _ => return Err(format!("{c} is not a comparison")) };
            Ok(Stmt::Assert { a: operand(a)?, cmp, b: operand(b)?, error: e.to_string() })
        }
        ["SELECT", "bal", "FROM", "accounts", "WHERE", "id", "=", k, "INTO", r, "EXPECT", "1", "ELSE", e] => {
            Ok(Stmt::Select { id: param(k)?, into: reg(r)?, error: e.to_string() })
        }
        ["UPDATE", "accounts", "SET", "bal", "=", rest @ ..] => {
            let (a, op, after) = match rest {
                [a, o @ ("+" | "-"), b, tail @ ..] => (operand(a)?, Some((if *o == "+" { Arith::Add } else { Arith::Sub }, operand(b)?)), tail),
                [a, tail @ ..] => (operand(a)?, None, tail),
                [] => return Err("an UPDATE without a value".into()),
            };
            match after {
                ["WHERE", "id", "=", k] => Ok(Stmt::Update { a, op, id: param(k)?, expect: None }),
                ["WHERE", "id", "=", k, "EXPECT", "1", "ELSE", e] => Ok(Stmt::Update { a, op, id: param(k)?, expect: Some(e.to_string()) }),
                _ => Err(format!("{line}: not an UPDATE this grammar knows")),
            }
        }
        ["INSERT", "INTO", "accounts", "(id,", "bal)", "VALUES", i, v, "ON", "CONFLICT", "(id)", "DO", "UPDATE", "SET", "bal", "=", "accounts.bal", "+", d] => {
            Ok(Stmt::Upsert { id: param(i.trim_start_matches('('))?, value: param(v)?, delta: param(d)? })
        }
        _ => Err(format!("{line}: not a statement this grammar knows")),
    }
}

pub fn parse_cases(text: &str) -> Result<Vec<Case>, String> {
    let mut out = Vec::new();
    let mut lines = text.lines().map(str::trim).filter(|l| !l.is_empty() && !l.starts_with('#'));
    while let Some(line) = lines.next() {
        let id = line.strip_prefix("case ").ok_or(format!("expected `case <id>`, found {line}"))?.to_string();
        let src = lines.next().ok_or("a case without a source")?;
        let mut source = Source { from: 0, to: 0, amount: 0 };
        for part in src.strip_prefix("source transfer ").ok_or(format!("{src}: expected `source transfer ...`"))?.split_whitespace() {
            let (name, value) = part.split_once('=').ok_or(format!("{part}: expected name=$k"))?;
            let k = param(value)?;
            match name { "from" => source.from = k, "to" => source.to = k, "amount" => source.amount = k, _ => return Err(format!("{name} is not an argument of transfer")) }
        }
        if lines.next() != Some("plan") { return Err(format!("case {id}: expected `plan`")); }
        let mut plan = Vec::new();
        loop {
            match lines.next() {
                Some("end") => break,
                Some(l) => plan.push(parse_stmt(l)?),
                None => return Err(format!("case {id}: the plan has no `end`")),
            }
        }
        out.push(Case { id, source, plan });
    }
    Ok(out)
}

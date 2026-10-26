//! LAB-4's command format, `statespace/lab4-program@1`, and its reader. Supplied by the template, and the
//! same in every build you make (LAB-4.7 checks that `broken/` and `fixed/` share it byte for byte).
//!
//! ```text
//! Expr  {"num": n} | {"var": x} | {"add": [e, e]} | {"sub": [e, e]}
//! Form  {"bool": b} | {"le"|"lt"|"ge"|"gt"|"eq": [e, e]} | {"and"|"or": [f, ...]} | {"not": f}
//!       | {"implies": [f, f]} | {"forall": y, "body": f}
//! Cmd   {"skip": {}} | {"assign": x, "expr": e} | {"move": {"from": x, "to": y, "amount": e}}
//!       | {"seq": [c, ...]} | {"if": f, "then": c, "else": c}
//!       | {"guard": f, "reading": "abort"|"assert"|"assume"|"reject", "body": c}
//! Program {"accounts": [x, ...], "init": f (optional), "commands": [{"name", "params", "requires", "body"}]}
//! ```
//!
//! A name resolves to the innermost bound variable, else a parameter, else an account. `move` evaluates its
//! amount once, in the state before it, then takes it from `from` and adds it to `to`, in that order. A
//! command's `requires` is a guard under the reject reading: when it fails the command is rejected and
//! the state is unchanged.
//!
//! `Form::App` is not in the JSON format. It is there for your emitter: an application of a function you
//! define with `define-fun`, such as a named intermediate formula over the state.

use crate::json::Value;

#[derive(Clone, Debug, PartialEq)]
pub enum Expr {
    Num(i64),
    Var(String),
    Add(Box<Expr>, Box<Expr>),
    Sub(Box<Expr>, Box<Expr>),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Cmp {
    Le,
    Lt,
    Ge,
    Gt,
    Eq,
}

impl Cmp {
    pub fn smt(self) -> &'static str {
        match self {
            Cmp::Le => "<=",
            Cmp::Lt => "<",
            Cmp::Ge => ">=",
            Cmp::Gt => ">",
            Cmp::Eq => "=",
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub enum Form {
    Bool(bool),
    Cmp(Cmp, Expr, Expr),
    And(Vec<Form>),
    Or(Vec<Form>),
    Not(Box<Form>),
    Implies(Box<Form>, Box<Form>),
    Forall(String, Box<Form>),
    App(String, Vec<Expr>),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Reading {
    Abort,
    Assert,
    Assume,
    Reject,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Cmd {
    Skip,
    Assign(String, Expr),
    Move { from: String, to: String, amount: Expr },
    Seq(Vec<Cmd>),
    If(Form, Box<Cmd>, Box<Cmd>),
    Guard(Form, Reading, Box<Cmd>),
}

#[derive(Clone, Debug, PartialEq)]
pub struct Command {
    pub name: String,
    pub params: Vec<String>,
    pub requires: Form,
    pub body: Cmd,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Program {
    pub accounts: Vec<String>,
    pub init: Option<Form>,
    pub commands: Vec<Command>,
}

impl Program {
    pub fn command(&self, name: &str) -> Result<&Command, String> {
        self.commands.iter().find(|c| c.name == name).ok_or_else(|| format!("the program has no command {name}"))
    }

    /// Every parameter name of every command, once, in order of appearance.
    pub fn all_params(&self) -> Vec<String> {
        let mut out: Vec<String> = Vec::new();
        for c in &self.commands {
            for p in &c.params {
                if !out.contains(p) {
                    out.push(p.clone());
                }
            }
        }
        out
    }
}

fn pair(v: &Value) -> Result<(&Value, &Value), String> {
    match v.as_arr() {
        Some([a, b]) => Ok((a, b)),
        _ => Err("expected a pair [x, y]".into()),
    }
}

fn names(v: &Value) -> Result<Vec<String>, String> {
    v.as_arr()
        .ok_or("expected a list of names")?
        .iter()
        .map(|x| x.as_str().map(str::to_string).ok_or_else(|| "expected a name".to_string()))
        .collect()
}

pub fn expr(v: &Value) -> Result<Expr, String> {
    if let Some(n) = v.get("num") {
        return n.as_i64().map(Expr::Num).ok_or_else(|| "num is not an integer".into());
    }
    if let Some(x) = v.get("var") {
        return x.as_str().map(|s| Expr::Var(s.into())).ok_or_else(|| "var is not a name".into());
    }
    if let Some(p) = v.get("add") {
        let (a, b) = pair(p)?;
        return Ok(Expr::Add(Box::new(expr(a)?), Box::new(expr(b)?)));
    }
    if let Some(p) = v.get("sub") {
        let (a, b) = pair(p)?;
        return Ok(Expr::Sub(Box::new(expr(a)?), Box::new(expr(b)?)));
    }
    Err(format!("not an expression: {}", v.to_json()))
}

pub fn form(v: &Value) -> Result<Form, String> {
    if let Some(b) = v.get("bool") {
        return b.as_bool().map(Form::Bool).ok_or_else(|| "bool is not a boolean".into());
    }
    for (key, op) in [("le", Cmp::Le), ("lt", Cmp::Lt), ("ge", Cmp::Ge), ("gt", Cmp::Gt), ("eq", Cmp::Eq)] {
        if let Some(p) = v.get(key) {
            let (a, b) = pair(p)?;
            return Ok(Form::Cmp(op, expr(a)?, expr(b)?));
        }
    }
    if let Some(items) = v.get("and") {
        return Ok(Form::And(items.as_arr().ok_or("and is not a list")?.iter().map(form).collect::<Result<_, _>>()?));
    }
    if let Some(items) = v.get("or") {
        return Ok(Form::Or(items.as_arr().ok_or("or is not a list")?.iter().map(form).collect::<Result<_, _>>()?));
    }
    if let Some(f) = v.get("not") {
        return Ok(Form::Not(Box::new(form(f)?)));
    }
    if let Some(p) = v.get("implies") {
        let (a, b) = pair(p)?;
        return Ok(Form::Implies(Box::new(form(a)?), Box::new(form(b)?)));
    }
    if let Some(y) = v.get("forall") {
        let y = y.as_str().ok_or("forall binds a name")?;
        return Ok(Form::Forall(y.into(), Box::new(form(v.req("body")?)?)));
    }
    Err(format!("not a formula: {}", v.to_json()))
}

pub fn cmd(v: &Value) -> Result<Cmd, String> {
    if v.get("skip").is_some() {
        return Ok(Cmd::Skip);
    }
    if let Some(x) = v.get("assign") {
        return Ok(Cmd::Assign(x.as_str().ok_or("assign names an account")?.into(), expr(v.req("expr")?)?));
    }
    if let Some(m) = v.get("move") {
        return Ok(Cmd::Move { from: m.req_str("from")?.into(), to: m.req_str("to")?.into(), amount: expr(m.req("amount")?)? });
    }
    if let Some(items) = v.get("seq") {
        return Ok(Cmd::Seq(items.as_arr().ok_or("seq is not a list")?.iter().map(cmd).collect::<Result<_, _>>()?));
    }
    if let Some(b) = v.get("if") {
        return Ok(Cmd::If(form(b)?, Box::new(cmd(v.req("then")?)?), Box::new(cmd(v.req("else")?)?)));
    }
    if let Some(g) = v.get("guard") {
        let reading = match v.req_str("reading")? {
            "abort" => Reading::Abort,
            "assert" => Reading::Assert,
            "assume" => Reading::Assume,
            "reject" => Reading::Reject,
            other => return Err(format!("unknown guard reading {other}")),
        };
        return Ok(Cmd::Guard(form(g)?, reading, Box::new(cmd(v.req("body")?)?)));
    }
    Err(format!("not a command: {}", v.to_json()))
}

pub fn program(v: &Value) -> Result<Program, String> {
    let accounts = names(v.req("accounts")?)?;
    let init = match v.get("init") {
        Some(f) => Some(form(f)?),
        None => None,
    };
    let mut commands = Vec::new();
    for c in v.get("commands").and_then(Value::as_arr).unwrap_or(&[]) {
        commands.push(Command {
            name: c.req_str("name")?.into(),
            params: names(c.req("params")?)?,
            requires: form(c.req("requires")?)?,
            body: cmd(c.req("body")?)?,
        });
    }
    Ok(Program { accounts, init, commands })
}

/// A list of names from a request member, such as a wp request's "params".
pub fn name_list(v: &Value) -> Result<Vec<String>, String> {
    names(v)
}

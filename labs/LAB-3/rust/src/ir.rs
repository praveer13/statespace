//! IR@1 as Rust types, with their JSON (template, read-only). Reference module, earns nothing.
//!
//! The same shapes as your Lean export (`lake exe export-ir`) and the course's goldens pool. Integers that can
//! be balances or amounts are `i128` here and decimal strings in JSON: the boundary goldens reach ±(2^63 - 1)
//! and a step past it, which an `i64` cannot hold.

use crate::json::Json;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Acct {
    Mint,
    Sink,
    User(String),
    Escrow(u64),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Ty {
    Account,
    Amount,
    Hold,
    Int,
    Bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Val {
    Acct(Acct),
    Int(i128),
    Bool(bool),
    Hold(u64),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Expr {
    Lit(i128),
    Var(String),
    Balance(Box<Expr>),
    Frozen(Box<Expr>),
    Add(Box<Expr>, Box<Expr>),
    Sub(Box<Expr>, Box<Expr>),
    Ge(Box<Expr>, Box<Expr>),
    Eq(Box<Expr>, Box<Expr>),
    And(Box<Expr>, Box<Expr>),
    Not(Box<Expr>),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ResourceOp {
    Deposit { amount: Expr, to: Expr },
    Move { amount: Expr, from: Expr, to: Expr },
    Hold { amount: Expr, on: Expr },
    Capture { hold: Expr, to: Expr },
    Release { hold: Expr },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Stmt {
    Op(ResourceOp),
    Set { field: String, target: Expr, value: Expr },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Cmd {
    pub name: String,
    pub params: Vec<(String, Ty)>,
    pub guard: Expr,
    pub body: Stmt,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Program {
    pub commands: Vec<Cmd>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HoldStatus {
    Held,
    Captured,
    Released,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Hold {
    pub id: u64,
    pub owner: Acct,
    pub amount: i128,
    pub status: HoldStatus,
}

/// A state: balances in order (a lookup reads the first entry; a new account goes at the end), holds in
/// order, the next hold id, and the frozen accounts in order.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct State {
    pub bals: Vec<(Acct, i128)>,
    pub holds: Vec<Hold>,
    pub next_hold: u64,
    pub frozen: Vec<Acct>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Call {
    pub name: String,
    pub args: Vec<Val>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Zero {
    Reject,
    Noop,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SelfTransfer {
    Allow,
    Reject,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Guard {
    Error,
    Silent,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Overflow {
    Unbounded,
    Bounded(i128),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Policy {
    pub zero: Zero,
    pub self_: SelfTransfer,
    pub guard: Guard,
    pub overflow: Overflow,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Err {
    UnknownCommand(String),
    BadArgument(String),
    UnknownAccount(Acct),
    SelfTransfer,
    GuardFailed(String),
    UnknownHold(u64),
    HoldNotOpen(u64),
    Overflow(Acct),
    TypeError,
    OutOfFuel,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Effect {
    Notify(Acct),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Outcome {
    Ok { state: State, output: Vec<u64>, effects: Vec<Effect> },
    Error(Err),
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TypeErr {
    DupParam,
    UnknownParam,
    WrongType,
    NonPositive,
    UnguardedDebit,
    AssignsResource,
}

// ------------------------------------------------------------------------------------------- reading

type R<T> = Result<T, String>;

fn field<'a>(j: &'a Json, k: &str) -> R<&'a Json> {
    j.get(k).ok_or_else(|| format!("missing field {k}"))
}
fn sfield(j: &Json, k: &str) -> R<String> {
    field(j, k)?.str().map(str::to_string).ok_or_else(|| format!("{k} is not a string"))
}
fn ifield(j: &Json, k: &str) -> R<i128> {
    let s = sfield(j, k)?;
    s.parse::<i128>().map_err(|_| format!("{k} is not a decimal integer: {s}"))
}
fn nfield(j: &Json, k: &str) -> R<u64> {
    field(j, k)?.num().map(|n| n as u64).ok_or_else(|| format!("{k} is not a number"))
}
fn tag(j: &Json) -> R<String> {
    sfield(j, "tag")
}
fn list<T>(j: &Json, k: &str, f: impl Fn(&Json) -> R<T>) -> R<Vec<T>> {
    field(j, k)?.arr().ok_or_else(|| format!("{k} is not a list"))?.iter().map(f).collect()
}

pub fn acct(j: &Json) -> R<Acct> {
    Ok(match tag(j)?.as_str() {
        "mint" => Acct::Mint,
        "sink" => Acct::Sink,
        "user" => Acct::User(sfield(j, "name")?),
        "escrow" => Acct::Escrow(nfield(j, "hold")?),
        t => return Err(format!("unknown account tag {t}")),
    })
}

pub fn ty(j: &Json) -> R<Ty> {
    Ok(match j.str().ok_or("a type is a string")? {
        "account" => Ty::Account,
        "amount" => Ty::Amount,
        "hold" => Ty::Hold,
        "int" => Ty::Int,
        "bool" => Ty::Bool,
        t => return Err(format!("unknown type {t}")),
    })
}

pub fn val(j: &Json) -> R<Val> {
    Ok(match tag(j)?.as_str() {
        "acct" => Val::Acct(acct(field(j, "acct")?)?),
        "int" => Val::Int(ifield(j, "value")?),
        "bool" => Val::Bool(matches!(field(j, "value")?, Json::Bool(true))),
        "hold" => Val::Hold(nfield(j, "hold")?),
        t => return Err(format!("unknown value tag {t}")),
    })
}

pub fn expr(j: &Json) -> R<Expr> {
    let b = |k: &str| -> R<Box<Expr>> { Ok(Box::new(expr(field(j, k)?)?)) };
    Ok(match tag(j)?.as_str() {
        "lit" => Expr::Lit(ifield(j, "value")?),
        "var" => Expr::Var(sfield(j, "name")?),
        "balance" => Expr::Balance(b("e")?),
        "frozen" => Expr::Frozen(b("e")?),
        "add" => Expr::Add(b("a")?, b("b")?),
        "sub" => Expr::Sub(b("a")?, b("b")?),
        "ge" => Expr::Ge(b("a")?, b("b")?),
        "eq" => Expr::Eq(b("a")?, b("b")?),
        "and" => Expr::And(b("a")?, b("b")?),
        "not" => Expr::Not(b("a")?),
        t => return Err(format!("unknown expression tag {t}")),
    })
}

pub fn resource_op(j: &Json) -> R<ResourceOp> {
    let e = |k: &str| expr(field(j, k)?);
    Ok(match tag(j)?.as_str() {
        "deposit" => ResourceOp::Deposit { amount: e("amount")?, to: e("to")? },
        "move" => ResourceOp::Move { amount: e("amount")?, from: e("from")?, to: e("to")? },
        "hold" => ResourceOp::Hold { amount: e("amount")?, on: e("on")? },
        "capture" => ResourceOp::Capture { hold: e("hold")?, to: e("to")? },
        "release" => ResourceOp::Release { hold: e("hold")? },
        t => return Err(format!("unknown operation tag {t}")),
    })
}

pub fn stmt(j: &Json) -> R<Stmt> {
    Ok(match tag(j)?.as_str() {
        "op" => Stmt::Op(resource_op(field(j, "op")?)?),
        "set" => Stmt::Set { field: sfield(j, "field")?, target: expr(field(j, "target")?)?, value: expr(field(j, "value")?)? },
        t => return Err(format!("unknown statement tag {t}")),
    })
}

pub fn cmd(j: &Json) -> R<Cmd> {
    Ok(Cmd {
        name: sfield(j, "name")?,
        params: list(j, "params", |p| Ok((sfield(p, "name")?, ty(field(p, "ty")?)?)))?,
        guard: expr(field(j, "guard")?)?,
        body: stmt(field(j, "body")?)?,
    })
}

pub fn program(j: &Json) -> R<Program> {
    Ok(Program { commands: list(j, "commands", cmd)? })
}

fn status(j: &Json) -> R<HoldStatus> {
    Ok(match j.str().ok_or("a status is a string")? {
        "held" => HoldStatus::Held,
        "captured" => HoldStatus::Captured,
        "released" => HoldStatus::Released,
        t => return Err(format!("unknown status {t}")),
    })
}

pub fn state(j: &Json) -> R<State> {
    Ok(State {
        bals: list(j, "bals", |b| Ok((acct(field(b, "acct")?)?, ifield(b, "bal")?)))?,
        holds: list(j, "holds", |h| {
            Ok(Hold { id: nfield(h, "id")?, owner: acct(field(h, "owner")?)?, amount: ifield(h, "amount")?, status: status(field(h, "status")?)? })
        })?,
        next_hold: nfield(j, "nextHold")?,
        frozen: list(j, "frozen", acct)?,
    })
}

pub fn call(j: &Json) -> R<Call> {
    Ok(Call { name: sfield(j, "name")?, args: list(j, "args", val)? })
}

pub fn policy(j: &Json) -> R<Policy> {
    let o = field(j, "overflow")?;
    Ok(Policy {
        zero: if sfield(j, "zero")? == "noop" { Zero::Noop } else { Zero::Reject },
        self_: if sfield(j, "self")? == "reject" { SelfTransfer::Reject } else { SelfTransfer::Allow },
        guard: if sfield(j, "guard")? == "silent" { Guard::Silent } else { Guard::Error },
        overflow: if sfield(o, "mode")? == "bounded" { Overflow::Bounded(ifield(o, "maxBal")?) } else { Overflow::Unbounded },
    })
}

// ------------------------------------------------------------------------------------------- writing

fn int(n: i128) -> Json {
    Json::Str(n.to_string())
}
fn tagged(t: &str, mut fields: Vec<(&str, Json)>) -> Json {
    fields.insert(0, ("tag", Json::s(t)));
    Json::obj(fields)
}

pub fn acct_json(a: &Acct) -> Json {
    match a {
        Acct::Mint => tagged("mint", vec![]),
        Acct::Sink => tagged("sink", vec![]),
        Acct::User(n) => tagged("user", vec![("name", Json::s(n))]),
        Acct::Escrow(h) => tagged("escrow", vec![("hold", Json::Num(*h as i128))]),
    }
}

pub fn ty_json(t: Ty) -> Json {
    Json::s(match t {
        Ty::Account => "account",
        Ty::Amount => "amount",
        Ty::Hold => "hold",
        Ty::Int => "int",
        Ty::Bool => "bool",
    })
}

pub fn expr_json(e: &Expr) -> Json {
    let two = |t: &str, a: &Expr, b: &Expr| tagged(t, vec![("a", expr_json(a)), ("b", expr_json(b))]);
    match e {
        Expr::Lit(n) => tagged("lit", vec![("value", int(*n))]),
        Expr::Var(x) => tagged("var", vec![("name", Json::s(x))]),
        Expr::Balance(x) => tagged("balance", vec![("e", expr_json(x))]),
        Expr::Frozen(x) => tagged("frozen", vec![("e", expr_json(x))]),
        Expr::Add(a, b) => two("add", a, b),
        Expr::Sub(a, b) => two("sub", a, b),
        Expr::Ge(a, b) => two("ge", a, b),
        Expr::Eq(a, b) => two("eq", a, b),
        Expr::And(a, b) => two("and", a, b),
        Expr::Not(a) => tagged("not", vec![("a", expr_json(a))]),
    }
}

pub fn resource_op_json(r: &ResourceOp) -> Json {
    match r {
        ResourceOp::Deposit { amount, to } => tagged("deposit", vec![("amount", expr_json(amount)), ("to", expr_json(to))]),
        ResourceOp::Move { amount, from, to } => tagged("move", vec![("amount", expr_json(amount)), ("from", expr_json(from)), ("to", expr_json(to))]),
        ResourceOp::Hold { amount, on } => tagged("hold", vec![("amount", expr_json(amount)), ("on", expr_json(on))]),
        ResourceOp::Capture { hold, to } => tagged("capture", vec![("hold", expr_json(hold)), ("to", expr_json(to))]),
        ResourceOp::Release { hold } => tagged("release", vec![("hold", expr_json(hold))]),
    }
}

pub fn stmt_json(s: &Stmt) -> Json {
    match s {
        Stmt::Op(r) => tagged("op", vec![("op", resource_op_json(r))]),
        Stmt::Set { field, target, value } => tagged("set", vec![("field", Json::s(field)), ("target", expr_json(target)), ("value", expr_json(value))]),
    }
}

pub fn cmd_json(c: &Cmd) -> Json {
    Json::obj(vec![
        ("name", Json::s(&c.name)),
        ("params", Json::Arr(c.params.iter().map(|(p, t)| Json::obj(vec![("name", Json::s(p)), ("ty", ty_json(*t))])).collect())),
        ("guard", expr_json(&c.guard)),
        ("body", stmt_json(&c.body)),
    ])
}

pub fn program_json(p: &Program) -> Json {
    Json::obj(vec![("commands", Json::Arr(p.commands.iter().map(cmd_json).collect()))])
}

pub fn state_json(s: &State) -> Json {
    let status = |h: HoldStatus| {
        Json::s(match h {
            HoldStatus::Held => "held",
            HoldStatus::Captured => "captured",
            HoldStatus::Released => "released",
        })
    };
    Json::obj(vec![
        ("bals", Json::Arr(s.bals.iter().map(|(a, v)| Json::obj(vec![("acct", acct_json(a)), ("bal", int(*v))])).collect())),
        (
            "holds",
            Json::Arr(
                s.holds
                    .iter()
                    .map(|h| Json::obj(vec![("id", Json::Num(h.id as i128)), ("owner", acct_json(&h.owner)), ("amount", int(h.amount)), ("status", status(h.status))]))
                    .collect(),
            ),
        ),
        ("nextHold", Json::Num(s.next_hold as i128)),
        ("frozen", Json::Arr(s.frozen.iter().map(acct_json).collect())),
    ])
}

pub fn err_json(e: &Err) -> Json {
    match e {
        Err::UnknownCommand(c) => tagged("unknownCommand", vec![("name", Json::s(c))]),
        Err::BadArgument(p) => tagged("badArgument", vec![("param", Json::s(p))]),
        Err::UnknownAccount(a) => tagged("unknownAccount", vec![("acct", acct_json(a))]),
        Err::SelfTransfer => tagged("selfTransfer", vec![]),
        Err::GuardFailed(c) => tagged("guardFailed", vec![("name", Json::s(c))]),
        Err::UnknownHold(h) => tagged("unknownHold", vec![("hold", Json::Num(*h as i128))]),
        Err::HoldNotOpen(h) => tagged("holdNotOpen", vec![("hold", Json::Num(*h as i128))]),
        Err::Overflow(a) => tagged("overflow", vec![("acct", acct_json(a))]),
        Err::TypeError => tagged("typeError", vec![]),
        Err::OutOfFuel => tagged("outOfFuel", vec![]),
    }
}

pub fn outcome_json(o: &Outcome) -> Json {
    match o {
        Outcome::Ok { state, output, effects } => Json::obj(vec![(
            "ok",
            Json::obj(vec![
                ("state", state_json(state)),
                ("output", Json::Arr(output.iter().map(|h| Json::Num(*h as i128)).collect())),
                ("effects", Json::Arr(effects.iter().map(|Effect::Notify(a)| tagged("notify", vec![("acct", acct_json(a))])).collect())),
            ]),
        )]),
        Outcome::Error(e) => Json::obj(vec![("error", err_json(e))]),
    }
}

pub fn type_outcome_json(r: &Result<(), TypeErr>) -> Json {
    match r {
        Ok(()) => Json::obj(vec![("ok", Json::Bool(true))]),
        Err(e) => Json::obj(vec![(
            "error",
            Json::s(match e {
                TypeErr::DupParam => "dupParam",
                TypeErr::UnknownParam => "unknownParam",
                TypeErr::WrongType => "wrongType",
                TypeErr::NonPositive => "nonPositive",
                TypeErr::UnguardedDebit => "unguardedDebit",
                TypeErr::AssignsResource => "assignsResource",
            }),
        )]),
    }
}

//! Printing LAB-4's formulas as SMT-LIB in the course's vocabulary. Supplied by the template, and the same
//! in every build.
//!
//! The vocabulary (labs/LAB-4/README.md section 3): an account `x` is `x` before a step and `x_p` after
//! it; a parameter `amount` is `p_amount`; in an unrolling, the state after step i is `x_<i>` and step i's
//! parameter is `p_amount_<i>`. A bound variable prints as its own name. The host declares every one of
//! these constants; your text declares none.
//!
//! These printers do not substitute: they print the formula they are given, names resolved as the format
//! says (the innermost bound variable, else a parameter, else an account). Substitution is yours.

use crate::ir::{Expr, Form};

/// How names print: which names are accounts and parameters, and the suffixes of this state.
#[derive(Clone, Debug)]
pub struct Names {
    pub accounts: Vec<String>,
    pub params: Vec<String>,
    /// Appended to an account: "" before the step, "_p" after it, "_3" after step 3.
    pub acct_sfx: String,
    /// Appended to a parameter after `p_<name>`: "" for one step, "_3" for step 3 of an unrolling.
    pub param_sfx: String,
}

impl Names {
    pub fn new(accounts: &[String], params: &[String]) -> Names {
        Names { accounts: accounts.to_vec(), params: params.to_vec(), acct_sfx: String::new(), param_sfx: String::new() }
    }

    /// The same names with these suffixes.
    pub fn at(&self, acct_sfx: &str, param_sfx: &str) -> Names {
        Names { acct_sfx: acct_sfx.into(), param_sfx: param_sfx.into(), ..self.clone() }
    }

    fn resolve(&self, x: &str, bound: &[String]) -> Result<String, String> {
        if bound.iter().any(|b| b == x) {
            Ok(x.to_string())
        } else if self.params.iter().any(|p| p == x) {
            Ok(format!("p_{x}{}", self.param_sfx))
        } else if self.accounts.iter().any(|a| a == x) {
            Ok(format!("{x}{}", self.acct_sfx))
        } else {
            Err(format!("the name {x:?} is not an account, a parameter or a bound variable"))
        }
    }
}

/// An integer literal: SMT-LIB writes -5 as (- 5).
pub fn num(n: i64) -> String {
    if n >= 0 {
        n.to_string()
    } else {
        format!("(- {})", n.unsigned_abs())
    }
}

pub fn expr(e: &Expr, names: &Names) -> Result<String, String> {
    expr_in(e, names, &[])
}

pub fn expr_in(e: &Expr, names: &Names, bound: &[String]) -> Result<String, String> {
    Ok(match e {
        Expr::Num(n) => num(*n),
        Expr::Var(x) => names.resolve(x, bound)?,
        Expr::Add(a, b) => format!("(+ {} {})", expr_in(a, names, bound)?, expr_in(b, names, bound)?),
        Expr::Sub(a, b) => format!("(- {} {})", expr_in(a, names, bound)?, expr_in(b, names, bound)?),
    })
}

pub fn form(f: &Form, names: &Names) -> Result<String, String> {
    form_in(f, names, &[])
}

pub fn form_in(f: &Form, names: &Names, bound: &[String]) -> Result<String, String> {
    Ok(match f {
        Form::Bool(b) => if *b { "true" } else { "false" }.to_string(),
        Form::Cmp(op, a, b) => format!("({} {} {})", op.smt(), expr_in(a, names, bound)?, expr_in(b, names, bound)?),
        Form::And(items) => join("and", "true", items, names, bound)?,
        Form::Or(items) => join("or", "false", items, names, bound)?,
        Form::Not(g) => format!("(not {})", form_in(g, names, bound)?),
        Form::Implies(a, b) => format!("(=> {} {})", form_in(a, names, bound)?, form_in(b, names, bound)?),
        Form::Forall(y, body) => {
            let mut inner = bound.to_vec();
            inner.push(y.clone());
            format!("(forall (({y} Int)) {})", form_in(body, names, &inner)?)
        }
        Form::App(fun, args) => {
            if args.is_empty() {
                fun.clone()
            } else {
                let printed: Result<Vec<String>, String> = args.iter().map(|a| expr_in(a, names, bound)).collect();
                format!("({fun} {})", printed?.join(" "))
            }
        }
    })
}

fn join(op: &str, unit: &str, items: &[Form], names: &Names, bound: &[String]) -> Result<String, String> {
    let parts: Result<Vec<String>, String> = items.iter().map(|g| form_in(g, names, bound)).collect();
    let parts = parts?;
    Ok(match parts.len() {
        0 => unit.to_string(),
        1 => parts.into_iter().next().unwrap_or_default(),
        _ => format!("({op} {})", parts.join(" ")),
    })
}

/// A named conjunct, `(! term :named name)`: the checks and `statespace defend` find conjuncts by name.
pub fn named(term: &str, name: &str) -> String {
    format!("(! {term} :named {name})")
}

/// `(define-fun name ((a Int) (b Int) ...) Bool body)`: a formula over the state, named.
pub fn define_fun(name: &str, accounts: &[String], body: &str) -> String {
    let formals: Vec<String> = accounts.iter().map(|a| format!("({a} Int)")).collect();
    format!("(define-fun {name} ({}) Bool {body})", formals.join(" "))
}

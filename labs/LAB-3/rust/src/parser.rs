//! LAB-3.8: a parser for Mini-Plinth's toy syntax.
//!
//! The roadmap's text, verbatim, must read:
//!
//!   entity Account; command Transfer(from, to, amount); requires balance(from) >= amount; do move amount from from to to.
//!
//! The grammar (curriculum/S03-semantics.md section 2.1; labs/LAB-3/README.md has it in full):
//!
//!   program := ("entity" Account ";"? | command)*
//!   command := "command" Name "(" [param ("," param)*] ")" ";"? ["requires" expr ";"?] "do" stmt "."? ";"?
//!   param   := name [":" type]                 type: account | amount | hold | int | bool
//!   stmt    := "move" e "from" e "to" e | "deposit" e "to" e | "hold" e "on" e | "capture" e "to" e
//!            | "release" e | "set" field "(" e ")" ":=" e
//!   expr    := neg ("&&" neg)*;  neg := "!" neg | cmp;  cmp := sum [(">=" | "=") sum]
//!   sum     := atom (("+" | "-") atom)*;  atom := int | "-" int | "(" expr ")" | "balance" "(" expr ")"
//!            | "frozen" "(" expr ")" | name
//!
//! `--` starts a comment. With no `requires`, the guard is `0 >= 0`. `from`, `to` and `on` name parameters too.
//! An untyped parameter's type comes from its uses: an account (`balance(x)`, an operation's account), an
//! amount (an operation's amount, which may also be compared), a hold, a bool, or an int (only arithmetic). Two
//! uses that disagree, a parameter with no use that says, or a second command of one name, is an error.
//! Every error names its line and column (1-based).

use crate::ir::Program;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseError {
    pub line: usize,
    pub column: usize,
    pub message: String,
}

pub fn parse_program(_text: &str) -> Result<Program, ParseError> {
    // TODO(you): a lexer that tracks line and column, a recursive-descent parser, and the type inference.
    Err(ParseError { line: 1, column: 1, message: "not written yet".into() })
}

//! LAB-7.5's paired-state checker. This file and `main.rs` are the course's half (reference module, earns
//! nothing): the view reader, the observer reader, the state vocabulary and `encode_view_body`, which encodes
//! one copy of a view's response as SMT-LIB terms over one copy of the state. Your half is
//! `noninterference.rs`: the product construction, two copies of the state related by your relation, the view
//! run once on each, and the negated conclusion that the two observations differ.
//!
//! The state of one request (one viewer, one document id, one search term) is eight symbols:
//!
//! | symbol           | sort | meaning                                                              |
//! |------------------|------|----------------------------------------------------------------------|
//! | `exists`         | Bool | the document exists                                                  |
//! | `own`            | Bool | it belongs to the viewer's tenant                                    |
//! | `shared`         | Bool | another tenant shared it with the viewer, or with one of their teams |
//! | `title`          | Int  | its title                                                            |
//! | `body`           | Int  | its body                                                             |
//! | `internal_notes` | Int  | its internal notes                                                   |
//! | `visible`        | Int  | how many documents matching the search term the viewer may read     |
//! | `hidden`         | Int  | how many matching documents the viewer may not read                  |
//!
//! Copy `L` names them `exists_L`, `own_L` and so on, copy `R` `exists_R`: `rename(sym, side)`.
//! `statespace check lab7.5` decodes a model by these names, so keep them.

pub mod noninterference;

use std::fmt;

/// Which copy of the state a symbol belongs to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    L,
    R,
}

impl fmt::Display for Side {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Side::L => "L",
            Side::R => "R",
        })
    }
}

/// The state symbols and their sorts.
pub const STATE: &[(&str, &str)] = &[
    ("exists", "Bool"),
    ("own", "Bool"),
    ("shared", "Bool"),
    ("title", "Int"),
    ("body", "Int"),
    ("internal_notes", "Int"),
    ("visible", "Int"),
    ("hidden", "Int"),
];

/// The fields a document has, and a page can return.
pub const FIELDS: &[&str] = &["title", "body", "internal_notes"];

/// The parts of a response an observer can see.
pub const PARTS: &[&str] = &["code", "fields", "total"];

/// A state symbol of one copy: `rename("body", Side::L)` is `body_L`.
pub fn rename(sym: &str, side: Side) -> String {
    format!("{sym}_{side}")
}

/// A view, read from a `.view` file (views/open.view documents the format).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct View {
    pub name: String,
    pub missing: String,
    pub denied: String,
    pub fields: Vec<String>,
    pub total: String,
}

/// The observer and the release list, read from claims/observer.yaml.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Observer {
    /// The parts of a response the viewer sees: `code`, `fields`, `total`.
    pub observe: Vec<String>,
    /// The fields of a shared document its owner released to the viewer's tenant.
    pub release: Vec<String>,
}

fn strip_comment(line: &str) -> &str {
    match line.find('#') {
        Some(i) => &line[..i],
        None => line,
    }
}

/// Read a `.view` file.
pub fn read_view(text: &str) -> Result<View, String> {
    let mut view = View { name: String::new(), missing: String::new(), denied: String::new(), fields: Vec::new(), total: "none".into() };
    for (n, raw) in text.lines().enumerate() {
        let line = strip_comment(raw).trim();
        if line.is_empty() {
            continue;
        }
        let mut words = line.split_whitespace();
        let key = words.next().unwrap_or("");
        let value = words.next().unwrap_or("").to_string();
        if value.is_empty() || words.next().is_some() {
            return Err(format!("line {}: expected `<key> <value>`, found `{line}`", n + 1));
        }
        match key {
            "view" => view.name = value,
            "missing" => view.missing = value,
            "denied" => view.denied = value,
            "field" => {
                if !FIELDS.contains(&value.as_str()) {
                    return Err(format!("line {}: `{value}` is not a field (title, body, internal_notes)", n + 1));
                }
                if !view.fields.contains(&value) {
                    view.fields.push(value)
                }
            }
            "total" => {
                if !["none", "visible", "all"].contains(&value.as_str()) {
                    return Err(format!("line {}: total is none, visible or all, not `{value}`", n + 1));
                }
                view.total = value
            }
            _ => return Err(format!("line {}: unknown key `{key}`", n + 1)),
        }
    }
    if view.name.is_empty() || view.missing.is_empty() || view.denied.is_empty() {
        return Err("a view names itself (`view`), its `missing` code and its `denied` code".into());
    }
    Ok(view)
}

fn read_list(value: &str, line: usize) -> Result<Vec<String>, String> {
    let v = value.trim();
    if !(v.starts_with('[') && v.ends_with(']')) {
        return Err(format!("line {line}: expected a list such as [title, body]"));
    }
    Ok(v[1..v.len() - 1].split(',').map(|s| s.trim().trim_matches('"').trim_matches('\'').to_string()).filter(|s| !s.is_empty()).collect())
}

/// Read claims/observer.yaml: the two keys `observe` and `release`, each a flow list.
pub fn read_observer(text: &str) -> Result<Observer, String> {
    let mut observe = None;
    let mut release = None;
    for (n, raw) in text.lines().enumerate() {
        let line = strip_comment(raw).trim();
        if line.is_empty() {
            continue;
        }
        let Some((key, value)) = line.split_once(':') else {
            return Err(format!("line {}: expected `key: [..]`", n + 1));
        };
        match key.trim() {
            "observe" => observe = Some(read_list(value, n + 1)?),
            "release" => release = Some(read_list(value, n + 1)?),
            _ => {}
        }
    }
    let observe = observe.ok_or("claims/observer.yaml has no `observe` list")?;
    let release = release.ok_or("claims/observer.yaml has no `release` list")?;
    for part in &observe {
        if !PARTS.contains(&part.as_str()) {
            return Err(format!("`{part}` is not a part of a response (code, fields, total)"));
        }
    }
    for field in &release {
        if !FIELDS.contains(&field.as_str()) {
            return Err(format!("`{field}` is not a field (title, body, internal_notes)"));
        }
    }
    Ok(Observer { observe, release })
}

/// One copy of the state: its declarations and its well-formedness (counts are not negative).
pub fn declare_state(side: Side) -> String {
    let mut out = String::new();
    for (sym, sort) in STATE {
        out.push_str(&format!("(declare-const {} {sort})\n", rename(sym, side)));
    }
    out.push_str(&format!("(assert (>= {} 0))\n(assert (>= {} 0))\n", rename("visible", side), rename("hidden", side)));
    out
}

/// A response code as a number: `ok` is 0, `not_found` 1, `forbidden` 2, anything else from 3 up.
pub fn code_number(code: &str) -> i64 {
    match code {
        "ok" => 0,
        "not_found" => 1,
        "forbidden" => 2,
        other => 3 + other.bytes().fold(0i64, |h, b| (h * 31 + b as i64) % 1_000_003),
    }
}

/// One copy of a view's response, as SMT-LIB terms over that copy's state.
#[derive(Clone, Debug)]
pub struct Response {
    /// The response code: `ok`, or the view's missing or denied code, as `code_number` gives it.
    pub code: String,
    /// Each field the page returns, by name: the field's value on a page, and 0 on a refusal.
    pub fields: Vec<(String, String)>,
    /// The count the response carries (0 when the view carries none).
    pub total: String,
}

/// Encode `view` once, over the state copy `side`.
pub fn encode_view_body(view: &View, side: Side) -> Response {
    let s = |sym: &str| rename(sym, side);
    let readable = format!("(and {} (or {} {}))", s("exists"), s("own"), s("shared"));
    let code = format!(
        "(ite (not {}) {} (ite (not {readable}) {} 0))",
        s("exists"),
        code_number(&view.missing),
        code_number(&view.denied)
    );
    let fields = view.fields.iter().map(|f| (f.clone(), format!("(ite {readable} {} 0)", s(f)))).collect();
    let total = match view.total.as_str() {
        "visible" => s("visible"),
        "all" => format!("(+ {} {})", s("visible"), s("hidden")),
        _ => "0".to_string(),
    };
    Response { code, fields, total }
}

//! LAB-7.5: your product construction, the self-composition of one view. TODO(you)
//!
//! `product` returns one SMT-LIB query whose models are leaking pairs: two copies of the state, L and R,
//! related by Rel from claims/observer.yaml, the view encoded once on each (`encode_view_body`), and the
//! negated conclusion: the observations the observer sees differ. `sat` is a leaking pair, which
//! `statespace check lab7.5` decodes by the symbol names and replays; `unsat` is noninterference for this
//! view, observer, relation and encoding, read only beside `premise`, which must be `sat`: Rel together with
//! a secret that differs between the copies.
//!
//! Rel(L, R) is the tenant equivalence of S7.L6: the copies agree on what the viewer's tenant may know.
//!   - `own`, `shared` and `visible` are equal: the viewer's tenant knows its own data and its shares;
//!   - a document of the viewer's tenant (`own`) is equal everywhere: `exists` and every field;
//!   - a document shared with the viewer (`shared`) has an equal `exists` and equal released fields, the
//!     fields in `obs.release`;
//!   - anything else may differ: another tenant's private documents, and `hidden`.
//!
//! Each query is a whole script, declarations first and `(check-sat)` last. Use `declare_state` for each
//! copy, and `rename` for every state symbol.

use crate::{declare_state, encode_view_body, Observer, Side, View};

/// The query whose models are leaking pairs.
pub fn product(view: &View, obs: &Observer) -> String {
    // TODO(you): assert Rel(L, R), encode the view on L and on R, and assert that what the observer sees
    // differs: the code, the fields or the total, as far as obs.observe names them.
    let _ = (view, obs, encode_view_body);
    let mut out = String::new();
    out.push_str(&declare_state(Side::L));
    out.push_str(&declare_state(Side::R));
    out.push_str("(check-sat)\n");
    out
}

/// The premise witness: Rel(L, R) holds while a secret differs between the copies.
pub fn premise(view: &View, obs: &Observer) -> String {
    // TODO(you): assert Rel(L, R) and that a secret differs: the internal notes, the hidden count, or
    // whether another tenant's private document exists.
    let _ = (view, obs);
    let mut out = String::new();
    out.push_str(&declare_state(Side::L));
    out.push_str(&declare_state(Side::R));
    out.push_str("(check-sat)\n");
    out
}

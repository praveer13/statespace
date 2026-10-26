//! miniplinth check: a verification-condition generator for Mini-Plinth commands that emits SMT-LIB.
//!
//! The exports are pure functions over JSON (labs/LAB-4/README.md section 3); the host runs Z3 between
//! calls, and the module imports nothing. `json`, `ir` and `smt` are the template's. The other modules
//! are yours: each one says which stage it belongs to.

pub mod decode;
pub mod driver;
pub mod ir;
pub mod json;
pub mod smt;
pub mod vc;
pub mod wp;

use json::Value;

/// Dispatch one request by its function name.
pub fn call(name: &str, arg: &Value) -> Result<Value, String> {
    match name {
        "wp_emit" => wp::wp_emit(arg),
        "vc_emit" => vc::vc_emit(arg),
        "model_decode" => decode::model_decode(arg),
        "bmc_emit" => driver::bmc_emit(arg),
        "verdict_compose" => match arg.get("mode").and_then(Value::as_str) {
            Some("cti") => driver::verdict_compose_cti(arg),
            _ => decode::verdict_compose(arg),
        },
        other => Err(format!("no export {other}")),
    }
}

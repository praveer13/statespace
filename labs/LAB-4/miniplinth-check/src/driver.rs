//! LAB-4.6: `bmc_emit` and the CTI driver's `verdict_compose` (mode "cti").
//!
//! `bmc_emit` request: `{"system": Program (with "init"), "inv": Form, "k": k}`. Reply:
//! `{"defs": [...], "assert": "<term>"}`: a run of exactly k steps from Init whose last state violates Inv.
//! The host declares `x_<i>` for each account and i in 0..=k, `p_<param>_<i>` for each parameter name and
//! i in 1..=k, and `cmd_<i>` (an Int: the index of step i's command in the system's list) for i in 1..=k.
//! A step whose `requires` fails leaves the state unchanged.
//!
//! `verdict_compose` (mode "cti") request: `{"mode": "cti", "system": Program, "inv": Form, "n": N,
//!   "steps": [{"command": "<name>", "verdict": "sat"|"unsat"|...}, ...],
//!   "bmc": [{"k": 0, "verdict": "unsat", "model": {...}}, ...]}`.
//! `steps` holds each command's inductive step (your vc_emit, forward route, with Inv); `bmc` holds your
//! bmc_emit for k = 0, 1, ... up to the first sat, or up to N.
//! Reply: `{"verdict": "inductive" | "REACHABLE in <k>" | "CTI: none within <N>",
//!   "claim": "CL-4.4" | "CL-4.5" | null, "trace": {"init": {...}, "steps": [{"command", "params"}]} | null}`.
//! A REACHABLE verdict carries the trace decoded from that model; the host replays it.

use crate::json::Value;

// TODO(you): LAB-4.6: unroll the system k times from Init.
pub fn bmc_emit(arg: &Value) -> Result<Value, String> {
    let _ = arg;
    Err("TODO(you): bmc_emit is not written yet (LAB-4.6)".into())
}

// TODO(you): LAB-4.6: inductive, REACHABLE in k, or CTI with no violation within N; and the claim.
pub fn verdict_compose_cti(arg: &Value) -> Result<Value, String> {
    let _ = arg;
    Err("TODO(you): the CTI driver is not written yet (LAB-4.6)".into())
}

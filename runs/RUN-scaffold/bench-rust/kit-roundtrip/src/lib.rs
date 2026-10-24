// A one-check lab built against the vendored kernelspace kit (vendor/kernelspace/labs/kit): the smallest module
// that speaks ABI v2, to prove that the vendored host and the vendored kit still agree under the pinned toolchain.
use kslab::{Check, CheckDef, Ctx, Lab};

fn sum(_: &Ctx) -> Check {
    if 1 + 1 == 2 {
        Check::pass("sum", "one and one make two", "ok")
    } else {
        Check::fail("sum", "one and one make two", "arithmetic is broken")
    }
}

fn seeded(ctx: &Ctx) -> Check {
    Check::pass("seeded", "a seeded check sees the seed", format!("seed {}", ctx.seed))
}

// An unfinished check, as a student's file is before they write it: the module traps and the host reads the panic text.
fn unfinished(_: &Ctx) -> Check {
    todo!("construct your allocator")
}

static CHECKS: [CheckDef; 3] = [
    CheckDef { id: "sum", label: "one and one make two", stage: 1, seeded: false, default_seed: 0, run: sum },
    CheckDef { id: "seeded", label: "a seeded check sees the seed", stage: 2, seeded: true, default_seed: 7, run: seeded },
    CheckDef { id: "todo", label: "an unfinished check traps", stage: 3, seeded: false, default_seed: 0, run: unfinished },
];

static LAB: Lab = Lab { id: "smoke-lab", version: 2, checks: &CHECKS };

kslab::export_abi_v2!();

#[no_mangle]
pub extern "C" fn ks_run(p: u32, l: u32) -> u64 {
    kslab::run(unsafe { kslab::input(p, l) }, &LAB)
}

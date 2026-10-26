//! LAB-8.4: your fault plan. The harness (`world.rs`) calls `choose` at every point where something can happen,
//! with a menu: `normal` ordinary events (a commit, the provider taking a request, a reply delivered) and `faults`
//! fault events (a crash, a timer firing, a reply delivered again). Between two steps of your machine's outputs the
//! menu is one normal event (go on) and one fault (crash here).
//!
//! The run must be a function of the seed: every choice comes from `rng`, never from a clock, the environment,
//! a hash map's order or any other source the seed does not control. With `menu.rate` faults per thousand
//! choices, pick a fault when there is one and a draw says so, otherwise a normal event.

use crate::world::Rng;

/// What can happen at one point of the run.
#[derive(Clone, Copy, Debug)]
pub struct Menu {
    /// how many ordinary events are enabled (indices 0..normal)
    pub normal: usize,
    /// how many fault events are enabled (indices 0..faults)
    pub faults: usize,
    /// faults per thousand choices
    pub rate: u32,
}

/// The event chosen: an index into the normal events or into the faults.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Choice {
    Normal(usize),
    Fault(usize),
}

/// Choose the next event from the seeded `rng`.
pub fn choose(rng: &mut Rng, menu: &Menu) -> Choice {
    // TODO(you): draw from rng: a fault with probability menu.rate / 1000 when menu.faults > 0, and which one;
    // otherwise which normal event. As written, the plan never injects a fault and always takes the first event.
    let _ = (rng, menu);
    Choice::Normal(0)
}

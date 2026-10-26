use std::hint::black_box;
fn main() {
    let b: i64 = black_box(i64::MAX);
    let x: i64 = black_box(1);
    let sum_before: i128 = b as i128 + 0;
    let r = std::panic::catch_unwind(|| b + x);
    match r {
        Ok(v) => println!("b + x = {v} (wrapped; non-negativity broken; i128 total changed by {})", (v as i128) - sum_before - 1),
        Err(_) => println!("b + x panicked (overflow check)"),
    }
    println!("checked_add = {:?}", b.checked_add(x));
}

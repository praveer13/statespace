# Decision record: zero

The edge case: Transfer(a, b, 0), and every call like it. The semantics, not the English sentence, decides it (S3.L7).
Write the choice your evaluator implements; LAB-3.c7 compares it with `Lab3.policy`'s `zero` field.

choice: TODO(you)  <!-- one of: reject | noop -->

## Decision

TODO(you): what your evaluator does in this case, and why.

## Alternative considered

TODO(you): the other option, and what it would have done to the same call.

## Consequence

TODO(you): what a caller sees, and which goldens or claims your choice selects.

## Downstream

TODO(you): what the SQL compiler (S6), your Rust interpreter (LAB-3.10) and an observer must then do the same way.

// Where in a source file a JSON Pointer sits. The reader (source.ts, records.ts) places the nodes it can, and a
// finding about a node it did not place is reported at the nearest placed ancestor.

/** The line of a pointer, or of its nearest placed ancestor, or null. */
export function lineOf(lines: ReadonlyMap<string, number>, pointer: string): number | null {
  let p = pointer
  for (;;) {
    const hit = lines.get(p)
    if (hit !== undefined) return hit
    const cut = p.lastIndexOf('/')
    if (cut < 0) return null
    p = p.slice(0, cut)
  }
}

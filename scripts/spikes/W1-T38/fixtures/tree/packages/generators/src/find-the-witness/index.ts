// A stand-in for the GEN-find-the-witness family, for GATE-lessons' tests: a constructed answer, so no options.
// The real family is packages/generators/src/find-the-witness/.
export const generator = {
  id: 'GEN-find-the-witness',
  templates: [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }],
  make(seed, band) {
    return { item: { stem: `Give a witness (band ${band}, seed ${seed % 5})`, parts: [{ kind: 'constructed', id: 'p1', prompt: '', language: { name: 'model', summary: 'values for a, b and amount' } }] } }
  },
}

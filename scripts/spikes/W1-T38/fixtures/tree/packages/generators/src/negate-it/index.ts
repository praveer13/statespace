// A stand-in for the GEN-negate-it family, for GATE-lessons' tests. The real family is packages/generators/src/negate-it/.
const option = (id, text) => ({ id, text, why: '', origin: { kind: 'reference' } })

export const generator = {
  id: 'GEN-negate-it',
  templates: [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }],
  make(seed, band, template) {
    const guard = ['allowed', 'covered', 'settled'][seed % 3]
    return {
      item: {
        stem: `Which formula hunts for a bug? (${template}, band ${band})`,
        parts: [{ kind: 'choice', id: 'p1', prompt: '', options: [option('A', `${guard} ∧ bal′ < 0`), option('B', `${guard} → bal′ < 0`), option('C', `¬${guard} ∧ bal′ < 0`)] }],
      },
    }
  },
}

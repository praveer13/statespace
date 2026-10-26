// A stand-in for the GEN-which-stamp family, for GATE-lessons' tests. The real family is packages/generators/src/which-stamp/.
const option = (id, text) => ({ id, text, why: '', origin: { kind: 'reference' } })

export const generator = {
  id: 'GEN-which-stamp',
  templates: [{ id: 't1' }, { id: 't2' }, { id: 't3' }],
  make() {
    return { item: { stem: 'Which stamp?', parts: [{ kind: 'choice', id: 'p1', prompt: '', options: [option('A', 'PROVED [P] · uncertified'), option('B', 'UNKNOWN [?] · canceled'), option('C', 'REFUTED [R] · the witness replays')] }] } }
  },
}

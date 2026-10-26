// A stand-in for the GEN-call-it family, for GATE-lessons' tests: a maker with the real one's shape (an instance's
// item holds parts, and a choice part holds options). The real family is packages/generators/src/call-it/.
const option = (id, text) => ({ id, text, why: '', origin: { kind: 'reference' } })

export const generator = {
  id: 'GEN-call-it',
  templates: [{ id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }],
  make(seed, band, template) {
    if (template === 't4') {
      return {
        item: {
          stem: 'Which of these statements hold?',
          parts: [
            {
              kind: 'multi-tf',
              id: 'p1',
              prompt: 'True or false',
              statements: [
                { id: 'S1', text: `this answer covers every input of this encoding, if the solver is sound (seed ${seed % 7})`, why: '', origin: { kind: 'reference' } },
                { id: 'S2', text: 'this answer means the property holds', why: '', origin: { kind: 'reference' } },
              ],
            },
          ],
        },
      }
    }
    return { item: { stem: `Which verdict? (band ${band})`, parts: [{ kind: 'choice', id: 'p1', prompt: '', options: [option('A', 'sat'), option('B', 'unsat'), option('C', 'unknown')] }] } }
  },
}

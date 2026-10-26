// The label on unreviewed content (spine section 13; PLAN.md section 11.2): everything an agent drafts carries it
// until learner-zero has studied it and the owner has reviewed it. A source file says so with `draft: true` in
// its front matter, which is where GATE-runs reads it (scripts/runs/registry.mjs, isDraft).

/** The label, as the spine writes it. */
export const DRAFT_LABEL = 'draft: first-learner pass pending'

/** The banner a screen shows (DESIGN.md section 6.15, Banners): the label with a capital. */
export const DRAFT_BANNER = 'Draft: first-learner pass pending'

/** What a draft's reference to a run that is not recorded yet renders as (ARCHITECTURE.md section 9.2). */
export const RUN_PENDING = 'run not yet recorded'

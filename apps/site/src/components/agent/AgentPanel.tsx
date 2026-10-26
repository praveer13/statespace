// "Ask your own agent" (W1-T18; ARCHITECTURE.md section 12.4): the end of a lesson or drawer gives the learner the page's
// Markdown link and a tutoring prompt to paste into the agent they already use. The site has no model of its own and
// sends nothing anywhere: copying writes to the learner's clipboard, and the agent reads a static file. Nothing here is
// recorded, counted or graded.

import { useEffect, useId, useRef, useState } from 'react'
import './agent.css'

export interface AgentPanelProps {
  readonly id: string
  readonly title: string
  readonly kind: 'lesson' | 'drawer'
}

/** The site's root as an absolute URL, with a trailing slash, so links work under any base path. */
function siteRoot(): string {
  const base = import.meta.env.BASE_URL ?? '/'
  if (typeof window === 'undefined') return base
  return new URL(base, window.location.origin).href
}

/** Inline Markdown markers out of a title, for plain text. */
const plain = (s: string): string => s.replace(/[`*_]/g, '')

export function tutoringPrompt(kind: 'lesson' | 'drawer', id: string, title: string, root: string): string {
  const what = kind === 'lesson' ? `lesson ${id}, “${plain(title)}”` : `drawer ${id}, “${plain(title)}”`
  return [
    `I am studying statespace, a formal-methods course. Tutor me through ${what}.`,
    '',
    `The page, as Markdown: ${root}md/${id}.md`,
    `The course's rules for tutors (read these first): ${root}agent/TUTORING.md`,
    '',
    'Ask me one question at a time, and let me answer before you explain.',
    kind === 'lesson'
      ? "Do not answer the page's questions or Call It predictions for me; I commit first, then we talk it through."
      : 'Check my reading by asking me to restate each idea in my own words.',
    'When I am stuck, ask what I tried and what I expected, then give the smallest hint that moves me.',
    "Say what each tool's answer does and does not establish, and cite the run IDs the page cites instead of inventing numbers.",
  ].join('\n')
}

type Copied = { readonly what: 'link' | 'prompt'; readonly ok: boolean } | null

async function copyText(text: string, fallback: HTMLElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText !== undefined) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to selecting the text
  }
  if (fallback !== null) {
    const range = document.createRange()
    range.selectNodeContents(fallback)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
  return false
}

export function AgentPanel({ id, title, kind }: AgentPanelProps) {
  const uid = useId()
  const [root, setRoot] = useState(() => siteRoot())
  useEffect(() => setRoot(siteRoot()), [])
  const [copied, setCopied] = useState<Copied>(null)
  const linkRef = useRef<HTMLElement>(null)
  const promptRef = useRef<HTMLPreElement>(null)
  const mdUrl = `${root}md/${id}.md`
  const prompt = tutoringPrompt(kind, id, title, root)

  const copy = async (what: 'link' | 'prompt') => {
    const ok = await copyText(what === 'link' ? mdUrl : prompt, what === 'link' ? linkRef.current : promptRef.current)
    setCopied({ what, ok })
  }

  const status =
    copied === null
      ? ''
      : copied.ok
        ? copied.what === 'link'
          ? 'Link copied. Paste it into your agent.'
          : 'Prompt copied. Paste it into your agent.'
        : `Your browser kept the clipboard closed, so the ${copied.what} is selected: copy it with Ctrl+C or Cmd+C.`

  return (
    <section className="chapter-end agent-panel" aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`}>Ask your own agent</h2>
      <p className="agent-lede">
        Your agent can read this {kind} as Markdown. Copy its link, or a prompt that asks the agent to tutor rather than answer, and paste it
        into the agent you already use. The site sends nothing and sees nothing of the agent.
      </p>
      <dl className="agent-rows">
        <div className="agent-row">
          <dt>Markdown</dt>
          <dd>
            <code ref={linkRef} className="agent-url">
              {mdUrl}
            </code>
            <span className="agent-actions">
              <button type="button" className="button button-primary" onClick={() => void copy('link')}>
                Copy link
              </button>
              <a className="agent-open" href={`${root}md/${id}.md`} target="_blank" rel="noopener">
                Open the Markdown
              </a>
            </span>
          </dd>
        </div>
        <div className="agent-row">
          <dt>Prompt</dt>
          <dd>
            <pre ref={promptRef} className="agent-prompt" tabIndex={0} aria-label="Tutoring prompt">
              {prompt}
            </pre>
            <span className="agent-actions">
              <button type="button" className="button button-secondary" onClick={() => void copy('prompt')}>
                Copy prompt
              </button>
            </span>
          </dd>
        </div>
      </dl>
      <p className="agent-status" role="status" aria-live="polite">
        {status}
      </p>
      <p className="agent-more">
        Every page, lab and audit case is listed in{' '}
        <a href={`${root}llms.txt`} target="_blank" rel="noopener">
          llms.txt
        </a>
        , and the{' '}
        <a href={`${root}agent/TUTORING.md`} target="_blank" rel="noopener">
          tutoring rules
        </a>{' '}
        say what an agent leaves to you. Each lab zip carries AGENTS.md, CLAUDE.md and a guard hook that stops an agent editing your claims, receipts and{' '}
        <code>TODO(you)</code> files.
      </p>
    </section>
  )
}

export const meta = {
  name: 'commonplace-dev-cycle',
  description: 'Architect designs a task, Coder builds it, Tester tries to break it, Manager reports back',
  phases: [
    { title: 'Design', detail: 'Architect turns the task into a concrete plan + open questions' },
    { title: 'Build', detail: 'Coder implements the approved plan against a fresh clone' },
    { title: 'Verify', detail: 'Tester applies the patch and tries to break it' },
    { title: 'Report', detail: 'Manager summarizes status for the CEO' },
  ],
}

// How this workflow is meant to be run (see .claude/agents/*.md and TEAM_CHARTER.md
// for the full role definitions this script is implementing):
//
//   Workflow({ script: <this file's content>, args: { task: "<what to build>" } })
//
// If the Architect surfaces blocking open questions, this run stops after the
// Design phase and returns them instead of building on an unresolved guess —
// the caller relays those questions to the CEO, then re-invokes with
// args.decisions filled in.

const REPO_URL = 'https://github.com/irez16/commonPlace.git'

// Inlined rather than read from the clone. TEAM_CHARTER.md and .claude/agents/*.md
// are now committed upstream, so a fresh clone of REPO_URL does have them; these
// prompts could go back to just pointing agents at the files instead of
// duplicating their content here. Until that cleanup happens, keep the inlined
// copies in sync with the files.
const CHARTER = `
CommonPlace: React 19 + TypeScript + Vite + React Router 7, Supabase (Auth/Postgres/Storage/Edge Functions),
Sentry, hCaptcha, installable as a PWA. Locked design: bone paper background (#EAE4D6), wine/oxblood accent
(#8C4444 default, ink-blue/moss-green alternatives), warm near-black text (never pure black), Fraunces
(serif titles/quotes) + Inter (body) + IBM Plex Mono (metadata/chips), dark mode is first-class, bottom tab
bar (Feed/Journal/Ledger), no separate Dashboard (a user's own /@username page IS the app). No hard
window.location.reload()/.href for auth transitions — use useProfileStatus's refresh() and React Router's
navigate(). Data-fetching hooks live in src/hooks/ (one per concern, {loading, error, data} shape). Page
components live in src/components/, one .tsx + matching .css each. Known accepted gaps: no pagination
anywhere, passage_connections is dead schema, delete-account/change-email/export-data/log-out-everywhere/
private-accounts are deferred and not started, some pre-existing lint warnings not yet cleaned up. Existing
legal/compliance surface as of the last audit: a LegalPage.tsx exists with Terms and Privacy Policy sections
(added in a "production-readiness batch" alongside hCaptcha and Sentry) — check its actual current content
rather than assuming it's complete or accurate.
`.trim()

const DESIGN_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    plan: { type: 'string', description: 'Concrete step-by-step implementation plan, file by file' },
    filesToChange: { type: 'array', items: { type: 'string' } },
    acceptanceCriteria: { type: 'array', items: { type: 'string' } },
    openQuestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          why: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          recommendation: { type: 'string' },
        },
        required: ['question', 'why', 'options'],
      },
    },
    readyToBuild: { type: 'boolean', description: 'False if any openQuestions are genuinely blocking' },
  },
  required: ['summary', 'plan', 'filesToChange', 'acceptanceCriteria', 'openQuestions', 'readyToBuild'],
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    patch: { type: 'string', description: 'Full unified diff (git diff output) of all changes, empty string if none' },
    buildPassed: { type: 'boolean' },
    lintPassed: { type: 'boolean' },
    deviations: { type: 'string', description: 'Anything built differently than planned, and why' },
    testerNotes: { type: 'string', description: 'Specific things the Tester should scrutinize closely' },
  },
  required: ['summary', 'filesChanged', 'patch', 'buildPassed', 'lintPassed', 'deviations', 'testerNotes'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocking', 'minor'] },
          summary: { type: 'string' },
          reproduction: { type: 'string' },
        },
        required: ['severity', 'summary', 'reproduction'],
      },
    },
    verdict: { type: 'string', enum: ['ready', 'ready_with_notes', 'blocked'] },
    blockingReason: { type: 'string' },
  },
  required: ['findings', 'verdict', 'blockingReason'],
}

function architectPrompt(task, decisions) {
  return `You are the Architect for CommonPlace, a solo-built React/Supabase app (github.com/irez16/commonPlace). ` +
    `You design and scope work; you never write code. Clone the repo read-only with ` +
    `\`git clone --depth 1 ${REPO_URL} repo\` and inspect the actual source under repo/src before proposing anything — ` +
    `don't assume, check.\n\nProject charter (locked decisions, conventions, known gaps — do not silently override ` +
    `anything here without flagging it):\n${CHARTER}\n\n` +
    `Task from the CEO: ${task}\n\n` +
    (decisions ? `The CEO has already decided the following on prior open questions — treat these as final, do not re-ask them:\n${JSON.stringify(decisions, null, 2)}\n\n` : '') +
    `For each part of the task, first check whether it's already handled in the codebase (don't propose rebuilding ` +
    `something that already works). Separate what's a pure technical/code fix you can fully specify from what ` +
    `genuinely needs the CEO's own input — real business facts (legal business name, registered address, support ` +
    `email), content only he can write or approve (actual refund terms, specific claims made in marketing copy, ` +
    `whether any reviews/testimonials on the site are genuine), and jurisdiction calls (which country/region's laws ` +
    `to write the legal pages for). Put every one of those in openQuestions rather than inventing placeholder facts — ` +
    `a fake business address or invented refund policy is worse than asking. Produce the structured design output: ` +
    `summary, plan, filesToChange, acceptanceCriteria, openQuestions, readyToBuild.`
}

function coderPrompt(design) {
  return `You are the Coder for CommonPlace. You implement exactly what's approved — no new product decisions. ` +
    `Clone \`${REPO_URL}\` fresh with \`git clone --depth 1 ${REPO_URL} repo && cd repo && npm install\`.\n\n` +
    `Project charter (conventions to follow):\n${CHARTER}\n\n` +
    `Implement this approved plan exactly:\n${design.plan}\n\n` +
    `Files expected to change: ${design.filesToChange.join(', ')}\n` +
    `Acceptance criteria you must satisfy: ${design.acceptanceCriteria.join('; ')}\n\n` +
    `Every network call needs loading/error/(where relevant) empty states. Match existing patterns rather than ` +
    `inventing new ones. Run \`npm run build\` and \`npm run lint\` before finishing. When done, run \`git diff\` ` +
    `(and \`git status\` for any new untracked files, adding them with \`git add\` first so they show in the diff) ` +
    `and return the FULL unified diff text as the "patch" field — this is how your work reaches the real repo, so ` +
    `it must be complete and apply cleanly.`
}

function testerPrompt(design, build) {
  return `You are the Tester for CommonPlace. You find and report problems — you never fix anything yourself, even ` +
    `something trivial; report it instead. Clone \`${REPO_URL}\` fresh with ` +
    `\`git clone --depth 1 ${REPO_URL} repo && cd repo && npm install\`.\n\n` +
    `Apply the Coder's patch with \`git apply\` (write it to a file first, e.g. \`cat > /tmp/change.patch\`, then ` +
    `\`git apply /tmp/change.patch\`) — if it fails to apply, that itself is a blocking finding.\n\n` +
    `Acceptance criteria to check, one by one: ${design.acceptanceCriteria.join('; ')}\n\n` +
    `Patch summary from the Coder: ${build.summary}\n` +
    `Things the Coder flagged for you to scrutinize: ${build.testerNotes || 'none flagged'}\n\n` +
    `Patch:\n\`\`\`diff\n${build.patch}\n\`\`\`\n\n` +
    `Run \`npm run build\` and \`npm run lint\` against the patched clone. Try to break it per your role definition, ` +
    `then return findings and a verdict.`
}

function managerPrompt(task, design, build, verify) {
  return `You are the Manager for CommonPlace — you coordinate the team and report to the CEO in plain terms, ` +
    `you don't design, code, or test yourself. You have no code to inspect here, only this cycle's own results.\n\n` +
    `A dev cycle just ran for this task: ${task}\n\n` +
    `Architect's plan: ${design.summary}\n` +
    `Coder's result: ${build.summary} (build ${build.buildPassed ? 'passed' : 'FAILED'}, lint ${build.lintPassed ? 'passed' : 'FAILED'})\n` +
    `Tester's verdict: ${verify.verdict}${verify.blockingReason ? ` — ${verify.blockingReason}` : ''}\n` +
    `Findings: ${JSON.stringify(verify.findings)}\n\n` +
    `Write a short status report for the CEO (under 200 words): what happened, whether it's ready to ship, what's ` +
    `blocked and why if anything, and the one-line entry this cycle should get in TEAM_BACKLOG.md's Done or Blocked ` +
    `section. Plain prose, no preamble.`
}

const task = args && args.task
if (!task) {
  throw new Error('Pass args: { task: "what to build" } when invoking this workflow.')
}
const decisions = args && args.decisions

phase('Design')
const design = await agent(architectPrompt(task, decisions), { label: 'architect', schema: DESIGN_SCHEMA })

if (!design.readyToBuild && design.openQuestions.length > 0) {
  log(`Architect has ${design.openQuestions.length} open question(s) before this can be built — stopping for CEO input.`)
  return { status: 'needs_decisions', design }
}

phase('Build')
const build = await agent(coderPrompt(design), { label: 'coder', schema: BUILD_SCHEMA })

phase('Verify')
const verify = await agent(testerPrompt(design, build), { label: 'tester', schema: VERDICT_SCHEMA })

phase('Report')
const report = await agent(managerPrompt(task, design, build, verify), { label: 'manager' })

return { status: 'complete', design, build, verify, report }

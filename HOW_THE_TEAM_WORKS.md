# How the CommonPlace team actually runs

Four roles, defined in `.claude/agents/`: **Architect** (designs, asks you the decisions only you can make), **Coder** (builds exactly what's approved), **Tester** (independently tries to break it), **Manager** (keeps the backlog honest and reports to you). `TEAM_CHARTER.md` is what every one of them reads first — locked design decisions, conventions, known gaps. `TEAM_BACKLOG.md` is the living status doc the Manager keeps current.

## Running a cycle

You (the CEO) hand Claude a task in plain language — "add a way to export my ledger as CSV," "the Journal feels slow to load, look into it." Claude runs `.claude/workflows/dev-cycle.js` as an orchestrated pipeline:

1. **Design** — the Architect clones the repo read-only, reads `TEAM_CHARTER.md` and the backlog, and produces a concrete plan plus any genuinely open questions (things that need your judgment, not a technical call it can make itself).
2. **Gate** — if there are blocking questions, the cycle stops right there. Claude relays them to you conversationally; once you answer, the cycle re-runs from Design with your decisions attached so they don't get re-asked.
3. **Build** — once the plan is clear, the Coder implements it against a fresh clone and returns a diff.
4. **Verify** — the Tester applies that diff to its own fresh clone, runs the build and lint, checks every acceptance criterion from the plan, and actively tries to break it. It never fixes anything itself — only reports.
5. **Report** — the Manager summarizes: what shipped, what's blocked, what needs your decision, and the one-line entry for `TEAM_BACKLOG.md`.

Claude then takes the Coder's diff and applies it to your actual local copy of the repo (the same way any other change gets delivered to you), and updates `TEAM_BACKLOG.md` with the outcome. You review and commit, same as always.

## Why it isn't fully hands-off (yet)

Two real infrastructure limits shape this, worth knowing about:

- **No push access from the cloud sandbox to your GitHub repo.** The Architect/Coder/Tester agents work against fresh clones in an isolated sandbox and hand back a diff — they can't push a branch or open a PR directly. Claude applies that diff to your local copy instead, the same way it delivered the PWA changes.
- **The connection to your computer can drop mid-session.** When it does, Claude can't write straight into your local folder and will hand you the changed files directly in chat instead, with instructions for where they go.

If you want this to run more like a real PR pipeline — Coder pushes a branch, Tester comments on it, you merge when ready — the fix is giving this environment real push access to `irez16/commonPlace` (a GitHub connector, or a token scoped to this repo). Worth doing once this loop proves useful; not necessary to get started.

## Starting a cycle from scratch

Just tell Claude what you want built or investigated. It'll run the pipeline, come back with either the Architect's questions or a finished, tested change plus the Manager's report — you're never in the loop for anything except the decisions that are actually yours.

# CommonPlace — Team Charter

CommonPlace is a solo-built commonplace-book app for reading, watching, and listening practices — ledger entries, marginalia, and journaling across media types. Rez is the CEO; this file is what every agent (Architect, Coder, Tester, Manager) reads before touching anything, so decisions don't get re-litigated and conventions don't drift.

## Stack

- React 19 + TypeScript + Vite, React Router 7
- Supabase for Auth, Postgres, Storage, and Edge Functions
- Sentry for error monitoring (no-ops if `VITE_SENTRY_DSN` is unset)
- Installable as a PWA (`vite-plugin-pwa`) — a home-screen app, not a bookmarked tab
- hCaptcha on auth forms

## Locked design decisions — do not re-open without flagging it explicitly

- **Palette**: bone paper background (`#EAE4D6`), wine/oxblood accent (`#8C4444`, default) with ink-blue and moss-green alternatives, warm near-black text — never pure black. Tokens live in `src/index.css`.
- **Type system**: Fraunces (serif, titles/quotes), Inter (body), IBM Plex Mono (metadata/chips, uppercase), Caveat/handwriting fonts for Journal marginalia.
- **Dark mode** exists and is a first-class target, not an afterthought.
- **Navigation**: bottom tab bar (Feed / Journal / Ledger), no separate "Dashboard" — a user's own `/@username` page IS the app, with an owner-only Edit toggle.
- **Pin UX**: one ribbon-bookmark icon next to the Ledger section label opening a bottom-sheet picker — no per-row pin buttons.
- **The freeform canvas Journal is explicitly V2** — don't build toward it now.
- **No hard navigation for auth transitions.** Login, signup, profile completion, and logout all go through the app's own reactive state (`useProfileStatus`'s `refresh()`, React Router's `navigate()`) — never `window.location.reload()` or `.href`. This was a real bug fixed in Aug 2026 precisely because it made the app feel like a webpage instead of an app.

## Architecture conventions

- Data-fetching hooks live in `src/hooks/` (`useFeed`, `useFollowCounts`, `usePublicProfile`, etc.) — one hook per concern, returning `{ loading, error, data }` shape.
- Page components live in `src/components/`, one `.tsx` + matching `.css` per page/feature.
- `useProfileStatus` is the single source of truth for "who's logged in, do they have a profile, what's their username" — it listens to `supabase.auth.onAuthStateChange` and exposes `refresh()` for cases (like a DB insert) that don't fire an auth event on their own.
- Media autofill: Google Books API (books), iTunes Search (podcasts), OMDb (film), a Supabase Edge Function `fetch-link-metadata` (YouTube/Substack/essays).

## Known, accepted gaps (don't rediscover these as if they're news)

- No pagination anywhere (Feed/Notifications/Ledger/Journal fetch all rows) — fine at current scale, revisit if it isn't.
- `passage_connections` table has RLS policies but is unreferenced in app code — dead schema, not cleaned up.
- Deferred, not started: delete account, change email, export data, log out of all devices, private accounts.
- `VITE_GOOGLE_BOOKS_API_KEY` / `VITE_OMDB_API_KEY` are bundled into client JS (inherent to Vite's `VITE_` prefix). Google Books key can be locked down via HTTP referrer restriction; OMDb's free tier has no equivalent.
- ~20 lint errors from a newer `eslint-plugin-react-hooks` rule (setState-synchronously-in-effect) across most data-fetching hooks/components, plus a few loose `any` types in `mediaSearch.ts` — cosmetic, not confirmed user-facing bugs, not yet cleaned up.

## Where things actually live

- Repo: `github.com/irez16/commonPlace`, working copy at `~/Projects/commonplace` on Rez's Mac.
- The team's shared state file is `TEAM_BACKLOG.md` (same directory as this file) — Manager keeps it current every cycle.

## Product direction, current phase

Phase: making CommonPlace feel like a proper app rather than a webapp. Installability (PWA) shipped first since it's fast and reuses all existing code; a Capacitor native wrapper for real App Store/Play Store listing is the planned next phase once the core day-to-day experience is solid. "Feels unpolished/buggy" is the other half of that complaint — the team's job in the meantime is finding and closing exactly that kind of gap, not just shipping new features.

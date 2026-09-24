# CommonPlace — Backlog & Status

Maintained by the Manager agent every cycle. This is the one place to look for "what's actually going on" — read this before asking the team what's next.

## In Progress

_(nothing in flight yet — this file was just set up)_

## Blocked

_(none)_

## Up Next (proposed, not yet started)

- Capacitor native wrapper for App Store/Play Store listing (planned phase 2 of the "proper app" push, after the core experience is solid)
- Clean up the ~20 pre-existing lint errors (setState-in-effect pattern across hooks, loose `any` types in `mediaSearch.ts`) — cosmetic, low priority
- Deferred account features: delete account, change email, export data, log out of all devices, private accounts
- Tester notes carried from the accessibility pass: light `--accent-moss` passes with almost no margin (4.54:1), recheck if it changes; MediaSearchField can double-fetch on a rapid re-select during a film lookup; Escape hides results with no keyboard way to reopen without retyping
- Custom domain (business/cost decision for the CEO, deferred 2026-09)

## Done

- **2026-08 — PWA installability**: web manifest, service worker (`vite-plugin-pwa`), full icon set generated from the existing logomark, PWA meta tags in `index.html`. Installable to home screen on iOS/Android, standalone display, Supabase calls excluded from offline caching.
- **2026-08 — Fixed hard-reload auth transitions**: login/signup/profile-completion/logout no longer force a full-page reload; they use `useProfileStatus`'s new `refresh()` and React Router's `navigate()` instead.
- **2026-09 — Legal compliance + accessibility pass**: LegalPage gained Sentry/iTunes/Google Fonts disclosures, Cookies, Refunds, UGC/copyright, operator location and an EU/UK paragraph. Auth forms got real labels, Settings toggles got aria-pressed, MediaSearchField is keyboard-operable (arrows/Enter/Escape, combobox ARIA), image clips have alt text, dark `--accent` and light `--accent-moss` darkened for contrast, dead scaffold assets removed. Tester caught and the Coder fixed an Enter-key form-submit bug before ship.
- **2026-09 — "Doesn't look AI-generated" cleanup**: removed six unused social/doc symbols (two in off-brand purple) from `public/icons.svg`; README rewritten from the Vite template into a real project description.
- **2026-09 - Em dash and contrast follow-up**: removed the em dash from the app description (meta tag and install manifest); dark wine accent lightened to #C47A7A so it passes 4.5:1 on raised cards; the forced Light theme had drifted from the locked palette (and failed contrast on moss), now matches System light exactly. Tester verified every accent passes AA in all four theme modes.

## Decisions log

Record anything the CEO decided here, dated, so it doesn't get re-asked next cycle.

- 2026-08 — Direction for "make it a proper app": PWA first, Capacitor native wrapper later, rather than jumping straight to a native rewrite.
- 2026-09 — Legal pages: minimal business identity (individual developer, operated from Australia, contact by email), short EU/UK paragraph, cookie disclosure only with no consent banner.
- 2026-09 — Contrast: accepted the Architect's hex fixes (dark accent #BD7373, light moss #586C45).
- 2026-09 — Aesthetic cleanup: README rewrite approved.

# CommonPlace — Backlog & Status

Maintained by the Manager agent every cycle. This is the one place to look for "what's actually going on" — read this before asking the team what's next.

## In Progress

_(nothing in flight yet — this file was just set up)_

## Blocked

_(none)_

## Up Next (proposed, not yet started)

- Phone polish Tester notes: iOS install hint card clears the last control on some pages by only 8px (bump #root bottom padding while the hint shows); PinPicker doesn't close on Escape; a foreground refetch that started before a delete can briefly bring the deleted row back (guard in-flight refetches); no splash image for iPhone Air (1260x2736) and no dark splash
- Needs a real iPhone check: tab bar hiding with the keyboard, pin sheet scroll lock, splash screens on launch, pull-to-refresh suppression, status bar style in dark mode
- Capacitor native wrapper for App Store/Play Store listing (planned phase 2 of the "proper app" push, after the core experience is solid)
- Clean up the ~20 pre-existing lint errors (setState-in-effect pattern across hooks, loose `any` types in `mediaSearch.ts`) — cosmetic, low priority
- Deferred account features: delete account, change email, export data, log out of all devices, private accounts
- Tester notes carried from the accessibility pass: light `--accent-moss` passes with almost no margin (4.54:1), recheck if it changes; Escape hides results with no keyboard way to reopen without retyping
- Custom domain (business/cost decision for the CEO, deferred 2026-09)
- On `@supabase/supabase-js` upgrades, recheck `clearCachedRefreshFailure()` in `src/lib/supabaseClient.ts`: it clears a protected auth-js field (a 60s cache of failed token refreshes) so Retry works right after reconnecting. If the field is renamed the Retry button silently goes back to failing for up to a minute after an offline spell.
- "Connected but the network is dead" (navigator.onLine true, Supabase unreachable) with an expired token still waits ~26s (auth-js refresh backoff) before the "Couldn't load your profile" screen; it no longer shows Login. Could add a timeout if this shows up in practice.

## Done

- **2026-09 — PWA installability**: web manifest, service worker (`vite-plugin-pwa`), full icon set generated from the existing logomark, PWA meta tags in `index.html`. Installable to home screen on iOS/Android, standalone display, Supabase calls excluded from offline caching.
- **2026-09 — Fixed hard-reload auth transitions**: login/signup/profile-completion/logout no longer force a full-page reload; they use `useProfileStatus`'s new `refresh()` and React Router's `navigate()` instead.
- **2026-09 — Legal compliance + accessibility pass**: LegalPage gained Sentry/iTunes/Google Fonts disclosures, Cookies, Refunds, UGC/copyright, operator location and an EU/UK paragraph. Auth forms got real labels, Settings toggles got aria-pressed, MediaSearchField is keyboard-operable (arrows/Enter/Escape, combobox ARIA), image clips have alt text, dark `--accent` and light `--accent-moss` darkened for contrast, dead scaffold assets removed. Tester caught and the Coder fixed an Enter-key form-submit bug before ship.
- **2026-09 — "Doesn't look AI-generated" cleanup**: removed six unused social/doc symbols (two in off-brand purple) from `public/icons.svg`; README rewritten from the Vite template into a real project description.
- **2026-09 - Em dash and contrast follow-up**: removed the em dash from the app description (meta tag and install manifest); dark wine accent lightened to #C47A7A so it passes 4.5:1 on raised cards; the forced Light theme had drifted from the locked palette (and failed contrast on moss), now matches System light exactly. Tester verified every accent passes AA in all four theme modes.
- **2026-09 - Regression audit fix cycle**: MediaSearchField Enter only picks an arrow-highlighted result (otherwise the typed text is kept), results from an older query are treated as stale, out-of-order search responses and superseded film lookups are ignored, a selection can no longer be reopened by an in-flight search, IME composition is respected, and the combobox got an accessible name and unique ids. Logout shows an error instead of navigating if sign-out fails. Offline launch of the installed app keeps a signed-in user signed in while their stored access token is still valid (local session read, and a failed profile lookup no longer looks like "no profile"; the expired-token case was fixed in the 2026-09 polish round below); instead of the finish-your-profile step it shows a "You're offline" (or "Couldn't load your profile") screen with a Retry button, and retries automatically once when the connection comes back. PWA: Google Fonts stylesheet now caches for offline, icons.svg and apple-touch-icon precached, portrait lock removed from the manifest, dark-mode theme-color added. Privacy policy discloses cover images loading from Amazon, Apple and Google. Added vercel.json SPA rewrite so deep links load on direct visit, and sharp as a devDependency for the icon script.
- **2026-09 - Friends launch batch**: In Common now matches clips from the same work (normalized title + creator) across each person's own Ledger entry, instead of only the identical entry row. The bell badge uses a lightweight unread count that refreshes on navigation, app foregrounding and marking a notification read. Discovery: Share profile button on every profile (share sheet, clipboard fallback, selectable URL as last resort), people search on the Feed (name or @username), and static Open Graph / Twitter link-preview tags with a wordmark-only 1200x630 preview image (`scripts/gen-og-image.mjs`). First run: actionable empty states for the Ledger ("Add your first entry"), Journal ("Clip your first passage") and Feed ("Find people" focuses search); visitors keep the old wording.
- **2026-09 - Polish round**: Offline launch with an expired stored token goes straight to the "You're offline" screen (was ~26s of Loading, then Login), a network failure while refreshing the token is no longer treated as signed out, and Retry or reconnecting really retries the refresh. The profile lookup no longer retries 3 times with backoff, so the offline/error screen (and each Retry) appears in well under a second instead of ~7s. Logout failure shows a friendly message instead of raw server text. "Add your first entry" and "Clip your first passage" move focus into the add form. In Common: follower Ledgers are filtered by title server-side (and fetched in batches of 100 followers), titles/creators are Unicode-normalized, "J.R.R." matches "J. R. R.", and a follower gets at most one notification per new clip. People search treats "_" literally, normalizes Unicode, and shows a friendly error. New app icon everywhere (favicon with a dark-mode variant, PWA icons, a maskable variant that stays inside Android's safe zone, apple-touch-icon) generated by `scripts/gen-icons.mjs` from the shared `scripts/logomark.mjs`, and the link-preview image now shows the icon above the wordmark.
- **2026-09 - Phone polish**: the installed app now behaves like a phone app at 360 to 393px widths. Long unbroken names/titles wrap instead of widening the page (it reached 908px and pushed the tab bar and bell off-screen); `#root` clips any horizontal overflow as a safety net. Line height is unitless (headings 1.15, mono labels 1.3) so big headings no longer overlap. The Ledger flows in the page scroll (no 420px inner box). All fields are 16px (no iOS focus zoom) and every control has a 44x44 tap area (invisible `.hit-area` helper where the visual stays small). The tab bar steps aside while a text field is focused on touch screens. QuickNav has a solid paper bar. Pin sheet: drag handle, fixed header, scrolling list, safe-area padding, background scroll lock. MediaSearchField titles clamp to 2 lines and the dropdown fits the visible space above the keyboard. Long clips clamp to 8 lines with Read more (Journal, In Common). Shared centred loading/error state (`PageStatus`), no more hard-coded crimson. Narrow-screen profile header is more compact. No rubber-band/pull-to-refresh, no tap highlight, pressed states, hover only on hover devices, 11px minimum mono. iOS launch screens for 10 iPhone sizes (`scripts/gen-icons.mjs`). Data refreshes in the background when the app returns after 30s or more (Feed, profile Ledger/Journal/Want to Consume, In Common). A dismissible "Add to Home Screen" hint shows in iOS Safari only (key disclosed on the legal page). Status bar style left as `default` until checked on a device.

## Decisions log

Record anything the CEO decided here, dated, so it doesn't get re-asked next cycle.

- 2026-08 — Direction for "make it a proper app": PWA first, Capacitor native wrapper later, rather than jumping straight to a native rewrite.
- 2026-09 — Legal pages: minimal business identity (individual developer, operated from Australia, contact by email), short EU/UK paragraph, cookie disclosure only with no consent banner.
- 2026-09 — Contrast: accepted the Architect's hex fixes (dark accent #C47A7A as shipped, light moss #586C45).
- 2026-09 — Aesthetic cleanup: README rewrite approved.
- 2026-09 - MediaSearchField Enter key: "Keep what I typed." Enter only selects a result the user has arrow-highlighted; with no highlight it submits the typed text (manual entry), reversing the earlier "Enter picks top result" behaviour.
- 2026-09 - Offline launch: show offline message + Retry (CEO, 2026-09)
- 2026-09 - In Common matching: a match is the same work, meaning normalized title + creator are equal, not the same ledger entry row.
- 2026-09 - Discovery for the friends launch: Share profile button + people search on the Feed + static link previews.
- 2026-09 - First run: actionable empty states (Ledger, Journal, Feed).
- 2026-09 - Link previews use the production URL https://common-place-tau.vercel.app; preview image is wordmark-only until the logomark redesign lands.
- 2026-09 - App icon: italic c with wine ribbon (CEO, 2026-09)
- 2026-09 - Stay on the installed web app (PWA) for now: no Play Store listing yet. Capacitor and the App Store come later, after account deletion and report/block exist (CEO, 2026-09).
- 2026-09 - Refresh on return: data refetches in the background when the app comes back to the foreground after 30s or more; no pull-to-refresh gesture (CEO, 2026-09).
- 2026-09 - iOS install hint: one dismissible "Add to Home Screen" card, iOS Safari only, on logged-in screens and the login screen, remembered per device (CEO, 2026-09).

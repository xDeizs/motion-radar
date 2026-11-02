# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|

| Motion Radar v5 | Library prologue | Working 8-tab collection + labeled signal dock | Scrub plate + two independent alpha planes, pointer depth | One 2.8vh/2.25vh held prologue, in-flow handoff, actual library, source ledger | Static source/collection/export close | Signal dock: ordered spatial controls converge into useful navigation | Cool satin silver, lavender lacquer, macro material | 4515 |
| Motion Radar 5 Neon | Chaptered pinned acts handing off to the working library | Auto-hiding bar + keycap tabs; hero keys are section links | Live Three.js keycaps continuing the headline rows + thin-film bubbles | Hero, pinned word-by-word manifesto over LED wall with crossing tapes, horizontal 3-card track, scroll-scrubbed radar sweep, library | Mascot + sticker close with routes back into the library | Keycaps continue the typed headline; click routes, smiley key sends a wave | Night-club LED wall, icy cobalt + acid lime, glossy vinyl toys | 8766 |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

- Motion Radar v5 claims the Library prologue + Signal dock combination: a short dimensional entry to a real working collection. No previous registry rows existed; nothing was compared or silently removed. Published on GitHub Pages and delivered as a tested source package. Public and local verification are recorded in VERIFICATION.md.
- Motion Radar 5 Neon claims the Keycap headline hero + scroll-scrubbed Radar sweep. It differs from Motion Radar v5 on grammar, nav treatment, hero device, act-sequence shape, close pattern and signature move; it shares only the working library at the end. Proposed as a pull request that replaces v5 on the site; v5 stays in git history. Verification: VERIFICATION.md.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.

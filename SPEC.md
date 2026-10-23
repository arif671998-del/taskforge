# Plain Steps — Build Spec

You are building **Plain Steps**, an original, working prototype for the **Taskforge** online student hackathon (Devpost). Read this whole file before writing any code.

## 1. Context

- Judging criteria: **usefulness, accessibility, technical execution, originality, presentation.** Accessibility is scored on its own, so treat it as a core requirement, not polish.
- The project must be original work created during the event period. Start from an empty repo and commit in small, clearly described steps; the commit history is evidence of when the work happened.
- AI assistance must be disclosed on the Devpost page. You (Claude Code) are the coding assistant; I direct the design, test with a real user, and write the story.
- Judges will open a live link. It must work in under 30 seconds with no setup.

## 2. The product

A family member (the **helper**) records an online task once, step by step: "Pay the electricity bill", "Book a train ticket", "Join a video call". The person who struggles with that task (the **person**, usually a parent or grandparent) then follows the guide one step at a time, with big text and read-aloud in Hindi or English. If they get stuck, an "I'm stuck" button sends the helper a WhatsApp message naming the exact step.

- **User:** an older adult who can do the task with guidance but not alone.
- **Barrier:** apps assume speed, English and confidence. When something goes wrong, the only fallback is a phone call that starts with "what's on your screen?"
- **Change:** they finish the task themselves, and when they do need help, the helper knows exactly where they are.

Plain Steps is a guide, not an automation. It never touches the other app.

## 3. Screens and features

### 3.1 Home (person-first)
- Large card per guide: title, number of steps, one big **Start** button (or **Continue from step N** if a run was left unfinished).
- Empty state in plain words explaining that a helper needs to set up a guide.
- At the bottom, a smaller **Helper: set up guides** button. Entering helper mode shows a simple confirm ("This part is for the helper. Continue?") so the person doesn't edit guides by accident.
- **Settings** button.
- **Independence nudge:** after 3 completed runs of a guide with zero stuck presses, the card shows a gentle "You've done this on your own 3 times. Try it from memory?" with a **Keep using the guide** option. No pressure, and the guide is never hidden.

### 3.2 Builder (helper mode)
- Guide fields: title, helper's name, helper's WhatsApp number (country code defaults to +91; store digits only; validate), guide content language (English / Hindi).
- Steps list. Each step has:
  - **Text** (required, max 1000 chars). Encourage short sentences with a hint under the field.
  - **Photo** (optional): `<input type="file" accept="image/*" capture="environment">`, so camera or gallery. Downscale to max 1280px on the longest side, JPEG ~0.8 quality, before saving.
  - **Photo description** (optional) used as alt text; default alt is "Photo for step N".
  - **Voice note** (optional, max 60 s) via MediaRecorder: record / stop / play / delete, with clear visible states. Pick a supported MIME type at runtime (webm or mp4). Handle a denied mic permission with a plain-language message.
  - **Press-here marker** (needs a photo): the helper taps the photo to place one marker, taps elsewhere to move it, or removes it. Stored as x/y percentages so it survives resizing. Keyboard and screen-reader users can place it with Enter and move it with arrow keys or the Marker left/right/up/down buttons. The photo's alt text gets a suffix such as "Marked: press here".
  - **What you should see now** (optional text): the expected result after the step.
  - **Caution** flag: shows the step in a distinct warning style and reads it first (e.g. "Never tell anyone this code").
- Reorder with **Move up / Move down** buttons (no drag-only interaction). Delete with confirmation.
- **Sensitive-content warning:** if step text contains words like password, PIN, OTP, CVV, UPI PIN, पासवर्ड, पिन, ओटीपी, or a long run of digits, show a gentle inline warning: never write passwords, PINs or OTPs into a guide. Warn only; don't block.
- **Preview** button opens the player for this guide.
- **Unsaved-changes guard:** confirm before leaving through an in-app link or the browser Back button, plus a `beforeunload` warning, while there are unsaved edits.
- Export / share and import (see 3.7). Activity (see 3.6). Delete guide with confirmation.

### 3.3 Player (the heart of the app)
One step per screen, top to bottom:
1. Small top bar: **Exit** (keeps progress) and the guide title.
2. "Step 3 of 8" plus a progress bar.
3. Photo, if any, with a high-contrast ring at the helper's marker (it pulses unless `prefers-reduced-motion` is set). Tap to open full-screen, with a visible close button.
4. Step text, large (at least 28px at default size), with a `lang` attribute matching the guide language.
5. Caution banner, if flagged.
5b. If the step has "what you should see now": show it with **Do you see this?** and **Yes** (go to the next step) and **No** (open the stuck sheet and log a stuck event with reason `mismatch`; the WhatsApp message then also says what the person expected to see). It is read aloud after the step text.
6. **Read aloud** button (speechSynthesis, `hi-IN` or `en-IN`). If the helper recorded a voice note, show **Play [helper]'s voice** as well and prefer it for auto-read.
7. Action bar: **Back** (secondary), **Done, next** (primary and largest), **I'm stuck** (distinct colour, always visible).

Behaviour:
- Auto-read each step on arrival if the setting is on (default on). The run starts from the user's tap on Start, which satisfies the browser's gesture requirement for audio.
- Speech: wait for `voiceschanged`; if no Hindi voice is installed, say so plainly and fall back to the voice note or the English voice. Never fail silently.
- Keyboard: Enter or Right arrow = next, Left arrow = back.
- Save the current step on every change so a run resumes after the app closes.
- No time limits, no auto-advance, no gesture-only controls.

### 3.4 "I'm stuck" sheet
- **Send WhatsApp message** → `https://wa.me/<digits>?text=<encoded>`. Message in the UI language, e.g. `Hi {helper}, I'm stuck on step {n} of {total} in "{title}": {step text}`.
- **Call {helper}** → `tel:` link.
- If no number is set, explain that and offer only what works.
- Log a stuck event for the activity view.

### 3.5 Done screen
- "You did it!" with time taken.
- **Tell {helper} it's done** (WhatsApp), **Send report to helper** (WhatsApp, see 3.6) and **Back to home**.

### 3.6 Activity (helper mode, per guide)
- Runs stored on this device: start, end, completed or not, time per step, stuck events.
- Show: number of runs, completed runs, typical time, and the step with the most "I'm stuck" presses, with a hint such as "Step 4 caused trouble 3 times. Consider rewriting it" and a link straight to that step in the builder.
- **Send report to helper** (WhatsApp), also available from the Done screen: guide title, finished or not, time taken, and the steps with stuck presses. Plain language, in the UI language.
- **Clear activity** with confirmation.
- This view is how I'll measure the before/after for the Devpost story, so make the numbers accurate.

### 3.7 Export, share, import
- Export a guide as one file: `<title>.plainsteps.json` with `{ "format": "plainsteps", "version": 1, ... }` and media embedded as base64 data URLs.
- Share: if `navigator.canShare({ files })` works, use the Web Share API (so it can go over WhatsApp); otherwise download the file.
- Import from a file input, with strict validation (see section 7).

### 3.8 Settings
- UI language: English / हिन्दी.
- Text size: three levels (Normal, Large, Extra large), on top of the system font size.
- Auto-read steps: on/off.
- Speech speed: Slow (default, ~0.85) / Normal.
- Theme follows the system (light/dark), both high contrast.

### 3.9 Sample guide
- On first run, if there are no guides, seed **"Sample: Join a video call"** (5–6 steps, English and Hindi text) so judges can try the player immediately.
- Illustrate it with simple original SVGs you draw (generic phone shapes and buttons). No real app screenshots, brand names or logos.
- Clearly labelled as a sample, deletable, with **Restore sample guide** in helper mode.

## 4. Data model (IndexedDB)

```
Guide    { id, title, helperName, helperPhone, language: "en"|"hi", steps: Step[], isSample, createdAt, updatedAt }
Step     { id, text, photo: Blob|null, photoAlt, marker: {x, y}|null, audio: Blob|null, caution: boolean, expected: string }
           marker   = "press here" point in percent (0-100) of the photo's width/height; null if none
           expected = optional "what you should see now" text ('' if none)
Progress { guideId, runId, stepIndex, updatedAt }
Run      { id, guideId, startedAt, endedAt|null, completed, stepTimesMs: number[], stuck: [{ stepIndex, at, reason?: "mismatch" }] }
```

Settings live in localStorage, with every read and write wrapped in try/catch and sensible defaults when it's unavailable.

## 5. Accessibility requirements (non-negotiable)

- Semantic HTML: landmarks, one `h1` per view, headings in order, native `<button>` and `<a>` only.
- Tap targets at least 48×48px; primary player buttons at least 64px tall.
- Base font 20px, sizes in rem, layouts that reflow (no fixed heights that clip). Must stay usable at 200% text size, and the action bar must never cover step content.
- Contrast at least 4.5:1 for all text, aiming for 7:1 on step text, in both light and dark.
- Visible focus styles everywhere. On each step change, move focus to the step heading and announce "Step 3 of 8" through an `aria-live="polite"` region.
- Every icon has a visible text label. No icon-only buttons.
- Respect `prefers-reduced-motion`.
- Set `<html lang>` from the UI language and `lang` on content in the guide's language, so screen readers pronounce Hindi correctly.
- Plain-language UI copy and error messages: short sentences, no jargon.
- Destructive actions confirm first.
- Must work with TalkBack (Android) and keyboard only.

## 6. Language

- All UI strings live in `app/js/i18n.js` as `{ en: {...}, hi: {...} }`. No hard-coded UI text anywhere else.
- Write natural, simple Hindi (Devanagari), not literal translations. Add a comment marking the Hindi strings for native-speaker review.
- A test checks that every English key has a Hindi key and vice versa.

## 7. Tech, architecture, security

- **Vanilla HTML, CSS and JavaScript (ES modules). No framework, no build step, zero runtime dependencies, no CDNs, no external fonts** (use the system font stack; Android ships Devanagari fonts).
- Hash routing (`#/`, `#/play/:id`, `#/build/:id`, `#/activity/:id`, `#/settings`) so it works on GitHub Pages without server config. All asset paths relative, since Pages serves under `/<repo-name>/`.
- Keep DOM-free logic in `app/js/lib/` so Node can test it; DOM code goes in `app/js/views/`.
- Small modules with JSDoc comments.
- **Render all user-provided text with `textContent`, never `innerHTML`.** An imported guide file is untrusted input.
- CSP meta tag, roughly: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`. No inline scripts or `style` attributes in HTML.
- Import validation: reject wrong `format`/`version`, files over 30 MB, more than 50 steps, text over 1000 chars, and data URLs that aren't image/jpeg, image/png, image/webp or common audio types. Convert valid media to Blobs. Show a plain-language error on rejection.
- No accounts, no backend, no analytics, no network requests except WhatsApp/tel links the user taps. All data stays on the device.

Suggested layout:

```
app/
  index.html
  manifest.webmanifest
  sw.js
  css/styles.css
  js/main.js            # boot + router
  js/i18n.js
  js/lib/               # pure logic: db schema helpers, export/import, validation, whatsapp links, sensitive-word check, activity stats
  js/views/             # home, builder, player, stuck sheet, done, activity, settings
  js/platform/          # IndexedDB, speech, recorder, image downscale, share
  icons/
  sample/
tests/                  # node --test unit tests; optional e2e
.github/workflows/deploy.yml
README.md
ACCESSIBILITY.md
DEVPOST.md
LICENSE                 # MIT
package.json            # dev scripts and devDependencies only
```

## 8. Offline / PWA

- Web app manifest with name, short name, theme colour, 192px and 512px PNG icons plus a maskable icon. Generate the icons however is easiest (e.g. a small script) and commit them.
- Service worker: cache-first for the app shell, versioned cache name, delete old caches on activate, and a plain "Update available: Reload" banner when a new version is waiting.
- After the first load, everything must work in airplane mode except sending WhatsApp messages and calls.
- Mic and service worker need HTTPS, so phone testing happens on the deployed GitHub Pages link.

## 9. Testing

- `npm test` runs `node --test` on the pure modules: i18n key parity, export → import round-trip, import validation (good and bad files), phone normalisation and wa.me link building, sensitive-word detection, activity stats.
- Recommended: `npm run test:e2e` using Playwright and `@axe-core/playwright` as devDependencies only. Play the sample guide to the end, and run axe on home, player and builder with zero serious or critical violations.
- `npm run serve` starts a local static server.

## 10. Docs to produce

- **README.md:** what it is, live link placeholder, screenshots placeholder, run locally, deploy, tech choices, folder structure, limitations, and an **AI assistance** section (built during the event with Claude Code as the coding assistant; my role in [brackets] for me to fill in).
- **ACCESSIBILITY.md:** what was built for accessibility, plus a manual test checklist (TalkBack, keyboard only, 200% text, contrast, Hindi read-aloud) with an empty results table for me to fill in.
- **DEVPOST.md:** a draft with Inspiration, What it does, How it works, Built with, Accessibility, Challenges, What I learned, Limitations, What's next, Pre-existing work & AI assistance, and a 2–3 minute demo video shot list. **Do not invent user stories, quotes, test results or metrics.** Leave `[brackets]` for anything only I can provide.
- Known limitations to state honestly: data lives on one device with no sync, a helper must set up each guide, guides go stale when the other app changes its screens, and Hindi speech depends on the phone having a Hindi voice installed.

## 11. How to work

- **Milestone 0:** before any code, give me a short build plan and only the questions that genuinely block you. Then wait for my go-ahead.
- Initialise git if needed. After each milestone: run the tests, commit with a clear message, and give me a two-line summary of what to try. Don't push unless I ask.

| # | Milestone |
|---|-----------|
| 1 | Scaffold, styles and design tokens, i18n, router, settings, GitHub Pages deploy workflow (tell me the one-time Pages setting to change) |
| 2 | IndexedDB layer, Home, Builder with text-only steps, reorder, delete, helper details |
| 3 | Player: step view, read-aloud, navigation, resume, stuck sheet, done screen. **Pause here so I can test on my phone.** |
| 4 | Photos, voice notes, caution steps, sensitive-word warning |
| 5 | Export, share, import with validation, sample guide |
| 6 | Activity log and insights |
| 7 | PWA: offline, icons, update banner |
| 8 | Accessibility pass, tests, README / ACCESSIBILITY / DEVPOST docs |

## 12. Definition of done

- Works on Android Chrome (primary target) and desktop Chrome/Firefox; iOS Safari best effort.
- A judge can open the live link, start the sample guide and reach the done screen in under 30 seconds.
- Lighthouse accessibility score at least 95; axe shows no serious or critical issues.
- Works offline after first load.
- Zero runtime dependencies and no external network requests.
- No console errors in normal use.
- All tests pass.

## 13. Out of scope

Accounts, cloud sync, a backend, automating or controlling other apps, screen recording, AI features, push notifications, analytics, payments.

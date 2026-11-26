# Sinal

> A narrative idle game for mobile: you are the lone operator of a radio station at the end of the world, pointing an antenna at the sky — and something is transmitting.

You start with static. Upgrade your antennas, learn to filter the noise and decode **patterns**. It is an incremental "numbers go up" game, but what drives the player is curiosity: every upgrade brings you closer to understanding the messages. Built with **TypeScript + Vite** (no UI framework) and packaged for Android/iOS with **Capacitor**. The game text and design docs are in Brazilian Portuguese; code and this README are in English.

> **Status:** playable prototype (working title), v0.1. No hosted web demo yet — run it locally (below) or grab the APK from the CI workflow.

## Gameplay

- **Core loop:** antennas capture **Signal** → the decoder converts it into **Data** (KB → MB → GB…) → spend Data on antennas and upgrades and on deciphering transmissions → **Fragments** reveal the story.
- **Micro / mid / macro:** tap to generate pulses, buy and tune antennas and scan frequencies in the spectrum, and complete story arcs.
- **Prestige — "Silêncio" (Silence):** reset for **Clarity**, a permanent multiplier, with a skill tree and operators.
- **Offline progress** with a summary report on return; efficiency and cap are improved by in-game upgrades.
- **Story** told through a journal and incoming transmissions, unlocked by milestones.
- **Terminal aesthetic:** text, lines and an oscilloscope drawn on canvas; procedural audio; haptics and local notifications on mobile; contextual tips and a "How it works" glossary.
- One-handed, portrait layout.

The full design is in [`docs/radio.md`](docs/radio.md) (Portuguese). A possible follow-up idea, a lighthouse idle game, is sketched in [`docs/farol.md`](docs/farol.md).

## Tech stack

| Area | Technology |
|---|---|
| Language | TypeScript (strict) |
| Build | Vite |
| UI | Plain DOM + canvas (oscilloscope), CSS tokens, IBM Plex Mono / VT323 via Fontsource |
| Mobile | Capacitor (Android, iOS): preferences, haptics, local notifications, app lifecycle |
| Tests | Vitest |
| CI/CD | GitHub Actions: type-check, tests, build, signed APK, optional GitHub Release on tags |

## Architecture highlights

- **Game rules independent of the platform.** `src/core` (state, economy formulas, offline progress, prestige, save) knows nothing about the DOM or Capacitor, so it is easy to test and reusable for another game.
- **Content as data.** Antennas, decoder, upgrades, prestige, spectrum, story and tutorial live in `src/data` and can be edited without touching the logic.
- **Versioned saves with migrations.** Bump `SAVE_VERSION` in `core/state.ts` and add a migration in `core/save.ts`; save export/import is supported. Antenna and story IDs are treated as permanent because player saves reference them.
- **Analytical offline progress.** Offline gains are computed as rate × time (with a cap and efficiency) instead of simulating tick by tick.
- **Pacing simulator.** `npm run sim` runs bots on a virtual clock to check progression pacing.
- **CI that ships an APK.** The workflow runs type-check and tests, builds the web app, syncs Capacitor and produces an APK. It can sign with a fixed key from repository secrets so each new APK installs over the previous one without losing the save. On `v*` tags it also creates a GitHub Release with the APK attached.

```
src/
  core/        rules: game, economy, offline, prestige, requirements, save, format
  data/        content: antennas, decoder, upgrades, prestige, spectrum, story, tutorial
  platform/    Capacitor integration (storage, haptics, notifications) and procedural audio
  ui/          DOM interface, modal, oscilloscope; panels/ with one tab per file
  styles/      CSS (tokens at the top of main.css)
scripts/       pacing simulator
docs/          design documents
```

## Getting started

```bash
npm install
npm run dev          # runs in the browser; also reachable from a phone on the same network
```

To try it on a phone without installing anything, open the `Network:` address printed by `npm run dev` (PC and phone on the same Wi-Fi).

| Command | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm test` | game-logic tests (Vitest) |
| `npm run typecheck` | TypeScript type-check |
| `npm run build` | production build to `dist/` |
| `npm run sim` | pacing simulation with bots on a virtual clock |
| `npm run android` | build, `cap sync` and open Android Studio |
| `npm run ios` | build, `cap sync` and open Xcode (macOS only) |

**Building an APK:** install [Android Studio](https://developer.android.com/studio) (it ships the JDK and Android SDK), or use the **Android APK** GitHub Actions workflow and download the artifact from the run.

The Capacitor `appId` (`com.sinal.idle`) is provisional: change it **before** the first store release, because it cannot be changed afterwards.

## Tests

```bash
npm test
```

Vitest suites (about 50 test cases) cover the game core: economy, number formatting, game actions, prestige, save/migration and the tutorial data.

## License

No license has been chosen yet; all rights reserved by default.

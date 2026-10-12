# Architecture

Downshift is a Bun workspace of four TypeScript packages. The website is the product; the Windows app is the same website in an Electron window with a tray icon. The original 0.1.0 Windows Forms app is preserved in the first commit of the history (`4ef898d`).

```
packages/core/      Pure TypeScript. All decision logic. No DOM, no Bluetooth, no timers.
packages/ble/       One heart rate interface with two adapters: Web Bluetooth and Simulated.
packages/app/       React + Vite UI. Builds the website and installable app (PWA).
packages/desktop/   Electron shell around the built app. Windows installer and portable exe.
```

Dependencies point one way: `core` is used by `ble`, which is used by `app`, which is bundled by `desktop`. Nothing in `core` reads the clock: every time-dependent function takes `now` in milliseconds as an argument, so tests are deterministic and need no fake timers. This is the tested part, and logic goes here.

## packages/core

| Module | What it holds |
|---|---|
| `hrPacket.ts` | Parses the Bluetooth heart rate measurement: 8 or 16 bit bpm, sensor contact, energy, RR intervals. |
| `nudge.ts` | `NudgeDetector`: per-minute medians, a baseline of the session's earlier minutes, a rise held for minutes, a movement hold-off, and the high-heart-rate check-in. A port of the 0.1.0 detector with the same constants. |
| `focusClock.ts`, `presets.ts` | The block and break rhythm: heads-up, snooze twice, extend, long break. The School and Work presets only set the numbers and the wording. |
| `breakAdvice.ts` | Maps "tense, tired or fine" (plus heart rate context) to a suggested break. |
| `restCoach.ts` | The Workout rest state machine: the rest floor from your goal, advisory "heart rate settled" cues, a low-confidence flag, and the set-end suggestion. |
| `breathing.ts` | Breathing patterns, the pacer (`breathAt(pattern, elapsedSec)`), and the technique guide. |
| `settings.ts` | Typed settings, defaults, clamping, and versioned JSON. |
| `sharpness.ts` | Groups your own 1–5 sharpness ratings by time of day for History. |
| `log.ts`, `setRecord.ts` | The event records and CSV export. |
| `pairing.ts`, `format.ts` | Matching the remembered device; clock formatting. |

## How a heart rate reading flows

1. A `HeartRateSource` from `packages/ble` raises readings: `WebBluetoothSource` from a real device, or `SimulatedSource` in demo mode and in tests.
2. `hrStore` in the app keeps the latest reading and a ten-minute buffer, and shares them with every page.
3. The active session subscribes to readings with `onHeartRate` and passes each one, with `now`, to `core` as it arrives: `NudgeDetector` for Focus, `RestCoach` for Workout. A one-second tick (500 ms in Workout) drives timers and cues, and Workout seeds itself from `recentReadings()` only when it starts.
4. `core` returns plain values (a nudge is due, the advice is "ready", the floor has passed). The session turns them into UI, sounds and log events.
5. In the Windows app, `hrStore` also tells the shell the current bpm from a real device (not demo data), which draws the tray icon.

Per-second readings from a wrist sensor are unreliable around rapid heart rate changes (Van Oost 2025), and wrist sensors read low during lifting (Zhang 2020; Boudreaux 2018), so the detectors work on medians over seconds or minutes and treat sudden jumps as movement or sensor error (the nudge pauses counting; Workout suppresses its heart rate cues).

## packages/ble

`HeartRateSource` is one small interface: `connect`, `disconnect`, `onReading`, `onState`. `WebBluetoothSource` filters on the `heart_rate` service, also accepts a few device name prefixes, and reconnects with backoff when the link drops. `detectSupport` explains why a browser cannot connect (iOS, Firefox, an insecure page). `BtLog` is a plain-language trace shown on the Device page for troubleshooting. A native iPhone adapter could implement the same interface later.

## packages/app

React 18 with Vite and hand-written CSS using design tokens; light and dark from the system, with an override. Pages are Home, Focus, Workout, Breathe, History, Device, Evidence and Settings, routed by the URL hash so it works from any subpath and from the Electron `app://` origin.

- **State** is small stores read with `useSyncExternalStore`: settings (browser local storage), heart rate, and the event log (IndexedDB, with an in-memory fallback if storage is blocked).
- **Sessions** (`sessions/`) hold the running Focus and Workout state outside the pages, so you can look at another page without losing a timer. A Breathe session belongs to the Breathe page and ends, saving the breaths done, when you leave it.
- **Time** comes from one `now()` function. Tests move `window.__downshiftClock.offset` to fast-forward every timer, which is how the browser tests run a 25-minute block in seconds.
- **Notifications.** Downshift asks for notification permission when you start a Focus session or Workout, until you answer, and never on load. A system notification is shown only if permission was granted and the page is hidden; otherwise alerts are in-page.
- **Evidence** page text lives in `content/evidence.ts` and must match `docs/evidence*.md`.
- **Offline.** `vite-plugin-pwa` precaches the app. Vite's `base` is `./`, so the build works from a GitHub Pages subpath.

## packages/desktop

An Electron main process and a preload script. The app files are served from a custom `app://downshift` origin instead of `file://`, so Web Bluetooth gets a secure context. The main process:

- sets a content security policy on every response and blocks navigation and new windows;
- turns on context isolation and the sandbox, with Node integration off, and exposes only a handful of named IPC messages through the preload;
- allows only the Bluetooth, notification and wake lock permissions, and only for the app's own origin;
- answers the Bluetooth device chooser itself: it reconnects to the remembered device, or asks the app to show its own list;
- draws the tray icon from the app's live bpm, and shows a tray menu (open, breathe now, start focus, mute);
- allows only one running instance.

`electron-builder` produces an NSIS installer and a portable exe in `packages/desktop/release`. See [SECURITY.md](../SECURITY.md).

DevTools are disabled in the packaged app (`devTools: !app.isPackaged`). A possible future hardening is to flip Electron fuses (for example disabling `RunAsNode` and the `NODE_OPTIONS` environment variable) with `@electron/fuses` at package time; this is not done yet.

## Tests and CI

- `bun run test` runs the `core`, `ble` and `app` unit tests.
- Playwright tests in `packages/app/e2e` run the built app in Chromium, desktop and phone sizes, against the simulated heart rate source with the clock offset.
- `ci.yml` runs lint, typecheck, tests, build and e2e on Linux, and builds the Windows installer on Windows. `pages.yml` deploys the website. `release.yml` builds the installer and portable exe and attaches them to a GitHub Release when a `v*` tag is pushed.

## Where your data lives

- Website and Windows app: settings in local storage, the event log in IndexedDB, both inside the browser profile or the app's own profile folder. "Delete all data" in Settings clears the history and resets settings to their defaults, keeping only the theme.
- The Windows app keeps its profile in its own folder under `%APPDATA%`.
- Nothing is sent anywhere.

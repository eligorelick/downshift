# Architecture

Downshift is a work and study reset companion in a Bun workspace of four TypeScript packages. The website is the product; the Windows app is the same website in an Electron window with a tray icon. The original 0.1.0 Windows Forms app is preserved in the first commit of the history (`4ef898d`). The former Workout interface is retired; [legacy-workout.md](legacy-workout.md) describes its preserved code and historical records.

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
| `nudge.ts` | `NudgeDetector`: completed-minute medians, a lagged rolling baseline, a rise held for minutes, a movement hold-off, signal continuity checks and the separate high-heart-rate check-in. Heart rate is context rather than a stress or focus score. |
| `focusClock.ts`, `presets.ts` | The block and break rhythm: heads-up, snooze twice, extend, long break. The School and Work presets only set the numbers and the wording. |
| `breakAdvice.ts` | Maps "tense, tired or fine" (plus heart rate context) to a suggested break. |
| `breathing.ts` | Breathing patterns, the pacer (`breathAt(pattern, elapsedSec)`), and the technique guide. |
| `settings.ts` | Typed settings, defaults, clamping, and versioned JSON. |
| `sharpness.ts` | Groups your own 1–5 sharpness ratings by time of day for History. |
| `log.ts` | Session and check-in event records and CSV export, including compatibility with existing historical records. |
| `pairing.ts`, `format.ts` | Matching the remembered device; clock formatting. |

## How a heart rate reading flows

1. A `HeartRateSource` from `packages/ble` raises readings: `WebBluetoothSource` from a real device, or `SimulatedSource` in demo mode and in tests.
2. `hrStore` in the app keeps the latest reading and a ten-minute buffer, and shares them with every page.
3. The companion and Focus logic in `focusSession.ts` subscribes to readings with `onHeartRate` and passes each one, with `now`, to `NudgeDetector` in `core`. A one-second tick drives timers and check-ins.
4. `core` returns plain values, such as whether a check-in is due. The session applies Snooze, Stop and prompt limits before turning them into UI and log events. Sound and spoken guidance require an explicit preference change from the silent defaults.
5. In the Windows app, `hrStore` also tells the shell the current bpm from a real device (not demo data), which draws the tray icon.

Per-second readings from a wrist sensor are unreliable around rapid heart rate changes (Van Oost 2025), so the detector works on completed-minute medians and pauses the relative-rise count after sudden jumps. Missing readings, reported contact loss or source changes restart baseline learning. It cannot establish why heart rate changed. The sources and limits are in [evidence.md](evidence.md).

## packages/ble

`HeartRateSource` is one small interface: `connect`, `disconnect`, `onReading`, `onState`. `WebBluetoothSource` filters on the `heart_rate` service, also accepts a few device name prefixes, and reconnects with backoff when the link drops. `detectSupport` explains why a browser cannot connect (iOS, Firefox, an insecure page). `BtLog` is a plain-language trace shown on the Device page for troubleshooting. A native iPhone adapter could implement the same interface later.

## packages/app

React 18 with Vite and hand-written CSS using design tokens; light and dark from the system, with an override. Pages are Home, Focus, Breathe, History, Device, Evidence and Settings, routed by the URL hash so it works from any subpath and from the Electron `app://` origin.

- **State** is small stores read with `useSyncExternalStore`: settings (browser local storage), heart rate, and the event log (IndexedDB, with an in-memory fallback if storage is blocked).
- **Sessions** (`sessions/`) hold the running Focus and independent heart rate companion state outside the pages, so navigation does not lose a timer or stop monitoring. A Breathe session belongs to the Breathe page and ends, saving the breaths done, when you leave it. Companion check-ins pause during active breathing and timed breaks.
- **Time** comes from one `now()` function. Tests move `window.__downshiftClock.offset` to fast-forward every timer, which is how the browser tests run a 25-minute block in seconds.
- **Notifications.** Permission is optional. Starting a timed Focus session can request it; the passive companion only requests it through **Enable notifications**. A system notification is shown only if permission was granted and the page is hidden; otherwise alerts are in-page. Browser suspension can still interrupt monitoring and delay delivery.
- **Evidence** page text lives in `content/evidence.ts` and must match the current `docs/evidence.md`, `docs/evidence-work-study.md` and `docs/evidence-cognition.md`. Historical research stays labeled separately.
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
- No account, telemetry or app server receives personal data. Guidance uses browser/system voices; automatic selection uses local voices. An explicitly selected remote voice may send generic cue text to its provider, never heart rate values.

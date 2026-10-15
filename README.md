# Downshift

Focus blocks, rest timers and guided breathing, with optional live heart rate from a WHOOP or any other Bluetooth heart rate monitor.

[![CI](https://github.com/eligorelick/downshift/actions/workflows/ci.yml/badge.svg)](https://github.com/eligorelick/downshift/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[Open the web app](https://eligorelick.github.io/downshift/)** · **[Windows release status](https://github.com/eligorelick/downshift/releases)**

<p>
  <img src="docs/images/home-light.png" alt="Field Guide: Downshift Home on desktop in the light theme" width="900">
</p>
<p>
  <img src="docs/images/focus-break-dark.png" alt="Field Guide on a phone: Focus break and optional feeling check-in, dark theme" width="200">
  <img src="docs/images/workout-rest-light.png" alt="Field Guide on a phone: Workout rest counting toward its minimum, light theme" width="200">
  <img src="docs/images/breathe-dark.png" alt="Field Guide on a phone: breathing pacer with Pause and Stop, dark theme" width="200">
</p>

Downshift runs in the browser and can also be run from source as a Windows app. It works without a heart rate device; connecting one adds advisory cues. Every default, from block lengths and rest minimums to breathing pace and the heart rate prompt, comes from published research, and the app shows how strong the support for each one is.

## Features

- **Focus.** Work blocks and breaks: 25/5 minutes (School) or 45 minutes (Work), with a two-minute warning, two snoozes and a note for where to pick up. Each break asks how you feel (tense, tired or fine) and suggests breathing, a walk or time away from screens. If your heart rate stays well above your baseline during a block, an optional prompt asks "Feeling tense?". It never tells you that you're stressed.
- **Workout.** A rest timer between sets. The minimum rest comes from your goal (strength, size or endurance), and heart rate never shortens it. Once the minimum has passed, it can tell you your heart rate is still elevated.
- **Breathe.** A visual pacer with spoken cues and tones. Six breaths a minute by default, with cyclic sighing and box breathing as options, and a tension rating before and after.
- **History.** A log of your sessions, how sharp you felt by time of day, and CSV export.

## Heart rate devices

Tested with **WHOOP 5.0** on the Windows app. Turn on **HR Broadcast** in the WHOOP app (Device settings), then connect from Downshift's Device page.

Downshift reads the standard Bluetooth Heart Rate Service, so other devices that broadcast it, such as chest straps, Fitbit Charge 6, Pixel Watch and Garmin watches, should also work. Setup steps for each are in [docs/platform-support.md](docs/platform-support.md). A device usually streams to one receiver at a time, so disconnect it from other apps and equipment first.

Heart rate needs a browser with Web Bluetooth: Chrome or Edge on Windows, macOS, Linux and Android, or [Bluefy](https://apps.apple.com/app/id1492822055) on iPhone. In Safari, Firefox and other iOS browsers, the timers and breathing still work without heart rate.

## Getting started

**Windows app.** No Windows installer or portable executable is published on [GitHub Releases](https://github.com/eligorelick/downshift/releases) yet. Use the web app, or run the Electron app from source with `bun run desktop`. The Windows shell adds a tray icon with live heart rate and native notifications.

**Website.** Open <https://eligorelick.github.io/downshift/> in Chrome or Edge, or in Bluefy on iPhone. You can install it as an app, and it works offline after the first visit.

**Connect your device.**

1. Turn on heart rate broadcasting on your device.
2. In Downshift, open **Device** → **Connect a heart rate device** and choose your device.
3. Check that the live reading matches your device.

No device? **Device** → **Try demo data** runs everything on a simulated heart rate.

## How the defaults were chosen

Each default is labeled *tested in studies*, *supported by smaller trials or associations*, or *a reasoned starting point*. The main points:

- Breathing exercises give a small-to-medium drop in self-reported stress, though in the largest blinded trial a placebo pace helped about as much.
- Short breaks reduce fatigue and raise energy. Their effect on performance is small and uncertain.
- Longer rests between sets help strength. No trial we know of shows that resting by heart rate improves gains, so the rest minimum is a clock and heart rate is advice only.
- Heart rate alone hasn't been validated as a stress detector, so the prompt asks how you feel instead of telling you. Most everyday stress probably won't trigger it.

Downshift makes no promises about grades, strength or muscle gains. Each default and its sources are listed in [docs/evidence.md](docs/evidence.md). There are deeper reviews of [Workout and Work](docs/evidence-workout-work.md), [heart rate and thinking](docs/evidence-cognition.md), and the [full literature review](docs/evidence-review.md) of about 90 sources. Every DOI and PubMed ID was checked against Crossref and NCBI.

## Privacy

There's no account, server, telemetry or analytics. Settings and history stay in your browser's storage (or the Windows app's own profile). Live heart rate isn't recorded; only session summaries are saved, such as your heart rate at the start and end of a rest. You can export your history as CSV or delete everything from Settings. Spoken cues use your system's voices, and some browsers use an online voice service for these.

## Development

Requires [Bun](https://bun.sh) 1.4.

```sh
bun install
bun run dev            # dev server with hot reload
bun run test           # unit tests: core, ble, app
bun run lint
bun run typecheck
bun run e2e            # Playwright; first run: cd packages/app && bunx playwright install chromium
bun run build          # website → packages/app/dist
bun run desktop        # run the Windows app
bun run desktop:dist   # installer and portable exe → packages/desktop/release
```

```
packages/core      Decision logic: nudge, focus clock, rest coach, breathing. No DOM, fully unit-tested.
packages/ble       Heart rate sources: Web Bluetooth and a simulator.
packages/app       React + Vite UI. Builds the website.
packages/desktop   Electron shell for Windows.
```

See [docs/architecture.md](docs/architecture.md) for how it fits together and [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. The original 0.1.0 Windows Forms app is preserved in the [first commit](https://github.com/eligorelick/downshift/tree/4ef898d5af933566dcfeb83621c86b761e31ac70).

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md). For connection problems, the Bluetooth log on the Device page shows what the app saw; attach it to bug reports.

## Disclaimer

Downshift is a timing and self-regulation aid, not a medical device. It doesn't diagnose, treat or monitor any condition. A racing heart with chest pain, faintness or trouble breathing needs medical care. Stop lifting if something hurts.

Downshift is an independent project, not affiliated with or endorsed by WHOOP, Fitbit, Google, Apple, Polar or Garmin. Their names are trademarks of their respective owners.

## License

[MIT](LICENSE). Bundled third-party packages and their licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

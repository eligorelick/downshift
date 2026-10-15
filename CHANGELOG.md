# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows [Semantic Versioning](https://semver.org/).

## Unreleased

- Home heart rate companion with independent Start/Stop, baseline learning, measured minute context and optional check-ins, without manual Focus blocks.
- Persistent 15-minute Snooze and prompt limits; reset monitoring on signal gaps, contact loss or source changes, and pause during Workout, breathing and timed breaks.
- Silent fresh defaults and optional system voice selection/preview, with local automatic selection, explicit remote-service labeling and immediate mute cancellation.
- Updated Field Guide controls, accessibility, evidence and browser-background limitations. Heart rate remains advisory; no stress, focus or recovery score is inferred.

## [0.2.0] - 2026-10-12

A full rebuild as a single TypeScript codebase that runs in the browser and as a Windows app. The 0.1.0 Windows Forms app is no longer in the main tree; its source is preserved in the first commit of the history ([`4ef898d`](https://github.com/eligorelick/downshift/tree/4ef898d5af933566dcfeb83621c86b761e31ac70)).

### Added

- Website and installable web app for Chrome and Edge on Windows, macOS, Linux and Android, and for Bluefy on iPhone. It caches itself for offline use.
- Windows app (Electron) with an installer, a portable exe, a tray icon showing live heart rate, native notifications and a Bluetooth device chooser.
- Heart rate from any device with the standard Bluetooth Heart Rate Service. Verified with WHOOP 5.0 (HR Broadcast) on the Windows app; designed for WHOOP 4.0 and MG, Fitbit Charge 6, Google Fitbit Air, Pixel Watch 2 or newer, and chest and arm straps. A demo mode with simulated heart rate.
- Focus mode, replacing study sessions: School (25 minutes) and Work (45 minutes) presets, a break question (tense, tired or fine) with a suggested break, and the 0.1.0 heart rate nudge with the same rule. The nudge now notes that a raised heart rate can be effort as well as tension.
- An optional "How sharp did you feel?" rating after each Focus session, and a by-time-of-day view in History once there are five ratings.
- Workout mode: a rest timer with a minimum set by your goal, advisory heart rate cues that never shorten the rest, a set-done button, and a warning about wrist sensors during lifting.
- Breathe mode: a technique guide and a tension rating before and after.
- History with CSV export, and deleting all data. Light and dark themes. Evidence pages for all three modes.
- Keyboard navigation, screen reader labels, and Windows High Contrast support.
- CI on every push to `main` and every pull request, GitHub Pages deployment of the website, and a release workflow for the Windows builds.
- Documentation for platform and device support, evidence for the Workout and Work modes, and a review of heart rate and cognitive performance. Every DOI and PubMed ID was checked against Crossref and NCBI.

### Changed

- Settings and history are kept in browser storage (or the Windows app's own profile) instead of files under `%APPDATA%\Downshift`. 0.1.0 data is not imported.
- "Study breaks" on the evidence page is now "Focus breaks" and covers the Work preset.

### Known limitations

- Only WHOOP 5.0 on the Windows app has been verified with real hardware. Other devices, browsers and phones are expected to work but are untested.
- iOS browsers other than Bluefy cannot read heart rate, because WebKit does not support Web Bluetooth.
- Phone browsers may pause Bluetooth when the screen locks.
- The Windows builds are not code-signed, so SmartScreen warns about an unknown publisher and Smart App Control blocks them. The website installed from Edge works on those PCs.
- WHOOP and Fitbit accounts cannot be linked; see [docs/platform-support.md](docs/platform-support.md).

## [0.1.0] - 2026-10-10

First release: a Windows tray app for studying with a WHOOP strap.

### Added

- Study sessions: 25-minute blocks (adjustable from 20 to 50), short breaks, and a longer break after about two hours, with a two-minute warning, two five-minute delays and a resume note.
- Guided breathing: six breaths a minute by default, with cyclic sighing and box breathing as options; five- and two-minute sessions.
- Heart rate nudge: asks "Feeling tense?" after a sustained rise above a seated baseline, at most once an hour and three times a day, during study sessions by default.
- A check-in message when seated heart rate stays at or above 130 bpm for ten minutes.
- Pairing with one chosen strap; the app never connects to any other.
- Voice cues using any installed Windows voice, with speed, volume and a master mute.
- Home, Device, Settings and Evidence pages, and a notification box that follows the Windows theme and accent color.
- A CSV session log and a Bluetooth log for troubleshooting.

### Known limitations

- Not verified with a real WHOOP strap.
- The executable is not code-signed.
- The main window does not follow the Windows dark theme.

[0.2.0]: https://github.com/eligorelick/downshift/compare/4ef898d5af933566dcfeb83621c86b761e31ac70...v0.2.0
[0.1.0]: https://github.com/eligorelick/downshift/tree/4ef898d5af933566dcfeb83621c86b761e31ac70

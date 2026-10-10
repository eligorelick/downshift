# Changelog

This project follows [Semantic Versioning](https://semver.org/). Dates are year-month-day.

## 0.1.0 (2026-10-10)

First public release.

### Added

- Study sessions: 25-minute work blocks (adjustable from 20 to 50), short breaks, and a longer break after about two hours, with a two-minute warning, two five-minute delays and a resume note.
- Guided breathing: slow breathing at six breaths a minute as the default, with cyclic sighing and box breathing as options; five-minute and two-minute sessions; a first-run explanation of how to breathe.
- Heart rate nudge: asks "Feeling tense?" after a sustained rise above a seated baseline, at most once an hour and three times a day, and only during study sessions by default.
- A check-in message when seated heart rate stays at or above 130 bpm for ten minutes.
- Pairing: choose one strap from a list of nearby straps; the app never connects to any other.
- Voices: any voice installed in Windows, with speed and volume, and a master mute.
- A main window with Home, Device, Settings and Evidence pages, and a notification-style box that follows the Windows theme and accent color.
- A session log in CSV form and a Bluetooth log for troubleshooting.

### Known limitations

- Not yet verified with a real WHOOP strap on Windows.
- The executable is not code-signed, so Windows shows an unknown-publisher warning.
- The main window does not follow the Windows dark theme; the notification box does.

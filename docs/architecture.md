# Architecture

Downshift is a single Windows Forms executable targeting .NET Framework 4.7.2. That target is deliberate: the framework ships with Windows 10 and 11, so the app is one small file with nothing to install.

## Source files

| File | What it holds |
|---|---|
| `Core.cs` | Everything with no Windows dependency: heart rate packet parsing, the nudge rule (`NudgeDetector`), the study rhythm (`StudyClock`), breathing patterns, settings, and pairing rules. This is the tested part. |
| `Program.cs` | `TrayApp`, the controller. It owns the tray icon, wires the strap to the detector, runs breathing sessions and study sessions, and decides what the notification box shows. |
| `Card.cs` | The notification-style box in the corner of the screen. Custom-drawn, never takes keyboard focus. |
| `MainForm.cs` | The main window and its four pages, built from standard Windows controls. |
| `Strap.cs`, `IStrap.cs` | Bluetooth. `IStrap` has no Windows Runtime types in it, so the app still starts where those APIs are missing. |
| `Sound.cs`, `ModernVoice.cs` | Tones and speech, with two speech engines behind `IVoiceEngine`. |
| `Theme.cs` | Colors and fonts. The box follows the Windows theme and accent color. |
| `Evidence.cs` | The text of the Evidence page. |
| `SelfTest.cs` | Compiled only with `SELFTEST`: a simulated strap and a script that drives every screen. |

## How a heart rate reading flows

1. `Strap` subscribes to the Bluetooth heart rate measurement and raises `Reading` on a background thread.
2. `TrayApp` posts it to the UI thread and passes it to `NudgeDetector.Push`.
3. The detector collects readings into per-minute medians. Per-second readings from a wrist strap are too noisy during posture changes to judge anything on.
4. When a minute closes, the detector compares recent minutes with a baseline: the median of the last half hour of seated minutes, leaving out the newest few so an episode cannot raise its own bar.
5. If enough consecutive minutes sit above baseline plus the threshold, and no movement-shaped jump restarted the count, the detector reports that a nudge is due.
6. `TrayApp` checks the hourly and daily limits, waits for a pause in typing, and shows the question.

## Design decisions

**The nudge asks; it does not tell.** No study validates heart rate alone as a stress detector, and movement raises heart rate as much as stress does. The app therefore only puts a question, offers "I was moving" as an answer, and logs the answer.

**Monitoring runs during study sessions by default.** That is when the person is sitting, which is the only condition under which a raised heart rate means much.

**The strap is chosen explicitly.** The app connects only to the paired strap, matched by Bluetooth address or by name. WHOOP names carry the serial number, so the name survives an address change.

**Windows Runtime code is isolated.** `Strap` and `ModernVoice` use Windows Runtime APIs. Each is created inside a method marked `NoInlining` and wrapped in a `try`, so a PC without those APIs gets a clear message and a working timer and breathing guide.

**Two speech engines.** The newer engine exposes voices added in Windows Settings. If it fails, the app falls back to the older desktop engine for the rest of the run.

## Files on disk

All under `%APPDATA%\Downshift`:

- `settings.ini`: settings, the paired strap and today's tally
- `downshift-log.csv`: breathing sessions, nudges and study sessions
- `bluetooth-log.txt`: a plain-language trace of the Bluetooth side
- `error.log`: unexpected errors

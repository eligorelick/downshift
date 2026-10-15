# Contributing

Bug reports, device reports and pull requests are welcome.

## Device reports

Downshift has been tested with a WHOOP 5.0 on the Windows app. If you try it with another device or platform, please [open an issue](https://github.com/eligorelick/downshift/issues/new/choose) saying what worked, what didn't, and attach the Bluetooth log from the Device page. That's the most useful contribution right now.

## Guidelines

- **Keep the scope on work and study.** Focus blocks, optional heart rate check-ins and optional breathing support a quiet reset. The former Workout interface is retired; see [docs/legacy-workout.md](docs/legacy-workout.md) before touching preserved code or historical records.
- **Defaults need a source.** If you change a default (a timer, a breathing pattern or the nudge rule), cite the research and say how strong it is: tested in studies, smaller trials or associations, or a reasoned starting point. Update the matching current file in `docs/` and `packages/app/src/content/evidence.ts` in the same pull request. Preserve historical research as historical. Link a DOI or PubMed ID you've checked, and prefer systematic reviews over single studies.
- **Don't overclaim.** The app asks how people feel; it doesn't tell them. It doesn't promise better grades or productivity.
- **Keep personal data on the device.** No telemetry or accounts. Automatic voice selection uses local voices; an explicitly selected remote voice service may receive generic cue text, never heart rate values.
- **Prompts have a cost.** A new prompt needs a clear reason and a limit on how often it appears.
- **Heart rate is context.** It cannot diagnose stress, fatigue or readiness. Check-ins need Snooze and Stop controls; breathing stays optional. Preserve silent defaults and opt-in sound and voice.

## Setup

You need [Bun](https://bun.sh) 1.4 (CI uses 1.4.3).

```sh
bun install
bun run dev
```

## Checks

Run these before opening a pull request. CI runs the same ones.

```sh
bun run lint
bun run typecheck
bun run test
bun run build
bun run e2e            # first run: cd packages/app && bunx playwright install chromium
```

`bun run desktop` runs the Windows app from source, and `bun run desktop:dist` builds the installer and portable exe.

## Where code goes

`packages/core` holds everything that can be tested without a browser: the nudge rule, the focus clock, breathing patterns, settings and the log format. Put new logic there, with tests in `packages/core/test`. Time-dependent functions take `now` as an argument; `core` never reads the clock. Keep `packages/app` thin. Preserved legacy modules are documented in [docs/legacy-workout.md](docs/legacy-workout.md).

To work without a device, use **Device → Try demo data**. The browser tests use the same simulated source and move `window.__downshiftClock.offset` to skip time.

## Code style

- Strict TypeScript, with no `any` in `core` or `ble`.
- Biome handles formatting: run `bun run format`.
- Comments explain why. If a number comes from research, cite it.
- UI text is sentence case, short and specific. Errors say what happened and what to do next.
- Colors come from `packages/app/src/styles/tokens.css`. Text needs 4.5:1 contrast and control outlines 3:1. Everything must work with a keyboard and a screen reader.

## Pull requests

Keep them focused. Describe the change and how you tested it, and mention it if you couldn't test on a real device or on Windows.

By contributing, you agree that your work is released under the MIT License.

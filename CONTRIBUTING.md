# Contributing

Thanks for wanting to help. The most valuable contribution right now is a report from someone who has run Downshift with a real WHOOP: what connected, what didn't, and the Bluetooth log.

## Ground rules

- **Defaults follow evidence.** A change to a default, a breathing technique or the nudge rule needs a source. Say whether the number is tested in a study or is a reasoned starting point, and update `docs/evidence.md` and `src/Downshift/Evidence.cs` in the same pull request.
- **The app must not overclaim.** It asks how someone feels; it does not tell them. It does not promise better grades.
- **Nothing leaves the PC.** No telemetry, no network calls.
- **Interruptions are a cost.** A new prompt needs a reason to exist and a limit on how often it appears.

## Building and testing

You need the .NET 8 SDK. Any operating system works for building and for the logic tests.

```
dotnet build Downshift.sln -c Release
dotnet run --project tests/Downshift.Tests -c Release
```

The tests are a console program. Each check prints `ok` or `FAIL`, and the process exits non-zero if any fail.

### Where to put logic

`src/Downshift/Core.cs` holds everything that can be tested without Windows: the nudge rule, the study clock, breathing patterns, settings and pairing. Put new logic there and test it in `tests/Downshift.Tests/Program.cs`. The rest of the app should stay thin.

### Running the app without a strap

A test build replaces the Bluetooth strap with a simulated one and drives every screen by itself:

```
dotnet build src/Downshift -c Release -p:DefineConstants=SELFTEST -o artifacts/selftest
```

On Windows, run `artifacts\selftest\Downshift.exe`. On Linux, `scripts/selftest.sh` runs it under Mono in a virtual display and saves a screenshot of each screen to `selftest-out/`. Mono draws standard Windows controls in its own style and has no Segoe UI, so those screenshots show layout, not the final look.

## Code style

- C# 7.3, targeting .NET Framework 4.7.2, so the app runs on a stock Windows install with nothing else to add.
- Comments explain why. Where a number comes from research, say so.
- Text shown to people is sentence case, plain, and specific. Errors say what happened and what to do.
- Colors come from `Theme.cs`. Text needs at least 4.5:1 contrast against its background, and control outlines 3:1.

## Pull requests

Keep them focused. Describe what changed and how you tested it, and say plainly if you could not test on Windows or with a strap.

By contributing you agree that your work is released under the MIT License.

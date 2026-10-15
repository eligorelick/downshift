# Documentation

## Evidence

Each default is labeled by the strength of its support: tested in studies, supported by smaller trials or associations, or a reasoned starting point that no study has tested in this form. These files give the label and sources for each.

| File | What it covers |
|---|---|
| [evidence.md](evidence.md) | Each default for breathing, the heart rate nudge and focus breaks, with its source and status. Start here. |
| [evidence-workout-work.md](evidence-workout-work.md) | Rest between sets, wearable accuracy during lifting, the Work preset, choosing a break type and a breathing technique. |
| [evidence-cognition.md](evidence-cognition.md) | Heart rate, heart rate variability and thinking: why there is no "optimal heart rate for focus", what a strap can and cannot tell you, and when thinking tends to be at its best. |
| [evidence-review.md](evidence-review.md) | The full literature review behind 0.1.0 (breathing, breaks, the nudge), with about 90 sources. |

The Evidence page inside the app shows the same tables. Its text lives in `packages/app/src/content/evidence.ts` and should match these files.

Every DOI, PMID and PMC identifier was checked against Crossref and NCBI, and each claim against the paper. Where only the abstract was available, the files say so.

## Using and building Downshift

| File | What it covers |
|---|---|
| [platform-support.md](platform-support.md) | Which browsers, phones and heart rate devices work, and why there is no WHOOP or Fitbit login. |
| [troubleshooting.md](troubleshooting.md) | A device won't connect, alerts don't arrive, Windows blocks the app, the site won't update. |
| [architecture.md](architecture.md) | How the code is organized, how a heart rate reading flows, the Electron security model, tests and CI. |

## Interface screenshots

The Field Guide interface uses warm paper, olive controls, editorial typography and ruled sections. These images are captures of the running app; the active sessions work without a heart rate device.

<img src="images/home-light.png" alt="Downshift Home: three mode rows and today's counts in the Field Guide light theme" width="900">

<img src="images/focus-break-dark.png" alt="Focus break with the Tense, Tired and Fine choices, dark theme" width="200"> <img src="images/workout-rest-light.png" alt="Workout rest timer counting toward the minimum, light theme" width="200"> <img src="images/breathe-dark.png" alt="Guided breathing with Pause and Stop, dark theme" width="200">

To refresh these screenshots locally, build the app and start its production preview in one terminal:

```sh
bun run build
bun run --cwd packages/app preview --host 127.0.0.1 --port 4174
```

Then, from `packages/app` in another terminal:

```sh
bun run scripts/capture-ui.ts
```

The capture uses a fresh browser profile, the app's existing test clock to skip waiting, and reduced motion. It does not read or alter your own settings or history. No Windows binary is currently published on GitHub Releases; these screenshots do not imply that one is available.

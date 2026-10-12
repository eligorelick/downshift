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

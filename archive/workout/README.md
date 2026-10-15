# Retired Workout implementation

Workout was retired from the active product on 15 October 2026 so Downshift can stay focused on work and study. This directory is a source archive, not an optional mode or a second application. Nothing here is imported by the app or included in its browser/Windows build.

The original app files, stylesheet, browser flow test and screenshot keep their former repository-relative paths below this directory. The former icon is saved alongside them. The source snapshot immediately before retirement is commit `2d6f45c9947428913e3cfcc00183a14e93b0df27`.

The pure rest coach remains separately in `packages/core/src/legacy/restCoach.ts`, with its existing safety tests. The old demo waveform is in `packages/ble/src/legacy/workoutScenario.ts` and is used only by legacy tests. Neither is exported through the active package barrel.

These files are historical source, not an independently runnable build. Restoring the feature would require an explicit product decision, moving the files back to their original paths, restoring the core export, icon, routes, settings controls, simulator option and controller integrations, and running the original flow and safety checks. The pre-retirement commit records those integrations exactly; they are deliberately absent now.

Existing workout records and preferences have not been migrated or deleted. The compatibility schema and CSV columns remain, and History shows saved sets as legacy records. See [the retirement boundary](../../docs/legacy-workout.md).

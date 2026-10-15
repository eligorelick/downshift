# Retired Workout support

Downshift now serves work and study: a passive heart rate companion, optional Focus blocks and guided breathing. Workout is retired from navigation, onboarding, routes, settings and demo choices. An old `#workout` link falls back to Home and cannot start a workout.

## Existing data

No data migration runs on upgrade. IndexedDB is still `downshift`, version 1, with the same `events` store. Existing `set` events and every recorded value remain readable in History and exportable in the existing CSV format. History offers a **Legacy workout** filter only when saved set records exist. This is access to previous records, not a route to a workout timer.

The version 1 settings fields for goals, rest floors, old workout cue choices and the stored daily set count remain in the compatibility schema. Ordinary preference changes preserve them. The daily set count is no longer displayed on Home. Existing explicit export, preference reset and Delete all data controls retain their documented purposes; retirement itself deletes nothing.

## Preserved source

- [App source archive](../archive/workout/README.md): page, controller, rest ring, stylesheet, former browser flow, icon and historical screenshot.
- `packages/core/src/legacy/restCoach.ts`: pure legacy rest-coach algorithm; `packages/core/test/restCoach.test.ts` still tests its minimum-rest and signal-quality behavior directly.
- `packages/ble/src/legacy/workoutScenario.ts`: former synthetic set/recovery waveform, used only by legacy tests.
- [Historical Workout/Work evidence](evidence-workout-work.md): original sources retained and labeled historical. Current work/study guidance is in [evidence-work-study.md](evidence-work-study.md).

The archived app is outside the active app's TypeScript source tree and has no entry point. Core/BLE legacy implementations have no active runtime imports or public barrel exports. Restoring the feature requires deliberately reconnecting it and verifying the original behavior; it cannot be enabled by a URL or saved preference.

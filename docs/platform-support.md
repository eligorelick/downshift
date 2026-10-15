# Platform and device support

Downshift reads live heart rate from the standard Bluetooth Low Energy Heart Rate Service, using Web Bluetooth. That decides what works where.

**Verified** means tested end to end with real hardware. **Expected** means the platform or device supports the standard but has not been tested with Downshift yet. Please [open an issue](https://github.com/eligorelick/downshift/issues/new/choose) with what you find.

## Platforms

| Platform | Browser or app | Status | Notes |
|---|---|---|---|
| Windows | Downshift Windows app | **Verified** with WHOOP 5.0 | Adds a tray icon and native notifications. |
| Windows | Chrome, Edge | Expected | Bluetooth must be on. |
| macOS | Chrome, Edge | Expected | |
| Linux | Chrome, Edge | Expected | Depends on the system Bluetooth stack (BlueZ). Chrome may need `chrome://flags/#enable-web-bluetooth` or `#experimental-web-platform-features` ([Chrome's guide](https://developer.chrome.com/docs/capabilities/bluetooth)). |
| Android | Chrome | Expected | Bluetooth may pause when the screen locks or the browser goes to the background. Keep the screen on. |
| iPhone, iPad | Bluefy | Expected | Keep the screen on. |
| iPhone, iPad | Safari, Chrome and other browsers | Not supported | iOS browsers use WebKit, which does not implement Web Bluetooth ([WebKit bug 238049](https://bugs.webkit.org/show_bug.cgi?id=238049)). Apple allows other engines only in the EU and, from iOS 26.2, Japan ([EU](https://developer.apple.com/support/alternative-browser-engines/), [Japan](https://developer.apple.com/support/alternative-browser-engines-jp)); we know of no iOS browser with Web Bluetooth other than Bluefy. |
| Any | Firefox | Not supported | Firefox does not implement Web Bluetooth. |

Web Bluetooth requires a secure page: the hosted website is served over HTTPS, and `localhost` also counts. See [caniuse.com/web-bluetooth](https://caniuse.com/web-bluetooth) for browser support in general.

Without heart rate, the Focus timers and optional Breathe guide still work; heart rate check-ins need a connected device or demo data. The Device page explains why a browser cannot connect.

## Devices

Any device that exposes the standard Heart Rate Service (`heart_rate` service, `heart_rate_measurement` characteristic) should work.

| Device | How to turn on sharing | Status |
|---|---|---|
| WHOOP 5.0 | In the WHOOP app, open Device settings and turn on **HR Broadcast**. | **Verified** (Windows app) |
| WHOOP 4.0, WHOOP MG | Same as WHOOP 5.0. | Expected |
| Fitbit Charge 6 | Swipe down from the clock face and tap **HR on Equipment** ([Google](https://support.google.com/googlehealth/answer/14236705)). | Expected |
| Google Fitbit Air | In the Google Health app, open Connections, select your device, choose **Share heart rate**, and bring the Fitbit Air near the receiver ([Google](https://support.google.com/googlehealth/answer/14236705)). | Expected |
| Pixel Watch 2 or newer | In quick settings, open **Connected Fitness**. If your computer can't see the watch, turn on Extended pairing (Allow more devices) ([Google](https://support.google.com/googlehealth/answer/14236705)). | Expected |
| Chest and arm straps (Polar, Garmin, Wahoo and others) | Nothing to turn on; they advertise the service when worn. | Expected |
| Garmin watches that broadcast over Bluetooth | **Broadcast Heart Rate** (the menu varies by model; older models broadcast over ANT+ only, per [DC Rainmaker](https://www.dcrainmaker.com/2020/04/garmin-wearable-broadcasting.html)). | Expected |

Google lists no other Fitbit models as able to share heart rate.

A device usually streams to one receiver at a time. Disconnect it from bike computers, gym equipment and other apps first.

Use the companion while working or studying with a comfortable, stable sensor fit. Movement and sensor error can change the reading; heart rate cannot establish stress, focus or readiness. Follow the device maker's fitting guidance. The current limits are in [evidence.md](evidence.md). The former lifting-specific sensor review and its citations are preserved in the [historical research archive](evidence-workout-work.md).

## Why there is no WHOOP or Fitbit login

- **WHOOP.** The WHOOP developer API (v2) returns summaries such as recoveries, sleeps and workouts, not a live heart rate stream, and it needs an OAuth client secret held on a server ([WHOOP developer documentation](https://developer.whoop.com)). HR Broadcast exposes the same standard Bluetooth service that Downshift reads.
- **Fitbit.** Fitbit Web API support ended on 30 September 2026 and the API is due to shut down on 30 October 2026; Google is not onboarding new projects to the Google Health API at this time ([Google Health API](https://developers.google.com/health/about)). Bluetooth heart rate sharing works on the models listed above.

A cloud login would also need a server to hold secrets and your data, which conflicts with Downshift keeping everything on your device.

## Known limits

- **Background limits.** Phones may pause web pages and Bluetooth when the screen locks. Timers use the clock, so they stay correct, but heart rate has gaps and alerts may arrive late.
- **RR intervals are optional.** Downshift reads RR intervals if a device sends them but does not need them.
- **No native iPhone app.** The Bluetooth layer is behind one interface, so a native adapter could be added later.

# Troubleshooting

## Downshift says Bluetooth isn't available

The Device page says why. The common reasons:

- **iPhone or iPad.** iOS browsers have no Web Bluetooth. Open Downshift in [Bluefy](https://apps.apple.com/app/id1492822055) instead.
- **Firefox.** Firefox does not support Web Bluetooth. Use Chrome, Edge or the Windows app.
- **Insecure page.** Web Bluetooth only works on HTTPS pages and `localhost`. Use the hosted website, not a plain `http://` address.

See [platform-support.md](platform-support.md) for the full table. The timers and breathing guide work in any current browser.

## My device is not in the list

- Turn on heart rate broadcasting first; most devices are not visible until it is on.
  - **WHOOP:** WHOOP app → Device settings → **HR Broadcast**.
  - **Fitbit Charge 6:** swipe down from the clock face and tap **HR on Equipment**.
  - **Google Fitbit Air:** Google Health app → Connections → your device → **Share heart rate**.
  - **Pixel Watch 2 or newer:** quick settings → **Connected Fitness**. If your computer can't see the watch, turn on Extended pairing (Allow more devices).
  - **Garmin watch:** **Broadcast Heart Rate**, on models that broadcast over Bluetooth.
- A device usually streams to one receiver at a time. Disconnect it from bike computers, gym equipment and other fitness apps first.
- Keep the device within a few meters, and check that Bluetooth is on.
- The chooser shows devices that offer the heart rate service, plus a few known names (WHOOP, Charge, Pixel Watch). If yours still does not appear, [open an issue](https://github.com/eligorelick/downshift/issues/new/choose) with its model and the Bluetooth log.

## It connects, then shows no reading

Some devices send zeros until they have a good reading; Downshift ignores them (the Bluetooth log says "Ignored ... outside 25-240 bpm"). Make sure the strap or watch is snug, as the maker advises, wait a minute, then turn heart rate broadcasting off and on again.

## It connects, then drops

- **Android and iPhone:** locking the screen or switching apps can pause Bluetooth in a browser. Keep the screen on. Downshift reconnects on its own when it can, and timers keep correct time either way.
- Another app may have taken the device. Close it.

## The live reading does not match my device

You may have picked someone else's device. On the Device page choose **Forget this device**, then connect again and pick yours by name. If several look alike, turn the others off or move away from them first.

## The Bluetooth log

The Bluetooth log on the **Device** page records which device the app tried to connect to and why a connection failed. Attach it to bug reports. It contains device names; remove them if you prefer.

## There is no sound or voice

- Fresh installs and preference resets are silent. To opt in, turn **Mute all sound** off in Settings, raise the volume and enable the guidance or tone you want.
- Browsers only play sound after you have interacted with the page, so start sessions by tapping a button.
- For spoken cues, enable **Spoken guidance**, choose a **Guidance voice** and use **Preview voice**. Automatic selection uses local voices only; an explicitly chosen remote voice may use the browser's voice service. If no local voice is available, add one in your system's speech settings. Mute, guidance off or zero volume also prevents preview.

## Notifications do not show

Use **Enable notifications** to request the optional browser permission. If you declined, allow notifications in the browser's site settings. System notifications appear only while the page is in the background; on phones they may be late while the screen is locked. Permission cannot make continuous background heart rate monitoring reliable.

## Windows blocks the installer

The Windows builds are not code-signed. If SmartScreen shows "Windows protected your PC", choose **More info**, then **Run anyway**.

If there is no **Run anyway** option, **Smart App Control** is on (Windows Security → App & browser control), and it blocks unsigned apps without a per-app override. Use the website instead: open it in Edge, then Edge menu (…) → **Apps** → **Install this site as an app**. You get the same app in its own window, without the tray icon. We don't recommend turning Smart App Control off for this.

## The website does not update

The app is cached for offline use. When a new version has downloaded, it reloads itself once there is no Focus block or open sharpness question, the Breathe page is closed, and no device is connected or connecting. The saved companion monitoring preference does not prevent a refresh while it is waiting for a device. To update sooner, stop running sessions, close every tab or window of it and reopen it. If it still shows old content, clear the site's data in browser settings; this also deletes your history, so export it from History first.

## My settings or history disappeared

Settings and history live in browser storage. Private windows, "clear site data on exit" and some strict privacy settings delete them or prevent saving. Downshift shows a notice when it cannot save. Use **Export CSV** on History to keep a copy.

## The nudge never appears

That is expected most of the time. Start the heart rate companion on Home, or use **In focus** monitoring with a timed Focus block. The independent companion first settles for five minutes and then needs enough usable minutes to learn a baseline; a rise of about 15 bpm must then hold for five minutes. Signal gaps, contact loss and source changes restart learning; active breathing, timed breaks and Snooze pause check-ins. In the one real-exam study we found, the rise was about 4 to 9 bpm ([Pakhomov et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7094857/)), so it often stays quiet. These rules are product starting points, not validated stress detection.

## I used the former Workout feature

The Workout interface and settings are retired from the current work and study companion. Existing history remains available for export. See [legacy-workout.md](legacy-workout.md) for the preserved code and [the historical research archive](evidence-workout-work.md) for its original evidence and limitations.

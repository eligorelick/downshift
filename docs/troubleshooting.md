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

- Check that **Mute all sound** is off in Settings and the volume is up.
- Browsers only play sound after you have interacted with the page, so start sessions by tapping a button.
- Spoken cues use your system's voices (some browsers use an online voice service). If there is no voice, add one in your system's speech settings.

## Notifications do not show

Downshift asks for permission when you start a Focus session or Workout, until you answer. If you declined, allow notifications in the browser's site settings. System notifications appear only while the page is in the background; on phones they may be late while the screen is locked.

## Windows blocks the installer

The Windows builds are not code-signed. If SmartScreen shows "Windows protected your PC", choose **More info**, then **Run anyway**.

If there is no **Run anyway** option, **Smart App Control** is on (Windows Security → App & browser control), and it blocks unsigned apps without a per-app override. Use the website instead: open it in Edge, then Edge menu (…) → **Apps** → **Install this site as an app**. You get the same app in its own window, without the tray icon. We don't recommend turning Smart App Control off for this.

## The website does not update

The app is cached for offline use. When a new version has downloaded, it reloads itself once nothing is running: no focus block, workout, breathing session or open question, and no connected device. To update sooner, close every tab or window of it and reopen it. If it still shows old content, clear the site's data in browser settings; this also deletes your history, so export it from History first.

## My settings or history disappeared

Settings and history live in browser storage. Private windows, "clear site data on exit" and some strict privacy settings delete them or prevent saving. Downshift shows a notice when it cannot save. Use **Export CSV** on History to keep a copy.

## The nudge never appears

That is expected most of the time. It needs a focus block (about 15 minutes in at the earliest, to learn a baseline), then a rise of about 15 bpm above that baseline held for five minutes. In the one real-exam study we found, the rise was about 4 to 9 bpm ([Pakhomov et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7094857/)), so it often stays quiet.

## Workout says "heart rate unreliable"

Wrist sensors tend to under-read during lifting, so the app flags sudden jumps and lost contact instead of acting on them. If readings stop, only the rest timer is used, and the rest minimum always applies. A chest strap is the most reliable option. See [evidence-workout-work.md](evidence-workout-work.md).

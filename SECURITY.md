# Security

## Reporting a vulnerability

Please do not open a public issue. Report vulnerabilities privately through GitHub: [Report a vulnerability](https://github.com/eligorelick/downshift/security/advisories/new), or the **Report a vulnerability** button on the repository's Security tab.

For conduct problems, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) instead.

## What Downshift touches

- **Bluetooth.** It asks the browser or the Windows app to show a chooser of devices that offer the standard heart rate service or whose names start with WHOOP, Charge or Pixel Watch, and connects only to the device you pick. It reads the heart rate measurement and changes no data on the device; subscribing to heart rate notifications only sets the standard notification flag.
- **Storage.** Settings are kept in the browser's local storage and the history in IndexedDB, in the browser profile (or the Windows app's own profile). Nothing else on disk is read or written, apart from the Windows app state file below and a CSV file when you export your history.
- **Network.** None, beyond loading the website's own files. There is no account, server, telemetry or third-party script. The website's service worker only caches its own files.
- **Windows app state.** The Windows app also writes one small file, `shell-state.json`, in its user data folder (under `%APPDATA%`). It only records whether the "still running in the tray" notice has been shown.
- **Notifications, sound and screen wake lock.** Used for alerts and so the screen stays on during a session.

The Bluetooth log shown on the Device page contains device names. Remove them before sharing a log if you prefer.

## Windows app hardening

The Windows app is the website in an Electron window. These measures limit what a bug in the page, or a malicious file, could do:

- **Isolation.** Context isolation and the Chromium sandbox are on and Node integration is off. The preload script exposes only a few named messages (tray heart rate, remembered device, device choice, mute, navigation).
- **Own origin.** The app is served from `app://downshift`, read only from the packaged app folder. Requests are checked to stay inside that folder, so a crafted path cannot read other files.
- **Content security policy.** Every response carries a policy that allows only the app's own files. The one inline script (which sets the theme before first paint) is allowed by its hash, not by a blanket `unsafe-inline` for scripts. Connections to other origins are blocked.
- **Navigation.** The window cannot navigate away from the app, and new windows are blocked. Links to https sites open in your default browser.
- **Permissions.** Only Bluetooth, notifications and screen wake lock are granted, and only to the app's own pages.
- **Messages.** The main process accepts messages only from the app's own pages and checks their contents.
- **Single instance.** A second launch focuses the first window.

## Releases

Windows installers and portable executables are built by `.github/workflows/release.yml` from the tagged source and attached to the GitHub Release. They are not code-signed, so Windows shows an unknown-publisher warning, and Windows 11 Smart App Control blocks unsigned apps it has no reputation data for. Code signing (for example Microsoft's Artifact Signing) would let Smart App Control run the app and show a publisher name; it may come later. The website is built and deployed by `.github/workflows/pages.yml`. Dependencies are pinned by `bun.lock`, and CI installs with `--frozen-lockfile`.

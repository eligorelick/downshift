# Security

## Reporting a vulnerability

Please do not open a public issue. Use **Report a vulnerability** under the repository's Security tab, which opens a private advisory with the maintainers.

## What Downshift touches

- **Bluetooth.** It scans for devices advertising the standard heart rate service and connects only to the strap the person has paired. It reads the heart rate measurement and writes nothing to the strap beyond subscribing to that measurement.
- **Files.** It reads and writes only under `%APPDATA%\Downshift`: settings, the session log, the Bluetooth log and an error log.
- **Registry.** If "Start with Windows" is switched on, it adds one value under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`. It reads the Windows theme and accent color.
- **Network.** None.

The Bluetooth log contains strap names and Bluetooth addresses. Remove them before sharing a log if that matters to you.

## Releases

Release executables are built by the workflow in `.github/workflows/release.yml` from the tagged source. They are not code-signed.

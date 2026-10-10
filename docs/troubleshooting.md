# Troubleshooting

## The strap is not in the list

- In the WHOOP app, open your device settings and turn on **Broadcast Heart Rate**. The strap may not be visible to other devices until this is on.
- Keep the strap within a few meters of the PC.
- Check that Bluetooth is on in Windows settings.
- The strap broadcasts to one device at a time. Disconnect it from bike computers, gym equipment or other apps first.

## The strap is listed as "Not broadcasting"

Downshift can see the strap but it is not offering heart rate. Turn Broadcast Heart Rate off and on again in the WHOOP app.

## It connects, then shows 0 bpm

Some straps send zeros until they have a good reading. Check the strap is snug, wait a minute, then toggle Broadcast Heart Rate.

## It keeps saying "Looking for" my strap

Open **Settings**, **General**, **Bluetooth log**. The log records each strap the app saw and why a connection failed. Lines to look for:

- `Saw "WHOOP ..."` means the strap is visible.
- `Connect failed` is followed by the reason Windows gave.
- `Bluetooth scan stopped: RadioNotAvailable` means Bluetooth is off or missing.

If the log does not make the cause clear, open an issue and attach it.

## The live reading does not match my WHOOP app

You have probably paired someone else's strap. On the Device page choose **Forget this strap**, then pair the one with the strongest signal while holding your wrist near the PC.

## There is no voice

- Check **Mute all sounds** is off and the volume is above zero.
- Use **Play sample** in Settings. If it says no voice is available, add one in Windows Settings under Time & language, Speech.

## Windows blocks the download or the first run

The executable is not code-signed. Choose **More info**, then **Run anyway**. You can also build it yourself; see the README.

## The nudge never appears

That is expected most of the time. It needs a study session, about 15 minutes to learn a baseline, and then a rise of about 15 bpm held for five minutes. Typical study stress is smaller than that. Settings, Heart rate nudge, **Show a preview** plays a sped-up example.

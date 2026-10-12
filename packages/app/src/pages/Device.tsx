import type { Scenario } from '@downshift/ble'
import { useEffect, useState } from 'react'
import { BtLogView } from '../components/BtLogView'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { SupportNotice } from '../components/SupportNotice'
import { refocusSoon } from '../components/useStageFocus'
import {
  type BluetoothChoice,
  chooseBluetoothDevice,
  onBluetoothDevices,
  rememberDevice,
} from '../platform/desktopBridge'
import {
  bluetoothSupport,
  connectBluetooth,
  disconnect,
  startDemo,
  useHeartRate,
  useLiveBpm,
} from '../state/hrStore'
import { updateSettings, useSettings } from '../state/settingsStore'
import '../styles/device.css'

const SCENARIOS: ReadonlyArray<{ value: Scenario; label: string }> = [
  { value: 'resting', label: 'Resting' },
  { value: 'stress-rise', label: 'Heart rate rising' },
  { value: 'workout-sets', label: 'Workout sets' },
]

const STATE_TEXT = {
  connected: 'Connected',
  disconnected: 'Not connected',
  requesting: 'Choose your device in the Bluetooth window',
  connecting: 'Connecting',
  reconnecting: 'Signal lost. Trying to reconnect',
  unsupported: 'Bluetooth is not available',
  error: 'Something went wrong',
} as const

export function Device() {
  const hr = useHeartRate()
  const { paired } = useSettings()
  const [scenario, setScenario] = useState<Scenario>('resting')
  const [choices, setChoices] = useState<BluetoothChoice[] | null>(null)
  const support = bluetoothSupport()

  // The desktop app lists nearby devices itself; we render them and hand the pick back.
  useEffect(() => onBluetoothDevices(setChoices), [])
  useEffect(() => {
    if (hr.state !== 'requesting') setChoices(null)
  }, [hr.state])

  const live = hr.state === 'connected'
  const busy = hr.state === 'requesting' || hr.state === 'connecting' || hr.state === 'reconnecting'
  const reading = useLiveBpm() !== null
  // The contact state belongs to the last reading, so it is only shown while that reading is live.
  const contactText = !live
    ? 'No reading'
    : hr.kind === 'simulated'
      ? 'Simulated reading, not from a device'
      : !reading && hr.lastAt !== null
        ? 'No signal from the device right now'
        : hr.contact === false
          ? 'Skin contact lost. Check the device fits snugly'
          : hr.contact === true
            ? 'Good skin contact'
            : hr.bpm !== null
              ? 'Device does not report skin contact'
              : 'Waiting for the first beat'

  // Forget and Disconnect can remove their own button, so focus is put back on the page afterwards.
  function forget() {
    updateSettings({ paired: null })
    rememberDevice(null)
    refocusSoon()
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Device</h1>
        <p>Connect a Bluetooth heart rate device, or try the demo.</p>
      </header>

      {!support.supported && <SupportNotice reason={support.reason} />}

      <Card title="Live reading">
        <div className="hr-hero">
          <span
            className="big num"
            role="img"
            aria-label={reading ? `${hr.bpm} beats per minute` : 'No reading'}
          >
            {reading ? hr.bpm : '--'}
          </span>
          <span className="unit">bpm</span>
        </div>
        <p className="device-contact" data-bad={reading && hr.contact === false} aria-live="polite">
          {contactText}
        </p>
        <p className="user-text" aria-live="polite">
          <strong>{live && hr.kind === 'simulated' ? 'Demo (simulated)' : STATE_TEXT[hr.state]}</strong>
          {hr.device && live && <span className="muted"> · {hr.device.name || 'Unnamed device'}</span>}
        </p>
        {/* Always mounted, so the reason behind an error is read out along with the state. */}
        <div aria-live="polite">
          {hr.detail && (hr.state === 'error' || hr.state === 'unsupported') && (
            <p className="muted">{hr.detail}</p>
          )}
        </div>
        {!live && paired && <p className="muted user-text">Last device: {paired.name || 'Unnamed device'}</p>}

        {choices && (
          <div className="chooser">
            <h3>Choose a device</h3>
            {choices.length === 0 ? (
              <p className="muted">Looking for devices nearby…</p>
            ) : (
              <ul>
                {choices.map((c) => (
                  <li key={c.id}>
                    <Button variant="secondary" block onClick={() => chooseBluetoothDevice(c.id)}>
                      {c.name || 'Unnamed device'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="row">
          {live || busy ? (
            <Button
              variant="secondary"
              onClick={() => {
                void disconnect()
                refocusSoon()
              }}
            >
              Disconnect
            </Button>
          ) : (
            support.supported && (
              <Button onClick={() => void connectBluetooth()}>Connect a heart rate device</Button>
            )
          )}
          {paired && (
            <Button variant="ghost" onClick={forget}>
              Forget this device
            </Button>
          )}
        </div>
      </Card>

      <Card title="Try demo data">
        <p className="muted">Simulated heart rate, so you can look around without a device.</p>
        <div className="row">
          <label className="select-field">
            <span className="sr-only">Demo scenario</span>
            <select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}>
              {SCENARIOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Button variant="secondary" onClick={() => void startDemo(scenario)}>
            Try demo data
          </Button>
        </div>
      </Card>

      <Card title="Setup">
        <p className="muted">
          Tested with WHOOP 5.0. Other devices are expected to work; please report what you find.
        </p>
        <div className="accordion">
          <details>
            <summary>WHOOP</summary>
            <ol>
              <li>
                In the WHOOP app, open Device settings and turn on HR Broadcast. Tested with WHOOP 5.0; WHOOP
                4.0 and MG are expected to work the same way.
              </li>
              <li>A device can usually send to only one app at a time, so close other apps that use it.</li>
              <li>
                For lifting, a chest strap is the safest choice: wrist sensors tend to read low, and arm bands
                haven't been validated for lifting.
              </li>
            </ol>
          </details>
          <details>
            <summary>Fitbit Charge 6, Google Fitbit Air and Pixel Watch</summary>
            <ol>
              <li>Fitbit Charge 6: swipe down from the clock face and tap HR on Equipment.</li>
              <li>
                Google Fitbit Air: in the Google Health app, open Connections, select your device, then choose
                Share heart rate and bring the Fitbit Air near your equipment.
              </li>
              <li>
                Pixel Watch 2 or newer: in quick settings, open Connected Fitness. If your computer can't see
                the watch, turn on Extended pairing there (Allow more devices).
              </li>
              <li>Google lists no other Fitbit models as able to share heart rate.</li>
            </ol>
          </details>
          <details>
            <summary>Chest or arm strap</summary>
            <ol>
              <li>Chest strap: wet the contact pads. Arm bands: wear snugly.</li>
              <li>Then choose it in the Bluetooth window.</li>
            </ol>
          </details>
          <details>
            <summary>Garmin</summary>
            <ol>
              <li>
                On the watch, turn on Broadcast Heart Rate, on models that broadcast over Bluetooth (the menu
                varies by model).
              </li>
              <li>Close Garmin Connect and other apps that connect to the watch, then connect here.</li>
            </ol>
          </details>
        </div>
      </Card>

      <Card title="Bluetooth log">
        <p className="muted">If connecting fails, copy this and include it when you ask for help.</p>
        <BtLogView />
      </Card>
    </div>
  )
}

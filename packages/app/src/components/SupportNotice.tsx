import type { UnsupportedReason } from '@downshift/ble'

const BLUEFY = 'https://apps.apple.com/app/id1492822055'

// Says why Bluetooth is unavailable and the one thing to do about it.
export function SupportNotice({ reason }: { reason: UnsupportedReason }) {
  return (
    <div className="notice" role="note">
      <strong>Bluetooth isn't available here</strong>
      {reason === 'ios' && (
        <>
          <p>
            Most iPhone browsers can't use Bluetooth. <strong>Bluefy</strong>, a free separate browser app,
            may work; Downshift has not been tested with it yet. Open this page in Bluefy instead.
          </p>
          <p>
            <a className="tap-link" href={BLUEFY} target="_blank" rel="noreferrer">
              Get Bluefy on the App Store
            </a>
          </p>
          <p>Keep the screen on while connected, or the connection can drop.</p>
        </>
      )}
      {(reason === 'firefox' || reason === 'safari' || reason === 'no-api') && (
        <p>
          This browser can't use Bluetooth. Use Chrome, Edge or the Downshift Windows app.
          {reason === 'no-api' && ' Make sure Bluetooth is turned on for this device.'}
          {reason === 'no-api' && ' On Linux, Chrome may need Web Bluetooth turned on in chrome://flags.'}
        </p>
      )}
      {reason === 'insecure' && (
        <p>Bluetooth only works on secure pages. Open the https:// address of this app.</p>
      )}
      <p className="muted">You can still try the demo data below.</p>
    </div>
  )
}

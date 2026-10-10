using System;

namespace Downshift
{
    enum StrapState { Unpaired, Searching, Connecting, Live, NoBluetooth }

    // A strap seen nearby while scanning.
    sealed class StrapCandidate
    {
        public ulong Address;
        public string Name = "";
        public int Rssi;          // signal strength in dBm; closer to zero is stronger
        public bool HeartRate;    // advertising the heart rate service, i.e. broadcasting
        public long SeenAt;
        public long HeartRateAt = long.MinValue / 4;   // when it was last heard broadcasting heart rate
    }

    // What the app needs from the Bluetooth side. Nothing here depends on Windows Bluetooth types,
    // so the app still starts (and says why) on a PC where those APIs are missing.
    interface IStrap
    {
        event Action<int> Reading;
        event Action Changed;
        event Action<string> Note;            // plain-language trace of what the Bluetooth side is doing
        event Action<StrapCandidate> Seen;    // a strap was heard nearby
        StrapState State { get; }
        string DeviceName { get; }
        string Problem { get; }
        ulong ConnectedAddress { get; }
        void SetTarget(ulong address, string name);   // the paired strap; zero and empty means none
        void SetDiscovery(bool on);                   // keep listing nearby straps, e.g. while the Device page is open
        void Start();
        void Stop();
        void Tick();
    }
}

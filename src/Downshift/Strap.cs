// Bluetooth side: lists nearby straps that broadcast heart rate, and connects only to the one the person paired.
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Storage.Streams;

namespace Downshift
{
    // A failure with a message worth showing to the person, and how long to wait before trying again.
    sealed class StrapException : Exception
    {
        public readonly int RetryMs;
        public StrapException(string message, int retryMs) : base(message) { RetryMs = retryMs; }
    }

    sealed class Strap : IStrap
    {
        // All events fire on background threads.
        public event Action<int> Reading;
        public event Action Changed;
        public event Action<string> Note;
        public event Action<StrapCandidate> Seen;

        volatile StrapState state = StrapState.Unpaired;
        volatile string deviceName = "";
        volatile string problem = "";
        public StrapState State { get { return state; } private set { state = value; } }
        public string DeviceName { get { return deviceName; } private set { deviceName = value; } }
        public string Problem { get { return problem; } private set { problem = value; } }
        public ulong ConnectedAddress { get; private set; }

        readonly object gate = new object();
        BluetoothLEAdvertisementWatcher watcher;
        bool watching;
        BluetoothLEDevice device;
        GattDeviceService service;
        GattCharacteristic characteristic;
        ulong targetAddress;
        string targetName = "";
        bool discovery;
        int busy;
        int generation;
        long lastReading, connectStarted, retryAt, radioRetryAt;
        volatile bool stopped = true;
        volatile bool firstPacket;
        readonly Dictionary<ulong, long> logged = new Dictionary<ulong, long>();
        readonly Dictionary<ulong, string> names = new Dictionary<ulong, string>();

        bool HasTarget { get { return targetAddress != 0 || targetName.Length > 0; } }

        void Say(string line)
        {
            Action<string> handler = Note;
            if (handler != null)
            {
                try { handler(line); } catch (Exception) { }
            }
        }

        void Raise()
        {
            Action handler = Changed;
            if (handler != null)
            {
                try { handler(); } catch (Exception) { }
            }
        }

        static string Describe(Exception ex)
        {
            return ex.GetType().Name + " 0x" + ex.HResult.ToString("X8") + ": " + ex.Message;
        }

        public void Start()
        {
            lock (gate)
            {
                stopped = false;
                if (State != StrapState.Live && State != StrapState.Connecting)
                    State = HasTarget ? StrapState.Searching : StrapState.Unpaired;
                UpdateWatcher();
            }
            Raise();
        }

        public void Stop()
        {
            lock (gate)
            {
                stopped = true;
                Disconnect();
                UpdateWatcher();
            }
        }

        public void SetTarget(ulong address, string name)
        {
            name = name ?? "";
            lock (gate)
            {
                if (address == targetAddress && name == targetName) return;
                targetAddress = address;
                targetName = name;
                // Stay connected only if the strap we are on is still the paired one.
                bool keep = State == StrapState.Live && Pairing.Matches(address, name, ConnectedAddress, DeviceName);
                if (!keep)
                {
                    Disconnect();
                    State = HasTarget ? StrapState.Searching : StrapState.Unpaired;
                    Problem = "";
                    Interlocked.Exchange(ref retryAt, 0);
                }
                UpdateWatcher();
            }
            Say(HasTarget ? "Paired strap set to \"" + name + "\" [" + address.ToString("X12") + "]." : "No strap is paired.");
            Raise();
        }

        public void SetDiscovery(bool on)
        {
            lock (gate)
            {
                discovery = on;
                UpdateWatcher();
            }
        }

        // Call about once a second.
        public void Tick()
        {
            if (stopped) return;
            long now = Clock.Now();
            bool changed = false;
            lock (gate)
            {
                if (State == StrapState.Live && now - Interlocked.Read(ref lastReading) > 15000)
                {
                    Say("No readings for 15 seconds. Searching again.");
                    Disconnect();
                    Problem = "Lost the strap. Looking for it again.";
                    State = StrapState.Searching;
                    changed = true;
                }
                else if (State == StrapState.Connecting && now - Interlocked.Read(ref connectStarted) > 30000)
                {
                    Say("Connecting took more than 30 seconds. Searching again.");
                    Disconnect();
                    Problem = "Connecting took too long. Trying again.";
                    State = StrapState.Searching;
                    changed = true;
                }
                else if (State == StrapState.NoBluetooth && now >= radioRetryAt)
                {
                    State = HasTarget ? StrapState.Searching : StrapState.Unpaired;
                    changed = true;
                }
                UpdateWatcher();
            }
            if (changed) Raise();
        }

        // The scan runs while we are looking for the paired strap, or while the Device page wants a list.
        // Caller holds the gate.
        void UpdateWatcher()
        {
            bool want = !stopped && State != StrapState.NoBluetooth &&
                        (discovery || (HasTarget && State == StrapState.Searching));
            if (want == watching) return;
            if (want)
            {
                try
                {
                    var w = new BluetoothLEAdvertisementWatcher();
                    w.ScanningMode = BluetoothLEScanningMode.Active;
                    w.Received += OnAdvert;
                    w.Stopped += OnStopped;
                    watcher = w;
                    w.Start();
                    watching = true;
                    lock (logged) logged.Clear();
                    Say("Scanning for straps that are broadcasting heart rate.");
                }
                catch (Exception ex)
                {
                    Say("Could not start a Bluetooth scan: " + Describe(ex));
                    watcher = null;
                    watching = false;
                    State = StrapState.NoBluetooth;
                    radioRetryAt = Clock.Now() + 10000;
                }
            }
            else
            {
                BluetoothLEAdvertisementWatcher w = watcher;
                watcher = null;
                watching = false;
                if (w != null)
                {
                    try { w.Received -= OnAdvert; } catch (Exception) { }
                    try { w.Stopped -= OnStopped; } catch (Exception) { }
                    try { w.Stop(); } catch (Exception) { }
                }
            }
        }

        void OnStopped(BluetoothLEAdvertisementWatcher sender, BluetoothLEAdvertisementWatcherStoppedEventArgs args)
        {
            if (args.Error == BluetoothError.Success) return;
            // Bluetooth is off, missing, or was just turned off.
            Say("Bluetooth scan stopped: " + args.Error + ".");
            lock (gate)
            {
                watcher = null;
                watching = false;
                if (State != StrapState.Live && State != StrapState.Connecting) State = StrapState.NoBluetooth;
                radioRetryAt = Clock.Now() + 10000;
            }
            Raise();
        }

        void OnAdvert(BluetoothLEAdvertisementWatcher sender, BluetoothLEAdvertisementReceivedEventArgs args)
        {
            string name = "";
            bool heartRate = false;
            try
            {
                name = args.Advertisement.LocalName ?? "";
                foreach (Guid uuid in args.Advertisement.ServiceUuids)
                    if (uuid == GattServiceUuids.HeartRate) { heartRate = true; break; }
            }
            catch (Exception) { return; }

            ulong address = args.BluetoothAddress;
            // A strap's name and its service list can arrive in separate packets; remember the name per address.
            lock (names)
            {
                if (name.Length > 0) names[address] = name;
                else if (!names.TryGetValue(address, out name)) name = "";
                if (names.Count > 400) names.Clear();
            }

            bool whoop = name.IndexOf("WHOOP", StringComparison.OrdinalIgnoreCase) >= 0;
            ulong wantAddress; string wantName;
            lock (gate) { wantAddress = targetAddress; wantName = targetName; }
            bool ours = Pairing.Matches(wantAddress, wantName, address, name);
            if (!heartRate && !whoop && !ours) return;

            long now = Clock.Now();
            bool firstTime;
            lock (logged)
            {
                firstTime = !logged.ContainsKey(address);
                if (firstTime && logged.Count < 60) logged[address] = now;
            }
            if (firstTime)
                Say("Saw " + (name.Length > 0 ? "\"" + name + "\"" : "an unnamed device") + " [" + address.ToString("X12") +
                    "], heart rate " + (heartRate ? "broadcast on" : "not broadcast") + ", signal " + args.RawSignalStrengthInDBm + " dBm" +
                    (ours ? ", the paired strap." : "."));

            Action<StrapCandidate> seen = Seen;
            if (seen != null)
            {
                try { seen(new StrapCandidate { Address = address, Name = name, Rssi = args.RawSignalStrengthInDBm, HeartRate = heartRate, SeenAt = now }); }
                catch (Exception) { }
            }

            // Only ever connect to the paired strap.
            if (!ours || State != StrapState.Searching || now < Interlocked.Read(ref retryAt)) return;
            if (Interlocked.CompareExchange(ref busy, 1, 0) != 0) return;
            int mine = generation;
            try
            {
                Task ignored = ConnectAsync(address, name, mine);
            }
            catch (Exception ex)
            {
                // A PC whose .NET can't await Windows Bluetooth calls fails here rather than inside ConnectAsync.
                Say("Could not begin connecting: " + Describe(ex));
                Problem = "This PC couldn't start the Bluetooth connection. Details are in the Bluetooth log.";
                Interlocked.Exchange(ref retryAt, Clock.Now() + 30000);
                Interlocked.Exchange(ref busy, 0);
                Raise();
            }
        }

        async Task ConnectAsync(ulong address, string advertisedName, int mine)
        {
            BluetoothLEDevice dev = null;
            GattDeviceService svc = null;
            try
            {
                State = StrapState.Connecting;
                DeviceName = advertisedName;
                Interlocked.Exchange(ref connectStarted, Clock.Now());
                Say("Connecting to [" + address.ToString("X12") + "].");
                Raise();

                dev = await BluetoothLEDevice.FromBluetoothAddressAsync(address);
                if (dev == null) throw new StrapException("The strap went out of range.", 4000);
                if (mine != generation) { dev.Dispose(); return; }
                if (advertisedName.Length == 0 && !string.IsNullOrEmpty(dev.Name)) DeviceName = dev.Name;

                GattDeviceServicesResult services = await dev.GetGattServicesForUuidAsync(GattServiceUuids.HeartRate, BluetoothCacheMode.Uncached);
                if (mine != generation) { dev.Dispose(); return; }
                if (services.Status == GattCommunicationStatus.AccessDenied)
                    throw new StrapException("Windows blocked access to the strap. Check Bluetooth privacy settings.", 15000);
                if (services.Status != GattCommunicationStatus.Success)
                    throw new StrapException("Couldn't reach the strap (" + services.Status + "). Keep it within a few meters.", 4000);
                if (services.Services.Count == 0)
                    throw new StrapException("Found your strap, but it isn't sharing heart rate. Turn on Broadcast Heart Rate in the WHOOP app.", 15000);
                svc = services.Services[0];

                GattCharacteristicsResult chars = await svc.GetCharacteristicsForUuidAsync(GattCharacteristicUuids.HeartRateMeasurement, BluetoothCacheMode.Uncached);
                if (mine != generation) { svc.Dispose(); dev.Dispose(); return; }
                if (chars.Status != GattCommunicationStatus.Success || chars.Characteristics.Count == 0)
                    throw new StrapException("The strap didn't offer a heart rate reading (" + chars.Status + "). Turn Broadcast Heart Rate off and on.", 8000);
                GattCharacteristic ch = chars.Characteristics[0];

                firstPacket = true;
                ch.ValueChanged += OnValue;
                GattCommunicationStatus status = await ch.WriteClientCharacteristicConfigurationDescriptorAsync(
                    GattClientCharacteristicConfigurationDescriptorValue.Notify);
                if (mine != generation || status != GattCommunicationStatus.Success)
                {
                    try { ch.ValueChanged -= OnValue; } catch (Exception) { }
                    if (mine != generation) { svc.Dispose(); dev.Dispose(); return; }
                    throw new StrapException("The strap refused to share (" + status + "). It shares with one device at a time, so disconnect it elsewhere.", 8000);
                }

                lock (gate)
                {
                    if (mine != generation)
                    {
                        try { ch.ValueChanged -= OnValue; } catch (Exception) { }
                        svc.Dispose(); dev.Dispose();
                        return;
                    }
                    device = dev; service = svc; characteristic = ch;
                    ConnectedAddress = address;
                    Interlocked.Exchange(ref lastReading, Clock.Now());
                    Problem = "";
                    State = StrapState.Live;
                    Interlocked.Exchange(ref busy, 0);
                    UpdateWatcher();
                }
                Say("Subscribed to heart rate from \"" + DeviceName + "\".");
                Raise();
            }
            catch (Exception ex)
            {
                try { if (svc != null) svc.Dispose(); } catch (Exception) { }
                try { if (dev != null) dev.Dispose(); } catch (Exception) { }
                if (mine != generation) return;
                Say("Connect failed: " + Describe(ex));
                var known = ex as StrapException;
                lock (gate)
                {
                    Problem = known != null ? known.Message : "Couldn't connect to the strap. Trying again.";
                    State = StrapState.Searching;
                    Interlocked.Exchange(ref retryAt, Clock.Now() + (known != null ? known.RetryMs : 4000));
                    Interlocked.Exchange(ref busy, 0);
                    UpdateWatcher();
                }
                Raise();
            }
        }

        void OnValue(GattCharacteristic sender, GattValueChangedEventArgs args)
        {
            try
            {
                DataReader reader = DataReader.FromBuffer(args.CharacteristicValue);
                var data = new byte[reader.UnconsumedBufferLength];
                reader.ReadBytes(data);
                if (firstPacket)
                {
                    firstPacket = false;
                    Say("First packet: " + BitConverter.ToString(data) + ".");
                }
                int bpm;
                if (!HeartRatePacket.TryParse(data, out bpm)) return;
                Interlocked.Exchange(ref lastReading, Clock.Now());
                Action<int> handler = Reading;
                if (handler != null) handler(bpm);
            }
            catch (Exception) { }
        }

        // Drops any connection and abandons any connection attempt. Caller holds the gate.
        void Disconnect()
        {
            generation++;
            try { if (characteristic != null) characteristic.ValueChanged -= OnValue; } catch (Exception) { }
            characteristic = null;
            try { if (service != null) service.Dispose(); } catch (Exception) { }
            service = null;
            try { if (device != null) device.Dispose(); } catch (Exception) { }
            device = null;
            ConnectedAddress = 0;
            Interlocked.Exchange(ref busy, 0);
        }
    }
}

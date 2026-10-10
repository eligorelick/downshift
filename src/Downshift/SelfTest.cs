#if SELFTEST
// Only in test builds. Stands in for a real strap, then drives every screen by itself: pairing, the main
// window's pages, a demo nudge, a breathing session and a study block. It jumps the clock where a real
// session would take half an hour, and prints "-- shot NAME" when a screen is ready to be photographed.
using System;
using System.Collections.Generic;
using System.IO;
using System.Windows.Forms;

namespace Downshift
{
    // Three straps in range; the paired one connects after two seconds and then reports a heart rate.
    sealed class FakeStrap : IStrap
    {
        public event Action<int> Reading;
        public event Action Changed;
        public event Action<string> Note;
        public event Action<StrapCandidate> Seen;
        public StrapState State { get; private set; }
        public string DeviceName { get; private set; }
        public string Problem { get; private set; }
        public ulong ConnectedAddress { get; private set; }
        ulong target; string targetName = ""; bool discovery; int sinceTarget; readonly Random random = new Random(7);

        static readonly StrapCandidate[] Nearby =
        {
            new StrapCandidate { Address = 0xD4A1C09E3B5FUL, Name = "WHOOP 4C0934521", Rssi = -48, HeartRate = true },
            new StrapCandidate { Address = 0xE81F2A77C0D2UL, Name = "WHOOP 4A0711388", Rssi = -79, HeartRate = false },
            new StrapCandidate { Address = 0xC6330B5A91E4UL, Name = "Polar H10 9A3B2C1D", Rssi = -66, HeartRate = true }
        };

        public FakeStrap() { DeviceName = ""; Problem = ""; State = StrapState.Unpaired; }
        public void Start() { if (Note != null) Note("Test strap in use."); }
        public void Stop() { }
        public void SetDiscovery(bool on) { discovery = on; }

        public void SetTarget(ulong address, string name)
        {
            target = address; targetName = name ?? ""; sinceTarget = 0;
            State = address != 0 || targetName.Length > 0 ? StrapState.Searching : StrapState.Unpaired;
            ConnectedAddress = 0;
            if (Changed != null) Changed();
        }

        public void Tick()
        {
            long now = Clock.Now();
            if (discovery && Seen != null)
                foreach (StrapCandidate c in Nearby)
                    Seen(new StrapCandidate { Address = c.Address, Name = c.Name, Rssi = c.Rssi + random.Next(-2, 3), HeartRate = c.HeartRate, SeenAt = now });
            if (State == StrapState.Searching && ++sinceTarget >= 2)
            {
                State = StrapState.Live; DeviceName = targetName; ConnectedAddress = target;
                if (Changed != null) Changed();
            }
            if (State == StrapState.Live && Reading != null) Reading(71 + random.Next(-2, 3));
        }
    }

    sealed partial class TrayApp
    {
        partial void TestSessionSeconds(ref double seconds) { seconds = 20; }
        partial void TestStrap(ref IStrap s) { s = new FakeStrap(); }

        partial void BeginSelfTest()
        {
            int n = 0, step = 0, mark = 0;
            Action<string> say = delegate(string s) { Console.WriteLine("-- " + s); };
            Action<string> shot = delegate(string name) { Console.WriteLine("-- shot " + name); };
            Func<string, bool> press = delegate(string label)
            {
                bool ok = card.Press(label);
                Console.WriteLine("-- press [" + label + "] " + (ok ? "ok" : "NOT FOUND"));
                return ok;
            };
            Action<int> next = null;
            var t = new Timer { Interval = 1000 };
            next = delegate(int to) { step = to; mark = n; };
            t.Tick += delegate
            {
                n++;
                string shown = card.Mode == CardMode.Guide ? card.Cue + " | " + card.Count + " | " + card.Sub
                             : card.Mode == CardMode.Message ? card.Title + " | " + card.Body
                             : card.BigText + " | " + card.Line1 + " | " + card.Line2;
                Console.WriteLine(n + "s " + card.Mode + "/" + ask + (card.Visible ? "" : " (hidden)") + " " + shown);

                int since = n - mark;
                switch (step)
                {
                    case 0: if (n == 3) { say("main visible=" + (main != null && main.Visible)); shot("device-unpaired"); next(1); } break;
                    case 1:
                        if (since == 3)
                        {
                            DeviceInfo d = Device();
                            say("nearby: " + d.Nearby.Count + ", scan: " + d.ScanState);
                            if (d.Nearby.Count > 0) PairWith(d.Nearby[0]);
                            next(2);
                        }
                        break;
                    case 2: if (since == 4) { say("device: " + Device().PairedTitle + " | " + Device().PairedDetail); shot("device-paired"); next(3); } break;
                    case 3: if (since == 3) { main.Go(Nav.Home); next(4); } break;
                    case 4: if (since == 2) { HomeInfo h = Home(); say("home: " + h.Bpm + " | " + h.DeviceLine + " | " + h.Today); shot("home"); next(5); } break;
                    case 5: if (since == 3) { StartStudy(); next(6); } break;
                    case 6: if (since == 2) { say("home: " + Home().StudyTitle + " | " + Home().NudgeLine); shot("home-studying"); next(7); } break;
                    case 7: if (since == 3) { EndStudy(); main.Go(Nav.Settings); next(8); } break;
                    case 8: if (since == 2) { shot("settings-1"); next(9); } break;
                    case 9: if (since == 3) { main.TestScroll(560); next(10); } break;
                    case 10: if (since == 2) { shot("settings-2"); next(11); } break;
                    case 11: if (since == 3) { main.TestScroll(1180); next(12); } break;
                    case 12: if (since == 2) { shot("settings-3"); next(13); } break;
                    case 13: if (since == 3) { main.Go(Nav.Evidence); next(14); } break;
                    case 14: if (since == 2) { shot("evidence"); next(15); } break;
                    case 15: if (since == 3) { main.Hide(); ShowStatus(0); next(16); } break;
                    case 16: if (since == 2) { shot("card-status"); next(17); } break;
                    case 17: if (since == 3) { say("start demo"); StartDemo(); next(18); } break;
                    case 18: if (ask == Ask.Tense) { shot("card-tense"); next(19); } break;
                    case 19: if (since == 3) { press("4"); next(20); } break;
                    case 20: if (ask == Ask.Intro && since >= 1) { shot("card-intro"); next(21); } break;
                    case 21: if (since == 3) { press("Start"); next(22); } break;
                    case 22: if (since == 8) { shot("card-guide-in"); next(23); } break;
                    case 23: if (since == 5) { shot("card-guide-out"); next(24); } break;
                    case 24: if (ask == Ask.RateAfter) { shot("card-after"); next(25); } break;
                    case 25: if (since == 3) { press("2"); next(26); } break;
                    case 26: if (since == 1) { shot("card-info"); next(27); } break;
                    case 27: if (since == 6) { say("start study session"); StartStudy(); next(28); } break;
                    case 28: if (since == 3) { say("jump 22 min 58 s"); timeSkew += 22 * 60000 + 58000; next(29); } break;
                    case 29: if (ask == Ask.HeadsUp) { shot("card-headsup"); next(30); } break;
                    case 30: if (since == 3) { say("jump 2 min"); timeSkew += 120000; next(31); } break;
                    case 31: if (ask == Ask.BreakDue) { note = "Problem 4, part b"; ShowBreakDue(); shot("card-breakdue"); next(32); } break;
                    case 32: if (since == 3) { press("Start break"); next(33); } break;
                    case 33: if (since == 1) { shot("card-onbreak"); next(34); } break;
                    case 34: if (since == 3) { say("jump 5 min"); timeSkew += 5 * 60000; next(35); } break;
                    case 35: if (ask == Ask.BackToWork) { shot("card-back"); next(36); } break;
                    case 36: if (since == 3) { press("Start next block"); next(37); } break;
                    case 37: if (since == 2) { ShowStatus(0); next(38); } break;
                    case 38: if (since == 2) { shot("card-status-studying"); next(39); } break;
                    case 39: if (since == 3) { BreatheNow(5); next(40); } break;
                    case 40: if (since == 1) { shot("card-before"); next(41); } break;
                    case 41: if (since == 3) { press("Cancel"); EndStudy(); next(42); } break;
                    case 42:
                        if (since == 3)
                        {
                            say("settings file:");
                            try { Console.WriteLine(File.ReadAllText(SettingsPath)); } catch (Exception ex) { Console.WriteLine(ex.Message); }
                            say("log file:");
                            try { Console.WriteLine(File.ReadAllText(LogPath)); } catch (Exception ex) { Console.WriteLine(ex.Message); }
                            say("quitting");
                            t.Stop();
                            Quit();
                        }
                        break;
                }
            };
            t.Start();
        }
    }
}
#endif

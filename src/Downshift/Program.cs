// Downshift: runs study blocks and breaks, reads a paired WHOOP's heart rate, and guides slow breathing.
// It lives by the clock in the taskbar, with a main window for pairing and settings and a small box for prompts.
// What it does and why is set out in Evidence.cs (the Evidence page).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Globalization;
using System.IO;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;
using WinTimer = System.Windows.Forms.Timer;

namespace Downshift
{
    static class Program
    {
        public static readonly string DataDir =
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Downshift");

        [STAThread]
        static void Main()
        {
            bool first;
            using (new Mutex(true, "Downshift.SingleInstance.5b0f6d", out first))
            {
                if (!first)
                {
                    MessageBox.Show("Downshift is already running. Look for its icon near the clock.", "Downshift");
                    return;
                }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                Application.ThreadException += delegate(object s, ThreadExceptionEventArgs e) { LogError(e.Exception); };
                AppDomain.CurrentDomain.UnhandledException += delegate(object s, UnhandledExceptionEventArgs e) { LogError(e.ExceptionObject as Exception); };
                Application.Run(new TrayApp());
            }
        }

        public static void LogError(Exception ex)
        {
            try
            {
                Directory.CreateDirectory(DataDir);
                File.AppendAllText(Path.Combine(DataDir, "error.log"),
                    DateTime.Now.ToString("s", CultureInfo.InvariantCulture) + " " + ex + Environment.NewLine);
            }
            catch (Exception) { }
        }
    }

    // What the card is currently asking or telling, when it is not showing status or the breathing guide.
    enum Ask { None, Tense, High, RateBefore, RateAfter, Intro, HeadsUp, BreakDue, OnBreak, BackToWork, Info }

    // What the Home page shows.
    sealed class HomeInfo
    {
        public string Bpm = "--", DeviceLine = "";
        public bool DeviceGood, DeviceTrying;
        public string StudyTitle = "", StudyDetail = "";
        public bool Studying, CanBreak;
        public string PatternName = "", PatternNote = "";
        public int PatternMinutes;
        public string NudgeLine = "";
        public bool NudgeOff, NudgePaused;
        public string Today = "";
    }

    // What the Device page shows.
    sealed class DeviceInfo
    {
        public bool HasPaired;
        public string PairedTitle = "", PairedDetail = "", ScanState = "";
        public List<StrapCandidate> Nearby = new List<StrapCandidate>();
    }

    sealed partial class TrayApp : ApplicationContext
    {
        const string RunKey = @"Software\Microsoft\Windows\CurrentVersion\Run";
        const string LogHeader = "time,event,tension_before,tension_after,hr_before,hr_after,technique,seconds,detail";
        static readonly string SettingsPath = Path.Combine(Program.DataDir, "settings.ini");
        static readonly string LogPath = Path.Combine(Program.DataDir, "downshift-log.csv");
        static readonly string TroublePath = Path.Combine(Program.DataDir, "bluetooth-log.txt");
        static readonly object troubleGate = new object();

        readonly Settings settings;
        readonly NudgeDetector detector;
        readonly StudyClock study;
        readonly Card card;
        readonly NotifyIcon tray;
        readonly WinTimer frameTimer, secondTimer;
        IStrap strap;   // the real one touches Windows Bluetooth types, so it is only ever named inside StartStrapCore
        bool bluetoothUnsupported;
        MainForm main;
        NoteForm noteForm;

        // Live heart rate
        int lastBpm;
        long lastSampleAt = -100000, lastZeroAt = -100000;
        readonly Dictionary<ulong, StrapCandidate> candidates = new Dictionary<ulong, StrapCandidate>();

        // The card
        Ask ask = Ask.None;
        long askAt, askTimeoutMs, statusHideAt;
        string askDetail = "";
        sealed class Pending { public Action Show; public long Deadline; }
        readonly List<Pending> pending = new List<Pending>();

        // Heart rate nudge
        long lastNudgeAt = NudgeDetector.Never, lastHighAt = NudgeDetector.Never, nudgePausedUntil;
        bool pausedIndefinitely;

        // Breathing session
        bool sActive;
        string sTrigger = "manual";
        BreathPattern sPattern = Breath.All[0];
        double sLeadIn, sDuration, sTotal;
        long sStartAt;
        string sLastKey;
        int sMinutes = 5;
        int? sStartBpm, sEndBpm, tensionBefore;

        // Study session
        string note = "";
        long talliedMs;
        int talliedBlocks;

        // Demo: a second detector fed simulated readings at 30 times real speed.
        const int DemoSpeed = 30;
        bool demoOn, demoPrompted;
        NudgeDetector demoDetector;
        long demoT;
        int demoBpm;
        readonly Random random = new Random();

#pragma warning disable 0649
        long timeSkew;   // test builds jump the clock forward with this
#pragma warning restore 0649

        ToolStripMenuItem miHeader, miStart, miEnd, miBreak, miMute, miPause, miResume;
        string trayKey = "";
        Icon trayIcon;

        long Now() { return Clock.Now() + timeSkew; }

        internal Settings Settings { get { return settings; } }

        public TrayApp()
        {
            try { Directory.CreateDirectory(Program.DataDir); } catch (Exception) { }
            settings = LoadSettings();
            settings.Today(DayKey());
            Sound.Config = settings;
            Theme.Refresh();
            detector = new NudgeDetector(settings);
            study = new StudyClock(settings);

            card = new Card();
            card.CloseClicked = OnCardClose;
            IntPtr force = card.Handle;   // so background threads can post to the UI before the card is first shown

            tray = new NotifyIcon { Text = "Downshift", ContextMenuStrip = BuildMenu() };
            try { tray.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch (Exception) { }
            if (tray.Icon == null) tray.Icon = SystemIcons.Application;
            tray.MouseClick += delegate(object s, MouseEventArgs e) { if (e.Button == MouseButtons.Left) ToggleStatus(); };
            tray.MouseDoubleClick += delegate(object s, MouseEventArgs e)
            {
                if (e.Button != MouseButtons.Left) return;
                // The first click of the pair opened the status box; the window replaces it.
                if (card.Visible && card.Mode == CardMode.Status && ask == Ask.None) { card.Hide(); statusHideAt = 0; }
                OpenMain(Nav.Home);
            };
            UpdateTray();
            tray.Visible = true;

            frameTimer = new WinTimer { Interval = 33 };
            frameTimer.Tick += delegate { SessionTick(); };
            secondTimer = new WinTimer { Interval = 1000 };
            secondTimer.Tick += delegate { SecondTick(); };
            secondTimer.Start();

            ApplyMonitoring(NudgeDetector.SettleStartMin);
            StartStrap();

            if (!settings.Welcomed)
            {
                // First run: open on the Device page, because nothing connects until a strap has been chosen.
                settings.Welcomed = true;
                SaveSettings();
                OpenMain(settings.HasPairedStrap ? Nav.Home : Nav.Device);
            }
            else ShowStatus(20000);
            BeginSelfTest();
        }

        partial void BeginSelfTest();
        partial void TestSessionSeconds(ref double seconds);
        partial void TestStrap(ref IStrap s);

        /* ---------- main window ---------- */

        internal void OpenMain(Nav page)
        {
            try
            {
                if (main == null || main.IsDisposed) main = new MainForm(this);
                main.Go(page);
                if (!main.Visible) main.Show();
                if (main.WindowState == FormWindowState.Minimized) main.WindowState = FormWindowState.Normal;
                main.Activate();
            }
            catch (Exception ex) { Program.LogError(ex); }
        }

        // A setting was changed in the window: save it and apply it everywhere.
        internal void SettingsChanged()
        {
            settings.Normalize();
            SaveSettings();
            Voice.Apply();
            ApplyMonitoring(NudgeDetector.SettleStartMin);
            if (miMute != null) miMute.Checked = settings.Mute;
            RefreshStatusIfShown();
        }

        internal void RestoreDefaults()
        {
            settings.ResetPreferences();
            SettingsChanged();
        }

        /* ---------- strap ---------- */

        void StartStrap()
        {
            IStrap test = null;
            TestStrap(ref test);
            if (test != null) { Attach(test); return; }
            try { StartStrapCore(); }
            catch (Exception ex)
            {
                // Windows older than 10, or a build without the Bluetooth APIs.
                bluetoothUnsupported = true;
                strap = null;
                Trouble("Bluetooth heart rate is not available on this PC: " + ex.GetType().Name + ": " + ex.Message);
            }
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        void StartStrapCore()
        {
            Attach(new Strap());
        }

        void Attach(IStrap s)
        {
            s.Reading += delegate(int bpm) { Post(delegate { HandleSample(bpm); }); };
            s.Changed += delegate { Post(OnStrapChanged); };
            s.Seen += delegate(StrapCandidate c) { Post(delegate { OnSeen(c); }); };
            s.Note += Trouble;
            strap = s;
            s.SetTarget(settings.PairedAddress, settings.PairedName);
            s.Start();
        }

        // Called from background threads. Keeps a short plain-text trace for when connecting goes wrong.
        static void Trouble(string line)
        {
            try
            {
                lock (troubleGate)
                {
                    var info = new FileInfo(TroublePath);
                    if (info.Exists && info.Length > 256 * 1024) info.Delete();
                    File.AppendAllText(TroublePath, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) + "  " + line + Environment.NewLine);
                }
            }
            catch (Exception) { }
        }

        void Post(Action action)
        {
            try { if (card.IsHandleCreated && !card.IsDisposed) card.BeginInvoke(action); }
            catch (Exception) { }
        }

        void OnStrapChanged()
        {
            if (strap == null) return;
            if (strap.State == StrapState.Live)
            {
                // The strap was recognised by name at a new address, or was paired before names were stored: fill in the gap.
                bool changed = false;
                if (strap.ConnectedAddress != 0 && strap.ConnectedAddress != settings.PairedAddress) { settings.PairedAddress = strap.ConnectedAddress; changed = true; }
                if (settings.PairedName.Length == 0 && !string.IsNullOrEmpty(strap.DeviceName)) { settings.PairedName = strap.DeviceName; changed = true; }
                if (changed)
                {
                    SaveSettings();
                    strap.SetTarget(settings.PairedAddress, settings.PairedName);
                }
                if (card.Visible && card.Mode == CardMode.Status && statusHideAt != 0) statusHideAt = Now() + 8000;
            }
            UpdateTray();
            RefreshStatusIfShown();
        }

        void OnSeen(StrapCandidate c)
        {
            StrapCandidate known;
            if (!candidates.TryGetValue(c.Address, out known))
            {
                if (candidates.Count > 200) candidates.Clear();
                known = new StrapCandidate { Address = c.Address };
                candidates[c.Address] = known;
            }
            if (c.Name.Length > 0) known.Name = c.Name;
            known.Rssi = c.Rssi;
            known.SeenAt = c.SeenAt;
            if (c.HeartRate) known.HeartRateAt = c.SeenAt;
        }

        internal void SetDiscovery(bool on)
        {
            if (strap != null)
            {
                try { strap.SetDiscovery(on); } catch (Exception) { }
            }
        }

        internal bool IsPaired(StrapCandidate c)
        {
            return Pairing.Matches(settings.PairedAddress, settings.PairedName, c.Address, c.Name);
        }

        internal void PairWith(StrapCandidate c)
        {
            settings.PairedAddress = c.Address;
            settings.PairedName = c.Name ?? "";
            SaveSettings();
            lastSampleAt = -100000;   // readings from the previous strap are no longer ours
            detector.Reset();
            ApplyMonitoring(NudgeDetector.SettleStartMin);
            if (strap != null) strap.SetTarget(settings.PairedAddress, settings.PairedName);
            UpdateTray();
            RefreshStatusIfShown();
        }

        internal void ForgetStrap()
        {
            settings.PairedAddress = 0;
            settings.PairedName = "";
            SaveSettings();
            lastSampleAt = -100000;
            if (strap != null) strap.SetTarget(0, "");
            UpdateTray();
            RefreshStatusIfShown();
        }

        string PairedLabel()
        {
            if (settings.PairedName.Length > 0) return settings.PairedName;
            return settings.PairedAddress != 0 ? "Strap " + Pairing.ShortId(settings.PairedAddress) : "your strap";
        }

        internal DeviceInfo Device()
        {
            long now = Clock.Now();
            var d = new DeviceInfo();
            d.HasPaired = settings.HasPairedStrap;
            d.PairedTitle = d.HasPaired ? PairedLabel() : "No strap paired";
            StrapState state = strap == null ? StrapState.Unpaired : strap.State;
            if (bluetoothUnsupported || strap == null)
                d.PairedDetail = "This PC can't read Bluetooth heart rate. That needs Windows 10 or 11 with Bluetooth.";
            else if (!d.HasPaired)
                d.PairedDetail = "Choose your strap from the list below.";
            else if (state == StrapState.Live && Now() - lastSampleAt < 10000)
                d.PairedDetail = "Connected. Live reading: " + lastBpm + " bpm. Check that this matches the heart rate in your WHOOP app. If it doesn't, this is someone else's strap.";
            else if (state == StrapState.Live)
                d.PairedDetail = Now() - lastZeroAt < 10000
                    ? "Connected, but the strap is sending 0 bpm. Check it's snug, or turn Broadcast Heart Rate off and on."
                    : "Connected. Waiting for the first heartbeat.";
            else if (state == StrapState.Connecting) d.PairedDetail = "Connecting.";
            else if (state == StrapState.NoBluetooth) d.PairedDetail = "Bluetooth is off. Turn it on in Windows settings.";
            else d.PairedDetail = !string.IsNullOrEmpty(strap.Problem) ? strap.Problem
                : "Looking for it. In the WHOOP app, turn on Broadcast Heart Rate, and keep the strap near this PC.";

            foreach (StrapCandidate c in candidates.Values)
            {
                if (now - c.SeenAt > 20000) continue;
                c.HeartRate = now - c.HeartRateAt < 12000;
                d.Nearby.Add(c);
            }
            d.Nearby.Sort(delegate(StrapCandidate a, StrapCandidate b) { return b.Rssi.CompareTo(a.Rssi); });
            d.ScanState = bluetoothUnsupported || strap == null ? "Bluetooth isn't available on this PC."
                : state == StrapState.NoBluetooth ? "Bluetooth is off."
                : d.Nearby.Count == 0 ? "Scanning. Nothing found yet."
                : "Scanning. " + d.Nearby.Count + " found.";
            return d;
        }

        void HandleSample(int bpm)
        {
            long now = Now();
            NudgeState v = detector.Push(now, bpm);
            if (!v.Valid) { lastZeroAt = now; return; }
            lastBpm = bpm;
            lastSampleAt = now;
            if (!demoOn && v.Due != Due.None) OnDue(v.Due, v, false);
            UpdateTray();
            RefreshStatusIfShown();
        }

        bool Fresh(long now) { return demoOn || now - lastSampleAt < 10000; }

        int? CurrentBpm()
        {
            if (demoOn) return demoBpm;
            return Now() - lastSampleAt < 6000 ? (int?)lastBpm : null;
        }

        NudgeState State { get { return demoOn && demoDetector != null ? demoDetector.Last : detector.Last; } }

        static int DayKey() { DateTime d = DateTime.Now; return d.Year * 10000 + d.Month * 100 + d.Day; }

        /* ---------- heart rate nudge ---------- */

        // Counting toward a nudge only runs while the person is expected to be sitting: during work blocks by
        // default, or whenever the app runs if they chose that. Breaks are always left out.
        void ApplyMonitoring(int settleMinutes)
        {
            bool onBreak = study.Phase == StudyPhase.Break || study.Phase == StudyPhase.BackDue;
            bool inWork = study.Phase == StudyPhase.Work || study.Phase == StudyPhase.BreakDue;
            bool want = settings.NudgeMode == "always" ? !onBreak : (settings.NudgeMode == "study" && inWork);
            if (want && !detector.Monitoring) detector.StartMonitoring(Now(), settleMinutes);
            else if (!want && detector.Monitoring) detector.StopMonitoring();
        }

        bool BusyWithBreathing()
        {
            return sActive || ask == Ask.RateBefore || ask == Ask.RateAfter || ask == Ask.Intro || ask == Ask.Tense || ask == Ask.High;
        }

        void OnDue(Due due, NudgeState v, bool demo)
        {
            long now = Now();
            if (BusyWithBreathing()) return;
            if (!demo)
            {
                if (settings.NudgeMode == "off" || now < nudgePausedUntil) return;
                if (study.Phase == StudyPhase.Break || study.Phase == StudyPhase.BackDue) return;
            }
            if (due == Due.Tense)
            {
                if (!demo && !settings.BudgetAllows(now, lastNudgeAt, DayKey())) return;
                int rise = (int)Math.Round(v.Rise), minutes = v.RunMinutes;
                Queue(delegate { ShowTense(rise, minutes, demo); }, demo ? 0 : 20000);
            }
            else
            {
                if (!demo && now - lastHighAt < 3600000) return;
                Queue(ShowHigh, 20000);
            }
        }

        void ShowTense(int rise, int minutes, bool demo)
        {
            long now = Now();
            // The prompt may have waited for a pause in typing; drop it if a break began in the meantime.
            if (!demo && study.Phase != StudyPhase.Off && study.Phase != StudyPhase.Work && study.Phase != StudyPhase.BreakDue) return;
            if (!demo)
            {
                settings.BudgetSpend(DayKey());
                lastNudgeAt = now;
                SaveSettings();
            }
            if (settings.PromptSound) Sound.Soft();
            string detail = "+" + rise + " bpm for " + minutes + " min" + (demo ? " (demo)" : "");
            askDetail = detail;
            ShowMessage(Ask.Tense, "Feeling tense?",
                "Your heart rate has been about " + rise + " bpm above your seated baseline for " + minutes +
                " minutes. If you feel tense, rate it to start slow breathing. If you just moved, say so.",
                90000,
                delegate(int n)
                {
                    LogEvent("nudge answered: tense", detail);
                    tensionBefore = n;
                    StartSession("heart rate nudge", settings.Minutes);
                },
                new CardButton("I was moving", false, delegate { LogEvent("nudge answered: was moving", detail); EndPrompt(); }),
                new CardButton("Not now", false, delegate { LogEvent("nudge answered: not now", detail); EndPrompt(); }));
        }

        void ShowHigh()
        {
            lastHighAt = Now();
            ShowMessage(Ask.High, "Heart rate above " + settings.HighLimit + " for 10 minutes",
                "If you've been active, ignore this. If you've been sitting still and can't explain it, or you have chest pain, faintness or trouble breathing, get medical advice.",
                180000, null,
                new CardButton("I was active", false, delegate { LogEvent("high heart rate check", "was active"); EndPrompt(); }),
                new CardButton("OK", true, delegate { LogEvent("high heart rate check", "seen"); EndPrompt(); }));
        }

        void EndPrompt()
        {
            ClearAsk(true);
            if (demoOn) StopDemo();
        }

        /* ---------- the card: questions and notices ---------- */

        void ShowMessage(Ask what, string title, string body, long timeoutMs, Action<int> scale, params CardButton[] buttons)
        {
            ask = what;
            askAt = Now();
            askTimeoutMs = timeoutMs;
            statusHideAt = 0;
            card.Mode = CardMode.Message;
            card.HeaderNote = demoOn ? "Demo" : "";
            card.Title = title;
            card.Body = body;
            card.ScalePick = scale;
            card.SetButtons(buttons);
            card.Pop();
        }

        void ClearAsk(bool hide)
        {
            ask = Ask.None;
            card.Mode = CardMode.Status;
            card.ScalePick = null;
            if (hide) card.Hide();
        }

        // Something that wants the card. It waits until the card is free and, for up to maxWaitMs, for a pause in
        // typing, because a prompt that lands mid-keystroke costs more than one that lands between thoughts.
        void Queue(Action show, long maxWaitMs)
        {
            pending.Add(new Pending { Show = show, Deadline = Now() + maxWaitMs });
            TryPending();
        }

        bool CardFree()
        {
            return !sActive && (ask == Ask.None || ask == Ask.HeadsUp || ask == Ask.Info || ask == Ask.OnBreak);
        }

        void TryPending()
        {
            if (pending.Count == 0 || !CardFree()) return;
            Pending next = pending[0];
            if (IdleMs() < 1500 && Now() < next.Deadline) return;
            pending.RemoveAt(0);
            next.Show();
        }

        [StructLayout(LayoutKind.Sequential)]
        struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }

        [DllImport("user32.dll")]
        static extern bool GetLastInputInfo(ref LASTINPUTINFO info);

        // Milliseconds since the last key press or mouse movement anywhere in Windows.
        static long IdleMs()
        {
            try
            {
                var info = new LASTINPUTINFO();
                info.cbSize = (uint)Marshal.SizeOf(typeof(LASTINPUTINFO));
                if (!GetLastInputInfo(ref info)) return long.MaxValue;
                return unchecked((uint)Environment.TickCount - info.dwTime);
            }
            catch (Exception) { return long.MaxValue; }
        }

        void OnCardClose()
        {
            if (card.Mode == CardMode.Guide) { FinishSession(true); return; }
            switch (ask)
            {
                case Ask.Tense: LogEvent("nudge answered: closed", askDetail); EndPrompt(); break;
                case Ask.High: LogEvent("high heart rate check", "closed"); EndPrompt(); break;
                case Ask.RateBefore: AfterSession(null, null); break;
                case Ask.Intro: Voice.Hush(); AfterSession(null, null); break;
                case Ask.RateAfter: LogBreathing(null); AfterSession(null, null); break;
                case Ask.BreakDue: study.Snooze(Now(), false); ClearAsk(true); break;
                case Ask.BackToWork: NextBlock(); break;
                default: ClearAsk(true); statusHideAt = 0; break;
            }
        }

        /* ---------- breathing ---------- */

        internal void BreatheNow(int minutes) { BeginRating("manual", minutes); }

        void BeginRating(string trigger, int minutes)
        {
            if (sActive) return;
            ShowMessage(Ask.RateBefore, "How tense do you feel?",
                "Rate it to start " + minutes + " minutes of slow breathing. The rating is saved so you can see whether breathing helps.",
                90000,
                delegate(int n) { tensionBefore = n; StartSession(trigger, minutes); },
                new CardButton("Cancel", false, delegate { AfterSession(null, null); }));
        }

        internal void Practice()
        {
            if (sActive) return;
            tensionBefore = null;
            StartSession("practice", 5);
        }

        void StartSession(string trigger, int minutes)
        {
            sTrigger = trigger;
            sMinutes = minutes;
            sPattern = Breath.Get(settings.Pattern);
            if (!settings.TutorialDone || trigger == "practice")
            {
                // Taught once, in words, before the first session: instruction is what separated the breathing
                // programmes that worked from those that did not.
                string how = sPattern.Intro + " Keep each breath gentle and normal-sized: slower, not deeper. If you feel dizzy, stop and breathe normally.";
                ShowMessage(Ask.Intro, "How to breathe", how, 0, null,
                    new CardButton("Start", true, delegate
                    {
                        Voice.Hush();
                        if (!settings.TutorialDone) { settings.TutorialDone = true; SaveSettings(); }
                        RunSession();
                    }));
                Voice.Say(how);
                return;
            }
            RunSession();
        }

        void RunSession()
        {
            ask = Ask.None;
            sActive = true;
            sLeadIn = 5;
            sDuration = sMinutes * 60;
            TestSessionSeconds(ref sDuration);
            sStartAt = Now();
            sTotal = 0;
            sLastKey = null;
            sStartBpm = CurrentBpm();
            statusHideAt = 0;
            card.Mode = CardMode.Guide;
            card.HeaderNote = demoOn ? "Demo" : "";
            card.ScalePick = null;
            card.SetButtons(new CardButton("End", false, delegate { FinishSession(true); }));
            Voice.Say("Gentle breaths through your nose. Slower, not deeper.");
            SessionTick();
            card.Pop();
            frameTimer.Start();
        }

        void SessionTick()
        {
            if (!sActive) return;
            long now = Now();
            int? live = CurrentBpm();
            string heart = live.HasValue ? ", heart rate " + live.Value : "";
            double elapsed = (now - sStartAt) / 1000.0 - sLeadIn;
            if (elapsed < 0)
            {
                card.Cue = "Gentle breaths through your nose. Slower, not deeper.";
                card.Count = ((int)Math.Ceiling(-elapsed)).ToString();
                card.Fill = 0;
                card.Sub = sPattern.Name;
            }
            else
            {
                Phase ph = Breath.At(sPattern, elapsed);
                string key = ph.Cycle + ":" + ph.Index;
                if (key != sLastKey)
                {
                    // Finish on a full breath: stop at the first cycle boundary after time is up.
                    if (ph.Index == 0 && elapsed >= sDuration) { FinishSession(false); return; }
                    sLastKey = key;
                    if (settings.Tones) Sound.Tone(ph.Step.Tone);
                    Voice.Say(ph.Cycle < 2 ? ph.Step.Say : ph.Step.Short);
                }
                card.Cue = ph.Step.Label;
                card.Count = Math.Max(1, (int)Math.Ceiling(ph.Remaining)).ToString();
                card.Fill = ph.Fill;
                card.Sub = Format.Clock(sDuration - elapsed) + " left" + heart;
            }
            card.Invalidate();
        }

        void FinishSession(bool early)
        {
            if (!sActive) return;
            sActive = false;
            frameTimer.Stop();
            sTotal = Math.Max(0, (Now() - sStartAt) / 1000.0 - sLeadIn);
            sEndBpm = CurrentBpm();
            if (early)
            {
                Voice.Hush();
                LogBreathing(null);
                AfterSession(null, null);
                return;
            }
            // The score is how the person feels. Average heart rate barely moves with slow breathing, and a spike
            // fades by itself, so heart rate is shown for interest only.
            string body = sStartBpm.HasValue && sEndBpm.HasValue
                ? "Heart rate went from " + sStartBpm.Value + " to " + sEndBpm.Value + " bpm. That is for interest; your rating is the score."
                : "Your rating is the score.";
            Voice.Say("Session complete. How tense do you feel now?");
            ShowMessage(Ask.RateAfter, "How tense now?", body, 120000,
                delegate(int n)
                {
                    LogBreathing(n);
                    string title = tensionBefore.HasValue ? "Tension went from " + tensionBefore.Value + " to " + n : "Tension now " + n;
                    AfterSession(title, "Saved to your session log.");
                },
                new CardButton("Skip", false, delegate { LogBreathing(null); AfterSession(null, null); }));
        }

        // Where the card goes once breathing is finished or abandoned.
        void AfterSession(string infoTitle, string infoBody)
        {
            sActive = false;
            frameTimer.Stop();
            tensionBefore = null;
            if (demoOn) StopDemo();
            if (study.Phase == StudyPhase.Break) ShowOnBreak();
            else if (study.Phase == StudyPhase.BackDue) ShowBackToWork();
            else if (infoTitle != null) ShowMessage(Ask.Info, infoTitle, infoBody, 5000, null);
            else ClearAsk(true);
            UpdateTray();
        }

        /* ---------- study session ---------- */

        internal void StartStudy()
        {
            if (study.Phase != StudyPhase.Off) return;
            study.Start(Now());
            note = "";
            talliedMs = 0;
            talliedBlocks = 0;
            ApplyMonitoring(NudgeDetector.SettleStartMin);
            if (CardFree() && (main == null || !main.Visible)) ShowStatus(8000);
            UpdateTray();
        }

        // Adds what has been studied since the last count to today's tally.
        void Tally()
        {
            settings.Today(DayKey());
            settings.TodayStudyMs += Math.Max(0, study.WorkedMs - talliedMs);
            settings.TodayBlocks += Math.Max(0, study.Blocks - talliedBlocks);
            talliedMs = study.WorkedMs;
            talliedBlocks = study.Blocks;
            SaveSettings();
        }

        internal void EndStudy()
        {
            if (study.Phase == StudyPhase.Off) return;
            study.Stop(Now());
            Tally();
            pending.Clear();
            ApplyMonitoring(NudgeDetector.SettleStartMin);
            bool busy = sActive || BusyWithBreathing();
            if (study.WorkedMs >= 60000)
            {
                string summary = study.Blocks + (study.Blocks == 1 ? " block, " : " blocks, ") + Format.Duration(study.WorkedMs) + " of study";
                LogEvent("study session", summary);
                if (!busy) ShowMessage(Ask.Info, "Session over", summary + ".", 8000, null);
            }
            else if (!busy) ClearAsk(true);   // ended almost as soon as it began: nothing worth reporting
            UpdateTray();
        }

        internal void TakeBreakNow()
        {
            if (study.Phase == StudyPhase.Work || study.Phase == StudyPhase.BreakDue) BeginBreak();
        }

        void ShowHeadsUp()
        {
            if (study.Phase != StudyPhase.Work) return;
            ShowMessage(Ask.HeadsUp, "Break in 2 minutes",
                "Find a stopping point, and note the next step you'll take when you're back.", 12000, null,
                new CardButton("Add note", false, OpenNote));
        }

        void ShowBreakDue()
        {
            if (study.Phase != StudyPhase.BreakDue) return;
            var buttons = new List<CardButton>();
            buttons.Add(new CardButton(note.Length > 0 ? "Edit note" : "Add note", false, OpenNote));
            if (study.CanSnooze) buttons.Add(new CardButton("5 more min", false, delegate { study.Snooze(Now(), true); ClearAsk(true); }));
            buttons.Add(new CardButton("Start break", true, BeginBreak));
            string title = study.BreakIsLong ? "Time for a long break" : "Time for a " + study.BreakMinutes + "-minute break";
            string body = study.BreakIsLong
                ? "About two hours in. Note your next step, then take 20 to 30 minutes away: eat, walk, get outside."
                : "Note your next step, then step away from the screen. Move if you feel sluggish, breathe if you feel tense, rest quietly after new material. Leave your phone.";
            ShowMessage(Ask.BreakDue, title, body, 0, null, buttons.ToArray());
        }

        void BeginBreak()
        {
            study.BeginBreak(Now());
            Tally();
            ApplyMonitoring(NudgeDetector.SettleResumeMin);
            ShowOnBreak();
            UpdateTray();
        }

        void ShowOnBreak()
        {
            if (study.Phase != StudyPhase.Break) return;
            string body = study.BreakIsLong
                ? "Eat, walk, get outside. The timer will call you back."
                : "Move, breathe or rest quietly, and leave your phone. Breathing may help most in the last minutes before a hard block.";
            ShowMessage(Ask.OnBreak, BreakTitle(), body, 0, null,
                new CardButton("Breathe", false, delegate { BeginRating("break", settings.Minutes); }),
                new CardButton("Back to work", false, NextBlock));
        }

        string BreakTitle() { return "Break, " + Format.Clock(study.Remaining(Now()) / 1000.0) + " left"; }

        void ShowBackToWork()
        {
            if (study.Phase != StudyPhase.BackDue) return;
            var buttons = new List<CardButton>();
            buttons.Add(new CardButton("End session", false, EndStudy));
            if (study.CanExtend) buttons.Add(new CardButton("5 more min", false, delegate { study.ExtendBreak(Now()); ShowOnBreak(); }));
            buttons.Add(new CardButton("Start next block", true, NextBlock));
            ShowMessage(Ask.BackToWork, "Back to it",
                note.Length > 0 ? "Pick up at: " + note : "Start with the next step you had in mind.", 0, null, buttons.ToArray());
        }

        void NextBlock()
        {
            if (study.Phase != StudyPhase.Break && study.Phase != StudyPhase.BackDue) return;
            study.NextBlock(Now());
            note = "";
            // Heart rate is still settling after the break, so the first minutes back are not counted.
            ApplyMonitoring(NudgeDetector.SettleResumeMin);
            ClearAsk(true);
            UpdateTray();
        }

        void OpenNote()
        {
            if (noteForm != null && !noteForm.IsDisposed) { noteForm.Activate(); return; }
            noteForm = new NoteForm(note, card.Placement());
            noteForm.Saved += delegate(string text)
            {
                note = text ?? "";
                if (ask == Ask.BreakDue) ShowBreakDue();
                else if (ask == Ask.BackToWork) ShowBackToWork();
            };
            noteForm.Show();
        }

        /* ---------- log ---------- */

        static string Csv(string s) { return "\"" + (s ?? "").Replace("\"", "'") + "\""; }
        static string Num(int? n) { return n.HasValue ? n.Value.ToString(CultureInfo.InvariantCulture) : ""; }

        void WriteLog(string evt, int? before, int? after, int? hrBefore, int? hrAfter, string technique, int? seconds, string detail)
        {
            try
            {
                if (!File.Exists(LogPath)) File.WriteAllText(LogPath, LogHeader + Environment.NewLine);
                File.AppendAllText(LogPath, string.Join(",",
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture), Csv(evt),
                    Num(before), Num(after), Num(hrBefore), Num(hrAfter), Csv(technique), Num(seconds), Csv(detail)) + Environment.NewLine);
            }
            catch (Exception) { }
        }

        void LogEvent(string evt, string detail) { WriteLog(evt, null, null, null, null, "", null, detail); }

        void LogBreathing(int? tensionAfter)
        {
            if (sTotal < 5) return;
            WriteLog("breathing", tensionBefore, tensionAfter, sStartBpm, sEndBpm, sPattern.Name, (int)Math.Round(sTotal),
                "started by: " + sTrigger + (demoOn ? " (demo)" : ""));
            if (!demoOn)
            {
                settings.Today(DayKey());
                settings.TodayBreaths++;
                SaveSettings();
            }
            sTotal = 0;
        }

        /* ---------- status: the card, the Home page and the tray share these lines ---------- */

        void ToggleStatus()
        {
            if (card.Visible && card.Mode == CardMode.Status && ask == Ask.None) { card.Hide(); statusHideAt = 0; }
            else if (!card.Visible) ShowStatus(0);
        }

        // autoHideMs of 0 keeps the card up until it is closed.
        void ShowStatus(int autoHideMs)
        {
            if (sActive) return;
            if (!card.Visible && study.Phase == StudyPhase.Break) { ShowOnBreak(); return; }
            if (card.Visible && card.Mode != CardMode.Status) return;
            ask = Ask.None;
            statusHideAt = autoHideMs > 0 ? Now() + autoHideMs : 0;
            RefreshStatus();
            card.Pop();
        }

        void RefreshStatusIfShown()
        {
            if (card.Visible && card.Mode == CardMode.Status && ask == Ask.None) RefreshStatus();
        }

        string PhaseLine(long now)
        {
            if (demoOn) return "Demo study block";
            switch (study.Phase)
            {
                case StudyPhase.Work: return "Block " + study.BlockNumber + ", " + Format.Clock(study.Remaining(now) / 1000.0) + " left";
                case StudyPhase.BreakDue: return "Block " + study.BlockNumber + ", break is due";
                case StudyPhase.Break: return "On a break, " + Format.Clock(study.Remaining(now) / 1000.0) + " left";
                case StudyPhase.BackDue: return "Break over";
                default: return "No study session";
            }
        }

        string NudgeLine(long now)
        {
            NudgeState v = State;
            if (!demoOn)
            {
                if (settings.NudgeMode == "off") return "Heart rate nudges are off.";
                if (now < nudgePausedUntil)
                    return pausedIndefinitely ? "Heart rate nudges are paused."
                        : "Heart rate nudges are paused until " + DateTime.Now.AddMilliseconds(nudgePausedUntil - now).ToShortTimeString() + ".";
                if (!detector.Monitoring)
                    return settings.NudgeMode == "study" && study.Phase == StudyPhase.Off
                        ? "Runs during study sessions, when you are sitting."
                        : "Not counting heart rate during the break.";
                if (!Fresh(now)) return "Waiting for heart rate from your strap.";
            }
            if (!v.HasBaseline) return "Learning your seated baseline. The nudge can start about 15 minutes in.";
            if (v.HoldOff) return "That jump looked like movement, so the count restarts in a few minutes.";
            if (v.RunMinutes > 0)
                return "About " + Math.Round(v.Rise) + " bpm above baseline for " + v.RunMinutes + " of " + settings.NudgeMinutes + " minutes.";
            return "Seated baseline " + Math.Round(v.Baseline) + ". Asks after " + settings.NudgeMinutes + " minutes at " + Math.Round(v.Threshold) + " or more.";
        }

        // One sentence on where heart rate is, or is not, coming from.
        string ConnectionLine(long now)
        {
            if (bluetoothUnsupported || strap == null) return "This PC can't read Bluetooth heart rate. Breaks and breathing still work.";
            if (!settings.HasPairedStrap) return "No strap paired. Open Downshift to choose yours.";
            switch (strap.State)
            {
                case StrapState.NoBluetooth: return "Bluetooth is off. Turn it on in Windows settings.";
                case StrapState.Connecting: return "Connecting to " + PairedLabel() + ".";
                case StrapState.Live:
                    return now - lastZeroAt < 10000 ? "The strap is sending 0 bpm. Check it's snug, or turn Broadcast Heart Rate off and on."
                        : "Connected. Waiting for the first heartbeat.";
                default:
                    return !string.IsNullOrEmpty(strap.Problem) ? strap.Problem
                        : "Looking for " + PairedLabel() + ". Turn on Broadcast Heart Rate in the WHOOP app.";
            }
        }

        void RefreshStatus()
        {
            long now = Now();
            card.Mode = CardMode.Status;
            card.ScalePick = null;
            card.HeaderNote = demoOn ? "Demo, 30 times normal speed" : "";
            card.Line1 = PhaseLine(now);
            bool fresh = Fresh(now);
            card.BigText = fresh ? (demoOn ? demoBpm : lastBpm).ToString() : "--";
            card.Line2 = fresh ? NudgeLine(now) : ConnectionLine(now);
            var breathe = new CardButton("Breathe", false, delegate { BreatheNow(settings.Minutes); });
            if (study.Phase != StudyPhase.Off) card.SetButtons(breathe, new CardButton("Take a break", false, TakeBreakNow));
            else if (!fresh && !settings.HasPairedStrap && !bluetoothUnsupported && strap != null)
                card.SetButtons(new CardButton("Pair a strap", false, delegate { OpenMain(Nav.Device); }), new CardButton("Start study session", true, StartStudy));
            else card.SetButtons(breathe, new CardButton("Start study session", true, StartStudy));
            card.Invalidate();
        }

        internal HomeInfo Home()
        {
            long now = Now();
            var h = new HomeInfo();
            bool fresh = Fresh(now);
            h.Bpm = fresh ? (demoOn ? demoBpm : lastBpm).ToString() : "--";
            if (demoOn) { h.DeviceLine = "Demo reading"; h.DeviceTrying = true; }
            else if (fresh) { h.DeviceLine = PairedLabel() + ", connected"; h.DeviceGood = true; }
            else
            {
                h.DeviceLine = ConnectionLine(now);
                h.DeviceTrying = strap != null && settings.HasPairedStrap && strap.State != StrapState.NoBluetooth;
            }

            h.Studying = study.Phase != StudyPhase.Off;
            h.CanBreak = study.Phase == StudyPhase.Work || study.Phase == StudyPhase.BreakDue;
            h.StudyTitle = h.Studying ? PhaseLine(now) : "Not started";
            h.StudyDetail = h.Studying
                ? (study.Blocks == 0 ? "First block of this session."
                    : study.Blocks + (study.Blocks == 1 ? " block" : " blocks") + " finished, " + Format.Duration(study.WorkedMs) + " studied this session.")
                : settings.BlockMin + "-minute blocks with " + StudyClock.ShortBreakFor(settings.BlockMin) + "-minute breaks, and a longer break after about two hours.";

            BreathPattern p = Breath.Get(settings.Pattern);
            h.PatternName = p.Name;
            h.PatternNote = p.Note;
            h.PatternMinutes = settings.Minutes;

            h.NudgeLine = NudgeLine(now);
            h.NudgeOff = settings.NudgeMode == "off";
            h.NudgePaused = now < nudgePausedUntil;

            settings.Today(DayKey());
            int used = settings.PromptDay == DayKey() ? settings.PromptCount : 0;
            h.Today = settings.TodayBlocks + (settings.TodayBlocks == 1 ? " study block, " : " study blocks, ") +
                Format.Duration(settings.TodayStudyMs) + " studied, " +
                settings.TodayBreaths + (settings.TodayBreaths == 1 ? " breathing session, " : " breathing sessions, ") +
                used + " of " + settings.DailyCap + " nudges used.";
            return h;
        }

        internal void PauseNudges(int minutes)
        {
            pausedIndefinitely = minutes <= 0;
            nudgePausedUntil = pausedIndefinitely ? long.MaxValue / 4 : Now() + minutes * 60000L;
            RefreshStatusIfShown();
        }

        internal void ResumeNudges()
        {
            pausedIndefinitely = false;
            nudgePausedUntil = 0;
            RefreshStatusIfShown();
        }

        /* ---------- once a second ---------- */

        void SecondTick()
        {
            long now = Now();
            if (demoOn) DemoTick();
            if (strap != null)
            {
                try { strap.Tick(); } catch (Exception) { }
            }

            switch (study.Tick(now))
            {
                case StudyEvent.HeadsUp: Queue(ShowHeadsUp, 20000); break;
                case StudyEvent.BreakDue: Queue(ShowBreakDue, 60000); break;
                case StudyEvent.BreakOver:
                    // The person is probably away from the screen, so this one may make a sound.
                    if (settings.BreakSound) Sound.Soft();
                    Queue(ShowBackToWork, 0);
                    break;
            }
            TryPending();

            // Questions that go unanswered put themselves away.
            if (ask != Ask.None && askTimeoutMs > 0 && now - askAt > askTimeoutMs && !card.MouseInside)
            {
                switch (ask)
                {
                    case Ask.Tense: LogEvent("nudge answered: no answer", askDetail); EndPrompt(); break;
                    case Ask.High: LogEvent("high heart rate check", "no answer"); EndPrompt(); break;
                    case Ask.RateAfter: LogBreathing(null); AfterSession(null, null); break;
                    case Ask.RateBefore: AfterSession(null, null); break;
                    default: ClearAsk(true); break;
                }
            }
            if (ask == Ask.OnBreak && card.Visible) { card.Title = BreakTitle(); card.Invalidate(); }

            if (card.Visible && card.Mode == CardMode.Status && ask == Ask.None)
            {
                if (statusHideAt != 0 && now >= statusHideAt && !card.MouseInside) { card.Hide(); statusHideAt = 0; }
                else RefreshStatus();
            }
            UpdateTray();
        }

        /* ---------- demo ---------- */

        int DemoValue(long t)
        {
            double v = 66 + 2 * Math.Sin(t / 11000.0) + (random.NextDouble() * 2 - 1);
            if (t >= 60000) v += Math.Min(18, (t - 60000) / 1000.0 * 0.3);   // a gradual rise, the shape of seated stress
            return (int)Math.Round(v);
        }

        internal void StartDemo()
        {
            if (demoOn || sActive) return;
            demoDetector = new NudgeDetector(settings);
            long start = -40 * 60000L;
            demoDetector.StartMonitoring(start, NudgeDetector.SettleStartMin);
            for (long t = start; t < 0; t += 1000) demoDetector.Push(t, DemoValue(t));
            demoT = 0;
            demoBpm = DemoValue(0);
            demoPrompted = false;
            demoOn = true;
            ask = Ask.None;
            card.Mode = CardMode.Status;
            statusHideAt = 0;
            RefreshStatus();
            card.Pop();
        }

        void DemoTick()
        {
            if (demoPrompted || demoDetector == null) return;
            for (int i = 0; i < DemoSpeed && !demoPrompted; i++)
            {
                demoT += 1000;
                demoBpm = DemoValue(demoT);
                NudgeState v = demoDetector.Push(demoT, demoBpm);
                if (v.Due == Due.Tense)
                {
                    demoPrompted = true;
                    OnDue(Due.Tense, v, true);
                }
            }
            if (demoT > 20 * 60000L && !demoPrompted) StopDemo();
        }

        void StopDemo()
        {
            if (!demoOn) return;
            demoOn = false;
            demoDetector = null;
            if (sActive) FinishSession(true);
            else if (ask == Ask.Tense || ask == Ask.RateAfter || ask == Ask.Intro) ClearAsk(true);
            else if (card.Visible && card.Mode == CardMode.Status) { card.Hide(); statusHideAt = 0; }
            UpdateTray();
        }

        /* ---------- tray ---------- */

        ContextMenuStrip BuildMenu()
        {
            var menu = new ContextMenuStrip();
            miHeader = new ToolStripMenuItem("Open Downshift", null, delegate { OpenMain(Nav.Home); });
            miHeader.Font = new Font(miHeader.Font, FontStyle.Bold);
            menu.Items.Add(miHeader);
            menu.Items.Add(new ToolStripSeparator());
            miStart = new ToolStripMenuItem("Start study session", null, delegate { StartStudy(); });
            miBreak = new ToolStripMenuItem("Take a break now", null, delegate { TakeBreakNow(); });
            miEnd = new ToolStripMenuItem("End study session", null, delegate { EndStudy(); });
            menu.Items.Add(miStart);
            menu.Items.Add(miBreak);
            menu.Items.Add(miEnd);
            var breathe = new ToolStripMenuItem("Breathe");
            breathe.DropDownItems.Add("5 minutes", null, delegate { BreatheNow(5); });
            breathe.DropDownItems.Add("2 minutes", null, delegate { BreatheNow(2); });
            menu.Items.Add(breathe);
            menu.Items.Add(new ToolStripSeparator());
            miMute = new ToolStripMenuItem("Mute sounds", null, delegate
            {
                settings.Mute = !settings.Mute;
                if (settings.Mute) Voice.Hush();
                SettingsChanged();
            });
            menu.Items.Add(miMute);
            miPause = new ToolStripMenuItem("Pause heart rate nudges");
            miPause.DropDownItems.Add("For 1 hour", null, delegate { PauseNudges(60); });
            miPause.DropDownItems.Add("For 3 hours", null, delegate { PauseNudges(180); });
            miPause.DropDownItems.Add("Until I resume", null, delegate { PauseNudges(0); });
            menu.Items.Add(miPause);
            miResume = new ToolStripMenuItem("Resume heart rate nudges", null, delegate { ResumeNudges(); }) { Visible = false };
            menu.Items.Add(miResume);
            menu.Items.Add("Settings", null, delegate { OpenMain(Nav.Settings); });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Exit", null, delegate { Quit(); });
            menu.Opening += delegate
            {
                bool paused = Now() < nudgePausedUntil;
                bool studying = study.Phase != StudyPhase.Off;
                miStart.Visible = !studying;
                miEnd.Visible = studying;
                miBreak.Visible = study.Phase == StudyPhase.Work || study.Phase == StudyPhase.BreakDue;
                miMute.Checked = settings.Mute;
                miPause.Visible = !paused && settings.NudgeMode != "off";
                miResume.Visible = paused;
            };
            return menu;
        }

        [DllImport("user32.dll")]
        static extern bool DestroyIcon(IntPtr handle);

        void UpdateTray()
        {
            long now = Now();
            Theme.Refresh();
            bool fresh = Fresh(now);
            string text = fresh ? (demoOn ? demoBpm : lastBpm).ToString() : "";
            string phase = study.Phase == StudyPhase.Work ? ", block " + study.BlockNumber + ", " + (int)Math.Ceiling(study.Remaining(now) / 60000.0) + " min left"
                : study.Phase == StudyPhase.Break ? ", on a break" : "";
            string tip = (fresh ? "Downshift: " + text + " bpm" + (demoOn ? " (demo)" : "") : "Downshift") + phase + (settings.Mute ? ", muted" : "");
            string key = text + "|" + Theme.TaskbarDark + "|" + tip;
            if (key == trayKey) return;
            trayKey = key;
            try
            {
                tray.Text = tip.Length > 63 ? tip.Substring(0, 63) : tip;
                Icon next = DrawIcon(text, Theme.TaskbarDark ? Color.White : Color.Black);
                Icon old = trayIcon;
                tray.Icon = next;
                trayIcon = next;
                if (old != null) old.Dispose();
            }
            catch (Exception) { }
        }

        // The tray icon is the live heart rate as plain digits, in the taskbar's own text color.
        static Icon DrawIcon(string text, Color ink)
        {
            using (var bmp = new Bitmap(32, 32))
            {
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = SmoothingMode.AntiAlias;
                    g.TextRenderingHint = TextRenderingHint.AntiAlias;
                    g.Clear(Color.Transparent);
                    if (text.Length == 0)
                    {
                        Theme.DrawMark(g, new RectangleF(5, 5, 22, 22), ink);
                    }
                    else
                    {
                        using (Font f = Theme.Ui(text.Length >= 3 ? 19f : 26f, true))
                        using (var b = new SolidBrush(ink))
                        using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                            g.DrawString(text, f, b, new RectangleF(-10, 0, 52, 32), sf);
                    }
                }
                IntPtr handle = bmp.GetHicon();
                try
                {
                    using (Icon temp = Icon.FromHandle(handle)) return (Icon)temp.Clone();
                }
                finally { DestroyIcon(handle); }
            }
        }

        static void OpenInNotepad(string path)
        {
            try { Process.Start("notepad.exe", "\"" + path + "\""); }
            catch (Exception) { }
        }

        internal void OpenLog()
        {
            try { if (!File.Exists(LogPath)) File.WriteAllText(LogPath, LogHeader + Environment.NewLine); }
            catch (Exception) { }
            OpenInNotepad(LogPath);
        }

        internal void OpenTroubleLog()
        {
            if (!File.Exists(TroublePath)) Trouble("Nothing logged yet.");
            OpenInNotepad(TroublePath);
        }

        internal bool AutostartEnabled()
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKey, false))
                    return key != null && key.GetValue("Downshift") != null;
            }
            catch (Exception) { return false; }
        }

        internal void SetAutostart(bool on)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(RunKey, true))
                {
                    if (key == null) return;
                    if (on) key.SetValue("Downshift", "\"" + Application.ExecutablePath + "\"");
                    else key.DeleteValue("Downshift", false);
                }
            }
            catch (Exception) { }
        }

        static Settings LoadSettings()
        {
            try { if (File.Exists(SettingsPath)) return Settings.Parse(File.ReadAllText(SettingsPath)); }
            catch (Exception) { }
            return new Settings();
        }

        void SaveSettings()
        {
            try { File.WriteAllText(SettingsPath, settings.Serialize()); }
            catch (Exception) { }
        }

        void Quit()
        {
            try { if (sActive) FinishSession(true); } catch (Exception) { }
            try
            {
                if (study.Phase != StudyPhase.Off)
                {
                    study.Stop(Now());
                    Tally();
                    if (study.WorkedMs >= 60000)
                        LogEvent("study session", study.Blocks + (study.Blocks == 1 ? " block, " : " blocks, ") + Format.Duration(study.WorkedMs) + " of study");
                }
            }
            catch (Exception) { }
            try { if (strap != null) strap.Stop(); } catch (Exception) { }
            Voice.Hush();
            secondTimer.Stop();
            frameTimer.Stop();
            try { if (main != null && !main.IsDisposed) main.Dispose(); } catch (Exception) { }
            tray.Visible = false;
            tray.Dispose();
            ExitThread();
        }
    }
}

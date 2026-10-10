// Logic with no Windows dependencies: packet parsing, the heart rate nudge rule, the study clock,
// breathing patterns and settings. Kept separate so it can be tested anywhere.
// The reasoning behind each default is in Evidence.cs (tray menu > The evidence).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Text;

namespace Downshift
{
    public static class Clock
    {
        static readonly Stopwatch watch = Stopwatch.StartNew();
        public static long Now() { return watch.ElapsedMilliseconds; }
    }

    public static class HeartRatePacket
    {
        // Bluetooth Heart Rate Measurement (0x2A37): a flags byte, then bpm as one byte or two.
        public static bool TryParse(byte[] data, out int bpm)
        {
            bpm = 0;
            if (data == null || data.Length < 2) return false;
            bool wide = (data[0] & 0x01) != 0;
            if (wide)
            {
                if (data.Length < 3) return false;
                bpm = data[1] | (data[2] << 8);
            }
            else
            {
                bpm = data[1];
            }
            return true;
        }
    }

    public sealed class Settings
    {
        public const int CurrentVersion = 2;

        // Heart rate nudge. Every number here is a reasoned starting point, not a tested value.
        public string NudgeMode = "study";   // "study" = only during study sessions, "always", or "off"
        public int NudgeDelta = 15;          // bpm above the seated baseline
        public int NudgeMinutes = 5;         // consecutive minutes it must stay there
        public int WaitMin = 60;             // minutes between nudges
        public int DailyCap = 3;             // most nudges per day
        public int HighLimit = 130;          // seated check-in level, held for ten minutes
        public bool PromptSound;

        // Study breaks
        public int BlockMin = 25;
        public bool BreakSound = true;

        // Breathing
        public string Pattern = "slow46";
        public int Minutes = 5;
        public bool Voice = true;
        public bool Tones = true;
        public bool TutorialDone;

        // Sound
        public bool Mute;                    // silences everything: voice, tones and cues
        public int Volume = 70;              // 0 to 100
        public string VoiceId = "";          // empty = the Windows default voice
        public int VoiceRate;                // -5 (slowest) to 5 (fastest), 0 = normal

        // The strap this PC is paired with. Both are kept because some straps change address.
        public ulong PairedAddress;
        public string PairedName = "";

        public int PromptDay, PromptCount;   // how many nudges have been shown today
        public int TodayKey, TodayBlocks, TodayBreaths;   // today's tally for the Home page
        public long TodayStudyMs;

        public bool Welcomed;                // the main window has been shown once, on first run

        public bool HasPairedStrap { get { return PairedAddress != 0 || PairedName.Length > 0; } }

        // Puts every preference back to its default. The paired strap, the tutorial flag and today's tally stay.
        public void ResetPreferences()
        {
            var d = new Settings();
            NudgeMode = d.NudgeMode; NudgeDelta = d.NudgeDelta; NudgeMinutes = d.NudgeMinutes; WaitMin = d.WaitMin;
            DailyCap = d.DailyCap; HighLimit = d.HighLimit; PromptSound = d.PromptSound;
            BlockMin = d.BlockMin; BreakSound = d.BreakSound;
            Pattern = d.Pattern; Minutes = d.Minutes; Voice = d.Voice; Tones = d.Tones;
            Mute = d.Mute; Volume = d.Volume; VoiceId = d.VoiceId; VoiceRate = d.VoiceRate;
        }

        // Rolls the daily tally over at midnight.
        public void Today(int dayKey)
        {
            if (TodayKey == dayKey) return;
            TodayKey = dayKey; TodayBlocks = 0; TodayBreaths = 0; TodayStudyMs = 0;
        }

        static int Clamp(int v, int lo, int hi) { return v < lo ? lo : (v > hi ? hi : v); }

        public void Normalize()
        {
            if (NudgeMode != "study" && NudgeMode != "always" && NudgeMode != "off") NudgeMode = "study";
            NudgeDelta = Clamp(NudgeDelta, 10, 30);
            NudgeMinutes = Clamp(NudgeMinutes, 3, 10);
            WaitMin = Clamp(WaitMin, 30, 240);
            DailyCap = Clamp(DailyCap, 1, 6);
            HighLimit = Clamp(HighLimit, 110, 170);
            BlockMin = Clamp(BlockMin, 20, 50);
            Minutes = Minutes <= 3 ? 2 : 5;
            if (Breath.Find(Pattern) == null) Pattern = "slow46";
            if (PromptCount < 0) PromptCount = 0;
            Volume = Clamp(Volume, 0, 100);
            VoiceRate = Clamp(VoiceRate, -5, 5);
            if (VoiceId == null) VoiceId = "";
            if (PairedName == null) PairedName = "";
        }

        public string Serialize()
        {
            var sb = new StringBuilder();
            sb.Append("Version=").Append(CurrentVersion).Append('\n');
            sb.Append("NudgeMode=").Append(NudgeMode).Append('\n');
            sb.Append("NudgeDelta=").Append(NudgeDelta).Append('\n');
            sb.Append("NudgeMinutes=").Append(NudgeMinutes).Append('\n');
            sb.Append("WaitMin=").Append(WaitMin).Append('\n');
            sb.Append("DailyCap=").Append(DailyCap).Append('\n');
            sb.Append("HighLimit=").Append(HighLimit).Append('\n');
            sb.Append("PromptSound=").Append(PromptSound ? 1 : 0).Append('\n');
            sb.Append("BlockMin=").Append(BlockMin).Append('\n');
            sb.Append("BreakSound=").Append(BreakSound ? 1 : 0).Append('\n');
            sb.Append("Pattern=").Append(Pattern).Append('\n');
            sb.Append("Minutes=").Append(Minutes).Append('\n');
            sb.Append("Voice=").Append(Voice ? 1 : 0).Append('\n');
            sb.Append("Tones=").Append(Tones ? 1 : 0).Append('\n');
            sb.Append("TutorialDone=").Append(TutorialDone ? 1 : 0).Append('\n');
            sb.Append("Welcomed=").Append(Welcomed ? 1 : 0).Append('\n');
            sb.Append("Mute=").Append(Mute ? 1 : 0).Append('\n');
            sb.Append("Volume=").Append(Volume).Append('\n');
            sb.Append("VoiceId=").Append(VoiceId.Replace('\n', ' ')).Append('\n');
            sb.Append("VoiceRate=").Append(VoiceRate).Append('\n');
            sb.Append("PairedAddress=").Append(PairedAddress.ToString(CultureInfo.InvariantCulture)).Append('\n');
            sb.Append("PairedName=").Append(PairedName.Replace('\n', ' ')).Append('\n');
            sb.Append("TodayKey=").Append(TodayKey).Append('\n');
            sb.Append("TodayBlocks=").Append(TodayBlocks).Append('\n');
            sb.Append("TodayBreaths=").Append(TodayBreaths).Append('\n');
            sb.Append("TodayStudyMs=").Append(TodayStudyMs.ToString(CultureInfo.InvariantCulture)).Append('\n');
            sb.Append("PromptDay=").Append(PromptDay).Append('\n');
            sb.Append("PromptCount=").Append(PromptCount).Append('\n');
            return sb.ToString();
        }

        public static Settings Parse(string text)
        {
            var s = new Settings();
            if (text == null) return s;
            var map = new Dictionary<string, string>();
            foreach (string raw in text.Split('\n'))
            {
                string line = raw.Trim();
                int eq = line.IndexOf('=');
                if (eq > 0) map[line.Substring(0, eq).Trim()] = line.Substring(eq + 1).Trim();
            }
            string val;
            ulong address;
            // Earlier builds stored the strap as LastAddress.
            if ((map.TryGetValue("PairedAddress", out val) || map.TryGetValue("LastAddress", out val)) &&
                ulong.TryParse(val, NumberStyles.Integer, CultureInfo.InvariantCulture, out address))
                s.PairedAddress = address;
            s.PairedName = Text(map, "PairedName", "");
            // Settings saved by the first version used different rules. Keep only the strap and start from the new defaults.
            if (!map.TryGetValue("Version", out val) || val != CurrentVersion.ToString(CultureInfo.InvariantCulture)) return s;

            s.NudgeMode = Text(map, "NudgeMode", s.NudgeMode);
            s.NudgeDelta = Int(map, "NudgeDelta", s.NudgeDelta);
            s.NudgeMinutes = Int(map, "NudgeMinutes", s.NudgeMinutes);
            s.WaitMin = Int(map, "WaitMin", s.WaitMin);
            s.DailyCap = Int(map, "DailyCap", s.DailyCap);
            s.HighLimit = Int(map, "HighLimit", s.HighLimit);
            s.PromptSound = Int(map, "PromptSound", 0) != 0;
            s.BlockMin = Int(map, "BlockMin", s.BlockMin);
            s.BreakSound = Int(map, "BreakSound", 1) != 0;
            s.Pattern = Text(map, "Pattern", s.Pattern);
            s.Minutes = Int(map, "Minutes", s.Minutes);
            s.Voice = Int(map, "Voice", 1) != 0;
            s.Tones = Int(map, "Tones", 1) != 0;
            s.TutorialDone = Int(map, "TutorialDone", 0) != 0;
            s.PromptDay = Int(map, "PromptDay", 0);
            s.PromptCount = Int(map, "PromptCount", 0);
            s.Welcomed = Int(map, "Welcomed", 0) != 0;
            s.Mute = Int(map, "Mute", 0) != 0;
            s.Volume = Int(map, "Volume", s.Volume);
            s.VoiceId = Text(map, "VoiceId", "");
            s.VoiceRate = Int(map, "VoiceRate", 0);
            s.TodayKey = Int(map, "TodayKey", 0);
            s.TodayBlocks = Int(map, "TodayBlocks", 0);
            s.TodayBreaths = Int(map, "TodayBreaths", 0);
            long studied;
            if (map.TryGetValue("TodayStudyMs", out val) && long.TryParse(val, NumberStyles.Integer, CultureInfo.InvariantCulture, out studied))
                s.TodayStudyMs = Math.Max(0, studied);
            s.Normalize();
            return s;
        }

        static string Text(Dictionary<string, string> map, string key, string fallback)
        {
            string v;
            return map.TryGetValue(key, out v) && v.Length > 0 ? v : fallback;
        }

        static int Int(Dictionary<string, string> map, string key, int fallback)
        {
            string v; int n;
            return map.TryGetValue(key, out v) && int.TryParse(v, NumberStyles.Integer, CultureInfo.InvariantCulture, out n) ? n : fallback;
        }

        // Nudges are rationed: one per WaitMin and DailyCap per day.
        public bool BudgetAllows(long now, long lastPromptAt, int dayKey)
        {
            if (PromptDay == dayKey && PromptCount >= DailyCap) return false;
            return now - lastPromptAt >= WaitMin * 60000L;
        }

        public void BudgetSpend(int dayKey)
        {
            if (PromptDay != dayKey) { PromptDay = dayKey; PromptCount = 0; }
            PromptCount++;
        }
    }

    // Which strap is ours. A strap is recognised by its Bluetooth address, or by its name when the address has
    // changed; WHOOP names carry the strap's serial number, so the name is as specific as the address.
    public static class Pairing
    {
        public static bool Matches(ulong pairedAddress, string pairedName, ulong address, string name)
        {
            if (pairedAddress != 0 && address == pairedAddress) return true;
            return !string.IsNullOrEmpty(pairedName) && !string.IsNullOrEmpty(name) &&
                   string.Equals(pairedName.Trim(), name.Trim(), StringComparison.OrdinalIgnoreCase);
        }

        // The last four hex digits of the address, enough to tell two straps apart on screen.
        public static string ShortId(ulong address)
        {
            string hex = (address & 0xFFFF).ToString("X4", CultureInfo.InvariantCulture);
            return hex.Substring(0, 2) + ":" + hex.Substring(2, 2);
        }

        public static string Signal(int dbm)
        {
            return dbm >= -60 ? "Strong" : dbm >= -75 ? "Good" : "Weak";
        }
    }

    public enum Due { None, Tense, High }

    public sealed class NudgeState
    {
        public bool Valid;
        public int Bpm;
        public bool Monitoring;
        public bool HasBaseline;
        public double Baseline, Threshold;
        public double Rise;        // last full minute, relative to baseline
        public int RunMinutes;     // consecutive minutes at or above the threshold
        public int HighMinutes;    // consecutive minutes at or above the high limit
        public bool HoldOff;       // counting is paused after a movement-shaped jump
        public Due Due;
    }

    // Decides when a seated heart rate has been raised for long enough to be worth asking about.
    //
    // Why it works this way (sources are in the evidence notes):
    //  - Stress without movement adds roughly 4 to 21 bpm and lasts minutes; standing up adds about 16 bpm within
    //    seconds and is over in half a minute. So the rule looks for a modest rise held for minutes, not a spike.
    //  - A wrist strap is least accurate second by second during posture changes, so everything is judged on
    //    per-minute medians.
    //  - Heart rate alone cannot tell stress from movement. A sharp jump restarts the count, and the result is
    //    only ever a question put to the person.
    // Times are milliseconds on one clock.
    public sealed class NudgeDetector
    {
        public const int MinBpm = 25, MaxBpm = 240;
        public const long Never = long.MinValue / 4;
        public const int SettleStartMin = 5, SettleResumeMin = 3;
        public const int MoveJumpBpm = 15, MoveWindowSec = 10, MoveHoldOffMin = 3;
        public const int HighMinutesNeeded = 10;
        const int BaselineWindowMin = 30, MinBaselineMinutes = 5, MinSamplesPerMinute = 30;

        struct Minute { public long Index; public double Value; public bool Ok, Usable, Held; }
        struct Point { public long T; public int V; }

        readonly Settings cfg;
        readonly List<Minute> minutes = new List<Minute>();
        readonly List<int> filling = new List<int>();
        readonly List<Point> raw = new List<Point>();        // last few readings, for a 3-point median
        readonly List<Point> smooth = new List<Point>();     // last MoveWindowSec of smoothed readings
        long fillingIndex = long.MinValue;
        bool fillingUsable, fillingHeld;
        bool monitoring;
        long settleUntil, moveHoldUntil = Never;
        bool tenseLatched, highLatched;
        NudgeState last = new NudgeState();

        public NudgeDetector(Settings settings) { cfg = settings; }

        public bool Monitoring { get { return monitoring; } }
        public NudgeState Last { get { return last; } }

        public void Reset()
        {
            minutes.Clear(); filling.Clear(); raw.Clear(); smooth.Clear();
            fillingIndex = long.MinValue;
            monitoring = false;
            moveHoldUntil = Never;
            tenseLatched = highLatched = false;
            last = new NudgeState();
        }

        // Begin counting minutes toward the baseline and the nudge. The first `settleMinutes` are ignored
        // because heart rate is still coming down from whatever came before.
        public void StartMonitoring(long now, int settleMinutes)
        {
            monitoring = true;
            settleUntil = now + settleMinutes * 60000L;
            fillingUsable = false;
            tenseLatched = highLatched = false;
        }

        public void StopMonitoring()
        {
            monitoring = false;
            fillingUsable = false;
            last.Monitoring = false;
            last.RunMinutes = 0;
            last.HighMinutes = 0;
            last.Due = Due.None;
        }

        static long FloorDiv(long a, long b)
        {
            long q = a / b;
            return (a % b != 0 && (a < 0) != (b < 0)) ? q - 1 : q;
        }

        static double Median(List<double> v)
        {
            v.Sort();
            int m = v.Count / 2;
            return v.Count % 2 == 1 ? v[m] : (v[m - 1] + v[m]) / 2.0;
        }

        // The newest minutes are kept out of the baseline so an episode cannot raise its own bar.
        int Lag { get { return Math.Max(5, cfg.NudgeMinutes); } }

        public NudgeState Push(long t, int bpm)
        {
            if (bpm < MinBpm || bpm > MaxBpm) return new NudgeState();

            // Movement shape: a rise of MoveJumpBpm or more inside MoveWindowSec, judged on a 3-point median.
            raw.Add(new Point { T = t, V = bpm });
            while (raw.Count > 3 || (raw.Count > 0 && t - raw[0].T > 5000)) raw.RemoveAt(0);
            var three = new List<double>();
            foreach (Point p in raw) three.Add(p.V);
            int smoothed = (int)Math.Round(Median(three));
            while (smooth.Count > 0 && t - smooth[0].T > MoveWindowSec * 1000L) smooth.RemoveAt(0);
            int low = smoothed;
            foreach (Point p in smooth) if (p.V < low) low = p.V;
            if (smoothed - low >= MoveJumpBpm) moveHoldUntil = t + MoveHoldOffMin * 60000L;
            smooth.Add(new Point { T = t, V = smoothed });

            long index = FloorDiv(t, 60000);
            Due due = Due.None;
            if (index != fillingIndex)
            {
                if (fillingIndex != long.MinValue) due = CloseMinute();
                fillingIndex = index;
                filling.Clear();
                fillingUsable = monitoring && t >= settleUntil;
                fillingHeld = t < moveHoldUntil;
            }
            filling.Add(bpm);
            if (!monitoring || t < settleUntil) fillingUsable = false;
            if (t < moveHoldUntil) fillingHeld = true;

            last.Valid = true;
            last.Bpm = bpm;
            last.Monitoring = monitoring;
            last.HoldOff = t < moveHoldUntil;
            last.Due = due;
            return last;
        }

        // Called when a minute of readings is complete. Returns what, if anything, has just become due.
        Due CloseMinute()
        {
            var values = new List<double>();
            foreach (int v in filling) values.Add(v);
            var done = new Minute { Index = fillingIndex, Usable = fillingUsable, Held = fillingHeld };
            done.Ok = values.Count >= MinSamplesPerMinute;
            done.Value = values.Count > 0 ? Median(values) : 0;
            minutes.Add(done);
            while (minutes.Count > 0 && minutes[0].Index < done.Index - 90) minutes.RemoveAt(0);

            // Baseline: median of usable minutes in the half hour that ended Lag minutes ago.
            long newest = done.Index - Lag, oldest = newest - BaselineWindowMin;
            var window = new List<double>();
            foreach (Minute m in minutes)
                if (m.Ok && m.Usable && m.Index <= newest && m.Index > oldest) window.Add(m.Value);
            bool has = window.Count >= MinBaselineMinutes;
            double baseline = has ? Median(window) : 0;
            double threshold = baseline + cfg.NudgeDelta;

            int run = 0, high = 0;
            bool countingRun = has, countingHigh = true;
            long expect = done.Index;
            for (int i = minutes.Count - 1; i >= 0 && (countingRun || countingHigh); i--)
            {
                Minute m = minutes[i];
                if (m.Index != expect || !m.Ok || !m.Usable) break;
                // Readings at or above the high limit belong to the check-in below, not to a breathing nudge.
                if (countingRun && !m.Held && m.Value >= threshold && m.Value < cfg.HighLimit) run++; else countingRun = false;
                if (countingHigh && m.Value >= cfg.HighLimit) high++; else countingHigh = false;
                expect--;
            }

            last.HasBaseline = has;
            last.Baseline = baseline;
            last.Threshold = threshold;
            last.Rise = has && done.Ok ? done.Value - baseline : 0;
            last.RunMinutes = run;
            last.HighMinutes = high;

            if (run == 0) tenseLatched = false;
            if (high == 0) highLatched = false;
            if (high >= HighMinutesNeeded && !highLatched) { highLatched = true; tenseLatched = true; return Due.High; }
            if (run >= cfg.NudgeMinutes && !tenseLatched) { tenseLatched = true; return Due.Tense; }
            return Due.None;
        }
    }

    public enum StudyPhase { Off, Work, BreakDue, Break, BackDue }
    public enum StudyEvent { None, HeadsUp, BreakDue, BreakOver }

    // Keeps the rhythm of a study session: work block, short break, and a longer break after about two hours.
    //  - 25-minute blocks are the only interval tested in randomized student trials; longer blocks are a setting.
    //  - Breaks of 5 to 10 minutes; breaks of 3 minutes were disliked and did no better.
    //  - A 20 to 30 minute break after about two hours is taken from school test data.
    public sealed class StudyClock
    {
        public const long HeadsUpMs = 120000, SnoozeMs = 300000, ExtendMs = 300000;
        public const int MaxSnoozes = 2, LongAfterWorkedMin = 100, LongBreakMin = 20;

        readonly Settings cfg;
        public StudyPhase Phase = StudyPhase.Off;
        public int Blocks;             // blocks finished
        public long WorkedMs;          // total study time this session
        public int Snoozes;
        public bool BreakIsLong;
        public int BreakMinutes;
        long workedSinceLong, blockStart, blockEnd, breakEnd;
        bool headsUpSent, extended;

        public StudyClock(Settings settings) { cfg = settings; }

        public static int ShortBreakFor(int blockMin) { return blockMin <= 25 ? 5 : 8; }

        public bool CanSnooze { get { return Snoozes < MaxSnoozes; } }
        public bool CanExtend { get { return !extended; } }
        public int BlockNumber { get { return Blocks + 1; } }

        public void Start(long now)
        {
            Blocks = 0; WorkedMs = 0; workedSinceLong = 0;
            BeginBlock(now);
        }

        void BeginBlock(long now)
        {
            blockStart = now;
            blockEnd = now + cfg.BlockMin * 60000L;
            Snoozes = 0;
            headsUpSent = false;
            Phase = StudyPhase.Work;
        }

        void PlanBreak(long now)
        {
            long sinceLong = workedSinceLong + (now - blockStart);
            BreakIsLong = sinceLong >= LongAfterWorkedMin * 60000L;
            BreakMinutes = BreakIsLong ? LongBreakMin : ShortBreakFor(cfg.BlockMin);
        }

        public StudyEvent Tick(long now)
        {
            if (Phase == StudyPhase.Work)
            {
                if (now >= blockEnd)
                {
                    PlanBreak(now);
                    Phase = StudyPhase.BreakDue;
                    return StudyEvent.BreakDue;
                }
                if (!headsUpSent && now >= blockEnd - HeadsUpMs)
                {
                    headsUpSent = true;
                    return StudyEvent.HeadsUp;
                }
            }
            else if (Phase == StudyPhase.Break && now >= breakEnd)
            {
                Phase = StudyPhase.BackDue;
                return StudyEvent.BreakOver;
            }
            return StudyEvent.None;
        }

        // "Five more minutes" on a break prompt. `counted` is false when the prompt was simply closed.
        public void Snooze(long now, bool counted)
        {
            if (Phase != StudyPhase.BreakDue && Phase != StudyPhase.Work) return;
            if (counted) Snoozes++;
            blockEnd = now + SnoozeMs;
            headsUpSent = true;
            Phase = StudyPhase.Work;
        }

        public void BeginBreak(long now)
        {
            if (Phase != StudyPhase.Work && Phase != StudyPhase.BreakDue) return;
            PlanBreak(now);
            long worked = now - blockStart;
            WorkedMs += worked;
            workedSinceLong += worked;
            Blocks++;
            breakEnd = now + BreakMinutes * 60000L;
            extended = false;
            Phase = StudyPhase.Break;
        }

        public void ExtendBreak(long now)
        {
            if (Phase != StudyPhase.BackDue && Phase != StudyPhase.Break) return;
            extended = true;
            breakEnd = Math.Max(now, breakEnd) + ExtendMs;
            Phase = StudyPhase.Break;
        }

        public void NextBlock(long now)
        {
            if (Phase != StudyPhase.Break && Phase != StudyPhase.BackDue) return;
            if (BreakIsLong) workedSinceLong = 0;
            BeginBlock(now);
        }

        public void Stop(long now)
        {
            if (Phase == StudyPhase.Work || Phase == StudyPhase.BreakDue)
            {
                WorkedMs += now - blockStart;
                if (now - blockStart >= 60000) Blocks++;
            }
            Phase = StudyPhase.Off;
        }

        // Milliseconds left in the current block or break; zero when something is due.
        public long Remaining(long now)
        {
            if (Phase == StudyPhase.Work) return Math.Max(0, blockEnd - now);
            if (Phase == StudyPhase.Break) return Math.Max(0, breakEnd - now);
            return 0;
        }
    }

    public sealed class BreathStep
    {
        public readonly string Label, Say, Short;
        public readonly double Seconds;
        public readonly double To;   // how full the lungs are when the step ends, 0 to 1
        public readonly int Tone;
        public BreathStep(string label, string say, string shortSay, double seconds, double to, int tone)
        {
            Label = label; Say = say; Short = shortSay; Seconds = seconds; To = to; Tone = tone;
        }
    }

    public sealed class BreathPattern
    {
        public readonly string Key, Name, Note, Intro;
        public readonly BreathStep[] Steps;
        public readonly double CycleSeconds;
        public BreathPattern(string key, string name, string note, string intro, params BreathStep[] steps)
        {
            Key = key; Name = name; Note = note; Intro = intro; Steps = steps;
            double n = 0;
            foreach (BreathStep s in steps) n += s.Seconds;
            CycleSeconds = n;
        }
        public override string ToString() { return Name; }
    }

    public sealed class Phase
    {
        public int Cycle, Index;
        public BreathStep Step;
        public double Remaining, Fill;
    }

    public static class Breath
    {
        // The first pattern is the default: plain slow breathing at six breaths a minute with no holds is the
        // pace with the most evidence. The others have small-trial support and no shown advantage.
        public static readonly BreathPattern[] All =
        {
            new BreathPattern("slow46", "Slow breathing, 4 in and 6 out",
                "Six breaths a minute with no holds. The most tested pace.",
                "Breathe in through your nose for four seconds and out for six.",
                new BreathStep("Breathe in gently through your nose", "Breathe in gently", "In", 4, 1, 392),
                new BreathStep("Breathe out slowly", "and slowly out", "Out", 6, 0, 262)),
            new BreathPattern("slow55", "Slow breathing, 5 in and 5 out",
                "Also six breaths a minute. Studies find no reliable difference from 4 and 6, so pick by comfort.",
                "Breathe in through your nose for five seconds and out for five.",
                new BreathStep("Breathe in gently through your nose", "Breathe in gently", "In", 5, 1, 392),
                new BreathStep("Breathe out slowly", "and slowly out", "Out", 5, 0, 262)),
            new BreathPattern("sigh", "Cyclic sighing",
                "Two inhales, then a long exhale. Backed by one small trial; not shown to beat plain slow breathing.",
                "Breathe in through your nose, top it up with a second short inhale, then let a long breath out.",
                new BreathStep("Breathe in through your nose", "Breathe in through your nose", "In", 2.5, 0.8, 392),
                new BreathStep("Sip in a little more", "and a little more", "more", 1, 1, 494),
                new BreathStep("Long, slow exhale", "Long, slow exhale", "Slowly out", 6.5, 0, 262)),
            new BreathPattern("box", "Box breathing, 4-4-4-4",
                "In, hold, out, hold. Small trials only; the holds add no proven benefit.",
                "Breathe in for four seconds, hold for four, out for four, and hold for four.",
                new BreathStep("Breathe in gently", "Breathe in gently", "In", 4, 1, 392),
                new BreathStep("Hold", "Hold", "Hold", 4, 1, 330),
                new BreathStep("Breathe out", "Breathe out", "Out", 4, 0, 262),
                new BreathStep("Hold", "Hold", "Hold", 4, 0, 330))
        };

        public static BreathPattern Find(string key)
        {
            foreach (BreathPattern p in All) if (p.Key == key) return p;
            return null;
        }

        public static BreathPattern Get(string key) { return Find(key) ?? All[0]; }

        // Where in the pattern we are after `elapsed` seconds.
        public static Phase At(BreathPattern p, double elapsed)
        {
            if (elapsed < 0) elapsed = 0;
            int cycle = (int)Math.Floor(elapsed / p.CycleSeconds);
            double r = elapsed - cycle * p.CycleSeconds;
            double from = p.Steps[p.Steps.Length - 1].To;
            for (int i = 0; i < p.Steps.Length; i++)
            {
                BreathStep st = p.Steps[i];
                if (r < st.Seconds || i == p.Steps.Length - 1)
                {
                    double f = Math.Min(1, Math.Max(0, r / st.Seconds));
                    double ease = 0.5 - 0.5 * Math.Cos(Math.PI * f);
                    return new Phase
                    {
                        Cycle = cycle, Index = i, Step = st,
                        Remaining = Math.Max(0, st.Seconds - r),
                        Fill = from + (st.To - from) * ease
                    };
                }
                r -= st.Seconds;
                from = st.To;
            }
            return null;
        }
    }

    public static class Format
    {
        public static string Clock(double seconds)
        {
            int s = (int)Math.Max(0, Math.Round(seconds));
            return (s / 60).ToString(CultureInfo.InvariantCulture) + ":" + (s % 60).ToString("00", CultureInfo.InvariantCulture);
        }

        public static string Duration(long ms)
        {
            long minutes = (long)Math.Round(ms / 60000.0);
            if (minutes < 60) return minutes + " min";
            return (minutes / 60) + " h " + (minutes % 60) + " min";
        }
    }
}

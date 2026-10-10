// Runs the heart rate nudge rule, the study clock and the breathing logic against scripted inputs.
using System;
using System.Collections.Generic;
using Downshift;

static class Tests
{
    static int pass, fail;

    static void Check(string name, bool ok, string detail = null)
    {
        if (ok) { pass++; Console.WriteLine("ok   " + name); }
        else { fail++; Console.WriteLine("FAIL " + name + (detail != null ? "  -> " + detail : "")); }
    }

    sealed class Hit { public int S; public Due Due; }

    // One reading a second from `from` to `to` (seconds). Returns what became due and when.
    static List<Hit> Run(NudgeDetector d, int from, int to, Func<int, int> bpm)
    {
        var hits = new List<Hit>();
        for (int s = from; s < to; s++)
        {
            NudgeState v = d.Push(s * 1000L, bpm(s));
            if (v.Due != Due.None) hits.Add(new Hit { S = s, Due = v.Due });
        }
        return hits;
    }

    static string Show(List<Hit> hits)
    {
        var parts = new List<string>();
        foreach (Hit h in hits) parts.Add(h.Due + "@" + (h.S / 60) + ":" + (h.S % 60).ToString("00"));
        return "[" + string.Join(",", parts) + "]";
    }

    static int Rest(int s) { return 68 + (int)Math.Round(2 * Math.Sin(s / 11.0)); }
    const int M = 60;

    // A detector that has watched 30 calm minutes of a study session.
    static NudgeDetector Calm(Settings cfg = null)
    {
        var d = new NudgeDetector(cfg ?? new Settings());
        d.StartMonitoring(0, NudgeDetector.SettleStartMin);
        Run(d, 0, 30 * M, Rest);
        return d;
    }

    static int Main()
    {
        /* ---------- heart rate nudge ---------- */

        var d = new NudgeDetector(new Settings());
        d.StartMonitoring(0, NudgeDetector.SettleStartMin);
        var a = Run(d, 0, 45 * M, Rest);
        Check("45 calm minutes: no nudge", a.Count == 0, Show(a));
        Check("baseline is learned and near resting", d.Last.HasBaseline && Math.Abs(d.Last.Baseline - 68) <= 1.5, d.Last.Baseline.ToString());
        Check("threshold is baseline + 15", Math.Abs(d.Last.Threshold - d.Last.Baseline - 15) < 1e-9);

        // A rise of 18 bpm that builds over a minute and holds: this is the shape of seated stress.
        d = Calm();
        a = Run(d, 30 * M, 40 * M, s => Rest(s) + (int)Math.Min(18, (s - 30 * M) * 0.3));
        Check("+18 bpm held for minutes nudges exactly once", a.Count == 1 && a[0].Due == Due.Tense, Show(a));
        Check("nudge comes after five full minutes above the line", a.Count == 1 && a[0].S >= 35 * M && a[0].S <= 36 * M + 1, Show(a));
        a = Run(d, 40 * M, 70 * M, s => Rest(s) + 18);
        Check("still raised half an hour later: no repeat", a.Count == 0, Show(a));

        // Standing up: +16 within 8 seconds, gone in 30.
        d = Calm();
        a = Run(d, 30 * M, 30 * M + 30, s => Rest(s) + (s - 30 * M < 8 ? (s - 30 * M) * 2 : 16));
        a.AddRange(Run(d, 30 * M + 30, 40 * M, Rest));
        Check("standing up briefly: no nudge", a.Count == 0, Show(a));

        // Walking off: sharp +20, six minutes, then back.
        d = Calm();
        a = Run(d, 30 * M, 36 * M, s => Rest(s) + 20);
        Check("sharp jump is treated as movement", d.Last.HoldOff || a.Count == 0);
        a.AddRange(Run(d, 36 * M, 45 * M, Rest));
        Check("six minutes of walking: no nudge", a.Count == 0, Show(a));

        // Sharp jump that never comes down: the count restarts after the hold-off, then the nudge fires.
        d = Calm();
        a = Run(d, 30 * M, 45 * M, s => Rest(s) + 20);
        Check("sharp jump that stays up still nudges, later", a.Count == 1 && a[0].Due == Due.Tense && a[0].S >= 38 * M && a[0].S <= 40 * M, Show(a));

        // Slow drift upward is not an episode.
        d = Calm();
        a = Run(d, 30 * M, 70 * M, s => Rest(s) + (s - 30 * M) / 240);
        Check("slow drift (+1 bpm every 4 min): no nudge", a.Count == 0, Show(a));

        // Small rises stay quiet. Real exam stress averages under +10 bpm.
        d = Calm();
        a = Run(d, 30 * M, 50 * M, s => Rest(s) + 9);
        Check("+9 bpm for 20 minutes: no nudge", a.Count == 0, Show(a));

        // Nothing fires while a baseline is still being learned.
        d = new NudgeDetector(new Settings());
        d.StartMonitoring(0, NudgeDetector.SettleStartMin);
        a = Run(d, 0, 6 * M, Rest);
        a.AddRange(Run(d, 6 * M, 14 * M, s => Rest(s) + (int)Math.Min(20, (s - 6 * M) * 0.3)));
        Check("raised from the start of a session: no nudge", a.Count == 0, Show(a));

        // Not monitoring (outside a study session): nothing.
        d = new NudgeDetector(new Settings());
        a = Run(d, 0, 30 * M, Rest);
        a.AddRange(Run(d, 30 * M, 45 * M, s => Rest(s) + (int)Math.Min(20, (s - 30 * M) * 0.3)));
        Check("outside a session: no nudge and no baseline", a.Count == 0 && !d.Last.HasBaseline, Show(a));

        // A break: movement during it must not enter the baseline, and the first minutes back are ignored.
        d = Calm();
        d.StopMonitoring();
        a = Run(d, 30 * M, 35 * M, s => 100);
        d.StartMonitoring(35 * M * 1000L, NudgeDetector.SettleResumeMin);
        a.AddRange(Run(d, 35 * M, 38 * M, s => 100 - (s - 35 * M) / 6));
        a.AddRange(Run(d, 38 * M, 50 * M, Rest));
        Check("a break with movement: no nudge after", a.Count == 0, Show(a));
        Check("break minutes stay out of the baseline", Math.Abs(d.Last.Baseline - 68) <= 1.5, d.Last.Baseline.ToString());

        // High heart rate check-in: at or above the limit for ten minutes.
        d = Calm();
        a = Run(d, 30 * M, 45 * M, s => 136);
        Check("136 bpm for ten minutes gives the high check-in, once", a.Count == 1 && a[0].Due == Due.High && a[0].S >= 40 * M && a[0].S <= 41 * M, Show(a));
        d = Calm();
        a = Run(d, 30 * M, 38 * M, s => 136);
        a.AddRange(Run(d, 38 * M, 45 * M, Rest));
        Check("136 bpm for eight minutes: no check-in", a.FindAll(h => h.Due == Due.High).Count == 0, Show(a));

        // Dropouts break the count.
        d = Calm();
        a = Run(d, 30 * M, 33 * M, s => Rest(s) + (int)Math.Min(18, (s - 30 * M) * 0.3));
        a.AddRange(Run(d, 34 * M + 40, 38 * M, s => Rest(s) + 18));
        Check("a gap in readings restarts the count", a.Count == 0, Show(a));

        // Settings are honoured.
        d = Calm(new Settings { NudgeDelta = 10, NudgeMinutes = 3 });
        a = Run(d, 30 * M, 36 * M, s => Rest(s) + (int)Math.Min(12, (s - 30 * M) * 0.3));
        Check("+10 for 3 minutes setting catches a smaller, shorter rise", a.Count == 1 && a[0].S <= 35 * M, Show(a));

        // Bad readings and odd clocks.
        d = new NudgeDetector(new Settings());
        Check("0 and 300 bpm are rejected", !d.Push(0, 0).Valid && !d.Push(0, 300).Valid);
        d = new NudgeDetector(new Settings());
        d.StartMonitoring(-40 * M * 1000L, NudgeDetector.SettleStartMin);
        for (int s = -40 * M; s < 0; s++) d.Push(s * 1000L, Rest(s));
        d.Push(0, 68);
        Check("times before zero work (the demo seeds history this way)", d.Last.HasBaseline && Math.Abs(d.Last.Baseline - 68) <= 1.5, d.Last.Baseline.ToString());

        // Rationing: one per hour, three per day.
        var b = new Settings();
        long hour = 3600000;
        Check("first nudge of the day is allowed", b.BudgetAllows(10 * hour, NudgeDetector.Never, 100));
        b.BudgetSpend(100);
        Check("second nudge within the hour is held", !b.BudgetAllows(10 * hour + 59 * 60000, 10 * hour, 100));
        Check("second nudge after an hour is allowed", b.BudgetAllows(11 * hour, 10 * hour, 100));
        b.BudgetSpend(100); b.BudgetSpend(100);
        Check("fourth nudge of the day is held", !b.BudgetAllows(20 * hour, 12 * hour, 100));
        Check("next day the count starts again", b.BudgetAllows(30 * hour, 12 * hour, 101));

        /* ---------- study clock ---------- */

        long min = 60000;
        var cfg25 = new Settings();
        var c = new StudyClock(cfg25);
        c.Start(0);
        Check("no event mid-block", c.Tick(22 * min + 59000) == StudyEvent.None && c.Phase == StudyPhase.Work);
        Check("heads-up two minutes before the break", c.Tick(23 * min) == StudyEvent.HeadsUp);
        Check("heads-up is sent once", c.Tick(23 * min + 1000) == StudyEvent.None);
        Check("break is due at 25 minutes", c.Tick(25 * min) == StudyEvent.BreakDue && c.Phase == StudyPhase.BreakDue);
        Check("first break is 5 minutes, not a long one", c.BreakMinutes == 5 && !c.BreakIsLong);
        c.Snooze(25 * min, true);
        Check("snooze gives five more minutes of work", c.Phase == StudyPhase.Work && c.Remaining(25 * min) == 5 * min);
        Check("break is due again after the snooze, with no second heads-up", c.Tick(29 * min) == StudyEvent.None && c.Tick(30 * min) == StudyEvent.BreakDue);
        c.Snooze(30 * min, true);
        Check("two snoozes is the limit", !c.CanSnooze);
        c.Tick(35 * min);
        c.BeginBreak(35 * min);
        Check("break starts and the block is counted", c.Phase == StudyPhase.Break && c.Blocks == 1 && c.WorkedMs == 35 * min);
        Check("break ends after 5 minutes", c.Tick(39 * min + 59000) == StudyEvent.None && c.Tick(40 * min) == StudyEvent.BreakOver && c.Phase == StudyPhase.BackDue);
        c.ExtendBreak(40 * min);
        Check("a break can be extended once", c.Phase == StudyPhase.Break && !c.CanExtend && c.Tick(45 * min) == StudyEvent.BreakOver);
        c.NextBlock(45 * min);
        Check("next block starts clean", c.Phase == StudyPhase.Work && c.CanSnooze && c.BlockNumber == 2 && c.Remaining(45 * min) == 25 * min);

        // Four 25-minute blocks: the fourth break is the long one.
        c = new StudyClock(cfg25);
        long t = 0;
        c.Start(t);
        var kinds = new List<string>();
        for (int i = 0; i < 5; i++)
        {
            t += 25 * min; c.Tick(t); c.BeginBreak(t);
            kinds.Add(c.BreakMinutes + (c.BreakIsLong ? "L" : ""));
            t += c.BreakMinutes * min; c.Tick(t); c.NextBlock(t);
        }
        Check("25-minute blocks: breaks run 5, 5, 5, 20, 5", string.Join(",", kinds) == "5,5,5,20L,5", string.Join(",", kinds));

        c = new StudyClock(new Settings { BlockMin = 50 });
        t = 0; c.Start(t); kinds.Clear();
        for (int i = 0; i < 3; i++)
        {
            t += 50 * min; c.Tick(t); c.BeginBreak(t);
            kinds.Add(c.BreakMinutes + (c.BreakIsLong ? "L" : ""));
            t += c.BreakMinutes * min; c.Tick(t); c.NextBlock(t);
        }
        Check("50-minute blocks: breaks run 8, 20, 8", string.Join(",", kinds) == "8,20L,8", string.Join(",", kinds));

        c = new StudyClock(cfg25);
        c.Start(0);
        c.BeginBreak(10 * min);
        Check("a break can be taken early", c.Phase == StudyPhase.Break && c.WorkedMs == 10 * min);
        c = new StudyClock(cfg25);
        c.Start(0);
        c.Stop(12 * min);
        Check("ending mid-block keeps the time studied", c.Phase == StudyPhase.Off && c.WorkedMs == 12 * min && c.Blocks == 1);

        /* ---------- packets, breathing, settings ---------- */

        int bpm;
        Check("uint8 packet", HeartRatePacket.TryParse(new byte[] { 0x00, 72 }, out bpm) && bpm == 72);
        Check("uint16 packet", HeartRatePacket.TryParse(new byte[] { 0x01, 0x2c, 0x01 }, out bpm) && bpm == 300);
        Check("packet with contact + RR bytes", HeartRatePacket.TryParse(new byte[] { 0x16, 88, 0x00, 0x04, 0x00, 0x02 }, out bpm) && bpm == 88);
        Check("short and null packets rejected", !HeartRatePacket.TryParse(new byte[] { 0x00 }, out bpm) && !HeartRatePacket.TryParse(new byte[] { 0x01, 5 }, out bpm) && !HeartRatePacket.TryParse(null, out bpm));

        BreathPattern def = Breath.Get(new Settings().Pattern);
        Check("default pattern is 4 in, 6 out with no holds", def.Key == "slow46" && def.Steps.Length == 2 && def.Steps[0].Seconds == 4 && def.Steps[1].Seconds == 6);
        Check("default pace is six breaths a minute", Math.Abs(60 / def.CycleSeconds - 6) < 1e-9);
        Check("5 in, 5 out is also six a minute", Math.Abs(60 / Breath.Get("slow55").CycleSeconds - 6) < 1e-9);
        Check("default session is five minutes", new Settings().Minutes == 5);
        Check("t=0 starts the inhale, lungs empty", Breath.At(def, 0).Index == 0 && Breath.At(def, 0).Fill == 0);
        Check("t=4 starts the exhale, lungs full", Breath.At(def, 4).Index == 1 && Math.Abs(Breath.At(def, 4).Fill - 1) < 1e-9);
        Check("t=10 is the second breath", Breath.At(def, 10).Cycle == 1 && Breath.At(def, 10).Index == 0);
        BreathPattern box = Breath.Get("box");
        Check("box holds keep the lungs full, then empty", Math.Abs(Breath.At(box, 6).Fill - 1) < 1e-9 && Math.Abs(Breath.At(box, 14).Fill) < 1e-9);
        int bad = 0;
        foreach (BreathPattern p in Breath.All)
            for (double x = 0; x < 120; x += 0.013)
            {
                Phase ph = Breath.At(p, x);
                if (ph == null || ph.Fill < -1e-9 || ph.Fill > 1 + 1e-9) bad++;
            }
        Check("every pattern returns a valid phase at every instant", bad == 0, bad.ToString());
        Check("unknown pattern falls back to the default", Breath.Get("nope").Key == "slow46");

        var s1 = new Settings { NudgeMode = "always", NudgeDelta = 20, NudgeMinutes = 7, WaitMin = 90, DailyCap = 2, HighLimit = 140, PromptSound = true, BlockMin = 40, BreakSound = false, Pattern = "box", Minutes = 2, Voice = false, Tones = true, TutorialDone = true, Mute = true, Volume = 35, VoiceId = "HKEY\\Voices\\MSTTS_V110_enGB_GeorgeM", VoiceRate = -2, PairedAddress = 0xC0FFEE123456UL, PairedName = "WHOOP 4C0934521", Welcomed = true, PromptDay = 20261009, PromptCount = 2, TodayKey = 20261009, TodayBlocks = 3, TodayBreaths = 1, TodayStudyMs = 4500000 };
        Settings s2 = Settings.Parse(s1.Serialize());
        Check("settings round-trip", s2.NudgeMode == "always" && s2.NudgeDelta == 20 && s2.NudgeMinutes == 7 && s2.WaitMin == 90 && s2.DailyCap == 2 && s2.HighLimit == 140 && s2.PromptSound && s2.BlockMin == 40 && !s2.BreakSound && s2.Pattern == "box" && s2.Minutes == 2 && !s2.Voice && s2.Tones && s2.TutorialDone && s2.PromptDay == 20261009 && s2.PromptCount == 2);
        Check("sound, voice and pairing settings round-trip", s2.Mute && s2.Volume == 35 && s2.VoiceId == s1.VoiceId && s2.VoiceRate == -2 && s2.PairedAddress == 0xC0FFEE123456UL && s2.PairedName == "WHOOP 4C0934521" && s2.Welcomed && s2.TodayKey == 20261009 && s2.TodayBlocks == 3 && s2.TodayBreaths == 1 && s2.TodayStudyMs == 4500000);
        Settings s3 = Settings.Parse("Version=2\r\nNudgeDelta=9999\r\nPattern=bogus\r\ngarbage\r\nBlockMin=abc\r\nNudgeMode=sometimes\r\nVolume=400\r\nVoiceRate=-99\r\n");
        Check("bad settings are clamped or ignored", s3.NudgeDelta == 30 && s3.Pattern == "slow46" && s3.BlockMin == 25 && s3.NudgeMode == "study" && s3.Volume == 100 && s3.VoiceRate == -5);
        Settings old = Settings.Parse("Delta=30\nSustainSec=15\nHardLimit=130\nCooldownMin=10\nMinutes=2\nPattern=sigh\nVoice=1\nTones=1\nLastAddress=123456\n");
        Check("first-version settings are replaced by the new defaults, keeping the strap", old.Pattern == "slow46" && old.Minutes == 5 && old.NudgeDelta == 15 && old.PairedAddress == 123456UL && old.HasPairedStrap);
        Settings prior = Settings.Parse("Version=2\nPattern=box\nLastAddress=987654\n");
        Check("a strap saved by the previous build stays paired", prior.PairedAddress == 987654UL && prior.Pattern == "box" && !prior.Mute && prior.Volume == 70);
        var fresh = new Settings();
        Check("a new install has no paired strap and is not muted", !fresh.HasPairedStrap && !fresh.Mute && fresh.VoiceId == "" && fresh.VoiceRate == 0);
        var changed = new Settings { Mute = true, Volume = 10, Pattern = "box", NudgeDelta = 25, PairedAddress = 42, PairedName = "WHOOP X", TutorialDone = true, TodayBlocks = 2 };
        changed.ResetPreferences();
        Check("restore defaults resets preferences but keeps the strap", !changed.Mute && changed.Volume == 70 && changed.Pattern == "slow46" && changed.NudgeDelta == 15 && changed.PairedAddress == 42 && changed.PairedName == "WHOOP X" && changed.TutorialDone && changed.TodayBlocks == 2);
        var tally = new Settings { TodayKey = 20261009, TodayBlocks = 4, TodayBreaths = 2, TodayStudyMs = 100 };
        tally.Today(20261009);
        bool sameDay = tally.TodayBlocks == 4;
        tally.Today(20261010);
        Check("the daily tally rolls over at midnight only", sameDay && tally.TodayBlocks == 0 && tally.TodayBreaths == 0 && tally.TodayStudyMs == 0 && tally.TodayKey == 20261010);

        /* ---------- pairing ---------- */

        Check("paired strap matches by address", Pairing.Matches(0xAAUL, "WHOOP 4C0934521", 0xAAUL, ""));
        Check("paired strap matches by name at a new address", Pairing.Matches(0xAAUL, "WHOOP 4C0934521", 0xBBUL, "whoop 4c0934521 "));
        Check("another WHOOP does not match", !Pairing.Matches(0xAAUL, "WHOOP 4C0934521", 0xBBUL, "WHOOP 4A0711388"));
        Check("an unnamed strap at another address does not match", !Pairing.Matches(0xAAUL, "WHOOP 4C0934521", 0xBBUL, ""));
        Check("nothing matches when no strap is paired", !Pairing.Matches(0, "", 0xBBUL, "WHOOP 4A0711388") && !Pairing.Matches(0, "", 0xBBUL, ""));
        Check("short ID is the last four hex digits", Pairing.ShortId(0xD4A1C09E3B5FUL) == "3B:5F");
        Check("signal labels", Pairing.Signal(-48) == "Strong" && Pairing.Signal(-66) == "Good" && Pairing.Signal(-79) == "Weak");

        Check("clock and duration formatting", Format.Clock(0) == "0:00" && Format.Clock(102.4) == "1:42" && Format.Duration(75 * min) == "1 h 15 min" && Format.Duration(25 * min) == "25 min");

        Console.WriteLine();
        Console.WriteLine(pass + " passed, " + fail + " failed");
        return fail == 0 ? 0 : 1;
    }
}

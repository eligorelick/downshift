// Tones and spoken cues. Everything here respects the Mute setting and the volume, and every call is safe
// on a PC with no audio device or no speech voices.
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace Downshift
{
    static class Sound
    {
        const uint SND_ASYNC = 0x0001, SND_NODEFAULT = 0x0002, SND_MEMORY = 0x0004;
        const int Rate = 22050;

        [DllImport("winmm.dll")]
        static extern bool PlaySound(IntPtr sound, IntPtr module, uint flags);

        struct Note { public double Freq, Start, Dur, Gain; }

        public static Settings Config = new Settings();

        // WAVs stay pinned for the life of the app because Windows plays them from our memory.
        static readonly Dictionary<string, IntPtr> cache = new Dictionary<string, IntPtr>();

        // A quiet two-note cue: a break has ended, or (if switched on) a heart rate nudge has appeared.
        public static void Soft()
        {
            Play("soft", new[]
            {
                new Note { Freq = 523, Start = 0.00, Dur = 0.55, Gain = 0.30 },
                new Note { Freq = 659, Start = 0.24, Dur = 0.70, Gain = 0.30 }
            });
        }

        // The short tone at the start of each breath phase.
        public static void Tone(int freq)
        {
            Play("tone" + freq, new[] { new Note { Freq = freq, Start = 0, Dur = 0.45, Gain = 0.22 } });
        }

        static void Play(string key, Note[] notes)
        {
            if (Config.Mute || Config.Volume <= 0) return;
            try
            {
                int step = (Config.Volume + 5) / 10;   // eleven loudness steps, so at most eleven copies of each sound
                key = key + "@" + step;
                IntPtr wav;
                if (!cache.TryGetValue(key, out wav))
                {
                    byte[] bytes = Build(notes, step / 10.0);
                    wav = GCHandle.Alloc(bytes, GCHandleType.Pinned).AddrOfPinnedObject();
                    cache[key] = wav;
                }
                PlaySound(wav, IntPtr.Zero, SND_ASYNC | SND_MEMORY | SND_NODEFAULT);
            }
            catch (Exception) { }
        }

        static byte[] Build(Note[] notes, double volume)
        {
            double total = 0;
            foreach (Note n in notes) total = Math.Max(total, n.Start + n.Dur);
            int count = (int)(total * Rate) + 1;
            var mix = new double[count];
            foreach (Note n in notes)
            {
                int start = (int)(n.Start * Rate), len = (int)(n.Dur * Rate);
                for (int i = 0; i < len && start + i < count; i++)
                {
                    double t = i / (double)Rate;
                    double attack = Math.Min(1, t / 0.02);
                    double decay = Math.Exp(-5.0 * t / n.Dur);
                    double tail = Math.Min(1, (len - i) / (0.02 * Rate));
                    mix[start + i] += Math.Sin(2 * Math.PI * n.Freq * t) * n.Gain * volume * attack * decay * tail;
                }
            }
            using (var ms = new MemoryStream())
            using (var w = new BinaryWriter(ms))
            {
                int dataBytes = count * 2;
                w.Write(new[] { 'R', 'I', 'F', 'F' }); w.Write(36 + dataBytes);
                w.Write(new[] { 'W', 'A', 'V', 'E' });
                w.Write(new[] { 'f', 'm', 't', ' ' }); w.Write(16);
                w.Write((short)1); w.Write((short)1); w.Write(Rate); w.Write(Rate * 2); w.Write((short)2); w.Write((short)16);
                w.Write(new[] { 'd', 'a', 't', 'a' }); w.Write(dataBytes);
                for (int i = 0; i < count; i++)
                {
                    double v = Math.Max(-1, Math.Min(1, mix[i]));
                    w.Write((short)(v * 32000));
                }
                w.Flush();
                return ms.ToArray();
            }
        }
    }

    sealed class VoiceChoice
    {
        public readonly string Id, Name;
        public VoiceChoice(string id, string name) { Id = id; Name = name; }
        public override string ToString() { return Name; }
    }

    // A text-to-speech engine. Rate runs from -5 (slowest) to 5 (fastest); volume from 0 to 100.
    interface IVoiceEngine
    {
        string EngineName { get; }
        List<VoiceChoice> Voices();
        void Configure(string voiceId, int rate, int volume);
        void Say(string text);
        void Hush();
    }

    // Spoken cues. Windows has two sets of voices: the newer ones managed in Settings > Time & language > Speech,
    // and the older desktop ones. The newer set is used when it works, because voices added in Settings appear
    // there; the older set is the fallback.
    static class Voice
    {
        static IVoiceEngine engine;
        static bool triedModern, triedClassic;

        static Settings Config { get { return Sound.Config; } }

        public static string EngineName { get { Ensure(); return engine == null ? "" : engine.EngineName; } }

        static void Ensure()
        {
            if (engine != null) return;
            if (!triedModern)
            {
                triedModern = true;
                try { engine = CreateModern(); } catch (Exception) { engine = null; }
            }
            if (engine == null && !triedClassic)
            {
                triedClassic = true;
                try { engine = CreateClassic(); } catch (Exception) { engine = null; }
            }
            if (engine != null) Apply();
        }

        // Kept in their own methods so a PC without that speech system fails here, where it is caught.
        [MethodImpl(MethodImplOptions.NoInlining)]
        static IVoiceEngine CreateModern()
        {
            var e = new ModernVoice(delegate { Fallback(); });
            return e.Voices().Count > 0 ? e : null;
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        static IVoiceEngine CreateClassic()
        {
            var e = new ClassicVoice();
            return e.Voices().Count > 0 ? e : null;
        }

        // The modern engine failed while speaking; drop to the classic one for the rest of this run.
        static void Fallback()
        {
            engine = null;
            Ensure();
        }

        public static List<VoiceChoice> Voices()
        {
            Ensure();
            try { return engine == null ? new List<VoiceChoice>() : engine.Voices(); }
            catch (Exception) { return new List<VoiceChoice>(); }
        }

        // Push the chosen voice, speed and volume to the engine. Call after settings change.
        public static void Apply()
        {
            if (engine == null) return;
            try { engine.Configure(Config.VoiceId, Config.VoiceRate, Config.Volume); }
            catch (Exception) { }
        }

        // Breathing cues and prompts: only when spoken cues are on.
        public static void Say(string text)
        {
            if (!Config.Voice) return;
            Speak(text);
        }

        // The Test button: speaks even if spoken cues are off, but never when muted.
        public static bool Speak(string text)
        {
            if (Config.Mute || Config.Volume <= 0) return false;
            Ensure();
            if (engine == null) return false;
            try { engine.Say(text); return true; }
            catch (Exception) { return false; }
        }

        public static void Hush()
        {
            if (engine == null) return;
            try { engine.Hush(); }
            catch (Exception) { }
        }
    }

    // The older desktop voices (System.Speech).
    sealed class ClassicVoice : IVoiceEngine
    {
        readonly System.Speech.Synthesis.SpeechSynthesizer synth;

        public ClassicVoice()
        {
            synth = new System.Speech.Synthesis.SpeechSynthesizer();
            synth.SetOutputToDefaultAudioDevice();
        }

        public string EngineName { get { return "classic"; } }

        public List<VoiceChoice> Voices()
        {
            var list = new List<VoiceChoice>();
            foreach (System.Speech.Synthesis.InstalledVoice v in synth.GetInstalledVoices())
            {
                if (!v.Enabled) continue;
                string name = v.VoiceInfo.Name.Replace("Microsoft ", "").Replace(" Desktop", "");
                list.Add(new VoiceChoice(v.VoiceInfo.Name, name + " (" + v.VoiceInfo.Culture.DisplayName + ")"));
            }
            return list;
        }

        public void Configure(string voiceId, int rate, int volume)
        {
            if (!string.IsNullOrEmpty(voiceId))
            {
                try { synth.SelectVoice(voiceId); } catch (Exception) { }
            }
            synth.Rate = Math.Max(-10, Math.Min(10, rate * 2 - 1));   // a touch slower than normal suits breathing cues
            synth.Volume = Math.Max(0, Math.Min(100, volume));
        }

        public void Say(string text)
        {
            synth.SpeakAsyncCancelAll();
            synth.SpeakAsync(text);
        }

        public void Hush() { synth.SpeakAsyncCancelAll(); }
    }
}

// The voices managed in Windows Settings > Time & language > Speech. Any voice the person adds there shows up here.
using System;
using System.Collections.Generic;
using Windows.Media.Core;
using Windows.Media.Playback;
using Windows.Media.SpeechSynthesis;

namespace Downshift
{
    sealed class ModernVoice : IVoiceEngine
    {
        readonly SpeechSynthesizer synth = new SpeechSynthesizer();
        readonly MediaPlayer player = new MediaPlayer();
        readonly Action failed;
        int turn;
        MediaSource playing;
        SpeechSynthesisStream playingStream;

        public ModernVoice(Action onFailure)
        {
            failed = onFailure;
            // Keep these short clips out of the Windows media overlay and the keyboard's play/pause keys.
            try { player.CommandManager.IsEnabled = false; } catch (Exception) { }
            player.AutoPlay = false;
        }

        public string EngineName { get { return "modern"; } }

        public List<VoiceChoice> Voices()
        {
            var list = new List<VoiceChoice>();
            foreach (VoiceInformation v in SpeechSynthesizer.AllVoices)
                list.Add(new VoiceChoice(v.Id, v.DisplayName.Replace("Microsoft ", "") + " (" + v.Language + ")"));
            return list;
        }

        public void Configure(string voiceId, int rate, int volume)
        {
            if (!string.IsNullOrEmpty(voiceId))
            {
                foreach (VoiceInformation v in SpeechSynthesizer.AllVoices)
                    if (v.Id == voiceId) { synth.Voice = v; break; }
            }
            else
            {
                try { synth.Voice = SpeechSynthesizer.DefaultVoice; } catch (Exception) { }
            }
            // Speaking rate arrived in a later Windows 10 release; older ones just keep the normal speed.
            try { synth.Options.SpeakingRate = Math.Max(0.6, Math.Min(2.0, 0.92 + rate * 0.12)); } catch (Exception) { }
            try { player.Volume = Math.Max(0, Math.Min(100, volume)) / 100.0; } catch (Exception) { }
        }

        public async void Say(string text)
        {
            int mine = ++turn;
            try
            {
                SpeechSynthesisStream stream = await synth.SynthesizeTextToStreamAsync(text);
                if (mine != turn) { stream.Dispose(); return; }   // something newer was asked for while this was being prepared
                MediaSource oldSource = playing;
                SpeechSynthesisStream oldStream = playingStream;
                playing = MediaSource.CreateFromStream(stream, stream.ContentType);
                playingStream = stream;
                player.Source = playing;
                player.Play();
                // The previous clip is finished with once the player has moved on.
                try { if (oldSource != null) oldSource.Dispose(); } catch (Exception) { }
                try { if (oldStream != null) oldStream.Dispose(); } catch (Exception) { }
            }
            catch (Exception)
            {
                if (failed != null) failed();
            }
        }

        public void Hush()
        {
            turn++;
            try { player.Pause(); } catch (Exception) { }
        }
    }
}

namespace Downshift
{
    sealed class EvidenceSection
    {
        public readonly string Title;
        public readonly string[] Points;
        public EvidenceSection(string title, params string[] points) { Title = title; Points = points; }
    }

    // The plain-language evidence notes shown on the Evidence page. Every default in the app traces to a line here.
    static class Evidence
    {
        public const string Intro =
            "Evidence reviewed October 2026. Numbers called a starting point are reasoned from the studies but have not themselves been tested; change them in Settings if they do not suit you.";

        public static readonly EvidenceSection[] Sections =
        {
            new EvidenceSection("What to expect",
                "Feeling calmer for a short while after slow breathing, and less tired with regular breaks. Both are supported.",
                "No trial shows that breathing prompts or any break schedule raises grades. For marks, the strong evidence is for testing yourself, spreading study over days, and sleeping well for weeks (Dunlosky 2013; Okano 2019)."),

            new EvidenceSection("Breathing",
                "Default: 4 seconds in, 6 out, no holds, about six breaths a minute. Slow breathing has the largest evidence base (Laborde 2022, 223 studies) and slower is better down to about six a minute (Czub 2024, 828 people).",
                "5 in and 5 out is equally good. Careful tests find no reliable benefit from a longer exhale (Meehan & Shaffer 2024; Birdee 2023).",
                "Cyclic sighing and box breathing stay as options. Sighing rests on one small trial (Balban 2023) that has not been repeated at scale; breath holds add no proven benefit (Marchant 2025).",
                "Default length: 5 minutes. Sessions under 5 minutes were linked to failed interventions and longer than 5 adds nothing (Bentley 2023; You 2021). The 2-minute option has only small pilot studies behind it.",
                "Breathe gently. In one small study 6 of 16 beginners over-breathed on their first day (Szulczewski 2019). Slower, not deeper. If you feel dizzy, stop and breathe normally.",
                "Practice when calm. Guided instruction and repeated practice mark the breathing programmes that worked (Bentley 2023). Use Practice with instructions on the Home page a few times in your first week.",
                "The app asks how tense you feel before and after, and does not score you on heart rate. Average heart rate barely changes with slow breathing (Shao 2024), and the trials measured how people felt.",
                "The overall effect on stress is small to medium (Fincham 2023, 12 trials). In the largest blinded trial a placebo pace helped just as much (Fincham 2023, 400 people). Expect a modest benefit."),

            new EvidenceSection("Heart rate nudge",
                "Heart rate alone cannot tell stress from movement, and no study validates it as a stress detector. So the app asks whether you feel tense and never tells you that you are.",
                "Stress while sitting still adds roughly 4 to 21 bpm and lasts minutes (Bigalke 2022; Cook 2026); real exams added about 9 bpm (Pakhomov 2020). Standing up adds about 16 bpm within seconds and is over in half a minute (Heidelbach 2026). A WHOOP strap is accurate at rest but can be off by tens of beats second by second during posture changes (Van Oost 2025).",
                "So the nudge looks for a modest rise that lasts: 15 bpm above your seated baseline for 5 minutes in a row (a starting point), judged on per-minute medians. A sharp jump is treated as movement and restarts the count.",
                "The baseline is the median of the last half hour of sitting, leaving out the newest minutes and the first five minutes of a session (a starting point).",
                "It runs during study sessions only by default, because that is when you are sitting.",
                "At most one nudge an hour and three a day (a starting point). Interruptions cost errors and stress (Altmann 2014; Mark 2008), and in the only trials of body-triggered prompts, stress fell just as much after randomly timed ones (Schwerdtfeger 2025). The nudge is silent and waits for a pause in typing.",
                "Most real study stress is too small to trigger it. Use Breathe whenever you feel tense.",
                "A raised heart rate is not a sign you will do badly. Feeling threatened slightly hurts working memory (Shields 2016), while the arousal that comes from exercise slightly helps thinking (Chang 2012).",
                "130 bpm or more for 10 minutes while seated shows a check-in, not an exercise. If it is unexplained, or you have chest pain, faintness or trouble breathing, get medical advice."),

            new EvidenceSection("Study breaks",
                "Short breaks reliably reduce fatigue and raise energy (Albulescu 2022, 22 studies). Their effect on performance in demanding work is small and uncertain.",
                "Default block: 25 minutes, then a 5-minute break. This is the only schedule tested in randomized student trials (Biwer 2023; Smits 2025), with mixed results. Blocks up to 50 minutes get an 8-minute break (a starting point). 52/17 and 90-minute cycles are folklore.",
                "After about two hours: a 20 to 30 minute break (Sievertsen 2016; the two-hour mark is a starting point).",
                "In the break, move or do guided relaxation. Both beat an unstructured break (Blasche 2018). Move if you are sluggish, breathe if you are tense, rest quietly after new material (Parra 2026). A phone break restored less in the one experiment that tested it (Kang & Kurtzberg 2019).",
                "Breathing may help most in the last minutes before a hard block or test, where the small cognitive studies sit (Laborde 2022; Pilcher 2025). Plausible, not confirmed.",
                "You get a two-minute heads-up and up to two five-minute delays, because stopping mid-thought is costly (Adamczyk & Bailey 2004). Note your next step before you stop (Leroy & Glomb 2018)."),

            new EvidenceSection("Your own data",
                "The session log records each nudge, your answer, and tension before and after breathing. After a few weeks it shows whether heart rate nudges land on tense moments for you. If they do not, turn them off in Settings and keep the break timer.")
        };

        public static readonly string[] Sources =
        {
            "Albulescu 2022, PLOS ONE, 10.1371/journal.pone.0272460",
            "Balban 2023, Cell Reports Medicine, 10.1016/j.xcrm.2022.100895",
            "Bentley 2023, Brain Sciences, 10.3390/brainsci13121612",
            "Bigalke 2022, PMC9401978",
            "Biwer 2023, British Journal of Educational Psychology, 10.1111/bjep.12593",
            "Blasche 2018, Stress and Health, 10.1002/smi.2830",
            "Czub 2024, Stress and Health, 10.1002/smi.3496",
            "Fincham 2023, Scientific Reports, 10.1038/s41598-022-27247-y and 10.1038/s41598-023-49279-8",
            "Laborde 2022, Neuroscience and Biobehavioral Reviews, 10.1016/j.neubiorev.2022.104711",
            "Meehan & Shaffer 2024, Applied Psychophysiology and Biofeedback, 10.1007/s10484-024-09637-2",
            "Pakhomov 2020, PMC7094857",
            "Schwerdtfeger 2025, PMC12371293",
            "Shields 2016, Neuroscience and Biobehavioral Reviews, 10.1016/j.neubiorev.2016.06.038",
            "Sievertsen 2016, PNAS, 10.1073/pnas.1516947113",
            "Van Oost 2025, PMC12568089"
        };

        public const string Closing =
            "The full review, with every source, is docs/evidence-review.md in the Downshift repository. Downshift is a self-regulation aid, not a medical device.";
    }
}

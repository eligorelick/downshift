# Evidence behind the defaults

Each default is labeled by the strength of its support: tested in studies, supported by smaller trials or associations, or a reasoned starting point that no study has tested in this form. The full review, with all sources and effect sizes, is in [evidence-review.md](evidence-review.md).

## What the research supports

- Breathing exercises give a small-to-medium reduction in self-reported stress compared with controls ([Fincham et al. 2023](https://doi.org/10.1038/s41598-022-27247-y)); for slow-paced breathing alone the stress effect was marginal ([Shao et al. 2024](https://doi.org/10.1007/s12671-023-02294-2)). In the largest blinded trial a placebo pace helped as much ([Fincham, Strauss & Cavanagh 2023](https://doi.org/10.1038/s41598-023-49279-8)).
- Short breaks reduce fatigue and raise energy; their effect on performance in demanding work is small and uncertain ([Albulescu et al. 2022](https://doi.org/10.1371/journal.pone.0272460)).
- No trial we know of links breathing prompts or any break schedule to better grades.

## Breathing

| Default | Why | Status |
|---|---|---|
| 4 s in, 6 s out, no holds | Slow breathing near six breaths a minute is a commonly used pace, tested in several of the trials here ([Laborde et al. 2022](https://doi.org/10.1016/j.neubiorev.2022.104711) found HRV rises with voluntary slow breathing); slower was better across the 6 to 12 breaths a minute range tested, which did not go below six ([Czub et al. 2024](https://doi.org/10.1002/smi.3496)) | Pace tested |
| 5 in, 5 out offered as equal | Two small tests (26 and 16 people) found no HRV difference between 1:1 and 1:2 breathing ([Meehan & Shaffer 2024](https://doi.org/10.1007/s10484-024-09637-2)), and one trial of 828 people found no significant relationship between breathing ratio and anxiety ([Czub et al. 2024](https://doi.org/10.1002/smi.3496)) | Small tests |
| Cyclic sighing steps: 2.5 s in, 1 s top-up, 6.5 s out (a 10-second cycle, six breaths a minute) | The protocol in [Balban et al. 2023](https://doi.org/10.1016/j.xcrm.2022.100895) is a slow inhale, a shorter second inhale, then a long exhale, and gives no second counts; the split of the 10 seconds is our choice | Starting point |
| Box breathing 4-4-4-4 (4 s in, hold, out, hold) | The conventional equal-count pattern ([Balban et al. 2023](https://doi.org/10.1016/j.xcrm.2022.100895) describe box breathing as equal inhale, hold and exhale durations); the 4-second count is a convention, not a tested value | Starting point |
| Cyclic sighing and box as options only | Sighing rests mainly on one small trial, with no large replication ([Balban et al. 2023](https://doi.org/10.1016/j.xcrm.2022.100895)); square and 4-7-8 breathing, which add holds, raised HRV less than six breaths a minute without them ([Marchant et al. 2025](https://doi.org/10.1007/s10484-025-09688-z)) | Small trials |
| 5-minute sessions | Sessions under 5 minutes were linked to failed interventions; longer was not associated with further benefit, p = 0.81 ([Bentley et al. 2023](https://doi.org/10.3390/brainsci13121612)) | Association |
| 2-minute option | Two small studies only: a 2-minute exercise in 56 students ([De Couck et al. 2019](https://doi.org/10.1016/j.ijpsycho.2019.02.011)) and a 1-minute pilot ([Riedl et al. 2026](https://doi.org/10.1080/10615806.2026.2659809)) | Pilot-grade |
| "Slower, not deeper" and a first-run explanation | Many beginners over-breathe (6 of 16 on day one; [Szulczewski 2019](https://doi.org/10.1371/journal.pone.0218550)); instruction marks the programs that worked (Bentley et al. 2023) | Association |
| Gentle, unforced breathing; stop if dizzy or uncomfortable | [NHS guidance](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/) recommends gentle breathing without forcing it. The stop advice is a precaution, not a tested app intervention | Starting point |
| Tension rating as the score, not heart rate | Average heart rate barely changes with slow breathing ([Shao et al. 2024](https://doi.org/10.1007/s12671-023-02294-2)) | Design inference |

## Heart rate companion and nudges

No study we found validates stress detection from heart rate alone. Every number in this section is a starting point.

The companion can run independently of manual Focus blocks. It offers a check-in, optional breathing and Snooze or Stop controls; no study cited here tests this complete companion or establishes that its prompts improve work, study or grades. Completed minute medians and the lagged baseline describe received readings. They are not a stress, focus or cognitive-readiness score. Optional self-reports remain the person's own ratings.

| Default | Why |
|---|---|
| Asks "Feeling tense?"; never states it | Heart rate is confounded by movement, and evidence that movement-corrected heart rate reflects emotion is limited ([Brouwer et al. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6054929/)) |
| +15 bpm above your rolling baseline (adjustable 10-30): median of at least 5 usable minute medians in a 30-minute window that ends before the newest 5 minutes, or the configured hold duration if longer | Stress without movement adds roughly 4 to 21 bpm ([Cook et al. 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC12743145/); [Bigalke et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9401978/)); real exams added about 9 around the times students reported, and about 4 in the first 20 minutes of scheduled exams ([Pakhomov et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7094857/)) |
| Held for 5 minutes, judged on per-minute medians | Stress lasts minutes; standing up adds about 16 bpm within about 8 seconds and has mostly settled by 30 seconds (still about 9 bpm up) ([Heidelbach et al. 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13018822/)); per-second wrist readings are less accurate during rapid heart rate changes and at motion onset, by an amount that depends on the device ([Van Oost et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12568089/)) |
| The first 5 minutes after companion Start or recovery are ignored; timed Focus resumes use 3 minutes after a break | Heart rate may still be coming down from whatever came before; these settling lengths are product choices, not findings |
| At least 30 uniquely timed samples per minute; a gap over 15 seconds breaks continuity; duplicate timestamps are ignored | Guards against sparse data counting as sustained change. These are engineering choices, not validated signal-quality or stress thresholds |
| Pauses during Workout, active breathing and timed breaks; resets on disconnect, readings over 15 seconds old, reported loss of skin contact or a source change | Missing intervals are not reconstructed. Unknown skin-contact status is accepted; it is not proof of good contact. Browsers can suspend background work, and closing the app stops monitoring |
| A sharp heart rate jump pauses the relative-rise count | An abrupt change may reflect movement or sensor error (our reading of the sources above, not a tested rule). Downshift has no movement detector and cannot establish the cause |
| "In focus" is the default setting; Home Start enables the independent companion and saves that monitoring choice | Sitting during work or study is an assumption, not a detected condition. Outside timed sessions, movement can make prompts less meaningful |
| Ordinary prompts: at most one an hour and three a day by default, silent; held until a 1.5-second pause in activity in this window, or 20 seconds regardless | Interruptions cost errors and stress ([Altmann et al. 2014](https://pubmed.ncbi.nlm.nih.gov/23294345/); [Mark et al. 2008](https://ics.uci.edu/~gmark/chi08-mark.pdf)); body-triggered prompts relieved stress no better than random ones ([Schwerdtfeger et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12371293/)) |
| 130 bpm for 10 minutes shows a separate check-in, not an exercise; at most once an hour, outside the ordinary 3-a-day budget | Borrowed from consumer high-heart-rate alerts, which require ten minutes of inactivity ([Apple](https://support.apple.com/en-gw/guide/watch/heart-rate-apda88aefe4c/6.0); [Garmin](https://www8.garmin.com/manuals/webhelp/GUID-C144B465-A0C8-4FE9-AFE6-41A3FE3F1D9A/EN-US/GUID-F00E423A-165E-4557-91EE-DC2EDF737E79.html)). Downshift cannot apply their inactivity condition and this is not a medical alert |
| Snooze for 15 minutes; Stop clears pending companion notices and sound; cooldowns and snooze survive preference resets | User control and interruption limits are product choices. Snooze restarts learning afterward; reloading does not replenish the ordinary prompt budget or the separate high-check-in cooldown |

## Sound and availability

These are product controls, not research-tested treatment components.

| Default | Why | Status |
|---|---|---|
| Fresh installs and preference resets mute all sound, with spoken guidance, tones and break sounds off; explicit saved choices are retained on loading | Sound is optional. Master mute, guidance off and zero volume prevent voice preview; mute and zero volume also stop current sound | Starting point |
| Choose and preview a browser/system voice; automatic selection uses local voices only | Naturalness and availability vary. A missing saved voice falls back to an available local voice without changing the saved preference; if none exists, it stays silent. Local availability does not guarantee offline playback | Starting point |
| Remote voice services require an explicit choice and receive generic cue text only; heart rate values are not spoken | The browser may send text to its voice provider. The app adds no voice account, API key or paid speech service | Starting point |
| Notifications are optional and requested through Enable notifications | Browser permission does not guarantee delivery or continuous background monitoring | Starting point |

## Focus breaks

These are the School preset, which keeps the 0.1.0 defaults. The Work preset, with a 45-minute block and a 15-minute long break, and the break-type suggestion are in [evidence-workout-work.md](evidence-workout-work.md).

| Default | Why | Status |
|---|---|---|
| 25-minute block, 5-minute break | Pomodoro-style fixed schedules (25/5 and variants such as 24/6) are the ones tested in student trials, with mixed results: better mood than self-regulated breaks in one, with 24/6 and 12/3 schedules ([Biwer et al. 2023](https://doi.org/10.1111/bjep.12593)); in another, fatigue rose and motivation fell faster with 25/5, while overall fatigue, motivation, productivity, task completion and flow did not differ ([Smits et al. 2025](https://doi.org/10.3390/bs15070861)); with 12/3 breaks, a third found no significant performance difference and better mood with self-regulated breaks ([Göksu et al. 2026](https://doi.org/10.3390/bs16071158)) | Tested, mixed results |
| 8-minute break after blocks of 26 to 50 minutes, 10 after longer | Within ten minutes, longer breaks were associated with larger performance effects; break length did not change the effect on vigor or fatigue (Albulescu et al. 2022) | Starting point |
| 20-minute break (field data: 20 to 30 minutes) at the end of the first block that brings you to 100 minutes or more of work (with the School default of 25-minute blocks, after four blocks, about two hours with breaks); timing is a starting point | School test data ([Sievertsen et al. 2016](https://doi.org/10.1073/pnas.1516947113)); a lunchtime park walk helped afternoon concentration ([Sianoja et al. 2018](https://doi.org/10.1037/ocp0000083)), so the app suggests stepping outside | Length from field data; timing is a starting point |
| Move, breathe or rest; leave the phone | Compared with an unstructured break, exercise added vigor and relaxation lowered fatigue ([Blasche et al. 2018](https://doi.org/10.1002/smi.2830)); a phone break restored less ([Kang & Kurtzberg 2019](https://doi.org/10.1556/2006.8.2019.21)) | Tested for mood and fatigue; the phone advice rests on one experiment |
| Work preset: 45-minute block, 5 to 10 minute breaks, 15-minute long break | In one experience-sampling study of 95 employees, breaks that were preferred and not left too late were associated with more resource recovery ([Hunter & Wu 2016](https://doi.org/10.1037/apl0000045)); we haven't seen a study that tests a block length for office work | Starting point; see [evidence-workout-work.md](evidence-workout-work.md) |
| Two-minute warning, two delays, a resume note | Interruptions between actions were rated less annoying than ones in the middle of an action, in 16 people (the paper puts the difference at 56%) ([Adamczyk & Bailey 2004](https://doi.org/10.1145/985692.985727)); a brief plan for resuming reduced attention residue (the paper's four studies supported its hypotheses) ([Leroy & Glomb 2018](https://doi.org/10.1287/orsc.2017.1184), abstract only) | Starting point |
| Snooze and extend: a break prompt can be snoozed for 5 more minutes (at most twice per block), and a break extended by 5 minutes (once per break) | Lets the person finish the action in hand, which is when interruptions annoy most (see the row above); the 5-minute lengths match the default break and no study tests them | Starting point |

## Verification note

All DOIs, PubMed and PMC identifiers were resolved against Crossref, PubMed and PMC, and the figures quoted here were checked against abstracts or open full texts (full text for, among others, Pakhomov 2020, Van Oost 2025, Bigalke 2022, Cook 2026, Luo 2018, Adamczyk & Bailey 2004, Iqbal & Bailey 2008, Lee 2015, Balban 2023, Albulescu 2022, Bosshard & Gomez 2024, Parra 2026, Shields 2016 and, for the figures quoted, Yoshikawa 2025, plus the Boucher & Dixon poster in full; most others against abstracts or database records). Sources whose full text could not be read are marked "abstract only" in the documents; they include Kim et al. 2017, Trougakos et al. 2014 and Leroy & Glomb 2018. The WHOOP stress monitor page and the American Heart Association tachycardia page refuse automated requests, so they were read from Internet Archive copies (January 2025); the NHS palpitations page was read directly.

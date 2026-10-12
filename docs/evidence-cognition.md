# Heart rate and cognitive performance

The question that started this project was whether heart rate can say when thinking is at its best, when to stop for a break, and what kind of break to take. This file covers the cognitive-performance research on that question; [evidence.md](evidence.md), [evidence-review.md](evidence-review.md) and [evidence-workout-work.md](evidence-workout-work.md) cover the rest. Defaults carry the same labels as there: tested in studies, supported by smaller trials or associations, or a reasoned starting point that no study has tested in this form. Every source was checked against its PubMed or Crossref record (authors, year, journal, DOI). Most were read as abstracts only; the numbered Sources list says which.

## Summary

- No study we know of gives an optimal heart rate for thinking, and the inverted-U "Yerkes-Dodson law" behind that idea is a weak foundation.
- Higher heart rate variability (HRV) goes with slightly better executive function across people. That is a resting, between-person link, and the device's bpm feed cannot measure it.
- Heart rate is a weak, confounded marker of mental effort or fatigue outside the lab. In one laboratory study, fatigue went with a lower heart rate, so the direction cannot be relied on.
- A rise in heart rate looks the same whether a person feels challenged or threatened. What differs is cardiac output and vascular resistance, which a heart rate sensor cannot see.
- Time of day, sleep and breaks have better evidence than heart rate. Movement breaks and slow breathing have small, short-lived cognitive benefits at best.
- We couldn't find a study that checks whether a wearable "readiness" or "recovery" score predicts same-day cognitive performance.

## 1. Arousal and performance: there is no heart-rate target

**What remains of Yerkes-Dodson.** The original 1908 law described how stimulus strength relates to habit formation on tasks of different difficulty; it was not about human arousal. A history of the law found that later authors recast it in terms of punishment, motivation, arousal, stress and performance, seldom said so, and often credited the changes to Yerkes and Dodson themselves ([Teigen 1994](https://doi.org/10.1177/0959354394044004), abstract only). A critical review of its use in work-stress management concluded it "has no basis in empirical fact" and that managers should not try to raise performance by adjusting stress ([Corbett 2015](https://doi.org/10.1108/JMP-03-2013-0085), abstract only).

**What the data show instead.** The effect of arousal depends on the task, the load and the timing, so there is no single curve. A meta-analysis of acute stress and executive function found working memory was impaired overall (g = -0.20, 34 studies), more so under high memory load (g = -0.30) than when load was not high (g = -0.05, not significant). Cognitive flexibility was impaired (g = -0.30, only 6 studies). Inhibition split in two: response inhibition improved (g = +0.30) while interference control got worse (g = -0.21) ([Shields et al. 2016](https://doi.org/10.1016/j.neubiorev.2016.06.038), results sections read). Exercise-induced arousal shows the same dependence on timing: tasks done during exercise were impaired on average (mean effect -0.14, with impairment seen only during the first 20 minutes), while tasks done afterwards improved (+0.20), with benefits for speeded processing and for memory storage and retrieval ([Lambourne & Tomporowski 2010](https://doi.org/10.1016/j.brainres.2010.03.091), abstract only).

So is there an optimal heart rate for thinking? Not one we could find. Searches of PubMed and the web turned up no study that sets a heart-rate range for cognitive performance, and none that validates one, so any "focus zone" would be invented. Status: no evidence.

## 2. Heart rate variability and cognition

The neurovisceral integration model proposes that the same prefrontal networks that control attention and emotion also regulate the heart ([Thayer & Lane 2000](https://doi.org/10.1016/S0165-0327(00)00338-4), abstract only), so higher vagally mediated HRV marks better self-regulation ([Thayer et al. 2009](https://doi.org/10.1007/s12160-009-9101-z), abstract only).

In pooled data the links are real but small:

| Review | Result | Caveat |
|---|---|---|
| [Forte et al. 2019](https://doi.org/10.3389/fnins.2019.00710) (20 studies, 19,431 people) | Lower parasympathetic and higher sympathetic activity went with worse performance across cognitive domains | Systematic review without pooled effect; few studies on executive function |
| [Magnon et al. 2022](https://doi.org/10.1016/j.cortex.2022.07.008) (13 studies) | r = 0.19 between vagally mediated HRV and executive function; stronger for inhibition and flexibility than working memory | Correlational; depends on HRV measure and age |
| [Holzman & Bridgett 2017](https://doi.org/10.1016/j.neubiorev.2016.12.032) (123 studies, N = 14,347) | r = 0.09 with top-down self-regulation | Larger in older adults and in published studies |
| [Zahn et al. 2016](https://doi.org/10.1016/j.biopsycho.2015.12.007) (24 articles) | r = 0.15 between resting HRV and self-control tasks | Evidence of publication bias |

**State versus trait.** These are mostly resting, between-person correlations: people with higher resting HRV tend to do slightly better. They do not show that a high reading today predicts a good thinking day. Whether raising HRV now improves the next task is not settled. Thayer and colleagues reported that manipulating resting HRV was associated with changes in executive-function performance in their own studies ([Thayer et al. 2009](https://doi.org/10.1007/s12160-009-9101-z), abstract only). In 78 adults compared with a television control, three 5-minute bouts of slow breathing gave better Stroop accuracy and working-memory scores, but the effect was not mediated by cardiac vagal activity ([Laborde et al. 2022](https://doi.org/10.1027/0269-8803/a000279), abstract only).

**Why Downshift cannot use it.**
- HRV is computed from the intervals between heartbeats ([Shaffer & Ginsberg 2017](https://doi.org/10.3389/fpubh.2017.00258)), not from a once-a-second bpm average.
- The Bluetooth heart-rate profile allows RR-interval data (Espressif's implementation documents an RR-interval presence flag) ([Espressif documentation](https://docs.espressif.com/projects/esp-iot-solution/en/latest/bluetooth/ble_hrs.html)). We could not confirm whether WHOOP's broadcast includes RR intervals (see [platform-support.md](platform-support.md)). The app parses RR if present but does not rely on it.
- A review of non-ECG pulse-rate variability methods (photoplethysmography and others; it was not specific to wrist sensors, and its findings on sensor position were not conclusive) found that physical activity and some mental stressors often impair agreement with ECG-derived HRV "to an inacceptable extent" ([Schäfer & Vagedes 2013](https://doi.org/10.1016/j.ijcard.2012.03.119), abstract only). The one wearable HRV validation we found tested devices overnight: against ECG in 13 adults over 536 nights, WHOOP 4.0 had moderate agreement (CCC 0.94, error 8.2%) and Oura Gen 4 high agreement (CCC 0.99, error 6.0%) ([Dial et al. 2025](https://doi.org/10.14814/phy2.70527), abstract only). We couldn't find one for daytime wrist HRV during desk work.

## 3. Heart rate as a marker of mental workload

A systematic review of 58 studies of physiological workload measures (ECG, breathing, skin, blood pressure, eyes) concluded that "there is no single measure that clearly discriminates mental workload" ([Charles & Nixon 2019](https://doi.org/10.1016/j.apergo.2018.08.028), abstract only). A meta-analysis found several cardiac measures respond to workload manipulations, with HRV measures sensitive to task load, event rate and task duration; it called for future work to test combining several metrics and to validate the conditions under which each is best interpreted ([Hughes et al. 2019](https://doi.org/10.1177/0018720819830553), abstract only). The first drew heavily on safety-critical applications; the setting mix of the second is not in its abstract. Our own inference, which neither review states, is that the useful signals are the beat-to-beat ones.

Mean heart rate alone does worse in daily life, for three reasons:
- **The signal is small.** In students with a Fitbit, heart rate ran 8.9 bpm above baseline around the exams they reported (3.9 bpm in the first 20 minutes of scheduled exams) and 3.2 bpm above during other stressors ([Pakhomov et al. 2020](https://doi.org/10.1371/journal.pone.0229942)). Posture and movement swings are larger (standing up adds about 16 bpm at its peak and quiet standing about 13, physical activity about 19, roughly twice the exam rise; climbing stairs far more), as [evidence-review.md](evidence-review.md) documents.
- **Fatigue can move it the other way.** Over about 90 minutes of a demanding memory task, heart rate fell and vagal HRV rose, while some of the same variability indices also rose, more weakly, in people merely watching documentaries ([Matuz et al. 2021](https://doi.org/10.1371/journal.pone.0238670), abstract only). In a review of mental fatigue and physical performance, heart rate during the subsequent physical task was unaffected by prior mental fatigue ([Van Cutsem et al. 2017](https://doi.org/10.1007/s40279-016-0672-0), abstract only).
- **Other influences.** Caffeine, warmth, illness and digestion may also move heart rate; this review did not source any of them or their size, so none is quantified here.

Status: association at best; no validated use of bpm alone.

## 4. Stress, exams and the challenge-versus-threat pattern

**Anxiety and performance.** A meta-analysis of 238 studies found test anxiety negatively related to a wide range of educational outcomes, with small-to-moderate magnitudes ([von der Embse et al. 2018](https://doi.org/10.1016/j.jad.2017.11.048), abstract only). Much of this may work through preparation, not freezing on the day: in 309 medical students, test anxiety stopped predicting the exam score once knowledge (mock-exam results) was controlled for, and high trait anxiety predicted smaller knowledge gains during preparation ([Theobald et al. 2022](https://doi.org/10.1177/09567976221119391), abstract only). So the first target is how someone studies, not a spike in the exam hall.

**Challenge versus threat.** In the biopsychosocial model, both states speed and strengthen the heartbeat. They differ in vascular resistance and cardiac output: challenge goes with dilation and more blood pumped, threat with constriction and less ([Seery 2013](https://doi.org/10.1111/spc3.12052), abstract only). Cardiac output needs stroke volume, so a bpm feed cannot give it. A meta-analysis of 19 studies (17 articles, N = 1,045) found small links to performance for cardiac output (r = 0.14), vascular resistance (r = -0.13) and a combined index (r = 0.10) after correcting for publication bias, and found effects were not moderated by engagement indexed by heart rate and pre-ejection period ([Behnke & Kaczmarek 2018](https://doi.org/10.1016/j.ijpsycho.2018.04.007), abstract only). An update of 62 studies (N = 7,418) confirmed that challenge states went with better performance than threat states, with small effects ([Hase et al. 2025](https://doi.org/10.17179/excli2024-7995), abstract only). Heart rate itself is the part that does not separate the two.

**Reappraisal instead of "calm down".** Telling people that arousal helps performance has some support:
- GRE-takers told this scored higher on the math section, on practice and real tests ([Jamieson et al. 2010](https://doi.org/10.1016/j.jesp.2009.08.015)). Reappraisal produced more efficient cardiovascular responses in a lab stressor ([Jamieson et al. 2012](https://doi.org/10.1037/a0025719)), and reappraising anxiety as excitement beat trying to calm down in karaoke, speaking and math tasks ([Brooks 2014](https://doi.org/10.1037/a0035325)). In 339 community-college students, a reappraisal message before an exam raised that exam score and the next one ([Jamieson et al. 2022](https://doi.org/10.1037/xge0000893)).
- A meta-analysis of 44 effect sizes found a small average gain in task performance (d = 0.23, falling to 0.14 after trim-and-fill correction for publication bias, full text), about the same for reappraisal alone (0.22), tending to be larger for public performance than written cognitive tasks (0.34 versus 0.20; not significant, p = 0.064); the authors call the interventions "not silver bullets" ([Bosshard & Gomez 2024](https://doi.org/10.1038/s41598-024-58408-w)).
- A 2026 replication across 12 science courses at seven institutions found no effect on test anxiety or performance ([Thormodsæter et al. 2026](https://doi.org/10.1187/cbe.25-04-0055)).

Net: a small, inconsistent benefit for evaluative situations such as an exam or talk. It is untested for ordinary desk work. Status: starting point.

## 5. When is thinking at its best?

**Time of day.** A review of circadian effects concluded that time of day affects attention, executive function and memory, and depends on how well the testing time matches a person's chronotype ([Schmidt et al. 2007](https://doi.org/10.1080/02643290701754158), abstract only). A newer systematic review of 65 studies is less tidy. More than 80% found no main effect of chronotype, and 29 of 64 studies of adults aged 18-45 (45%; 10 of 12 in older adults) showed a better-at-preferred-time effect, mostly in attention, inhibition and memory, with limited evidence that it was affected by task complexity and lighting ([Chauhan et al. 2025](https://doi.org/10.1080/07420528.2025.2490495), abstract only). The mid-afternoon dip is real for some measures and some people, tied to sleep propensity, and is made worse by a high-carbohydrate lunch ([Monk 2005](https://doi.org/10.1016/j.csm.2004.12.002), abstract only). In Danish school data test scores fell about 0.9% of a standard deviation per hour later in the day and recovered 1.7% after a 20-to-30-minute break ([Sievertsen et al. 2016](https://doi.org/10.1073/pnas.1516947113)).

**Sleep.** A meta-analysis of 70 articles on short-term total sleep deprivation (under 48 hours) found effects from small and not significant (reasoning accuracy, g = -0.13) to large (lapses in simple attention, g = -0.78) ([Lim & Dinges 2010](https://doi.org/10.1037/a0018883), abstract only). Lapses in simple attention showed the largest effect. This is acute total deprivation, not habitual short sleep.

**Resting heart rate and readiness scores.** Oura lists its Readiness contributors as lowest resting heart rate, body temperature, sleep quality and prior-day activity, plus HRV, sleep and activity balance, and describes it as how prepared you are for the day; the page makes no cognitive claim ([Oura support](https://support.ouraring.com/hc/en-us/articles/360025589793-Readiness-Score)). A WHOOP community post (not official documentation) says Recovery is built from HRV, resting heart rate and sleep and indicates readiness for intense activity ([WHOOP community](https://www.community.whoop.com/t/what-is-the-recovery-score-and-how-is-it-calculated/107)). Searches of PubMed and the web turned up no study that tests either score, or morning heart rate or HRV, against same-day cognitive performance. The device-validity studies above test whether the sensor is accurate; none asks whether the score predicts thinking. Our search was limited, so this is a gap and not proof of absence. Still, nothing here supports a cognitive-readiness number. Status: no evidence.

## 6. Breaks, fatigue and the vigilance decrement

**Time on task.** Accuracy on monitoring tasks falls over time, and reviews conclude that vigilance "requires hard mental work and is stressful", with lower task engagement and higher distress, more so as difficulty rises ([Warm et al. 2008](https://doi.org/10.1518/001872008X312152), abstract only). In one lab experiment, briefly switching to another task goal prevented the decline, which the authors read as a case against simple resource depletion ([Ariga & Lleras 2011](https://doi.org/10.1016/j.cognition.2010.12.007), abstract only). It is a basic-science result and the diversion was not a break away from the screen.

**What mental fatigue does.** Prior cognitive effort lowers later physical performance (g = -0.38, 73 studies), mainly isometric (-0.57), motor (-0.57), dynamic resistance (-0.51) and aerobic (-0.26) performance, and not maximal anaerobic work (+0.10, not significant) ([Brown et al. 2020](https://doi.org/10.1007/s40279-019-01204-8), abstract only). An earlier review identified higher perceived exertion as the most important factor behind the decline in endurance performance ([Van Cutsem et al. 2017](https://doi.org/10.1007/s40279-016-0672-0), abstract only). A 2026 trial in 117 people found 45 minutes of Stroop worsened later reaction time and raised perceived exertion and fatigue, with a trend toward worse cycling (p = 0.059) ([Habay et al. 2026](https://doi.org/10.1249/MSS.0000000000003852), abstract only). For Downshift's Workout mode, the practical point is small: a long study block before lifting may make hard physical effort feel harder (shown for cycling).

**Can markers detect it in the field?** Not yet. In the one randomized comparison we found, RMSSD separated people who had done a calculation task from rested controls with an AUC of 0.62, against 0.69 for a single self-rated fatigue item; the authors describe the two as similar, and both are weak ([Yoshikawa et al. 2025](https://doi.org/10.1371/journal.pmen.0000240); abstract plus the AUC note in the full text). Combined with Section 3, the clock and a one-tap rating are no worse instruments than heart rate, and cheaper. For what breaks do for performance see [Albulescu et al. 2022](https://doi.org/10.1371/journal.pone.0272460) (d = 0.36 vigor, 0.35 fatigue, 0.16 performance, not significant; within the ten-minute range, longer breaks were associated with larger performance effects, while break length did not change the effect on vigor or fatigue), covered in evidence.md.

## 7. Acute exercise and cognition

| Source | Result | Notes |
|---|---|---|
| [Chang et al. 2012](https://doi.org/10.1016/j.brainres.2012.02.068) (79 studies) | g = 0.10 overall; similar during, right after and after a delay | Duration, intensity, task type and fitness moderated (abstract does not say which levels) |
| [Lambourne & Tomporowski 2010](https://doi.org/10.1016/j.brainres.2010.03.091) | After exercise +0.20; during exercise -0.14, only in the first 20 min | Cycling helped during and after; treadmill running hurt during |
| [Ludyga et al. 2016](https://doi.org/10.1111/psyp.12736) (40 studies) | Moderate aerobic exercise: g = 0.35 for speed, 0.22 for accuracy of executive tasks | Bigger in children and older adults for reaction time; fitness did not matter |
| [Garrett et al. 2024](https://doi.org/10.1038/s44271-024-00124-2) (113 studies, young adults) | g = 0.13; better working memory and inhibition, faster reactions | Bayesian; trim-and-fill for bias |
| [Chang et al. 2025](https://doi.org/10.1037/bul0000460) (meta-review, 30 reviews) | Mean SMD 0.33; largest when tested after exercise (0.32) | Intensity, type and duration did not moderate |

Reading: acute exercise gives a small boost to attention and executive tasks. Timing moderated effects in two of the reviews above (Lambourne & Tomporowski 2010; Chang 2025) but not in Chang 2012, which found similar effects during, right after and after a delay. The abstracts do not show that moderate intensity is best: Ludyga included only moderate exercise, Chang 2012 reported that intensity moderated effects without saying which level, and the 2025 meta-review of 30 reviews found no moderation by intensity. Intensity findings conflict. These abstracts do not report bouts as short as a 5-to-10-minute break, so applying them to a break is an extrapolation. Status: tested in labs, starting point for break length.

## 8. Breathing and cognition

- **Reviews.** A meta-analysis of heart rate variability biofeedback (58 randomized studies) found a small-to-moderate benefit overall, largest for anxiety, depression, anger and athletic or artistic performance, and larger against inactive controls; its abstract does not isolate cognitive outcomes, and it uses beat-to-beat feedback ([Lehrer et al. 2020](https://doi.org/10.1007/s10484-020-09466-z), abstract only). A systematic review of 15 slow-breathing studies reported higher HRV and respiratory sinus arrhythmia, more EEG alpha, and greater comfort, relaxation, vigor and alertness with less anxiety, anger and arousal ([Zaccaro et al. 2018](https://doi.org/10.3389/fnhum.2018.00353), abstract only). Neither says breathing improves work output.
- **Direct tests.** Three 5-minute slow-breathing bouts improved Stroop accuracy and working-memory scores, but not Stroop speed, in 78 adults ([Laborde et al. 2022](https://doi.org/10.1027/0269-8803/a000279)). One session raised working-memory scores in 139 students, while the mood gain faded after the task ([Pilcher et al. 2025](https://doi.org/10.1080/10615806.2025.2505897)). In 216 students the benefit on a decision task was tied to higher perceived stress ([Byrne et al. 2025](https://doi.org/10.1016/j.actpsy.2025.105222)). In 48 adults 5 minutes of slow breathing did not change average Stroop performance, apart from higher accuracy in men at the fifth minute ([Liang et al. 2023](https://doi.org/10.3389/fpsyg.2023.1155134)).
- **Gap.** As of October 2026 we found only a protocol for a systematic review of slow breathing and cognition in healthy people ([Ramquar et al. 2025](https://doi.org/10.1186/s13643-025-03004-w)).

Status: small trials with mixed results; plausible, unconfirmed.

## What this means for Downshift

| Finding | App behavior it supports |
|---|---|
| No validated HR target; arousal effects depend on task and timing (1) | No "focus zone"; heart rate only appears as a number |
| HRV link is small, resting and needs RR data (2) | No HRV score and no HRV-based advice |
| HR is weak and confounded for workload and fatigue (3, 6) | Break timing comes from the clock; the nudge only asks |
| HR rises with both challenge and threat (4) | The nudge says "Feeling tense?" and never states a state |
| Reappraisal helps a little in evaluative situations (4) | No reappraisal wording was added (see changes below) |
| Time of day matters, individually (5) | User's own 1-5 sharpness rating, shown back as their own pattern |
| No test of readiness scores against thinking (5) | No cognitive-readiness score, not even a borrowed one |
| Time on task wears attention; breaks restore mood and energy (6) | Scheduled breaks (evidence.md) |
| Acute exercise gives a small cognitive boost; slow breathing is mixed (7, 8) | Break type chosen by the user's own report of Tense, Tired or Fine: Tired suggests moving; Tense suggests breathing |

### What the app does not do, and why

- It does not offer an "optimal heart rate for focus". Section 1 found no evidence-based range.
- It does not compute a cognitive-readiness or recovery score. Nothing in the literature we searched links one to same-day thinking.
- It does not compute HRV. We could not confirm that the supported broadcasts send the beat-to-beat intervals HRV needs, and wrist HRV is unproven outside rest.
- It does not diagnose stress, fatigue or lost focus. The nudge asks; you answer.
- It does not pick break type from heart rate. Break type follows self-report.
- It does not infer chronotype or best time of day from heart rate. Time-of-day patterns come only from the user's own ratings.
- It does not claim breaks, movement or breathing raise grades or output. The documented gains are mood, energy and, for movement and breathing, small short-lived lab effects.

### Defaults supported by this review

| Default | Why | Status |
|---|---|---|
| Break content chosen by self-report (Tense / Tired / Fine), not by heart rate | Heart rate does not separate tension from effort or movement (Sections 3, 4); fatigue markers are no better than a one-item rating (Yoshikawa 2025) | Design inference |
| "Tired" suggests a walk or stretch | Acute exercise gives a small cognitive benefit (Chang 2012; Garrett 2024), larger when measured after exercise in two reviews (Chang 2025; Lambourne 2010) | Tested in labs; break length is a starting point |
| "Tense" suggests 5 minutes of slow breathing during the break | Brief breathing improved Stroop and working memory in small trials; others found nothing (Laborde 2022; Pilcher 2025; Liang 2023) | Small trials; unconfirmed |
| Scheduled focus blocks and breaks, not heart-rate-triggered ones | Vigilance falls with time on task; markers detect fatigue poorly (Warm 2008; Yoshikawa 2025) | Association; block length is a starting point (evidence.md) |
| Nudge wording asks, never labels | Challenge and threat share a heart-rate rise; only cardiac output and vascular resistance differ (Seery 2013; Behnke 2018) | Design inference |
| 1-5 sharpness rating by time of day, shown as the user's own pattern | Time-of-day and synchrony effects are real but inconsistent and individual (Schmidt 2007; Chauhan 2025) | Design inference |
| Long break at the end of the first block that brings you to 100 minutes or more of work (with the School default of 25-minute blocks, after four blocks, about two hours with breaks) | Scores recovered after 20 to 30 minutes in school data (Sievertsen 2016) | Length from field data; timing is a starting point |

### Changes made because of this review

1. **No pre-selected feeling.** The break screen used to pre-select "Tense" when heart rate had been raised for several minutes. A raised heart rate is as likely to mean effort, and the answer is meant to come from the person, so Tense, Tired and Fine now start unselected. The heart rate is shown only as context ("Your heart rate was up for N minutes of this block").
2. **Softer nudge wording.** The nudge now says that a raised heart rate "can be effort as well as tension" before asking "Feeling tense?". No motivational reappraisal slogans were added: the average benefit of reappraisal is small (Bosshard & Gomez 2024) and a 2026 replication found none.
3. **Time-of-day ratings.** After a Focus session the app can ask how sharp you felt (1 to 5), and History shows your own averages by time of day once there are enough ratings. Heart rate cannot answer "when do I think best?" (Section 5), so the person's own ratings are the only defensible way to answer it.
4. **Checked: the nudge after a Move break.** Monitoring stops during every break and restarts with a three-minute settling period, and a nudge then needs five further minutes above the threshold, with any sharp jump restarting the count. The nudge detector's test suite includes a six-minute walk that does not trigger a nudge. No change was needed.

## What not to claim

- That Downshift knows when you will think best, or when you are focused, from heart rate.
- That any heart rate range is optimal for studying, writing or exams, or that stress "peaks performance" at a middle level.
- That a high or low heart rate means you are stressed, tired or mentally fatigued.
- That wearable HRV, recovery or readiness scores predict how well you will think today.
- That the app measures HRV, or that wrist HRV during desk work is accurate.
- That a rise in heart rate means threat rather than challenge, or the reverse.
- That telling yourself "this is excitement" raises exam scores; the average benefit is small and one 2026 replication found none.
- That a walk or slow breathing will improve your next task, beyond a small effect found in some lab studies.
- That mental fatigue can be detected from heart rate, or that your best hours can be read from it.
- That breaks, breathing or movement raise grades.

## Sources

Abstract only unless stated. PMIDs are in the linked records.

1. Teigen KH. Yerkes-Dodson: a law for all seasons. Theory Psychol 1994;4(4):525-547. [doi:10.1177/0959354394044004](https://doi.org/10.1177/0959354394044004) (record checked in Crossref; abstract read from the Crossref record)
2. Corbett M. From law to folklore: work stress and the Yerkes-Dodson Law. J Manag Psychol 2015;30(6):741-752. [doi:10.1108/JMP-03-2013-0085](https://doi.org/10.1108/JMP-03-2013-0085) (abstract only)
3. Shields GS, Sazma MA, Yonelinas AP. The effects of acute stress on core executive functions: a meta-analysis and comparison with cortisol. Neurosci Biobehav Rev 2016;68:651-668. [doi:10.1016/j.neubiorev.2016.06.038](https://doi.org/10.1016/j.neubiorev.2016.06.038) (PMID 27371161; results read in PMC5003767, all quoted effect sizes confirmed)
4. Lambourne K, Tomporowski P. The effect of exercise-induced arousal on cognitive task performance: a meta-regression analysis. Brain Res 2010;1341:12-24. [doi:10.1016/j.brainres.2010.03.091](https://doi.org/10.1016/j.brainres.2010.03.091) (PMID 20381468; abstract only)
5. Thayer JF, Lane RD. A model of neurovisceral integration in emotion regulation and dysregulation. J Affect Disord 2000;61:201-216. [doi:10.1016/S0165-0327(00)00338-4](https://doi.org/10.1016/S0165-0327(00)00338-4) (PMID 11163422; abstract only)
6. Thayer JF, Hansen AL, Saus-Rose E, Johnsen BH. Heart rate variability, prefrontal neural function, and cognitive performance: the neurovisceral integration perspective on self-regulation, adaptation, and health. Ann Behav Med 2009;37:141-153. [doi:10.1007/s12160-009-9101-z](https://doi.org/10.1007/s12160-009-9101-z) (PMID 19424767; abstract only)
7. Forte G, Favieri F, Casagrande M. Heart rate variability and cognitive function: a systematic review. Front Neurosci 2019;13:710. [doi:10.3389/fnins.2019.00710](https://doi.org/10.3389/fnins.2019.00710) (PMID 31354419; abstract only)
8. Magnon V, Vallet GT, Benson A, et al. Does heart rate variability predict better executive functioning? A systematic review and meta-analysis. Cortex 2022;155:218-236. [doi:10.1016/j.cortex.2022.07.008](https://doi.org/10.1016/j.cortex.2022.07.008) (PMID 36030561; abstract only)
9. Holzman JB, Bridgett DJ. Heart rate variability indices as bio-markers of top-down self-regulatory mechanisms: a meta-analytic review. Neurosci Biobehav Rev 2017;74:233-255. [doi:10.1016/j.neubiorev.2016.12.032](https://doi.org/10.1016/j.neubiorev.2016.12.032) (PMID 28057463; abstract only)
10. Zahn D, Adams J, Krohn J, et al. Heart rate variability and self-control: a meta-analysis. Biol Psychol 2016;115:9-26. [doi:10.1016/j.biopsycho.2015.12.007](https://doi.org/10.1016/j.biopsycho.2015.12.007) (PMID 26747415; abstract only)
11. Laborde S, Allen MS, Borges U, Hosang TJ, et al. The influence of slow-paced breathing on executive function. J Psychophysiol 2022;36(1):13-27. [doi:10.1027/0269-8803/a000279](https://doi.org/10.1027/0269-8803/a000279) (abstract via Crossref)
12. Shaffer F, Ginsberg JP. An overview of heart rate variability metrics and norms. Front Public Health 2017;5:258. [doi:10.3389/fpubh.2017.00258](https://doi.org/10.3389/fpubh.2017.00258) (PMID 29034226; abstract only)
13. Espressif. Heart Rate Service (documents the optional RR-Interval field of the Bluetooth heart rate measurement). [docs.espressif.com](https://docs.espressif.com/projects/esp-iot-solution/en/latest/bluetooth/ble_hrs.html)
14. Schäfer A, Vagedes J. How accurate is pulse rate variability as an estimate of heart rate variability? Int J Cardiol 2013;166:15-29. [doi:10.1016/j.ijcard.2012.03.119](https://doi.org/10.1016/j.ijcard.2012.03.119) (PMID 22809539; abstract only)
15. Dial MB, Hollander ME, Vatne EA, et al. Validation of nocturnal resting heart rate and heart rate variability in consumer wearables. Physiol Rep 2025;13(16):e70527. [doi:10.14814/phy2.70527](https://doi.org/10.14814/phy2.70527) (PMID 40834291; abstract only)
16. Charles RL, Nixon J. Measuring mental workload using physiological measures: a systematic review. Appl Ergon 2019;74:221-232. [doi:10.1016/j.apergo.2018.08.028](https://doi.org/10.1016/j.apergo.2018.08.028) (PMID 30487103; abstract only)
17. Hughes AM, Hancock GM, Marlow SL, et al. Cardiac measures of cognitive workload: a meta-analysis. Hum Factors 2019;61:393-414. [doi:10.1177/0018720819830553](https://doi.org/10.1177/0018720819830553) (PMID 30822151; abstract only)
18. Pakhomov SVS, Thuras PD, Finzel R, Eppel J, Kotlyar M. Using consumer-wearable technology for remote assessment of physiological response to stress in the naturalistic environment. PLoS One 2020;15:e0229942. [doi:10.1371/journal.pone.0229942](https://doi.org/10.1371/journal.pone.0229942) (PMID 32210441; full text read)
19. Matuz A, van der Linden D, Kisander Z, et al. Enhanced cardiac vagal tone in mental fatigue: analysis of heart rate variability in time-on-task, recovery, and reactivity. PLoS One 2021;16:e0238670. [doi:10.1371/journal.pone.0238670](https://doi.org/10.1371/journal.pone.0238670) (PMID 33657124; abstract only)
20. Van Cutsem J, Marcora S, De Pauw K, et al. The effects of mental fatigue on physical performance: a systematic review. Sports Med 2017;47:1569-1588. [doi:10.1007/s40279-016-0672-0](https://doi.org/10.1007/s40279-016-0672-0) (PMID 28044281; abstract only)
21. von der Embse N, Jester D, Roy D, Post J. Test anxiety effects, predictors, and correlates: a 30-year meta-analytic review. J Affect Disord 2018;227:483-493. [doi:10.1016/j.jad.2017.11.048](https://doi.org/10.1016/j.jad.2017.11.048) (PMID 29156362; abstract only)
22. Theobald M, Breitwieser J, Brod G. Test anxiety does not predict exam performance when knowledge is controlled for. Psychol Sci 2022;33:2073-2083. [doi:10.1177/09567976221119391](https://doi.org/10.1177/09567976221119391) (PMID 36221217; abstract only)
23. Seery MD. The biopsychosocial model of challenge and threat: using the heart to measure the mind. Soc Personal Psychol Compass 2013;7:637-653. [doi:10.1111/spc3.12052](https://doi.org/10.1111/spc3.12052) (record checked in Crossref; abstract read from the Crossref record)
24. Behnke M, Kaczmarek LD. Successful performance and cardiovascular markers of challenge and threat: a meta-analysis. Int J Psychophysiol 2018;130:73-79. [doi:10.1016/j.ijpsycho.2018.04.007](https://doi.org/10.1016/j.ijpsycho.2018.04.007) (PMID 29680521; abstract only)
25. Hase A, Nietschke M, Kloskowski M, et al. (Behnke M, last author). The effects of challenge and threat states on performance outcomes: an updated review and meta-analysis of recent findings. EXCLI J 2025;24:151-176. [doi:10.17179/excli2024-7995](https://doi.org/10.17179/excli2024-7995) (PMID 40027878; abstract only)
26. Jamieson JP, Mendes WB, Blackstock E, Schmader T. Turning the knots in your stomach into bows: reappraising arousal improves performance on the GRE. J Exp Soc Psychol 2010;46:208-212. [doi:10.1016/j.jesp.2009.08.015](https://doi.org/10.1016/j.jesp.2009.08.015) (PMID 20161454; abstract only)
27. Jamieson JP, Nock MK, Mendes WB. Mind over matter: reappraising arousal improves cardiovascular and cognitive responses to stress. J Exp Psychol Gen 2012;141:417-422. [doi:10.1037/a0025719](https://doi.org/10.1037/a0025719) (PMID 21942377; abstract only)
28. Brooks AW. Get excited: reappraising pre-performance anxiety as excitement. J Exp Psychol Gen 2014;143:1144-1158. [doi:10.1037/a0035325](https://doi.org/10.1037/a0035325) (PMID 24364682; abstract only)
29. Jamieson JP, Black AE, Pelaia LE, et al. Reappraising stress arousal improves affective, neuroendocrine, and academic performance outcomes in community college classrooms. J Exp Psychol Gen 2022;151:197-212. [doi:10.1037/xge0000893](https://doi.org/10.1037/xge0000893) (PMID 34292050; abstract only)
30. Bosshard M, Gomez P. Effectiveness of stress arousal reappraisal and stress-is-enhancing mindset interventions on task performance outcomes: a meta-analysis of randomized controlled trials. Sci Rep 2024;14:7923. [doi:10.1038/s41598-024-58408-w](https://doi.org/10.1038/s41598-024-58408-w) (PMID 38575696; abstract and full text, PMC10994935)
31. Thormodsæter RS, Ballen CJ, Fagbodun S, et al. Can we mitigate the impacts of test anxiety through reappraisal interventions? A replication study in science courses across multiple institution types in the United States. CBE Life Sci Educ 2026;25(1):ar9. [doi:10.1187/cbe.25-04-0055](https://doi.org/10.1187/cbe.25-04-0055) (PMID 41730015; abstract only)
32. Schmidt C, Collette F, Cajochen C, Peigneux P. A time to think: circadian rhythms in human cognition. Cogn Neuropsychol 2007;24:755-789. [doi:10.1080/02643290701754158](https://doi.org/10.1080/02643290701754158) (PMID 18066734; abstract only)
33. Chauhan S, Vanova M, Tailor U, et al. Chronotype and synchrony effects in human cognitive performance: a systematic review. Chronobiol Int 2025;42:463-499. [doi:10.1080/07420528.2025.2490495](https://doi.org/10.1080/07420528.2025.2490495) (PMID 40293205; abstract only)
34. Monk TH. The post-lunch dip in performance. Clin Sports Med 2005;24:e15-23. [doi:10.1016/j.csm.2004.12.002](https://doi.org/10.1016/j.csm.2004.12.002) (PMID 15892914; abstract only)
35. Sievertsen HH, Gino F, Piovesan M. Cognitive fatigue influences students' performance on standardized tests. Proc Natl Acad Sci USA 2016;113:2621-2624. [doi:10.1073/pnas.1516947113](https://doi.org/10.1073/pnas.1516947113) (PMID 26884183; abstract only)
36. Lim J, Dinges DF. A meta-analysis of the impact of short-term sleep deprivation on cognitive variables. Psychol Bull 2010;136:375-389. [doi:10.1037/a0018883](https://doi.org/10.1037/a0018883) (PMID 20438143; abstract only)
37. Oura. Readiness Score (support article). [support.ouraring.com](https://support.ouraring.com/hc/en-us/articles/360025589793-Readiness-Score) (company description, read via web fetch)
38. WHOOP community. What is the Recovery score, and how is it calculated? [community.whoop.com](https://www.community.whoop.com/t/what-is-the-recovery-score-and-how-is-it-calculated/107) (a user reply, not official documentation)
39. Warm JS, Parasuraman R, Matthews G. Vigilance requires hard mental work and is stressful. Hum Factors 2008;50:433-441. [doi:10.1518/001872008X312152](https://doi.org/10.1518/001872008X312152) (PMID 18689050; abstract only)
40. Ariga A, Lleras A. Brief and rare mental "breaks" keep you focused: deactivation and reactivation of task goals preempt vigilance decrements. Cognition 2011;118:439-443. [doi:10.1016/j.cognition.2010.12.007](https://doi.org/10.1016/j.cognition.2010.12.007) (PMID 21211793; abstract only)
41. Brown DMY, Graham JD, Innes KI, et al. Effects of prior cognitive exertion on physical performance: a systematic review and meta-analysis. Sports Med 2020;50:497-529. [doi:10.1007/s40279-019-01204-8](https://doi.org/10.1007/s40279-019-01204-8) (PMID 31873926; abstract only)
42. Habay J, Arenales Arauz YL, Proost M, et al. Mental fatigue negatively impacts cognitive and physical performance outcomes: a large-scale randomized crossover trial. Med Sci Sports Exerc 2026;58:225-241. [doi:10.1249/MSS.0000000000003852](https://doi.org/10.1249/MSS.0000000000003852) (PMID 40938104; abstract only)
43. Yoshikawa H, Adachi Y, Baba A, et al. Heart rate variability versus visual analog scale for objective and subjective mental fatigue detection: a randomized controlled trial. PLOS Ment Health 2025;2(1):e0000240. [doi:10.1371/journal.pmen.0000240](https://doi.org/10.1371/journal.pmen.0000240) (PMID 41661804; abstract plus the AUC figure in the full text, PMC12798607)
44. Albulescu P, Macsinga I, Rusu A, et al. "Give me a break!" A systematic review and meta-analysis on the efficacy of micro-breaks for increasing well-being and performance. PLoS One 2022;17:e0272460. [doi:10.1371/journal.pone.0272460](https://doi.org/10.1371/journal.pone.0272460) (PMID 36044424; abstract and full text, PMC9432722)
45. Chang YK, Labban JD, Gapin JI, Etnier JL. The effects of acute exercise on cognitive performance: a meta-analysis. Brain Res 2012;1453:87-101. [doi:10.1016/j.brainres.2012.02.068](https://doi.org/10.1016/j.brainres.2012.02.068) (PMID 22480735; abstract only)
46. Ludyga S, Gerber M, Brand S, Holsboer-Trachsler E, Pühse U. Acute effects of moderate aerobic exercise on specific aspects of executive function in different age and fitness groups: a meta-analysis. Psychophysiology 2016;53:1611-1626. [doi:10.1111/psyp.12736](https://doi.org/10.1111/psyp.12736) (PMID 27556572; abstract only)
47. Garrett J, Chak C, Bullock T, Giesbrecht B. A systematic review and Bayesian meta-analysis provide evidence for an effect of acute physical activity on cognition in young adults. Commun Psychol 2024;2:82. [doi:10.1038/s44271-024-00124-2](https://doi.org/10.1038/s44271-024-00124-2) (PMID 39242965; abstract only)
48. Chang YK, Ren FF, Li RH, et al. Effects of acute exercise on cognitive function: a meta-review of 30 systematic reviews with meta-analyses. Psychol Bull 2025;151:240-259. [doi:10.1037/bul0000460](https://doi.org/10.1037/bul0000460) (PMID 39883421; abstract only)
49. Lehrer P, Kaur K, Sharma A, et al. Heart rate variability biofeedback improves emotional and physical health and performance: a systematic review and meta analysis. Appl Psychophysiol Biofeedback 2020;45:109-129. [doi:10.1007/s10484-020-09466-z](https://doi.org/10.1007/s10484-020-09466-z) (PMID 32385728; abstract only)
50. Zaccaro A, Piarulli A, Laurino M, et al. How breath-control can change your life: a systematic review on psycho-physiological correlates of slow breathing. Front Hum Neurosci 2018;12:353. [doi:10.3389/fnhum.2018.00353](https://doi.org/10.3389/fnhum.2018.00353) (PMID 30245619; abstract only)
51. Pilcher JJ, Byrne KA, Weiskittel SE, et al. Brief slow-paced breathing improves working memory, mood, and stress in college students. Anxiety Stress Coping 2025;38:528-543. [doi:10.1080/10615806.2025.2505897](https://doi.org/10.1080/10615806.2025.2505897) (PMID 40392328; abstract only)
52. Byrne KA, Pilcher JJ, Liu Y, et al. A computational modeling approach to brief slow-paced breathing and mental health moderators of decision-making under uncertainty in college students. Acta Psychol 2025;258:105222. [doi:10.1016/j.actpsy.2025.105222](https://doi.org/10.1016/j.actpsy.2025.105222) (PMID 40614430; abstract only)
53. Liang WM, Xiao J, Ren FF, et al. Acute effect of breathing exercises on muscle tension and executive function under psychological stress. Front Psychol 2023;14:1155134. [doi:10.3389/fpsyg.2023.1155134](https://doi.org/10.3389/fpsyg.2023.1155134) (PMID 37303921; abstract only)
54. Ramquar SD, Tyagi C, Sharma B, et al. A systematic review protocol for slow-paced breathing in healthy populations: impacts on cognition and insights into mechanisms of action. Syst Rev 2025;15:6. [doi:10.1186/s13643-025-03004-w](https://doi.org/10.1186/s13643-025-03004-w) (PMID 41354819; protocol only)

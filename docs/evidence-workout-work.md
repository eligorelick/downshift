# Historical evidence for the former Workout and Work modes

> **Historical research archive.** Workout is retired from the current work and study companion. This document preserves the earlier combined review, including its settings, limitations and citations; it is not a description of the current interface. Use [evidence.md](evidence.md) and [evidence-work-study.md](evidence-work-study.md) for current defaults, and [legacy-workout.md](legacy-workout.md) for the preserved code and history.

This review covered the two then-newer modes; background is in [evidence.md](evidence.md). Defaults carry the same labels as there: tested in studies, supported by smaller trials or associations, or a reasoned starting point that no study has tested in this form. Sources were checked against PubMed or the publisher record. Unless a source says otherwise, we read only its abstract or database record. Lee 2015, Moghaddam 2026, Buskard 2017 and Buxton 2024 were read in full; the Fidalgo and Støve full texts are paywalled.

## Workout mode: rest between sets

### What the research supports

- For strength, short rests (under 60 s) still produce solid gains, but rests over 2 minutes seem needed to maximize gains in trained people. For untrained people 60-120 s looked sufficient ([Grgic et al. 2018](https://doi.org/10.1007/s40279-017-0788-x), 23 studies).
- For hypertrophy the picture is mixed. An earlier review found equivocal results with a possible edge for long rests in trained people ([Grgic et al. 2017](https://doi.org/10.1080/17461391.2017.1340524)). A Bayesian meta-analysis of 9 studies found a small benefit of resting over 60 s and no appreciable difference beyond 90 s, perhaps because lost volume load stops growing past that point ([Singer et al. 2024](https://doi.org/10.3389/fspor.2024.1429789)).
- In one 8-week trial in 21 trained men, 3-minute rests beat 1-minute rests for squat and bench 1RM and for thigh muscle thickness; muscular endurance gains were similar ([Schoenfeld et al. 2016](https://doi.org/10.1519/JSC.0000000000001272)).
- The classic review by goal ([de Salles et al. 2009](https://doi.org/10.2165/11315230-000000000-00000), 35 studies) puts 3-5 minutes with loads of 50-90% of 1RM and for absolute strength and power, 30-60 s for hypertrophy with moderate loads, and, with evidence it calls less clear and indirect, 20 s to 1 minute for muscular endurance. Treat these as practitioner conventions; the newer reviews above soften the hypertrophy figure.
- One study set rest by heart rate rather than the clock: lifters resumed when HR fell back to within 2 bpm of their own reading 45 s after the first working set. In 34 recreationally trained men doing bench press to failure at 60% 1RM, this gave more total repetitions than a fixed 60 s rest (55.1 vs 39.5) and a slower decline from set to set ([Buskard et al. 2017](https://www.asep.org/asep/asep/JEPonlineFEBRUARY2017_Andrew_Buskard.pdf)). It is a single small trial, and the hypertrophy benefit was extrapolated, not measured.
- Self-selected rest is not obviously worse than a fixed rest. In 16 trained men doing high-intensity interval resistance training, self-selected rests gave similar oxygen uptake, heart rate, recovery perception and enjoyment to fixed 10 s and 30 s rests ([Fidalgo et al. 2023](https://doi.org/10.1007/s00421-023-05246-9)). The fixed rests were only 10 s and 30 s, so it says little about heavy lifting with longer rests.
- Slow breathing between sets: in 18 trained men doing 5 sets of 3 back squats with 3-minute rests, 4-7-8 breathing neither helped nor hurt power, bar velocity, RPE or perceived recovery. Heart rate recovery was larger after sets 2 and 3 (about 48-51 vs 38-45 bpm) ([Buxton et al. 2024](https://doi.org/10.5114/jhk/185935)). So any breathing prompt should make no performance claim.

### Sensor accuracy during lifting

- A meta-analysis of 44 studies found wrist optical sensors accurate at rest and on the treadmill but off by an average of -7.3 bpm (underestimating) during resistance training, with error growing about 3 bpm per 10 bpm rise in HR ([Zhang et al. 2020](https://doi.org/10.1080/02640414.2020.1767348)).
- In 50 people doing 10-rep-max sets, only the Polar H7 chest strap and one pair of sports earphones met the 10% error criterion in both exercise modes, and across devices underestimation grew with intensity. Readings were taken after each set, not continuously ([Boudreaux et al. 2018](https://doi.org/10.1249/MSS.0000000000001471)).
- WHOOP 3.0 agreed highly with a Polar H10 during back squats, moderately during deadlifts and curl-to-press, and poorly during seated cable rows ([Støve & Hansen 2022](https://doi.org/10.1080/02640414.2023.2180160)). The abstract does not say which arm position it used.
- Placement matters. In 28 adults, three identical WHOOP 4.0 units agreed best with the chest strap when worn on the upper arm, ahead of the forearm and wrist; all degraded during burpees ([Moghaddam et al. 2026](https://doi.org/10.3390/s26010176)). That protocol was a cycling warm-up, burpees and a treadmill test, not weightlifting. We couldn't find a peer-reviewed validation of the bicep band during resistance exercise, or of WHOOP 5.0/MG in any setting.
- Wrist movement appears to hurt wrist sensors (the Mio's error was attributed to wrist movement during high-intensity interval exercise in [Bunn et al. 2019](https://doi.org/10.70252/LOOX1045), which used treadmill, outdoor and a mixed high-intensity interval circuit rather than set-based weightlifting), so a chest strap is the safest choice.

### Gaps

- No published method we came across detects set boundaries from heart rate alone. We assume heart rate lags the effort by seconds and is too flat across a workout to mark set boundaries, so set start and end are usually found with accelerometers. That is our reasoning, not a finding, so any set-end logic here is a design inference.
- Nothing we read gives the time course of HR in the first 1-3 minutes after a resistance set as a percentage of its pre-set value. The best available data points are Buskard (HR at 45 s after set 1 used as the personal target, with later rests growing longer), and Buxton (HR falls tens of bpm within the 3-minute rest). The "settled" thresholds below are therefore starting points.

### Defaults

| Default | Why | Status |
|---|---|---|
| Strength: rests over about 2 min seem needed to maximize gains in trained lifters (3-5 min at 50-90% of 1RM in an older review, de Salles 2009) | Grgic 2018; Schoenfeld 2016; de Salles 2009 | Tested for strength |
| Hypertrophy: at least 60-90 s, little extra gain past about 90 s; 2-3 min for big compound lifts as a starting point | Singer 2024 (benefit over 60 s, plateau near 90 s); Schoenfeld 2016 | Tested for outcomes; the compound-lift split is a starting point |
| Muscular endurance: 30-60 s (within the 20-60 s convention in de Salles 2009) | de Salles 2009 | Convention, not trial-tested here |
| Rest timer starts at set end and shows the floor, never "stop" | Minimums come from average group results; self-selected rests worked in one trial (Fidalgo 2023) | Design inference |
| Advisory "HR has settled": HR is within 10% of the pre-set reading, or flattened (under 2 bpm change over 15 s) and within 20%; if the set raised heart rate by less than 5 bpm, it counts as settled | Buskard used a personal HR target (within 2 bpm of a reading taken after set 1). No standard cutoff found | Starting point |
| "Take more time": heart rate has not settled by the time the minimum is up | Same reasoning; Buskard's lifters needed progressively more rest as sets went on | Starting point |
| Set-end suggestion from a sustained HR peak then fall (manual tap as primary) | No HR-only method found; we assume accelerometers are the usual approach (our reasoning, not a finding) | Starting point |
| Optional easy-breathing reminder between sets, no performance claim | Buxton 2024 tested 4-7-8 breathing (with holds): larger heart rate recovery after sets 2 and 3, no change in power or RPE. The app's easy-breathing cue itself is untested | 4-7-8 tested, null for performance; the cue is a starting point |
| Chest strap first choice; wrist sensors tend to read low, and the upper arm has no validation for lifting that we could find; show a "wrist sensors tend to read low while lifting" note | Zhang 2020; Boudreaux 2018; Moghaddam 2026 | Tested outside lifting for upper arm |
| Average HR over several seconds, discard readings that jump | Wrist sensors under-read during lifting and one study blamed wrist movement | Design inference |
| Rest caps: strength 300 s, hypertrophy 180 s, endurance 90 s | Past the cap the cue stops waiting for heart rate; the strength cap is long enough for the 3-5 minute figures in de Salles 2009 | Starting point |
| Set-end suggestion constants: at least 20 s into a set, a fall of at least 8 bpm from the in-set peak, falling for at least 10 s | No HR-only method found; chosen so the cue does not fire on the rise or on noise | Starting point |
| Artifact rule: a change of more than 25 bpm within 2 s, or no skin contact, suppresses heart rate cues | Jumps of that size are more likely sensor error or motion than physiology (our reasoning; the largest real rise we found within seconds was about 16 bpm over about 8 s on standing, [Heidelbach et al. 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13018822/)); wrist sensors under-read during lifting and one study blamed wrist movement | Starting point |
| Minimum rise for a "settled" judgment: the in-set peak must be at least 5 bpm above the pre-set reading | Below that the set barely moved heart rate, so there is nothing to recover from | Starting point |

## Work / study focus mode

### What the research supports

- Short breaks reduce fatigue and raise energy; the effect on performance in demanding work is small and uncertain ([Albulescu et al. 2022](https://doi.org/10.1371/journal.pone.0272460), covered in evidence.md).
- Preferred break activities and earlier breaks in the shift were associated with more resource recovery in 95 employees across 5 days, and longer breaks and frequent short breaks with more resources than infrequent short ones ([Hunter & Wu 2016](https://doi.org/10.1037/apl0000045)). Observational, experience-sampling data.
- In 86 South Korean office workers over 10 workdays, relaxation and social micro-breaks weakened the link between work demands and end-of-workday negative affect, while cognitive activities made it worse. Among food-or-drink breaks, only caffeinated beverages helped, in a post hoc analysis (abstract only; [Kim, Park & Niu 2017](https://doi.org/10.1002/job.2109)).
- Lunch-break autonomy matters. In an experience-sampling study, social and work activities during lunch switched from raising to lowering end-of-workday fatigue as the person's autonomy over the break increased; for relaxation, autonomy mattered only when levels of relaxation were low (abstract only; [Trougakos et al. 2014](https://doi.org/10.5465/amj.2011.1072)).
- In a 10-day field intervention, a 15-minute lunchtime park walk improved afternoon concentration and fatigue through enjoyment, while 15 minutes of relaxation exercises improved concentration through detachment and lowered strain and fatigue directly ([Sianoja et al. 2018](https://doi.org/10.1037/ocp0000083)).
- A 40-second look at an image of a flowering green roof, against one of bare concrete, led to fewer omission errors and steadier responses in 150 university students ([Lee et al. 2015](https://doi.org/10.1016/j.jenvp.2015.04.003)). One lab study on students, so a nature view is an option, not a rule.
- The DeskTime 52-minutes-work, 17-minutes-break figure comes from the top 10% of its users by share of time in productive apps, over one workday. It is descriptive and the company says there is "no one-size-fits-all approach". A 2021 re-run gave 112 minutes of work and a 26-minute break ([DeskTime](https://desktime.com/blog/52-17)). It cannot say what schedule causes good work.
- Time-of-day effects: a review of 65 studies found no main effect of chronotype on cognition in over 80% of them, but 29 of 64 studies of adults aged 18-45 (45%; 10 of 12 in older adults) found a synchrony effect (better at one's preferred time of day), mostly in attention, inhibition and memory, with limited evidence that task complexity and lighting affected it ([Chauhan et al. 2025](https://doi.org/10.1080/07420528.2025.2490495)). That supports letting people record when they feel sharp; it does not support inferring chronotype from heart rate.

### Defaults: Work vs School

| Default | Work preset | School preset | Why | Status |
|---|---|---|---|---|
| Focus block | 45 min, adjustable 25-60 | 25 min, adjustable 20-50 (20 kept from 0.1.0) | Pomodoro-style 25/5 schedules (and variants such as 24/6) are the ones tested in student trials (evidence.md). For office work the break literature supports breaks that are preferred and not left too late in the day (Hunter & Wu), not a specific block length. 52/17 is descriptive only, so 45 sits near it without borrowing its claim | Starting point |
| Break length | 5-10 min; 15 at the end of the first block that brings you to 100 min or more of work | 5 min; 8 after blocks of 26-50 min; 10 after longer; 20 at the end of the first block that brings you to 100 min or more of work | Within ten minutes, longer breaks were associated with larger performance effects, but break length did not change the effect on vigor or fatigue (Albulescu 2022); Hunter & Wu associate longer or frequent short breaks with more recovery | Starting point |
| Lunch/long break | Suggest stepping outside for about 15 min (its long break) | Same, for about 20 min (its long break) | Sianoja 2018 (park walk or relaxation, 15 min) | Tested (15 min) in one field trial; 20 min follows the School long break |
| Prompt style | Silent by default (shown in the app with no sound), held until a 1.5-second pause in activity in this window (shown after 20 seconds regardless), snooze twice | Same | evidence.md interruption sources | Starting point |
| Time-of-day | User logs a 1-5 "sharpness" rating; app shows their own pattern | Same | Chauhan 2025: synchrony is inconsistent and individual | Design inference |

### Defaults: break-type suggestion

| State (user-rated) | Suggest | Why | Status |
|---|---|---|---|
| Tense | Paced breathing (see below) | Breathing exercises cut self-reported stress modestly (evidence.md); relaxation breaks cut strain (Sianoja 2018; Kim 2017) | Breathing exercises tested for stress; relaxation tested for strain |
| Tired or flat | Walk, ideally outside or with a view of greenery | Park walk raised concentration and cut fatigue (Sianoja 2018); brief nature views restored attention (Lee 2015) | Tested; outside use of "tired" as the trigger is a starting point |
| Neither | Rest away from the screen and phone (leaving the computer screen too is our choice, not tested); the evidence says social breaks are fine but the app does not suggest them | Relaxation and social breaks weakened the link between work demands and end-of-day negative mood, and cognitive breaks strengthened it (Kim 2017); a phone break restored less than the same break on a computer or paper (Kang & Kurtzberg 2019 in evidence.md) | Association |
| Any | Show the suggestion for the person's own answer | Preferred breaks were associated with more recovery (Hunter & Wu 2016); autonomy over the lunch break changed whether social and work activities raised or lowered fatigue (Trougakos 2014) | Association |

## Choosing a breathing technique

- Default: 4 s in, 6 s out (about 6 breaths a minute), a commonly used pace; two small tests found no HRV difference from a longer exhale (evidence.md).
- Cyclic sighing is worth offering to people who want a quick, active option. The main support is still Balban 2023 (evidence.md) plus two small pilots: a 4-minute pilot where it lowered pain in an orthopedic waiting room but not anxiety or depression symptoms ([Hanley et al. 2025](https://doi.org/10.1007/s10865-024-00548-5)), and a 47-student pilot where it was associated with a greater reduction in state anxiety, alongside slower reaction times ([Riedl et al. 2026](https://doi.org/10.1080/10615806.2026.2659809)). That is not evidence for stress relief in healthy workers.
- Box breathing: a 2026 randomized trial (66 people) gave box breathing, prolonged exhalation or normal breathing before a virtual Trier stress test. Both active techniques reduced the rise in HR, anxiety and alpha-amylase; HRV, cortisol and cognitive performance did not change ([McAllister et al. 2026](https://doi.org/10.1016/j.cpnec.2026.100360), abstract only). So box is reasonable before a stressor, but holds are not shown to be better than prolonged exhalation.
- "Physiological sigh" for sudden spikes: we couldn't find a trial of a single double-inhale sigh for an acute spike. Cyclic sighing is the closest tested form. Offer it as "an option people like", not as a proven fast reset.
- Before a demanding task: a 5-minute slow-breathing session did not change muscle tension or Stroop performance on average in 48 adults (a late-minute benefit in men only; [Liang et al. 2023](https://doi.org/10.3389/fpsyg.2023.1155134)). A small trial (34 students) found a biofeedback breathing device lowered test anxiety symptoms, while a self-directed breathing group did not ([Rosenberg et al. 2021](https://doi.org/10.1007/s10484-020-09494-9)). Neither is shown to raise performance.

| Situation | Suggest | Status |
|---|---|---|
| Sustained tension, planned break | 4 s in, 6 s out, 5 min | Pace tested; 5-minute length an association |
| Quick, between tasks, prefers active | Cyclic sighing; the app's 2-minute default is a starting point | Small trials |
| Before a stressful event, wants structure | Box or slow breathing with prolonged exhale; the app's 2-minute default is a starting point | One 2026 trial |
| Sudden spike | Slow exhale-focused breathing; no special claim for a "double sigh"; the app's 2-minute default is a starting point | Starting point |
| Between sets | Optional easy-breathing reminder, no performance claim | 4-7-8 tested, null for performance; the cue is a starting point |

## What not to claim

- That the app detects stress, readiness, recovery or fatigue from heart rate. It can only ask.
- That 52/17, 25/5 or 45/10 is the optimal schedule for work.
- That a rest period guarantees more muscle or strength for an individual; the reviews describe group averages.
- That breathing between sets improves lifting performance.
- That HR "settled" means muscles are recovered. Nothing we found links heart rate recovery to muscle recovery between sets.
- That sets can be found from heart rate alone.
- That wrist-worn HR is accurate during lifting, or that the WHOOP bicep band has been validated for lifting.
- That the physiological sigh or cyclic sighing is proven for stress or anxiety in healthy adults.
- That nature views or outdoor walks raise work output; the evidence is for attention and fatigue in small studies.
- That time-of-day or chronotype can be read from heart rate.
- That breathing before an exam or presentation improves the result.

## Sources

1. Grgic J, et al. Effects of rest interval duration in resistance training on measures of muscular strength: a systematic review. Sports Med 2018. [doi:10.1007/s40279-017-0788-x](https://doi.org/10.1007/s40279-017-0788-x) (PMID 28933024)
2. Grgic J, Lazinica B, Mikulic P, Krieger JW, Schoenfeld BJ. The effects of short versus long inter-set rest intervals in resistance training on measures of muscle hypertrophy: a systematic review. Eur J Sport Sci 2017. [doi:10.1080/17461391.2017.1340524](https://doi.org/10.1080/17461391.2017.1340524) (PMID 28641044)
3. Schoenfeld BJ, Pope ZK, Benik FM, et al. Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men. J Strength Cond Res 2016. [doi:10.1519/JSC.0000000000001272](https://doi.org/10.1519/JSC.0000000000001272) (PMID 26605807)
4. Singer A, et al. Give it a rest: a systematic review with Bayesian meta-analysis on the effect of inter-set rest interval duration on muscle hypertrophy. Front Sports Act Living 2024. [doi:10.3389/fspor.2024.1429789](https://doi.org/10.3389/fspor.2024.1429789) (PMID 39205815)
5. de Salles BF, et al. Rest interval between sets in strength training. Sports Med 2009;39:765-777. [doi:10.2165/11315230-000000000-00000](https://doi.org/10.2165/11315230-000000000-00000) (PMID 19691365)
6. Buskard A, Wood R, Mullin E, Bruneau M, Jaghab A, Thompson B. Heart rate determined rest intervals in hypertrophy-type resistance training. JEPonline 2017;20(1):13-22. [PDF](https://www.asep.org/asep/asep/JEPonlineFEBRUARY2017_Andrew_Buskard.pdf)
7. Fidalgo A, Farinatti P, Matos-Santos L, Pilon R, Rodrigues GM, Oliveira BRR, Monteiro W. Self-selected or fixed: is there an optimal rest interval for controlling intensity in high-intensity interval resistance training? Eur J Appl Physiol 2023. [doi:10.1007/s00421-023-05246-9](https://doi.org/10.1007/s00421-023-05246-9) (abstract only; full text paywalled) (PMID 37285052)
8. Buxton et al. The effects of slow breathing during inter-set recovery on power performance in the barbell back squat. J Hum Kinet 2024. [doi:10.5114/jhk/185935](https://doi.org/10.5114/jhk/185935) (PMID 39132422; PMC11307190)
9. Zhang Y, et al. Validity of wrist-worn photoplethysmography devices to measure heart rate: a systematic review and meta-analysis. J Sports Sci 2020. [doi:10.1080/02640414.2020.1767348](https://doi.org/10.1080/02640414.2020.1767348) (PMID 32552580)
10. Boudreaux BD, et al. Validity of wearable activity monitors during cycling and resistance exercise. Med Sci Sports Exerc 2018. [doi:10.1249/MSS.0000000000001471](https://doi.org/10.1249/MSS.0000000000001471) (PMID 29189666)
11. Støve MP, Hansen ECK. Accuracy of the Apple Watch Series 6 and the Whoop Band 3.0 for assessing heart rate during resistance exercises. J Sports Sci 2022;40(23):2639-2644 (online 2023). [doi:10.1080/02640414.2023.2180160](https://doi.org/10.1080/02640414.2023.2180160) (abstract only; full text paywalled) (PMID 36803578)
12. Moghaddam M, Collins JP, Gardner CE, Rabel MC. Impact of anatomical placement on the accuracy of wearable heart rate monitors during rest and various exercise intensities. Sensors 2026;26(1):176 (cited by its 2026 issue year; online 26 Dec 2025). [doi:10.3390/s26010176](https://doi.org/10.3390/s26010176) (PMID 41516615)
13. Bunn JA, et al. Evaluation of earbud and wristwatch heart rate monitors during aerobic and resistance training. Int J Exerc Sci 2019. [doi:10.70252/LOOX1045](https://doi.org/10.70252/LOOX1045) (PMID 30899350)
14. Albulescu P, et al. "Give me a break!" A systematic review and meta-analysis on the efficacy of micro-breaks for increasing well-being and performance. PLoS One 2022. [doi:10.1371/journal.pone.0272460](https://doi.org/10.1371/journal.pone.0272460)
15. Hunter EM, Wu C. Give me a better break: choosing workday break activities to maximize resource recovery. J Appl Psychol 2016;101:302-311. [doi:10.1037/apl0000045](https://doi.org/10.1037/apl0000045) (PMID 26375961)
16. Kim S, Park Y, Niu Q. Micro-break activities at work to recover from daily work demands. J Organ Behav 2017;38(1):28-44. [doi:10.1002/job.2109](https://doi.org/10.1002/job.2109) (abstract only)
17. Trougakos JP, Hideg I, Cheng BH, Beal DJ. Lunch breaks unpacked: the role of autonomy as a moderator of recovery during lunch. Acad Manage J 2014;57:405-421. [doi:10.5465/amj.2011.1072](https://doi.org/10.5465/amj.2011.1072) (abstract only)
18. Sianoja M, et al. Enhancing daily well-being at work through lunchtime park walks and relaxation exercises: recovery experiences as mediators. J Occup Health Psychol 2018. [doi:10.1037/ocp0000083](https://doi.org/10.1037/ocp0000083) (PMID 28358570)
19. Lee KE, Williams KJH, Sargent LD, Williams NSG, Johnson KA. 40-second green roof views sustain attention: the role of micro-breaks in attention restoration. J Environ Psychol 2015;42:182-189. [doi:10.1016/j.jenvp.2015.04.003](https://doi.org/10.1016/j.jenvp.2015.04.003)
20. DeskTime. Does the 52-17 rule really hold up? [desktime.com/blog/52-17](https://desktime.com/blog/52-17)
21. Chauhan et al. Chronotype and synchrony effects in human cognitive performance: a systematic review. Chronobiol Int 2025. [doi:10.1080/07420528.2025.2490495](https://doi.org/10.1080/07420528.2025.2490495) (PMID 40293205)
22. Hanley AW, Davis A, Worts P, Pratscher S. Cyclic sighing in the clinic waiting room may decrease pain: results from a pilot randomized controlled trial. J Behav Med 2025. [doi:10.1007/s10865-024-00548-5](https://doi.org/10.1007/s10865-024-00548-5) (PMID 39904867)
23. McAllister MJ, Martaindale MH, Sutton N, Andersen JP. Box breathing and prolonged exhalation reduces markers of physiological stress reactivity in response to a virtual Trier Social Stress Test. Compr Psychoneuroendocrinol 2026. [doi:10.1016/j.cpnec.2026.100360](https://doi.org/10.1016/j.cpnec.2026.100360) (PMID 42388906; abstract only)
24. Liang W-M, Xiao J, Ren F-F, et al. Acute effect of breathing exercises on muscle tension and executive function under psychological stress. Front Psychol 2023. [doi:10.3389/fpsyg.2023.1155134](https://doi.org/10.3389/fpsyg.2023.1155134) (PMID 37303921)
25. Rosenberg et al. Reducing test anxiety and related symptoms using a biofeedback respiratory practice device: a randomized control trial. Appl Psychophysiol Biofeedback 2021. [doi:10.1007/s10484-020-09494-9](https://doi.org/10.1007/s10484-020-09494-9) (PMID 33389280)

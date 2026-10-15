// A typed copy of the tables in docs/evidence.md, docs/evidence-work-study.md and
// docs/evidence-cognition.md. Text may hold [label](url) links; the page turns them into real links.
// Keep current evidence in step when either changes. Retired Workout research stays in the historical docs.

export type Tone = 'tested' | 'partial' | 'start'

export interface EvidenceTable {
  caption?: string
  // Column titles; the first is the row heading, and the column at `statusCol` is shown as a tag.
  columns: string[]
  statusCol?: number
  // When a table has no Status column, every row gets this tag (the section says all rows share it).
  statusAll?: string
  rows: string[][]
}

export interface EvidenceBlock {
  title?: string
  bullets?: string[]
  tables?: EvidenceTable[]
}

export interface EvidenceSection extends EvidenceBlock {
  id: string
  title: string
  lead?: string
  subsections?: EvidenceBlock[]
}

export const EVIDENCE_INTRO =
  'For work and study resets, each default is labeled by the strength of its support: tested in studies, supported by smaller trials or associations, or a reasoned starting point that no study has tested in this form.'

// Tag color. Only a clean "Tested" counts as tested; guesses and design choices read as starting points.
export function toneOf(status: string): Tone {
  const s = status.toLowerCase()
  if (
    s.startsWith('starting point') ||
    s.startsWith('convention') ||
    s.includes('design inference') ||
    s.includes('length from field data')
  ) {
    return 'start'
  }
  if (s === 'tested' || s === 'pace tested' || s === 'tested for stress') {
    return 'tested'
  }
  return 'partial'
}

export const EVIDENCE_SECTIONS: EvidenceSection[] = [
  {
    id: 'breathing',
    title: 'Breathing',
    bullets: [
      'Breathing exercises give a small-to-medium reduction in self-reported stress compared with controls ([Fincham et al. 2023](https://doi.org/10.1038/s41598-022-27247-y)); for slow-paced breathing alone the stress effect was marginal ([Shao et al. 2024](https://doi.org/10.1007/s12671-023-02294-2)). In the largest blinded trial a placebo pace helped as much ([Fincham, Strauss & Cavanagh 2023](https://doi.org/10.1038/s41598-023-49279-8)).',
      'No trial we know of links breathing prompts or any break schedule to better grades.',
    ],
    tables: [
      {
        columns: ['Default', 'Why', 'Status'],
        statusCol: 2,
        rows: [
          [
            '4 s in, 6 s out, no holds',
            'Slow breathing near six breaths a minute is a commonly used pace, tested in several of the trials here ([Laborde et al. 2022](https://doi.org/10.1016/j.neubiorev.2022.104711) found HRV rises with voluntary slow breathing); slower was better across the 6 to 12 breaths a minute range tested, which did not go below six ([Czub et al. 2024](https://doi.org/10.1002/smi.3496))',
            'Pace tested',
          ],
          [
            '5 in, 5 out offered as equal',
            'Two small tests (26 and 16 people) found no HRV difference between 1:1 and 1:2 breathing ([Meehan & Shaffer 2024](https://doi.org/10.1007/s10484-024-09637-2)), and one trial of 828 people found no significant relationship between breathing ratio and anxiety ([Czub et al. 2024](https://doi.org/10.1002/smi.3496))',
            'Small tests',
          ],
          [
            'Cyclic sighing steps: 2.5 s in, 1 s top-up, 6.5 s out (a 10-second cycle, six breaths a minute)',
            'The protocol in [Balban et al. 2023](https://doi.org/10.1016/j.xcrm.2022.100895) is a slow inhale, a shorter second inhale, then a long exhale, and gives no second counts; the split of the 10 seconds is our choice',
            'Starting point',
          ],
          [
            'Box breathing 4-4-4-4 (4 s in, hold, out, hold)',
            'The conventional equal-count pattern ([Balban et al. 2023](https://doi.org/10.1016/j.xcrm.2022.100895) describe box breathing as equal inhale, hold and exhale durations); the 4-second count is a convention, not a tested value',
            'Starting point',
          ],
          [
            'Cyclic sighing and box as options only',
            'Sighing rests mainly on one small trial, with no large replication ([Balban et al. 2023](https://doi.org/10.1016/j.xcrm.2022.100895)); square and 4-7-8 breathing, which add holds, raised HRV less than six breaths a minute without them ([Marchant et al. 2025](https://doi.org/10.1007/s10484-025-09688-z))',
            'Small trials',
          ],
          [
            '5-minute sessions',
            'Sessions under 5 minutes were linked to failed interventions; longer was not associated with further benefit, p = 0.81 ([Bentley et al. 2023](https://doi.org/10.3390/brainsci13121612))',
            'Association',
          ],
          [
            '2-minute option',
            'Two small studies only: a 2-minute exercise in 56 students ([De Couck et al. 2019](https://doi.org/10.1016/j.ijpsycho.2019.02.011)) and a 1-minute pilot ([Riedl et al. 2026](https://doi.org/10.1080/10615806.2026.2659809))',
            'Pilot-grade',
          ],
          [
            '"Slower, not deeper" and a first-run explanation',
            'Many beginners over-breathe (6 of 16 on day one; [Szulczewski 2019](https://doi.org/10.1371/journal.pone.0218550)); instruction marks the programs that worked (Bentley et al. 2023)',
            'Association',
          ],
          [
            'Gentle, unforced breathing; stop if dizzy or uncomfortable',
            '[NHS guidance](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/) recommends gentle breathing without forcing it. The stop advice is a precaution, not a tested app intervention',
            'Starting point',
          ],
          [
            'Tension rating as the score, not heart rate',
            'Average heart rate barely changes with slow breathing ([Shao et al. 2024](https://doi.org/10.1007/s12671-023-02294-2))',
            'Design inference',
          ],
        ],
      },
    ],
  },
  {
    id: 'nudge',
    title: 'Heart rate companion and nudges',
    lead: 'No study we found validates stress detection from heart rate alone. Every number in this section is a starting point.',
    bullets: [
      "The companion can run independently of manual Focus blocks. It offers a check-in, optional breathing and Snooze or Stop controls; no study cited here tests this complete companion or establishes that its prompts improve work, study or grades. Completed minute medians and the lagged baseline describe received readings. They are not a stress, focus or cognitive-readiness score. Optional self-reports remain the person's own ratings.",
    ],
    tables: [
      {
        columns: ['Default', 'Why'],
        statusAll: 'Starting point',
        rows: [
          [
            'Asks "Feeling tense?"; never states it',
            'Heart rate is confounded by movement, and evidence that movement-corrected heart rate reflects emotion is limited ([Brouwer et al. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6054929/))',
          ],
          [
            '+15 bpm above your rolling baseline (adjustable 10-30): median of at least 5 usable minute medians in a 30-minute window that ends before the newest 5 minutes, or the configured hold duration if longer',
            'Stress without movement adds roughly 4 to 21 bpm ([Cook et al. 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC12743145/); [Bigalke et al. 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9401978/)); real exams added about 9 around the times students reported, and about 4 in the first 20 minutes of scheduled exams ([Pakhomov et al. 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7094857/))',
          ],
          [
            'Held for 5 minutes, judged on per-minute medians',
            'Stress lasts minutes; standing up adds about 16 bpm within about 8 seconds and has mostly settled by 30 seconds (still about 9 bpm up) ([Heidelbach et al. 2026](https://pmc.ncbi.nlm.nih.gov/articles/PMC13018822/)); per-second wrist readings are less accurate during rapid heart rate changes and at motion onset, by an amount that depends on the device ([Van Oost et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12568089/))',
          ],
          [
            'The first 5 minutes after companion Start or recovery are ignored; timed Focus resumes use 3 minutes after a break',
            'Heart rate may still be coming down from whatever came before; these settling lengths are product choices, not findings',
          ],
          [
            'At least 30 uniquely timed samples per minute; a gap over 15 seconds breaks continuity; duplicate timestamps are ignored',
            'Guards against sparse data counting as sustained change. These are engineering choices, not validated signal-quality or stress thresholds',
          ],
          [
            'Pauses during active breathing and timed breaks; resets on disconnect, readings over 15 seconds old, reported loss of skin contact or a source change',
            'Missing intervals are not reconstructed. Unknown skin-contact status is accepted; it is not proof of good contact. Browsers can suspend background work, and closing the app stops monitoring',
          ],
          [
            'A sharp heart rate jump pauses the relative-rise count',
            'An abrupt change may reflect movement or sensor error (our reading of the sources above, not a tested rule). Downshift has no movement detector and cannot establish the cause',
          ],
          [
            '"In focus" is the default setting; Home Start enables the independent companion and saves that monitoring choice',
            'Sitting during work or study is an assumption, not a detected condition. Outside timed sessions, movement can make prompts less meaningful',
          ],
          [
            'Ordinary prompts: at most one an hour and three a day by default, silent; held until a 1.5-second pause in activity in this window, or 20 seconds regardless',
            'Interruptions cost errors and stress ([Altmann et al. 2014](https://pubmed.ncbi.nlm.nih.gov/23294345/); [Mark et al. 2008](https://ics.uci.edu/~gmark/chi08-mark.pdf)); body-triggered prompts relieved stress no better than random ones ([Schwerdtfeger et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12371293/))',
          ],
          [
            '130 bpm for 10 minutes shows a separate check-in, not an exercise; at most once an hour, outside the ordinary 3-a-day budget',
            'Borrowed from consumer high-heart-rate alerts, which require ten minutes of inactivity ([Apple](https://support.apple.com/en-gw/guide/watch/heart-rate-apda88aefe4c/6.0); [Garmin](https://www8.garmin.com/manuals/webhelp/GUID-C144B465-A0C8-4FE9-AFE6-41A3FE3F1D9A/EN-US/GUID-F00E423A-165E-4557-91EE-DC2EDF737E79.html)). Downshift cannot apply their inactivity condition and this is not a medical alert',
          ],
          [
            'Snooze for 15 minutes; Stop clears pending companion notices and sound; cooldowns and snooze survive preference resets',
            'User control and interruption limits are product choices. Snooze restarts learning afterward; reloading does not replenish the ordinary prompt budget or the separate high-check-in cooldown',
          ],
        ],
      },
    ],
  },
  {
    id: 'sound',
    title: 'Sound and availability',
    lead: 'These are product controls, not research-tested treatment components.',
    tables: [
      {
        columns: ['Default', 'Why', 'Status'],
        statusCol: 2,
        rows: [
          [
            'Fresh installs and preference resets mute all sound, with spoken guidance, tones and break sounds off; explicit saved choices are retained on loading',
            'Sound is optional. Master mute, guidance off and zero volume prevent voice preview; mute and zero volume also stop current sound',
            'Starting point',
          ],
          [
            'Choose and preview a browser/system voice; automatic selection uses local voices only',
            'Naturalness and availability vary. A missing saved voice falls back to an available local voice without changing the saved preference; if none exists, it stays silent. Local availability does not guarantee offline playback',
            'Starting point',
          ],
          [
            'Remote voice services require an explicit choice and receive generic cue text only; heart rate values are not spoken',
            'The browser may send text to its voice provider. The app adds no voice account, API key or paid speech service',
            'Starting point',
          ],
          [
            'Notifications are optional and requested through Enable notifications',
            'Browser permission does not guarantee delivery or continuous background monitoring',
            'Starting point',
          ],
        ],
      },
    ],
  },
  {
    id: 'focus',
    title: 'Focus breaks',
    bullets: [
      'Short breaks reduce fatigue and raise energy; their effect on performance in demanding work is small and uncertain ([Albulescu et al. 2022](https://doi.org/10.1371/journal.pone.0272460)).',
      'Preferred break activities and earlier breaks in the shift were associated with more resource recovery in 95 employees across 5 days, and longer breaks and frequent short breaks with more resources than infrequent short ones ([Hunter & Wu 2016](https://doi.org/10.1037/apl0000045)). Observational, experience-sampling data.',
      'In 86 South Korean office workers over 10 workdays, relaxation and social micro-breaks weakened the link between work demands and end-of-workday negative affect, while cognitive activities made it worse. Among food-or-drink breaks, only caffeinated beverages helped, in a post hoc analysis (abstract only; [Kim, Park & Niu 2017](https://doi.org/10.1002/job.2109)).',
      "Lunch-break autonomy matters. In an experience-sampling study, social and work activities during lunch switched from raising to lowering end-of-workday fatigue as the person's autonomy over the break increased; for relaxation, autonomy mattered only when levels of relaxation were low (abstract only; [Trougakos et al. 2014](https://doi.org/10.5465/amj.2011.1072)).",
      'In a 10-day field intervention, a 15-minute lunchtime park walk improved afternoon concentration and fatigue through enjoyment, while 15 minutes of relaxation exercises improved concentration through detachment and lowered strain and fatigue directly ([Sianoja et al. 2018](https://doi.org/10.1037/ocp0000083)).',
      'A 40-second look at an image of a flowering green roof, against one of bare concrete, led to fewer omission errors and steadier responses in 150 university students ([Lee et al. 2015](https://doi.org/10.1016/j.jenvp.2015.04.003)). One lab study on students, so a nature view is an option, not a rule.',
      'The DeskTime 52-minutes-work, 17-minutes-break figure comes from the top 10% of its users by share of time in productive apps, over one workday. It is descriptive and the company says there is "no one-size-fits-all approach". A 2021 re-run gave 112 minutes of work and a 26-minute break ([DeskTime](https://desktime.com/blog/52-17)). It cannot say what schedule causes good work.',
      "Time-of-day effects: a review of 65 studies found no main effect of chronotype on cognition in over 80% of them, but 29 of 64 studies of adults aged 18-45 (45%; 10 of 12 in older adults) found a synchrony effect (better at one's preferred time of day), mostly in attention, inhibition and memory, with limited evidence that task complexity and lighting affected it ([Chauhan et al. 2025](https://doi.org/10.1080/07420528.2025.2490495)). That supports letting people record when they feel sharp; it does not support inferring chronotype from heart rate.",
    ],
    tables: [
      {
        caption: 'Focus breaks',
        columns: ['Default', 'Why', 'Status'],
        statusCol: 2,
        rows: [
          [
            '25-minute block, 5-minute break',
            'Pomodoro-style fixed schedules (25/5 and variants such as 24/6) are the ones tested in student trials, with mixed results: better mood than self-regulated breaks in one, with 24/6 and 12/3 schedules ([Biwer et al. 2023](https://doi.org/10.1111/bjep.12593)); in another, fatigue rose and motivation fell faster with 25/5, while overall fatigue, motivation, productivity, task completion and flow did not differ ([Smits et al. 2025](https://doi.org/10.3390/bs15070861)); with 12/3 breaks, a third found no significant performance difference and better mood with self-regulated breaks ([Göksu et al. 2026](https://doi.org/10.3390/bs16071158))',
            'Tested, mixed results',
          ],
          [
            '8-minute break after blocks of 26 to 50 minutes, 10 after longer',
            'Within ten minutes, longer breaks were associated with larger performance effects; break length did not change the effect on vigor or fatigue (Albulescu et al. 2022)',
            'Starting point',
          ],
          [
            '20-minute break (field data: 20 to 30 minutes) at the end of the first block that brings you to 100 minutes or more of work (with the School default of 25-minute blocks, after four blocks, about two hours with breaks); timing is a starting point',
            'School test data ([Sievertsen et al. 2016](https://doi.org/10.1073/pnas.1516947113)); a lunchtime park walk helped afternoon concentration ([Sianoja et al. 2018](https://doi.org/10.1037/ocp0000083)), so the app suggests stepping outside',
            'Length from field data; timing is a starting point',
          ],
          [
            'Move, breathe or rest; leave the phone',
            'Compared with an unstructured break, exercise added vigor and relaxation lowered fatigue ([Blasche et al. 2018](https://doi.org/10.1002/smi.2830)); a phone break restored less ([Kang & Kurtzberg 2019](https://doi.org/10.1556/2006.8.2019.21))',
            'Tested for mood and fatigue; the phone advice rests on one experiment',
          ],
          [
            'Work preset: 45-minute block, 5 to 10 minute breaks, 15-minute long break',
            "In one experience-sampling study of 95 employees, breaks that were preferred and not left too late were associated with more resource recovery ([Hunter & Wu 2016](https://doi.org/10.1037/apl0000045)); we haven't seen a study that tests a block length for office work",
            'Starting point; see the Work and School presets table below',
          ],
          [
            'Two-minute warning, two delays, a resume note',
            "Interruptions between actions were rated less annoying than ones in the middle of an action, in 16 people (the paper puts the difference at 56%) ([Adamczyk & Bailey 2004](https://doi.org/10.1145/985692.985727)); a brief plan for resuming reduced attention residue (the paper's four studies supported its hypotheses) ([Leroy & Glomb 2018](https://doi.org/10.1287/orsc.2017.1184), abstract only)",
            'Starting point',
          ],
          [
            'Snooze and extend: a break prompt can be snoozed for 5 more minutes (at most twice per block), and a break extended by 5 minutes (once per break)',
            'Lets the person finish the action in hand, which is when interruptions annoy most (see the row above); the 5-minute lengths match the default break and no study tests them',
            'Starting point',
          ],
        ],
      },
      {
        caption: 'Work and School presets',
        columns: ['Default', 'Work preset', 'School preset', 'Why', 'Status'],
        statusCol: 4,
        rows: [
          [
            'Focus block',
            '45 min, adjustable 25-60',
            '25 min, adjustable 20-50 (20 kept from 0.1.0)',
            'Pomodoro-style 25/5 schedules (and variants such as 24/6) are the ones tested in student trials (above). For office work the break literature supports breaks that are preferred and not left too late in the day (Hunter & Wu), not a specific block length. 52/17 is descriptive only, so 45 sits near it without borrowing its claim',
            'Starting point',
          ],
          [
            'Break length',
            '5-10 min; 15 at the end of the first block that brings you to 100 min or more of work',
            '5 min; 8 after blocks of 26-50 min; 10 after longer; 20 at the end of the first block that brings you to 100 min or more of work',
            'Within ten minutes, longer breaks were associated with larger performance effects, but break length did not change the effect on vigor or fatigue (Albulescu 2022); Hunter & Wu associate longer or frequent short breaks with more recovery',
            'Starting point',
          ],
          [
            'Lunch/long break',
            'Suggest stepping outside for about 15 min (its long break)',
            'Same, for about 20 min (its long break)',
            'Sianoja 2018 (park walk or relaxation, 15 min)',
            'Tested (15 min) in one field trial; 20 min follows the School long break',
          ],
          [
            'Prompt style',
            'Silent by default (shown in the app with no sound), held until a 1.5-second pause in activity in this window (shown after 20 seconds regardless), snooze twice',
            'Same',
            'Interruption sources in the heart rate nudge section',
            'Starting point',
          ],
          [
            'Time-of-day',
            'User logs a 1-5 "sharpness" rating; app shows their own pattern',
            'Same',
            'Chauhan 2025: synchrony is inconsistent and individual',
            'Design inference',
          ],
        ],
      },
      {
        caption: 'Break-type suggestion',
        columns: ['State (user-rated)', 'Suggest', 'Why', 'Status'],
        statusCol: 3,
        rows: [
          [
            'Tense',
            'Paced breathing',
            'Breathing exercises cut self-reported stress modestly (see Breathing); relaxation breaks cut strain (Sianoja 2018; Kim 2017)',
            'Breathing exercises tested for stress; relaxation tested for strain',
          ],
          [
            'Tired or flat',
            'Walk, ideally outside or with a view of greenery',
            'Park walk raised concentration and cut fatigue (Sianoja 2018); brief nature views restored attention (Lee 2015)',
            'Tested; outside use of "tired" as the trigger is a starting point',
          ],
          [
            'Neither',
            'Rest away from the screen and phone (leaving the computer screen too is our choice, not tested); the evidence says social breaks are fine but the app does not suggest them',
            'Relaxation and social breaks weakened the link between work demands and end-of-day negative mood, and cognitive breaks strengthened it (Kim 2017); a phone break restored less than the same break on a computer or paper (Kang & Kurtzberg 2019)',
            'Association',
          ],
          [
            'Any',
            "Show the suggestion for the person's own answer",
            'Preferred breaks were associated with more recovery (Hunter & Wu 2016); autonomy over the lunch break changed whether social and work activities raised or lowered fatigue (Trougakos 2014)',
            'Association',
          ],
        ],
      },
    ],
  },
  {
    id: 'technique',
    title: 'Choosing a technique',
    bullets: [
      'Default: 4 s in, 6 s out (about 6 breaths a minute), a commonly used pace; two small tests found no HRV difference from a longer exhale.',
      'Cyclic sighing is worth offering to people who want a quick, active option. The main support is still Balban 2023 plus two small pilots: a 4-minute pilot where it lowered pain in an orthopedic waiting room but not anxiety or depression symptoms ([Hanley et al. 2025](https://doi.org/10.1007/s10865-024-00548-5)), and a 47-student pilot where it was associated with a greater reduction in state anxiety, alongside slower reaction times ([Riedl et al. 2026](https://doi.org/10.1080/10615806.2026.2659809)). That is not evidence for stress relief in healthy workers.',
      'Box breathing: a 2026 randomized trial (66 people) gave box breathing, prolonged exhalation or normal breathing before a virtual Trier stress test. Both active techniques reduced the rise in HR, anxiety and alpha-amylase; HRV, cortisol and cognitive performance did not change ([McAllister et al. 2026](https://doi.org/10.1016/j.cpnec.2026.100360), abstract only). So box is reasonable before a stressor, but holds are not shown to be better than prolonged exhalation.',
      '"Physiological sigh" for sudden spikes: we couldn\'t find a trial of a single double-inhale sigh for an acute spike. Cyclic sighing is the closest tested form. Offer it as "an option people like", not as a proven fast reset.',
      'Before a demanding task: a 5-minute slow-breathing session did not change muscle tension or Stroop performance on average in 48 adults (a late-minute benefit in men only; [Liang et al. 2023](https://doi.org/10.3389/fpsyg.2023.1155134)). A small trial (34 students) found a biofeedback breathing device lowered test anxiety symptoms, while a self-directed breathing group did not ([Rosenberg et al. 2021](https://doi.org/10.1007/s10484-020-09494-9)). Neither is shown to raise performance.',
    ],
    tables: [
      {
        columns: ['Situation', 'Suggest', 'Status'],
        statusCol: 2,
        rows: [
          [
            'Sustained tension, planned break',
            '4 s in, 6 s out, 5 min',
            'Pace tested; 5-minute length an association',
          ],
          [
            'Quick, between tasks, prefers active',
            "Cyclic sighing; the app's 2-minute default is a starting point",
            'Small trials',
          ],
          [
            'Before a stressful event, wants structure',
            "Box or slow breathing with prolonged exhale; the app's 2-minute default is a starting point",
            'One 2026 trial',
          ],
          [
            'Sudden spike',
            'Slow exhale-focused breathing; no special claim for a "double sigh"; the app\'s 2-minute default is a starting point',
            'Starting point',
          ],
        ],
      },
    ],
  },
  {
    id: 'cognition',
    title: 'Heart rate and thinking',
    subsections: [
      {
        title: 'Summary',
        bullets: [
          'No study we know of gives an optimal heart rate for thinking, and the inverted-U "Yerkes-Dodson law" behind that idea is a weak foundation.',
          "Higher heart rate variability (HRV) goes with slightly better executive function across people. That is a resting, between-person link, and the device's bpm feed cannot measure it.",
          'Heart rate is a weak, confounded marker of mental effort or fatigue outside the lab. In one laboratory study, fatigue went with a lower heart rate, so the direction cannot be relied on.',
          'A rise in heart rate looks the same whether a person feels challenged or threatened. What differs is cardiac output and vascular resistance, which a heart rate sensor cannot see.',
          'Time of day, sleep and breaks have better evidence than heart rate. Movement breaks and slow breathing have small, short-lived cognitive benefits at best.',
          'We couldn\'t find a study that checks whether a wearable "readiness" or "recovery" score predicts same-day cognitive performance.',
        ],
      },
      {
        title: 'Defaults supported by this review',
        tables: [
          {
            columns: ['Default', 'Why', 'Status'],
            statusCol: 2,
            rows: [
              [
                'Break content chosen by self-report (Tense / Tired / Fine), not by heart rate',
                'Heart rate does not separate tension from effort or movement; fatigue markers are no better than a one-item rating (Yoshikawa 2025)',
                'Design inference',
              ],
              [
                '"Tired" suggests a walk or stretch',
                'Acute exercise gives a small cognitive benefit (Chang 2012; Garrett 2024), larger when measured after exercise in two reviews (Chang 2025; Lambourne 2010)',
                'Tested in labs; break length is a starting point',
              ],
              [
                '"Tense" suggests 5 minutes of slow breathing during the break',
                'Brief breathing improved Stroop and working memory in small trials; others found nothing (Laborde 2022; Pilcher 2025; Liang 2023)',
                'Small trials; unconfirmed',
              ],
              [
                'Scheduled focus blocks and breaks, not heart-rate-triggered ones',
                'Vigilance falls with time on task; markers detect fatigue poorly (Warm 2008; Yoshikawa 2025)',
                'Association; block length is a starting point (see Focus breaks)',
              ],
              [
                'Nudge wording asks, never labels',
                'Challenge and threat share a heart-rate rise; only cardiac output and vascular resistance differ (Seery 2013; Behnke 2018)',
                'Design inference',
              ],
              [
                "1-5 sharpness rating by time of day, shown as the user's own pattern",
                'Time-of-day and synchrony effects are real but inconsistent and individual (Schmidt 2007; Chauhan 2025)',
                'Design inference',
              ],
              [
                'Long break at the end of the first block that brings you to 100 minutes or more of work (with the School default of 25-minute blocks, after four blocks, about two hours with breaks)',
                'Scores recovered after 20 to 30 minutes in school data (Sievertsen 2016)',
                'Length from field data; timing is a starting point',
              ],
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'not-claimed',
    title: "What we don't claim",
    bullets: [
      'That the app detects stress, readiness, recovery or fatigue from heart rate. It can only ask.',
      'That 52/17, 25/5 or 45/10 is the optimal schedule for work.',
      'That the physiological sigh or cyclic sighing is proven for stress or anxiety in healthy adults.',
      'That nature views or outdoor walks raise work output; the evidence is for attention and fatigue in small studies.',
      'That time-of-day or chronotype can be read from heart rate.',
      'That breathing before an exam or presentation improves the result.',
      'That Downshift knows when you will think best, or when you are focused, from heart rate.',
      'That any heart rate range is optimal for studying, writing or exams, or that stress "peaks performance" at a middle level.',
      'That a high or low heart rate means you are stressed, tired or mentally fatigued.',
      'That wearable HRV, recovery or readiness scores predict how well you will think today.',
      'That the app measures HRV, or that wrist HRV during desk work is accurate.',
      'That a rise in heart rate means threat rather than challenge, or the reverse.',
      'That telling yourself "this is excitement" raises exam scores; the average benefit is small and one 2026 replication found none.',
      'That a walk or slow breathing will improve your next task, beyond a small effect found in some lab studies.',
      'That mental fatigue can be detected from heart rate, or that your best hours can be read from it.',
      'That breaks, breathing or movement raise grades.',
    ],
  },
]

// The current source list from docs/evidence-work-study.md. Historical Workout sources remain in docs/evidence-workout-work.md.
export const WORK_STUDY_SOURCES: string[] = [
  'Albulescu P, et al. "Give me a break!" A systematic review and meta-analysis on the efficacy of micro-breaks for increasing well-being and performance. PLoS One 2022. [doi:10.1371/journal.pone.0272460](https://doi.org/10.1371/journal.pone.0272460)',
  'Hunter EM, Wu C. Give me a better break: choosing workday break activities to maximize resource recovery. J Appl Psychol 2016;101:302-311. [doi:10.1037/apl0000045](https://doi.org/10.1037/apl0000045)',
  'Kim S, Park Y, Niu Q. Micro-break activities at work to recover from daily work demands. J Organ Behav 2017;38(1):28-44. [doi:10.1002/job.2109](https://doi.org/10.1002/job.2109) (abstract only)',
  'Trougakos JP, Hideg I, Cheng BH, Beal DJ. Lunch breaks unpacked: the role of autonomy as a moderator of recovery during lunch. Acad Manage J 2014;57:405-421. [doi:10.5465/amj.2011.1072](https://doi.org/10.5465/amj.2011.1072) (abstract only)',
  'Sianoja M, et al. Enhancing daily well-being at work through lunchtime park walks and relaxation exercises: recovery experiences as mediators. J Occup Health Psychol 2018. [doi:10.1037/ocp0000083](https://doi.org/10.1037/ocp0000083)',
  'Lee KE, Williams KJH, Sargent LD, Williams NSG, Johnson KA. 40-second green roof views sustain attention: the role of micro-breaks in attention restoration. J Environ Psychol 2015;42:182-189. [doi:10.1016/j.jenvp.2015.04.003](https://doi.org/10.1016/j.jenvp.2015.04.003)',
  'DeskTime. Does the 52-17 rule really hold up? [desktime.com/blog/52-17](https://desktime.com/blog/52-17)',
  'Chauhan et al. Chronotype and synchrony effects in human cognitive performance: a systematic review. Chronobiol Int 2025. [doi:10.1080/07420528.2025.2490495](https://doi.org/10.1080/07420528.2025.2490495)',
  'Hanley AW, Davis A, Worts P, Pratscher S. Cyclic sighing in the clinic waiting room may decrease pain: results from a pilot randomized controlled trial. J Behav Med 2025. [doi:10.1007/s10865-024-00548-5](https://doi.org/10.1007/s10865-024-00548-5)',
  'McAllister MJ, Martaindale MH, Sutton N, Andersen JP. Box breathing and prolonged exhalation reduces markers of physiological stress reactivity in response to a virtual Trier Social Stress Test. Compr Psychoneuroendocrinol 2026. [doi:10.1016/j.cpnec.2026.100360](https://doi.org/10.1016/j.cpnec.2026.100360) (PMID 42388906; abstract only)',
  'Liang W-M, Xiao J, Ren F-F, et al. Acute effect of breathing exercises on muscle tension and executive function under psychological stress. Front Psychol 2023. [doi:10.3389/fpsyg.2023.1155134](https://doi.org/10.3389/fpsyg.2023.1155134)',
  'Rosenberg et al. Reducing test anxiety and related symptoms using a biofeedback respiratory practice device: a randomized control trial. Appl Psychophysiol Biofeedback 2021. [doi:10.1007/s10484-020-09494-9](https://doi.org/10.1007/s10484-020-09494-9)',
]

// The numbered source list from docs/evidence-cognition.md.
export const COGNITION_SOURCES: string[] = [
  'Teigen KH. Yerkes-Dodson: a law for all seasons. Theory Psychol 1994;4(4):525-547. [doi:10.1177/0959354394044004](https://doi.org/10.1177/0959354394044004) (record checked in Crossref; abstract read from the Crossref record)',
  'Corbett M. From law to folklore: work stress and the Yerkes-Dodson Law. J Manag Psychol 2015;30(6):741-752. [doi:10.1108/JMP-03-2013-0085](https://doi.org/10.1108/JMP-03-2013-0085) (abstract only)',
  'Shields GS, Sazma MA, Yonelinas AP. The effects of acute stress on core executive functions: a meta-analysis and comparison with cortisol. Neurosci Biobehav Rev 2016;68:651-668. [doi:10.1016/j.neubiorev.2016.06.038](https://doi.org/10.1016/j.neubiorev.2016.06.038) (PMID 27371161; results read in PMC5003767, all quoted effect sizes confirmed)',
  'Lambourne K, Tomporowski P. The effect of exercise-induced arousal on cognitive task performance: a meta-regression analysis. Brain Res 2010;1341:12-24. [doi:10.1016/j.brainres.2010.03.091](https://doi.org/10.1016/j.brainres.2010.03.091) (PMID 20381468; abstract only)',
  'Thayer JF, Lane RD. A model of neurovisceral integration in emotion regulation and dysregulation. J Affect Disord 2000;61:201-216. [doi:10.1016/S0165-0327(00)00338-4](https://doi.org/10.1016/S0165-0327(00)00338-4) (PMID 11163422; abstract only)',
  'Thayer JF, Hansen AL, Saus-Rose E, Johnsen BH. Heart rate variability, prefrontal neural function, and cognitive performance: the neurovisceral integration perspective on self-regulation, adaptation, and health. Ann Behav Med 2009;37:141-153. [doi:10.1007/s12160-009-9101-z](https://doi.org/10.1007/s12160-009-9101-z) (PMID 19424767; abstract only)',
  'Forte G, Favieri F, Casagrande M. Heart rate variability and cognitive function: a systematic review. Front Neurosci 2019;13:710. [doi:10.3389/fnins.2019.00710](https://doi.org/10.3389/fnins.2019.00710) (PMID 31354419; abstract only)',
  'Magnon V, Vallet GT, Benson A, et al. Does heart rate variability predict better executive functioning? A systematic review and meta-analysis. Cortex 2022;155:218-236. [doi:10.1016/j.cortex.2022.07.008](https://doi.org/10.1016/j.cortex.2022.07.008) (PMID 36030561; abstract only)',
  'Holzman JB, Bridgett DJ. Heart rate variability indices as bio-markers of top-down self-regulatory mechanisms: a meta-analytic review. Neurosci Biobehav Rev 2017;74:233-255. [doi:10.1016/j.neubiorev.2016.12.032](https://doi.org/10.1016/j.neubiorev.2016.12.032) (PMID 28057463; abstract only)',
  'Zahn D, Adams J, Krohn J, et al. Heart rate variability and self-control: a meta-analysis. Biol Psychol 2016;115:9-26. [doi:10.1016/j.biopsycho.2015.12.007](https://doi.org/10.1016/j.biopsycho.2015.12.007) (PMID 26747415; abstract only)',
  'Laborde S, Allen MS, Borges U, Hosang TJ, et al. The influence of slow-paced breathing on executive function. J Psychophysiol 2022;36(1):13-27. [doi:10.1027/0269-8803/a000279](https://doi.org/10.1027/0269-8803/a000279) (abstract via Crossref)',
  'Shaffer F, Ginsberg JP. An overview of heart rate variability metrics and norms. Front Public Health 2017;5:258. [doi:10.3389/fpubh.2017.00258](https://doi.org/10.3389/fpubh.2017.00258) (PMID 29034226; abstract only)',
  'Espressif. Heart Rate Service (documents the optional RR-Interval field of the Bluetooth heart rate measurement). [docs.espressif.com](https://docs.espressif.com/projects/esp-iot-solution/en/latest/bluetooth/ble_hrs.html)',
  'Schäfer A, Vagedes J. How accurate is pulse rate variability as an estimate of heart rate variability? Int J Cardiol 2013;166:15-29. [doi:10.1016/j.ijcard.2012.03.119](https://doi.org/10.1016/j.ijcard.2012.03.119) (PMID 22809539; abstract only)',
  'Dial MB, Hollander ME, Vatne EA, et al. Validation of nocturnal resting heart rate and heart rate variability in consumer wearables. Physiol Rep 2025;13(16):e70527. [doi:10.14814/phy2.70527](https://doi.org/10.14814/phy2.70527) (PMID 40834291; abstract only)',
  'Charles RL, Nixon J. Measuring mental workload using physiological measures: a systematic review. Appl Ergon 2019;74:221-232. [doi:10.1016/j.apergo.2018.08.028](https://doi.org/10.1016/j.apergo.2018.08.028) (PMID 30487103; abstract only)',
  'Hughes AM, Hancock GM, Marlow SL, et al. Cardiac measures of cognitive workload: a meta-analysis. Hum Factors 2019;61:393-414. [doi:10.1177/0018720819830553](https://doi.org/10.1177/0018720819830553) (PMID 30822151; abstract only)',
  'Pakhomov SVS, Thuras PD, Finzel R, Eppel J, Kotlyar M. Using consumer-wearable technology for remote assessment of physiological response to stress in the naturalistic environment. PLoS One 2020;15:e0229942. [doi:10.1371/journal.pone.0229942](https://doi.org/10.1371/journal.pone.0229942) (PMID 32210441; full text read)',
  'Matuz A, van der Linden D, Kisander Z, et al. Enhanced cardiac vagal tone in mental fatigue: analysis of heart rate variability in time-on-task, recovery, and reactivity. PLoS One 2021;16:e0238670. [doi:10.1371/journal.pone.0238670](https://doi.org/10.1371/journal.pone.0238670) (PMID 33657124; abstract only)',
  'Van Cutsem J, Marcora S, De Pauw K, et al. The effects of mental fatigue on physical performance: a systematic review. Sports Med 2017;47:1569-1588. [doi:10.1007/s40279-016-0672-0](https://doi.org/10.1007/s40279-016-0672-0) (PMID 28044281; abstract only)',
  'von der Embse N, Jester D, Roy D, Post J. Test anxiety effects, predictors, and correlates: a 30-year meta-analytic review. J Affect Disord 2018;227:483-493. [doi:10.1016/j.jad.2017.11.048](https://doi.org/10.1016/j.jad.2017.11.048) (PMID 29156362; abstract only)',
  'Theobald M, Breitwieser J, Brod G. Test anxiety does not predict exam performance when knowledge is controlled for. Psychol Sci 2022;33:2073-2083. [doi:10.1177/09567976221119391](https://doi.org/10.1177/09567976221119391) (PMID 36221217; abstract only)',
  'Seery MD. The biopsychosocial model of challenge and threat: using the heart to measure the mind. Soc Personal Psychol Compass 2013;7:637-653. [doi:10.1111/spc3.12052](https://doi.org/10.1111/spc3.12052) (record checked in Crossref; abstract read from the Crossref record)',
  'Behnke M, Kaczmarek LD. Successful performance and cardiovascular markers of challenge and threat: a meta-analysis. Int J Psychophysiol 2018;130:73-79. [doi:10.1016/j.ijpsycho.2018.04.007](https://doi.org/10.1016/j.ijpsycho.2018.04.007) (PMID 29680521; abstract only)',
  'Hase A, Nietschke M, Kloskowski M, et al. (Behnke M, last author). The effects of challenge and threat states on performance outcomes: an updated review and meta-analysis of recent findings. EXCLI J 2025;24:151-176. [doi:10.17179/excli2024-7995](https://doi.org/10.17179/excli2024-7995) (PMID 40027878; abstract only)',
  'Jamieson JP, Mendes WB, Blackstock E, Schmader T. Turning the knots in your stomach into bows: reappraising arousal improves performance on the GRE. J Exp Soc Psychol 2010;46:208-212. [doi:10.1016/j.jesp.2009.08.015](https://doi.org/10.1016/j.jesp.2009.08.015) (PMID 20161454; abstract only)',
  'Jamieson JP, Nock MK, Mendes WB. Mind over matter: reappraising arousal improves cardiovascular and cognitive responses to stress. J Exp Psychol Gen 2012;141:417-422. [doi:10.1037/a0025719](https://doi.org/10.1037/a0025719) (PMID 21942377; abstract only)',
  'Brooks AW. Get excited: reappraising pre-performance anxiety as excitement. J Exp Psychol Gen 2014;143:1144-1158. [doi:10.1037/a0035325](https://doi.org/10.1037/a0035325) (PMID 24364682; abstract only)',
  'Jamieson JP, Black AE, Pelaia LE, et al. Reappraising stress arousal improves affective, neuroendocrine, and academic performance outcomes in community college classrooms. J Exp Psychol Gen 2022;151:197-212. [doi:10.1037/xge0000893](https://doi.org/10.1037/xge0000893) (PMID 34292050; abstract only)',
  'Bosshard M, Gomez P. Effectiveness of stress arousal reappraisal and stress-is-enhancing mindset interventions on task performance outcomes: a meta-analysis of randomized controlled trials. Sci Rep 2024;14:7923. [doi:10.1038/s41598-024-58408-w](https://doi.org/10.1038/s41598-024-58408-w) (PMID 38575696; abstract and full text, PMC10994935)',
  'Thormodsæter RS, Ballen CJ, Fagbodun S, et al. Can we mitigate the impacts of test anxiety through reappraisal interventions? A replication study in science courses across multiple institution types in the United States. CBE Life Sci Educ 2026;25(1):ar9. [doi:10.1187/cbe.25-04-0055](https://doi.org/10.1187/cbe.25-04-0055) (PMID 41730015; abstract only)',
  'Schmidt C, Collette F, Cajochen C, Peigneux P. A time to think: circadian rhythms in human cognition. Cogn Neuropsychol 2007;24:755-789. [doi:10.1080/02643290701754158](https://doi.org/10.1080/02643290701754158) (PMID 18066734; abstract only)',
  'Chauhan S, Vanova M, Tailor U, et al. Chronotype and synchrony effects in human cognitive performance: a systematic review. Chronobiol Int 2025;42:463-499. [doi:10.1080/07420528.2025.2490495](https://doi.org/10.1080/07420528.2025.2490495) (PMID 40293205; abstract only)',
  'Monk TH. The post-lunch dip in performance. Clin Sports Med 2005;24:e15-23. [doi:10.1016/j.csm.2004.12.002](https://doi.org/10.1016/j.csm.2004.12.002) (PMID 15892914; abstract only)',
  "Sievertsen HH, Gino F, Piovesan M. Cognitive fatigue influences students' performance on standardized tests. Proc Natl Acad Sci USA 2016;113:2621-2624. [doi:10.1073/pnas.1516947113](https://doi.org/10.1073/pnas.1516947113) (PMID 26884183; abstract only)",
  'Lim J, Dinges DF. A meta-analysis of the impact of short-term sleep deprivation on cognitive variables. Psychol Bull 2010;136:375-389. [doi:10.1037/a0018883](https://doi.org/10.1037/a0018883) (PMID 20438143; abstract only)',
  'Oura. Readiness Score (support article). [support.ouraring.com](https://support.ouraring.com/hc/en-us/articles/360025589793-Readiness-Score) (company description, read via web fetch)',
  'WHOOP community. What is the Recovery score, and how is it calculated? [community.whoop.com](https://www.community.whoop.com/t/what-is-the-recovery-score-and-how-is-it-calculated/107) (a user reply, not official documentation)',
  'Warm JS, Parasuraman R, Matthews G. Vigilance requires hard mental work and is stressful. Hum Factors 2008;50:433-441. [doi:10.1518/001872008X312152](https://doi.org/10.1518/001872008X312152) (PMID 18689050; abstract only)',
  'Ariga A, Lleras A. Brief and rare mental "breaks" keep you focused: deactivation and reactivation of task goals preempt vigilance decrements. Cognition 2011;118:439-443. [doi:10.1016/j.cognition.2010.12.007](https://doi.org/10.1016/j.cognition.2010.12.007) (PMID 21211793; abstract only)',
  'Brown DMY, Graham JD, Innes KI, et al. Effects of prior cognitive exertion on physical performance: a systematic review and meta-analysis. Sports Med 2020;50:497-529. [doi:10.1007/s40279-019-01204-8](https://doi.org/10.1007/s40279-019-01204-8) (PMID 31873926; abstract only)',
  'Habay J, Arenales Arauz YL, Proost M, et al. Mental fatigue negatively impacts cognitive and physical performance outcomes: a large-scale randomized crossover trial. Med Sci Sports Exerc 2026;58:225-241. [doi:10.1249/MSS.0000000000003852](https://doi.org/10.1249/MSS.0000000000003852) (PMID 40938104; abstract only)',
  'Yoshikawa H, Adachi Y, Baba A, et al. Heart rate variability versus visual analog scale for objective and subjective mental fatigue detection: a randomized controlled trial. PLOS Ment Health 2025;2(1):e0000240. [doi:10.1371/journal.pmen.0000240](https://doi.org/10.1371/journal.pmen.0000240) (PMID 41661804; abstract plus the AUC figure in the full text, PMC12798607)',
  'Albulescu P, Macsinga I, Rusu A, et al. "Give me a break!" A systematic review and meta-analysis on the efficacy of micro-breaks for increasing well-being and performance. PLoS One 2022;17:e0272460. [doi:10.1371/journal.pone.0272460](https://doi.org/10.1371/journal.pone.0272460) (PMID 36044424; abstract and full text, PMC9432722)',
  'Chang YK, Labban JD, Gapin JI, Etnier JL. The effects of acute exercise on cognitive performance: a meta-analysis. Brain Res 2012;1453:87-101. [doi:10.1016/j.brainres.2012.02.068](https://doi.org/10.1016/j.brainres.2012.02.068) (PMID 22480735; abstract only)',
  'Ludyga S, Gerber M, Brand S, Holsboer-Trachsler E, Pühse U. Acute effects of moderate aerobic exercise on specific aspects of executive function in different age and fitness groups: a meta-analysis. Psychophysiology 2016;53:1611-1626. [doi:10.1111/psyp.12736](https://doi.org/10.1111/psyp.12736) (PMID 27556572; abstract only)',
  'Garrett J, Chak C, Bullock T, Giesbrecht B. A systematic review and Bayesian meta-analysis provide evidence for an effect of acute physical activity on cognition in young adults. Commun Psychol 2024;2:82. [doi:10.1038/s44271-024-00124-2](https://doi.org/10.1038/s44271-024-00124-2) (PMID 39242965; abstract only)',
  'Chang YK, Ren FF, Li RH, et al. Effects of acute exercise on cognitive function: a meta-review of 30 systematic reviews with meta-analyses. Psychol Bull 2025;151:240-259. [doi:10.1037/bul0000460](https://doi.org/10.1037/bul0000460) (PMID 39883421; abstract only)',
  'Lehrer P, Kaur K, Sharma A, et al. Heart rate variability biofeedback improves emotional and physical health and performance: a systematic review and meta analysis. Appl Psychophysiol Biofeedback 2020;45:109-129. [doi:10.1007/s10484-020-09466-z](https://doi.org/10.1007/s10484-020-09466-z) (PMID 32385728; abstract only)',
  'Zaccaro A, Piarulli A, Laurino M, et al. How breath-control can change your life: a systematic review on psycho-physiological correlates of slow breathing. Front Hum Neurosci 2018;12:353. [doi:10.3389/fnhum.2018.00353](https://doi.org/10.3389/fnhum.2018.00353) (PMID 30245619; abstract only)',
  'Pilcher JJ, Byrne KA, Weiskittel SE, et al. Brief slow-paced breathing improves working memory, mood, and stress in college students. Anxiety Stress Coping 2025;38:528-543. [doi:10.1080/10615806.2025.2505897](https://doi.org/10.1080/10615806.2025.2505897) (PMID 40392328; abstract only)',
  'Byrne KA, Pilcher JJ, Liu Y, et al. A computational modeling approach to brief slow-paced breathing and mental health moderators of decision-making under uncertainty in college students. Acta Psychol 2025;258:105222. [doi:10.1016/j.actpsy.2025.105222](https://doi.org/10.1016/j.actpsy.2025.105222) (PMID 40614430; abstract only)',
  'Liang WM, Xiao J, Ren FF, et al. Acute effect of breathing exercises on muscle tension and executive function under psychological stress. Front Psychol 2023;14:1155134. [doi:10.3389/fpsyg.2023.1155134](https://doi.org/10.3389/fpsyg.2023.1155134) (PMID 37303921; abstract only)',
  'Ramquar SD, Tyagi C, Sharma B, et al. A systematic review protocol for slow-paced breathing in healthy populations: impacts on cognition and insights into mechanisms of action. Syst Rev 2025;15:6. [doi:10.1186/s13643-025-03004-w](https://doi.org/10.1186/s13643-025-03004-w) (PMID 41354819; protocol only)',
]

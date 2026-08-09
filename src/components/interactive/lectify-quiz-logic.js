/**
 * Scripted paragraph + question bank for the Lectify demo. No DOM here. Not real AI, just a
 * fixed set of question/option pairs generated ahead of time from the same paragraph, cycled
 * through on "Another question."
 */

export const PARAGRAPH =
  'Spaced repetition schedules review sessions right before you are about to forget, ' +
  'rather than at fixed intervals. Each successful recall pushes the next review further ' +
  'into the future; each failure pulls it back in. The effect compounds: over months, ' +
  'well-scheduled reviews need a fraction of the repetitions that cramming does.';

/** @type {{ question: string, options: string[], correctIndex: number }[]} */
export const QUESTIONS = [
  {
    question: 'According to the paragraph, what happens after a successful recall?',
    options: [
      'The next review moves further into the future',
      'The review is skipped entirely',
      'The next review moves sooner',
      'Nothing changes',
    ],
    correctIndex: 0,
  },
  {
    question: 'What triggers a review session, per the paragraph?',
    options: [
      'A fixed daily interval',
      'The moment right before you would forget',
      'A random schedule',
      'Whenever you open the app',
    ],
    correctIndex: 1,
  },
  {
    question: 'What does the paragraph say the compounding effect saves, over months?',
    options: [
      'Storage space',
      'Money',
      'A fraction of the repetitions cramming would need',
      'Nothing measurable',
    ],
    correctIndex: 2,
  },
];

/*
 * The Secret Stone — jsPsych 7 experiment timeline.
 *
 * Phase structure: 1a → 1b → 2a → 2b → 3a → 3b  (120 trials total)
 *   Phase 1: Movement MC (15 puzzles × 2 passes)
 *   Phase 2: Surround MC  (15 puzzles × 2 passes)
 *   Phase 3: Manual Surround (30 puzzles × 2 passes: 15 no-block + 15 block per pass)
 *
 * Breaks offered every 10 trials (interstitial, preceded by fatigue VAS).
 * Equalizer countdown at end for unused break time.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const POINTS = { correct: 10, break: -4 };
const BREAK_EVERY_N       = 10;
const BREAK_DURATION_MS   = 40_000;
const MAX_BREAKS          = Math.floor(120 / BREAK_EVERY_N); // 12
const MC_TIME_MS          = 30_000;
const MANUAL_TIME_MS      = 45_000;
const FEEDBACK_MS         = 1_800;

// ── Session state ─────────────────────────────────────────────────────────────
const SESSION = {
  points:              0,
  breaksTaken:         0,
  overallTrialIndex:   0,
  _lastBreakChosen:    false,
};

// ── jsPsych init ──────────────────────────────────────────────────────────────
const jsPsych = initJsPsych({
  on_finish: () => {
    jsPsych.data.displayData('json');
  },
});

// ── Plugin refs ───────────────────────────────────────────────────────────────
// Note: jsPsychInstructions, jsPsychHtmlButtonResponse, etc. are global
// variables set by the CDN plugin scripts — do NOT redeclare them here.
const MC     = window.jsPsychMCPlugin;
const Manual = window.jsPsychManualPlugin;

// ── HUD helper ────────────────────────────────────────────────────────────────
function hudHTML() {
  return `<div class="hud-bar">
    <span>Points: <strong id="hud-pts">${SESSION.points}</strong></span>
    <span>Trial: <strong id="hud-trial">${SESSION.overallTrialIndex}</strong> / 120</span>
  </div>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSENT
// ══════════════════════════════════════════════════════════════════════════════
const consent = {
  type: jsPsychHtmlButtonResponse,
  stimulus: `
    <div class="prose-box">
      <h1>The Secret Stone</h1>
      <h2>Consent to Participate</h2>
      <p>You are invited to participate in a study about <strong>decision-making and mental effort</strong>
         conducted by researchers at [University Name]. The study takes approximately
         <strong>25–30 minutes</strong>.</p>
      <p><strong>What you will do:</strong> You will solve a series of spatial puzzles involving
         fantasy-themed pieces on a small game board.</p>
      <p><strong>Compensation:</strong> You will receive a base payment plus a bonus based on
         how many puzzles you solve correctly.</p>
      <p><strong>Confidentiality:</strong> Your data will be anonymized and stored securely.
         No personally identifying information will be collected.</p>
      <p><strong>Voluntary participation:</strong> You may withdraw at any time without penalty.</p>
      <p>By clicking "I Agree" below, you confirm that you have read this information,
         are at least 18 years old, and agree to participate.</p>
    </div>`,
  choices: ['I Agree — Begin Study'],
  data: { phase: 'consent' },
};

// ══════════════════════════════════════════════════════════════════════════════
// SCREENER
// ══════════════════════════════════════════════════════════════════════════════
const screener = {
  type: jsPsychSurveyMultiChoice,
  questions: [
    { prompt: 'Are you at least 18 years old?',
      name: 'age_check', options: ['Yes', 'No'], required: true },
    { prompt: 'Are you currently taking this study on a desktop or laptop computer (not a phone)?',
      name: 'device_check', options: ['Yes', 'No'], required: true },
    { prompt: 'Is your browser window in full-screen or at least large enough to see a 5×5 grid comfortably?',
      name: 'screen_check', options: ['Yes', 'No'], required: true },
  ],
  preamble: '<h2>A few quick questions before we begin</h2>',
  button_label: 'Continue',
  data: { phase: 'screener' },
  on_finish: (data) => {
    const r = data.response;
    if (r.age_check !== 'Yes' || r.device_check !== 'Yes') {
      jsPsych.endExperiment(
        '<div class="prose-box"><h2>Thank you</h2><p>Unfortunately you do not meet the eligibility criteria for this study. Please return this HIT.</p></div>'
      );
    }
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS — PIECES
// ══════════════════════════════════════════════════════════════════════════════
const introPages = [
  // Page 1: Welcome + piece overview
  `<div class="prose-box">
    <h1>Welcome to <em>The Secret Stone</em></h1>
    <p>Deep in an ancient keep, a <strong>Secret Stone</strong> of great power has been hidden.
       Your team of three — a <strong>Wizard</strong>, a <strong>Scout</strong>, and a <strong>Guard</strong>
       — must work together to <strong>aim at</strong> the Stone and reveal its magic.</p>
    <p>Over the next several rounds you will solve puzzles that train you to use each character's
       unique ability, then combine them to aim at the Stone on a real game board.</p>
    <hr>
    <p><em>Use the arrows below to go through the instructions at your own pace.</em></p>
  </div>`,

  // Page 2: Piece – Wizard
  `<div class="prose-box">
    <h2>The Wizard</h2>
    <div class="piece-intro-row">
      <div class="piece-icon-lg">${window.Pieces.wizard()}</div>
      <div>
        <p>The Wizard is your most powerful piece. She can move any number of squares in
           <strong>any of the eight directions</strong> — horizontally, vertically, or diagonally.</p>
        <p>She stops if another piece is in her path (she cannot jump over pieces).</p>
        <p>She can <strong>aim at</strong> the Stone from across the board as long as
           nothing is blocking her line of sight.</p>
      </div>
    </div>
  </div>`,

  // Page 3: Piece – Scout
  `<div class="prose-box">
    <h2>The Scout</h2>
    <div class="piece-intro-row">
      <div class="piece-icon-lg">${window.Pieces.scout()}</div>
      <div>
        <p>The Scout moves only <strong>diagonally</strong> — but she can travel any number of
           squares in that direction.</p>
        <p>Like the Wizard, she is blocked by pieces in her path.</p>
        <p>She can aim at the Stone if it lies on a clear diagonal from her position.</p>
      </div>
    </div>
  </div>`,

  // Page 4: Piece – Guard
  `<div class="prose-box">
    <h2>The Guard</h2>
    <div class="piece-intro-row">
      <div class="piece-icon-lg">${window.Pieces.guard()}</div>
      <div>
        <p>The Guard is sturdy but slow. He moves exactly <strong>one square</strong> in any
           direction — horizontal, vertical, or diagonal.</p>
        <p>He aims at the Stone whenever the Stone is directly adjacent to him
           (touching in any of the eight directions).</p>
      </div>
    </div>
  </div>`,

  // Page 5: The Secret Stone + Blocker
  `<div class="prose-box">
    <h2>The Secret Stone &amp; Blockers</h2>
    <div class="piece-intro-row">
      <div class="piece-icon-lg">${window.Pieces.stone()}</div>
      <div>
        <p>The <strong>Secret Stone</strong> (purple gem) never moves.
           Your goal is to move one of your pieces so that it <strong>aims at</strong> the Stone.</p>
        <p>A piece <em>aims at</em> the Stone if it could move there in a straight line
           (or one step for the Guard) with <strong>no pieces blocking the path</strong>.</p>
      </div>
    </div>
    <div class="piece-intro-row" style="margin-top:1rem;">
      <div class="piece-icon-lg">${window.Pieces.blocker()}</div>
      <div>
        <p>Sometimes a <strong>Blocker</strong> (purple square) appears on the board.
           Blockers cannot be moved and <em>block</em> sliding pieces (Wizard and Scout)
           just like any other piece.</p>
      </div>
    </div>
  </div>`,
];

const pieceInstructions = {
  type: jsPsychInstructions,
  pages: introPages,
  show_clickable_nav: true,
  button_label_previous: '← Back',
  button_label_next: 'Next →',
  button_label_finish: 'Start Phase 1 →',
  data: { phase: 'instructions', section: 'pieces' },
};

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS — PHASE 1 (Movement MC)
// ══════════════════════════════════════════════════════════════════════════════
const phase1Instructions = {
  type: jsPsychInstructions,
  pages: [
    `<div class="prose-box">
      <h2>Phase 1 — Movement Questions</h2>
      <p>In this phase you will see a board with two highlighted squares:</p>
      <ul>
        <li>A <span class="highlight-from">gold square</span> — <em>a starting position</em></li>
        <li>A <span class="highlight-target">? square</span> — <em>a destination</em></li>
      </ul>
      <p>Your task: <strong>select which of your pieces could move from the gold square
         to the ? square</strong> in a single move.</p>
      <p>You will have <strong>30 seconds</strong> per question. Answer as accurately as you can —
         you earn <strong>10 points</strong> for each correct answer.</p>
    </div>`,
  ],
  show_clickable_nav: true,
  button_label_previous: '← Back',
  button_label_next: 'Next →',
  button_label_finish: 'Begin Phase 1 →',
  data: { phase: 'instructions', section: 'phase1' },
};

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS — PHASE 2 (Surround MC)
// ══════════════════════════════════════════════════════════════════════════════
const phase2Instructions = {
  type: jsPsychInstructions,
  pages: [
    `<div class="prose-box">
      <h2>Phase 2 — Aiming Questions</h2>
      <p>Now the board shows a <span class="highlight-from">gold square</span>
         (your position) and the <strong>Secret Stone</strong>.</p>
      <p>Your task: <strong>select which of your pieces, placed on the gold square,
         could aim at the Secret Stone</strong>.</p>
      <p>Remember — a piece <em>aims at</em> the Stone if it could reach the Stone's square
         in a straight line (for Wizard/Scout) or if the Stone is one step away (for Guard),
         with nothing blocking the path.</p>
      <p>You have <strong>30 seconds</strong> per question.
         Correct answers earn <strong>10 points</strong>.</p>
    </div>`,
  ],
  show_clickable_nav: true,
  button_label_previous: '← Back',
  button_label_next: 'Next →',
  button_label_finish: 'Begin Phase 2 →',
  data: { phase: 'instructions', section: 'phase2' },
};

// ══════════════════════════════════════════════════════════════════════════════
// INSTRUCTIONS — PHASE 3 (Manual)
// ══════════════════════════════════════════════════════════════════════════════
const phase3Instructions = {
  type: jsPsychInstructions,
  pages: [
    `<div class="prose-box">
      <h2>Phase 3 — Aim the Stone</h2>
      <p>Now you will play on a live board. All three of your pieces are already placed,
         along with the Secret Stone.</p>
      <p><strong>Click a piece to select it</strong>, then <strong>click a destination square</strong>
         to move it there. Your goal: get at least one piece to <strong>aim at the Secret Stone</strong>.</p>
      <p>You can make as many moves as you like before the timer runs out.
         The Stone will glow red once a piece is aimed at it — that's when the puzzle is solved!</p>
      <p>Each solved puzzle earns <strong>10 points</strong>. You have <strong>45 seconds</strong> per board.</p>
    </div>`,
  ],
  show_clickable_nav: true,
  button_label_previous: '← Back',
  button_label_next: 'Next →',
  button_label_finish: 'Begin Phase 3 →',
  data: { phase: 'instructions', section: 'phase3' },
};

// ══════════════════════════════════════════════════════════════════════════════
// BREAK SYSTEM
// ══════════════════════════════════════════════════════════════════════════════

// VAS fatigue rating (shown before break offer)
function makeVAS() {
  return {
    type: jsPsychSurveyLikert,
    preamble: `<div class="break-screen">
      <h2>Quick Check-In</h2>
      <p>Before continuing, please rate how you are feeling right now.</p>
    </div>`,
    questions: [
      {
        prompt: 'How mentally fatigued are you feeling?',
        name: 'fatigue',
        labels: ['Not at all fatigued', '', '', '', '', '', 'Extremely fatigued'],
        required: true,
      },
      {
        prompt: 'How much mental effort has this task been requiring?',
        name: 'effort',
        labels: ['Very little effort', '', '', '', '', '', 'Extreme effort'],
        required: true,
      },
    ],
    button_label: 'Continue',
    data: { phase: 'vas' },
    on_finish: (data) => {
      data.trial_index_at_vas = SESSION.overallTrialIndex;
    },
  };
}

// Break offer
function makeBreakOffer() {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => `
      <div class="break-screen">
        <h2>Break Opportunity</h2>
        <p>You have completed <strong>${SESSION.overallTrialIndex}</strong> puzzles so far.</p>
        <p>Would you like to take a <strong>40-second break</strong>?</p>
        <p class="break-cost">Taking a break costs <strong>4 points</strong>.</p>
        <p class="break-balance">Your current balance: <strong>${SESSION.points} pts</strong></p>
      </div>`,
    choices: ['Take Break (−4 pts)', 'Keep Going'],
    data: { phase: 'break_offer' },
    on_finish: (data) => {
      const chosen = data.response === 0;
      data.break_chosen = chosen;
      SESSION._lastBreakChosen = chosen;
      if (chosen) {
        SESSION.points -= 4;   // deduct here; note POINTS.break is -4
        SESSION.breaksTaken++;
      }
    },
  };
}

// Break countdown
function makeBreakCountdown() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div class="break-screen">
        <h2>Break Time</h2>
        <p>Relax for 40 seconds. The study will resume automatically.</p>
        <div class="break-timer" id="break-timer">40</div>
        <p class="break-sub">seconds remaining</p>
      </div>`,
    choices: 'NO_KEYS',
    trial_duration: BREAK_DURATION_MS,
    data: { phase: 'break' },
    on_load: () => {
      let secs = Math.ceil(BREAK_DURATION_MS / 1000);
      const el = document.querySelector('#break-timer');
      const iv = setInterval(() => {
        secs--;
        if (el) el.textContent = Math.max(0, secs);
        if (secs <= 0) clearInterval(iv);
      }, 1000);
    },
  };
}

// Interstitial node inserted after every Nth trial
function makeBreakNode() {
  return [
    {
      timeline: [makeVAS()],
      conditional_function: () => {
        return SESSION.overallTrialIndex > 0 &&
               SESSION.overallTrialIndex % BREAK_EVERY_N === 0 &&
               SESSION.overallTrialIndex < 120;
      },
    },
    {
      timeline: [makeBreakOffer()],
      conditional_function: () => {
        return SESSION.overallTrialIndex > 0 &&
               SESSION.overallTrialIndex % BREAK_EVERY_N === 0 &&
               SESSION.overallTrialIndex < 120;
      },
    },
    {
      timeline: [makeBreakCountdown()],
      conditional_function: () => SESSION._lastBreakChosen === true,
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// TRIAL FACTORIES
// ══════════════════════════════════════════════════════════════════════════════

function makeMCTrial(puzzle, phase, passLabel) {
  const localIdx = { n: 0 }; // captured reference for label
  return {
    type: MC,
    puzzle: puzzle,
    phase: phase,
    time_limit_ms: MC_TIME_MS,
    feedback_ms:   FEEDBACK_MS,
    trial_label:   passLabel,
    on_start: () => {
      SESSION._lastBreakChosen = false;
    },
    on_finish: (data) => {
      SESSION.overallTrialIndex++;
      if (data.correct) SESSION.points += POINTS.correct;
      data.overall_trial = SESSION.overallTrialIndex;
      data.points_total  = SESSION.points;
      data.pass          = passLabel;
    },
  };
}

function makeManualTrial(puzzle, passLabel) {
  return {
    type: Manual,
    puzzle: puzzle,
    time_limit_ms: MANUAL_TIME_MS,
    feedback_ms:   FEEDBACK_MS,
    trial_label:   passLabel,
    on_start: () => {
      SESSION._lastBreakChosen = false;
    },
    on_finish: (data) => {
      SESSION.overallTrialIndex++;
      if (data.correct) SESSION.points += POINTS.correct;
      data.overall_trial = SESSION.overallTrialIndex;
      data.points_total  = SESSION.points;
      data.pass          = passLabel;
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD PHASE TIMELINES
// ══════════════════════════════════════════════════════════════════════════════

function buildMCPhase(puzzles, phase, passLabel) {
  const nodes = [];
  puzzles.forEach((puz, i) => {
    nodes.push(makeMCTrial(puz, phase, `${passLabel} · ${i + 1} of ${puzzles.length}`));
    nodes.push(...makeBreakNode());
  });
  return nodes;
}

function buildManualPhase(puzzles, passLabel) {
  const nodes = [];
  puzzles.forEach((puz, i) => {
    nodes.push(makeManualTrial(puz, `${passLabel} · ${i + 1} of ${puzzles.length}`));
    nodes.push(...makeBreakNode());
  });
  return nodes;
}

// ══════════════════════════════════════════════════════════════════════════════
// BETWEEN-PHASE BREAKS (simple text screen)
// ══════════════════════════════════════════════════════════════════════════════
function makePhaseBridge(title, body) {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="prose-box"><h2>${title}</h2>${body}</div>`,
    choices: ['Continue →'],
    data: { phase: 'bridge' },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SESSION EQUALIZER
// ══════════════════════════════════════════════════════════════════════════════
const equalizerConditional = {
  timeline: [{
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => {
      const unused = MAX_BREAKS - SESSION.breaksTaken;
      const secs   = Math.round(unused * BREAK_DURATION_MS / 1000);
      return `
        <div class="break-screen">
          <h2>Session Complete!</h2>
          <p>You used <strong>${SESSION.breaksTaken}</strong> of ${MAX_BREAKS} available breaks.</p>
          <p>To keep the session length fair for everyone, please wait
             <strong>${secs} seconds</strong> before seeing your final score.</p>
          <div class="break-timer" id="eq-timer">${secs}</div>
          <p class="break-sub">seconds remaining</p>
        </div>`;
    },
    choices: 'NO_KEYS',
    trial_duration: () => (MAX_BREAKS - SESSION.breaksTaken) * BREAK_DURATION_MS,
    data: { phase: 'equalizer' },
    on_load: () => {
      const unused = MAX_BREAKS - SESSION.breaksTaken;
      let secs = Math.round(unused * BREAK_DURATION_MS / 1000);
      const el = document.querySelector('#eq-timer');
      const iv = setInterval(() => {
        secs--;
        if (el) el.textContent = Math.max(0, secs);
        if (secs <= 0) clearInterval(iv);
      }, 1000);
    },
  }],
  conditional_function: () => SESSION.breaksTaken < MAX_BREAKS,
};

// ══════════════════════════════════════════════════════════════════════════════
// DEBRIEF
// ══════════════════════════════════════════════════════════════════════════════
const debrief = {
  type: jsPsychHtmlButtonResponse,
  stimulus: () => `
    <div class="prose-box">
      <h1>You Have Completed the Study!</h1>
      <p>Your final score: <strong>${SESSION.points} points</strong>.</p>
      <p>Breaks taken: <strong>${SESSION.breaksTaken}</strong> of ${MAX_BREAKS} available.</p>
      <hr>
      <h2>What This Study Was About</h2>
      <p>This study examined how <strong>mental fatigue</strong> and <strong>cognitive effort</strong>
         affect decision-making over time. We were interested in whether the difficulty and duration
         of a task influences how often people choose to take breaks and how accurately they perform.</p>
      <p>The three phases were designed to gradually increase the demand placed on your
         spatial reasoning and planning abilities.</p>
      <p>Thank you for your time and careful participation!
         Your responses will help us better understand how people manage mental effort.</p>
      <p>If you have any questions about the study, please contact: <em>[researcher@university.edu]</em></p>
    </div>`,
  choices: ['Finish & Submit'],
  data: { phase: 'debrief' },
};

// ══════════════════════════════════════════════════════════════════════════════
// ASSEMBLE TIMELINE
// ══════════════════════════════════════════════════════════════════════════════
const timeline = [];

// ── Consent & screener ────────────────────────────────────────────────────────
timeline.push(consent);
timeline.push(screener);

// ── Piece instructions ────────────────────────────────────────────────────────
timeline.push(pieceInstructions);

// ── Phase 1 instructions ──────────────────────────────────────────────────────
timeline.push(phase1Instructions);

// ── Phase 1a ──────────────────────────────────────────────────────────────────
timeline.push(...buildMCPhase(window.Puzzles.getPhase1(), 1, 'Phase 1a'));

// ── Bridge 1a → 1b ────────────────────────────────────────────────────────────
timeline.push(makePhaseBridge('Round 2 of Phase 1',
  '<p>Well done! You will now see the same type of questions again. Try to beat your previous score.</p>'));

// ── Phase 1b ──────────────────────────────────────────────────────────────────
timeline.push(...buildMCPhase(window.Puzzles.getPhase1(), 1, 'Phase 1b'));

// ── Bridge to Phase 2 ─────────────────────────────────────────────────────────
timeline.push(makePhaseBridge('Moving On',
  '<p>Great work! The next phase introduces a new type of question about aiming at the Secret Stone.</p>'));

// ── Phase 2 instructions ──────────────────────────────────────────────────────
timeline.push(phase2Instructions);

// ── Phase 2a ──────────────────────────────────────────────────────────────────
timeline.push(...buildMCPhase(window.Puzzles.getPhase2(), 2, 'Phase 2a'));

// ── Bridge 2a → 2b ────────────────────────────────────────────────────────────
timeline.push(makePhaseBridge('Round 2 of Phase 2',
  '<p>You are doing great! Another round of aiming questions is coming up.</p>'));

// ── Phase 2b ──────────────────────────────────────────────────────────────────
timeline.push(...buildMCPhase(window.Puzzles.getPhase2(), 2, 'Phase 2b'));

// ── Bridge to Phase 3 ─────────────────────────────────────────────────────────
timeline.push(makePhaseBridge('Final Phase',
  '<p>Excellent! Now you will move pieces on a real board. This is the most challenging part — you\'ll need everything you\'ve learned.</p>'));

// ── Phase 3 instructions ──────────────────────────────────────────────────────
timeline.push(phase3Instructions);

// ── Phase 3a ──────────────────────────────────────────────────────────────────
timeline.push(...buildManualPhase(window.Puzzles.getPhase3Pass(), 'Phase 3a'));

// ── Bridge 3a → 3b ────────────────────────────────────────────────────────────
timeline.push(makePhaseBridge('Round 2 of Phase 3',
  '<p>You are in the home stretch! One final set of boards to solve.</p>'));

// ── Phase 3b ──────────────────────────────────────────────────────────────────
timeline.push(...buildManualPhase(window.Puzzles.getPhase3Pass(), 'Phase 3b'));

// ── Session equalizer ─────────────────────────────────────────────────────────
timeline.push(equalizerConditional);

// ── Debrief ───────────────────────────────────────────────────────────────────
timeline.push(debrief);

// ── Run ───────────────────────────────────────────────────────────────────────
jsPsych.run(timeline);

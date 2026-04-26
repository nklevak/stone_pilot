/*
 * jsPsych 7.x plugin: mc-plugin
 * Renders a 5×5 board for Phase 1 (movement MC) and Phase 2 (surround MC).
 *
 * Phase 1: shows a "from" marker and a "to" target. Q: which pieces can move there?
 * Phase 2: shows a "from" marker and the Secret Stone. Q: which pieces can aim at Stone?
 *
 * Uses global Engine (engine.js) and Pieces (pieces.js).
 */

var jsPsychMCPlugin = (function () {

  const info = {
    name: 'mc-plugin',
    parameters: {
      puzzle:        { type: 1, default: null },   // COMPLEX — puzzle object
      phase:         { type: 0, default: 1 },      // INT — 1 or 2
      time_limit_ms: { type: 0, default: 30000 },  // INT
      feedback_ms:   { type: 0, default: 2000 },   // INT
      trial_label:   { type: 3, default: '' },     // STRING — e.g. "Trial 3 of 15"
    },
  };

  class MCPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    trial(display_element, trial) {
      const puz    = trial.puzzle;
      const phase  = trial.phase;
      const opts   = window.Puzzles.MC_OPTIONS;
      const fbMap  = phase === 1 ? window.Puzzles.MC_FEEDBACK_P1 : window.Puzzles.MC_FEEDBACK_P2;

      let timerID      = null;
      let startTime    = performance.now();
      let responded    = false;
      let timeExpired  = false;

      // ── Board HTML ────────────────────────────────────────────────────────────
      function buildBoardHTML() {
        let html = '<div class="ss-board">';
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const shade  = (r + c) % 2 === 0 ? 'light' : 'dark';
            const isFrom = (r === puz.from[0] && c === puz.from[1]);

            let cellClass = `ss-cell ${shade}`;
            let inner     = '';

            if (isFrom) {
              // Gold position marker — shows the "here" square
              cellClass += ' mc-from';
              inner = `<div class="mc-from-dot"></div>`;
            }

            if (phase === 1) {
              const isTo = (r === puz.to[0] && c === puz.to[1]);
              if (isTo) { cellClass += ' mc-target'; inner = `<div class="mc-target-marker">?</div>`; }
            } else {
              const isSt = (r === puz.stone[0] && c === puz.stone[1]);
              if (isSt) { inner = Pieces.svgFor('T'); }
            }

            html += `<div class="${cellClass}" data-r="${r}" data-c="${c}">${inner}</div>`;
          }
        }
        html += '</div>';
        return html;
      }

      // ── Question text ─────────────────────────────────────────────────────────
      const questionText = phase === 1
        ? 'The <span class="highlight-from">gold square</span> marks a position. The <span class="highlight-target">? square</span> marks a destination.<br>Which of your pieces can move from the gold square to the ? square?'
        : 'The <span class="highlight-from">gold square</span> marks a position on the board.<br>Which of your pieces could <strong>aim at</strong> the Secret Stone from that square?';

      // ── Radio options HTML ────────────────────────────────────────────────────
      function buildOptionsHTML() {
        return opts.map((o, i) =>
          `<label class="mc-option" data-value="${o.value}">
             <input type="radio" name="mc_answer" value="${o.value}" id="mc_opt_${i}">
             <span>${o.label}</span>
           </label>`
        ).join('');
      }

      // ── Timer bar HTML ────────────────────────────────────────────────────────
      const timerTotal = trial.time_limit_ms;

      // ── Full DOM ──────────────────────────────────────────────────────────────
      display_element.innerHTML = `
        <div class="ss-wrap">
          <div class="ss-hud">
            <span class="trial-label">${trial.trial_label}</span>
            <div class="timer-bar-wrap"><div class="timer-bar" id="timer-bar"></div></div>
          </div>
          <p class="mc-question">${questionText}</p>
          <div class="mc-layout">
            ${buildBoardHTML()}
            <div class="mc-options-panel">
              <p class="mc-prompt">Select your answer:</p>
              <form id="mc-form">
                ${buildOptionsHTML()}
              </form>
              <button id="mc-submit" class="ss-btn" disabled>Submit</button>
            </div>
          </div>
          <div id="mc-feedback" class="mc-feedback hidden"></div>
        </div>`;

      // ── Radio change → enable submit ──────────────────────────────────────────
      const submitBtn = display_element.querySelector('#mc-submit');
      display_element.querySelectorAll('input[name="mc_answer"]').forEach(inp => {
        inp.addEventListener('change', () => {
          if (!responded) submitBtn.disabled = false;
          // Visually mark selected option
          display_element.querySelectorAll('.mc-option').forEach(l => l.classList.remove('selected'));
          inp.closest('.mc-option').classList.add('selected');
        });
      });

      // ── Submit ────────────────────────────────────────────────────────────────
      submitBtn.addEventListener('click', () => {
        if (responded) return;
        const checked = display_element.querySelector('input[name="mc_answer"]:checked');
        if (!checked) return;
        submitResponse(checked.value, false);
      });

      // ── Timer ─────────────────────────────────────────────────────────────────
      const barEl  = display_element.querySelector('#timer-bar');
      const tStart = performance.now();

      function tickTimer() {
        if (responded) return;
        const elapsed = performance.now() - tStart;
        const pct     = Math.max(0, 1 - elapsed / timerTotal);
        if (barEl) barEl.style.width = (pct * 100) + '%';
        if (elapsed >= timerTotal) {
          submitResponse(null, true);
        } else {
          timerID = requestAnimationFrame(tickTimer);
        }
      }
      timerID = requestAnimationFrame(tickTimer);

      // ── Response handler ──────────────────────────────────────────────────────
      function submitResponse(selectedValue, expired) {
        if (responded) return;
        responded    = true;
        timeExpired  = expired;
        cancelAnimationFrame(timerID);

        // Disable inputs
        display_element.querySelectorAll('input[name="mc_answer"]').forEach(i => i.disabled = true);
        submitBtn.disabled = true;

        const rt      = Math.round(performance.now() - startTime);
        const correct = !expired && selectedValue === puz.answer;

        // Show feedback
        const fbDiv  = display_element.querySelector('#mc-feedback');
        const fbText = expired
          ? `<strong>Time's up!</strong> The correct answer was: <em>${labelFor(puz.answer)}</em>.<br>${fbMap[puz.answer]}`
          : correct
            ? `<strong>Correct!</strong> ${fbMap[puz.answer]}`
            : `<strong>Not quite.</strong> The correct answer was: <em>${labelFor(puz.answer)}</em>.<br>${fbMap[puz.answer]}`;

        fbDiv.innerHTML  = fbText;
        fbDiv.className  = `mc-feedback ${correct ? 'fb-correct' : 'fb-wrong'}`;

        // Highlight correct option
        display_element.querySelectorAll('.mc-option').forEach(lbl => {
          if (lbl.dataset.value === puz.answer)   lbl.classList.add('correct-option');
          if (!correct && lbl.dataset.value === selectedValue) lbl.classList.add('wrong-option');
        });

        // Finish after feedback delay
        setTimeout(() => {
          finish({ selectedValue, correct, rt, expired });
        }, trial.feedback_ms);
      }

      function labelFor(val) {
        const o = window.Puzzles.MC_OPTIONS.find(x => x.value === val);
        return o ? o.label : val;
      }

      // ── Finish trial ──────────────────────────────────────────────────────────
      const finish = (result) => {
        cancelAnimationFrame(timerID);
        display_element.innerHTML = '';
        this.jsPsych.finishTrial({
          puzzle_id:  puz.id,
          phase:      phase,
          answer:     puz.answer,
          response:   result.selectedValue,
          correct:    result.correct,
          rt:         result.rt,
          expired:    result.expired,
        });
      };
    }
  }

  MCPlugin.info = info;
  return MCPlugin;
})();

window.jsPsychMCPlugin = jsPsychMCPlugin;

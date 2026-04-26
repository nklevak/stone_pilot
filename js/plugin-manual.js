/*
 * jsPsych 7.x plugin: manual-plugin
 * Renders a full 5×5 board for Phase 3 manual surround trials.
 *
 * Player selects a gold piece, sees legal move squares highlighted,
 * then clicks a destination. The trial succeeds if any gold piece
 * ends up aiming at the Secret Stone.
 *
 * Uses global Engine (engine.js) and Pieces (pieces.js).
 */

var jsPsychManualPlugin = (function () {

  const info = {
    name: 'manual-plugin',
    parameters: {
      puzzle:        { type: 1, default: null },   // COMPLEX
      time_limit_ms: { type: 0, default: 45000 },  // INT
      feedback_ms:   { type: 0, default: 2000 },   // INT
      trial_label:   { type: 3, default: '' },     // STRING
    },
  };

  class ManualPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    trial(display_element, trial) {
      const puz       = trial.puzzle;
      const E         = window.Engine;
      const P         = window.Pieces;

      let board       = E.buildBoard(puz.spec);
      let selected    = null;     // [r,c] of selected piece, or null
      let legalTargets = [];      // [[r,c], …]
      let moveLog     = [];       // { from:[r,c], to:[r,c] }
      let timerID     = null;
      let responded   = false;
      const startTime = performance.now();
      const timerTotal = trial.time_limit_ms;

      // ── Render helpers ────────────────────────────────────────────────────────
      function cellId(r, c) { return `ss-cell-${r}-${c}`; }

      function renderBoard() {
        const grid = display_element.querySelector('#ss-board-grid');
        if (!grid) return;
        grid.innerHTML = '';

        // Find stone position for aimed-at check
        let sr = -1, sc = -1;
        for (let r = 0; r < 5; r++)
          for (let c = 0; c < 5; c++)
            if (board[r][c] === 'T') { sr = r; sc = c; }

        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.id    = cellId(r, c);
            const shade = (r + c) % 2 === 0 ? 'light' : 'dark';
            cell.className = `ss-cell ${shade}`;

            const piece = board[r][c];

            // Aimed-at glow on Stone
            const stoneAimed = piece === 'T' && E.anyAimsAtStone(board);

            // Selection highlight
            if (selected && selected[0] === r && selected[1] === c) {
              cell.classList.add('selected');
            }

            // Legal move highlight
            const isLegal = legalTargets.some(([lr, lc]) => lr === r && lc === c);
            if (isLegal) cell.classList.add('legal-move');

            // Piece SVG
            if (piece) cell.innerHTML = P.svgFor(piece, stoneAimed);

            // Click handler
            cell.addEventListener('click', () => onCellClick(r, c));
            grid.appendChild(cell);
          }
        }
      }

      // ── Cell click logic ──────────────────────────────────────────────────────
      function onCellClick(r, c) {
        if (responded) return;

        const piece = board[r][c];

        // Clicked on a legal move target → make the move
        if (selected && legalTargets.some(([lr, lc]) => lr === r && lc === c)) {
          makeMove(selected[0], selected[1], r, c);
          return;
        }

        // Clicked on own piece → select it
        if (piece === 'W' || piece === 'S' || piece === 'G') {
          selected     = [r, c];
          legalTargets = E.legalMoves(board, r, c);
          renderBoard();
          return;
        }

        // Clicked elsewhere → deselect
        selected     = null;
        legalTargets = [];
        renderBoard();
      }

      function makeMove(fr, fc, tr, tc) {
        moveLog.push({ from: [fr, fc], to: [tr, tc] });
        board    = E.applyMove(board, fr, fc, tr, tc);
        selected = null;
        legalTargets = [];
        renderBoard();

        // Check win condition
        if (E.anyAimsAtStone(board)) {
          finishTrial(true);
        }
        // Otherwise player keeps trying (timer still running)
      }

      // ── Full DOM ──────────────────────────────────────────────────────────────
      display_element.innerHTML = `
        <div class="ss-wrap">
          <div class="ss-hud">
            <span class="trial-label">${trial.trial_label}</span>
            <div class="timer-bar-wrap"><div class="timer-bar" id="timer-bar"></div></div>
          </div>
          <p class="manual-instruction">
            Move one of your pieces so that it <strong>aims at</strong> the Secret Stone.
          </p>
          <div class="manual-layout">
            <div id="ss-board-grid" class="ss-board"></div>
            <div class="manual-legend">
              <div class="legend-row">${P.svgFor('W')}<span><strong>Wizard</strong> — any direction, any distance</span></div>
              <div class="legend-row">${P.svgFor('S')}<span><strong>Scout</strong> — diagonal only, any distance</span></div>
              <div class="legend-row">${P.svgFor('G')}<span><strong>Guard</strong> — any direction, 1 square</span></div>
              <div class="legend-row">${P.svgFor('T')}<span><strong>Secret Stone</strong> — aim at this!</span></div>
            </div>
          </div>
          <div id="manual-feedback" class="mc-feedback hidden"></div>
        </div>`;

      renderBoard();

      // ── Timer ─────────────────────────────────────────────────────────────────
      const barEl  = display_element.querySelector('#timer-bar');
      const tStart = performance.now();

      function tickTimer() {
        if (responded) return;
        const elapsed = performance.now() - tStart;
        const pct     = Math.max(0, 1 - elapsed / timerTotal);
        if (barEl) barEl.style.width = (pct * 100) + '%';
        if (elapsed >= timerTotal) {
          finishTrial(false);
        } else {
          timerID = requestAnimationFrame(tickTimer);
        }
      }
      timerID = requestAnimationFrame(tickTimer);

      // ── Finish ────────────────────────────────────────────────────────────────
      const finishTrial = (success) => {
        if (responded) return;
        responded = true;
        cancelAnimationFrame(timerID);
        const rt = Math.round(performance.now() - startTime);

        const fbDiv = display_element.querySelector('#manual-feedback');
        if (fbDiv) {
          fbDiv.className = `mc-feedback ${success ? 'fb-correct' : 'fb-wrong'}`;
          fbDiv.innerHTML = success
            ? '<strong>Excellent!</strong> Your piece is now aimed at the Secret Stone.'
            : "<strong>Time\'s up!</strong> Try to spot which piece can reach the Stone\'s line.";
        }

        setTimeout(() => {
          display_element.innerHTML = '';
          this.jsPsych.finishTrial({
            puzzle_id:  puz.id,
            phase:      3,
            correct:    success,
            rt:         rt,
            move_count: moveLog.length,
            moves:      JSON.stringify(moveLog),
            expired:    !success,
          });
        }, trial.feedback_ms);
      };
    }
  }

  ManualPlugin.info = info;
  return ManualPlugin;
})();

window.jsPsychManualPlugin = jsPsychManualPlugin;

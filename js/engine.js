/*
 * 5×5 board engine for The Secret Stone.
 *
 * Pieces:
 *   'W' = Wizard  (Queen)  — any direction, any distance
 *   'S' = Scout   (Bishop) — diagonal only, any distance
 *   'G' = Guard   (King)   — any direction, exactly 1 square
 *   'T' = Secret Stone (opponent) — never moves
 *   'B' = Blocker (purple) — never moves, blocks sliding pieces
 *
 * Row 0 = top, Row 4 = bottom. Col 0 = left, Col 4 = right.
 * board[r][c] = piece string or null.
 */

const Engine = (function () {

  const ALL_DIRS  = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const DIAG_DIRS = [[-1,-1],[-1,1],[1,-1],[1,1]];

  // ── Legal destination squares for a piece at (r,c) ─────────────────────────
  // Returns [[r,c], …] of squares the piece may legally move TO.
  // Gold pieces may not land on own pieces or on the Stone.
  function legalMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece || piece === 'T' || piece === 'B') return [];

    const dirs    = (piece === 'S') ? DIAG_DIRS : ALL_DIRS;
    const sliding = (piece === 'W' || piece === 'S');
    const moves   = [];

    for (const [dr, dc] of dirs) {
      if (sliding) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
          const occ = board[nr][nc];
          // Blocked by own piece, Stone, or Blocker — stop, don't include
          if (occ === 'W' || occ === 'S' || occ === 'G' || occ === 'T' || occ === 'B') break;
          moves.push([nr, nc]);
          nr += dr; nc += dc;
        }
      } else {
        // Guard: one step
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) continue;
        const occ = board[nr][nc];
        if (occ === 'W' || occ === 'S' || occ === 'G' || occ === 'T' || occ === 'B') continue;
        moves.push([nr, nc]);
      }
    }
    return moves;
  }

  // ── Does a piece at (r,c) aim at the Stone at (sr,sc)? ─────────────────────
  // "Aims at" = the piece threatens that square (could move there if it were empty).
  // The board is used to check for obstructions between piece and Stone.
  function aimsAt(board, r, c, sr, sc) {
    const piece = board[r][c];
    if (!piece || piece === 'T' || piece === 'B') return false;

    const dr = sr - r, dc = sc - c;

    if (piece === 'G') {
      // Guard aims if Stone is exactly one step away
      return Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && (dr !== 0 || dc !== 0);
    }

    // Sliding pieces: Wizard or Scout
    const isDiag     = Math.abs(dr) === Math.abs(dc) && dr !== 0;
    const isStraight = (dr === 0 || dc === 0) && (dr !== 0 || dc !== 0);

    if (piece === 'S' && !isDiag) return false;
    if (!isDiag && !isStraight) return false;

    // Walk from piece toward Stone, check for obstructions
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
    let nr = r + stepR, nc = c + stepC;
    while (nr !== sr || nc !== sc) {
      if (board[nr][nc] !== null) return false; // obstructed
      nr += stepR; nc += stepC;
    }
    return true; // reached Stone unobstructed
  }

  // ── Does any gold piece on the board currently aim at the Stone? ────────────
  function anyAimsAtStone(board) {
    let sr = -1, sc = -1;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (board[r][c] === 'T') { sr = r; sc = c; }
    if (sr === -1) return false;

    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) {
        const p = board[r][c];
        if (p === 'W' || p === 'S' || p === 'G')
          if (aimsAt(board, r, c, sr, sc)) return true;
      }
    return false;
  }

  // ── Apply a move, return new board (immutable) ──────────────────────────────
  function applyMove(board, fromR, fromC, toR, toC) {
    const nb = board.map(row => [...row]);
    nb[toR][toC] = nb[fromR][fromC];
    nb[fromR][fromC] = null;
    return nb;
  }

  // ── Build a board from a spec object ────────────────────────────────────────
  // spec: { W:[r,c], S:[r,c], G:[r,c], T:[r,c], blockers:[[r,c],…] }
  function buildBoard(spec) {
    const board = Array.from({length:5}, () => Array(5).fill(null));
    if (spec.W) board[spec.W[0]][spec.W[1]] = 'W';
    if (spec.S) board[spec.S[0]][spec.S[1]] = 'S';
    if (spec.G) board[spec.G[0]][spec.G[1]] = 'G';
    if (spec.T) board[spec.T[0]][spec.T[1]] = 'T';
    for (const [r,c] of (spec.blockers || [])) board[r][c] = 'B';
    return board;
  }

  // ── MC helper: which piece types can move from (r,c) to (tr,tc)? ────────────
  // Returns subset of ['W','S','G'] — ignores board state (no blockers).
  function whichCanReach(r, c, tr, tc) {
    const dr = tr - r, dc = tc - c;
    if (dr === 0 && dc === 0) return [];
    const result = [];
    const isDiag     = Math.abs(dr) === Math.abs(dc);
    const isStraight = dr === 0 || dc === 0;
    const isOneStep  = Math.abs(dr) <= 1 && Math.abs(dc) <= 1;

    if (isDiag || isStraight) result.push('W');   // Wizard covers both
    if (isDiag)               result.push('S');   // Scout: diagonal only
    if (isOneStep)            result.push('G');   // Guard: one step any dir
    return result;
  }

  return { legalMoves, aimsAt, anyAimsAtStone, applyMove, buildBoard, whichCanReach };
})();

window.Engine = Engine;

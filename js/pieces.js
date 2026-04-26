/*
 * SVG definitions for all pieces in The Secret Stone.
 * Each function returns an SVG string sized to fit a square cell.
 * Gold pieces use #c8a900. Stone uses #7b2cbf (normal) or #c00 (aimed-at).
 */

const Pieces = (function () {

  // ── Wizard (Queen equivalent) ───────────────────────────────────────────────
  // Robed figure with tall pointy hat, gold star on hat.
  function wizard() {
    return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <!-- Robe / body -->
      <ellipse cx="30" cy="42" rx="14" ry="12" fill="#c8a900"/>
      <!-- Neck -->
      <rect x="27" y="28" width="6" height="6" fill="#c8a900"/>
      <!-- Head -->
      <circle cx="30" cy="25" r="8" fill="#c8a900"/>
      <!-- Hat brim -->
      <ellipse cx="30" cy="18" rx="11" ry="3" fill="#a07800"/>
      <!-- Hat cone -->
      <polygon points="30,2 19,18 41,18" fill="#c8a900"/>
      <!-- Star on hat -->
      <polygon points="30,7 31.5,11.5 36,11.5 32.5,14 34,18.5 30,15.5 26,18.5 27.5,14 24,11.5 28.5,11.5"
               fill="white" opacity="0.9"/>
      <!-- Face suggestion -->
      <circle cx="27" cy="25" r="1.2" fill="#a07800"/>
      <circle cx="33" cy="25" r="1.2" fill="#a07800"/>
    </svg>`;
  }

  // ── Scout (Bishop equivalent) ───────────────────────────────────────────────
  // Hooded figure with bow, gold.
  function scout() {
    return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <!-- Body -->
      <ellipse cx="30" cy="43" rx="12" ry="11" fill="#c8a900"/>
      <!-- Head -->
      <circle cx="30" cy="26" r="7" fill="#c8a900"/>
      <!-- Hood (arc over head) -->
      <path d="M18,26 Q18,10 30,10 Q42,10 42,26 Z" fill="#a07800"/>
      <!-- Hood opening -->
      <ellipse cx="30" cy="26" rx="7" ry="5" fill="#c8a900"/>
      <!-- Bow (right side) -->
      <path d="M42,20 Q52,28 42,36" stroke="#a07800" stroke-width="2.5" fill="none"/>
      <!-- Bowstring -->
      <line x1="42" y1="20" x2="42" y2="36" stroke="#c8a900" stroke-width="1.5"/>
      <!-- Arrow nocked -->
      <line x1="42" y1="28" x2="54" y2="26" stroke="#a07800" stroke-width="1.5"/>
      <polygon points="54,26 50,24 50,28" fill="#a07800"/>
    </svg>`;
  }

  // ── Guard (King equivalent) ─────────────────────────────────────────────────
  // Shield with white cross emblem, gold.
  function guard() {
    return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <!-- Shield shape -->
      <path d="M10,8 L50,8 L50,38 Q50,52 30,56 Q10,52 10,38 Z"
            fill="#c8a900" stroke="#a07800" stroke-width="2"/>
      <!-- Cross emblem -->
      <rect x="27" y="14" width="6" height="28" fill="white" opacity="0.85"/>
      <rect x="16" y="25" width="28" height="6" fill="white" opacity="0.85"/>
    </svg>`;
  }

  // ── Secret Stone (opponent piece) ───────────────────────────────────────────
  // Gem/crystal pentagon. Purple normally, dark-red glow when aimed-at.
  function stone(aimedAt = false) {
    const gemColor  = aimedAt ? '#c00'    : '#7b2cbf';
    const glowColor = aimedAt ? '#ff4444' : 'transparent';
    const glowOp    = aimedAt ? '0.35'   : '0';
    return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <!-- Glow ring when aimed-at -->
      <circle cx="30" cy="34" r="26" fill="${glowColor}" opacity="${glowOp}"/>
      <!-- Gem body: pointed top, wide middle, flat bottom -->
      <polygon points="30,6 52,22 46,52 14,52 8,22"
               fill="${gemColor}" stroke="${aimedAt ? '#ff0000' : '#4a0080'}" stroke-width="2"/>
      <!-- Highlight triangle (shine) -->
      <polygon points="30,10 20,24 14,22" fill="white" opacity="0.4"/>
      <!-- Inner facet lines -->
      <line x1="30" y1="6"  x2="8"  y2="22" stroke="white" stroke-width="0.8" opacity="0.3"/>
      <line x1="30" y1="6"  x2="52" y2="22" stroke="white" stroke-width="0.8" opacity="0.3"/>
      <line x1="8"  y1="22" x2="14" y2="52" stroke="white" stroke-width="0.8" opacity="0.2"/>
      <line x1="52" y1="22" x2="46" y2="52" stroke="white" stroke-width="0.8" opacity="0.2"/>
    </svg>`;
  }

  // ── Blocker (purple rectangle) ──────────────────────────────────────────────
  function blocker() {
    return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="40" height="40" rx="4"
            fill="#5a189a" stroke="#3d0066" stroke-width="2"/>
      <line x1="20" y1="20" x2="40" y2="40" stroke="white" stroke-width="2" opacity="0.3"/>
      <line x1="40" y1="20" x2="20" y2="40" stroke="white" stroke-width="2" opacity="0.3"/>
    </svg>`;
  }

  // ── Lookup by piece code ────────────────────────────────────────────────────
  function svgFor(code, aimedAt = false) {
    switch (code) {
      case 'W': return wizard();
      case 'S': return scout();
      case 'G': return guard();
      case 'T': return stone(aimedAt);
      case 'B': return blocker();
      default:  return '';
    }
  }

  // ── Human-readable names ────────────────────────────────────────────────────
  const NAMES = { W: 'Wizard', S: 'Scout', G: 'Guard', T: 'Secret Stone', B: 'Blocker' };

  return { wizard, scout, guard, stone, blocker, svgFor, NAMES };
})();

window.Pieces = Pieces;

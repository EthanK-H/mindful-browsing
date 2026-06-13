/* ============================================================
   GEARBOUND — custom SVG art (no emojis)
   Every creature is a clockwork automaton: brass plating,
   copper rivets, glass gauges, gears and steam.
   All sprites render in a 120x120 viewBox.
   ============================================================ */
(function () {
'use strict';

// shared defs: rivets, gear, bolt, glass gradient helpers --------
function gear(cx, cy, r, teeth, fill, rot) {
  let pts = '';
  const inner = r * 0.62;
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = ((i + 0.5) / teeth) * Math.PI * 2;
    const a2 = ((i + 1) / teeth) * Math.PI * 2;
    pts += `${cx + Math.cos(a0) * r},${cy + Math.sin(a0) * r} `;
    pts += `${cx + Math.cos(a0 + 0.16) * r * 1.18},${cy + Math.sin(a0 + 0.16) * r * 1.18} `;
    pts += `${cx + Math.cos(a1 - 0.16) * r * 1.18},${cy + Math.sin(a1 - 0.16) * r * 1.18} `;
    pts += `${cx + Math.cos(a1) * r},${cy + Math.sin(a1) * r} `;
  }
  return `<g transform="rotate(${rot || 0} ${cx} ${cy})">
    <polygon points="${pts}" fill="${fill}" stroke="#5a3f16" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${inner}" fill="${fill}" stroke="#5a3f16" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.26}" fill="#3a2c1e"/>
  </g>`;
}
function rivet(x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r || 2}" fill="#7a5a24" stroke="#3a2c1e" stroke-width="0.6"/>
          <circle cx="${x - 0.6}" cy="${y - 0.6}" r="${(r || 2) * 0.4}" fill="#e2b04a"/>`;
}
function glassGauge(cx, cy, r, color) {
  return `<circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="#8a6a22" stroke="#5a3f16" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#glassShine)"/>
    <circle cx="${cx - r * 0.35}" cy="${cy - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity="0.7"/>`;
}

// brass gradient palette per body
const DEFS = `<defs>
  <radialGradient id="glassShine" cx="0.35" cy="0.3" r="0.8">
    <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
    <stop offset="0.5" stop-color="#fff" stop-opacity="0.05"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.25"/>
  </radialGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e7c468"/>
    <stop offset="0.5" stop-color="#c9982a"/>
    <stop offset="1" stop-color="#8a6a22"/>
  </linearGradient>
  <linearGradient id="copper" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d98b54"/>
    <stop offset="1" stop-color="#9a4f28"/>
  </linearGradient>
  <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#cfd6dc"/>
    <stop offset="1" stop-color="#8b97a2"/>
  </linearGradient>
</defs>`;

function wrap(inner) {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">${DEFS}${inner}</svg>`;
}

// steam puff used by several creatures
function steam(x, y) {
  return `<g opacity="0.5" fill="#f3e8d0">
    <circle cx="${x}" cy="${y}" r="4"/>
    <circle cx="${x + 3}" cy="${y - 5}" r="3"/>
    <circle cx="${x - 2}" cy="${y - 9}" r="2.4"/>
  </g>`;
}

// ============================================================
// MONSTERS
// ============================================================
const M = {};

// Embercub — clockwork fire fox
M.Embercub = wrap(`
  ${steam(86, 30)}
  <path d="M30 92 Q14 86 20 70 Q8 64 16 58 L26 64 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <ellipse cx="60" cy="74" rx="30" ry="24" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M40 50 L30 28 L48 44 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M80 50 L90 28 L72 44 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <circle cx="60" cy="58" r="24" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M44 64 Q60 80 76 64" fill="none" stroke="#9a4f28" stroke-width="2.5" stroke-linecap="round"/>
  ${glassGauge(50, 54, 7, '#f0742a')}
  ${glassGauge(70, 54, 7, '#f0742a')}
  <polygon points="58,68 62,68 60,74" fill="#3a2c1e"/>
  <g fill="#f0742a"><path d="M52 86 q8 8 16 0" opacity="0.0"/></g>
  ${rivet(38, 74)} ${rivet(82, 74)} ${rivet(60, 88)}
  ${gear(86, 84, 9, 8, '#b07a32', 12)}
`);

// Aquafin — brass dolphin diving-bell
M.Aquafin = wrap(`
  <path d="M96 48 Q112 44 104 62 Q100 56 92 58 Z" fill="url(#steel)" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M20 78 Q6 70 18 60 Q40 44 74 50 Q104 56 100 76 Q92 96 56 94 Q30 92 20 78 Z"
        fill="url(#steel)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M40 52 L34 34 L54 48 Z" fill="#6e7b86" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M30 80 Q20 92 36 90" fill="#6e7b86" stroke="#5a3f16" stroke-width="1.2"/>
  ${glassGauge(78, 64, 8, '#5fb6e0')}
  <path d="M88 70 Q100 72 96 80" fill="none" stroke="#5a3f16" stroke-width="2"/>
  ${rivet(44, 64)} ${rivet(58, 60)} ${rivet(70, 80)} ${rivet(52, 82)}
  <g opacity="0.8" fill="#bfe3f5"><circle cx="104" cy="40" r="2.5"/><circle cx="110" cy="32" r="1.8"/></g>
  ${gear(30, 70, 7, 8, '#9aa6b0', 0)}
`);

// Thornling — botanical brass lizard
M.Thornling = wrap(`
  <path d="M18 86 Q4 84 12 72 Q18 66 24 72 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <ellipse cx="62" cy="76" rx="34" ry="20" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <g fill="#5aa83e" stroke="#2f5e22" stroke-width="1">
    <path d="M40 58 q-6 -16 8 -14 q-2 12 -8 14"/>
    <path d="M58 54 q-2 -18 12 -12 q-6 12 -12 12"/>
    <path d="M78 58 q4 -16 14 -8 q-8 10 -14 8"/>
  </g>
  <circle cx="90" cy="62" r="18" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  ${glassGauge(96, 58, 6, '#6cc24a')}
  <path d="M82 68 q8 5 16 0" fill="none" stroke="#9a4f28" stroke-width="2" stroke-linecap="round"/>
  ${rivet(48, 78)} ${rivet(66, 82)} ${rivet(80, 78)}
  <path d="M44 88 l-6 8 M60 90 l0 9 M76 88 l6 8" stroke="#5a3f16" stroke-width="3" stroke-linecap="round"/>
  ${gear(40, 70, 7, 8, '#b07a32', 20)}
`);

// Voltikit — electric tesla-cat
M.Voltikit = wrap(`
  ${steam(30, 40)}
  <path d="M86 90 Q102 86 96 70 Q92 80 84 80 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <ellipse cx="56" cy="76" rx="28" ry="22" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M40 50 L34 30 L52 46 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M74 50 L80 30 L62 46 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <circle cx="34" cy="30" r="3" fill="#f8d84a"/><circle cx="80" cy="30" r="3" fill="#f8d84a"/>
  <circle cx="56" cy="56" r="22" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  ${glassGauge(47, 52, 6.5, '#f4d23a')}
  ${glassGauge(65, 52, 6.5, '#f4d23a')}
  <path d="M50 64 l6 4 l6 -4" fill="none" stroke="#9a4f28" stroke-width="2" stroke-linecap="round"/>
  <path d="M56 14 l-5 10 l6 -2 l-4 9" fill="none" stroke="#f8d84a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  ${rivet(38, 72)} ${rivet(74, 72)} ${rivet(56, 86)}
  ${gear(80, 84, 8, 8, '#b07a32', 5)}
`);

// Bouldox — armored rock boar
M.Bouldox = wrap(`
  <ellipse cx="60" cy="78" rx="40" ry="26" fill="url(#steel)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M22 74 q-10 -2 -12 8 q10 4 14 -2 Z" fill="#7c8893" stroke="#5a3f16" stroke-width="1.5"/>
  <rect x="30" y="52" width="60" height="30" rx="10" fill="url(#steel)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M34 62 q-10 6 -2 16" fill="none" stroke="#cfd6dc" stroke-width="3" stroke-linecap="round"/>
  <path d="M86 62 q10 6 2 16" fill="none" stroke="#cfd6dc" stroke-width="3" stroke-linecap="round"/>
  ${glassGauge(48, 64, 6, '#caa24a')}
  ${glassGauge(72, 64, 6, '#caa24a')}
  <rect x="52" y="72" width="16" height="7" rx="2" fill="#3a2c1e"/>
  <rect x="55" y="73.5" width="3" height="4" fill="#cfd6dc"/><rect x="62" y="73.5" width="3" height="4" fill="#cfd6dc"/>
  ${rivet(36, 56)} ${rivet(60, 54)} ${rivet(84, 56)} ${rivet(36, 80)} ${rivet(84, 80)}
  <rect x="40" y="86" width="9" height="12" rx="2" fill="#6e7b86" stroke="#5a3f16"/>
  <rect x="71" y="86" width="9" height="12" rx="2" fill="#6e7b86" stroke="#5a3f16"/>
  ${gear(60, 40, 11, 9, '#9aa6b0', 0)}
`);

// Frostowl — clockwork ice owl
M.Frostowl = wrap(`
  ${steam(60, 18)}
  <path d="M30 56 Q14 70 22 92 Q30 78 38 80 Z" fill="url(#steel)" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M90 56 Q106 70 98 92 Q90 78 82 80 Z" fill="url(#steel)" stroke="#5a3f16" stroke-width="1.5"/>
  <ellipse cx="60" cy="68" rx="30" ry="32" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M40 40 L36 26 L48 36 Z" fill="url(#brass)" stroke="#5a3f16" stroke-width="1.2"/>
  <path d="M80 40 L84 26 L72 36 Z" fill="url(#brass)" stroke="#5a3f16" stroke-width="1.2"/>
  ${glassGauge(48, 56, 11, '#8fd6e8')}
  ${glassGauge(72, 56, 11, '#8fd6e8')}
  <circle cx="48" cy="56" r="3.5" fill="#1c2c33"/><circle cx="72" cy="56" r="3.5" fill="#1c2c33"/>
  <polygon points="56,68 64,68 60,78" fill="#9a4f28" stroke="#5a3f16" stroke-width="0.8"/>
  <path d="M46 84 q14 10 28 0" fill="none" stroke="#9a4f28" stroke-width="2"/>
  ${rivet(60, 96)} ${rivet(44, 90)} ${rivet(76, 90)}
`);

// Galeon — brass mechanical eagle
M.Galeon = wrap(`
  <path d="M58 60 Q18 40 8 58 Q30 60 40 70 Q24 70 22 82 Q44 74 56 76 Z"
        fill="url(#brass)" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M62 60 Q102 40 112 58 Q90 60 80 70 Q96 70 98 82 Q76 74 64 76 Z"
        fill="url(#brass)" stroke="#5a3f16" stroke-width="1.5"/>
  <ellipse cx="60" cy="64" rx="18" ry="26" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  <circle cx="60" cy="42" r="15" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  ${glassGauge(54, 40, 5, '#f0c23a')}
  ${glassGauge(66, 40, 5, '#f0c23a')}
  <polygon points="58,48 62,48 60,58 56,50" fill="#e2b04a" stroke="#5a3f16" stroke-width="0.8"/>
  ${rivet(60, 70)} ${rivet(54, 84)} ${rivet(66, 84)}
  <path d="M52 92 l-4 8 M68 92 l4 8" stroke="#9a4f28" stroke-width="3" stroke-linecap="round"/>
  ${gear(60, 64, 7, 8, '#9a4f28', 0)}
`);

// Spectross — ghostly steam bat
M.Spectross = wrap(`
  <g opacity="0.92">
  <path d="M58 54 Q20 38 10 56 Q26 56 30 66 Q16 64 16 78 Q40 66 56 70 Z"
        fill="#6a5a8a" stroke="#3a2c4a" stroke-width="1.5"/>
  <path d="M62 54 Q100 38 110 56 Q94 56 90 66 Q104 64 104 78 Q80 66 64 70 Z"
        fill="#6a5a8a" stroke="#3a2c4a" stroke-width="1.5"/>
  <ellipse cx="60" cy="62" rx="20" ry="22" fill="#7c6aa0" stroke="#3a2c4a" stroke-width="2"/>
  <path d="M46 44 L42 30 L54 42 Z" fill="#6a5a8a" stroke="#3a2c4a" stroke-width="1.2"/>
  <path d="M74 44 L78 30 L66 42 Z" fill="#6a5a8a" stroke="#3a2c4a" stroke-width="1.2"/>
  ${glassGauge(52, 58, 6.5, '#b48ce8')}
  ${glassGauge(68, 58, 6.5, '#b48ce8')}
  <path d="M50 72 q10 8 20 0" fill="none" stroke="#3a2c4a" stroke-width="2"/>
  <path d="M53 73 l2 5 M60 75 l0 5 M67 73 l-2 5" stroke="#e6d8ff" stroke-width="1.4"/>
  </g>
  <g opacity="0.4" fill="#c9b6f0"><circle cx="60" cy="92" r="5"/><circle cx="55" cy="100" r="3"/></g>
`);

// Fluffit — wind-up hamster
M.Fluffit = wrap(`
  <g transform="translate(86 38)"><circle r="9" fill="none" stroke="#8a6a22" stroke-width="2"/>
    <rect x="-2" y="-9" width="4" height="9" fill="#8a6a22"/><rect x="-9" y="-2" width="9" height="4" fill="#8a6a22"/></g>
  <ellipse cx="56" cy="74" rx="30" ry="28" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <circle cx="40" cy="52" r="9" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <circle cx="72" cy="52" r="9" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  ${glassGauge(48, 66, 6, '#c98a3a')}
  ${glassGauge(66, 66, 6, '#c98a3a')}
  <ellipse cx="57" cy="78" rx="5" ry="4" fill="#9a4f28"/>
  <path d="M50 84 q7 5 14 0" fill="none" stroke="#9a4f28" stroke-width="1.8"/>
  ${rivet(44, 80)} ${rivet(70, 80)}
`);

// Sproutle — seedling in a brass pot
M.Sproutle = wrap(`
  <path d="M60 56 q-2 -24 -16 -28 q6 16 16 28" fill="#5aa83e" stroke="#2f5e22" stroke-width="1.5"/>
  <path d="M60 56 q2 -20 16 -22 q-6 14 -16 22" fill="#6cc24a" stroke="#2f5e22" stroke-width="1.5"/>
  <path d="M60 60 q-1 -10 0 -16" stroke="#2f5e22" stroke-width="2.5" fill="none"/>
  <path d="M40 62 L80 62 L74 96 Q60 102 46 96 Z" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <rect x="38" y="58" width="44" height="9" rx="3" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.2"/>
  ${glassGauge(52, 80, 5, '#6cc24a')}
  ${glassGauge(68, 80, 5, '#6cc24a')}
  <path d="M55 90 q5 3 10 0" fill="none" stroke="#5a3f16" stroke-width="1.6"/>
  ${rivet(46, 72)} ${rivet(74, 72)}
`);

// Pebblit — riveted turtle
M.Pebblit = wrap(`
  <ellipse cx="60" cy="72" rx="38" ry="26" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M28 72 q32 -28 64 0 Z" fill="url(#steel)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M60 48 L60 72 M40 60 L80 60" stroke="#5a3f16" stroke-width="1.5"/>
  <circle cx="50" cy="58" r="3" fill="#8b97a2"/><circle cx="70" cy="58" r="3" fill="#8b97a2"/><circle cx="60" cy="66" r="3" fill="#8b97a2"/>
  <circle cx="24" cy="68" r="11" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  ${glassGauge(20, 66, 4, '#caa24a')}
  <rect x="38" y="90" width="9" height="9" rx="2" fill="#9a4f28" stroke="#5a3f16"/>
  <rect x="73" y="90" width="9" height="9" rx="2" fill="#9a4f28" stroke="#5a3f16"/>
  ${rivet(46, 74)} ${rivet(74, 74)}
`);

// Buzzlet — clockwork bee
M.Buzzlet = wrap(`
  <g opacity="0.6" fill="#cfe3f0" stroke="#8b97a2">
    <ellipse cx="42" cy="44" rx="14" ry="8" transform="rotate(-25 42 44)"/>
    <ellipse cx="78" cy="44" rx="14" ry="8" transform="rotate(25 78 44)"/></g>
  <ellipse cx="60" cy="70" rx="22" ry="26" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M40 64 h40 M40 76 h40 M44 88 h32" stroke="#3a2c1e" stroke-width="4"/>
  <circle cx="60" cy="44" r="13" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  ${glassGauge(54, 42, 4.5, '#f4d23a')}
  ${glassGauge(66, 42, 4.5, '#f4d23a')}
  <path d="M54 30 l-3 -8 M66 30 l3 -8" stroke="#5a3f16" stroke-width="2" stroke-linecap="round"/>
  <polygon points="60,96 56,104 64,104" fill="#9a4f28"/>
  ${rivet(60, 58)}
`);

// Scorchion — brass scorpion
M.Scorchion = wrap(`
  ${steam(92, 24)}
  <path d="M78 56 Q104 50 100 26 Q92 20 88 28 Q94 44 78 50 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <polygon points="88,22 96,16 98,26" fill="#f0742a" stroke="#5a3f16" stroke-width="1"/>
  <ellipse cx="48" cy="74" rx="34" ry="20" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M30 74 h44 M34 66 h36 M34 82 h36" stroke="#9a4f28" stroke-width="2"/>
  <path d="M24 66 q-14 -2 -16 8 q14 6 18 -2 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M22 82 q-14 2 -14 12 q14 2 18 -6 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  ${glassGauge(40, 70, 5, '#f0742a')}
  ${glassGauge(56, 70, 5, '#f0742a')}
  ${rivet(48, 80)}
`);

// Snapjaw — armored crocodile
M.Snapjaw = wrap(`
  <path d="M104 86 Q118 80 110 68 Q104 76 96 74 Z" fill="url(#steel)" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M14 70 Q4 66 14 60 L40 62 Q70 58 96 66 Q108 70 102 82 Q80 92 48 88 Q26 86 14 70 Z"
        fill="url(#steel)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M16 66 L22 60 L28 66 L34 60 L40 66 L46 60 L52 66" fill="none" stroke="#cfd6dc" stroke-width="2"/>
  <path d="M30 76 q-3 -24 4 -28 q5 4 5 26" fill="#7c8893" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M44 74 q-2 -22 5 -26 q5 4 4 24" fill="#7c8893" stroke="#5a3f16" stroke-width="1.5"/>
  ${glassGauge(74, 70, 6, '#5fb6e0')}
  <path d="M58 80 q10 4 22 0" fill="none" stroke="#5a3f16" stroke-width="2"/>
  ${rivet(50, 80)} ${rivet(66, 82)} ${rivet(86, 76)}
  ${gear(96, 80, 6, 8, '#9aa6b0', 0)}
`);

// ---- EVOLVED FORMS (larger, more ornate automatons) ----------

// Cinderwulf — Embercub's evolution: a great brass wolf wreathed in fire
M.Cinderwulf = wrap(`
  ${steam(96, 22)} ${steam(20, 22)}
  <path d="M24 96 Q4 88 12 66 Q2 58 12 50 L26 60 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="1.5"/>
  <g fill="#f0742a" opacity="0.85">
    <path d="M30 40 q-6 -20 4 -28 q4 14 2 26Z"/>
    <path d="M90 40 q6 -20 -4 -28 q-4 14 -2 26Z"/></g>
  <ellipse cx="60" cy="78" rx="36" ry="26" fill="url(#brass)" stroke="#5a3f16" stroke-width="2.5"/>
  <path d="M34 50 L24 24 L46 42 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M86 50 L96 24 L74 42 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  <circle cx="60" cy="56" r="28" fill="url(#brass)" stroke="#5a3f16" stroke-width="2.5"/>
  <path d="M40 62 Q60 84 80 62" fill="none" stroke="#9a4f28" stroke-width="3" stroke-linecap="round"/>
  ${glassGauge(48, 52, 8, '#f0742a')}
  ${glassGauge(72, 52, 8, '#f0742a')}
  <polygon points="56,66 64,66 60,74" fill="#3a2c1e"/>
  <path d="M48 78 l-4 6 m8 -4 l-2 7 m20 -9 l4 6 m-12 -2 l2 7" stroke="#9a4f28" stroke-width="2" stroke-linecap="round"/>
  ${rivet(36, 76, 2.6)} ${rivet(84, 76, 2.6)} ${rivet(60, 92, 2.6)}
  ${gear(96, 86, 11, 9, '#b07a32', 12)} ${gear(24, 86, 9, 8, '#b07a32', 30)}
`);

// Leviadon — Aquafin's evolution: a leviathan diving engine
M.Leviadon = wrap(`
  <path d="M100 44 Q118 36 110 60 Q104 52 94 56 Z" fill="url(#steel)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M16 82 Q2 72 16 60 Q40 40 78 46 Q112 52 108 78 Q100 102 56 100 Q28 98 16 82 Z"
        fill="url(#steel)" stroke="#5a3f16" stroke-width="2.5"/>
  <path d="M44 50 L36 28 L58 46 Z" fill="#6e7b86" stroke="#5a3f16" stroke-width="2"/>
  <path d="M60 44 L58 24 L70 42 Z" fill="#6e7b86" stroke="#5a3f16" stroke-width="1.5"/>
  <path d="M26 84 Q14 98 32 96 Q24 88 30 82Z" fill="#6e7b86" stroke="#5a3f16" stroke-width="1.5"/>
  ${glassGauge(82, 62, 9, '#5fb6e0')}
  ${glassGauge(58, 70, 6, '#5fb6e0')}
  <path d="M70 84 Q86 88 96 80" fill="none" stroke="#5a3f16" stroke-width="2.5"/>
  <path d="M40 70 L46 64 L52 70 L58 64 L64 70" fill="none" stroke="#cfd6dc" stroke-width="2"/>
  ${rivet(40, 60, 2.5)} ${rivet(56, 56, 2.5)} ${rivet(74, 84, 2.5)} ${rivet(50, 86, 2.5)}
  <g opacity="0.8" fill="#bfe3f5"><circle cx="106" cy="34" r="3"/><circle cx="112" cy="24" r="2"/></g>
  ${gear(28, 74, 9, 8, '#9aa6b0', 0)}
`);

// Thornguard — Thornling's evolution: a towering garden golem
M.Thornguard = wrap(`
  <g fill="#5aa83e" stroke="#2f5e22" stroke-width="1.2">
    <path d="M34 50 q-10 -20 6 -26 q0 16 -6 26"/>
    <path d="M54 42 q-4 -24 12 -18 q-4 16 -12 18"/>
    <path d="M84 50 q10 -18 18 -8 q-10 12 -18 8"/>
    <path d="M70 44 q6 -20 16 -12 q-8 14 -16 12"/></g>
  <path d="M16 92 Q2 90 10 76 Q16 70 24 76 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  <ellipse cx="60" cy="80" rx="40" ry="24" fill="url(#brass)" stroke="#5a3f16" stroke-width="2.5"/>
  <circle cx="86" cy="58" r="22" fill="url(#brass)" stroke="#5a3f16" stroke-width="2.5"/>
  <circle cx="36" cy="62" r="14" fill="url(#brass)" stroke="#5a3f16" stroke-width="2"/>
  ${glassGauge(92, 54, 7, '#6cc24a')}
  ${glassGauge(80, 60, 5, '#6cc24a')}
  <path d="M78 68 q10 5 18 -1" fill="none" stroke="#9a4f28" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M40 92 l-6 8 M58 94 l0 9 M78 92 l6 8" stroke="#5a3f16" stroke-width="4" stroke-linecap="round"/>
  ${rivet(48, 82, 2.6)} ${rivet(66, 86, 2.6)} ${rivet(36, 62, 2.4)}
  ${gear(40, 78, 8, 8, '#b07a32', 20)}
`);

// Voltabane — Voltikit's evolution: a tesla-coil panther
M.Voltabane = wrap(`
  ${steam(24, 34)}
  <path d="M88 94 Q106 90 98 70 Q94 82 84 82 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  <ellipse cx="56" cy="80" rx="32" ry="24" fill="url(#brass)" stroke="#5a3f16" stroke-width="2.5"/>
  <path d="M38 50 L30 26 L52 46 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  <path d="M76 50 L84 26 L62 46 Z" fill="url(#copper)" stroke="#5a3f16" stroke-width="2"/>
  <circle cx="30" cy="26" r="4" fill="#f8d84a"/><circle cx="84" cy="26" r="4" fill="#f8d84a"/>
  <circle cx="56" cy="56" r="26" fill="url(#brass)" stroke="#5a3f16" stroke-width="2.5"/>
  ${glassGauge(46, 52, 7.5, '#f4d23a')}
  ${glassGauge(66, 52, 7.5, '#f4d23a')}
  <path d="M48 66 l8 5 l8 -5" fill="none" stroke="#9a4f28" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M56 8 l-7 14 l8 -3 l-5 13" fill="none" stroke="#f8d84a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M22 60 l-8 -4 m76 4 l8 -4" stroke="#f8d84a" stroke-width="2" stroke-linecap="round"/>
  ${rivet(38, 78, 2.6)} ${rivet(74, 78, 2.6)} ${rivet(56, 90, 2.6)}
  ${gear(90, 88, 9, 8, '#b07a32', 5)}
`);

// Granitox — Bouldox's evolution: a fortress beast
M.Granitox = wrap(`
  <ellipse cx="60" cy="82" rx="44" ry="26" fill="url(#steel)" stroke="#5a3f16" stroke-width="2.5"/>
  <rect x="26" y="46" width="68" height="36" rx="8" fill="url(#steel)" stroke="#5a3f16" stroke-width="2.5"/>
  <rect x="30" y="40" width="12" height="10" fill="#9aa6b0" stroke="#5a3f16"/>
  <rect x="54" y="36" width="12" height="14" fill="#9aa6b0" stroke="#5a3f16"/>
  <rect x="78" y="40" width="12" height="10" fill="#9aa6b0" stroke="#5a3f16"/>
  <path d="M30 60 q-12 6 -4 18" fill="none" stroke="#cfd6dc" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M90 60 q12 6 4 18" fill="none" stroke="#cfd6dc" stroke-width="3.5" stroke-linecap="round"/>
  ${glassGauge(46, 60, 7, '#caa24a')}
  ${glassGauge(74, 60, 7, '#caa24a')}
  <rect x="50" y="70" width="20" height="8" rx="2" fill="#3a2c1e"/>
  <rect x="53" y="71.5" width="3" height="5" fill="#cfd6dc"/><rect x="58" y="71.5" width="3" height="5" fill="#cfd6dc"/><rect x="63" y="71.5" width="3" height="5" fill="#cfd6dc"/>
  ${rivet(34, 50, 2.6)} ${rivet(60, 48, 2.6)} ${rivet(86, 50, 2.6)} ${rivet(34, 78, 2.6)} ${rivet(86, 78, 2.6)}
  <rect x="38" y="86" width="11" height="14" rx="2" fill="#6e7b86" stroke="#5a3f16"/>
  <rect x="71" y="86" width="11" height="14" rx="2" fill="#6e7b86" stroke="#5a3f16"/>
  ${gear(60, 32, 13, 10, '#9aa6b0', 0)}
`);

// ============================================================
// CHARACTERS (overworld + battle UI helpers)
// ============================================================
function person(coatA, coatB, hat, extra) {
  return wrap(`
    <ellipse cx="60" cy="108" rx="22" ry="6" fill="#000" opacity="0.18"/>
    <rect x="44" y="62" width="32" height="40" rx="8" fill="${coatA}" stroke="#2b2016" stroke-width="2"/>
    <path d="M60 62 V102" stroke="${coatB}" stroke-width="2"/>
    <rect x="38" y="64" width="12" height="30" rx="6" fill="${coatA}" stroke="#2b2016" stroke-width="2"/>
    <rect x="70" y="64" width="12" height="30" rx="6" fill="${coatA}" stroke="#2b2016" stroke-width="2"/>
    <circle cx="60" cy="44" r="16" fill="#e6c79a" stroke="#2b2016" stroke-width="2"/>
    <circle cx="54" cy="44" r="2.2" fill="#2b2016"/><circle cx="66" cy="44" r="2.2" fill="#2b2016"/>
    ${hat}
    ${rivet(60, 74)} ${rivet(60, 86)}
    ${extra || ''}
  `);
}
const TOPHAT = `<rect x="46" y="14" width="28" height="20" rx="2" fill="#241a12" stroke="#000" stroke-width="1.5"/>
  <rect x="40" y="32" width="40" height="5" rx="2" fill="#241a12"/>
  <rect x="46" y="26" width="28" height="4" fill="#8a6a22"/>`;
const GOGGLES = `<rect x="44" y="30" width="32" height="7" rx="3" fill="#5a3f16"/>
  <circle cx="52" cy="38" r="7" fill="#7fd0e0" stroke="#8a6a22" stroke-width="2"/>
  <circle cx="68" cy="38" r="7" fill="#7fd0e0" stroke="#8a6a22" stroke-width="2"/>`;
const BONNET = `<path d="M44 40 q16 -22 32 0 q-16 -8 -32 0Z" fill="#b06a8a" stroke="#2b2016" stroke-width="1.5"/>`;
const CAP = `<path d="M44 38 q16 -16 32 0 Z" fill="#3a6a4a" stroke="#2b2016" stroke-width="1.5"/><rect x="60" y="22" width="14" height="4" rx="2" fill="#3a6a4a"/>`;

const C = {
  player: person('#7a4a24', '#5a3416', GOGGLES + `<path d="M44 40 q16 -14 32 0" fill="#6b4a2a"/>`),
  assistant: person('#dfe4e8', '#bcc4cc', GOGGLES),         // lab assistant w/ goggles
  granny: person('#7a5a8a', '#5a3f6a', BONNET, `<path d="M50 50 q10 6 20 0" stroke="#9a8" fill="none"/>`),
  hiker: person('#4a6a3a', '#35502a', CAP),
  kid: person('#b06a3b', '#8a4f28', `<path d="M44 40 q16 -16 32 0Z" fill="#6b4a2a"/>`),
  cliff: person('#6a5236', '#4a3826', CAP),
  sailor: person('#3a5a8a', '#2a426a', `<rect x="46" y="22" width="28" height="8" rx="3" fill="#eee"/><rect x="46" y="28" width="28" height="3" fill="#3a5a8a"/>`),
  professor: person('#eef1f4', '#cfd6dc', TOPHAT, `<rect x="48" y="62" width="24" height="40" rx="6" fill="#dfe4e8"/>`),
  nurse: person('#e8a0b0', '#c87890', `<path d="M44 38 q16 -10 32 0Z" fill="#fff"/><rect x="57" y="28" width="6" height="3" fill="#c0392b"/><rect x="59" y="26" width="2" height="7" fill="#c0392b"/>`),
  clerk: person('#3a8a6a', '#2a6a4a', `<path d="M44 40 q16 -14 32 0" fill="#5a3f16"/>`),
  cinda: person('#b0402a', '#8a2f1a', TOPHAT.replace(/#241a12/g, '#7a1f10').replace('#8a6a22', '#f0a030')),
  marlow: person('#2a5a8a', '#1a3f6a', TOPHAT.replace(/#241a12/g, '#103a5a').replace('#8a6a22', '#5fb6e0')),
  coach: person('#3a8a6a', '#246a4a', `<path d="M44 40 q16 -16 32 0Z" fill="#244a3a"/><rect x="58" y="22" width="20" height="3" rx="1" fill="#244a3a"/>`,
    `<rect x="40" y="70" width="40" height="5" rx="2" fill="#e2b04a"/>`),
};

// ============================================================
// TERRAIN tiles (drawn to an offscreen cache, 32x32)
// returns an <svg> string scaled to TILE size by the caller
// ============================================================
const T = {
  tree: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#6f9a4a"/>
    <rect x="14" y="20" width="4" height="9" fill="#6b4a2a"/>
    <circle cx="16" cy="15" r="11" fill="#3f7a3a"/>
    <circle cx="11" cy="17" r="7" fill="#4f8a44"/><circle cx="21" cy="17" r="7" fill="#357030"/>
    <circle cx="16" cy="11" r="6" fill="#5a9a4e"/>
    <g stroke="#2f5e22" stroke-width="0.5" opacity="0.5"><path d="M8 16 q8 4 16 0"/></g></svg>`,
  path: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#cdb487"/>
    <g stroke="#b89a66" stroke-width="1"><path d="M0 11 H32 M0 22 H32 M11 0 V11 M22 11 V22 M5 22 V32 M27 0 V11"/></g>
    <g fill="#bfa372" opacity="0.6"><rect x="3" y="3" width="6" height="5" rx="1"/><rect x="14" y="14" width="7" height="5" rx="1"/><rect x="24" y="25" width="5" height="5" rx="1"/></g></svg>`,
  grass: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#3f7a3a"/>
    <g stroke="#2f5e22" stroke-width="1.5" stroke-linecap="round">
    <path d="M6 28 q-2 -8 0 -12"/><path d="M11 30 q1 -8 3 -12"/><path d="M18 28 q-2 -9 0 -13"/>
    <path d="M24 30 q2 -8 0 -12"/><path d="M28 27 q-1 -7 1 -10"/></g>
    <g stroke="#5a9a4e" stroke-width="1.2" stroke-linecap="round">
    <path d="M8 29 q1 -7 2 -10"/><path d="M15 30 q-1 -8 1 -11"/><path d="M21 29 q1 -7 3 -10"/></g></svg>`,
  flower: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#6f9a4a"/>
    <g><circle cx="10" cy="11" r="3.2" fill="#d86a8a"/><circle cx="10" cy="11" r="1.3" fill="#f0d24a"/></g>
    <g><circle cx="23" cy="20" r="3.2" fill="#caa24a"/><circle cx="23" cy="20" r="1.3" fill="#7a4a1a"/></g>
    <g><circle cx="18" cy="7" r="2.6" fill="#9a7ad0"/><circle cx="18" cy="7" r="1" fill="#f0d24a"/></g></svg>`,
  water: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#2f6a7a"/>
    <rect width="32" height="32" fill="#357a8a" opacity="0.5"/>
    <g stroke="#7fd0e0" stroke-width="1.3" fill="none" opacity="0.7" stroke-linecap="round">
    <path d="M3 9 q5 -3 10 0 t10 0"/><path d="M5 19 q5 -3 10 0 t10 0"/><path d="M2 27 q5 -3 10 0 t10 0"/></g>
    <circle cx="24" cy="6" r="1.3" fill="#bfe8f0" opacity="0.8"/></svg>`,
  // ---- interior tiles ----
  floor: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#caa878"/>
    <g stroke="#b08a52" stroke-width="1"><path d="M0 0 V32 M16 0 V32 M8 0 V8 M24 0 V8 M8 16 V24 M24 16 V24"/><path d="M0 8 H32 M0 16 H32 M0 24 H32"/></g>
    <g fill="#dcc096" opacity="0.5"><rect x="1" y="1" width="6" height="6"/><rect x="17" y="9" width="6" height="6"/><rect x="9" y="25" width="6" height="6"/></g></svg>`,
  mat: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#caa878"/>
    <rect x="4" y="6" width="24" height="20" rx="3" fill="#a04030" stroke="#6a2418" stroke-width="2"/>
    <rect x="8" y="10" width="16" height="12" rx="2" fill="none" stroke="#e0b060" stroke-width="1.5"/>
    <path d="M16 10 V22 M8 16 H24" stroke="#e0b060" stroke-width="1"/></svg>`,
  wall: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#6a5238"/>
    <rect width="32" height="16" fill="#7a6244"/>
    <g stroke="#4a3826" stroke-width="1.4"><path d="M0 16 H32 M0 32 H32 M10 0 V16 M22 16 V32 M2 16 V32 M30 0 V16"/></g>
    <g fill="#9a7a4a"><circle cx="6" cy="8" r="1.4"/><circle cx="26" cy="8" r="1.4"/></g></svg>`,
  counter: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#caa878"/>
    <rect x="0" y="8" width="32" height="18" fill="#8a5a2a" stroke="#5a3f16" stroke-width="2"/>
    <rect x="0" y="8" width="32" height="6" fill="#a87a3a"/>
    <g fill="#e2b04a"><circle cx="6" cy="20" r="1.6"/><circle cx="26" cy="20" r="1.6"/></g>
    ${gear(16, 19, 5, 8, '#b07a32', 0)}</svg>`,
  rug: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="#caa878"/>
    <rect x="2" y="2" width="28" height="28" rx="2" fill="#3a6a8a" stroke="#244a6a" stroke-width="2"/>
    <rect x="7" y="7" width="18" height="18" fill="none" stroke="#7fb0d0" stroke-width="1.5"/>
    ${gear(16, 16, 6, 9, '#5a8aaa', 0)}</svg>`,
};

// Buildings: walls colored per kind, with brass trim & rivets
function buildingWall(kind, isDoor) {
  const cols = { L: ['#8a7ab0', '#6a5a90'], H: ['#c87a7a', '#a85a5a'], M: ['#6a8ac0', '#4a6aa0'], G: ['#caa24a', '#a07a2a'], A: ['#5aa890', '#3a8a6a'] };
  const c = cols[kind] || cols.G;
  let s = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="${c[1]}"/>
    <rect width="32" height="14" fill="${c[0]}"/>
    <rect y="13" width="32" height="3" fill="#8a6a22"/>
    <g fill="#7a5a24"><circle cx="4" cy="4" r="1.6"/><circle cx="28" cy="4" r="1.6"/><circle cx="4" cy="28" r="1.6"/><circle cx="28" cy="28" r="1.6"/></g>`;
  if (isDoor) {
    s += `<rect x="9" y="12" width="14" height="20" rx="2" fill="#3a2616" stroke="#1a120a" stroke-width="1"/>
      <rect x="11" y="14" width="10" height="9" fill="#6a4a2a" opacity="0.6"/>
      <circle cx="19" cy="23" r="1.6" fill="#e2b04a"/>`;
  } else {
    s += `<rect x="7" y="6" width="8" height="8" rx="1" fill="#bfe8f0" stroke="#8a6a22" stroke-width="1.5" opacity="0.85"/>
      <rect x="18" y="6" width="8" height="8" rx="1" fill="#bfe8f0" stroke="#8a6a22" stroke-width="1.5" opacity="0.85"/>`;
  }
  return s + `</svg>`;
}

// roof icon shown above doors per kind (brass plaque)
const ROOF = {
  l: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#cfd6dc" stroke="#5a3f16" stroke-width="2"/><rect x="13" y="6" width="6" height="9" rx="2" fill="#7fd0e0" stroke="#5a3f16"/><path d="M11 16 h10 v6 a5 5 0 0 1 -10 0Z" fill="#9ad0c0" stroke="#5a3f16"/></svg>`,
  h: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#f0e0e0" stroke="#5a3f16" stroke-width="2"/><rect x="14" y="9" width="4" height="14" fill="#c0392b"/><rect x="9" y="14" width="14" height="4" fill="#c0392b"/></svg>`,
  m: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#cae0a0" stroke="#5a3f16" stroke-width="2"/><path d="M9 12 h14 l-2 9 h-10Z" fill="#6a8a3a" stroke="#3a5e22"/><path d="M11 12 v-2 a5 5 0 0 1 10 0 v2" fill="none" stroke="#3a5e22" stroke-width="1.5"/></svg>`,
  g: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#f0d28a" stroke="#5a3f16" stroke-width="2"/><polygon points="16,7 19,13 25,13 20,17 22,24 16,20 10,24 12,17 7,13 13,13" fill="#c08a2a" stroke="#5a3f16" stroke-width="0.8"/></svg>`,
  a: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" fill="#bfe8d8" stroke="#5a3f16" stroke-width="2"/><rect x="8" y="14" width="16" height="4" rx="1" fill="#5a3f16"/><rect x="6" y="11" width="4" height="10" rx="1" fill="#3a8a6a" stroke="#244a3a"/><rect x="22" y="11" width="4" height="10" rx="1" fill="#3a8a6a" stroke="#244a3a"/></svg>`,
};

const SIGN = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#cdb487"/>
  <rect x="14" y="16" width="4" height="13" fill="#6b4a2a"/>
  <rect x="5" y="6" width="22" height="13" rx="2" fill="#8a5a2a" stroke="#5a3f16" stroke-width="1.5"/>
  <g stroke="#3a2616" stroke-width="1.2"><path d="M9 10 h14 M9 13 h14 M9 16 h9"/></g>
  <circle cx="7" cy="8" r="1" fill="#e2b04a"/><circle cx="25" cy="8" r="1" fill="#e2b04a"/></svg>`;

// ============================================================
// Capture device — the "Aether Orb" (brass capsule) for battle FX
// drawn directly on canvas elsewhere; expose nothing here.
// ============================================================

// expose
window.ART = {
  monsters: M,
  characters: C,
  terrain: T,
  roof: ROOF,
  sign: SIGN,
  buildingWall: buildingWall,
};
})();

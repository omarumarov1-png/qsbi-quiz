// Validates the club quiz bank after long-distractor patches: node club/tools/check.js
global.window = {};
const path = require("path");
for (const f of ["data-quiz-1.js", "data-quiz-2.js", "data-quiz-3.js", "data-long.js", "data-ideas.js", "data-games.js"]) require(path.join(__dirname, "..", f));
const Q = window.CLUB_Q, miss = [];
const w = t => t.toLowerCase().replace(/[«»"\.,—:!?()]/g, " ").split(/\s+/).filter(x => x.length > 2);
// same patch rule as club.js
window.CLUB_LONG.forEach(p => {
  const q = Q.find(x => x.q.startsWith(p[0])); if (!q) { miss.push(p[0]); return; }
  const L = w(p[1]); let k = -1;
  for (let i = 1; i < 4; i++) { const W = w(q.o[i]); if (W.length && W.every(x => L.includes(x))) { k = i; break; } }
  if (k < 0) { k = 1; for (let j = 2; j < 4; j++) if (q.o[j].length < q.o[k].length) k = j; }
  q.o[k] = p[1];
});
let longest = 0; const errs = [], seen = new Set();
for (const q of Q) {
  const L = q.o.map(o => o.length);
  if (L[0] === Math.max(...L) && L.filter(l => l === L[0]).length === 1) longest++;
  if (q.o.length !== 4 || new Set(q.o.map(o => o.toLowerCase())).size !== 4) errs.push("options: " + q.q);
  if (seen.has(q.q)) errs.push("duplicate question: " + q.q); seen.add(q.q);
  q.o.forEach((a, i) => q.o.forEach((b, j) => {
    if (i === j || /\d|→/.test(a + b)) return;
    const A = new Set(w(a)), B = new Set(w(b));
    if (A.size >= 2 && A.size < B.size && [...A].every(x => B.has(x))) errs.push("contained: " + q.q + " | " + a + " ⊂ " + b);
  }));
}
console.log("questions", Q.length, "| patches not matched:", miss.length ? miss : "none");
console.log("correct is the unique longest option in", longest, `(${Math.round(longest / Q.length * 100)}%)`);
console.log("ideas", window.CLUB_IDEAS.length, "| cases", window.CLUB_CASES.length, "| meetings", window.CLUB_MEETINGS.length);
if (errs.length) { console.log(errs.join("\n")); process.exit(1); } else console.log("no option conflicts");

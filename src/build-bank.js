// Merges original + new questions into questions.js and validates the bank.
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "original.js"), "utf8") + ";this.Q=QUESTIONS;", ctx);
const orig = ctx.Q.map(q => ({ ...q, opts: [q.opts[q.correct], ...q.opts.filter((_, i) => i !== q.correct)] }));
const fresh = [...require("./new-g1-4.js"), ...require("./new-g5-8.js"), ...require("./new-g9-11.js"), ...require("./new-topup.js"), ...require("./new-l21-g1-3.js"), ...require("./new-l21-g4-6.js"), ...require("./new-l21-g7-9.js"), ...require("./new-l21-g10-11.js"), ...require("./new-l25-g1-2.js"), ...require("./new-l25-g3-4.js"), ...require("./new-l25-g5-6.js"), ...require("./new-l25-g7-8.js"), ...require("./new-l25-g9.js"), ...require("./new-l25-g10-11.js")];
const all = [...orig, ...fresh].map(q => ({ g: q.g, l: q.l, topic: q.topic, q: q.q, opts: q.opts, ...(q.x ? { x: q.x } : {}) }));
const patch = require("./distractors.js"); let used = 0;
for (const q of all) { const p = patch[q.q]; if (p) { used++; q.opts = [p.c || q.opts[0], ...p.d]; } }
const unused = Object.keys(patch).filter(k => !all.some(q => q.q === k));
if (unused.length) console.warn("patch keys with no matching question:", unused);
console.log("distractor patches applied:", used);
const longer = Object.assign({}, require("./longer.js"), require("./longer-fixes.js")); let lused = 0;
for (const q of all) { const L = longer[q.q]; if (L) { lused++; const d = q.opts.slice(1); const nm = t => t.toLowerCase().replace(/[«»"\.,—:!?]/g, "").trim();
      // replace the distractor that L extends (shared opening); otherwise the shortest one
      let k = d.findIndex(o => nm(L).startsWith(nm(o).slice(0, Math.min(14, nm(o).length))));
      if (k < 0) { k = 0; d.forEach((o, i) => { if (o.length < d[k].length) k = i; }); }
      d[k] = L; q.opts = [q.opts[0], ...d]; } }
// Grade-specific long distractors for lessons 21+ (key "g/l|question"), same placement rule.
const longer21 = Object.assign({}, require("./longer-l21.js"), require("./longer-l25.js")); let l21 = 0;
for (const q of all) { const L = longer21[q.g + "/" + q.l + "|" + q.q]; if (L) { l21++; const d = q.opts.slice(1); const nm = t => t.toLowerCase().replace(/[«»"\.,—:!?]/g, "").trim();
  const wd = t => new Set(t.toLowerCase().replace(/[«»"\.,—:!?()]/g, " ").split(/\s+/).filter(w => w.length > 2));
  const LW = wd(L);
  // replace the distractor whose words L already contains (L is its longer version); else the one L extends; else the shortest
  let k = d.findIndex(o => { const W = wd(o); return W.size >= 1 && [...W].every(w => LW.has(w)); });
  if (k < 0) k = d.findIndex(o => nm(L).startsWith(nm(o).slice(0, Math.min(14, nm(o).length))));
  if (k < 0) { k = 0; d.forEach((o, i) => { if (o.length < d[k].length) k = i; }); }
  d[k] = L; q.opts = [q.opts[0], ...d]; } }
const l21unused = Object.keys(longer21).filter(k => !all.some(q => q.g + "/" + q.l + "|" + q.q === k));
if (l21unused.length) console.warn("longer-l21 keys with no matching question:", l21unused);
console.log("lesson 21+ long distractors applied:", l21);
const lunused = Object.keys(longer).filter(k => !all.some(q => q.q === k));
if (lunused.length) console.warn("longer keys with no matching question:", lunused);
console.log("long distractors applied:", lused);
all.sort((a, b) => a.g - b.g || a.l - b.l);
const errs = [], seen = new Set();
let longest = 0;
for (const q of all) {
  if (!Number.isInteger(q.g) || !Number.isInteger(q.l) || !q.topic || !q.q) errs.push("missing field: " + q.q);
  if (!Array.isArray(q.opts) || q.opts.length !== 4) errs.push("not 4 options: " + q.q);
  if (new Set(q.opts.map(o => o.trim().toLowerCase())).size !== q.opts.length) errs.push("duplicate option: " + q.q);
  const key = q.g + "|" + q.q.trim().toLowerCase();
  if (seen.has(key)) errs.push("duplicate question: " + q.q); seen.add(key);
  // no option may be a word-for-word subset of another (e.g. "X" next to "X, и ещё Y")
  const words = t => new Set(t.toLowerCase().replace(/[«»"\.,—:!?()]/g, " ").split(/\s+/).filter(w => w.length > 2));
  q.opts.forEach((a, i) => q.opts.forEach((b, j) => {
    if (i === j || /\d|→/.test(a + b)) return;
    const A = words(a), B = words(b);
    if (A.size >= 2 && A.size < B.size && [...A].every(w => B.has(w))) errs.push("option contained in another: " + q.q + " | " + a + " ⊂ " + b);
  }));
  const lens = q.opts.map(o => o.length);
  if (lens[0] === Math.max(...lens) && lens.filter(l => l === lens[0]).length === 1) longest++;
}
const per = {}; all.forEach(q => { const k = q.g + "/" + q.l; per[k] = (per[k] || 0) + 1; });
console.log("total", all.length, "(original", orig.length, "+ new", fresh.length + ")");
console.log("correct answer is the unique longest option in", longest, "of", all.length, `(${Math.round(longest / all.length * 100)}%)`);
console.log("per lesson min", Math.min(...Object.values(per)), "max", Math.max(...Object.values(per)));
console.log(Object.entries(per).map(([k, v]) => k + ":" + v).join("  "));
if (errs.length) { console.error("ERRORS:\n" + errs.join("\n")); process.exit(1); }
const out = "// QSBI quiz question bank — grades 1–11, lessons 17–32, Quarter 2 (2026)\n" +
  "// Generated by src/build-bank.js — edit the src/ files, not this one.\n" +
  "// Each item: { g: grade, l: lesson, topic, q, opts: [4] (first = correct; the app shuffles), x?: explanation }\n" +
  "const QUESTIONS = [\n" + all.map(q => JSON.stringify(q)).join(",\n") + "\n];\n";
fs.writeFileSync(path.join(__dirname, "..", "questions.js"), out);
console.log("wrote questions.js");

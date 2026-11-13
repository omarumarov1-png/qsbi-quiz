// Quick quality check for one source file of new questions: length giveaway + per-lesson counts.
// Usage: node src/check-file.js src/new-l25-g1-2.js
const path = require("path");
const qs = require(path.resolve(process.argv[2]));
let uniqLongest = 0, clear = [];
const per = {};
for (const q of qs) {
  per[q.g + "/" + q.l] = (per[q.g + "/" + q.l] || 0) + 1;
  const l = q.opts.map(o => o.length), m = Math.max(...l.slice(1));
  if (l[0] > m) { uniqLongest++; if (l[0] > m * 1.3) clear.push(q.g + "/" + q.l + " " + q.q); }
}
console.log(qs.length, "questions; correct is unique longest in", uniqLongest, `(${Math.round(uniqLongest / qs.length * 100)}%), clearly longer: ${clear.length}`);
console.log("per lesson:", Object.entries(per).map(([k, v]) => k + ":" + v).join(" "));
if (process.argv[3] === "-v") clear.forEach(c => console.log("  ", c));

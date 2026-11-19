// Offline cache for QSBI Квиз-арена. Bump VERSION whenever questions.js / app.js / index.html change.
const VERSION = "qsbi-quiz-v12";
const CORE = ["./", "index.html", "app.js", "graphics.js", "fx.js", "questions.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "icons.js", "club.html", "club/club.js", "club/data-quiz-1.js", "club/data-quiz-2.js", "club/data-quiz-3.js", "club/data-long.js", "club/data-ideas.js", "club/data-games.js",
  "lessons.html", "lessons/lessons.js", "lessons/data/index.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first for our own files (so updated questions show up immediately), cache fallback offline.
// Cache-first for Google Fonts.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("index.html"))));
});

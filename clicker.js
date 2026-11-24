// Presentation clicker support for the arena, the business club and the lessons.
// Omar's clicker (measured 2026-11-22): ▶ = PageDown, ◀ = PageUp (holding auto-repeats), top button = "b",
// bottom button toggles a "start show" burst (⌘↩, Ctrl+Shift, ⌘⌥P, Shift+F5) and Escape. Centre = laser only.
// Four keys become eight actions by timing:
//   ▶ tap = next        ◀ tap = prev        ▶▶ = select (click the highlighted item)   ◀◀ = back (to the top)
//   ▶ hold = scroll down   ◀ hold = scroll up   bottom = start (board / fullscreen), again = stop   top = black screen
// A page can take over any action: window.QSBI_CLICKER = { next, prev, select, back, start, stop, scroller, items }
// (each returns true when it handled the action). Otherwise the generic behaviour moves a bright highlight over
// the buttons on screen and clicks the highlighted one.
(function () {
  var DOUBLE_MS = 300, STEP_PX = 70;
  var hooks = function () { return window.QSBI_CLICKER || {}; };
  var lastTap = { key: "", t: 0 }, pending = null, held = null, presenting = false;

  // ---------- highlight ("focus ring" big enough for the back row) ----------
  var css = document.createElement('style');
  css.textContent =
    '.ck-focus{outline:4px solid #FFC93C!important;outline-offset:4px!important;box-shadow:0 0 0 10px rgba(255,201,60,.28)!important;border-radius:12px;position:relative;z-index:2}' +
    '#ck-black{position:fixed;inset:0;z-index:2147483646;background:#000;cursor:none}' +
    '#ck-hud{position:fixed;left:50%;top:calc(16px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:2147483647;background:rgba(13,11,30,.92);color:#fff;' +
    'font:800 15px/1 system-ui,sans-serif;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.2);pointer-events:none;opacity:0;transition:opacity .2s}' +
    '#ck-hud.on{opacity:1}@media (prefers-reduced-motion:reduce){#ck-hud{transition:none}}';
  document.head.appendChild(css);
  var hud, hudT;
  // hints follow the quiz language switch (i18n.js) where there is one; lessons and the club stay in Russian
  function L(ru, en) { return window.QI18N && QI18N.lang() === 'en' ? en : ru; }
  function say(text) {
    if (!hud) { hud = document.createElement('div'); hud.id = 'ck-hud'; hud.setAttribute('aria-live', 'polite'); document.body.appendChild(hud); }
    hud.textContent = text; hud.classList.add('on'); clearTimeout(hudT); hudT = setTimeout(function () { hud.classList.remove('on'); }, 900);
  }

  function visible(el) {
    if (!el || el.disabled || el.closest('[hidden]') || el.closest('[aria-hidden="true"]')) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }
  function items() {
    var h = hooks();
    var list = (h.items && h.items()) || Array.prototype.slice.call(document.querySelectorAll('a[href], button, select, summary, [role="button"], [tabindex="0"]'));
    return list.filter(function (el) { return visible(el) && !el.closest('#ck-hud, #ck-black, .pbar'); });
  }
  var cur = null;
  function highlight(el) {
    if (cur && cur !== el) cur.classList.remove('ck-focus');
    cur = el;
    if (!el) return;
    el.classList.add('ck-focus');
    try { el.focus({ preventScroll: true }); } catch (e) {}
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function move(dir) {
    var list = items(); if (!list.length) return;
    var i = list.indexOf(cur);
    // first press starts from the first item near the top of the screen
    if (i < 0) { var top = list.filter(function (el) { return el.getBoundingClientRect().bottom > 0; }); highlight(dir > 0 ? (top[0] || list[0]) : list[list.length - 1]); return; }
    highlight(list[(i + dir + list.length) % list.length]);
  }
  // the highlight is dropped when the page re-renders the element away
  setInterval(function () { if (cur && !document.contains(cur)) cur = null; }, 500);

  // ---------- actions ----------
  function act(name, arg) {
    var h = hooks();
    if (typeof h[name] === 'function' && h[name](arg)) return;
    if (name === 'next') move(1);
    else if (name === 'prev') move(-1);
    else if (name === 'select') { if (cur && document.contains(cur) && visible(cur)) { say(L('Выбрано', 'Selected')); cur.click(); } else move(1); }
    else if (name === 'back') { say(L('Наверх', 'To the top')); window.scrollTo({ top: 0, behavior: 'smooth' }); var l = items(); highlight(null); if (l[0]) highlight(l[0]); }
    else if (name === 'scroll') { var s = h.scroller && h.scroller(); (s || window).scrollBy({ top: arg * STEP_PX, behavior: 'auto' }); }
    else if (name === 'start') {
      presenting = true; say(L('Показ', 'Presenting'));
      var el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(function () {});
    }
    else if (name === 'stop') {
      presenting = false; say(L('Показ закрыт', 'Presentation closed'));
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    }
  }
  function black(on) {
    var b = document.getElementById('ck-black');
    if (on && !b) { b = document.createElement('div'); b.id = 'ck-black'; b.addEventListener('click', function () { black(false); }); document.body.appendChild(b); }
    if (!on && b) b.remove();
  }

  // ---------- gestures: tap / double tap / hold ----------
  function typing(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  function swallow(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  window.addEventListener('keydown', function (e) {
    var k = e.key, now = Date.now();
    // the bottom button's "start show" burst: ⌘↩, Ctrl+Shift, ⌘⌥P, Shift+F5. Its F5 starts the show;
    // ⌘↩ and ⌘⌥P are swallowed so they don't reveal answers or trigger browser shortcuts on the way.
    if (k === 'F5') { swallow(e); black(false); act('start'); return; }
    if (e.metaKey && (k === 'Enter' || e.code === 'KeyP')) { swallow(e); return; }
    if (typing(e)) return;
    if (document.getElementById('ck-black')) { swallow(e); if (k !== 'Meta' && k !== 'Shift' && k !== 'Control' && k !== 'Alt') black(false); return; }
    if ((k === 'b' || k === 'B' || k === 'и' || k === 'И' || k === '.') && !e.metaKey && !e.ctrlKey && !e.altKey) { swallow(e); black(true); return; }
    if (k === 'Escape' && (presenting || document.fullscreenElement || hooks().presenting && hooks().presenting())) { swallow(e); act('stop'); return; }
    if (k !== 'PageDown' && k !== 'PageUp') return;
    swallow(e);
    var dir = k === 'PageDown' ? 1 : -1;
    if (e.repeat) { if (!held || held.key !== k) { held = { key: k }; clearTimeout(pending); pending = null; } act('scroll', dir); return; }
    held = null;
  }, true);
  window.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k !== 'PageDown' && k !== 'PageUp') return;
    if (typing(e)) return;
    swallow(e);
    if (held && held.key === k) { held = null; return; } // end of a hold: it scrolled, no tap
    var now = Date.now();
    if (lastTap.key === k && now - lastTap.t < DOUBLE_MS && pending) {
      clearTimeout(pending); pending = null; lastTap = { key: '', t: 0 };
      act(k === 'PageDown' ? 'select' : 'back');
      return;
    }
    lastTap = { key: k, t: now };
    clearTimeout(pending);
    pending = setTimeout(function () { pending = null; act(k === 'PageDown' ? 'next' : 'prev'); }, DOUBLE_MS);
  }, true);
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement) presenting = false; });

  window.QSBI_CLICKER_API = { say: say, highlight: highlight, black: black };
})();

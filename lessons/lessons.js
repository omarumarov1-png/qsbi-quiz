// QSBI web lessons: grade → lesson list → lesson page; every block of a lesson is also a slide for the board.
// Data: lessons/data/index.js (list) + lessons/data/gNN.js (full lessons of one grade, loaded on demand).
// Routes (hash): #g7 = lessons of grade 7, #g7-l22 = lesson 22 of grade 7, #g7-l22-s4 = presenting slide 4.
(function () {
  var app = document.getElementById('app');
  var IDX = window.QSBI_LESSON_INDEX || {};
  var GRADES = Object.keys(IDX).map(Number).sort(function (a, b) { return a - b; });
  var LET = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];
  var cur = null, slides = [], present = -1;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(n) { return window.ICON ? ICON(n) : ''; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function plural(n, f) { return f[(n % 10 === 1 && n % 100 !== 11) ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 1 : 2]; }

  function loadGrade(g, done) {
    window.QSBI_LESSONS = window.QSBI_LESSONS || {};
    if (QSBI_LESSONS[g]) return done();
    var s = document.createElement('script');
    s.src = 'lessons/data/g' + (g < 10 ? '0' : '') + g + '.js';
    s.onload = done;
    s.onerror = function () { app.innerHTML = '<div class="card"><h2>Не получилось загрузить уроки</h2><p class="lede">Проверьте интернет и обновите страницу.</p></div>'; };
    document.head.appendChild(s);
  }

  // ───────── routing ─────────
  function route() {
    var h = (location.hash || '').replace('#', ''), m;
    var g = (m = h.match(/g(\d+)/)) ? +m[1] : +(store('qsbi-lessons-grade') || 0) || null;
    var l = (m = h.match(/l(\d+)/)) ? +m[1] : null;
    var s = (m = h.match(/s(\d+)/)) ? +m[1] : null;
    if (g && GRADES.indexOf(g) === -1) g = null;
    if (g) store('qsbi-lessons-grade', String(g));
    if (!g || !l) { closePresent(true); return list(g); }
    loadGrade(g, function () {
      var L = (QSBI_LESSONS[g] || []).filter(function (x) { return x.l === l; })[0];
      if (!L) return list(g);
      if (!cur || cur.id !== L.id) { cur = L; slides = build(L); page(L); }
      if (s) openPresent(s - 1, true); else closePresent(true);
    });
  }
  function go(h) { if (location.hash === h) route(); else location.hash = h; }

  // ───────── grade + lesson list ─────────
  function list(g) {
    cur = null;
    var chips = GRADES.map(function (x) { return '<button class="chip" data-grade="' + x + '" aria-pressed="' + (x === g) + '">' + x + ' класс</button>'; }).join('');
    var ls = g ? IDX[g] : [];
    var tiles = ls.map(function (x) {
      return '<a class="tile ltile" href="#g' + g + '-l' + x.l + '">' +
        (x.photo ? '<img class="lthumb" loading="lazy" alt="" src="lessons/img/' + (g < 10 ? '0' : '') + g + '_' + x.l + '.jpg">' : '') +
        '<span class="lnum">Урок ' + x.l + '</span><b>' + esc(x.topic) + '</b><span>' + esc(x.module || '') + (x.format ? ' · ' + esc(x.format) : '') + '</span></a>';
    }).join('');
    app.innerHTML =
      '<section class="card hero"><span class="kick">2 четверть · уроки ' + minmax() + '</span><h1>Уроки <em>QSBI</em></h1>' +
      '<p class="lede">Все уроки второй четверти для 1–11 классов: теория, словарь, примеры, разминки и задания с ответами. Каждый урок можно показать на доске, скачать презентацию и сразу пройти квиз.</p></section>' +
      '<section class="card"><div class="label">Выберите класс</div><div class="chips" id="grades">' + chips + '</div></section>' +
      (g ? '<section class="stack"><div class="label">' + g + ' класс · ' + ls.length + ' ' + plural(ls.length, ['урок', 'урока', 'уроков']) + '</div><div class="grid lgrid">' + tiles + '</div></section>'
         : '<p class="lede center">Начните с выбора класса — уроки появятся здесь.</p>');
    app.querySelectorAll('[data-grade]').forEach(function (b) { b.onclick = function () { go('#g' + b.getAttribute('data-grade')); }; });
    document.title = 'Уроки QSBI' + (g ? ' · ' + g + ' класс' : '');
    window.scrollTo(0, 0);
  }
  function minmax() { var a = []; GRADES.forEach(function (g) { IDX[g].forEach(function (x) { a.push(x.l); }); }); return Math.min.apply(null, a) + '–' + Math.max.apply(null, a); }

  // ───────── one lesson → slides ─────────
  function build(L) {
    var S = [];
    function add(kind, kick, title, body, cls) { S.push({ kind: kind, kick: kick, title: title, body: body, cls: cls || '' }); }
    var reveal = function (label) { return '<button class="btn btn-ghost reveal" data-reveal>' + ic('eye') + ' <span>' + (label || 'Показать ответы') + '</span></button>'; };

    add('title', 'Урок ' + L.l + ' · ' + L.g + ' класс', L.topic,
      (L.photo ? '<figure class="tphoto"><img src="' + L.photo.src + '" alt=""><figcaption>Фото: ' + esc(L.photo.author) + ' / Unsplash</figcaption></figure>' : '') +
      '<div class="chips static">' + [L.module, L.format].filter(Boolean).map(function (x) { return '<span class="chip">' + esc(x) + '</span>'; }).join('') +
      (L.skills || []).map(function (x) { return '<span class="chip soft">' + esc(x) + '</span>'; }).join('') + '</div>', 'stitle');

    var w = L.warm;
    if (w) {
      var body = '<ol class="rules">' + w.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>';
      if (w.kind === 'truth') body += '<div class="wgrid">' + w.items.map(function (it, i) {
        return '<div class="wcard"><span class="n">' + (i + 1) + '</span><b>' + esc(it.term) + '</b><p>' + esc(it.shown) + '</p>' +
          '<p class="ans ' + (it.truth ? 'ok' : 'no') + '">' + (it.truth ? ic('check') + ' Правда' : ic('cross') + ' Ловушка! Правильно: ' + esc(it.real)) + '</p></div>'; }).join('') + '</div>';
      if (w.kind === 'guess') body += '<div class="wgrid">' + w.items.map(function (it, i) {
        return '<div class="wcard"><span class="n">' + (i + 1) + '</span><span class="first q">' + esc(it.first) + '… ?</span><p>' + esc(it.real) + '</p><p class="ans ok">' + ic('check') + ' ' + esc(it.term) + '</p></div>'; }).join('') + '</div>';
      if (w.kind === 'match') body += '<div class="match"><div>' + w.items.map(function (it, i) {
        return '<div class="mterm"><span class="n blue">' + LET[i] + '</span><b>' + esc(it.term) + '</b><span class="ans tag">→ ' + (w.perm.indexOf(i) + 1) + '</span></div>'; }).join('') +
        '</div><div>' + w.perm.map(function (wi, p) {
        return '<div class="mdef"><span class="n">' + (p + 1) + '</span><p>' + esc(w.items[wi].real) + ' <span class="ans tag">' + LET[wi] + '</span></p></div>'; }).join('') + '</div></div>';
      add('warm', 'Разминка · 2 минуты · без материалов', 'Игра «' + w.name + '»', body + reveal(), 'srev');
    }

    if (L.goal || (L.criteria || []).length) add('goal', 'Цель урока', 'Что мы сегодня сможем',
      (L.goal ? '<p class="big">' + esc(L.goal) + '</p>' : '') +
      ((L.criteria || []).length ? '<ul class="checks">' + L.criteria.map(function (c) { return '<li>' + ic('check') + '<span>' + esc(c) + '</span></li>'; }).join('') + '</ul>' : '') +
      (L.result ? '<div class="note gold">' + ic('trophy') + '<span><b>Результат урока:</b> ' + esc(L.result) + '</span></div>' : ''));

    if ((L.stages || []).length) {
      var tot = L.stages.reduce(function (a, s) { return a + s.min; }, 0);
      add('map', 'Карта урока', tot + ' минут: маршрут урока',
        '<div class="tline">' + L.stages.map(function (s, i) { return '<span class="c' + (i % 6) + '" style="flex:' + s.min + '">' + s.min + '′</span>'; }).join('') + '</div>' +
        '<ol class="stages">' + L.stages.map(function (s, i) { return '<li><i class="c' + (i % 6) + '"></i><b>' + esc(s.stage) + '</b><span>' + s.min + ' мин</span></li>'; }).join('') + '</ol>');
    }

    if ((L.glossary || []).length) add('gloss', 'Словарь урока', 'Нажмите на карточку — увидите объяснение',
      '<div class="flips">' + L.glossary.map(function (g) { return '<button class="flip"><span class="f">' + esc(g.term) + '</span><span class="b">' + esc(g.def) + '</span></button>'; }).join('') + '</div>' +
      (L.english ? '<p class="eng">' + ic('globe') + ' <b>English:</b> ' + esc(L.english) + '</p>' : ''));

    if (L.concepts) add('concepts', 'Разбираемся', L.concepts.head === 'Понятия' ? 'Главное о теме' : L.concepts.head,
      '<div class="pcards">' + L.concepts.items.map(function (t, i) { return '<div class="pcard c' + (i % 4) + '">' + esc(t) + '</div>'; }).join('') + '</div>');
    if (L.steps) add('steps', 'По шагам', L.steps.head,
      '<ol class="flow">' + L.steps.items.map(function (t, i) { return '<li><span class="n">' + (i + 1) + '</span><p>' + esc(t) + '</p></li>'; }).join('') + '</ol>');
    if (L.scheme) add('scheme', 'Схема на доске', 'Рисуем вместе', '<div class="board"><p>' + esc(L.scheme) + '</p></div>');
    if ((L.examples || []).length) add('examples', 'Примеры', 'Как это выглядит в жизни',
      '<div class="pcards">' + L.examples.map(function (e, i) { return '<div class="pcard c' + (i % 4) + '"><span class="lab">' + esc(e.lab) + '</span>' + esc(e.text) + '</div>'; }).join('') + '</div>');
    if (L.photo) add('photo', 'Смотрим и обсуждаем', 'Фото дня: что здесь происходит?',
      '<div class="pq"><figure><img src="' + L.photo.src + '" alt="" loading="lazy"><figcaption>Фото: ' + esc(L.photo.author) + ' / Unsplash</figcaption></figure>' +
      '<div class="bubbles">' + L.photo.q.map(function (q, i) { return '<p class="bubble' + (i ? '' : ' gold') + '">' + esc(q) + '</p>'; }).join('') + '</div></div>');
    if (L.mistake) add('mistake', 'Типичная ошибка', 'Миф или правда? Разбираем ошибку',
      '<div class="mf"><div class="myth"><span>' + ic('cross') + ' Ошибка</span><p>' + esc(L.mistake.myth) + '</p></div>' +
      '<div class="fix"><span>' + ic('check') + ' Как правильно</span><p>' + esc(L.mistake.fix || 'Обсудим вместе, как исправить ошибку.') + '</p></div></div>');
    if ((L.check || []).length) add('check', 'Проверь себя', L.check.length + ' ' + plural(L.check.length, ['вопрос', 'вопроса', 'вопросов']) + ' на понимание',
      '<ol class="qs">' + L.check.map(function (q) { return '<li><b>' + esc(q.q) + '</b><p class="ans ok">' + ic('check') + ' ' + esc(q.a) + '</p></li>'; }).join('') + '</ol>' + reveal(), 'srev');
    if (L.kz || L.world) add('kzw', 'Казахстан и мир', 'Наша страна и весь мир',
      '<div class="pcards two">' + [['kz', 'flag', 'Казахстан'], ['world', 'globe', 'Мир']].filter(function (x) { return L[x[0]] && L[x[0]].text; }).map(function (x, i) {
        var v = L[x[0]]; return '<div class="pcard c' + (i ? 2 : 1) + '"><span class="lab">' + ic(x[1]) + ' ' + x[2] + '</span>' + esc(v.text) + (v.link ? '<em class="link">Связь с темой: ' + esc(v.link) + '</em>' : '') + '</div>'; }).join('') + '</div>');
    if (L.fact) add('fact', 'А вы знали?', 'Интересный факт из мира бизнеса', '<p class="big fact">' + ic('sparkles') + ' ' + esc(L.fact) + '</p>', 'sdark');

    (L.cards || []).forEach(function (c) {
      var lines = c.lines.map(function (l) { var m = l.match(/^([А-ЯЁA-Za-zа-яё ]{3,20}):\s*(.*)$/); return '<li>' + (m ? '<b>' + esc(m[1]) + ':</b> ' + esc(m[2]) : esc(l)) + '</li>'; }).join('');
      var ans = c.answers.length ? '<div class="answers ans"><span class="lab">' + ic('check') + ' Ответы для проверки</span><ul>' + c.answers.map(function (a, i) {
        return '<li><span class="tag">' + esc(a[0] ? (/^\d+$/.test(a[0]) ? '№ ' + a[0] : a[0]) : String(i + 1)) + '</span>' + esc(a[1]) + '</li>'; }).join('') + '</ul></div>' + reveal() : '';
      add('card', 'Карточка ' + c.n + ' · задание', c.title, '<ul class="task">' + lines + '</ul>' + (c.hand ? '<div class="note gold">' + ic('check') + '<span>' + esc(c.hand) + '</span></div>' : '') + ans, c.answers.length ? 'srev' : '');
    });

    if (L.homework || L.support || L.advanced) add('home', 'Дома', 'Домашнее задание',
      (L.homework ? '<p class="big">' + ic('pen') + ' ' + esc(L.homework) + '</p>' : '') +
      '<div class="pcards two">' + (L.support ? '<div class="pcard c1"><span class="lab">Если трудно</span>' + esc(L.support) + '</div>' : '') +
      (L.advanced ? '<div class="pcard c2"><span class="lab">Если легко</span>' + esc(L.advanced) + '</div>' : '') + '</div>');

    add('quiz', 'Финал', 'Проверим, что запомнилось',
      '<p class="big">Квиз по уроку ' + L.l + ' для ' + L.g + ' класса: вопросы с объяснениями, очки и рекорды.</p>' +
      '<a class="btn btn-primary xl" href="index.html?g=' + L.g + '&l=' + L.l + '">' + ic('rocket') + ' Пройти квиз по уроку</a>', 'sdark');
    return S;
  }

  function slideHtml(s, i) {
    return '<section class="slide k-' + s.kind + ' ' + s.cls + '" data-i="' + i + '"><div class="shead"><span class="kick">' + esc(s.kick) + '</span>' +
      '<h2>' + esc(s.title) + '</h2></div><div class="sbody">' + s.body + '</div></section>';
  }

  function page(L) {
    var deck = L.deck ? '<a class="btn btn-ghost" href="' + L.deck.url + '" download>' + ic('download') + ' Скачать презентацию <small>.pptx · ' + String(L.deck.mb).replace('.', ',') + ' МБ</small></a>' : '';
    app.innerHTML =
      '<nav class="crumbs"><a href="#g' + L.g + '">' + ic('chevl') + ' ' + L.g + ' класс</a></nav>' +
      '<div class="actions card"><button class="btn btn-pink" id="present">' + ic('play') + ' Показать на доске</button>' + deck +
      '<a class="btn btn-ghost" href="index.html?g=' + L.g + '&l=' + L.l + '">' + ic('rocket') + ' Квиз по уроку</a></div>' +
      '<div class="slides" id="slides">' + slides.map(slideHtml).join('') + '</div>' + neighbours(L);
    document.title = 'Урок ' + L.l + ' · ' + L.topic + ' · ' + L.g + ' класс';
    document.getElementById('present').onclick = function () { go('#g' + L.g + '-l' + L.l + '-s1'); };
    window.scrollTo(0, 0);
  }
  function neighbours(L) {
    var ls = IDX[L.g], i = ls.map(function (x) { return x.l; }).indexOf(L.l), p = ls[i - 1], n = ls[i + 1];
    return '<nav class="pn">' + (p ? '<a class="tile" href="#g' + L.g + '-l' + p.l + '"><span>' + ic('chevl') + ' Урок ' + p.l + '</span><b>' + esc(p.topic) + '</b></a>' : '<span></span>') +
      (n ? '<a class="tile next" href="#g' + L.g + '-l' + n.l + '"><span>Урок ' + n.l + ' ' + ic('chevr') + '</span><b>' + esc(n.topic) + '</b></a>' : '') + '</nav>';
  }

  // ───────── board mode: one slide at a time ─────────
  function openPresent(i, fromRoute) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    present = i;
    document.body.classList.add('presenting');
    var els = app.querySelectorAll('.slide');
    els.forEach(function (el, k) { el.classList.toggle('on', k === i); if (k === i) el.scrollTop = 0; });
    window.scrollTo(0, 0);
    var bar = document.getElementById('pbar');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'pbar'; bar.className = 'pbar';
      bar.innerHTML = '<button class="pbtn" data-p="exit" aria-label="Выйти из показа" title="Кликер: ▶/◀ — слайды · ▶▶ — показать ответы · ◀◀ — первый слайд · держать ▶/◀ — прокрутка · нижняя кнопка — показ/выход · верхняя — чёрный экран. Клавиатура: стрелки, Enter — ответы, Esc — выйти">' + ic('cross') + '</button><span class="pcount"></span>' +
        '<button class="pbtn" data-p="full" aria-label="Во весь экран">' + ic('expand') + '</button>' +
        '<button class="pbtn" data-p="prev" aria-label="Назад">' + ic('chevl') + '</button><button class="pbtn" data-p="next" aria-label="Дальше">' + ic('chevr') + '</button>';
      document.body.appendChild(bar);
    }
    bar.querySelector('.pcount').textContent = (i + 1) + ' / ' + slides.length;
    var want = '#g' + cur.g + '-l' + cur.l + '-s' + (i + 1);
    if (location.hash !== want) history.replaceState(null, '', want);
  }
  function closePresent(fromRoute) {
    if (present < 0 && !document.body.classList.contains('presenting')) return;
    present = -1;
    document.body.classList.remove('presenting');
    app.querySelectorAll('.slide.on').forEach(function (el) { el.classList.remove('on'); });
    var bar = document.getElementById('pbar'); if (bar) bar.remove(); blackout(false);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    if (!fromRoute && cur) history.replaceState(null, '', '#g' + cur.g + '-l' + cur.l);
  }
  function step(d) { if (present >= 0) openPresent(present + d); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-reveal]');
    if (t) { var s = t.closest('.slide'); var on = s.classList.toggle('shown'); t.querySelector('span').textContent = on ? 'Скрыть ответы' : 'Показать ответы'; return; }
    if (e.target.id === 'blackout') { blackout(false); return; }
    var f = e.target.closest('.flip'); if (f) { f.classList.toggle('turned'); return; }
    var p = e.target.closest('[data-p]');
    if (p) {
      var a = p.getAttribute('data-p');
      if (a === 'exit') closePresent();
      if (a === 'prev') step(-1);
      if (a === 'next') step(1);
      if (a === 'full') { var el = document.documentElement; if (document.fullscreenElement) document.exitFullscreen().catch(function () {}); else if (el.requestFullscreen) el.requestFullscreen().catch(function () {}); }
    }
  });
  // Presentation clickers are keyboards: next/prev = PageDown/PageUp (or arrows), «start show» = F5 / Shift+F5,
  // «black screen» = B or «.», start/stop toggles with Esc. Map them like PowerPoint does.
  function blackout(on) {
    var b = document.getElementById('blackout');
    if (on === undefined) on = !b;
    if (on && !b) { b = document.createElement('div'); b.id = 'blackout'; b.className = 'blackout'; document.body.appendChild(b); }
    if (!on && b) b.remove();
  }
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'F5' && cur) { e.preventDefault(); return openPresent(e.shiftKey && present >= 0 ? present : 0); }
    if (present < 0) return;
    // like PowerPoint: any key on the black screen just brings the same slide back
    if (document.getElementById('blackout') && k !== 'F5') { e.preventDefault(); blackout(false); return; }
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'n' || k === 'N') { e.preventDefault(); step(1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace' || k === 'p' || k === 'P') { e.preventDefault(); step(-1); }
    else if (k === 'Home') { e.preventDefault(); openPresent(0); }
    else if (k === 'End') { e.preventDefault(); openPresent(slides.length - 1); }
    else if (/^[bB.иИюЮ]$/.test(k)) { e.preventDefault(); blackout(true); }
    else if (k === 'Escape') closePresent();
    else if (k === 'Enter') { var s = app.querySelector('.slide.on [data-reveal]'); if (s) s.click(); }
  });
  // swipe on touch boards / phones
  var x0 = null;
  document.addEventListener('touchstart', function (e) { if (present >= 0) x0 = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1); });

  // presentation clicker (clicker.js): on the board ▶/◀ change slides, ▶▶ shows the answers, ◀◀ goes to the first
  // slide, holding scrolls a long slide; the bottom button starts/ends the board view of the open lesson
  window.QSBI_CLICKER = {
    presenting: function () { return present >= 0; },
    next: function () { if (present < 0) return false; step(1); return true; },
    prev: function () { if (present < 0) return false; step(-1); return true; },
    select: function () {
      if (present < 0) return false;
      var b = app.querySelector('.slide.on [data-reveal]');
      if (b) { b.click(); window.QSBI_CLICKER_API.say(app.querySelector('.slide.on').classList.contains('shown') ? 'Ответы' : 'Ответы скрыты'); }
      else window.QSBI_CLICKER_API.say('На этом слайде нет ответов');
      return true;
    },
    back: function () { if (present < 0) return false; openPresent(0); window.QSBI_CLICKER_API.say('Первый слайд'); return true; },
    start: function () {
      if (!cur) return false;
      openPresent(present >= 0 ? present : 0);
      var el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(function () {});
      return true;
    },
    stop: function () { if (present < 0) return false; closePresent(); return true; },
    scroller: function () { return present >= 0 ? app.querySelector('.slide.on') : null; }
  };

  window.addEventListener('hashchange', route);
  route();
})();

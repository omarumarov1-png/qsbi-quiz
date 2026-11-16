// QSBI NextGen business club: quizzes (solo / teams), endless idea generator, cases, games, simulator, meeting plans.
(function () {
  'use strict';
  var Q = window.CLUB_Q, IDEAS = window.CLUB_IDEAS, GEN = window.CLUB_GEN, CASES = window.CLUB_CASES, POOLS = window.CLUB_POOLS, MEET = window.CLUB_MEETINGS, SIM = window.CLUB_SIM;
  var MODS = [null,
    {c:"START", t:"Я предприниматель", e:"rocket"}, {c:"CUSTOMER", t:"Для кого мы создаём?", e:"users"}, {c:"PRODUCT", t:"Создаём продукт", e:"tools"},
    {c:"MONEY", t:"Деньги в бизнесе", e:"coins"}, {c:"BRAND", t:"Создаём свой бренд", e:"palette"}, {c:"SALES", t:"Учимся продавать", e:"handshake"},
    {c:"BUSINESS LAB", t:"Запускаем", e:"flask"}, {c:"SCALE", t:"От проекта к бизнесу", e:"trend"}, {c:"FINAL", t:"Выходим в свет", e:"trophy"}];
  // swap in long wrong options (club/data-long.js): replace the wrong option whose words it contains, else the shortest
  (window.CLUB_LONG || []).forEach(function (p) {
    var q = Q.filter(function (x) { return x.q.indexOf(p[0]) === 0; })[0]; if (!q) return;
    var w = function (t) { return t.toLowerCase().replace(/[«»"\.,—:!?()]/g, ' ').split(/\s+/).filter(function (x) { return x.length > 2; }); };
    var L = w(p[1]), k = -1;
    for (var i = 1; i < 4; i++) { var W = w(q.o[i]); if (W.length && W.every(function (x) { return L.indexOf(x) >= 0; })) { k = i; break; } }
    if (k < 0) { k = 1; for (var j = 2; j < 4; j++) if (q.o[j].length < q.o[k].length) k = j; }
    q.o = q.o.slice(); q.o[k] = p[1];
  });
  var view = document.getElementById('view');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  var money = function (n) { return (n < 0 ? '−' : '') + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₸'; };
  function load(k, d) { try { var v = localStorage.getItem('club_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('club_' + k, JSON.stringify(v)); } catch (e) {} }
  function plural(n, f) { var a = n % 10, b = n % 100; return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? f[1] : f[2]; }

  /* ---------- XP and game grades ---------- */
  var GRADES = [[0, 'NOVICE'], [400, 'PRACTITIONER'], [1200, 'FOUNDER']];
  var xp = load('xp', 0);
  function grade(x) { var g = GRADES[0]; GRADES.forEach(function (r) { if (x >= r[0]) g = r; }); return g[1]; }
  function addXp(n) { var before = grade(xp); xp += n; save('xp', xp); renderXp(); var after = grade(xp); if (after !== before) toast('Новый уровень: ' + after + '!'); }
  function renderXp() { var nx = GRADES.filter(function (r) { return r[0] > xp; })[0]; $('#xp').innerHTML = '<i>' + grade(xp) + '</i><span>' + xp + ' XP' + (nx ? ' · до ' + nx[1] + ' ' + (nx[0] - xp) : '') + '</span>'; }
  var tm; function toast(m) { var t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; clearTimeout(tm); tm = setTimeout(function () { t.remove(); }, 2200); }

  /* ---------- home ---------- */
  function home() {
    view.innerHTML = '<section class="card hero"><div class="kick">QSBI NextGen · от идеи к первому бизнесу</div><h1>Бизнес-клуб, где идеи <em>превращаются в продажи</em></h1>' +
      '<p class="lede">' + Q.length + ' вопросов по 9 модулям клуба, ' + CASES.length + ' кейсов «что бы ты сделал?», бесконечный генератор бизнес-идей, симулятор «Запусти бизнес с 10 000 ₸» и готовая игра для каждой из 36 встреч.</p></section>' +
      '<div class="grid">' +
      tile('#ideas', ICON('bulb'), 'Генератор бизнес-идей', 'Бесконечный поток идей: школа, город, онлайн') +
      tile('#quiz', ICON('brain'), 'Квизы по модулям', 'Соло или командами на проекторе') +
      tile('#cases', ICON('target'), 'Кейсы', 'Реальные ситуации и последствия решений') +
      tile('#games/sim', ICON('cash'), 'Симулятор 10 000 ₸', 'Цена, партия, случайные события') +
      tile('#games/pitch', ICON('timer'), 'Питч за 60 секунд', 'Случайный продукт и таймер') +
      tile('#games/sell', ICON('cart'), '«Продай мне…»', 'Предмет + неожиданный покупатель') +
      tile('#games/objection', ICON('shield'), 'Возражение дня', 'Тренируем ответы клиентам') +
      tile('#meetings', ICON('calendar'), '36 встреч клуба', 'Готовая игра к каждой встрече') + '</div>' +
      '<section class="card"><div class="label">Путь резидента</div><div class="grid">' + MODS.slice(1).map(function (m, i) { return '<a class="tile" href="#quiz/' + (i + 1) + '"><span class="e">' + ICON(m.e) + '</span><b>' + (i + 1) + '. ' + m.c + '</b><span>' + m.t + '</span></a>'; }).join('') + '</div></section>';
  }
  function tile(h, e, b, s) { return '<a class="tile" href="' + h + '"><span class="e">' + e + '</span><b>' + b + '</b><span>' + s + '</span></a>'; }

  /* ---------- quiz ---------- */
  var qs = { mod: 0, lv: 0, n: 10, teams: 0 }, run = null;
  function quizSetup(mod) {
    if (mod) qs.mod = mod;
    var pool = Q.filter(function (q) { return (!qs.mod || q.m === qs.mod) && (!qs.lv || q.lv === qs.lv); });
    view.innerHTML = '<section class="card stack"><div><div class="kick">Квиз клуба</div><h1 style="font-size:28px;margin-top:8px">Проверь бизнес-мышление</h1></div>' +
      '<div><div class="label">Модуль</div><div class="chips">' + chip('mod', 0, 'Все модули', qs.mod === 0) + MODS.slice(1).map(function (m, i) { return chip('mod', i + 1, ICON(m.e) + ' ' + m.c, qs.mod === i + 1); }).join('') + '</div></div>' +
      '<div><div class="label">Уровень</div><div class="chips">' + chip('lv', 0, 'Все', qs.lv === 0) + chip('lv', 1, '5–7 класс', qs.lv === 1) + chip('lv', 2, '8–11 класс', qs.lv === 2) + '</div></div>' +
      '<div><div class="label">Вопросов</div><div class="chips">' + [5, 10, 15, 20].map(function (n) { return chip('n', n, n, qs.n === n); }).join('') + '</div></div>' +
      '<div><div class="label">Режим</div><div class="chips">' + chip('teams', 0, '' + ICON('user') + ' Соло', qs.teams === 0) + chip('teams', 2, '' + ICON('users') + ' 2 команды', qs.teams === 2) + chip('teams', 3, '3 команды', qs.teams === 3) + chip('teams', 4, '4 команды', qs.teams === 4) + '</div></div>' +
      '<div class="row"><button class="btn btn-primary" data-go ' + (pool.length ? '' : 'disabled') + '>' + ICON('rocket') + ' Начать · ' + Math.min(qs.n, pool.length) + ' из ' + pool.length + '</button></div></section>';
    view.onclick = function (e) {
      var t = e.target.closest('[data-k]'); if (t) { qs[t.dataset.k] = +t.dataset.v; quizSetup(); return; }
      if (e.target.closest('[data-go]')) start(pool);
    };
  }
  function chip(k, v, txt, on) { return '<button class="chip" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + on + '">' + txt + '</button>'; }
  var TEAMS = ['<i class="tdot r"></i>Красные', '<i class="tdot b"></i>Синие', '<i class="tdot g"></i>Зелёные', '<i class="tdot y"></i>Жёлтые'];
  function start(pool) {
    var items = shuffle(pool).slice(0, qs.n).map(function (q) { var o = q.o.map(function (t, i) { return { t: t, ok: i === 0 }; }); return { q: q, o: shuffle(o) }; });
    run = { items: items, i: 0, right: 0, teams: qs.teams ? TEAMS.slice(0, qs.teams).map(function (n) { return { n: n, s: 0 }; }) : null, turn: 0, review: [] };
    ask();
  }
  function ask() {
    var it = run.items[run.i], m = MODS[it.q.m];
    view.innerHTML = '<section class="card stack"><div class="qhead"><span class="tag">' + ICON(m.e) + ' ' + m.c + ' · ' + (it.q.lv === 1 ? '5–7' : '8–11') + ' кл.</span><span class="count">' + (run.i + 1) + ' / ' + run.items.length + '</span></div>' +
      '<div class="bar"><i style="width:' + (run.i / run.items.length * 100) + '%"></i></div>' +
      (run.teams ? '<div class="teams">' + run.teams.map(function (t, k) { return '<div class="team' + (k === run.turn ? ' on' : '') + '"><span>' + t.n + (k === run.turn ? ' · отвечают' : '') + '</span><b>' + t.s + '</b></div>'; }).join('') + '</div>' : '') +
      '<div class="qtext">' + esc(it.q.q) + '</div><div class="opts">' + it.o.map(function (o, k) { return '<button class="opt" data-o="' + k + '"><span class="l">' + 'ABCD'[k] + '</span><span>' + esc(o.t) + '</span></button>'; }).join('') + '</div>' +
      '<div id="ex"></div></section>';
    view.onclick = function (e) {
      var b = e.target.closest('[data-o]'); if (b && !b.disabled) answer(+b.dataset.o);
      if (e.target.closest('[data-next]')) { run.i++; if (run.teams) run.turn = (run.turn + 1) % run.teams.length; run.i < run.items.length ? ask() : finish(); }
    };
  }
  function answer(k) {
    var it = run.items[run.i], ok = it.o[k].ok;
    view.querySelectorAll('.opt').forEach(function (b, j) { b.disabled = true; if (it.o[j].ok) b.classList.add('ok'); else if (j === k) b.classList.add('bad'); });
    if (ok) { run.right++; if (run.teams) run.teams[run.turn].s += 1; addXp(10); } else run.review.push(it);
    $('#ex').innerHTML = '<div class="explain">' + (ok ? ICON('check', 'ok') + ' Верно! ' : ICON('cross', 'no') + ' Не совсем. ') + esc(it.q.x) + '</div><div class="row" style="margin-top:12px"><button class="btn btn-primary" data-next>' + (run.i + 1 < run.items.length ? 'Дальше →' : 'Итоги') + '</button></div>';
  }
  function finish() {
    var n = run.items.length, pct = Math.round(run.right / n * 100);
    var win = run.teams ? run.teams.slice().sort(function (a, b) { return b.s - a.s; }) : null;
    view.innerHTML = '<section class="card stack" style="text-align:center"><div class="kick">Итоги</div>' +
      (win ? '<div class="big">' + (win[0].s === (win[1] && win[1].s) ? 'Ничья!' : win[0].n) + '</div><div class="teams">' + win.map(function (t) { return '<div class="team"><span>' + t.n + '</span><b>' + t.s + '</b></div>'; }).join('') + '</div>'
        : '<div class="big">' + run.right + ' / ' + n + '</div><p class="lede" style="margin:0 auto">' + (pct >= 90 ? 'Готовый основатель! ' + ICON('trophy') : pct >= 60 ? 'Сильно! Ещё немного — и ты эксперт.' : 'Хорошее начало — разберём ошибки ниже.') + '</p>') +
      (run.review.length ? '<div style="text-align:left" class="stack"><div class="label">Разбор ошибок</div>' + run.review.map(function (it) { return '<div class="explain"><b>' + esc(it.q.q) + '</b><br>✔ ' + esc(it.q.o[0]) + '<br><span style="color:var(--muted)">' + esc(it.q.x) + '</span></div>'; }).join('') + '</div>' : '') +
      '<div class="row" style="justify-content:center"><button class="btn btn-primary" data-again>Ещё раз</button><a class="btn btn-ghost" href="#quiz">Другой квиз</a></div></section>';
    view.onclick = function (e) { if (e.target.closest('[data-again]')) quizSetup(); };
  }

  /* ---------- ideas: curated + endless generator ---------- */
  var f = load('ideaf', { s: 'all', k: 'all', c: 'any' }), saved = load('saved', []), seen = load('seen', []), cur = null, crazyN = 0, made = 0;
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function okF(i) { return (f.s === 'all' || i.s === f.s) && (f.k === 'all' || i.k === f.k) && (f.c === 'any' || (f.c === 'free' ? i.c === 0 : i.c <= 5000)); }
  function generated() {
    for (var tries = 0; tries < 60; tries++) {
      var place = f.s === 'all' ? (Math.random() < 0.6 ? 'school' : pick(['city', 'online'])) : f.s;
      var auds = GEN.aud.filter(function (a) { return a.g === place || (place === 'online' && a.g !== 'city'); });
      var a = pick(auds), fl = GEN.fmt.filter(function (x) { return x.g.indexOf(place) >= 0; }), fm = pick(fl.length ? fl : GEN.fmt);
      if (!fm) continue;
      var pain = pick(a.p), tw = Math.random() < 0.7 ? pick(GEN.twist) : '';
      var idea = { t: cap(fm.n) + ' для ' + a.n + (tw ? ' — ' + tw : ''), d: cap(fm.n) + ' для ' + a.n + ', которые ' + pain + (tw ? '. Фишка: ' + tw + '.' : '.'), w: a.n, p: pain, v: fm.v, c: fm.c, k: fm.k, s: place, gen: true };
      if (okF(idea)) return idea;
    }
    return null;
  }
  function nextIdea() {
    crazyN = 0;
    var pool = IDEAS.filter(function (i) { return okF(i) && seen.indexOf(i.t) < 0; });
    if (!pool.length && seen.length) { seen = seen.filter(function (t) { return !IDEAS.some(function (i) { return i.t === t && okF(i); }); }); pool = IDEAS.filter(function (i) { return okF(i) && seen.indexOf(i.t) < 0; }); }
    var useGen = !pool.length || Math.random() < 0.45;
    cur = (useGen && generated()) || (pool.length ? pick(pool) : generated());
    if (cur && !cur.gen) { seen.push(cur.t); save('seen', seen.slice(-200)); }
    made++;
  }
  function ideas() {
    if (!cur) nextIdea();
    var place = { school: '' + ICON('school') + ' Школа', city: '' + ICON('city') + ' Город', online: '' + ICON('globe') + ' Онлайн' }, kind = { trad: 'Традиционный бизнес', startup: 'Стартап' };
    view.innerHTML = '<section class="card stack"><div><div class="kick">Генератор бизнес-идей</div><h1 style="font-size:26px;margin-top:8px">Бесконечный поток идей</h1><p class="lede">Ручные идеи + генератор комбинаций. Жми «Ещё идею» — идеи не кончаются. Больше всего — про школу.</p></div>' +
      '<div class="chips">' + fchip('s', 'all', 'Везде') + fchip('s', 'school', '' + ICON('school') + ' Школа') + fchip('s', 'city', '' + ICON('city') + ' Город') + fchip('s', 'online', '' + ICON('globe') + ' Онлайн') + '</div>' +
      '<div class="chips">' + fchip('k', 'all', 'Любой тип') + fchip('k', 'trad', 'Бизнес') + fchip('k', 'startup', 'Стартап') + fchip('c', 'any', 'Любой бюджет') + fchip('c', 'low', 'до 5 000 ₸') + fchip('c', 'free', 'С нуля — 0 ₸') + '</div></section>' +
      (cur ? '<section class="card idea" aria-live="polite"><div class="row"><span class="tag">' + place[cur.s] + '</span><span class="tag">' + kind[cur.k] + '</span>' + (cur.gen ? '<span class="tag">' + ICON('bolt') + ' сгенерировано</span>' : '<span class="tag">' + ICON('pen') + ' из коллекции</span>') + '</div>' +
        '<h2>' + esc(cur.t) + '</h2><p>' + esc(cur.d) + '</p>' +
        '<div class="facts"><div class="fact"><small>Для кого</small>' + esc(cur.w) + '</div><div class="fact"><small>Какую боль решает</small>' + esc(cur.p) + '</div><div class="fact"><small>MVP за неделю</small>' + esc(cur.v) + '</div><div class="fact"><small>Бюджет старта</small>' + (cur.c ? 'около ' + money(cur.c) : '0 ₸ — можно начать сегодня') + '</div></div>' +
        '<div class="fact" style="margin-top:10px;position:relative"><small>Как проверить</small>Поговорите с 5 людьми из «' + esc(cur.w) + '»: как они сейчас решают проблему «' + esc(cur.p) + '»? Сколько тратят? Предложите предзаказ.</div>' +
        (crazyN ? '<div class="crazy">' + ICON('crazy') + ' ' + esc(GEN.crazy[(crazyN - 1 + made) % GEN.crazy.length]) + '</div>' : '') +
        '<div class="row" style="margin-top:16px;position:relative"><button class="btn btn-primary" data-more>' + ICON('bolt') + ' Ещё идею</button><button class="btn btn-yellow" data-crazy>' + ICON('crazy') + ' Безумнее!</button><button class="btn btn-ghost" data-save>' + (saved.some(function (s) { return s.t === cur.t; }) ? ICON('starfill') + ' Сохранено' : ICON('star') + ' Сохранить') + '</button></div></section>'
        : '<section class="card">Под такие фильтры идей нет — попробуйте ослабить фильтр.</section>') +
      '<section class="card"><div class="label">Мои идеи · ' + saved.length + '</div>' + (saved.length ? '<div class="saved">' + saved.map(function (s, i) { return '<div><span>' + esc(s.t) + '</span><button data-del="' + i + '">убрать</button></div>'; }).join('') + '</div>' : '<p class="count">Сохраняйте понравившиеся идеи — они останутся на этом устройстве.</p>') + '</section>';
    view.onclick = function (e) {
      var t = e.target.closest('[data-f]'); if (t) { f[t.dataset.f] = t.dataset.v; save('ideaf', f); nextIdea(); ideas(); return; }
      if (e.target.closest('[data-more]')) { nextIdea(); addXp(1); ideas(); return; }
      if (e.target.closest('[data-crazy]')) { crazyN++; ideas(); return; }
      if (e.target.closest('[data-save]') && cur && !saved.some(function (s) { return s.t === cur.t; })) { saved.unshift({ t: cur.t }); save('saved', saved); addXp(2); toast('Идея сохранена'); ideas(); return; }
      if ((t = e.target.closest('[data-del]'))) { saved.splice(+t.dataset.del, 1); save('saved', saved); ideas(); }
    };
  }
  function fchip(k, v, txt) { return '<button class="chip" data-f="' + k + '" data-v="' + v + '" aria-pressed="' + (f[k] === v) + '">' + txt + '</button>'; }

  /* ---------- cases ---------- */
  var cdeck = [], ci = 0, cmod = 0;
  function cases(reset) {
    if (reset || !cdeck.length) { cdeck = shuffle(CASES.filter(function (c) { return !cmod || c.m === cmod; })); ci = 0; }
    var c = cdeck[ci % cdeck.length], m = MODS[c.m];
    view.innerHTML = '<section class="card stack"><div class="chips">' + '<button class="chip" data-cm="0" aria-pressed="' + (cmod === 0) + '">Все</button>' + MODS.slice(1).map(function (mm, i) { return '<button class="chip" data-cm="' + (i + 1) + '" aria-pressed="' + (cmod === i + 1) + '">' + ICON(mm.e) + ' ' + mm.c + '</button>'; }).join('') + '</div></section>' +
      '<section class="card stack"><div class="qhead"><span class="tag">' + ICON(m.e) + ' ' + m.c + '</span><span class="count">кейс ' + (ci % cdeck.length + 1) + ' / ' + cdeck.length + '</span></div><h2 style="font-size:24px">' + esc(c.t) + '</h2><p style="margin:0;font-size:18px;font-weight:600">' + esc(c.s) + '</p>' +
      '<div class="label">Что бы ты сделал?</div><div class="opts">' + shuffle(c.o.map(function (o, i) { return i; })).map(function (i, k) { return '<button class="opt" data-c="' + i + '"><span class="l">' + 'ABC'[k] + '</span><span>' + esc(c.o[i][0]) + '</span></button>'; }).join('') + '</div><div id="cr"></div></section>';
    view.onclick = function (e) {
      var t = e.target.closest('[data-cm]'); if (t) { cmod = +t.dataset.cm; cases(true); return; }
      t = e.target.closest('[data-c]');
      if (t && !t.disabled) {
        var o = c.o[+t.dataset.c], best = Math.max.apply(null, c.o.map(function (x) { return x[1]; }));
        view.querySelectorAll('[data-c]').forEach(function (b) { b.disabled = true; var oo = c.o[+b.dataset.c]; if (oo[1] === best) b.classList.add('ok'); else if (b === t) b.classList.add('bad'); });
        addXp(o[1] * 10);
        $('#cr').innerHTML = '<div class="case-res explain"><span class="pts">+' + o[1] * 10 + ' XP</span><br>' + esc(o[2]) + (o[1] < best ? '<br><br><b>Сильнее всего:</b> ' + esc(c.o.filter(function (x) { return x[1] === best; })[0][0]) : '') + '</div><div class="row" style="margin-top:12px"><button class="btn btn-primary" data-cn>Следующий кейс →</button></div>';
      }
      if (e.target.closest('[data-cn]')) { ci++; cases(); }
    };
  }

  /* ---------- games ---------- */
  var timerId = null;
  function games(sub) {
    clearInterval(timerId);
    if (sub === 'sim') return sim();
    if (sub === 'pitch' || sub === 'sell' || sub === 'objection' || sub === 'challenge') return card(sub);
    view.innerHTML = '<section class="card"><div class="kick">Игры для встречи</div><h1 style="font-size:26px;margin:8px 0 14px">Разогрев, тренировка, азарт</h1><div class="grid">' +
      tile('#games/sim', ICON('cash'), 'Запусти бизнес с 10 000 ₸', '3 раунда: продукт, цена, партия, события рынка') +
      tile('#games/pitch', ICON('timer'), 'Питч за 60 секунд', 'Случайная идея + таймер на экране') +
      tile('#games/sell', ICON('cart'), '«Продай мне…»', 'Предмет и покупатель — неожиданная пара') +
      tile('#games/objection', ICON('shield'), 'Возражение дня', 'Лучший ответ за 30 секунд') +
      tile('#games/challenge', ICON('dice'), 'Бизнес-рулетка', 'Случайный челлендж для команды') + '</div></section>';
  }
  function card(kind) {
    var cfg = {
      pitch: { k: 'Питч за 60 секунд', sec: 60, gen: function () { return 'Продай идею: <em>' + esc(pick(POOLS.pitch)) + '</em>'; }, hint: 'Проблема → решение → почему мы → призыв к действию.' },
      sell: { k: '«Продай мне…»', sec: 90, gen: function () { return 'Убеди <em>' + esc(pick(POOLS.buyer)) + '</em><br>купить <em>' + esc(pick(POOLS.sell)) + '</em>'; }, hint: 'Сначала 2–3 вопроса о потребности — потом продажа.' },
      objection: { k: 'Возражение дня', sec: 30, gen: function () { return 'Клиент говорит: <em>' + esc(pick(POOLS.objection)) + '</em>'; }, hint: 'Не спорь: уточни, покажи ценность, предложи вариант.' },
      challenge: { k: 'Бизнес-рулетка', sec: 120, gen: function () { return esc(pick(POOLS.challenge)); }, hint: 'Команда работает вместе, затем 30 секунд на ответ.' }
    }[kind];
    var left = cfg.sec;
    view.innerHTML = '<section class="card stack" style="text-align:center"><div class="kick">' + cfg.k + '</div><div class="prompt" id="pr">' + cfg.gen() + '</div><p class="lede" style="margin:0 auto">' + cfg.hint + '</p>' +
      '<div class="timer" id="tm">' + fmt(left) + '</div><div class="row" style="justify-content:center"><button class="btn btn-primary" data-start>▶ Старт</button><button class="btn btn-yellow" data-new>' + ICON('dice') + ' Другое задание</button><a class="btn btn-ghost" href="#games">Все игры</a></div></section>';
    function fmt(s) { return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    view.onclick = function (e) {
      if (e.target.closest('[data-new]')) { clearInterval(timerId); left = cfg.sec; $('#pr').innerHTML = cfg.gen(); $('#tm').textContent = fmt(left); $('#tm').classList.remove('low'); return; }
      if (e.target.closest('[data-start]')) {
        clearInterval(timerId); left = cfg.sec; $('#tm').textContent = fmt(left);
        timerId = setInterval(function () { left--; var el = $('#tm'); if (!el) { clearInterval(timerId); return; } el.textContent = fmt(Math.max(0, left)); el.classList.toggle('low', left <= 10); if (left <= 0) { clearInterval(timerId); el.textContent = 'Время!'; addXp(5); } }, 1000);
      }
    };
  }

  /* ---------- simulator «Запусти бизнес с 10 000 ₸» ---------- */
  var sm = null;
  function sim() {
    if (!sm) sm = { cash: SIM.start, round: 1, prod: null, price: 0, qty: 0, stock: 0, log: [] };
    var html = '<section class="card stack"><div class="qhead"><div><div class="kick">Симулятор</div><h1 style="font-size:24px;margin-top:6px">Запусти бизнес с 10 000 ₸</h1></div><div style="text-align:right"><div class="count">в кассе</div><div class="money' + (sm.cash < 0 ? ' neg' : '') + '">' + money(sm.cash) + '</div></div></div>';
    if (sm.round > SIM.rounds) {
      var profit = sm.cash - SIM.start;
      html += '<div class="big" style="text-align:center">' + (profit >= 0 ? '+' : '') + money(profit) + '</div><p class="lede" style="text-align:center;margin:0 auto">' + (profit > 6000 ? 'Сильный предприниматель! Цена и партия выбраны точно. ' + ICON('trophy') : profit > 0 ? 'Вы в плюсе! Попробуйте другую цену — можно заработать больше.' : 'Убыток — тоже опыт. Посмотрите в таблице, где ушли деньги: цена, партия или аренда?') + '</p>' + table() +
        '<div class="row" style="justify-content:center"><button class="btn btn-primary" data-reset>Сыграть ещё</button></div></section>';
      view.innerHTML = html; view.onclick = function (e) { if (e.target.closest('[data-reset]')) { sm = null; sim(); } }; return;
    }
    if (!sm.prod) {
      html += '<p class="lede" style="margin:0">Раунд 1 из ' + SIM.rounds + '. Выберите продукт. Аренда стола — ' + money(SIM.table) + ' за раунд.</p><div class="grid">' + SIM.products.map(function (p) { return '<button class="tile" data-p="' + p.id + '"><span class="e">' + ICON(p.e) + '</span><b>' + p.n + '</b><span>себестоимость ' + money(p.cost) + ' · обычно продают по ~' + money(p.ref) + '</span></button>'; }).join('') + '</div></section>';
      view.innerHTML = html; view.onclick = function (e) { var t = e.target.closest('[data-p]'); if (t) { sm.prod = SIM.products.filter(function (p) { return p.id === t.dataset.p; })[0]; sm.price = sm.prod.ref; sm.qty = Math.min(Math.round(sm.prod.demand / 2), Math.floor((sm.cash - SIM.table) / sm.prod.cost)); sim(); } }; return;
    }
    var p = sm.prod, maxQ = Math.max(0, Math.floor((sm.cash - SIM.table) / p.cost));
    sm.qty = Math.min(sm.qty, maxQ);
    html += '<p class="lede" style="margin:0">Раунд ' + sm.round + ' из ' + SIM.rounds + ' · ' + ICON(p.e) + ' ' + p.n + (sm.stock ? ' · на складе с прошлого раунда: ' + sm.stock + ' шт.' : '') + '</p>' +
      '<div><div class="label">Цена: <b style="color:#fff" id="pv">' + money(sm.price) + '</b></div><input type="range" id="price" min="' + p.cost + '" max="' + p.ref * 3 + '" step="50" value="' + sm.price + '"></div>' +
      '<div><div class="label">Сделать партию: <b style="color:#fff" id="qv">' + sm.qty + ' шт. · ' + money(sm.qty * p.cost) + '</b></div><input type="range" id="qty" min="0" max="' + maxQ + '" step="1" value="' + sm.qty + '"></div>' +
      '<div class="fact">' + ICON('bulb') + ' Прибыль с одной штуки: <b id="uv">' + money(sm.price - p.cost) + '</b> · чтобы окупить стол, нужно продать <b id="bv">' + Math.ceil(SIM.table / Math.max(1, sm.price - p.cost)) + '</b> шт.</div>' +
      '<div class="row"><button class="btn btn-primary" data-go>Открыть ярмарку →</button></div>' + (sm.log.length ? table() : '') + '</section>';
    view.innerHTML = html;
    $('#price').oninput = function () { sm.price = +this.value; $('#pv').textContent = money(sm.price); $('#uv').textContent = money(sm.price - p.cost); $('#bv').textContent = sm.price > p.cost ? Math.ceil(SIM.table / (sm.price - p.cost)) : '∞'; };
    $('#qty').oninput = function () { sm.qty = +this.value; $('#qv').textContent = sm.qty + ' шт. · ' + money(sm.qty * p.cost); };
    view.onclick = function (e) {
      if (!e.target.closest('[data-go]')) return;
      var evs = SIM.events.filter(function (ev) { return !ev.only || ev.only.indexOf(p.id) >= 0; }), ev = pick(evs);
      var perish = p.id === 'lemon' || p.id === 'cookie';
      var demand = Math.round(p.demand * ev.k * Math.pow(p.ref / sm.price, 1.6) * (0.85 + Math.random() * 0.3));
      var have = sm.qty + sm.stock, sold = Math.min(have, demand), rev = sold * sm.price, costs = sm.qty * p.cost + SIM.table;
      sm.cash += rev - costs; sm.stock = perish ? 0 : have - sold;
      sm.log.push({ r: sm.round, ev: ev.t, price: sm.price, qty: sm.qty, sold: sold, want: demand, rev: rev, costs: costs, left: have - sold, perish: perish });
      sm.round++; addXp(5);
      sim();
      var l = sm.log[sm.log.length - 1];
      view.insertAdjacentHTML('afterbegin', '<div class="event">' + ICON('megaphone') + ' ' + esc(l.ev) + ' Продано ' + l.sold + ' из ' + l.qty + (l.want > l.sold ? ' — хотели купить ' + l.want + '! Партия была мала.' : '') + (l.left && l.perish ? ' Остаток (' + l.left + ' шт.) испортился.' : l.left ? ' Остаток ' + l.left + ' шт. — на склад.' : '') + ' Прибыль раунда: ' + money(l.rev - l.costs) + '</div>');
    };
  }
  function table() {
    return '<div style="overflow-x:auto"><table class="sim-table"><thead><tr><th>Раунд</th><th>Цена</th><th>Сделали</th><th>Продали</th><th>Выручка</th><th>Расходы</th><th>Прибыль</th></tr></thead><tbody>' +
      sm.log.map(function (l) { return '<tr><td>' + l.r + '</td><td>' + money(l.price) + '</td><td>' + l.qty + '</td><td>' + l.sold + '</td><td>' + money(l.rev) + '</td><td>' + money(l.costs) + '</td><td>' + money(l.rev - l.costs) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }

  /* ---------- meetings ---------- */
  function meetings() {
    var html = '<section class="card"><div class="kick">Программа клуба</div><h1 style="font-size:26px;margin:8px 0 6px">36 встреч — 36 готовых игр</h1><p class="lede" style="margin-top:6px">Структура встречи: 10 мин Community · 15 мин Business Case · 20 мин Skill · 30 мин Project Lab · 10 мин Pitch & Reflection.</p>';
    for (var m = 1; m <= 9; m++) {
      html += '<div class="mod-h"><b>' + ICON(MODS[m].e) + ' ' + m + '. ' + MODS[m].c + '</b><span>' + MODS[m].t + ' · <a href="#quiz/' + m + '" style="color:var(--blue)">квиз модуля</a></span></div><div class="stack" style="gap:8px">' +
        MEET.filter(function (x) { return x.m === m; }).map(function (x) { return '<details class="meet"><summary><span class="n">' + x.n + '</span><span>' + esc(x.t) + '<small>' + esc(x.g) + ' · ' + esc(x.time) + '</small></span></summary><div class="body"><p>' + esc(x.h) + '</p><p style="color:var(--muted)">Нужно: ' + esc(x.need) + '</p></div></details>'; }).join('') + '</div>';
    }
    view.innerHTML = html + '</section>';
    view.onclick = null;
  }

  /* ---------- router ---------- */
  function route() {
    clearInterval(timerId);
    var h = location.hash.slice(1).split('/'), t = h[0];
    document.querySelectorAll('.tabs a').forEach(function (a) { a.setAttribute('aria-current', a.dataset.t === t ? 'page' : 'false'); });
    view.onclick = null;
    if (t === 'quiz') quizSetup(+h[1] || 0);
    else if (t === 'ideas') ideas();
    else if (t === 'cases') cases();
    else if (t === 'games') games(h[1]);
    else if (t === 'meetings') meetings();
    else home();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  renderXp(); route();
})();

// RU / EN switch for the quiz (index.html + app.js). The interface switches fully — no side-by-side text.
// Strings: QI18N.t(key, {vars}). Static markup: data-i18n (text), data-i18n-html, data-i18n-aria, data-i18n-title.
// Questions: QI18N.q(question) returns the question in the current language (English bank = questions-en.js,
// same order as questions.js, loaded only when English is chosen). The choice is remembered on the device;
// ?lang=en (or #…-en in the artifact) in a shared link opens the quiz in English.
(function () {
  var D = {
    ru: {
      htmlTitle: 'QSBI Квиз-арена — бизнес-образование 1–11 классы', title: 'QSBI Квиз-арена', sub: '2 четверть · уроки 17–32',
      lessons: 'Уроки', lessonsAria: 'Уроки QSBI: теория, слайды и презентации', club: 'Бизнес-клуб', clubShort: 'Клуб', clubAria: 'Бизнес-клуб QSBI NextGen',
      lessonsBannerT: 'Уроки QSBI · 1–11 классы', lessonsBannerS: 'Теория, словарь, разминки и задания с ответами · показ на доске · презентации для скачивания',
      clubBannerT: 'Бизнес-клуб QSBI NextGen', clubBannerS: 'Генератор бизнес-идей, кейсы, симулятор 10 000 ₸ и командные квизы · 5–11 классы',
      kicker: 'Бизнес-образование QSBI', heroTitle: 'Проверь, что ты <span class="hl">реально</span> понял урок',
      lede: 'Выбери класс и урок. Вопросы собраны из глоссариев, формул и примеров твоих уроков по бизнес-образованию.',
      statQ: 'вопросов', statL: 'уроков', statG: 'классов', statCorrect: 'верно', statWrong: 'ошибок',
      ticker: ['ИПЦ', 'AIDA', 'SMART-цель', 'ROMI', 'CTR', 'PR-ход', 'Себестоимость', 'Подушка безопасности', 'Депозит', 'Целевая аудитория', 'Диаграмма Ганта', 'Сторителлинг', 'Капитализация', 'Слоган', '₸'],
      grade: 'Класс', lesson: 'Урок', howMany: 'Сколько вопросов', available: 'Доступно вопросов', start: 'Начать квиз', share: 'Ссылка на этот квиз',
      allGrades: 'Все классы', gradeAria: '{g} класс', allLessonsOf: 'Все уроки {g} класса', allLessons: 'Все уроки', lessonN: 'Урок {l}', lessonDot: 'Урок {l} · ',
      allAvailable: 'Все доступные', record: '★ Рекорд: {p}%',
      footer: '{q} вопросов · {g} классов · уроки {a}–{b}',
      shareAll: 'все классы', shareGrade: '{g} класс', shareAllL: 'все уроки', shareL: 'урок {l}', shareTitle: 'QSBI Квиз-арена', shareText: 'Квиз: {label}',
      copied: 'Ссылка скопирована: {label}', copyLink: 'Скопируйте ссылку: ',
      quitAria: 'Выйти из квиза', quitTitle: 'Выйти (Esc)', correct: 'Верно', wrong: 'Ошибки', streak: 'Серия',
      tag: 'Класс {g} · Урок {l} · {t}', right: 'Верно! ', rightAnswer: 'Правильный ответ: {a}. ', results: 'Итоги ', next: 'Дальше →',
      answeredOf: 'Отвечено {n} из {m}. Можно посмотреть итоги по отвеченным вопросам или выйти в меню.', noneAnswered: 'Вы ещё не ответили ни на один вопрос. Выйти в меню?',
      result: 'результат', great: 'отлично', good: 'хорошо', tryAgain: 'попробуй ещё',
      subGreat: 'Невероятно! Ты мастер бизнеса!', subGood: 'Хороший результат, но есть куда расти', subLow: 'Стоит вернуться к уроку и попробовать снова',
      early: 'Квиз завершён досрочно: {n} из {m} вопросов. В рекорд не идёт.', newRecord: 'Новый рекорд! (было {p}%)', firstResult: 'Первый результат сохранён!', best: '★ Лучший результат: {p}%',
      reviewRight: 'Верно: {a}', review: 'Разобрать ошибки', change: '↺ Другое', retry: 'Ещё раз',
      quitQ: 'Выйти из квиза?', showResults: 'Показать итоги', toMenu: 'Выйти в меню', continue: 'Продолжить квиз',
      letters: ['А', 'Б', 'В', 'Г'], streakN: '{n} подряд!', loadFail: 'Не удалось загрузить английскую версию. Проверьте интернет.'
    },
    en: {
      htmlTitle: 'QSBI Quiz Arena — business education, grades 1–11', title: 'QSBI Quiz Arena', sub: 'Term 2 · lessons 17–32',
      lessons: 'Lessons', lessonsAria: 'QSBI lessons: theory, slides and presentations (in Russian)', club: 'Business Club', clubShort: 'Club', clubAria: 'QSBI NextGen Business Club (in Russian)',
      lessonsBannerT: 'QSBI Lessons · grades 1–11', lessonsBannerS: 'Theory, glossary, warm-ups and tasks with answers · board mode · downloadable slides (in Russian)',
      clubBannerT: 'QSBI NextGen Business Club', clubBannerS: 'Business idea generator, cases, a 10,000 ₸ simulator and team quizzes · grades 5–11 (in Russian)',
      kicker: 'QSBI Business Education', heroTitle: 'Check that you <span class="hl">really</span> understood the lesson',
      lede: 'Choose your grade and lesson. The questions come from the glossaries, formulas and examples in your business lessons.',
      statQ: 'questions', statL: 'lessons', statG: 'grades', statCorrect: 'correct', statWrong: 'wrong',
      ticker: ['CPI', 'AIDA', 'SMART goal', 'ROMI', 'CTR', 'PR stunt', 'Cost price', 'Emergency fund', 'Deposit', 'Target audience', 'Gantt chart', 'Storytelling', 'Capitalisation', 'Slogan', '₸'],
      grade: 'Grade', lesson: 'Lesson', howMany: 'How many questions', available: 'Questions available', start: 'Start quiz', share: 'Link to this quiz',
      allGrades: 'All grades', gradeAria: 'Grade {g}', allLessonsOf: 'All grade {g} lessons', allLessons: 'All lessons', lessonN: 'Lesson {l}', lessonDot: 'Lesson {l} · ',
      allAvailable: 'All available', record: '★ Best: {p}%',
      footer: '{q} questions · {g} grades · lessons {a}–{b}',
      shareAll: 'all grades', shareGrade: 'grade {g}', shareAllL: 'all lessons', shareL: 'lesson {l}', shareTitle: 'QSBI Quiz Arena', shareText: 'Quiz: {label}',
      copied: 'Link copied: {label}', copyLink: 'Copy the link: ',
      quitAria: 'Leave the quiz', quitTitle: 'Leave (Esc)', correct: 'Correct', wrong: 'Wrong', streak: 'Streak',
      tag: 'Grade {g} · Lesson {l} · {t}', right: 'Correct! ', rightAnswer: 'The right answer: {a}. ', results: 'Results ', next: 'Next →',
      answeredOf: 'You have answered {n} of {m}. You can see the results for the questions you answered or go back to the menu.', noneAnswered: "You haven't answered any questions yet. Go back to the menu?",
      result: 'score', great: 'excellent', good: 'good', tryAgain: 'try again',
      subGreat: "Amazing! You're a business pro!", subGood: 'A good result, with room to grow', subLow: 'Go back to the lesson and try again',
      early: 'Quiz ended early: {n} of {m} questions. This does not count as a record.', newRecord: 'New record! (was {p}%)', firstResult: 'First result saved!', best: '★ Best result: {p}%',
      reviewRight: 'Correct: {a}', review: 'Review mistakes', change: '↺ Change', retry: 'Try again',
      quitQ: 'Leave the quiz?', showResults: 'Show results', toMenu: 'Back to menu', continue: 'Keep going',
      letters: ['A', 'B', 'C', 'D'], streakN: '{n} in a row!', loadFail: "Couldn't load the English version. Check your internet connection."
    }
  };
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function fromLink() {
    try { var p = new URLSearchParams(location.search).get('lang'); if (p === 'en' || p === 'ru') return p; } catch (e) {}
    var h = (location.hash || '').replace('#', '');
    if (/(?:^|-)en$/.test(h)) return 'en';
    if (/(?:^|-)ru$/.test(h)) return 'ru';
    return null;
  }
  var lang = fromLink() || get('qsbi-quiz-lang') || 'ru';
  var listeners = [];

  function t(key, vars) {
    var s = (D[lang] && D[lang][key] != null) ? D[lang][key] : D.ru[key];
    if (typeof s !== 'string') return s;
    return s.replace(/\{(\w+)\}/g, function (m, v) { return vars && vars[v] != null ? vars[v] : m; });
  }
  function applyStatic(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.setAttribute('title', t(el.getAttribute('data-i18n-title'))); });
    var tk = document.getElementById('ticker-track');
    if (tk) { var words = t('ticker'); tk.innerHTML = ''; words.concat(words).forEach(function (w) { var s = document.createElement('span'); s.className = 'tk'; s.textContent = w; tk.appendChild(s); }); }
    document.documentElement.lang = lang;
    document.title = t('htmlTitle');
    document.querySelectorAll('.lang-sw [data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang)); });
  }

  // English question bank, loaded on demand
  var enState = typeof QUESTIONS_EN !== 'undefined' ? 'ready' : 'none', waiting = [];
  function loadEnglish(done) {
    if (enState === 'ready') return done(true);
    waiting.push(done);
    if (enState === 'loading') return;
    enState = 'loading';
    var s = document.createElement('script'); s.src = 'questions-en.js';
    s.onload = function () { enState = typeof QUESTIONS_EN !== 'undefined' ? 'ready' : 'none'; var w = waiting; waiting = []; w.forEach(function (f) { f(enState === 'ready'); }); };
    s.onerror = function () { enState = 'none'; s.remove(); var w = waiting; waiting = []; w.forEach(function (f) { f(false); }); };
    document.head.appendChild(s);
  }
  // index of every question in the Russian bank = its index in the English bank
  if (typeof QUESTIONS !== 'undefined') QUESTIONS.forEach(function (q, i) { q._i = i; });
  function q(src) {
    if (lang !== 'en' || enState !== 'ready') return src;
    var e = QUESTIONS_EN[src._i];
    if (!e) return src;
    return { g: src.g, l: src.l, _i: src._i, ruTopic: src.topic, topic: e.topic || src.topic, q: e.q, opts: e.opts, x: e.x };
  }
  function topic(ruTopic, g, l) {
    if (lang !== 'en' || enState !== 'ready') return ruTopic;
    for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].g === g && QUESTIONS[i].l === l) return (QUESTIONS_EN[i] && QUESTIONS_EN[i].topic) || ruTopic;
    return ruTopic;
  }
  function setLang(next, onFail) {
    if (next === lang && (next === 'ru' || enState === 'ready')) return;
    var apply = function () { lang = next; set('qsbi-quiz-lang', next); applyStatic(); listeners.forEach(function (f) { f(lang); }); };
    if (next === 'en') loadEnglish(function (ok) { if (ok) apply(); else if (onFail) onFail(); });
    else apply();
  }

  window.QI18N = {
    t: t, q: q, topic: topic, applyStatic: applyStatic, setLang: setLang,
    lang: function () { return lang; }, onChange: function (f) { listeners.push(f); },
    ready: function (done) { if (lang === 'en') loadEnglish(function (ok) { if (!ok) { lang = 'ru'; } applyStatic(); done(); }); else { applyStatic(); done(); } }
  };
})();

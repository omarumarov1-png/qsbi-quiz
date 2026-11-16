(function(){
  "use strict";

  function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

  var ALL_GRADES = [];
  var ALL_LESSONS = [];
  QUESTIONS.forEach(function(q){
    if(ALL_GRADES.indexOf(q.g) === -1) ALL_GRADES.push(q.g);
    if(ALL_LESSONS.indexOf(q.l) === -1) ALL_LESSONS.push(q.l);
  });
  ALL_GRADES.sort(function(a,b){return a-b;});
  ALL_LESSONS.sort(function(a,b){return a-b;});
  var COUNT_OPTS = [5,10,15,'max'];
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = {
    grade: 'all', lesson: 'all', count: 10,
    order: [], idx: 0, score: 0, wrong: 0, streak: 0, maxStreak: 0,
    review: [], locked: false, current: null
  };

  // ---------- deep links ----------
  // GitHub Pages: ?g=5&l=20&n=10   ·   claude.ai artifact (only a plain #name survives): #g5-l20-n10
  var USE_HASH = /claude\.ai|claudeusercontent/.test(location.hostname);
  (function readParams(){
    var g, l, n;
    var h = (location.hash || '').replace('#','');
    var m;
    if((m = h.match(/(?:^|-)g(\d+)/))) g = parseInt(m[1],10);
    if((m = h.match(/(?:^|-)l(\d+)/))) l = parseInt(m[1],10);
    if((m = h.match(/(?:^|-)n(\d+|max)/))) n = m[1];
    try{
      var p = new URLSearchParams(location.search);
      if(p.get('g')) g = parseInt(p.get('g'),10);
      if(p.get('l')) l = parseInt(p.get('l'),10);
      if(p.get('n')) n = p.get('n');
    }catch(e){}
    if(ALL_GRADES.indexOf(g) !== -1) state.grade = g;
    if(ALL_LESSONS.indexOf(l) !== -1) state.lesson = l;
    if(n === 'max') state.count = 'max';
    else if(COUNT_OPTS.indexOf(parseInt(n,10)) !== -1) state.count = parseInt(n,10);
  })();
  function linkFor(){
    var base = location.href.split('?')[0].split('#')[0];
    if(USE_HASH){
      var hp = [];
      if(state.grade !== 'all') hp.push('g' + state.grade);
      if(state.lesson !== 'all') hp.push('l' + state.lesson);
      if(state.count !== 10) hp.push('n' + state.count);
      return base + (hp.length ? '#' + hp.join('-') : '');
    }
    var parts = [];
    if(state.grade !== 'all') parts.push('g=' + state.grade);
    if(state.lesson !== 'all') parts.push('l=' + state.lesson);
    if(state.count !== 10) parts.push('n=' + state.count);
    return base + (parts.length ? '?' + parts.join('&') : '');
  }
  function syncUrl(){
    try{
      if(USE_HASH){
        var h = linkFor().split('#')[1] || '';
        if(('#' + h) !== location.hash) history.replaceState(null, '', h ? '#' + h : location.pathname + location.search);
      } else { history.replaceState(null, '', linkFor()); }
    }catch(e){}
  }

  function filterPool(grade, lesson){
    return QUESTIONS.filter(function(q){
      return (grade === 'all' || q.g === grade) && (lesson === 'all' || q.l === lesson);
    });
  }
  function lessonsAvailable(grade){
    var set = {};
    QUESTIONS.forEach(function(q){ if(grade === 'all' || q.g === grade) set[q.l] = true; });
    return ALL_LESSONS.filter(function(l){ return set[l]; });
  }
  function shuffle(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){ var j = Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; }
    return a;
  }
  function keyFor(grade, lesson){ return 'qsbiquiz_best_'+grade+'_'+lesson; }

  // In the bank the correct answer is always opts[0]; every time a question is shown
  // the options are shuffled, so the right answer lands on a random letter.
  function prepare(q){
    var idx = shuffle([0,1,2,3]);
    return { src: q, opts: idx.map(function(i){ return q.opts[i]; }), correct: idx.indexOf(0) };
  }


  var toastEl = document.getElementById('toast'), toastTimer;
  function toast(msg){
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.hidden = true; }, 2200);
  }
  // when the clipboard is refused: show the link as selectable text for 8 seconds
  function toastLink(url){
    toastEl.textContent = '';
    toastEl.appendChild(document.createTextNode('Скопируйте ссылку: '));
    var inp = document.createElement('input');
    inp.id = 'share-url'; inp.readOnly = true; inp.value = url; inp.className = 'toast-input';
    toastEl.appendChild(inp); toastEl.hidden = false;
    inp.focus(); inp.select();
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.hidden = true; }, 8000);
  }

  // ---------- confetti ----------
  var canvas = document.getElementById('confetti');
  var ctx = canvas.getContext('2d');
  var confettiParticles = [];
  var confettiRunning = false;
  function resizeCanvas(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  var CONFETTI_COLORS = ['#FF2E7A','#7C5CFF','#00E5A8','#3FC6FF'];
  function burstConfetti(x, y, count){
    if(reduceMotion) return;
    count = count || 26;
    for(var i=0;i<count;i++){
      confettiParticles.push({
        x: x, y: y, vx: (Math.random()-0.5)*9, vy: -Math.random()*8-3, g: 0.28,
        size: 4+Math.random()*4, color: CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)],
        rot: Math.random()*Math.PI*2, vr: (Math.random()-0.5)*0.4, life: 70+Math.random()*30
      });
    }
    if(!confettiRunning){ confettiRunning = true; requestAnimationFrame(tickConfetti); }
  }
  function tickConfetti(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    confettiParticles = confettiParticles.filter(function(p){ return p.life > 0; });
    confettiParticles.forEach(function(p){
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life/70);
      ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
      ctx.restore();
    });
    if(confettiParticles.length){ requestAnimationFrame(tickConfetti); }
    else { confettiRunning = false; ctx.clearRect(0,0,canvas.width,canvas.height); }
  }

  // ---------- SETUP SCREEN ----------
  var gradeGrid = document.getElementById('grade-grid');
  var lessonChips = document.getElementById('lesson-chips');
  var countChips = document.getElementById('count-chips');
  var poolCountEl = document.getElementById('pool-count');
  var startBtn = document.getElementById('start-btn');
  var bestLine = document.getElementById('best-line');

  function el(tag, cls, text){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text != null) e.textContent = text;
    return e;
  }

  var gridAnimated = false, lessonsGradeShown = null;
  function renderGradeGrid(){
    gradeGrid.innerHTML = '';
    var allTile = el('button', 'tile all' + (state.grade==='all' ? ' active' : ''), 'Все классы');
    allTile.setAttribute('aria-pressed', state.grade==='all');
    allTile.onclick = function(){ state.grade='all'; state.lesson='all'; renderAll(); };
    gradeGrid.appendChild(allTile);
    ALL_GRADES.forEach(function(g){
      var t = el('button', 'tile' + (state.grade===g ? ' active' : ''), String(g));
      t.setAttribute('aria-label', g + ' класс');
      t.setAttribute('aria-pressed', state.grade===g);
      t.onclick = function(){
        state.grade = g;
        if(state.lesson !== 'all' && lessonsAvailable(g).indexOf(state.lesson) === -1){ state.lesson = 'all'; }
        renderAll();
      };
      gradeGrid.appendChild(t);
    });
    if(!gridAnimated){ gridAnimated = true; FX.stagger(gradeGrid.children, 'enter', 28); }
  }
  function topicFor(grade, lesson){
    for(var i=0;i<QUESTIONS.length;i++){ if(QUESTIONS[i].g === grade && QUESTIONS[i].l === lesson) return QUESTIONS[i].topic; }
    return '';
  }
  function renderLessonChips(){
    lessonChips.innerHTML = '';
    var avail = lessonsAvailable(state.grade);
    var withTopics = state.grade !== 'all';
    lessonChips.classList.toggle('with-topics', withTopics);
    var allChip = el('button', 'chip' + (state.lesson==='all' ? ' active' : ''), withTopics ? 'Все уроки ' + state.grade + ' класса' : 'Все уроки');
    allChip.onclick = function(){ state.lesson='all'; renderAll(); };
    lessonChips.appendChild(allChip);
    ALL_LESSONS.forEach(function(l){
      var c;
      if(withTopics){
        var topic = topicFor(state.grade, l);
        if(!topic) return;
        c = el('button', 'chip lesson-chip' + (state.lesson===l ? ' active' : ''));
        c.insertAdjacentHTML('beforeend', QG.icon(topic, 'ico'));
        var lt = el('span', 'lt');
        lt.appendChild(el('span', 'ln', 'Урок ' + l + ' · '));
        lt.appendChild(document.createTextNode(topic));
        c.appendChild(lt);
      } else {
        c = el('button', 'chip' + (state.lesson===l ? ' active' : ''), 'Урок ' + l);
        if(avail.indexOf(l) === -1){ c.disabled = true; }
      }
      c.onclick = function(){ state.lesson = l; renderAll(); };
      lessonChips.appendChild(c);
    });
    if(lessonsGradeShown !== state.grade){ lessonsGradeShown = state.grade; FX.stagger(lessonChips.children, 'enter', 40); }
  }
  function renderCountChips(){
    countChips.innerHTML = '';
    COUNT_OPTS.forEach(function(opt){
      var c = el('button', 'chip' + (state.count===opt ? ' active' : ''), opt==='max' ? 'Все доступные' : String(opt));
      c.onclick = function(){ state.count = opt; renderAll(); };
      countChips.appendChild(c);
    });
  }
  function renderPoolInfo(){
    var pool = filterPool(state.grade, state.lesson);
    poolCountEl.textContent = pool.length;
    startBtn.disabled = pool.length === 0;
    var best = safeGet(keyFor(state.grade, state.lesson));
    if(best){ bestLine.hidden = false; bestLine.textContent = '★ Рекорд: ' + best + '%'; }
    else { bestLine.hidden = true; }
  }
  function renderAll(){
    renderGradeGrid(); renderLessonChips(); renderCountChips(); renderPoolInfo(); syncUrl();
  }

  document.getElementById('footer-stats').textContent =
    QUESTIONS.length + ' вопросов · ' + ALL_GRADES.length + ' классов · уроки ' +
    ALL_LESSONS[0] + '–' + ALL_LESSONS[ALL_LESSONS.length-1];

  document.getElementById('share-btn').onclick = function(){
    var url = linkFor();
    var label = (state.grade==='all' ? 'все классы' : state.grade + ' класс') + ', ' +
                (state.lesson==='all' ? 'все уроки' : 'урок ' + state.lesson);
    if(navigator.share){
      navigator.share({ title: 'QSBI Квиз-арена', text: 'Квиз: ' + label, url: url }).catch(function(){});
      return;
    }
    var showLink = function(){ toastLink(url); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(function(){ toast('Ссылка скопирована: ' + label); }, showLink);
    } else { showLink(); }
  };

  function startRun(){
    var pool = filterPool(state.grade, state.lesson);
    var n = state.count === 'max' ? pool.length : Math.min(state.count, pool.length);
    state.order = shuffle(pool).slice(0, n);
    state.idx = 0; state.score = 0; state.wrong = 0; state.streak = 0; state.maxStreak = 0; state.review = [];
    renderMilestones();
    showScreen('quiz');
    renderQuestion();
  }
  startBtn.onclick = startRun;

  // ---------- QUIZ SCREEN ----------
  var progressFill = document.getElementById('progress-fill');
  var progressCount = document.getElementById('progress-count');
  var scoreCorrect = document.getElementById('score-correct');
  var scoreWrong = document.getElementById('score-wrong');
  var scoreStreak = document.getElementById('score-streak');
  var streakPill = document.getElementById('streak-pill');
  var qTopicTag = document.getElementById('q-topic-tag');
  var qText = document.getElementById('q-text');
  var qOpts = document.getElementById('q-opts');
  var qCard = document.getElementById('qcard');
  var qExplain = document.getElementById('q-explain');
  var nextBtn = document.getElementById('next-btn');
  var milestoneRow = document.getElementById('milestone-row');
  var LETTERS = ['А','Б','В','Г'];

  function renderMilestones(){
    milestoneRow.innerHTML = '';
    for(var i=0;i<5;i++){ milestoneRow.appendChild(el('div', 'milestone')); }
  }
  function updateMilestones(pct){
    var ms = milestoneRow.children, marks = [20,40,60,80,100];
    for(var i=0;i<ms.length;i++){ ms[i].classList.toggle('lit', pct >= marks[i]); }
  }

  function renderQuestion(){
    var q = prepare(state.order[state.idx]);
    state.current = q;
    state.locked = false;
    nextBtn.classList.remove('show');
    qExplain.hidden = true;

    var pct = Math.round(state.idx / state.order.length * 100);
    progressFill.style.width = pct + '%';
    updateMilestones(pct);
    progressCount.textContent = (state.idx+1) + ' / ' + state.order.length;
    scoreCorrect.textContent = state.score;
    scoreWrong.textContent = state.wrong;
    scoreStreak.textContent = state.streak;
    streakPill.classList.toggle('hot', state.streak >= 3);

    qTopicTag.innerHTML = QG.icon(q.src.topic, 'ico');
    qTopicTag.appendChild(document.createTextNode('Класс ' + q.src.g + ' · Урок ' + q.src.l + ' · ' + q.src.topic));
    document.getElementById('q-mark').innerHTML = QG.icon(q.src.topic);
    qText.textContent = q.src.q;

    qOpts.innerHTML = '';
    q.opts.forEach(function(optText, i){
      var btn = el('button', 'opt');
      btn.appendChild(el('span', 'letter', LETTERS[i]));
      btn.appendChild(el('span', null, optText));
      btn.onclick = function(){ handleAnswer(i, btn); };
      qOpts.appendChild(btn);
    });
    FX.replay(qCard, 'q-in');
    FX.stagger(qOpts.children, 'enter', 55);
    var first = qOpts.querySelector('.opt');
    if(first && document.activeElement && document.activeElement.classList.contains('opt')) first.focus();
  }

  function handleAnswer(i, btn){
    if(state.locked) return;
    state.locked = true;
    var q = state.current;
    var allBtns = qOpts.querySelectorAll('.opt');
    var isCorrect = i === q.correct;
    var rect = btn.getBoundingClientRect();

    if(isCorrect){
      state.score++; state.streak++; state.maxStreak = Math.max(state.maxStreak, state.streak);
      burstConfetti(rect.left + rect.width/2, rect.top + rect.height/2, 10);
      FX.reward(btn);
      FX.streak(state.streak, qCard.parentNode);
      FX.replay(scoreCorrect, 'bump');
    } else {
      state.wrong++; state.streak = 0; state.review.push(q.src);
      qCard.classList.remove('shake'); void qCard.offsetWidth; qCard.classList.add('shake');
      FX.replay(scoreWrong, 'bump');
    }
    allBtns.forEach(function(b, idx){
      b.disabled = true;
      if(idx === q.correct) b.classList.add('correct');
      else if(idx === i) b.classList.add('wrong');
    });
    qExplain.innerHTML = '';
    qExplain.className = 'explain ' + (isCorrect ? 'ok' : 'no');
    qExplain.appendChild(el('strong', null, isCorrect ? 'Верно! ' : 'Правильный ответ: ' + q.src.opts[0] + '. '));
    if(q.src.x) qExplain.appendChild(document.createTextNode(q.src.x));
    qExplain.hidden = !(q.src.x || !isCorrect);

    scoreCorrect.textContent = state.score;
    scoreWrong.textContent = state.wrong;
    scoreStreak.textContent = state.streak;
    streakPill.classList.toggle('hot', state.streak >= 3);
    nextBtn.innerHTML = (state.idx === state.order.length-1) ? 'Итоги ' + ICON('flag') : 'Дальше →';
    nextBtn.classList.add('show');
    nextBtn.focus({preventScroll:true});
  }

  nextBtn.onclick = function(){
    if(!nextBtn.classList.contains('show')) return;
    if(state.idx < state.order.length - 1){ state.idx++; renderQuestion(); }
    else { finishQuiz(); }
  };

  // keyboard: 1–4 or А–Г / A–D to answer, Enter for next
  document.addEventListener('keydown', function(e){
    if(screens.quiz.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if(e.key === 'Escape'){ e.preventDefault(); if(quitPanel.hidden) openQuit(); else closeQuit(); return; }
    if(!quitPanel.hidden) return;
    var map = {'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3,'а':0,'б':1,'в':2,'г':3};
    var k = (e.key || '').toLowerCase();
    if(k in map && !state.locked){
      var b = qOpts.querySelectorAll('.opt')[map[k]];
      if(b){ e.preventDefault(); b.click(); }
    } else if(k === 'enter' && state.locked && document.activeElement !== nextBtn){
      e.preventDefault(); nextBtn.click();
    }
  });

  // ---------- quit at any time ----------
  var quitPanel = document.getElementById('quit-panel');
  var quitText = document.getElementById('quit-text');
  var quitResults = document.getElementById('quit-results');
  function answeredCount(){ return state.idx + (state.locked ? 1 : 0); }
  function openQuit(){
    var n = answeredCount();
    quitText.textContent = n
      ? 'Отвечено ' + n + ' из ' + state.order.length + '. Можно посмотреть итоги по отвеченным вопросам или выйти в меню.'
      : 'Вы ещё не ответили ни на один вопрос. Выйти в меню?';
    quitResults.hidden = n === 0;
    quitPanel.hidden = false;
    (n ? quitResults : document.getElementById('quit-menu')).focus();
  }
  function closeQuit(){ quitPanel.hidden = true; document.getElementById('quit-btn').focus({preventScroll:true}); }
  document.getElementById('quit-btn').onclick = openQuit;
  document.getElementById('quit-cancel').onclick = closeQuit;
  quitPanel.addEventListener('click', function(e){ if(e.target === quitPanel) closeQuit(); });
  quitResults.onclick = function(){ var n = answeredCount(); quitPanel.hidden = true; finishQuiz(n); };
  document.getElementById('quit-menu').onclick = function(){ quitPanel.hidden = true; showScreen('setup'); renderAll(); };

  // ---------- RESULT SCREEN ----------
  var resultPct = document.getElementById('result-pct');
  var resultSub = document.getElementById('result-sub');
  var statTotal = document.getElementById('stat-total');
  var statCorrect = document.getElementById('stat-correct');
  var statWrong = document.getElementById('stat-wrong');
  var bestNote = document.getElementById('best-note');
  var reviewWrap = document.getElementById('review-wrap');
  var reviewList = document.getElementById('review-list');
  var scoreRing = document.getElementById('score-ring');
  var ringLabel = document.getElementById('ring-label');

  function animateCount(node, to, suffix){
    if(reduceMotion){ node.textContent = to + (suffix||''); return; }
    var dur = 700, t0 = performance.now();
    function step(t){
      var p = Math.min(1, (t - t0)/dur), eased = 1 - Math.pow(1-p, 3);
      node.textContent = Math.round(to*eased) + (suffix||'');
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function finishQuiz(answered){
    var partial = typeof answered === 'number' && answered < state.order.length;
    var total = partial ? answered : state.order.length;
    var pct = total ? Math.round(state.score/total*100) : 0;
    QG.ring(scoreRing, pct);
    ringLabel.textContent = pct >= 85 ? 'отлично' : pct >= 60 ? 'хорошо' : 'попробуй ещё';
    animateCount(resultPct, pct, '%');
    resultSub.textContent = pct >= 85 ? 'Невероятно! Ты мастер бизнеса!' : pct >= 60 ? 'Хороший результат, но есть куда расти' : 'Стоит вернуться к уроку и попробовать снова';
    FX.countUp(statTotal, total);
    FX.countUp(statCorrect, state.score);
    FX.countUp(statWrong, state.wrong);

    var key = keyFor(state.grade, state.lesson);
    var prevBest = parseInt(safeGet(key) || '0', 10);
    bestNote.hidden = false;
    if(partial){
      bestNote.textContent = 'Квиз завершён досрочно: ' + total + ' из ' + state.order.length + ' вопросов. В рекорд не идёт.';
    } else if(pct > prevBest){
      safeSet(key, String(pct));
      bestNote.innerHTML = ICON('medal') + ' ' + (prevBest ? ('Новый рекорд! (было ' + prevBest + '%)') : 'Первый результат сохранён!');
    } else {
      bestNote.textContent = '★ Лучший результат: ' + prevBest + '%';
    }

    if(state.review.length){
      reviewWrap.hidden = false;
      reviewList.innerHTML = '';
      state.review.forEach(function(q){
        var item = el('div', 'review-item');
        item.appendChild(el('div', 'rt', 'Класс '+q.g+' · Урок '+q.l+' · '+q.topic));
        item.appendChild(el('div', 'rq', q.q));
        item.appendChild(el('div', 'ra', 'Верно: ' + q.opts[0]));
        if(q.x) item.appendChild(el('div', 'rx', q.x));
        reviewList.appendChild(item);
      });
      FX.stagger(reviewList.children, 'enter', 70);
    } else { reviewWrap.hidden = true; }

    showScreen('result');
    if(pct >= 80){
      setTimeout(function(){
        burstConfetti(window.innerWidth*0.3, window.innerHeight*0.25, 40);
        burstConfetti(window.innerWidth*0.7, window.innerHeight*0.25, 40);
      }, 200);
    }
  }

  document.getElementById('retry-btn').onclick = startRun;
  document.getElementById('change-btn').onclick = function(){ showScreen('setup'); renderAll(); };

  var screens = {
    setup: document.getElementById('screen-setup'),
    quiz: document.getElementById('screen-quiz'),
    result: document.getElementById('screen-result')
  };
  function showScreen(name){
    Object.keys(screens).forEach(function(k){ screens[k].hidden = (k !== name); });
    FX.replay(screens[name], 'screen-in');
    window.scrollTo(0, 0);
  }

  renderAll();
  QG.startBackground();
  (function(){
    var lessons = {}; QUESTIONS.forEach(function(q){ lessons[q.g + '/' + q.l] = 1; });
    var data = [['hs-q', QUESTIONS.length], ['hs-l', Object.keys(lessons).length], ['hs-g', ALL_GRADES.length]];
    data.forEach(function(d, i){ var el = document.getElementById(d[0]); el.textContent = d[1];
      setTimeout(function(){ FX.countUp(el, d[1], '', 900); }, 150 + i * 120); });
  })();
  FX.spotlight();

  // offline support (GitHub Pages / any https host); skipped where service workers aren't allowed
  if('serviceWorker' in navigator && location.protocol === 'https:' && !/claude\.ai|claudeusercontent/.test(location.hostname)){
    navigator.serviceWorker.register('sw.js').catch(function(){});
  }
})();

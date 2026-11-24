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
  var T = QI18N.t, LQ = QI18N.q;   // UI strings and the question in the current language (i18n.js)
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
      if(QI18N.lang() === 'en') hp.push('en');
      return base + (hp.length ? '#' + hp.join('-') : '');
    }
    var parts = [];
    if(state.grade !== 'all') parts.push('g=' + state.grade);
    if(state.lesson !== 'all') parts.push('l=' + state.lesson);
    if(state.count !== 10) parts.push('n=' + state.count);
    if(QI18N.lang() === 'en') parts.push('lang=en');
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
    return { src: q, perm: idx, correct: idx.indexOf(0) };
  }


  var toastEl = document.getElementById('toast'), toastTimer;
  function toast(msg){
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toastEl.hidden = true; }, 2200);
  }
  // when the clipboard is refused: show the link as selectable text for 8 seconds
  function toastLink(url){
    toastEl.textContent = '';
    toastEl.appendChild(document.createTextNode(T('copyLink')));
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
    var allTile = el('button', 'tile all' + (state.grade==='all' ? ' active' : ''), T('allGrades'));
    allTile.setAttribute('aria-pressed', state.grade==='all');
    allTile.onclick = function(){ state.grade='all'; state.lesson='all'; renderAll(); };
    gradeGrid.appendChild(allTile);
    ALL_GRADES.forEach(function(g){
      var t = el('button', 'tile' + (state.grade===g ? ' active' : ''), String(g));
      t.setAttribute('aria-label', T('gradeAria', {g: g}));
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
    var allChip = el('button', 'chip' + (state.lesson==='all' ? ' active' : ''), withTopics ? T('allLessonsOf', {g: state.grade}) : T('allLessons'));
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
        lt.appendChild(el('span', 'ln', T('lessonDot', {l: l})));
        lt.appendChild(document.createTextNode(QI18N.topic(topic, state.grade, l)));
        c.appendChild(lt);
      } else {
        c = el('button', 'chip' + (state.lesson===l ? ' active' : ''), T('lessonN', {l: l}));
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
      var c = el('button', 'chip' + (state.count===opt ? ' active' : ''), opt==='max' ? T('allAvailable') : String(opt));
      c.onclick = function(){ state.count = opt; renderAll(); };
      countChips.appendChild(c);
    });
  }
  function renderPoolInfo(){
    var pool = filterPool(state.grade, state.lesson);
    poolCountEl.textContent = pool.length;
    startBtn.disabled = pool.length === 0;
    var best = safeGet(keyFor(state.grade, state.lesson));
    if(best){ bestLine.hidden = false; bestLine.textContent = T('record', {p: best}); }
    else { bestLine.hidden = true; }
  }
  function renderAll(){
    renderGradeGrid(); renderLessonChips(); renderCountChips(); renderPoolInfo(); syncUrl();
    document.getElementById('footer-stats').textContent =
      T('footer', {q: QUESTIONS.length, g: ALL_GRADES.length, a: ALL_LESSONS[0], b: ALL_LESSONS[ALL_LESSONS.length-1]});
  }

  document.getElementById('share-btn').onclick = function(){
    var url = linkFor();
    var label = (state.grade==='all' ? T('shareAll') : T('shareGrade', {g: state.grade})) + ', ' +
                (state.lesson==='all' ? T('shareAllL') : T('shareL', {l: state.lesson}));
    if(navigator.share){
      navigator.share({ title: T('shareTitle'), text: T('shareText', {label: label}), url: url }).catch(function(){});
      return;
    }
    var showLink = function(){ toastLink(url); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(function(){ toast(T('copied', {label: label})); }, showLink);
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

    document.getElementById('q-mark').innerHTML = QG.icon(q.src.topic);
    qOpts.innerHTML = '';
    q.perm.forEach(function(_, i){
      var btn = el('button', 'opt');
      btn.appendChild(el('span', 'letter'));
      btn.appendChild(el('span', 'ot'));
      btn.onclick = function(){ handleAnswer(i, btn); };
      qOpts.appendChild(btn);
    });
    fillQuestionText();
    FX.replay(qCard, 'q-in');
    FX.stagger(qOpts.children, 'enter', 55);
    var first = qOpts.querySelector('.opt');
    if(first && document.activeElement && document.activeElement.classList.contains('opt')) first.focus();
  }

  // texts of the current question in the current language (also used when the language is switched mid-quiz)
  function fillQuestionText(){
    var q = state.current, lq = LQ(q.src), letters = T('letters');
    qTopicTag.innerHTML = QG.icon(q.src.topic, 'ico');
    qTopicTag.appendChild(document.createTextNode(T('tag', {g: q.src.g, l: q.src.l, t: lq.topic})));
    qText.textContent = lq.q;
    var btns = qOpts.querySelectorAll('.opt');
    q.perm.forEach(function(k, i){ if(btns[i]){ btns[i].children[0].textContent = letters[i]; btns[i].children[1].textContent = lq.opts[k]; } });
    if(state.locked) fillExplain();
  }
  function fillExplain(){
    var q = state.current, lq = LQ(q.src), isCorrect = state.lastPick === q.correct;
    qExplain.innerHTML = '';
    qExplain.className = 'explain ' + (isCorrect ? 'ok' : 'no');
    qExplain.appendChild(el('strong', null, isCorrect ? T('right') : T('rightAnswer', {a: lq.opts[0]})));
    if(lq.x) qExplain.appendChild(document.createTextNode(lq.x));
    qExplain.hidden = !(lq.x || !isCorrect);
    nextBtn.innerHTML = (state.idx === state.order.length-1) ? T('results') + ICON('flag') : T('next');
  }

  function handleAnswer(i, btn){
    if(state.locked) return;
    state.locked = true; state.lastPick = i;
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
    fillExplain();

    scoreCorrect.textContent = state.score;
    scoreWrong.textContent = state.wrong;
    scoreStreak.textContent = state.streak;
    streakPill.classList.toggle('hot', state.streak >= 3);
    nextBtn.classList.add('show');
    nextBtn.focus({preventScroll:true});
  }

  nextBtn.onclick = function(){
    if(!nextBtn.classList.contains('show')) return;
    if(state.idx < state.order.length - 1){ state.idx++; renderQuestion(); }
    else { finishQuiz(); }
  };

  // keyboard: 1–4 or А–Г to answer, Enter for next (Latin a–d left: a presentation clicker sends "b" for its black-screen button)
  document.addEventListener('keydown', function(e){
    if(screens.quiz.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if(e.key === 'Escape'){ e.preventDefault(); if(quitPanel.hidden) openQuit(); else closeQuit(); return; }
    if(!quitPanel.hidden) return;
    var map = {'1':0,'2':1,'3':2,'4':3,'а':0,'б':1,'в':2,'г':3};
    var k = (e.key || '').toLowerCase();
    if(k in map && !state.locked){
      var b = qOpts.querySelectorAll('.opt')[map[k]];
      if(b){ e.preventDefault(); b.click(); }
    } else if(k === 'enter' && state.locked && document.activeElement !== nextBtn){
      e.preventDefault(); nextBtn.click();
    }
  });

  // presentation clicker (clicker.js): on a question it walks only the answer options, after answering only «Дальше»
  window.QSBI_CLICKER = {
    items: function(){
      if(screens.quiz.hidden || !quitPanel.hidden) return null;
      return state.locked ? (nextBtn.classList.contains('show') ? [nextBtn] : []) : Array.prototype.slice.call(qOpts.querySelectorAll('.opt'));
    }
  };

  // ---------- quit at any time ----------
  var quitPanel = document.getElementById('quit-panel');
  var quitText = document.getElementById('quit-text');
  var quitResults = document.getElementById('quit-results');
  function answeredCount(){ return state.idx + (state.locked ? 1 : 0); }
  function openQuit(){
    var n = answeredCount();
    quitText.textContent = n ? T('answeredOf', {n: n, m: state.order.length}) : T('noneAnswered');
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
    animateCount(resultPct, pct, '%');
    FX.countUp(statTotal, total);
    FX.countUp(statCorrect, state.score);
    FX.countUp(statWrong, state.wrong);

    var key = keyFor(state.grade, state.lesson);
    var prevBest = parseInt(safeGet(key) || '0', 10);
    var record = partial ? 'partial' : pct > prevBest ? 'new' : 'old';
    if(record === 'new') safeSet(key, String(pct));
    state.lastResult = { pct: pct, total: total, partial: partial, record: record, prevBest: prevBest };
    renderResultTexts();
    if(state.review.length) FX.stagger(reviewList.children, 'enter', 70);

    showScreen('result');
    if(pct >= 80){
      setTimeout(function(){
        burstConfetti(window.innerWidth*0.3, window.innerHeight*0.25, 40);
        burstConfetti(window.innerWidth*0.7, window.innerHeight*0.25, 40);
      }, 200);
    }
  }

  function renderResultTexts(){
    var r = state.lastResult; if(!r) return;
    ringLabel.textContent = r.pct >= 85 ? T('great') : r.pct >= 60 ? T('good') : T('tryAgain');
    resultSub.textContent = r.pct >= 85 ? T('subGreat') : r.pct >= 60 ? T('subGood') : T('subLow');
    bestNote.hidden = false;
    if(r.record === 'partial') bestNote.textContent = T('early', {n: r.total, m: state.order.length});
    else if(r.record === 'new') bestNote.innerHTML = ICON('medal') + ' ' + (r.prevBest ? T('newRecord', {p: r.prevBest}) : T('firstResult'));
    else bestNote.textContent = T('best', {p: r.prevBest});
    reviewWrap.hidden = !state.review.length;
    reviewList.innerHTML = '';
    state.review.forEach(function(src){
      var q = LQ(src), item = el('div', 'review-item');
      item.appendChild(el('div', 'rt', T('tag', {g: q.g, l: q.l, t: q.topic})));
      item.appendChild(el('div', 'rq', q.q));
      item.appendChild(el('div', 'ra', T('reviewRight', {a: q.opts[0]})));
      if(q.x) item.appendChild(el('div', 'rx', q.x));
      reviewList.appendChild(item);
    });
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

  // language switch: everything on screen is redrawn in the new language; a running quiz keeps its place
  document.querySelectorAll('.lang-sw [data-lang]').forEach(function(b){
    b.onclick = function(){ QI18N.setLang(b.getAttribute('data-lang'), function(){ toast(T('loadFail')); }); };
  });
  QI18N.onChange(function(){
    renderAll();
    if(!screens.quiz.hidden && state.current) fillQuestionText();
    if(!screens.result.hidden) renderResultTexts();
    if(!quitPanel.hidden) openQuit();
  });

  QI18N.ready(renderAll);
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

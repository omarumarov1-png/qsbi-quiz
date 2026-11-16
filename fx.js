// Motion effects for QSBI Квиз-арена. Exposes window.FX.
// Every effect is skipped when the visitor has "reduce motion" turned on.
(function(){
  "use strict";
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // restart a CSS animation class on an element
  function replay(el, cls){
    if(!el || reduce) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  }
  // cascade a list of elements in, 45 ms apart
  function stagger(nodes, cls, step){
    if(reduce) return;
    Array.prototype.forEach.call(nodes, function(n, i){
      n.style.setProperty('--i', i);
      n.style.setProperty('--step', (step || 45) + 'ms');
      replay(n, cls || 'enter');
    });
  }
  // number counting up from 0
  function countUp(el, to, suffix, dur){
    suffix = suffix || '';
    if(reduce){ el.textContent = to + suffix; return; }
    var t0 = performance.now(); dur = dur || 800;
    (function step(t){
      var p = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e) + suffix;
      if(p < 1) requestAnimationFrame(step);
    })(t0);
  }
  // right answer: ripple from the option + floating "+1"
  function reward(btn){
    if(reduce || !btn) return;
    var r = document.createElement('span'); r.className = 'fx-ripple';
    btn.appendChild(r);
    var rect = btn.getBoundingClientRect();
    var plus = document.createElement('span'); plus.className = 'fx-plus'; plus.textContent = '+1';
    plus.style.left = (rect.right - 44) + 'px'; plus.style.top = (rect.top + rect.height / 2 - 14) + 'px';
    document.body.appendChild(plus);
    setTimeout(function(){ r.remove(); plus.remove(); }, 900);
  }
  // streak milestones: 3, 5, 10, 15, 20…
  function streak(n, host){
    if(!(n === 3 || n === 5 || (n >= 10 && n % 5 === 0)) || !host) return;
    var b = document.createElement('div'); b.className = 'fx-streak';
    b.innerHTML = ICON('flame') + ' ' + n + ' подряд!';
    host.appendChild(b);
    setTimeout(function(){ b.remove(); }, reduce ? 1200 : 1500);
  }
  // soft light that follows the pointer across cards (mouse/trackpad only)
  function spotlight(){
    if(reduce || !(window.matchMedia && window.matchMedia('(hover: hover)').matches)) return;
    document.addEventListener('pointermove', function(e){
      var card = e.target.closest && e.target.closest('.card');
      if(!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }
  // hero stats count up once on load
  function hero(){
    var nums = document.querySelectorAll('[data-count]');
    Array.prototype.forEach.call(nums, function(el, i){
      setTimeout(function(){ countUp(el, parseInt(el.getAttribute('data-count'), 10), '', 900); }, 150 + i * 120);
    });
  }

  window.FX = { reduce: reduce, replay: replay, stagger: stagger, countUp: countUp, reward: reward, streak: streak, spotlight: spotlight, hero: hero };
})();

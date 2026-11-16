// Graphics for QSBI Квиз-арена: topic line icons, drifting symbol background, result score ring.
// Exposes window.QG = { icon(topic, cls), iconName(topic), ring(el, pct), startBackground() }.
(function(){
  "use strict";
  var SVG_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';

  // 24×24 line icons, built from simple shapes only.
  var ICONS = {
    factory: '<path d="M3 20V11l5 3v-3l5 3V5h5v15z"/><path d="M7 17h2M12 17h2"/>',
    city:    '<path d="M3 21h18"/><rect x="5" y="9" width="5" height="12"/><rect x="12" y="4" width="7" height="17"/><path d="M14 8h3M14 12h3M14 16h3"/>',
    store:   '<path d="M3 9l2-5h14l2 5z"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/>',
    chat:    '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    bulb:    '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    game:    '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/><circle cx="15" cy="15" r="1.2"/>',
    print:   '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
    film:    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 5v4M12 5v4M17 5v4"/><path d="M10 12.5v4l3.5-2z"/>',
    target:  '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    tag:     '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    shield:  '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    users:   '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 13.5c2.8.3 5 2.6 5 5.5"/>',
    wallet:  '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4z"/><path d="M4 7l11-3v3"/><circle cx="16" cy="13.5" r="1.3"/>',
    megaphone:'<path d="M3 10v4l4 1 9 4V5L7 9z"/><path d="M7 15l1 4h3l-1-3"/><path d="M19 9.5a3 3 0 0 1 0 5"/>',
    warning: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17v.5"/>',
    checklist:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8l1.5 1.5L12 7M14 8h3M8 14l1.5 1.5L12 13M14 14h3"/>',
    clash:   '<path d="M5 5l6 6M13 13l6 6M19 5l-6 6M11 13l-6 6"/>',
    coins:   '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/><path d="M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4"/><path d="M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4"/>',
    card:    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    trend:   '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    doc:     '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h7"/>',
    chart:   '<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>',
    star:    '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
  };

  // Topic → icon. Order matters: the more specific patterns come first.
  var RULES = [
    [/мастерская|завод|фабрик/i, 'factory'],
    [/город/i, 'city'],
    [/ресторан|кафе/i, 'store'],
    [/интервью|связь и общение/i, 'chat'],
    [/настольн/i, 'game'],
    [/печатн/i, 'print'],
    [/сюжетн/i, 'film'],
    [/сторителлинг|смелые идеи/i, 'bulb'],
    [/целевая аудитория|клиент/i, 'target'],
    [/цена/i, 'tag'],
    [/права покупателя/i, 'shield'],
    [/виды продаж/i, 'store'],
    [/лидер|руководств/i, 'users'],
    [/маркетинговый бюджет|эффективност|стратеги/i, 'chart'],
    [/бюджет/i, 'wallet'],
    [/реклам|pr\b/i, 'megaphone'],
    [/риск/i, 'warning'],
    [/конфликт/i, 'clash'],
    [/проект/i, 'checklist'],
    [/карт/i, 'card'],
    [/инфляц/i, 'trend'],
    [/депозит|сбережен|инвестиц|подушк/i, 'coins'],
    [/цел/i, 'target'],
    [/зарплат|договор/i, 'doc'],
    [/бренд/i, 'star']
  ];
  function iconName(topic){
    for(var i=0;i<RULES.length;i++){ if(RULES[i][0].test(topic || '')) return RULES[i][1]; }
    return 'bulb';
  }
  function icon(topic, cls){
    return SVG_OPEN + (cls ? ' class="' + cls + '"' : '') + '>' + ICONS[iconName(topic)] + '</svg>';
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- result ring ----------
  function ring(container, pct){
    var R = 52, C = 2 * Math.PI * R;
    container.className = 'ring-wrap ' + (pct >= 85 ? 'top' : pct >= 60 ? 'good' : 'low');
    var fg = container.querySelector('.ring-fg');
    fg.setAttribute('stroke-dasharray', C.toFixed(1));
    var target = C * (1 - Math.max(0, Math.min(100, pct)) / 100);
    if(reduceMotion){ fg.setAttribute('stroke-dashoffset', target.toFixed(1)); return; }
    fg.setAttribute('stroke-dashoffset', C.toFixed(1));
    var t0 = performance.now(), dur = 900;
    (function step(t){
      var p = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - p, 3);
      fg.setAttribute('stroke-dashoffset', (C - (C - target) * e).toFixed(1));
      if(p < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------- drifting symbol background ----------
  function startBackground(){
    var cv = document.getElementById('bg-symbols');
    if(!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var GLYPHS = ['₸','%','↗','+','×','÷','★','◆','$','∑'];
    var COLORS = ['255,46,122','124,92,255','0,229,168','63,198,255','255,201,60'];
    var parts = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), running = true;
    function make(anywhere){
      var size = 14 + Math.random() * 26;
      return {
        g: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        x: Math.random() * W, y: anywhere ? Math.random() * H : H + size,
        s: size, vy: 0.12 + Math.random() * 0.28, vx: (Math.random() - 0.5) * 0.12,
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.004,
        a: 0.07 + Math.random() * 0.1
      };
    }
    function resize(){
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(28, Math.max(14, W * H / 26000)));
      while(parts.length < n) parts.push(make(true));
      parts.length = n;
    }
    function draw(){
      ctx.clearRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for(var i=0;i<parts.length;i++){
        var p = parts[i];
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.font = '600 ' + p.s.toFixed(0) + 'px QSym, Unbounded, Manrope, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a.toFixed(3) + ')';
        ctx.fillText(p.g, 0, 0);
        ctx.restore();
      }
    }
    function tick(){
      if(!running) return;
      for(var i=0;i<parts.length;i++){
        var p = parts[i];
        p.y -= p.vy; p.x += p.vx; p.rot += p.vr;
        if(p.y < -p.s) parts[i] = make(false);
        else if(p.x < -40) p.x = W + 40;
        else if(p.x > W + 40) p.x = -40;
      }
      draw();
      requestAnimationFrame(tick);
    }
    window.addEventListener('resize', function(){ resize(); if(reduceMotion) draw(); });
    resize();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    if(reduceMotion){ draw(); return; }
    document.addEventListener('visibilitychange', function(){
      var was = running; running = !document.hidden;
      if(running && !was) requestAnimationFrame(tick);
    });
    requestAnimationFrame(tick);
  }

  window.QG = { icon: icon, iconName: iconName, ring: ring, startBackground: startBackground };
})();

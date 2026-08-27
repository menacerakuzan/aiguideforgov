/* ==========================================================================
   ПРО.ШІ — спільна поведінка всіх сторінок
   Спрайт іконок інʼєктується з JS, щоб <use> працював і з file://.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ----------------------------------------------------------------------
     СПРАЙТ
     ---------------------------------------------------------------------- */
  var SPRITE =
  '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
  '<symbol id="i-safe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.2 12.2 2.6 2.6 5-5.6"/></symbol>' +
  '<symbol id="i-caution" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.2 21.2 19.8H2.8z"/><path d="M12 10v3.4"/><circle cx="12" cy="16.6" r="1.05" fill="currentColor" stroke="none"/></symbol>' +
  '<symbol id="i-forbid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.4 3.2h7.2l5.2 5.2v7.2l-5.2 5.2H8.4l-5.2-5.2V8.4z"/><path d="M8.6 15.4 15.4 8.6"/></symbol>' +
  '<symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></symbol>' +
  '<symbol id="i-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></symbol>' +
  '<symbol id="i-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z"/></symbol>' +
  '<symbol id="i-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 1.8"/></symbol>' +
  '<symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></symbol>' +
  '<symbol id="i-award" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.48 12.89 1.51 8.53a.5.5 0 0 1-.81.47l-3.58-2.69a1 1 0 0 0-1.2 0l-3.58 2.69a.5.5 0 0 1-.81-.47l1.51-8.53"/><circle cx="12" cy="8" r="6"/></symbol>' +
  '<symbol id="i-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="13" height="13" x="9" y="9" rx="4"/><path d="M5 15c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"/></symbol>' +
  '<symbol id="i-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13"/><path d="m12 5 7 7-7 7"/></symbol>' +
  '<symbol id="i-arrow-l" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H6"/><path d="m12 19-7-7 7-7"/></symbol>' +
  '<symbol id="i-doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/></symbol>' +
  '<symbol id="i-mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="5"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></symbol>' +
  '<symbol id="i-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></symbol>' +
  '<symbol id="i-spark" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5 13.8 9 20 11l-6.2 2L12 19.5 10.2 13 4 11l6.2-2L12 2.5Z"/></symbol>' +
  '<symbol id="i-flame" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s1.5 3.2-.8 5.6C9 10 8 11.4 8 13.4a4 4 0 0 0 8 0c0-1-.4-1.9-1-2.6.9.3 1.7.9 2.3 1.7.5-1.2.7-2.4.7-3.5C18 5.6 12 2 12 2Z"/></symbol>' +
  '<symbol id="i-book" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></symbol>' +
  '<symbol id="i-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>' +
  '<symbol id="i-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.73 5.08a10.74 10.74 0 0 1 11.21 6.57 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-1.45 2.49"/><path d="M14.08 14.16a3 3 0 0 1-4.24-4.24"/><path d="M17.48 17.5a10.75 10.75 0 0 1-15.42-5.15 1 1 0 0 1 0-.7 10.75 10.75 0 0 1 4.45-5.14"/><path d="m2 2 20 20"/></symbol>' +
  '</svg>';

  var host = document.createElement('div');
  host.hidden = true;
  host.innerHTML = SPRITE;
  document.body.insertBefore(host, document.body.firstChild);

  /* ----------------------------------------------------------------------
     ПОЯВА ПРИ ПРОКРУТЦІ
     ---------------------------------------------------------------------- */
  var items = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        window.setTimeout(function () { el.classList.add('in'); }, i * 70);
        io.unobserve(el);
      });
    }, { threshold: .12, rootMargin: '0px 0px -50px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     КОНФЕТІ — кольори світлофора + синій + сонце
     ---------------------------------------------------------------------- */
  var COLORS = ['#3763E8', '#0C8455', '#FFC93D', '#F5A31A', '#CC3E27', '#8FB0FF'];

  function confetti(amount) {
    if (reduced) return;
    var hostEl = document.createElement('div');
    hostEl.className = 'confetti-host';
    document.body.appendChild(hostEl);
    var n = amount || 90;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      p.className = 'confetti';
      var size = 6 + Math.random() * 8;
      p.style.cssText =
        'left:' + (Math.random() * 100) + 'vw;' +
        'width:' + size + 'px;height:' + (size * (0.5 + Math.random())) + 'px;' +
        'background:' + COLORS[i % COLORS.length] + ';' +
        'border-radius:' + (Math.random() > .5 ? '50%' : '999px') + ';' +
        'animation-duration:' + (2 + Math.random() * 2.2) + 's;' +
        'animation-delay:' + (Math.random() * .5) + 's;' +
        'opacity:0;';
      hostEl.appendChild(p);
    }
    window.setTimeout(function () { hostEl.remove(); }, 5200);
  }

  /* ----------------------------------------------------------------------
     ДРІБНИЦІ: пружний лічильник, wiggle, оголошення
     ---------------------------------------------------------------------- */
  function countTo(el, to, suffix) {
    var from = parseInt(el.textContent, 10) || 0;
    if (from === to) return;
    if (reduced) { el.textContent = to + (suffix || ''); return; }
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    var start = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - start) / 520);
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * e) + (suffix || '');
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  function wiggle(el) {
    if (reduced || !el) return;
    el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle');
  }

  function pop(el) {
    if (reduced || !el) return;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  var live = document.createElement('div');
  live.setAttribute('aria-live', 'polite');
  live.className = 'sr-only';
  document.body.appendChild(live);
  function announce(msg) { live.textContent = ''; window.setTimeout(function () { live.textContent = msg; }, 60); }

  /* ----------------------------------------------------------------------
     КОПІЮВАННЯ
     ---------------------------------------------------------------------- */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = $(btn.getAttribute('data-copy'));
      var text = src ? src.innerText.replace(/\s*$/, '') : '';
      var done = function () {
        btn.setAttribute('data-copied', 'true');
        var use = btn.querySelector('use');
        if (use) use.setAttribute('href', '#i-check');
        wiggle(btn);
        announce('Скопійовано. Замініть позначки у квадратних дужках на свої дані.');
        window.setTimeout(function () {
          btn.removeAttribute('data-copied');
          if (use) use.setAttribute('href', '#i-copy');
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else { done(); }
    });
  });

  /* ----------------------------------------------------------------------
     МОБІЛЬНЕ МЕНЮ
     ---------------------------------------------------------------------- */
  var burger = $('.burger');
  var links = $('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.style.display === 'flex';
      if (open) {
        links.removeAttribute('style');
        burger.setAttribute('aria-expanded', 'false');
      } else {
        links.style.cssText =
          'display:flex;position:absolute;top:76px;left:24px;right:24px;flex-direction:column;' +
          'padding:14px;border-radius:30px;background:#fff;box-shadow:0 20px 40px -12px rgba(38,34,74,.24);z-index:70';
        burger.setAttribute('aria-expanded', 'true');
      }
    });
    links.addEventListener('click', function () {
      if (window.innerWidth <= 1000) {
        links.removeAttribute('style');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Експорт для сторінкових скриптів */
  window.YASNO = { confetti: confetti, countTo: countTo, wiggle: wiggle, pop: pop, announce: announce, reduced: reduced };
})();

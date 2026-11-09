(() => {
  // ===== CONFIG =====
  const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/9VHDRSBFHV';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]motion/.test(location.search);
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  // ===== UTILS =====
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // header: shadowless tone change + hide on scroll down
  const header = $('#header');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('scrolled', y > 8);
    header?.classList.toggle('hide', y > lastY && y > 420 && !document.body.classList.contains('menu-open'));
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // burger
  const burger = $('#burger');
  const nav = $('#nav');
  const closeMenu = () => {
    burger?.classList.remove('is-open');
    nav?.classList.remove('is-open');
    burger?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };
  burger?.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', closeMenu));

  // smooth scroll (Lenis) + anchors
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href.length <= 1) return;
    const target = $(href);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: href === '#top' ? 0 : -60 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: reduce ? 'auto' : 'smooth' });
  }));

  // phone mask
  $$('input[type="tel"]').forEach(input => {
    input.addEventListener('input', e => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.startsWith('8')) v = '7' + v.slice(1);
      if (!v.startsWith('7')) v = '7' + v;
      v = v.slice(0, 11);
      let out = '+7';
      if (v.length > 1) out += ' (' + v.slice(1, 4);
      if (v.length >= 4) out += ') ' + v.slice(4, 7);
      if (v.length >= 7) out += '-' + v.slice(7, 9);
      if (v.length >= 9) out += '-' + v.slice(9, 11);
      e.target.value = out;
    });
  });

  // ===== CALCULATOR (ориентировочные цены, окончательно — после экспресс-анализа) =====
  const calcForm = $('#calcForm');
  const P = {
    form: { ip: 5000, ooo: 7000 },
    regime: { usn6: 1500, usn15: 3000, usnnds: 6500, osno: 10500 },
    emp: 900,
    docs: [0, 2200, 5200, 9000, 14000],
    docsLabel: ['до 30', 'до 100', 'до 300', 'до 600', 'до 1 000'],
    opt: { mp: 3000, trans: 3500, gov: 4000, foreign: 2500 }
  };
  const names = {
    form: { ip: 'ИП', ooo: 'ООО' },
    regime: { usn6: 'УСН «доходы»', usn15: 'УСН «доходы − расходы»', usnnds: 'УСН с НДС', osno: 'ОСНО' },
    opt: { mp: 'Маркетплейсы', trans: 'ГосЛог и ЭТРН', gov: '44-ФЗ / 223-ФЗ', foreign: 'Иностранные сотрудники' }
  };
  const state = { old: 0, now: 0, summary: '' };
  const view = { old: 0, now: 0 };

  function calc() {
    const f = calcForm.form.value;
    const r = calcForm.regime.value;
    const emp = +calcForm.emp.value;
    const di = +calcForm.docs.value;
    const opts = $$('input[name=opt]:checked', calcForm).map(i => i.value);
    const fast = calcForm.fast.checked;

    const lines = [
      [names.form[f] + ', ' + names.regime[r], P.form[f] + P.regime[r]],
    ];
    if (emp) lines.push(['Сотрудники: ' + emp, emp * P.emp]);
    if (P.docs[di]) lines.push(['Документы: ' + P.docsLabel[di] + ' в мес.', P.docs[di]]);
    opts.forEach(o => lines.push([names.opt[o], P.opt[o]]));

    const list = lines.reduce((s, l) => s + l[1], 0);
    const k = fast ? 0.75 : 0.8;
    const ours = Math.round(list * k / 10) * 10;

    $('#empOut').textContent = emp;
    $('#docsOut').textContent = P.docsLabel[di];
    $('#discLine').textContent = fast ? 'Скидка 25% за оперативность' : 'Скидка 20% для новых клиентов';
    $('#calcLines').innerHTML = lines.map(l => `<li><span>${l[0]}</span><b>${fmt(l[1])} ₽</b></li>`).join('');
    $('#giftLine').hidden = !(r === 'usnnds');

    state.old = list;
    state.now = ours;
    state.summary = `Калькулятор: ${lines.map(l => l[0]).join('; ')}. По прайсу ${fmt(list)} ₽, со скидкой ${fmt(ours)} ₽/мес${fast ? ' (оплата в 5 дней)' : ''}.`;
    $('#calcField').value = state.summary;
    animateNumbers();
  }

  function animateNumbers() {
    const oldEl = $('#oldPrice'), newEl = $('#newPrice');
    if (!view.now) { oldEl.textContent = fmt(state.old); newEl.textContent = fmt(state.now); view.old = state.old; view.now = state.now; return; }
    if (hasGsap && !reduce) {
      gsap.to(view, {
        old: state.old, now: state.now, duration: 0.7, ease: 'power3.out', overwrite: true,
        onUpdate: () => { oldEl.textContent = fmt(view.old); newEl.textContent = fmt(view.now); }
      });
    } else {
      view.old = state.old; view.now = state.now;
      oldEl.textContent = fmt(state.old); newEl.textContent = fmt(state.now);
    }
  }
  if (calcForm) {
    calcForm.addEventListener('input', calc);
    calcForm.addEventListener('change', calc);
    calcForm.addEventListener('submit', e => e.preventDefault());
    calc();
  }

  // promo tiles / calc CTA preselect topic
  const topicSel = $('#topicSel');
  $$('.tile[data-topic]').forEach(t => t.addEventListener('click', () => {
    const val = t.dataset.topic;
    const opt = [...topicSel.options].find(o => o.textContent === val);
    if (opt) topicSel.value = opt.value;
  }));
  $('#calcCta')?.addEventListener('click', () => {
    topicSel.value = 'Бухгалтерское сопровождение';
  });

  // ===== FORM → CLOUDFLARE WORKER → TELEGRAM =====
  const form = $('#leadForm');
  const statusEl = $('#formStatus');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.querySelector('span');
    const orig = label.textContent;
    const fd = new FormData(form);
    const raw = {};
    fd.forEach((v, k) => { raw[k] = v; });
    if (raw._gotcha) return;

    statusEl.classList.remove('err');
    if (!raw.name.trim() || raw.phone.replace(/\D/g, '').length < 11) {
      statusEl.classList.add('err');
      statusEl.textContent = 'Заполните имя и телефон полностью.';
      return;
    }
    const comment = [
      'Интересует: ' + raw.topic,
      raw.note ? 'О бизнесе: ' + raw.note : '',
      raw.calc || ''
    ].filter(Boolean).join('\n');
    const payload = { name: raw.name.trim(), phone: raw.phone, comment };

    btn.disabled = true;
    label.textContent = 'Отправляем…';
    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      statusEl.textContent = 'Заявка отправлена. Мы свяжемся с вами в ближайшее рабочее время.';
      form.reset();
      calc();
    } catch (err) {
      console.error(err);
      statusEl.classList.add('err');
      statusEl.textContent = 'Не получилось отправить. Попробуйте ещё раз.';
    } finally {
      setTimeout(() => { label.textContent = orig; btn.disabled = false; }, 2500);
    }
  });

  // ===== MOTION =====
  if (!hasGsap || reduce) {
    $$('.way__steps li').forEach(li => li.classList.add('on'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // hero title: words rise from a mask
  const h1 = $('#heroTitle');
  if (h1) {
    const text = h1.textContent.trim();
    h1.setAttribute('aria-label', text);
    h1.innerHTML = text.split(' ').map(w => `<span class="w" aria-hidden="true"><span>${w}</span></span>`).join(' ');
  }
  const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  heroTl
    .from('.hero h1 .w>span', { yPercent: 115, duration: 1.1, stagger: 0.07 })
    .from('.hero__lead', { y: 26, opacity: 0, duration: 0.9 }, '-=0.7')
    .from('.hero__actions > *', { y: 22, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.65')
    .from('.hero__facts li', { y: 18, opacity: 0, duration: 0.7, stagger: 0.08 }, '-=0.6')
    .from('#heroSheet', { y: 80, rotate: 7, opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.25)
    .from('#heroSheet .sheet__rows li', { x: -24, opacity: 0, duration: 0.6, stagger: 0.09 }, 0.7)
    .from('#heroSheet .sheet__total', { scale: 0.92, opacity: 0, duration: 0.7, ease: 'back.out(2)' }, 1.4)
    .from('#heroSheet .sheet__stamp', { scale: 2.6, rotate: 20, opacity: 0, duration: 0.5, ease: 'power3.in' }, 1.5);

  // hero sheet drifts as you scroll away
  gsap.to('#heroSheet', {
    yPercent: -10, rotate: 0, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 }
  });

  // marquee speeds up with scroll velocity
  const track = $('.marquee__track');
  ScrollTrigger.create({
    onUpdate: self => {
      const v = Math.min(Math.abs(self.getVelocity()) / 900, 4);
      track.style.animationDuration = Math.max(14, 48 - v * 10) + 's';
    }
  });

  // section headings + text entrances
  const rise = (sel, opts = {}) => $$(sel).forEach(el => {
    gsap.from(el, {
      y: opts.y ?? 36, opacity: 0, duration: 0.9, ease: 'power3.out', delay: opts.delay || 0,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });
  rise('.pains__head h2'); rise('.pains__head p', { delay: 0.1 });
  rise('.trust__col h2'); rise('.trust__col p', { delay: 0.1 });
  rise('.calc__head h2'); rise('.calc__head p', { delay: 0.1 });
  rise('.promo__head h2'); rise('.promo__head p', { delay: 0.1 });
  rise('.way__head h2'); rise('.way__head p', { delay: 0.1 });
  rise('.faq__grid > h2');
  rise('.contact__text h2'); rise('.contact__text p', { delay: 0.1 });

  gsap.from('.pain', {
    y: 40, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out',
    scrollTrigger: { trigger: '#painList', start: 'top 85%', once: true }
  });
  gsap.from('.q', {
    y: 30, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out',
    scrollTrigger: { trigger: '.faq__list', start: 'top 85%', once: true }
  });
  gsap.from('.contact__list li', {
    x: -26, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '.contact__list', start: 'top 90%', once: true }
  });
  gsap.from('.form', {
    y: 60, opacity: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.form', start: 'top 90%', once: true }
  });

  // trust: columns slide in from sides
  gsap.from('.trust__col--a', { x: -60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.trust', start: 'top 70%', once: true } });
  gsap.from('.trust__col--b', { x: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.trust', start: 'top 70%', once: true } });

  // calculator panels
  gsap.from('.calc__controls', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.calc__box', start: 'top 85%', once: true } });
  gsap.from('.calc__result', { y: 80, opacity: 0, duration: 1, delay: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.calc__box', start: 'top 85%', once: true } });

  // promo bento: staggered pop
  gsap.from('.tile', {
    y: 70, opacity: 0, scale: 0.94, duration: 0.9, stagger: { each: 0.08, from: 'start' }, ease: 'power3.out',
    scrollTrigger: { trigger: '.bento', start: 'top 82%', once: true }
  });
  gsap.from('.tile--a .tile__big', {
    scale: 0.6, transformOrigin: '0% 100%', duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.tile--a', start: 'top 80%', once: true }
  });

  // subtle tilt on tiles
  $$('.tile').forEach(t => {
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(t, { rotateY: x * 5, rotateX: -y * 5, transformPerspective: 900, duration: 0.4, ease: 'power2.out' });
    });
    t.addEventListener('pointerleave', () => gsap.to(t, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out' }));
  });

  // magnet buttons
  $$('.btn--magnet').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.28, duration: 0.3 });
    });
    b.addEventListener('pointerleave', () => gsap.to(b, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,.5)' }));
  });

  // process: thick bar fills, steps light up
  gsap.to('#wayFill', {
    scaleY: 1, ease: 'none',
    scrollTrigger: { trigger: '#waySteps', start: 'top 65%', end: 'bottom 65%', scrub: 0.5 }
  });
  $$('#waySteps li').forEach(li => ScrollTrigger.create({
    trigger: li, start: 'top 68%', onEnter: () => li.classList.add('on'), onLeaveBack: () => li.classList.remove('on')
  }));

  // ===== SCENE: чужой счёт растёт, наш стоит =====
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const extras = $$('#sheetOther .extra');
    const totalEl = $('#otherTotal');
    const vals = [12000, 14800, 16300, 18300, 21300];
    const counter = { v: 12000 };
    gsap.set(extras, { opacity: 0, y: 26, height: 0, paddingBlock: 0 });
    gsap.set('#sheetOurs', { y: 0 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#bill', start: 'top top+=60', end: '+=1600', scrub: 0.6, pin: '#billPin', anticipatePin: 1 }
    });
    extras.forEach((li, i) => {
      tl.to(li, { opacity: 1, y: 0, height: 'auto', paddingBlock: 13, duration: 1, ease: 'power2.out' })
        .to(counter, { v: vals[i + 1], duration: 1, onUpdate: () => { totalEl.textContent = fmt(counter.v); } }, '<')
        .to('#sheetOther', { rotate: (i % 2 ? 0.6 : -0.6), duration: 0.5 }, '<');
    });
    tl.to('#sheetOther', { rotate: 0, duration: 0.5 })
      .from('#sheetOurs .sheet__total', { scale: 1, duration: 0.01 })
      .to('#sheetOurs', { scale: 1.03, duration: 0.5, ease: 'power2.out' }, '-=0.5')
      .to({}, { duration: 0.8 });
    return () => { totalEl.textContent = fmt(21300); };
  });
  mm.add('(max-width: 900px)', () => {
    gsap.from('#sheetOther .extra', {
      opacity: 0, x: -30, duration: 0.7, stagger: 0.25, ease: 'power3.out',
      scrollTrigger: { trigger: '#sheetOther', start: 'top 80%', once: true }
    });
    const totalEl = $('#otherTotal');
    const counter = { v: 12000 };
    gsap.to(counter, {
      v: 21300, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: '#sheetOther', start: 'top 80%', once: true },
      onUpdate: () => { totalEl.textContent = fmt(counter.v); }
    });
    gsap.from('#sheetOurs', { opacity: 0, y: 40, duration: 0.9, scrollTrigger: { trigger: '#sheetOurs', start: 'top 88%', once: true } });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();

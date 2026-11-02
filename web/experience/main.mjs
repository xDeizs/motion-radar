// Motion Radar 5 · experience bundle: Lenis smooth scroll, GSAP ScrollTrigger choreography,
// the Three.js hero and the radar peak. Built into assets/js/experience.js by tools/build.mjs.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createHero } from './hero.mjs';
import { createRadar } from './radar.mjs';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const MR = window.MR;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const desktopMQ = matchMedia('(min-width: 981px)');

function boot() {
  if (!MR) return;
  const html = document.documentElement;
  let motion = MR.motionAllowed();
  let lenis = null, ctx = null, hero = null, radar = null, rafCb = null;

  // radar first: cheap and always useful
  const radarRoot = $('#radar');
  radar = createRadar({ canvas: $('#radar-canvas'), root: radarRoot, list: $('#radar-list'), onOpen: (id) => MR.openDetail(id) });
  if (MR.stageData) radar.setItems(MR.stageData.blips);
  MR.on('stage', (d) => { radar.setItems(d.blips); });
  MR.on('blip-hover', (i) => radar.highlight(i));

  // hero 3D
  try {
    hero = createHero({
      canvas: $('#hero-canvas'), host: $('#hero-scene'), stage: $('#hero'), gsap, motion,
      onGo: (id) => MR.go(id),
    });
  } catch (err) {
    console.warn('Motion Radar: 3D hero disabled', err);
    hero = null;
  }

  // LED wall video: plays only while visible and only when motion is allowed
  const video = $('#led-video');
  let videoVisible = false;
  const syncVideo = () => {
    if (!video) return;
    if (motion && videoVisible && !document.hidden) {
      if (video.preload === 'none') { video.preload = 'auto'; video.load(); }
      const p = video.play(); if (p && p.catch) p.catch(() => {});
    } else if (!video.paused) video.pause();
  };
  if (video) {
    new IntersectionObserver((es) => { videoVisible = es[0].isIntersecting; syncVideo(); }, { rootMargin: '200px' }).observe(video);
    document.addEventListener('visibilitychange', syncVideo);
  }

  function countUp(el) {
    if (!el) return;
    const target = parseInt(el.textContent, 10);
    if (!Number.isFinite(target) || target <= 0) return;
    const o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.4, ease: 'power3.out', onUpdate: () => { el.textContent = String(Math.round(o.v)); }, onComplete: () => { el.textContent = String(target); } });
  }

  function choreograph() {
    const wide = desktopMQ.matches;
    ctx = gsap.context(() => {
      // hero: headline rise, then lines drift apart while keys scatter on scroll
      gsap.from('.ht-word', { yPercent: 112, duration: 1.15, ease: 'expo.out', stagger: 0.09, delay: 0.1 });
      gsap.from(['.hero-lede', '.hero-actions'], { y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.5 });
      const heroST = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true };
      ScrollTrigger.create({ ...heroST, onUpdate: (s) => hero && hero.setScroll(s.progress) });
      gsap.to('.ht-line:nth-child(1) .ht-word', { xPercent: -14, ease: 'none', scrollTrigger: heroST });
      gsap.to('.ht-line:nth-child(2) .ht-word', { xPercent: 10, ease: 'none', scrollTrigger: heroST });
      gsap.to('.ht-line:nth-child(3) .ht-word', { xPercent: -6, ease: 'none', scrollTrigger: heroST });
      gsap.to('.hero-under', { y: -70, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '55% top', scrub: true } });
      gsap.to('.ticker', { yPercent: 60, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '#hero', start: '40% top', end: 'bottom top', scrub: true } });

      // manifesto: pinned, words light up one by one over the LED wall
      const words = $$('.mw');
      const man = gsap.timeline({ scrollTrigger: { trigger: '#manifesto', start: 'top top', end: wide ? '+=130%' : '+=90%', pin: true, scrub: 0.6, anticipatePin: 1 } });
      man.fromTo('.led-video', { scale: 1.28 }, { scale: 1, duration: 3, ease: 'none' }, 0)
        .fromTo(words, { opacity: 0.12, y: 18 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.42, ease: 'power2.out' }, 0.1)
        .fromTo('.manifesto-text', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '>-0.1')
        .fromTo('#tape-a', { xPercent: 0 }, { xPercent: -22, duration: 3, ease: 'none' }, 0)
        .fromTo('#tape-b', { xPercent: -22 }, { xPercent: 0, duration: 3, ease: 'none' }, 0);

      // ways: horizontal pan on wide screens, stacked reveals elsewhere
      const ways = $('#ways'), track = $('#ways-track');
      if (wide) {
        ways.classList.add('is-pan');
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const pan = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: ways, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
        $$('.way').forEach((way) => {
          gsap.fromTo($('.way-media img', way), { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: way, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true } });
          gsap.from($('.way-verb', way), { rotate: -18, scale: 0.6, opacity: 0, duration: 0.7, ease: 'back.out(2)', scrollTrigger: { trigger: way, containerAnimation: pan, start: 'left 70%', toggleActions: 'play none none reverse' } });
        });
      } else {
        ways.classList.remove('is-pan');
        $$('.way').forEach((way) => {
          gsap.from(way, { y: 70, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: way, start: 'top 88%', toggleActions: 'play none none reverse' } });
          gsap.fromTo($('.way-media img', way), { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: way, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      }

      // radar: the peak. Pinned on wide screens, scrubbed in place on phones
      radar.setMotion(true);
      ScrollTrigger.create({
        trigger: '#radar', start: wide ? 'top top' : 'top 75%', end: wide ? '+=190%' : 'bottom 55%',
        pin: wide ? '#radar' : false, scrub: 0.5, anticipatePin: 1,
        onUpdate: (s) => radar.setProgress(s.progress),
        onEnter: () => { countUp($('#items-stat')); countUp($('#repos-stat')); },
      });
      gsap.from('.radar-copy h2, .radar-lede', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '#radar', start: 'top 70%', toggleActions: 'play none none reverse' } });

      // close: mascot rises, stickers pop, the wordmark drifts
      gsap.fromTo('.close-mask', { scale: 0.84, rotate: -4 }, { scale: 1, rotate: 0, ease: 'none', scrollTrigger: { trigger: '#close', start: 'top bottom', end: 'center center', scrub: true } });
      gsap.fromTo('.close-mask img', { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '#close', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from('.sticker', { scale: 0, rotate: -40, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.12, scrollTrigger: { trigger: '.close-art', start: 'top 65%', toggleActions: 'play none none reverse' } });
      gsap.from('.close-copy > *', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.close-copy', start: 'top 80%', toggleActions: 'play none none reverse' } });
      gsap.fromTo('.wordmark-giant', { xPercent: 8 }, { xPercent: -26, ease: 'none', scrollTrigger: { trigger: '#close', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  function startLenis() {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, prevent: (node) => !!(node.closest && node.closest('dialog,[data-lenis-prevent]')) });
    MR.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    rafCb = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(rafCb);
    gsap.ticker.lagSmoothing(0);
    if ($('#modal').open) lenis.stop();
  }
  function stopLenis() {
    if (!lenis) return;
    gsap.ticker.remove(rafCb); lenis.destroy(); lenis = null; MR.lenis = null;
  }

  function setup() {
    motion = MR.motionAllowed();
    html.classList.toggle('mr-anim', motion);
    if (hero) hero.setMotion(motion);
    if (motion) {
      startLenis();
      choreograph();
    } else {
      radar.setMotion(false);
      $('#ways').classList.remove('is-pan');
    }
    syncVideo();
    ScrollTrigger.refresh();
  }
  function teardown() {
    if (ctx) { ctx.revert(); ctx = null; }
    stopLenis();
    $('#ways').classList.remove('is-pan');
  }

  setup();

  // deep links (?view=code) land in the library once pins have been measured
  const jumpToLibrary = () => {
    if (MR.initialView === 'feed') return;
    const y = $('#main').getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
  };
  requestAnimationFrame(jumpToLibrary);

  MR.on('motion', () => { teardown(); setup(); });
  let lastWide = desktopMQ.matches;
  desktopMQ.addEventListener('change', () => { if (desktopMQ.matches !== lastWide) { lastWide = desktopMQ.matches; if (motion) { teardown(); setup(); } } });

  // library height changes on every tab switch; keep later triggers honest
  let refreshTimer = 0;
  const ro = new ResizeObserver(() => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 160); });
  ro.observe($('#main'));
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  MR.experience = { gsap, ScrollTrigger, hero: () => hero, radar: () => radar };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

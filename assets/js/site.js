/* =========================================================
   LuminSDK — interações do site
   Tema, navegação, animações e cópia do código de integração.
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
(function () {
  'use strict';

  const STORAGE_KEY = 'luminsdk-theme';
  const root = document.documentElement;
  const prefersReducedMotion = !!(
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  /* ---------- tema ---------- */
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f7f7fb' : '#07070c');
    if (window.LuminLibrary && typeof window.LuminLibrary.refreshTheme === 'function') {
      window.LuminLibrary.refreshTheme();
    }
    window.dispatchEvent(new CustomEvent('lumin:theme', { detail: { theme: theme === 'light' ? 'light' : 'dark' } }));
  }

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      saved = null;
    }
    // O padrão do site é o tema escuro; o usuário pode trocar quando quiser.
    applyTheme(saved === 'light' ? 'light' : 'dark');

    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (error) {
        /* navegador sem armazenamento: a troca continua funcionando na sessão */
      }
    });
  }

  /* ---------- cabeçalho + progresso de leitura ---------- */
  function initScrollUi() {
    const header = document.querySelector('.site-header');
    const bar = document.getElementById('scroll-progress-bar');
    let ticking = false;

    function update() {
      const top = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', top > 8);
      if (bar) {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const progress = height > 0 ? Math.min(1, Math.max(0, top / height)) : 0;
        bar.style.width = (progress * 100).toFixed(2) + '%';
      }
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  /* ---------- animação de entrada ---------- */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach((item) => observer.observe(item));
  }

  /* ---------- contadores ---------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const format = new Intl.NumberFormat('pt-BR');

    function animate(node) {
      const target = Number(node.dataset.count);
      const suffix = node.dataset.suffix || '';
      if (!Number.isFinite(target) || target <= 0) return;
      if (prefersReducedMotion) {
        node.textContent = format.format(target) + suffix;
        return;
      }
      const duration = 1100;
      const start = performance.now();

      (function step(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = format.format(Math.round(target * eased)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      })(start);
    }

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animate);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach((node) => observer.observe(node));
  }

  /* ---------- copiar o trecho de integração ---------- */
  function initCopy() {
    const button = document.getElementById('copy-snippet');
    const snippet = document.getElementById('snippet');
    if (!button || !snippet) return;

    button.addEventListener('click', async () => {
      const text = snippet.textContent;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const area = document.createElement('textarea');
          area.value = text;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.append(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        button.textContent = 'Copiado!';
        setTimeout(() => { button.textContent = 'Copiar'; }, 1800);
        if (window.LuminLibrary) window.LuminLibrary.toast('Código copiado para a área de transferência.');
      } catch (error) {
        button.textContent = 'Erro';
        setTimeout(() => { button.textContent = 'Copiar'; }, 1800);
      }
    });
  }

  /* ---------- ano no rodapé ---------- */
  /* ---------- inclinação 3D dos cards (leve e opcional) ---------- */
  function initCardTilt() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (prefersReducedMotion) return;

    const grid = document.getElementById('games');
    if (!grid) return;

    let frame = 0;
    let current = null;
    let rect = null;

    function enabled() {
      const api = window.LuminSettings;
      if (!api || typeof api.get !== 'function') return true;
      const settings = api.get();
      return settings.hover !== false && settings.motion !== false;
    }

    function reset(card) {
      if (!card) return;
      card.style.transform = '';
    }

    grid.addEventListener('pointermove', (event) => {
      if (!enabled()) return;
      const card = event.target && event.target.closest ? event.target.closest('.game-card') : null;
      if (!card) return;

      if (current !== card) {
        reset(current);
        current = card;
        rect = card.getBoundingClientRect();
      }

      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!current || !rect) return;
        const px = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const py = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
        current.style.transform =
          'perspective(760px) rotateX(' + (-py * 5).toFixed(2) + 'deg) rotateY(' +
          (px * 7).toFixed(2) + 'deg) translateY(-4px)';
      });
    }, { passive: true });

    grid.addEventListener('pointerleave', () => {
      reset(current);
      current = null;
      rect = null;
    }, { passive: true });

    grid.addEventListener('pointerout', (event) => {
      const card = event.target && event.target.closest ? event.target.closest('.game-card') : null;
      if (card && (!event.relatedTarget || !card.contains(event.relatedTarget))) reset(card);
    }, { passive: true });
  }

  /* ---------- botão de jogo aleatório no hero ---------- */
  function initHeroRandom() {
    const button = document.getElementById('hero-random');
    if (!button) return;
    button.addEventListener('click', () => {
      if (!window.LuminLibrary) return;
      window.LuminLibrary.random();
    });
  }

  function initYear() {
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  let started = false;

  /* ---------- instalação como app (PWA) ---------- */
  function initInstall() {
    const button = document.getElementById('install-btn');
    if (!button) return;

    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredPrompt = event;
      button.hidden = false;
    });

    button.addEventListener('click', async () => {
      if (!deferredPrompt) {
        if (window.LuminLibrary) {
          window.LuminLibrary.toast('Use o menu do navegador → “Instalar app” para adicionar à tela inicial.');
        }
        return;
      }
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (error) {
        /* usuário cancelou */
      }
      deferredPrompt = null;
      button.hidden = true;
    });

    window.addEventListener('appinstalled', () => {
      button.hidden = true;
      if (window.LuminLibrary) window.LuminLibrary.toast('App instalado! Ele já está na sua tela inicial.');
    });
  }

  /* ---------- voltar ao topo ---------- */
  function initToTop() {
    const button = document.getElementById('to-top');
    if (!button) return;

    let ticking = false;
    function update() {
      button.classList.toggle('is-visible', window.scrollY > 720);
      button.hidden = window.scrollY <= 720;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      const skip = document.querySelector('.skip-link');
      if (skip) skip.focus({ preventScroll: true });
    });

    update();
  }

  /* ---------- navegação ativa conforme a rolagem ---------- */
  function initScrollSpy() {
    const links = [...document.querySelectorAll('.site-nav a[href^="#"]')];
    if (!links.length || !('IntersectionObserver' in window)) return;

    const sections = links
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);
    if (!sections.length) return;

    const setActive = (id) => {
      links.forEach((link) => {
        const active = link.getAttribute('href') === '#' + id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        .slice(0, 1)
        .forEach((entry) => setActive(entry.target.id));
    }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.2, 0.5, 1] });

    sections.forEach((section) => observer.observe(section));
  }

  /* ---------- service worker (offline + instalação) ---------- */
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;

    /* resolve o sw.js a partir da pasta do site (funciona também na 404) */
    const script = document.querySelector('script[src*="site.js"]');
    let swUrl = 'sw.js';
    let scope = './';
    try {
      const scriptUrl = new URL(script ? script.getAttribute('src') : 'assets/js/site.js', document.baseURI);
      const rootUrl = new URL('../../', scriptUrl);
      swUrl = new URL('sw.js', rootUrl).toString();
      scope = rootUrl.pathname;
    } catch (error) {
      /* mantém os caminhos relativos */
    }

    /* Se já havia um service worker controlando a página, uma versão nova
       significa que o JS/CSS mudou: recarrega uma vez para o usuário sair do
       cache antigo (era isso que fazia correções "não aparecerem"). */
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl, { scope: scope }).catch((error) => {
        console.warn('[LuminSDK] service worker não registrado:', error);
      });
    });
  }

  function init() {
    if (started) return;
    started = true;
    initTheme();
    initScrollUi();
    initReveal();
    initCounters();
    initCopy();
    initYear();
    initHeroRandom();
    initCardTilt();
    initToTop();
    initInstall();
    initScrollSpy();
    initServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

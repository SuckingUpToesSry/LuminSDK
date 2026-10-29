/* =========================================================
   LuminSDK — interações do site
   Tema, navegação, animações e atalhos de teclado.
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

  /* ---------- atalhos de teclado ---------- */
  function initShortcuts() {
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        if (window.LuminLibrary) window.LuminLibrary.focusSearch();
        return;
      }

      if ((event.key === 'r' || event.key === 'R') && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const player = document.getElementById('player');
        if (player && player.open) return;
        event.preventDefault();
        if (window.LuminLibrary) window.LuminLibrary.random();
      }
    });
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
  function initYear() {
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  let started = false;

  function init() {
    if (started) return;
    started = true;
    initTheme();
    initScrollUi();
    initReveal();
    initCounters();
    initShortcuts();
    initCopy();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

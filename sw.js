/* =========================================================
   LuminSDK — service worker
   Guarda o "app shell" em cache para abrir offline (jogos
   continuam precisando de internet, pois vêm do LuminSDK).
   Autor: Ryan Smith · Licença MIT
   ========================================================= */
'use strict';

const VERSION = 'v70';
const SHELL_CACHE = 'lumin-shell-' + VERSION;
const RUNTIME_CACHE = 'lumin-runtime-' + VERSION;

/* Só o essencial para o site abrir offline.
   Imagens pesadas (banner, ícones grandes), o JSON do GN-Math e a outra aba
   entram no cache sozinhos na primeira visita, pelo handler de fetch abaixo.
   Antes o install baixava ~700 KB de uma vez, inclusive arquivos que a
   pessoa talvez nunca abrisse. */
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/styles.css?v=70',
  'assets/css/app.css?v=70',
  'assets/css/tabs.css?v=70',
  'assets/js/app.js?v=70',
  'assets/js/cloak.js?v=70',
  'assets/js/downloads.js?v=70',
  'assets/js/game-tab.js?v=70',
  'assets/js/links.js?v=70',
  'assets/js/anim-classic.js?v=70',
  'assets/js/personal.js?v=70',
  'assets/css/personal.css?v=70',
  'assets/js/anim.js?v=70',
  'assets/css/anim.css?v=70',
  'assets/js/astolfo.js?v=70',
  'assets/css/astolfo.css?v=70',
  'assets/css/extras.css?v=70',
  'assets/js/keybinds.js?v=70',
  'assets/js/single.js?v=70',
  'assets/css/single.css?v=70',
  'assets/js/bgimage.js?v=70',
  'assets/js/secret.js?v=70',
  'assets/js/site.js?v=70',
  'assets/js/settings.js?v=70',
  'assets/js/progress.js?v=70',
  'assets/js/atmosphere.js?v=70',
  'assets/js/library.js?v=70',
  'assets/js/bonus.js?v=70',
  'assets/js/social.js?v=70',
  'assets/js/player.js?v=70',
  'assets/js/os.js?v=70',
  'assets/js/profile.js?v=70',
  'assets/js/lab.js?v=70',
  'assets/js/studio.js?v=70',
  'assets/js/arcade.js?v=70',
  'assets/js/vault.js?v=70',
  'assets/js/community.js?v=70',
  'assets/css/social.css?v=70',
  'assets/css/lcore.css?v=70',
  'assets/js/lcore.js?v=70',
  'assets/css/os.css?v=70',
  'assets/css/hub.css?v=70',
  'assets/js/hub.js?v=70',
  'assets/js/central.js?v=70',
  'assets/img/hub.svg',
  'assets/img/mgs.svg',
  'assets/css/study.css?v=70',
  'assets/js/study-questions.js?v=70',
  'assets/js/study-content.js?v=70',
  'assets/js/study.js?v=70',
  'assets/js/study-plus.js?v=70',
  'assets/css/browser.css?v=70',
  'assets/js/browser.js?v=70',
  'assets/js/provider.js?v=70',
  'assets/css/provider.css?v=70',
  'assets/img/browser.jpg',
  'assets/img/duckmath.jpg',
  'assets/img/astra.jpg',
  'assets/img/favicon.svg',
  'assets/img/os-icon.jpg',
  /* papel de parede do tema Astolfo (73 KB): sem ele o tema abre sem fundo offline */
  'assets/img/astolfo/astolfo-wall-1280.jpg',
  /* HTML pronto do Ctrl+AltGr+P (16 KB): guardado para o atalho baixar
     mesmo sem internet */
  'assets/files/DRAG-INTO-BROWSER.svg.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        /* 'reload' ignora o cache HTTP: garante que a casca nova seja a que
           acabou de ser publicada, e não uma cópia antiga do navegador. */
        Promise.all(
          SHELL.map((path) =>
            cache.add(new Request(path, { cache: 'reload' })).catch(() => undefined)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* Requisições do SDK / catálogo: sempre rede (dados nunca podem ficar velhos) */
  const isSdk = url.hostname !== self.location.hostname;
  if (isSdk) return;

  /* Navegação: rede primeiro, cache como reserva (offline) */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('index.html'))
            .then((cached) => cached || new Response('Offline', { status: 503, statusText: 'Offline' }))
        )
    );
    return;
  }

  /* Fontes do Google: stale-while-revalidate */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((response) => {
              cache.put(request, response.clone()).catch(() => {});
              return response;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  /* Estáticos locais: rede primeiro, cache só como reserva offline.
     (cache primeiro fazia o navegador continuar rodando o JS/CSS antigo
     depois de uma correção publicada.) */
  event.respondWith(
    fetch(request)
      .then((response) => {
        /* só guarda sucesso de verdade: 404 de arquivo recém-publicado
           (ex.: assets/js/anim.js?v=70 antes do Pages terminar) não pode
           virar cache permanente */
        if (response && response.ok && response.status === 200) {
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, response.clone())).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response('Offline', { status: 503, statusText: 'Offline' })))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

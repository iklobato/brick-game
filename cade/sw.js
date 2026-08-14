// Cache primeiro, sempre. Depois de instalado o jogo nao fala com a rede nunca
// mais: da para desligar o wi-fi e conferir. Isso nao e so comodidade offline, e
// a garantia de que nao existe pixel, anuncio nem coleta escondida no caminho.
const CACHE = 'cade-v1';

const ARQUIVOS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon.svg',
  './src/main.js',
  './src/selfcheck.js',
  './src/config.js',
  './src/core/audio.js',
  './src/core/input.js',
  './src/core/session.js',
  './src/core/stage.js',
  './src/core/storage.js',
  './src/activities/figura.js',
  './src/activities/tocaEAcontece.js',
  './src/activities/cade.js',
  './src/activities/musica.js',
  './src/parent/cartao.js',
  './src/parent/gate.js',
  './src/parent/painel.js',
  './src/parent/recorder.js',
  './src/parent/suggestions.js',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== CACHE).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(caches.match(evento.request).then((achado) => achado ?? fetch(evento.request)));
});

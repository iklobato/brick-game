// Cache primeiro, sempre. Depois de instalado o jogo nao fala com a rede nunca
// mais: da para desligar o wi-fi e conferir. Isso nao e so comodidade offline, e
// a garantia de que nao existe pixel, anuncio nem coleta escondida no caminho.
// O nome do cache carrega a impressao digital dos arquivos abaixo, e o
// test-cade.js falha quando os dois discordam. Sem isso o cache-first vira uma
// armadilha: um tablet que ja instalou o jogo continuaria com a versao antiga
// para sempre, porque nada aqui volta a perguntar nada para a rede. Trocar este
// nome e o unico jeito de uma correcao chegar ate ele.
const CACHE = 'cade-7b6e6d66f7e5555c';

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
  './assets/img/bola.jpg',
  './assets/img/copo.jpg',
  './assets/img/cao.jpg',
  './assets/img/icone-toca.jpg',
  './assets/img/icone-cade.jpg',
  './assets/img/icone-musica.jpg',
  './assets/audio/bola.wav',
  './assets/audio/copo.wav',
  './assets/audio/cachorro.wav',
  './assets/audio/achou.wav',
  './assets/audio/cade.wav',
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

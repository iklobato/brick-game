const BEST_KEY = 'agarBest';
const NAME_KEY = 'agarName';
const MAX_EFFECTS = 120;
const FOOD_CELL = 120;
const EAT_RATIO = 1.15;
const RESPAWN_FRAMES = 90;
const BOT_RETHINK = 18;
const BOARD_SIZE = 5;
const SHY_CHANCE = 0.08;
const SHY_MASS = 5;
const SHY_SPEED = 2.6;
const SHY_FEAR = 110;
const ZONE_MIN = 0.34;
const ZONE_DRAIN = 0.003;
const MINIMAP = 130;
const GROW_LERP = 0.15;
// Curva: no primeiro minuto os robos sao menores que voce e a comida sobra;
// entre 1 e 3 minutos ficam do seu tamanho; depois disso crescem sozinhos e a
// comida rareia, entao o mapa vira briga.
const EASY_MINUTES = 1;
const FAIR_MINUTES = 3;
const EASY_BOT = 0.6;
const BOT_GROWTH = 1.3;
const FOOD_START = 1.3;
const FOOD_END = 0.7;
const BOTS_START = 8;
const SAFE_FRAMES = 180; // tres segundos sem poder ser comido depois de renascer

// Cada robo puxa para um jeito de jogar: muda o quanto enxerga, o quanto
// arrisca atacar e a que distancia comeca a fugir.
const PERSONALITIES = {
  cacador: { name: 'cacador', vision: 620, aggression: 1.1, fear: 1, wander: 0.15 },
  covarde: { name: 'covarde', vision: 520, aggression: 0.15, fear: 1.7, wander: 0.3 },
  camper: { name: 'camper', vision: 320, aggression: 0.5, fear: 1.2, wander: 0.05 },
};
const NAMES = ['Bolha', 'Gota', 'Zeca', 'Pingo', 'Nuvem', 'Tico', 'Lua', 'Vento', 'Faisca', 'Bolota',
  'Pipoca', 'Trovao', 'Sol', 'Neve', 'Areia', 'Cacau', 'Mel', 'Coco', 'Uva', 'Limao'];

// Cada item vira um controle no painel; tudo so vale ao reiniciar.
const SETTINGS = [
  { key: 'viewWidth', label: 'Largura da tela', value: 820, min: 480, max: 1100, step: 20 },
  { key: 'viewHeight', label: 'Altura da tela', value: 580, min: 360, max: 800, step: 20 },
  { key: 'worldSize', label: 'Tamanho do mundo', value: 3000, min: 1200, max: 6000, step: 100 },
  { key: 'foodCount', label: 'Quantidade de comida', value: 700, min: 100, max: 2500, step: 50 },
  { key: 'foodMass', label: 'Massa de cada comida', value: 1, min: 0.2, max: 5, step: 0.2 },
  { key: 'botCount', label: 'Quantidade de robos', value: 15, min: 0, max: 40, step: 1 },
  { key: 'startMass', label: 'Massa inicial', value: 20, min: 5, max: 200, step: 5 },
  { key: 'baseSpeed', label: 'Velocidade base', value: 4.2, min: 1, max: 10, step: 0.2 },
  { key: 'sizePenalty', label: 'Peso do tamanho', value: 0.32, min: 0, max: 0.8, step: 0.02 },
  { key: 'decay', label: 'Perda de massa dos gordos', value: 0.5, min: 0, max: 3, step: 0.1 },
  { key: 'botAggression', label: 'Coragem dos robos', value: 1, min: 0, max: 2, step: 0.1 },
  { key: 'shrinkMinutes', label: 'Minutos ate o mundo fechar', value: 4, min: 0, max: 20, step: 0.5 },
  { key: 'volume', label: 'Volume', value: 0.3, min: 0, max: 1, step: 0.05 },
  { key: 'seed', label: 'Semente', value: 1, min: 1, max: 9999, step: 1 },
];

// `config` e o que a partida usa; `draft` e o que os sliders mostram.
const config = Object.fromEntries(SETTINGS.map((setting) => [setting.key, setting.value]));
const draft = { ...config };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  name: document.getElementById('name'),
  mass: document.getElementById('mass'),
  rank: document.getElementById('rank'),
  best: document.getElementById('best'),
  stats: document.getElementById('stats'),
  over: document.getElementById('over'),
  pause: document.getElementById('pause'),
  restart: document.getElementById('restart'),
  settings: document.getElementById('settings'),
  pending: document.getElementById('pending'),
};

const game = {
  cells: [],
  food: [],
  effects: [],
  player: null,
  frames: 0,
  respawn: 0,
  safe: 0,
  deaths: 0,
  bestMass: 0,
  zone: 0,
  paused: false,
  shake: 0,
  stats: { food: 0, cells: 0, bestMass: 0, frames: 0, firstFrames: 0 },
};

const keys = new Set();
let W = 0;
let H = 0;
let world = 0;

// Sorteio do jogo (mulberry32): mundo, comida e robos saem daqui, entao a mesma
// semente da a mesma partida. Enfeite usa Math.random de proposito.
let rngState = 0;

function seedRandom(seed) {
  rngState = seed >>> 0;
}

function random() {
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const randInt = (max) => Math.floor(random() * max);

const massToRadius = (mass) => Math.sqrt(mass) * 3.6;
const minutos = () => game.frames / 3600;

// Tamanho minimo que um robo tem no momento: e o que faz a pressao crescer.
function pisoDeBot() {
  const m = minutos();
  if (m < EASY_MINUTES) return config.startMass * EASY_BOT;
  if (m < FAIR_MINUTES) return config.startMass;
  return config.startMass * Math.pow(BOT_GROWTH, m - FAIR_MINUTES);
}

function alvoDeComida() {
  const fator = Math.max(FOOD_END, FOOD_START - minutos() * 0.12);
  return Math.round(config.foodCount * fator);
}

function alvoDeRobos() {
  return Math.min(config.botCount, BOTS_START + Math.floor(minutos() * 2));
}

// Quanto maior, mais devagar: e o que da chance para os pequenos fugirem.
function cellSpeed(cell) {
  return Math.max(0.7, config.baseSpeed * Math.pow(config.startMass / cell.mass, config.sizePenalty));
}

function clampToWorld(cell) {
  const r = massToRadius(cell.mass);
  cell.x = Math.min(world - r, Math.max(r, cell.x));
  cell.y = Math.min(world - r, Math.max(r, cell.y));
}

// ------------------------------------------------------------ grade da comida

// Sao centenas de bolinhas: a grade deixa cada celula olhar so as de perto.
const foodGrid = new Map();

function rebuildFoodGrid() {
  foodGrid.clear();
  for (const pellet of game.food) {
    const key = `${Math.floor(pellet.x / FOOD_CELL)},${Math.floor(pellet.y / FOOD_CELL)}`;
    const bucket = foodGrid.get(key);
    if (bucket) {
      bucket.push(pellet);
      continue;
    }
    foodGrid.set(key, [pellet]);
  }
}

function nearbyFood(x, y, radius) {
  const found = [];
  const span = Math.ceil(radius / FOOD_CELL);
  const cx = Math.floor(x / FOOD_CELL);
  const cy = Math.floor(y / FOOD_CELL);
  for (let gx = cx - span; gx <= cx + span; gx++) {
    for (let gy = cy - span; gy <= cy + span; gy++) {
      const bucket = foodGrid.get(`${gx},${gy}`);
      if (!bucket) continue;
      for (const pellet of bucket) found.push(pellet);
    }
  }
  return found;
}

// ------------------------------------------------------------ efeitos

const EFFECTS = {
  ring: {
    step(effect) { effect.r += effect.grow; },
    draw(effect) {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.r, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
  text: {
    step(effect) { effect.y -= 0.7; },
    draw(effect) {
      ctx.fillStyle = effect.color;
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(effect.text, effect.x, effect.y);
    },
  },
};

function addEffect(kind, life, props) {
  if (game.effects.length >= MAX_EFFECTS) return;
  game.effects.push({ kind, life, maxLife: life, ...props });
}

function updateEffects() {
  game.shake *= 0.85;
  if (game.shake < 0.3) game.shake = 0;
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const effect = game.effects[i];
    EFFECTS[effect.kind].step(effect);
    effect.life--;
    if (effect.life <= 0) game.effects.splice(i, 1);
  }
}

// ------------------------------------------------------------ som

// Bipe curto feito na hora: nao precisa de arquivo de audio nenhum. O navegador
// so libera som depois de uma tecla, entao o contexto nasce no primeiro toque.
let audio = null;

function startAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
}

function beep(freq, duration, type, gain) {
  if (!audio || !config.volume) return;
  const osc = audio.createOscillator();
  const vol = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  vol.gain.setValueAtTime(gain * config.volume, audio.currentTime);
  vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  osc.connect(vol).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}

const SOUNDS = {
  food: () => beep(660 + randInt(120), 0.06, 'triangle', 0.12),
  shy: () => beep(1200, 0.12, 'square', 0.1),
  eat: () => beep(300, 0.18, 'sawtooth', 0.16),
  died: () => beep(120, 0.5, 'sawtooth', 0.22),
};

// ------------------------------------------------------------ mundo

function placeFood(pellet) {
  pellet.x = random() * world;
  pellet.y = random() * world;
  pellet.shy = random() < SHY_CHANCE;
  pellet.color = pellet.shy ? '#ffe066' : `hsl(${randInt(360)} 70% 60%)`;
  return pellet;
}

function makeCell(name, isPlayer) {
  const jeitos = Object.keys(PERSONALITIES);
  return {
    name,
    isPlayer,
    personality: isPlayer ? null : jeitos[randInt(jeitos.length)],
    x: random() * world,
    y: random() * world,
    mass: isPlayer ? config.startMass : pisoDeBot(),
    drawMass: config.startMass,
    color: isPlayer ? '#7ad3ff' : `hsl(${randInt(360)} 65% 58%)`,
    aimX: 0,
    aimY: 0,
    think: 0,
  };
}

function respawnCell(cell) {
  cell.mass = cell.isPlayer ? config.startMass : pisoDeBot();
  cell.drawMass = config.startMass;
  cell.x = zoneMin() + random() * (zoneMax() - zoneMin());
  cell.y = zoneMin() + random() * (zoneMax() - zoneMin());
  addEffect('ring', 20, { x: cell.x, y: cell.y, r: 10, grow: 3, color: cell.color });
}

// ------------------------------------------------------------ zona

// O mundo vai fechando: fora da area seseura a massa escorre, o que empurra
// todo mundo para o mesmo pedaco de mapa.
function zoneMargin() {
  if (!config.shrinkMinutes) return 0;
  const total = config.shrinkMinutes * 60 * 60;
  const andamento = Math.min(1, game.frames / total);
  return ((world * (1 - ZONE_MIN)) / 2) * andamento;
}

const zoneMin = () => zoneMargin();
const zoneMax = () => world - zoneMargin();

function outsideZone(cell) {
  return cell.x < zoneMin() || cell.x > zoneMax() || cell.y < zoneMin() || cell.y > zoneMax();
}

function drainOutside() {
  for (const cell of game.cells) {
    if (!outsideZone(cell)) continue;
    cell.mass = Math.max(config.startMass * 0.5, cell.mass * (1 - ZONE_DRAIN));
    if (!cell.isPlayer || game.frames % 30) continue;
    addEffect('text', 24, { x: cell.x, y: cell.y - 20, text: 'volte!', color: '#ff6b81' });
  }
}

// ------------------------------------------------------------ comer

function eatFood(cell) {
  const r = massToRadius(cell.mass);
  for (const pellet of nearbyFood(cell.x, cell.y, r + FOOD_CELL)) {
    if (Math.hypot(pellet.x - cell.x, pellet.y - cell.y) > r) continue;
    const ganho = pellet.shy ? config.foodMass * SHY_MASS : config.foodMass;
    const dourada = pellet.shy;
    cell.mass += ganho;
    placeFood(pellet);
    if (!cell.isPlayer) continue;
    game.stats.food++;
    addEffect('ring', 10, { x: pellet.x, y: pellet.y, r: 4, grow: 1.2, color: dourada ? '#ffe066' : pellet.color });
    if (dourada) SOUNDS.shy();
    if (!dourada) SOUNDS.food();
  }
}

// A comida dourada corre de quem chega perto, por isso vale mais.
function moveShyFood() {
  for (const pellet of game.food) {
    if (!pellet.shy) continue;
    let fx = 0;
    let fy = 0;
    for (const cell of game.cells) {
      const d = Math.hypot(cell.x - pellet.x, cell.y - pellet.y);
      if (d > SHY_FEAR || d < 0.001) continue;
      fx += (pellet.x - cell.x) / d;
      fy += (pellet.y - cell.y) / d;
    }
    const forca = Math.hypot(fx, fy);
    if (forca < 0.001) continue;
    pellet.x = Math.min(world, Math.max(0, pellet.x + (fx / forca) * SHY_SPEED));
    pellet.y = Math.min(world, Math.max(0, pellet.y + (fy / forca) * SHY_SPEED));
  }
}

// Come quem esta atras: precisa ser bem maior e cobrir o centro do outro.
function canEat(eater, prey) {
  if (eater === prey) return false;
  if (prey.isPlayer && game.safe > 0) return false; // acabou de renascer
  if (eater.mass < prey.mass * EAT_RATIO) return false;
  return Math.hypot(eater.x - prey.x, eater.y - prey.y) < massToRadius(eater.mass) - massToRadius(prey.mass) * 0.4;
}

function eatCells() {
  for (const eater of game.cells) {
    for (const prey of game.cells) {
      if (!canEat(eater, prey)) continue;
      eater.mass += prey.mass;
      addEffect('ring', 18, { x: prey.x, y: prey.y, r: massToRadius(prey.mass), grow: 2, color: eater.color });
      if (prey.isPlayer) {
        playerEaten(eater);
        continue;
      }
      if (eater.isPlayer) {
        game.stats.cells++;
        SOUNDS.eat();
      }
      addEffect('text', 26, { x: prey.x, y: prey.y - 12, text: prey.name, color: '#9aa4bf' });
      respawnCell(prey);
    }
  }
}

function playerEaten(eater) {
  game.deaths++;
  game.shake = 16;
  game.respawn = RESPAWN_FRAMES;
  game.safe = SAFE_FRAMES;
  SOUNDS.died();
  addEffect('text', 40, { x: game.player.x, y: game.player.y - 20, text: `comido por ${eater.name}`, color: '#ff6b81' });
  showStats(eater);
  respawnCell(game.player);
  ui.over.hidden = false;
  syncHud();
}

function showStats(eater) {
  const linhas = [
    ['Maior massa', Math.round(game.stats.bestMass)],
    ['Bolinhas comidas', game.stats.food],
    ['Celulas comidas', game.stats.cells],
    ['Tempo vivo', `${Math.floor(game.stats.frames / 60)}s`],
    ['Tempo em primeiro', `${Math.floor(game.stats.firstFrames / 60)}s`],
    ['Comido por', eater.name],
  ];
  ui.stats.replaceChildren();
  for (const [rotulo, valor] of linhas) {
    const item = document.createElement('li');
    item.innerHTML = `${rotulo}: <b>${valor}</b>`;
    ui.stats.append(item);
  }
  game.stats = { food: 0, cells: 0, bestMass: config.startMass, frames: 0, firstFrames: 0 };
}

// ------------------------------------------------------------ movimento

function moveCell(cell, dirX, dirY) {
  const d = Math.hypot(dirX, dirY);
  if (d < 0.001) return;
  const speed = cellSpeed(cell);
  cell.x += (dirX / d) * speed;
  cell.y += (dirY / d) * speed;
  clampToWorld(cell);
}

function movePlayer() {
  if (game.respawn > 0) {
    game.respawn--;
    if (game.respawn === 0) ui.over.hidden = true;
    return;
  }
  const up = keys.has('KeyW') || keys.has('ArrowUp');
  const down = keys.has('KeyS') || keys.has('ArrowDown');
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  moveCell(game.player, (right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
}

// Robo simples: foge de quem pode come-lo, persegue quem ele pode comer e,
// na falta dos dois, vai atras da comida mais perto.
function thinkBot(bot) {
  const jeito = PERSONALITIES[bot.personality] ?? PERSONALITIES.camper;

  // fora da area segura nada mais importa: corre para o meio
  if (outsideZone(bot)) {
    bot.aimX = world / 2 - bot.x;
    bot.aimY = world / 2 - bot.y;
    return;
  }

  let fuga = null;
  let presa = null;
  for (const outro of game.cells) {
    if (outro === bot) continue;
    const d = Math.hypot(outro.x - bot.x, outro.y - bot.y);
    if (d > jeito.vision) continue;
    if (outro.mass > bot.mass * EAT_RATIO && d < jeito.vision * jeito.fear && (!fuga || d < fuga.d)) fuga = { cell: outro, d };
    if (bot.mass > outro.mass * EAT_RATIO && (!presa || d < presa.d)) presa = { cell: outro, d };
  }
  if (fuga) {
    bot.aimX = bot.x - fuga.cell.x;
    bot.aimY = bot.y - fuga.cell.y;
    return;
  }
  if (presa && random() < config.botAggression * jeito.aggression) {
    bot.aimX = presa.cell.x - bot.x;
    bot.aimY = presa.cell.y - bot.y;
    return;
  }
  if (random() < jeito.wander) {
    bot.aimX = (random() - 0.5) * 2;
    bot.aimY = (random() - 0.5) * 2;
    return;
  }
  let alvo = null;
  let melhor = Infinity;
  for (const pellet of nearbyFood(bot.x, bot.y, 400)) {
    const d = Math.hypot(pellet.x - bot.x, pellet.y - bot.y);
    if (d > melhor) continue;
    alvo = pellet;
    melhor = d;
  }
  if (!alvo) {
    bot.aimX = world / 2 - bot.x;
    bot.aimY = world / 2 - bot.y;
    return;
  }
  bot.aimX = alvo.x - bot.x;
  bot.aimY = alvo.y - bot.y;
}

function updateBots() {
  for (const cell of game.cells) {
    if (cell.isPlayer) continue;
    cell.think--;
    if (cell.think <= 0) {
      cell.think = BOT_RETHINK;
      thinkBot(cell);
    }
    moveCell(cell, cell.aimX, cell.aimY);
  }
}

function decayMass() {
  if (!config.decay) return;
  const perda = config.decay / 10000;
  for (const cell of game.cells) {
    if (cell.mass <= config.startMass * 2) continue;
    cell.mass = Math.max(config.startMass, cell.mass * (1 - perda));
  }
}

// ------------------------------------------------------------ partida

function applyLayout() {
  W = config.viewWidth;
  H = config.viewHeight;
  canvas.width = W;
  canvas.height = H;
}

function reset() {
  Object.assign(config, draft);
  seedRandom(config.seed);
  applyLayout();
  world = config.worldSize;

  game.food = [];
  for (let i = 0; i < config.foodCount; i++) game.food.push(placeFood({}));

  game.player = makeCell(playerName(), true);
  game.cells = [game.player];
  for (let i = 0; i < config.botCount; i++) {
    game.cells.push(makeCell(NAMES[i % NAMES.length], false));
  }

  game.effects = [];
  game.frames = 0;
  game.respawn = 0;
  game.safe = 0;
  game.deaths = 0;
  game.bestMass = config.startMass;
  game.zone = 0;
  game.stats = { food: 0, cells: 0, bestMass: config.startMass, frames: 0, firstFrames: 0 };
  game.paused = false;
  game.shake = 0;
  keys.clear();
  ui.over.hidden = true;
  ui.pause.textContent = 'Pausar';
  ui.best.textContent = Math.round(Number(localStorage.getItem(BEST_KEY)) || config.startMass);
  syncHud();
  syncPending();
}

function ranking() {
  return [...game.cells].sort((a, b) => b.mass - a.mass);
}

function saveBest() {
  if (game.player.mass <= game.bestMass) return;
  game.bestMass = game.player.mass;
  const best = Math.max(game.bestMass, Number(localStorage.getItem(BEST_KEY)) || 0);
  localStorage.setItem(BEST_KEY, best);
  ui.best.textContent = Math.round(best);
}

// Ajusta o mundo ao minuto atual: robos crescem, entram mais robos e a comida
// vai sumindo aos poucos.
function seguirCurva() {
  if (game.safe > 0) game.safe--;
  const piso = pisoDeBot();
  for (const cell of game.cells) {
    if (cell.isPlayer || cell.mass >= piso) continue;
    cell.mass = Math.min(piso, cell.mass * 1.004);
  }
  const alvoBots = alvoDeRobos();
  const robos = game.cells.length - 1;
  if (robos < alvoBots) game.cells.push(makeCell(NAMES[robos % NAMES.length], false));
  const alvoComida = alvoDeComida();
  if (game.food.length > alvoComida) game.food.pop();
  if (game.food.length < alvoComida) game.food.push(placeFood({}));
}

function step() {
  seguirCurva();
  rebuildFoodGrid();
  movePlayer();
  updateBots();
  moveShyFood();
  for (const cell of game.cells) eatFood(cell);
  eatCells();
  decayMass();
  drainOutside();
  saveBest();
  updateEffects();

  // o tamanho desenhado corre atras do tamanho real, para a bola crescer
  // suave em vez de pular
  for (const cell of game.cells) cell.drawMass += (cell.mass - cell.drawMass) * GROW_LERP;

  game.stats.frames++;
  game.stats.bestMass = Math.max(game.stats.bestMass, game.player.mass);
  if (ranking()[0] === game.player) game.stats.firstFrames++;
  // HUD so de vez em quando: escrever no DOM todo quadro forca o navegador a
  // recalcular o layout e derruba o jogo pela metade dos quadros
  game.frames++;
  if (game.frames % 6 === 0) syncHud();
}

// ------------------------------------------------------------ desenho

function zoom() {
  return Math.min(1.1, Math.max(0.35, Math.pow(60 / massToRadius(game.player.mass), 0.42)));
}

function drawGrid(camX, camY, scale) {
  const passo = 100;
  ctx.strokeStyle = '#1f2434';
  ctx.lineWidth = 1 / scale;
  const x0 = Math.floor(camX / passo) * passo;
  const x1 = camX + W / scale;
  for (let x = x0; x < x1 + passo; x += passo) {
    ctx.beginPath();
    ctx.moveTo(x, camY);
    ctx.lineTo(x, camY + H / scale);
    ctx.stroke();
  }
  const y0 = Math.floor(camY / passo) * passo;
  const y1 = camY + H / scale;
  for (let y = y0; y < y1 + passo; y += passo) {
    ctx.beginPath();
    ctx.moveTo(camX, y);
    ctx.lineTo(camX + W / scale, y);
    ctx.stroke();
  }
  ctx.strokeStyle = '#38405a';
  ctx.lineWidth = 3 / scale;
  ctx.strokeRect(0, 0, world, world);

  const margem = zoneMargin();
  if (!margem) return;
  ctx.strokeStyle = '#ff6b8188';
  ctx.lineWidth = 4 / scale;
  ctx.strokeRect(margem, margem, world - margem * 2, world - margem * 2);
}

function drawMinimap() {
  const escala = MINIMAP / world;
  const x0 = 12;
  const y0 = H - MINIMAP - 12;
  ctx.fillStyle = '#0d0f16cc';
  ctx.fillRect(x0, y0, MINIMAP, MINIMAP);
  ctx.strokeStyle = '#38405a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, MINIMAP, MINIMAP);

  const margem = zoneMargin() * escala;
  if (margem) {
    ctx.strokeStyle = '#ff6b8188';
    ctx.strokeRect(x0 + margem, y0 + margem, MINIMAP - margem * 2, MINIMAP - margem * 2);
  }

  for (const cell of game.cells) {
    ctx.fillStyle = cell.isPlayer ? '#ffffff' : cell.color;
    const r = Math.max(1.5, massToRadius(cell.mass) * escala);
    ctx.beginPath();
    ctx.arc(x0 + cell.x * escala, y0 + cell.y * escala, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCells(scale) {
  for (const cell of ranking().reverse()) {
    const r = massToRadius(cell.drawMass);
    ctx.fillStyle = cell.color;
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (cell.isPlayer) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
    }
    if (r * scale < 14) continue;
    ctx.fillStyle = '#0d0f16';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(Math.max(10, r * 0.42))}px system-ui, sans-serif`;
    ctx.fillText(cell.name, cell.x, cell.y);
  }
}

function drawBoard() {
  const linhas = ranking().slice(0, BOARD_SIZE);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#0d0f16aa';
  ctx.fillRect(W - 150, 10, 140, 22 + linhas.length * 17);
  ctx.fillStyle = '#e8ecf4';
  ctx.fillText('Maiores', W - 140, 18);
  linhas.forEach((cell, i) => {
    ctx.fillStyle = cell.isPlayer ? '#7ad3ff' : '#9aa4bf';
    ctx.fillText(`${i + 1}. ${cell.name} ${Math.round(cell.mass)}`, W - 140, 38 + i * 17);
  });
}

function draw() {
  const scale = zoom();
  const camX = game.player.x - W / 2 / scale;
  const camY = game.player.y - H / 2 / scale;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  ctx.scale(scale, scale);
  ctx.translate(-camX, -camY);

  drawGrid(camX, camY, scale);

  const margem = 40;
  for (const pellet of game.food) {
    if (pellet.x < camX - margem || pellet.x > camX + W / scale + margem) continue;
    if (pellet.y < camY - margem || pellet.y > camY + H / scale + margem) continue;
    ctx.fillStyle = pellet.color;
    ctx.beginPath();
    ctx.arc(pellet.x, pellet.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCells(scale);

  for (const effect of game.effects) {
    ctx.globalAlpha = effect.life / effect.maxLife;
    EFFECTS[effect.kind].draw(effect);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawBoard();
  drawMinimap();

  if (!game.paused) return;
  ctx.fillStyle = '#e8ecf4';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('PAUSADO', W / 2, H / 2);
}

function loop() {
  if (!game.paused) step();
  draw();
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------ interface

function bumpValue(el, value) {
  const text = String(value);
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('bump');
  void el.offsetWidth; // forca o reflow para a animacao poder recomecar
  el.classList.add('bump');
}

function playerName() {
  return ui.name.value.trim() || 'Você';
}

function syncHud() {
  ui.mass.textContent = Math.round(game.player.mass);
  bumpValue(ui.rank, ranking().indexOf(game.player) + 1);
}

ui.name.value = localStorage.getItem(NAME_KEY) || '';

ui.name.addEventListener('input', () => {
  localStorage.setItem(NAME_KEY, ui.name.value);
  game.player.name = playerName();
});

function togglePause() {
  game.paused = !game.paused;
  ui.pause.textContent = game.paused ? 'Continuar' : 'Pausar';
}

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

document.addEventListener('keydown', (event) => {
  startAudio();
  if (event.code === 'Space') {
    event.preventDefault();
    togglePause();
    return;
  }
  if (!MOVE_KEYS.has(event.code)) return;
  event.preventDefault(); // as setas rolariam a pagina
  keys.add(event.code);
});

document.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

ui.pause.addEventListener('click', togglePause);
ui.restart.addEventListener('click', reset);

// ------------------------------------------------------------ painel

function formatValue(setting) {
  return setting.step < 1 ? draft[setting.key].toFixed(2) : String(draft[setting.key]);
}

function buildPanel() {
  for (const setting of SETTINGS) {
    const row = document.createElement('label');
    const name = document.createElement('span');
    const value = document.createElement('output');
    const input = document.createElement('input');

    name.textContent = setting.label;
    input.type = 'range';
    input.min = setting.min;
    input.max = setting.max;
    input.step = setting.step;
    input.value = draft[setting.key];
    value.textContent = formatValue(setting);

    input.addEventListener('input', () => {
      draft[setting.key] = Number(input.value);
      value.textContent = formatValue(setting);
      syncPending();
    });

    row.append(name, input, value);
    ui.settings.append(row);
    setting.input = input;
  }
}

function syncPending() {
  const pending = SETTINGS.some((setting) => draft[setting.key] !== config[setting.key]);
  ui.pending.hidden = !pending;
  ui.restart.classList.toggle('pending', pending);
}

function restoreDefaults() {
  for (const setting of SETTINGS) {
    setting.input.value = setting.value;
    setting.input.dispatchEvent(new Event('input'));
  }
}

document.getElementById('defaults').addEventListener('click', restoreDefaults);

buildPanel();

// ------------------------------------------------------------ self-check

if (location.hash === '#test') {
  reset();
  console.assert(game.cells.length === config.botCount + 1, 'entram voce e os robos');
  console.assert(game.food.length === config.foodCount, 'a comida toda nasce');
  console.assert(game.player.mass === config.startMass, 'todo mundo comeca com a mesma massa');

  const massaAntes = game.player.mass;
  game.food[0].x = game.player.x;
  game.food[0].y = game.player.y;
  rebuildFoodGrid();
  eatFood(game.player);
  console.assert(game.player.mass === massaAntes + config.foodMass, 'encostar na comida aumenta a massa');
  console.assert(game.food.length === config.foodCount, 'a comida comida reaparece em outro lugar');

  const grande = { name: 'grande', isPlayer: false, x: 500, y: 500, mass: 100, color: '#fff', aimX: 0, aimY: 0, think: 0 };
  const pequeno = { name: 'pequeno', isPlayer: false, x: 500, y: 500, mass: 20, color: '#fff', aimX: 0, aimY: 0, think: 0 };
  const parecido = { name: 'parecido', isPlayer: false, x: 500, y: 500, mass: 95, color: '#fff', aimX: 0, aimY: 0, think: 0 };
  console.assert(canEat(grande, pequeno), 'o maior come o menor quando esta em cima');
  console.assert(!canEat(pequeno, grande), 'o menor nao come o maior');
  console.assert(!canEat(grande, parecido), 'tamanho parecido nao come');
  const longe = { ...pequeno, x: 900 };
  console.assert(!canEat(grande, longe), 'de longe ninguem come ninguem');

  game.cells = [grande, pequeno];
  eatCells();
  console.assert(grande.mass === 120, 'quem come soma a massa do outro');
  console.assert(pequeno.mass === config.startMass, 'quem foi comido volta pequeno');

  console.assert(cellSpeed({ mass: 20 }) > cellSpeed({ mass: 2000 }), 'quanto maior, mais devagar');

  reset();
  const mortesAntes = game.deaths;
  const gordo = { name: 'gordo', isPlayer: false, x: game.player.x, y: game.player.y, mass: 500, color: '#fff', aimX: 0, aimY: 0, think: 0 };
  game.cells = [game.player, gordo];
  game.player.mass = 20;
  eatCells();
  console.assert(game.deaths === mortesAntes + 1, 'ser comido conta uma morte');
  console.assert(game.player.mass === config.startMass, 'voce renasce com a massa inicial');
  console.assert(game.respawn > 0 && !ui.over.hidden, 'aparece o aviso e a espera para voltar');
  for (let i = 0; i < RESPAWN_FRAMES + 1; i++) movePlayer();
  console.assert(ui.over.hidden, 'passado o tempo o aviso some');

  reset();
  const robo = game.cells[1];
  robo.mass = 20;
  robo.x = game.player.x + 100;
  robo.y = game.player.y;
  game.player.mass = 500;
  thinkBot(robo);
  console.assert(robo.aimX > 0, 'o robo foge de quem pode come-lo');
  game.player.mass = 5;
  robo.mass = 500;
  robo.personality = 'cacador'; // o covarde ignoraria a presa de proposito
  config.botAggression = 2;
  thinkBot(robo);
  console.assert(robo.aimX < 0, 'o robo cacador persegue quem ele pode comer');
  robo.personality = 'covarde';
  config.botAggression = 0;
  robo.aimX = 0;
  thinkBot(robo);
  console.assert(robo.aimX >= 0, 'o covarde nao sai atacando');
  config.botAggression = draft.botAggression;

  reset();
  game.player.x = -500;
  game.player.y = world + 500;
  clampToWorld(game.player);
  console.assert(game.player.x >= 0 && game.player.y <= world, 'ninguem sai do mundo');

  reset();
  game.player.x = world / 2;
  game.player.y = world / 2;
  const parado = { x: game.player.x, y: game.player.y };
  movePlayer();
  console.assert(game.player.x === parado.x && game.player.y === parado.y, 'sem tecla apertada ninguem anda');
  keys.add('KeyD');
  movePlayer();
  console.assert(game.player.x > parado.x, 'D anda para a direita');
  keys.delete('KeyD');
  keys.add('ArrowUp');
  const antesDeSubir = game.player.y;
  movePlayer();
  console.assert(game.player.y < antesDeSubir, 'seta para cima sobe');
  keys.add('ArrowLeft');
  const diagonal = { x: game.player.x, y: game.player.y };
  movePlayer();
  const andou = Math.hypot(game.player.x - diagonal.x, game.player.y - diagonal.y);
  console.assert(Math.abs(andou - cellSpeed(game.player)) < 0.001, 'na diagonal a velocidade e a mesma');
  keys.clear();

  reset();
  const dourada = game.food.find((pellet) => pellet.shy);
  console.assert(dourada, 'nasce comida dourada no mapa');
  dourada.x = game.player.x + 40;
  dourada.y = game.player.y;
  const posAntes = { x: dourada.x, y: dourada.y };
  moveShyFood();
  console.assert(dourada.x > posAntes.x, 'a comida dourada foge de quem chega perto');
  const comum = game.food.find((pellet) => !pellet.shy);
  const comumAntes = { x: comum.x, y: comum.y };
  comum.x = game.player.x + 20;
  comum.y = game.player.y;
  moveShyFood();
  console.assert(comum.x === game.player.x + 20, 'a comida comum fica parada');
  comum.x = comumAntes.x;

  const massaAntesDaDourada = game.player.mass;
  dourada.x = game.player.x;
  dourada.y = game.player.y;
  rebuildFoodGrid();
  eatFood(game.player);
  console.assert(game.player.mass === massaAntesDaDourada + config.foodMass * SHY_MASS, 'a dourada vale mais');

  reset();
  console.assert(zoneMargin() === 0, 'no comeco o mundo esta todo aberto');
  game.frames = config.shrinkMinutes * 60 * 60;
  console.assert(zoneMargin() > 0, 'com o tempo o mundo fecha');
  game.player.x = 5;
  game.player.y = 5;
  console.assert(outsideZone(game.player), 'o canto fica fora da area segura');
  const massaNaBorda = game.player.mass;
  drainOutside();
  console.assert(game.player.mass < massaNaBorda, 'fora da area a massa escorre');
  game.player.x = world / 2;
  game.player.y = world / 2;
  const massaNoMeio = game.player.mass;
  drainOutside();
  console.assert(game.player.mass === massaNoMeio, 'no meio nao perde nada');

  reset();
  const jeitos = new Set(game.cells.filter((cell) => !cell.isPlayer).map((cell) => cell.personality));
  console.assert(jeitos.size > 1, 'os robos nao tem todos o mesmo jeito');
  const foraDaZona = game.cells[1];
  game.frames = config.shrinkMinutes * 60 * 60;
  foraDaZona.x = 5;
  foraDaZona.y = 5;
  thinkBot(foraDaZona);
  console.assert(foraDaZona.aimX > 0 && foraDaZona.aimY > 0, 'robo fora da area corre para o meio');

  reset();
  const celula = game.player;
  celula.mass = 400;
  celula.drawMass = 20;
  const desenhoAntes = celula.drawMass;
  step();
  console.assert(celula.drawMass > desenhoAntes && celula.drawMass < celula.mass, 'o tamanho desenhado cresce aos poucos');

  reset();
  game.stats.food = 7;
  game.stats.cells = 2;
  showStats({ name: 'Zeca' });
  console.assert(ui.stats.children.length === 6, 'o resumo mostra todas as linhas');
  console.assert(ui.stats.textContent.includes('Zeca'), 'o resumo diz quem te comeu');
  console.assert(game.stats.food === 0, 'o resumo zera os numeros para a proxima vida');

  const retrato = () => {
    reset();
    return game.food.slice(0, 20).map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join('|');
  };
  const partidaA = retrato();
  console.assert(retrato() === partidaA, 'mesma semente espalha a comida igual');
  const seedInput = SETTINGS.find((setting) => setting.key === 'seed').input;
  seedInput.value = 77;
  seedInput.dispatchEvent(new Event('input'));
  console.assert(retrato() !== partidaA, 'outra semente muda o mapa');
  restoreDefaults();
  console.assert(retrato() === partidaA, 'voltar a semente traz o mesmo mapa');

  // o teste engorda celulas de mentira: nao pode deixar isso virar recorde
  localStorage.removeItem(BEST_KEY);
  reset();
  console.log('self-check ok');
}

reset();
loop();

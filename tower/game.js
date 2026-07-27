const BEST_KEY = 'canyonDefenseBest';
const MAX_EFFECTS = 160;
const SPAWN_GAP = 26;
const TRUNK_ROWS = 6;
const SIDE_CHANCE = 0.5;
const SIDE_MIN = 2;
const SIDE_EXTRA = 5;
const LANE_GAP = 2;
const TESLA_JUMPS = 3;
const TESLA_FALLOFF = 0.7;
const TESLA_CHAIN = 2.5;
const POISON_SECONDS = 3;
const LASER_MAX_CHARGE = 3;
const LASER_CHARGE_STEP = 0.02;
const UPGRADE_STEP = 0.7;
const SELL_RATE = 0.5;
const MAX_LEVEL = 5;
const BEAM_FRAMES = 6;
// Curva: as tres primeiras ondas sao de aprender (poucos e fracos), da 4 a 10
// entra variedade, e da 11 em diante a vida cresce em cima de si mesma.
const EASY_WAVES = 3;
const EASY_HP = 0.6;
const HP_GROWTH_MID = 1.15;
const HP_GROWTH_HARD = 1.2;
const KIND_FROM = { fast: 4, tank: 10 }; // o tower so tem esses tres tipos
const RELIEF_LIVES = 5;   // abaixo disso a proxima onda alivia
const RELIEF_CUT = 0.7;
const RELIEF_EVERY = 3;

// Cada item vira um controle no painel; tudo so vale ao reiniciar.
const SETTINGS = [
  { key: 'gridCols', label: 'Colunas do mapa', value: 30, min: 12, max: 40, step: 1 },
  { key: 'gridRows', label: 'Linhas do mapa', value: 30, min: 12, max: 40, step: 1 },
  { key: 'cellSize', label: 'Tamanho da celula', value: 24, min: 12, max: 48, step: 2 },
  { key: 'entries', label: 'Entradas de inimigo', value: 4, min: 1, max: 4, step: 1 },
  { key: 'rockChance', label: 'Rochas no terreno', value: 0.12, min: 0, max: 0.35, step: 0.01 },
  { key: 'startMoney', label: 'Dinheiro inicial', value: 400, min: 50, max: 2000, step: 10 },
  { key: 'startLives', label: 'Vidas', value: 20, min: 1, max: 50, step: 1 },
  { key: 'enemyHp', label: 'Vida do inimigo (x)', value: 1, min: 0.2, max: 4, step: 0.1 },
  { key: 'enemySpeed', label: 'Velocidade do inimigo (x)', value: 1, min: 0.3, max: 3, step: 0.1 },
  { key: 'bounty', label: 'Premio por morte (x)', value: 1.5, min: 0.2, max: 4, step: 0.1 },
  { key: 'towerCost', label: 'Preco das torres (x)', value: 1, min: 0.2, max: 3, step: 0.1 },
  { key: 'towerDamage', label: 'Dano das torres (x)', value: 1, min: 0.2, max: 4, step: 0.1 },
  { key: 'towerRange', label: 'Alcance das torres (x)', value: 1, min: 0.5, max: 3, step: 0.1 },
  { key: 'towerRate', label: 'Cadencia das torres (x)', value: 1, min: 0.3, max: 4, step: 0.1 },
  { key: 'waveGap', label: 'Segundos entre ondas', value: 3, min: 0, max: 15, step: 0.5 },
  { key: 'seed', label: 'Semente (mapa e ondas)', value: 1, min: 1, max: 9999, step: 1 },
];

// `config` e o que a partida usa; `draft` e o que os sliders mostram.
const config = Object.fromEntries(SETTINGS.map((setting) => [setting.key, setting.value]));
const draft = { ...config };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mapCanvas = document.createElement('canvas');
const mapCtx = mapCanvas.getContext('2d');

const ui = {
  lives: document.getElementById('lives'),
  money: document.getElementById('money'),
  wave: document.getElementById('wave'),
  best: document.getElementById('best'),
  over: document.getElementById('over'),
  finalWave: document.getElementById('finalWave'),
  hint: document.getElementById('hint'),
  shop: document.getElementById('shop'),
  selection: document.getElementById('selection'),
  selName: document.getElementById('selName'),
  upgrade: document.getElementById('upgrade'),
  sell: document.getElementById('sell'),
  pause: document.getElementById('pause'),
  speed: document.getElementById('speed'),
  restart: document.getElementById('restart'),
  settings: document.getElementById('settings'),
  pending: document.getElementById('pending'),
  room: document.getElementById('room'),
  mate: document.getElementById('mate'),
  mateBox: document.getElementById('mateBox'),
  mateMoney: document.getElementById('mateMoney'),
  mateMoney2: document.getElementById('mateMoney2'),
  mateTowers: document.getElementById('mateTowers'),
  mateInfo: document.getElementById('mateInfo'),
  share: document.getElementById('share'),
  feed: document.getElementById('feed'),
};

const euSou = () => (net.role === 'guest' ? 1 : 0);
const souHost = () => net.role !== 'guest';
const emDupla = () => net.peers > 1 && (net.role === 'host' || net.role === 'guest');

const game = {
  routes: [],
  pathCells: new Set(),
  rocks: new Set(),
  base: { col: 0, row: 0 },
  towers: [],
  enemies: [],
  shots: [],
  effects: [],
  queue: [],
  spawnTimer: 0,
  waveTimer: 0,
  wave: 0,
  lastRelief: 0,
  money: [0, 0],
  mateTowers: 0,
  mateCursor: null,
  lives: 0,
  paused: false,
  speed: 1,
  over: false,
  shake: 0,
  build: null,
  selected: null,
  hover: null,
};

let W = 0;
let H = 0;

// Sorteio do jogo (mulberry32): mapa e ondas saem daqui, sempre na mesma ordem,
// entao a mesma semente da a mesma partida. Enfeite usa Math.random de proposito.
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

const cellKey = (col, row) => `${col},${row}`;

function cellCenter(cell) {
  return {
    x: cell.col * config.cellSize + config.cellSize / 2,
    y: cell.row * config.cellSize + config.cellSize / 2,
  };
}

// ---------------------------------------------------------------- efeitos

const EFFECTS = {
  shard: {
    step(effect) {
      effect.x += effect.vx;
      effect.y += effect.vy;
      effect.vy += 0.3;
    },
    draw(effect) {
      ctx.fillStyle = effect.color;
      ctx.fillRect(effect.x - effect.size / 2, effect.y - effect.size / 2, effect.size, effect.size);
    },
  },
  pop: {
    step(effect) { effect.r += effect.grow; },
    draw(effect) {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.r, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
  beam: {
    step() {},
    draw(effect) {
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(effect.x, effect.y);
      ctx.lineTo(effect.tx, effect.ty);
      ctx.stroke();
    },
  },
  text: {
    step(effect) { effect.y -= 0.8; },
    draw(effect) {
      ctx.fillStyle = effect.color;
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(effect.text, effect.x, effect.y);
    },
  },
};

function addEffect(kind, life, props) {
  if (game.effects.length >= MAX_EFFECTS) return;
  game.effects.push({ kind, life, maxLife: life, ...props });
}

function updateEffects() {
  game.shake *= 0.86;
  if (game.shake < 0.3) game.shake = 0;
  for (let i = game.effects.length - 1; i >= 0; i--) {
    const effect = game.effects[i];
    EFFECTS[effect.kind].step(effect);
    effect.life--;
    if (effect.life <= 0) game.effects.splice(i, 1);
  }
}

// ---------------------------------------------------------------- torres

const TOWER_KINDS = {
  gun: {
    name: 'Metralhadora',
    cost: 40,
    damage: 8,
    range: 3.5,
    cooldown: 20,
    color: '#7ad3ff',
    desc: 'tiro rapido, barato',
    fire(tower, from, target) {
      game.shots.push({ x: from.x, y: from.y, target, speed: 9, damage: towerDamage(tower), splash: 0, color: '#cfe9ff', r: 3, owner: tower.owner });
    },
  },
  cannon: {
    name: 'Canhao',
    cost: 90,
    damage: 25,
    range: 4,
    cooldown: 60,
    color: '#ffcf5c',
    desc: 'explode em area',
    splash: 1,
    fire(tower, from, target) {
      game.shots.push({ x: from.x, y: from.y, target, speed: 5, damage: towerDamage(tower), splash: 1, color: '#ffcf5c', r: 5, owner: tower.owner });
    },
  },
  frost: {
    name: 'Gelo',
    cost: 60,
    damage: 3,
    range: 3,
    cooldown: 30,
    color: '#9d8cff',
    desc: 'atrasa quem passa',
    slow: 0.45,
    slowFrames: 60,
    fire(tower, from, target) {
      addEffect('beam', BEAM_FRAMES, { x: from.x, y: from.y, tx: target.x, ty: target.y, color: '#9d8cff' });
      target.slow = TOWER_KINDS.frost.slowFrames;
      damageEnemy(target, towerDamage(tower), tower.owner);
    },
  },
  sniper: {
    name: 'Sniper',
    cost: 120,
    damage: 60,
    range: 8,
    cooldown: 90,
    color: '#e0e6f5',
    desc: 'pesado e longe',
    fire(tower, from, target) {
      game.shots.push({ x: from.x, y: from.y, target, speed: 18, damage: towerDamage(tower), splash: 0, color: '#ffffff', r: 3, owner: tower.owner });
    },
  },
  tesla: {
    name: 'Tesla',
    cost: 110,
    damage: 12,
    range: 3,
    cooldown: 40,
    color: '#5ad1ff',
    desc: 'raio em cadeia',
    fire(tower, from, target) {
      let current = target;
      let damage = towerDamage(tower);
      let origin = from;
      const atingidos = new Set();
      for (let jump = 0; jump < TESLA_JUMPS && current; jump++) {
        addEffect('beam', BEAM_FRAMES, { x: origin.x, y: origin.y, tx: current.x, ty: current.y, color: '#5ad1ff' });
        damageEnemy(current, damage, tower.owner);
        atingidos.add(current);
        origin = current;
        damage *= TESLA_FALLOFF;
        current = nearestEnemy(origin, TESLA_CHAIN * config.cellSize, atingidos);
      }
    },
  },
  poison: {
    name: 'Veneno',
    cost: 80,
    damage: 12,
    range: 3,
    cooldown: 50,
    color: '#b8ff6b',
    desc: 'dano continuo',
    fire(tower, from, target) {
      addEffect('beam', BEAM_FRAMES, { x: from.x, y: from.y, tx: target.x, ty: target.y, color: '#b8ff6b' });
      // nao acumula: reaplicar so renova o tempo
      target.poison = { frames: POISON_SECONDS * 60, perFrame: towerDamage(tower) / 60, owner: tower.owner };
    },
  },
  laser: {
    name: 'Laser',
    cost: 100,
    damage: 1,
    range: 3.5,
    cooldown: 1,
    color: '#ff6bd6',
    desc: 'esquenta no alvo',
    fire(tower, from, target) {
      tower.charge = tower.focus === target ? Math.min(LASER_MAX_CHARGE, tower.charge + LASER_CHARGE_STEP) : 1;
      tower.focus = target;
      addEffect('beam', 2, { x: from.x, y: from.y, tx: target.x, ty: target.y, color: '#ff6bd6' });
      damageEnemy(target, towerDamage(tower) * tower.charge, tower.owner);
    },
  },
};

function nearestEnemy(from, range, skip) {
  let best = null;
  let bestDist = range;
  for (const enemy of game.enemies) {
    if (enemy.dead || skip.has(enemy)) continue;
    const dist = Math.hypot(enemy.x - from.x, enemy.y - from.y);
    if (dist > bestDist) continue;
    best = enemy;
    bestDist = dist;
  }
  return best;
}

function towerDamage(tower) {
  const kind = TOWER_KINDS[tower.kind];
  return kind.damage * (1 + 0.6 * (tower.level - 1)) * config.towerDamage;
}

function towerRange(tower) {
  const kind = TOWER_KINDS[tower.kind];
  return kind.range * (1 + 0.15 * (tower.level - 1)) * config.towerRange * config.cellSize;
}

function towerCost(kind) {
  return Math.round(TOWER_KINDS[kind].cost * config.towerCost);
}

function upgradeCost(tower) {
  return Math.round(towerCost(tower.kind) * UPGRADE_STEP * tower.level);
}

function sellValue(tower) {
  let spent = towerCost(tower.kind);
  for (let level = 1; level < tower.level; level++) spent += Math.round(towerCost(tower.kind) * UPGRADE_STEP * level);
  return Math.round(spent * SELL_RATE);
}

// ---------------------------------------------------------------- inimigos

const ENEMY_KINDS = {
  normal: { name: 'normal', hp: 30, speed: 1, bounty: 4, color: '#7bd88f', size: 0.26 },
  fast: { name: 'rapido', hp: 15, speed: 2, bounty: 5, color: '#ff9f6b', size: 0.2 },
  tank: { name: 'tanque', hp: 90, speed: 0.6, bounty: 9, color: '#e05a6b', size: 0.34 },
};

// Cada tipo entra numa onda combinada: primeiro so o basico, depois o
// corredor e por fim o tanque.
function hpDaOnda(wave) {
  if (wave <= EASY_WAVES) return EASY_HP;
  if (wave <= 10) return Math.pow(HP_GROWTH_MID, wave - EASY_WAVES);
  return Math.pow(HP_GROWTH_MID, 10 - EASY_WAVES) * Math.pow(HP_GROWTH_HARD, wave - 10);
}

function pickEnemyKind(wave) {
  const weights = [
    ['tank', wave >= KIND_FROM.tank ? 0.22 : 0],
    ['fast', wave >= KIND_FROM.fast ? 0.32 : 0],
    ['normal', 1],
  ];
  let roll = random();
  for (const [kind, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return 'normal';
}

function buildWave(wave) {
  const base = wave <= EASY_WAVES ? 4 + wave : 6 + Math.floor(wave * 1.8);
  // rede de seguranca: com pouca vida sobrando, uma onda mais leve de vez em quando
  const alivio = game.lives <= RELIEF_LIVES && wave - game.lastRelief >= RELIEF_EVERY;
  if (alivio) game.lastRelief = wave;
  const count = Math.max(3, Math.round(base * (alivio ? RELIEF_CUT : 1)));
  const list = [];
  for (let i = 0; i < count; i++) list.push(pickEnemyKind(wave));
  return list;
}

function spawnEnemy(kindName) {
  const kind = ENEMY_KINDS[kindName];
  const route = randInt(game.routes.length);
  const start = cellCenter(game.routes[route][0]);
  const hp = Math.round(kind.hp * hpDaOnda(game.wave) * config.enemyHp);
  game.enemies.push({
    kind: kindName,
    route,
    step: 0,
    progress: 0,
    x: start.x,
    y: start.y,
    hp,
    maxHp: hp,
    speed: kind.speed * config.enemySpeed,
    slow: 0,
    poison: null,
    dead: false,
  });
}

function damageEnemy(enemy, amount, dono = 0) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  enemy.flash = 4;
  if (enemy.hp > 0) return;
  enemy.dead = true;
  const kind = ENEMY_KINDS[enemy.kind];
  // premio acompanha a raiz da vida da onda: sem isso a renda fica para tras
  const prize = Math.round((kind.bounty + game.wave) * config.bounty * Math.sqrt(hpDaOnda(game.wave)));
  game.money[dono] += prize;
  addEffect('text', 30, { x: enemy.x, y: enemy.y, text: `+$${prize}`, color: '#7bd88f' });
  for (let i = 0; i < 5; i++) {
    addEffect('shard', 22, {
      x: enemy.x,
      y: enemy.y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 1,
      size: Math.max(3, config.cellSize / 10),
      color: kind.color,
    });
  }
  syncHud();
}

function leakEnemy(enemy) {
  enemy.dead = true;
  game.lives--;
  game.shake = 14;
  addEffect('pop', 16, { x: enemy.x, y: enemy.y, r: config.cellSize / 3, grow: 2, color: '#e05a6b' });
  syncHud();
  if (game.lives <= 0) gameOver();
}

function tickPoison(enemy) {
  if (!enemy.poison) return;
  enemy.poison.frames--;
  damageEnemy(enemy, enemy.poison.perFrame, enemy.poison.owner ?? 0);
  if (enemy.poison.frames > 0) return;
  enemy.poison = null;
}

function moveEnemy(enemy) {
  const route = game.routes[enemy.route];
  const next = route[enemy.step + 1];
  if (!next) {
    leakEnemy(enemy);
    return;
  }
  if (enemy.slow > 0) enemy.slow--;
  const slowFactor = enemy.slow > 0 ? 1 - TOWER_KINDS.frost.slow : 1;
  const speed = enemy.speed * slowFactor * (config.cellSize / 40);
  const target = cellCenter(next);
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= speed) {
    enemy.x = target.x;
    enemy.y = target.y;
    enemy.step++;
    enemy.progress = enemy.step;
    return;
  }
  enemy.x += (dx / dist) * speed;
  enemy.y += (dy / dist) * speed;
  enemy.progress = enemy.step + 1 - dist / config.cellSize;
}

// ---------------------------------------------------------------- mapa

// O braco desce zigue-zagueando dentro da faixa dele, com desvios laterais
// longos, e so vira para o centro na linha de aproximacao: assim os caminhos
// so se encontram no trecho final.
function buildArm(lane, junction) {
  const cells = [{ col: lane.startCol, row: 0 }];
  let col = lane.startCol;
  let row = 0;
  while (row < lane.approachRow) {
    row++;
    cells.push({ col, row });
    if (random() > SIDE_CHANCE) continue;
    const dir = random() < 0.5 ? -1 : 1;
    const steps = SIDE_MIN + randInt(SIDE_EXTRA);
    for (let i = 0; i < steps; i++) {
      const next = col + dir;
      if (next < lane.minCol || next > lane.maxCol) break;
      col = next;
      cells.push({ col, row });
    }
  }
  while (col !== junction.col) {
    col += Math.sign(junction.col - col);
    cells.push({ col, row });
  }
  while (row < junction.row) {
    row++;
    cells.push({ col, row });
  }
  return cells;
}

// Uma faixa de colunas por entrada, com um vao entre elas para os bracos nao
// nascerem colados.
function splitLanes(cols, count) {
  const width = Math.floor((cols - 2) / count);
  const lanes = [];
  for (let i = 0; i < count; i++) {
    const minCol = 1 + i * width;
    const maxCol = i === count - 1 ? cols - 2 : minCol + width - 1 - LANE_GAP;
    lanes.push({ minCol, maxCol: Math.max(minCol, maxCol) });
  }
  return lanes;
}

function buildMap() {
  const cols = config.gridCols;
  const rows = config.gridRows;
  const center = Math.floor(cols / 2);
  const junction = { col: center, row: rows - TRUNK_ROWS };
  const trunk = [];
  for (let row = junction.row + 1; row < rows; row++) trunk.push({ col: center, row });

  const lanes = splitLanes(cols, config.entries);
  game.routes = lanes.map((lane, i) => {
    // cada braco vira para o centro numa linha propria, senao viram uma faixa so
    lane.approachRow = Math.max(1, junction.row - config.entries + i);
    lane.startCol = lane.minCol + randInt(lane.maxCol - lane.minCol + 1);
    return buildArm(lane, junction).concat(trunk);
  });
  game.base = trunk[trunk.length - 1];

  game.pathCells = new Set();
  for (const route of game.routes) {
    for (const cell of route) game.pathCells.add(cellKey(cell.col, cell.row));
  }

  game.rocks = new Set();
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      if (game.pathCells.has(cellKey(col, row))) continue;
      if (random() > config.rockChance) continue;
      game.rocks.add(cellKey(col, row));
    }
  }
}

function towerAt(col, row) {
  return game.towers.find((tower) => tower.col === col && tower.row === row) ?? null;
}

function canBuild(col, row) {
  if (col < 0 || row < 0 || col >= config.gridCols || row >= config.gridRows) return false;
  if (game.pathCells.has(cellKey(col, row))) return false;
  if (game.rocks.has(cellKey(col, row))) return false;
  return !towerAt(col, row);
}

// ---------------------------------------------------------------- partida

function applyLayout() {
  W = config.gridCols * config.cellSize;
  H = config.gridRows * config.cellSize;
  canvas.width = W;
  canvas.height = H;
}

function reset() {
  Object.assign(config, draft);
  seedRandom(config.seed);
  applyLayout();
  game.towers = [];
  game.enemies = [];
  game.shots = [];
  game.effects = [];
  game.queue = [];
  game.spawnTimer = 0;
  game.waveTimer = Math.round(config.waveGap * 60);
  game.wave = 0;
  game.lastRelief = 0;
  game.money = [config.startMoney, config.startMoney];
  game.lives = config.startLives;
  game.paused = false;
  game.speed = 1;
  game.over = false;
  game.shake = 0;
  game.selected = null;
  game.hover = null;
  game.mateCursor = null;
  game.mateTowers = 0;
  ui.feed?.replaceChildren();
  buildMap();
  renderMap();
  ui.over.hidden = true;
  ui.best.textContent = localStorage.getItem(BEST_KEY) || 0;
  ui.pause.textContent = 'Pausar';
  ui.speed.textContent = '2x';
  syncHud();
  syncShop();
  syncSelection();
  syncPending();
}

function gameOver() {
  game.over = true;
  game.shake = 18;
  const best = Math.max(game.wave, Number(localStorage.getItem(BEST_KEY)) || 0);
  localStorage.setItem(BEST_KEY, best);
  ui.best.textContent = best;
  ui.finalWave.textContent = game.wave;
  ui.over.hidden = false;
}

function startWave() {
  game.wave++;
  game.queue = buildWave(game.wave);
  game.spawnTimer = 0;
  syncHud();
}

function updateTower(tower) {
  if (tower.recoil > 0) tower.recoil--;
  tower.cooldown--;
  if (tower.cooldown > 0) return;
  const kind = TOWER_KINDS[tower.kind];
  const range = towerRange(tower);
  const from = cellCenter(tower);
  let best = null;
  for (const enemy of game.enemies) {
    // morto no mesmo quadro por outra torre ainda esta na lista: nao gastar tiro nele
    if (enemy.dead) continue;
    if (Math.hypot(enemy.x - from.x, enemy.y - from.y) > range) continue;
    if (!best || enemy.progress > best.progress) best = enemy;
  }
  if (!best) return;
  tower.angle = Math.atan2(best.y - from.y, best.x - from.x);
  tower.recoil = 5;
  tower.cooldown = Math.max(4, Math.round(kind.cooldown / config.towerRate));
  kind.fire(tower, from, best);
}

function splashDamage(x, y, radius, amount, dono) {
  for (const enemy of game.enemies) {
    if (Math.hypot(enemy.x - x, enemy.y - y) > radius) continue;
    damageEnemy(enemy, amount, dono);
  }
}

function updateShot(shot) {
  if (shot.target.dead) return false;
  const dx = shot.target.x - shot.x;
  const dy = shot.target.y - shot.y;
  const dist = Math.hypot(dx, dy);
  if (dist > shot.speed) {
    shot.x += (dx / dist) * shot.speed;
    shot.y += (dy / dist) * shot.speed;
    return true;
  }
  if (!shot.splash) {
    damageEnemy(shot.target, shot.damage, shot.owner);
    return false;
  }
  const radius = shot.splash * config.cellSize;
  splashDamage(shot.target.x, shot.target.y, radius, shot.damage, shot.owner);
  addEffect('pop', 14, { x: shot.target.x, y: shot.target.y, r: radius * 0.5, grow: radius / 20, color: '#ffcf5c' });
  return false;
}

function step() {
  if (game.over) return;

  if (game.queue.length) {
    game.spawnTimer--;
    if (game.spawnTimer <= 0) {
      spawnEnemy(game.queue.shift());
      game.spawnTimer = SPAWN_GAP;
    }
  }

  if (!game.queue.length && !game.enemies.length) {
    game.waveTimer--;
    if (game.waveTimer <= 0) {
      startWave();
      game.waveTimer = Math.round(config.waveGap * 60);
    }
  }

  for (const enemy of game.enemies) {
    tickPoison(enemy);
    moveEnemy(enemy);
  }
  for (const tower of game.towers) updateTower(tower);
  for (let i = game.shots.length - 1; i >= 0; i--) {
    if (!updateShot(game.shots[i])) game.shots.splice(i, 1);
  }
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    if (game.enemies[i].dead) game.enemies.splice(i, 1);
  }

  updateEffects();
}


// ---------------------------------------------------------------- dupla

const TOWER_LIST = Object.keys(TOWER_KINDS);
const ENEMY_LIST = Object.keys(ENEMY_KINDS);
const FEED_MAX = 6;
const MATE_SEND = 3; // quadros entre um pacote e outro (20 por segundo)

const meuDinheiro = () => game.money[euSou()];
const dinheiroDoParceiro = () => game.money[1 - euSou()];

// O jogo roda na maquina do jogador 1 e vai inteiro para a tela do jogador 2.
// Tower defense aguenta esse atraso: ninguem precisa mirar em milissegundos.
function estadoDaPartida() {
  return {
    t: 'st',
    wave: game.wave,
    lives: game.lives,
    over: game.over,
    paused: game.paused,
    speed: game.speed,
    money: game.money,
    towers: game.towers.map((t) => [t.col, t.row, TOWER_LIST.indexOf(t.kind), t.level, t.owner, Math.round(t.angle * 50), t.recoil]),
    enemies: game.enemies.map((e) => [
      Math.round(e.x), Math.round(e.y), ENEMY_LIST.indexOf(e.kind),
      Math.round((e.hp / e.maxHp) * 100), e.slow > 0 ? 1 : 0, e.poison ? 1 : 0, e.flash,
    ]),
    shots: game.shots.map((s) => [Math.round(s.x), Math.round(s.y), s.splash ? 1 : 0]),
  };
}

function aplicaEstado(msg) {
  game.wave = msg.wave;
  game.lives = msg.lives;
  game.paused = msg.paused;
  game.speed = msg.speed;
  game.money = msg.money;
  game.towers = msg.towers.map(([col, row, kind, level, owner, angle, recoil]) => ({
    col, row, kind: TOWER_LIST[kind], level, owner, angle: angle / 50, recoil, cooldown: 0, focus: null, charge: 1,
  }));
  game.enemies = msg.enemies.map(([x, y, kind, hpPct, slow, poison, flash]) => {
    const base = ENEMY_KINDS[ENEMY_LIST[kind]];
    return {
      x, y, kind: ENEMY_LIST[kind], hp: hpPct, maxHp: 100, r: base.r, color: base.color,
      slow, poison: poison ? {} : null, flash, dead: false,
    };
  });
  game.shots = msg.shots.map(([x, y, splash]) => ({ x, y, r: splash ? 5 : 3, color: splash ? '#ffcf5c' : '#cfe9ff' }));
  if (msg.over && !game.over) gameOver();
  game.over = msg.over;
  ui.pause.textContent = game.paused ? 'Continuar' : 'Pausar';
  ui.speed.textContent = game.speed === 1 ? '2x' : '1x';
  syncHud();
}

function aplicaComando(msg) {
  const dono = 1; // so o convidado manda comando; o dono da maquina age direto
  if (msg.a === 'build') construir(dono, msg.kind, msg.col, msg.row);
  if (msg.a === 'upgrade') melhorar(dono, msg.col, msg.row);
  if (msg.a === 'sell') vender(dono, msg.col, msg.row);
  if (msg.a === 'pause') togglePause();
  if (msg.a === 'speed') toggleSpeed();
}

function anuncia(dono, texto) {
  const quem = dono === euSou() ? 'Voce' : 'Parceiro';
  mostraNoFeed(`${quem} ${texto}`, dono === euSou());
  if (souHost()) netSend({ t: 'log', dono, texto });
}

function mostraNoFeed(texto, meu) {
  const item = document.createElement('li');
  item.textContent = texto;
  item.className = meu ? 'eu' : 'ele';
  ui.feed.prepend(item);
  while (ui.feed.children.length > FEED_MAX) ui.feed.lastElementChild.remove();
}

function syncMate() {
  const junto = emDupla();
  ui.mate.hidden = !junto;
  ui.mateBox.hidden = !junto;
  if (!junto) return;
  const dele = Math.round(dinheiroDoParceiro());
  ui.mateMoney.textContent = dele;
  ui.mateMoney2.textContent = dele;
  ui.mateTowers.textContent = game.towers.filter((t) => t.owner !== euSou()).length;
  desenhaFicha(ui.mateInfo);
}

rival.onChange = () => desenhaFicha(ui.mateInfo);

net.onMessage = (msg) => {
  if (rivalHandles(msg)) return;
  if (msg.t === 'st' && !souHost()) aplicaEstado(msg);
  if (msg.t === 'cmd' && souHost()) aplicaComando(msg);
  if (msg.t === 'cur') game.mateCursor = msg.col === null ? null : { col: msg.col, row: msg.row };
  if (msg.t === 'log' && !souHost()) mostraNoFeed(`${msg.dono === euSou() ? 'Voce' : 'Parceiro'} ${msg.texto}`, msg.dono === euSou());
  if (msg.t === 'setup' && !souHost()) {
    Object.assign(draft, msg.cfg);
    for (const setting of SETTINGS) {
      if (setting.input) setting.input.value = draft[setting.key];
    }
    reset();
  }
};

net.onRole = () => {
  ui.room.textContent = {
    solo: 'sozinho',
    host: net.peers > 1 ? 'em dupla (jogador 1)' : 'esperando o parceiro',
    guest: 'em dupla (jogador 2)',
    full: 'sala cheia',
  }[net.role] ?? '';
  reset();
  if (net.role === 'host' && net.peers > 1) netSend({ t: 'setup', cfg: config });
};

// ---------------------------------------------------------------- desenho

// O terreno nao muda durante a partida: desenho uma vez num canvas de fundo,
// senao seriam 900 retangulos por quadro num mapa 30x30.
function renderMap() {
  const cell = config.cellSize;
  mapCanvas.width = W;
  mapCanvas.height = H;
  mapCtx.textAlign = 'center';
  mapCtx.textBaseline = 'middle';
  for (let col = 0; col < config.gridCols; col++) {
    for (let row = 0; row < config.gridRows; row++) {
      const key = cellKey(col, row);
      mapCtx.fillStyle = game.pathCells.has(key) ? '#5a4a35' : '#1b1f2e';
      mapCtx.fillRect(col * cell + 1, row * cell + 1, cell - 2, cell - 2);
      if (!game.rocks.has(key)) continue;
      mapCtx.fillStyle = '#2a3042';
      mapCtx.fillRect(col * cell + cell * 0.2, row * cell + cell * 0.2, cell * 0.6, cell * 0.6);
    }
  }

  mapCtx.fillStyle = '#c8a26a';
  mapCtx.font = `bold ${Math.round(cell * 0.6)}px system-ui, sans-serif`;
  for (const route of game.routes) {
    const entry = cellCenter(route[0]);
    mapCtx.fillText('↓', entry.x, entry.y);
  }

  const base = cellCenter(game.base);
  mapCtx.fillStyle = '#7ad3ff';
  mapCtx.fillRect(base.x - cell * 0.5, base.y - cell * 0.5, cell, cell);
  mapCtx.fillStyle = '#0d0f16';
  mapCtx.font = `bold ${Math.round(cell * 0.3)}px system-ui, sans-serif`;
  mapCtx.fillText('B', base.x, base.y);
}

function drawTowers() {
  const cell = config.cellSize;
  for (const tower of game.towers) {
    const kind = TOWER_KINDS[tower.kind];
    const center = cellCenter(tower);
    ctx.fillStyle = kind.color;
    ctx.fillRect(center.x - cell * 0.34, center.y - cell * 0.34, cell * 0.68, cell * 0.68);

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(tower.angle);
    ctx.fillStyle = '#0d0f16';
    ctx.fillRect(cell * 0.08 - tower.recoil * 0.6, -cell * 0.09, cell * 0.34, cell * 0.18);
    ctx.restore();

    if (emDupla()) {
      ctx.fillStyle = tower.owner === euSou() ? '#7ad3ff' : '#ffcf5c';
      ctx.fillRect(center.x + cell * 0.16, center.y - cell * 0.34, cell * 0.18, cell * 0.18);
    }

    // nivel como pontinhos: numero pequeno em cima do cano fica ilegivel
    ctx.fillStyle = '#0d0f16';
    for (let level = 0; level < tower.level; level++) {
      ctx.fillRect(center.x - cell * 0.3 + level * cell * 0.12, center.y + cell * 0.2, cell * 0.08, cell * 0.08);
    }
  }
}

function enemyColor(enemy) {
  if (enemy.slow > 0) return TOWER_KINDS.frost.color;
  if (enemy.poison) return TOWER_KINDS.poison.color;
  return ENEMY_KINDS[enemy.kind].color;
}

function drawEnemies() {
  const cell = config.cellSize;
  for (const enemy of game.enemies) {
    const kind = ENEMY_KINDS[enemy.kind];
    ctx.fillStyle = enemyColor(enemy);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, cell * kind.size, 0, Math.PI * 2);
    ctx.fill();

    const barW = cell * 0.7;
    ctx.fillStyle = '#0d0f16';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - cell * 0.5, barW, 3);
    ctx.fillStyle = '#7bd88f';
    ctx.fillRect(enemy.x - barW / 2, enemy.y - cell * 0.5, (barW * enemy.hp) / enemy.maxHp, 3);
  }
}

function drawShots() {
  for (const shot of game.shots) {
    ctx.fillStyle = shot.color;
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRange(cell, range, color) {
  ctx.strokeStyle = color;
  ctx.setLineDash([5, 6]);
  ctx.lineWidth = 1.5;
  const center = cellCenter(cell);
  ctx.beginPath();
  ctx.arc(center.x, center.y, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawMateCursor() {
  if (!game.mateCursor) return;
  const cell = config.cellSize;
  ctx.strokeStyle = '#ffcf5c';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ctx.strokeRect(game.mateCursor.col * cell + 2, game.mateCursor.row * cell + 2, cell - 4, cell - 4);
  ctx.setLineDash([]);
}

function drawCursor() {
  if (game.selected) {
    drawRange(game.selected, towerRange(game.selected), '#ffffff66');
  }
  if (!game.build || !game.hover) return;
  const cell = config.cellSize;
  const ok = canBuild(game.hover.col, game.hover.row) && meuDinheiro() >= towerCost(game.build);
  ctx.strokeStyle = ok ? '#7bd88f' : '#e05a6b';
  ctx.lineWidth = 2;
  ctx.strokeRect(game.hover.col * cell + 2, game.hover.row * cell + 2, cell - 4, cell - 4);
  if (!ok) return;
  drawRange(game.hover, TOWER_KINDS[game.build].range * config.towerRange * cell, '#7bd88f66');
}

function drawEffects() {
  for (const effect of game.effects) {
    ctx.globalAlpha = effect.life / effect.maxLife;
    EFFECTS[effect.kind].draw(effect);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }
  ctx.drawImage(mapCanvas, 0, 0);
  drawMateCursor();
  drawCursor();
  drawTowers();
  drawEnemies();
  drawShots();
  drawEffects();
  ctx.restore();

  if (!game.paused || game.over) return;
  ctx.fillStyle = '#e8ecf4';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('PAUSADO', W / 2, H / 2);
}

let quadro = 0;

function loop() {
  quadro++;
  const steps = game.paused || !souHost() ? 0 : game.speed;
  for (let i = 0; i < steps; i++) step();
  draw();
  if (emDupla() && souHost() && quadro % MATE_SEND === 0) netSend(estadoDaPartida());
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- interface

function bumpValue(el, value) {
  const text = String(value);
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('bump');
  void el.offsetWidth; // forca o reflow para a animacao poder recomecar
  el.classList.add('bump');
}

function syncHud() {
  bumpValue(ui.lives, game.lives);
  bumpValue(ui.wave, game.wave);
  syncMate();
  // o dinheiro muda a cada morte: pulsar aqui vira ruido e atropela o texto ao lado
  ui.money.textContent = Math.round(meuDinheiro());
  // loja e melhoria dependem do dinheiro: sem isso o botao fica travado
  // ate o proximo clique, mesmo com grana entrando das mortes
  syncShop();
  syncSelection();
}

function syncShop() {
  for (const button of ui.shop.children) {
    const kind = button.dataset.kind;
    button.classList.toggle('active', game.build === kind);
    button.disabled = meuDinheiro() < towerCost(kind);
  }
}

function syncSelection() {
  const tower = game.selected;
  ui.selection.hidden = !tower;
  if (!tower) return;
  const kind = TOWER_KINDS[tower.kind];
  ui.selName.textContent = `${kind.name} nivel ${tower.level}`;
  ui.upgrade.textContent = tower.level >= MAX_LEVEL ? 'No maximo' : `Melhorar $${upgradeCost(tower)}`;
  ui.upgrade.disabled = tower.level >= MAX_LEVEL || meuDinheiro() < upgradeCost(tower);
  ui.sell.textContent = `Vender $${sellValue(tower)}`;
}

function buildShop() {
  // do mais fraco para o mais forte: o preco e o resumo do poder da torre
  const ordenadas = Object.entries(TOWER_KINDS).sort((a, b) => a[1].cost - b[1].cost);
  for (const [key, kind] of ordenadas) {
    const button = document.createElement('button');
    button.dataset.kind = key;
    button.innerHTML = `${kind.name}<small>$${kind.cost} · ${kind.desc}</small>`;
    button.addEventListener('click', () => {
      game.build = game.build === key ? null : key;
      game.selected = null;
      syncShop();
      syncSelection();
    });
    ui.shop.append(button);
  }
}

function placeTower(col, row) {
  if (!souHost()) {
    netSend({ t: 'cmd', a: 'build', kind: game.build, col, row });
    return;
  }
  construir(euSou(), game.build, col, row);
}

// Daqui para baixo quem manda e o dono do jogo (o jogador 1): as tres acoes
// recebem quem pediu, para cobrar do bolso certo e avisar o parceiro.
function construir(dono, kind, col, row) {
  const cost = towerCost(kind);
  if (!canBuild(col, row) || game.money[dono] < cost) return;
  game.money[dono] -= cost;
  game.towers.push({ col, row, kind, level: 1, cooldown: 0, angle: -Math.PI / 2, recoil: 0, focus: null, charge: 1, owner: dono });
  addEffect('pop', 12, { ...cellCenter({ col, row }), r: config.cellSize * 0.3, grow: 1.5, color: TOWER_KINDS[kind].color });
  anuncia(dono, `construiu ${TOWER_KINDS[kind].name.toLowerCase()}`);
  syncHud();
}

function upgradeTower() {
  const tower = game.selected;
  if (!souHost()) {
    netSend({ t: 'cmd', a: 'upgrade', col: tower.col, row: tower.row });
    return;
  }
  melhorar(euSou(), tower.col, tower.row);
}

function melhorar(dono, col, row) {
  const tower = towerAt(col, row);
  if (!tower) return;
  const cost = upgradeCost(tower);
  if (tower.level >= MAX_LEVEL || game.money[dono] < cost) return;
  game.money[dono] -= cost;
  tower.level++;
  anuncia(dono, `melhorou ${TOWER_KINDS[tower.kind].name.toLowerCase()} para o nivel ${tower.level}`);
  addEffect('pop', 14, { ...cellCenter(tower), r: config.cellSize * 0.3, grow: 1.5, color: '#7bd88f' });
  syncHud();
}

function sellTower() {
  const tower = game.selected;
  if (!souHost()) {
    netSend({ t: 'cmd', a: 'sell', col: tower.col, row: tower.row });
    game.selected = null;
    syncSelection();
    return;
  }
  vender(euSou(), tower.col, tower.row);
}

function vender(dono, col, row) {
  const tower = towerAt(col, row);
  if (!tower) return;
  game.money[dono] += sellValue(tower);
  game.towers.splice(game.towers.indexOf(tower), 1);
  if (game.selected === tower) game.selected = null;
  anuncia(dono, `vendeu ${TOWER_KINDS[tower.kind].name.toLowerCase()}`);
  syncHud();
}

function cellAt(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    col: Math.floor(((event.clientX - rect.left) * (W / rect.width)) / config.cellSize),
    row: Math.floor(((event.clientY - rect.top) * (H / rect.height)) / config.cellSize),
  };
}

let ultimoCursor = '';

canvas.addEventListener('pointermove', (event) => {
  game.hover = cellAt(event);
  const chave = `${game.hover.col},${game.hover.row}`;
  if (!emDupla() || chave === ultimoCursor) return;
  ultimoCursor = chave;
  netSend({ t: 'cur', col: game.hover.col, row: game.hover.row });
});

canvas.addEventListener('pointerleave', () => {
  game.hover = null;
  if (emDupla()) netSend({ t: 'cur', col: null, row: null });
});

canvas.addEventListener('pointerdown', (event) => {
  if (game.over) return;
  const cell = cellAt(event);
  const existing = towerAt(cell.col, cell.row);
  if (existing) {
    game.selected = existing;
    game.build = null;
    syncShop();
    syncSelection();
    return;
  }
  game.selected = null;
  syncSelection();
  if (game.build) placeTower(cell.col, cell.row);
});

function togglePause() {
  if (!souHost()) {
    netSend({ t: 'cmd', a: 'pause' });
    return;
  }
  game.paused = !game.paused;
  ui.pause.textContent = game.paused ? 'Continuar' : 'Pausar';
}

function toggleSpeed() {
  if (!souHost()) {
    netSend({ t: 'cmd', a: 'speed' });
    return;
  }
  game.speed = game.speed === 1 ? 2 : 1;
  ui.speed.textContent = game.speed === 1 ? '2x' : '1x';
}

document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  togglePause();
});

ui.pause.addEventListener('click', togglePause);
ui.speed.addEventListener('click', toggleSpeed);
ui.upgrade.addEventListener('click', upgradeTower);
ui.sell.addEventListener('click', sellTower);
ui.restart.addEventListener('click', reset);
document.getElementById('again').addEventListener('click', reset);

// ---------------------------------------------------------------- painel

function formatValue(setting) {
  return setting.step < 1 ? draft[setting.key].toFixed(1) : String(draft[setting.key]);
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

ui.share.checked = net.share;
ui.share.addEventListener('change', () => {
  localStorage.setItem('netShare', ui.share.checked ? 'on' : 'off');
  net.share = ui.share.checked;
  net.socket?.close(); // reconecta ja com a escolha nova
  netConnect();
});

buildShop();
buildPanel();

// ---------------------------------------------------------------- self-check

if (location.hash === '#test') {
  reset();

  console.assert(game.routes.length === config.entries, 'tem um caminho por entrada');
  for (const route of game.routes) {
    console.assert(route[0].row === 0, 'cada caminho comeca no topo');
    const last = route[route.length - 1];
    console.assert(last.col === game.base.col && last.row === game.base.row, 'cada caminho termina na base');
    console.assert(route.length > config.gridRows * 1.5, 'o caminho e bem mais longo que uma descida reta');
    for (let i = 1; i < route.length; i++) {
      const passo = Math.abs(route[i].col - route[i - 1].col) + Math.abs(route[i].row - route[i - 1].row);
      console.assert(passo === 1, 'o caminho anda uma celula por vez, sem buraco');
    }
  }
  const entradas = new Set(game.routes.map((route) => route[0].col));
  console.assert(entradas.size === config.entries, 'cada entrada nasce numa coluna diferente');
  const compartilhado = game.routes[0].filter((cell) => {
    const key = cellKey(cell.col, cell.row);
    return game.routes.every((route) => route.some((other) => cellKey(other.col, other.row) === key));
  });
  console.assert(compartilhado.length <= TRUNK_ROWS + 2, 'os caminhos so se juntam no trecho final');

  const trilha = game.routes[0][3];
  console.assert(!canBuild(trilha.col, trilha.row), 'nao da para construir na trilha');
  const livre = { col: 0, row: 0 };
  game.rocks.delete(cellKey(0, 0));
  console.assert(canBuild(livre.col, livre.row) || game.pathCells.has(cellKey(0, 0)), 'terreno livre aceita torre');

  game.money = [1000, 1000];
  game.build = 'gun';
  placeTower(livre.col, livre.row);
  console.assert(game.towers.length === 1, 'a torre e construida');
  console.assert(meuDinheiro() === 1000 - towerCost('gun'), 'construir cobra o preco certo');
  console.assert(!canBuild(livre.col, livre.row), 'celula com torre nao aceita outra');

  game.selected = game.towers[0];
  const antesDaMelhoria = meuDinheiro();
  const custoMelhoria = upgradeCost(game.selected);
  upgradeTower();
  console.assert(game.selected.level === 2, 'melhorar sobe o nivel');
  console.assert(meuDinheiro() === antesDaMelhoria - custoMelhoria, 'melhorar cobra o preco certo');
  console.assert(towerDamage(game.selected) > TOWER_KINDS.gun.damage, 'torre melhorada da mais dano');
  const valorVenda = sellValue(game.selected);
  const antesDaVenda = meuDinheiro();
  sellTower();
  console.assert(!game.towers.length && meuDinheiro() === antesDaVenda + valorVenda, 'vender devolve metade e tira a torre');

  game.enemies = [];
  spawnEnemy('normal');
  const alvo = game.enemies[0];
  alvo.progress = 1;
  spawnEnemy('normal');
  const atras = game.enemies[1];
  atras.x = alvo.x;
  atras.y = alvo.y;
  atras.progress = 0;
  const torre = { col: Math.floor(alvo.x / config.cellSize), row: Math.floor(alvo.y / config.cellSize), kind: 'gun', level: 1, cooldown: 0, angle: 0, recoil: 0 };
  game.towers = [torre];
  game.shots = [];
  updateTower(torre);
  console.assert(game.shots.length === 1, 'a torre atira quando tem alvo no alcance');
  console.assert(game.shots[0].target === alvo, 'a torre mira no inimigo mais adiantado');

  const dinheiroAntes = meuDinheiro();
  damageEnemy(alvo, 9999);
  console.assert(alvo.dead && meuDinheiro() > dinheiroAntes, 'matar paga o premio');
  game.shots = [];
  torre.cooldown = 0;
  updateTower(torre);
  console.assert(game.shots[0]?.target === atras, 'com o primeiro morto a torre troca de alvo');

  // bug do dinheiro: a loja precisa reabrir sozinha quando entra grana
  game.money = [0, 0];
  syncHud();
  const botaoGun = document.querySelector('#shop button[data-kind="gun"]');
  console.assert(botaoGun.disabled, 'sem dinheiro a compra fica travada');
  game.wave = 40; // premio da onda alta cobre o preco da torre
  game.enemies.push({ kind: 'normal', route: 0, step: 0, progress: 0, x: 0, y: 0, hp: 1, maxHp: 1, speed: 1, slow: 0, poison: null, dead: false });
  damageEnemy(game.enemies[game.enemies.length - 1], 5);
  console.assert(meuDinheiro() >= towerCost('gun'), 'matar entrega o premio');
  console.assert(!botaoGun.disabled, 'entrando dinheiro a compra destrava sozinha');

  const ordemLoja = [...document.querySelectorAll('#shop button')].map((b) => TOWER_KINDS[b.dataset.kind].cost);
  console.assert(ordemLoja.every((cost, i) => i === 0 || ordemLoja[i - 1] <= cost), 'a loja vai do mais barato ao mais caro');

  // armas novas
  game.money = [9999, 9999];
  game.enemies = [];
  const perto = [];
  for (let i = 0; i < 3; i++) {
    spawnEnemy('normal');
    const alvo = game.enemies[i];
    alvo.x = 100 + i * config.cellSize;
    alvo.y = 100;
    alvo.hp = 500;
    alvo.maxHp = 500;
    perto.push(alvo);
  }
  const tesla = { col: 4, row: 4, kind: 'tesla', level: 1, cooldown: 0, angle: 0, recoil: 0, focus: null, charge: 1 };
  TOWER_KINDS.tesla.fire(tesla, { x: perto[0].x, y: perto[0].y }, perto[0]);
  console.assert(perto.filter((e) => e.hp < 500).length >= 2, 'o raio da tesla pula para o vizinho');
  console.assert(perto[0].hp < perto[1].hp, 'cada pulo do raio bate menos');

  const alvoVeneno = perto[0];
  const vidaAntesDoVeneno = alvoVeneno.hp;
  TOWER_KINDS.poison.fire({ kind: 'poison', level: 1 }, { x: 0, y: 0 }, alvoVeneno);
  console.assert(alvoVeneno.poison, 'o veneno gruda no inimigo');
  console.assert(alvoVeneno.hp === vidaAntesDoVeneno, 'o veneno nao tira vida na hora');
  for (let i = 0; i < 60; i++) tickPoison(alvoVeneno);
  console.assert(alvoVeneno.hp < vidaAntesDoVeneno, 'o veneno tira vida com o tempo');
  console.assert(enemyColor(alvoVeneno) === TOWER_KINDS.poison.color, 'envenenado muda de cor');

  const laser = { col: 4, row: 4, kind: 'laser', level: 1, cooldown: 0, angle: 0, recoil: 0, focus: null, charge: 1 };
  const alvoLaser = perto[2];
  TOWER_KINDS.laser.fire(laser, { x: 0, y: 0 }, alvoLaser);
  const primeiraCarga = laser.charge;
  for (let i = 0; i < 200; i++) TOWER_KINDS.laser.fire(laser, { x: 0, y: 0 }, alvoLaser);
  console.assert(laser.charge > primeiraCarga, 'o laser esquenta no mesmo alvo');
  console.assert(laser.charge <= LASER_MAX_CHARGE, 'a carga do laser tem teto');
  TOWER_KINDS.laser.fire(laser, { x: 0, y: 0 }, perto[1]);
  console.assert(laser.charge === 1, 'trocar de alvo esfria o laser');

  const sniper = { col: 0, row: 0, kind: 'sniper', level: 1, cooldown: 0, angle: 0, recoil: 0, focus: null, charge: 1 };
  console.assert(towerRange(sniper) > towerRange({ kind: 'gun', level: 1 }), 'o sniper alcanca mais longe que a metralhadora');

  reset();
  game.enemies = [];
  spawnEnemy('normal');
  spawnEnemy('normal');
  const vidasAntes = game.lives;
  const vazado = game.enemies[1];
  vazado.step = game.routes[vazado.route].length - 1;
  moveEnemy(vazado);
  console.assert(game.lives === vidasAntes - 1, 'inimigo que chega na base tira uma vida');

  reset();
  const retrato = () => [
    game.routes.map((r) => r.map((c) => `${c.col},${c.row}`).join('>')).join('#'),
    [...game.rocks].join('|'),
    buildWave(1).join(',') + buildWave(2).join(','),
  ].join('@');
  const partidaA = retrato();
  reset();
  console.assert(retrato() === partidaA, 'mesma semente da o mesmo mapa e as mesmas ondas');
  const seedInput = SETTINGS.find((setting) => setting.key === 'seed').input;
  seedInput.value = 42;
  seedInput.dispatchEvent(new Event('input'));
  reset();
  console.assert(retrato() !== partidaA, 'outra semente da outra partida');
  restoreDefaults();
  reset();
  console.assert(retrato() === partidaA, 'voltar a semente traz a mesma partida');

  // ------- cooperativo
  net.role = 'host';
  net.peers = 2;
  reset();
  game.money = [500, 500];
  const pontoDele = game.routes[0].map((c) => ({ col: c.col + 1, row: c.row })).find((c) => canBuild(c.col, c.row));
  construir(1, 'gun', pontoDele.col, pontoDele.row);
  const minha = towerAt(pontoDele.col, pontoDele.row);
  console.assert(minha && minha.owner === 1, 'a torre guarda quem construiu');
  console.assert(game.money[1] === 500 - towerCost('gun'), 'o preco sai do bolso de quem pediu');
  console.assert(game.money[0] === 500, 'e o bolso do outro nao e tocado');

  melhorar(0, pontoDele.col, pontoDele.row);
  console.assert(minha.level === 2, 'qualquer um pode melhorar a torre do outro');
  console.assert(game.money[0] < 500, 'quem melhorou e quem paga');

  game.enemies = [];
  spawnEnemy('normal');
  const vitima = game.enemies[0];
  const caixaAntes = [...game.money];
  damageEnemy(vitima, 9999, 1);
  console.assert(game.money[1] > caixaAntes[1] && game.money[0] === caixaAntes[0], 'o premio vai para o dono da torre que matou');

  const pacote = estadoDaPartida();
  console.assert(pacote.towers.length === game.towers.length, 'o estado leva as torres');
  console.assert(pacote.money.length === 2, 'o estado leva os dois bolsos');
  net.role = 'guest';
  game.towers = [];
  game.wave = 0;
  game.lastRelief = 0;
  aplicaEstado(pacote);
  console.assert(game.towers.length === 1 && game.towers[0].owner === 1, 'o parceiro recebe as torres com o dono certo');
  console.assert(game.towers[0].kind === 'gun', 'e com o tipo certo');

  const pedidos = [];
  const guardaEnvio = netSend;
  netSend = (m) => pedidos.push(m);
  placeTower(pontoDele.col + 2, pontoDele.row);
  console.assert(pedidos[0]?.a === 'build', 'o jogador 2 nao constroi sozinho: ele pede');
  netSend = guardaEnvio;

  net.role = 'host';
  const antesDoComando = game.towers.length;
  const vaga = game.routes[0].map((c) => ({ col: c.col - 1, row: c.row })).find((c) => canBuild(c.col, c.row));
  game.money = [500, 500];
  aplicaComando({ a: 'build', kind: 'frost', col: vaga.col, row: vaga.row });
  console.assert(game.towers.length === antesDoComando + 1, 'o pedido do parceiro vira torre de verdade');
  console.assert(towerAt(vaga.col, vaga.row).owner === 1, 'e a torre fica no nome dele');
  console.assert(ui.feed.children.length > 0, 'as acoes aparecem no aviso lateral');

  net.role = 'solo';
  net.peers = 1;
  reset();
  console.assert(ui.mate.hidden, 'sozinho o quadro do parceiro some');
  console.log('self-check ok');
}


// ---------------------------------------------------------------- medicao

// Bot que joga sozinho para medir a curva: constroi onde a passagem e mais
// usada, melhora quando sobra dinheiro, e com `erro` alto escolhe lugar ruim.
const BENCH_STEPS = 60 * 60 * 25; // teto de 25 minutos de jogo por partida

function vagasBoas() {
  const nota = new Map();
  for (const rota of game.routes) {
    for (const cel of rota) {
      for (let dc = -2; dc <= 2; dc++) {
        for (let dr = -2; dr <= 2; dr++) {
          const col = cel.col + dc;
          const row = cel.row + dr;
          if (!canBuild(col, row)) continue;
          const chave = cellKey(col, row);
          nota.set(chave, (nota.get(chave) ?? 0) + 1);
        }
      }
    }
  }
  return [...nota.entries()].sort((a, b) => b[1] - a[1]).map(([chave]) => chave.split(',').map(Number));
}

function botJoga(erro) {
  const vagas = vagasBoas();
  if (!vagas.length) return;
  const escolha = Math.random() < erro
    ? vagas[Math.floor(Math.random() * vagas.length)]
    : vagas[0];
  const tipos = ['gun', 'frost', 'cannon', 'sniper', 'tesla'];
  for (const tipo of tipos) {
    if (game.money[0] < towerCost(tipo)) continue;
    construir(0, tipo, escolha[0], escolha[1]);
    return;
  }
  // sem dinheiro para torre nova: melhora alguma
  const melhoravel = game.towers.find((t) => t.level < MAX_LEVEL && game.money[0] >= upgradeCost(t));
  if (melhoravel) melhorar(0, melhoravel.col, melhoravel.row);
}

function jogaPartida(semente, erro) {
  draft.seed = semente;
  reset();
  let quadros = 0;
  while (!game.over && quadros < BENCH_STEPS) {
    step();
    quadros++;
    if (quadros % 60 === 0) botJoga(erro);
  }
  return { onda: game.wave, minutos: quadros / 3600, torres: game.towers.length };
}

function bench(partidas = 20, erro = 0.15) {
  const ondas = [];
  const minutos = [];
  const inicio = performance.now();
  for (let i = 0; i < partidas; i++) {
    const r = jogaPartida(i + 1, erro);
    ondas.push(r.onda);
    minutos.push(r.minutos);
  }
  ondas.sort((a, b) => a - b);
  minutos.sort((a, b) => a - b);
  const conta = {};
  for (const o of ondas) conta[o] = (conta[o] ?? 0) + 1;
  const muro = Object.entries(conta).sort((a, b) => b[1] - a[1])[0];
  return {
    partidas,
    erro,
    pior: ondas[0],
    mediana: ondas[Math.floor(partidas / 2)],
    melhor: ondas[ondas.length - 1],
    minutosMediano: Math.round(minutos[Math.floor(partidas / 2)] * 10) / 10,
    ondaQueMaisMata: `${muro[0]} (${Math.round((muro[1] / partidas) * 100)}%)`,
    segundos: Math.round(performance.now() - inicio) / 1000,
  };
}

if (location.hash.startsWith('#bench')) {
  const [, partidas = 20, erro = 0.15] = location.hash.split(/[=,]/).map(Number);
  console.log(JSON.stringify(bench(partidas || 20, Number.isFinite(erro) ? erro : 0.15)));
}

reset();
loop();

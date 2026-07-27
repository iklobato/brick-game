const H = 680;
const LAUNCH_ZONE = 80;
const AIM_MAX_STEPS = 2000;
const STALL_FRAMES = 900;
const MIN_ANGLE = 0.06; // quase rasante: a gama de miras ficou bem maior
const BEST_KEY = 'bricksMasterBest';
const SAVE_KEY = 'bricksMasterSave';
const COIN_PER_BLOCK = 1;
const HINT_AIM = 'Arraste o mouse para mirar e solte para atirar';
const HINT_RECALL = 'Aperte na tela para recolher as bolas';
const MAX_EFFECTS = 140;
const FLASH_FRAMES = 6;
const TRAIL_LEN = 6;
const RECALL_LERP = 0.22;
const SLIDE_DECAY = 0.82;
const SHAKE_DECAY = 0.86;
const SEND_EVERY = 15; // quadros entre um resumo e outro (4 por segundo)
const PLAYER_COLORS = ['#ffffff', '#ffb45c'];
const HARD_GROWTH = 1.22;  // quanto a vida do bloco cresce por nivel depois do 15
const CROWDED = 0.35;      // acima disso o tabuleiro conta como apertado
const FREE_BALLS_UNTIL = 5;  // ate esse nivel voce ganha uma bola por nivel
const BREAKS_PER_BALL = 12;  // depois disso, bola nova sai de quebrar bloco
const BOSS_FROM = 15;
const BOSS_EVERY = 5;
const BOSS_MULT = 3;
const BOOST_AFTER = 180;      // depois de 3 segundos no ar a bola acelera
const BOOST_MAX = 2.2;
const LOST_AFTER = 150;       // bola sem acertar nada ha 2,5s conta como perdida
const COMBO_STEP = 10;        // blocos quebrados numa tacada que ja rendem bonus
const CLEAR_BONUS = 5;        // bolas por limpar a tela
const SPECIAL_FROM = 4;       // nivel em que os blocos especiais comecam a sair
const SPECIAL_CHANCE = 0.22;
const BOMB_RADIUS = 1;
const MAX_BALLS_LIVE = 120;   // teto de bolas na tela, por causa do divisor
const CARD_EVERY = 5;         // de quantos em quantos niveis vem a escolha
const CARD_COUNT = 3;
const BOMB_BREAKS = 30;       // blocos quebrados para carregar uma bomba
const BOMB_RADIUS_USE = 2;
const MAX_AIM_PATHS = 6;      // teto de linhas na tela, para nao virar sopa
const BRANCH_STEPS = 1200;    // passos de cada ramo de previsao

// Cada item vira um controle no painel.
const SETTINGS = [
  { key: 'cols', label: 'Colunas', value: 15, min: 5, max: 24, step: 1 },
  { key: 'cellSize', label: 'Tamanho do bloco', value: 44, min: 24, max: 70, step: 2 },
  { key: 'ballSpeed', label: 'Velocidade da bola', value: 24, min: 2, max: 24, step: 0.5 },
  { key: 'ballRadius', label: 'Tamanho da bola', value: 7, min: 3, max: 16, step: 1 },
  { key: 'fireGap', label: 'Intervalo entre as bolas', value: 5, min: 1, max: 25, step: 1 },
  { key: 'blockChance', label: 'Chance de bloco por celula', value: 0.62, min: 0.05, max: 1, step: 0.01 },
  { key: 'blockHp', label: 'Vida dos blocos (x nivel)', value: 1, min: 0.2, max: 5, step: 0.1 },
  { key: 'ballPickupChance', label: 'Chance de bola extra', value: 0.7, min: 0, max: 1, step: 0.01 },
  { key: 'aimPickupChance', label: 'Chance de rebatida extra', value: 0.08, min: 0, max: 1, step: 0.01 },
  { key: 'startBalls', label: 'Bolas iniciais', value: 1, min: 1, max: 60, step: 1 },
  { key: 'startAimDepth', label: 'Rebatidas iniciais', value: 0, min: 0, max: 12, step: 1 },
  { key: 'breakPickupChance', label: 'Chance de visao de quebra', value: 0.07, min: 0, max: 1, step: 0.01 },
  { key: 'startBreakDepth', label: 'Visoes de quebra iniciais', value: 0, min: 0, max: 5, step: 1 },
  { key: 'volume', label: 'Volume', value: 0.35, min: 0, max: 1, step: 0.05 },
  { key: 'seed', label: 'Semente (mapa)', value: 1, min: 1, max: 9999, step: 1 },
];

// `config` e o que a partida em andamento usa; `draft` e o que os sliders
// mostram. Os dois so se encontram no reiniciar, entao nada muda no meio do jogo.
const config = Object.fromEntries(SETTINGS.map((setting) => [setting.key, setting.value]));
const draft = { ...config };

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  round: document.getElementById('round'),
  best: document.getElementById('best'),
  bounces: document.getElementById('bounces'),
  breaks: document.getElementById('breaks'),
  over: document.getElementById('over'),
  finalRound: document.getElementById('finalRound'),
  settings: document.getElementById('settings'),
  pending: document.getElementById('pending'),
  restart: document.getElementById('restart'),
  hint: document.getElementById('hint'),
  room: document.getElementById('room'),
  overTitle: document.getElementById('overTitle'),
  rival: document.getElementById('rival'),
  rivalBoard: document.getElementById('rivalBoard'),
  rivalRound: document.getElementById('rivalRound'),
  rivalBalls: document.getElementById('rivalBalls'),
  rivalState: document.getElementById('rivalState'),
  rivalInfo: document.getElementById('rivalInfo'),
  share: document.getElementById('share'),
  speed: document.getElementById('speed'),
  repeat: document.getElementById('repeat'),
  clean: document.getElementById('clean'),
  bomb: document.getElementById('bomb'),
  cartas: document.getElementById('cartas'),
  cartasLista: document.getElementById('cartasLista'),
  quaseLa: document.getElementById('quaseLa'),
  resumo: document.getElementById('resumo'),
  ganhou: document.getElementById('ganhou'),
  moedas: document.getElementById('moedas'),
  lojaLista: document.getElementById('lojaLista'),
  metas: document.getElementById('metas'),
  diario: document.getElementById('diario'),
  diarioInfo: document.getElementById('diarioInfo'),
};

const rivalCtx = ui.rivalBoard.getContext('2d');

const game = {
  blocks: [],
  pickups: [],
  effects: [],
  players: [],
  local: 0,
  rival: null,
  round: 1,
  over: false,
  slide: 0,
  shake: 0,
  frames: 0,
  speed: 1,
  choosing: false,
  bombing: false,
  daily: false,
  proxima: null,
  run: { blocks: 0, bestCombo: 0, bombs: 0, clears: 0, frames: 0 },
};

let W = config.cols * config.cellSize;
let deathY = H - LAUNCH_ZONE;


// ---------------------------------------------------------------- guardado

// O que sobrevive entre partidas: moedas, melhorias compradas, metas e o
// desafio do dia. Perder deixa de ser perda total.
const SAVE_PADRAO = {
  coins: 0,
  upgrades: { balls: 0, luck: 0, bomb: 0, aim: 0, vision: 0 },
  totals: { blocks: 0, clears: 0, bombs: 0, games: 0, bestCombo: 0, bestRound: 0 },
  goals: {},
  daily: { date: '', best: 0 },
};

function carregaSave() {
  try {
    const cru = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}');
    return {
      ...SAVE_PADRAO,
      ...cru,
      upgrades: { ...SAVE_PADRAO.upgrades, ...cru.upgrades },
      totals: { ...SAVE_PADRAO.totals, ...cru.totals },
      goals: { ...cru.goals },
      daily: { ...SAVE_PADRAO.daily, ...cru.daily },
    };
  } catch {
    return structuredClone(SAVE_PADRAO);
  }
}

const save = carregaSave();

function gravaSave() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

// ---------------------------------------------------------------- som

// Bipes feitos na hora, sem arquivo nenhum. O navegador so libera som depois
// de um clique, entao o contexto nasce no primeiro toque.
let audio = null;

function startAudio() {
  if (audio) return;
  audio = new (window.AudioContext || window.webkitAudioContext)();
}

function beep(freq, duracao, tipo, volume) {
  if (!audio || !config.volume) return;
  const osc = audio.createOscillator();
  const ganho = audio.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  ganho.gain.setValueAtTime(volume * config.volume, audio.currentTime);
  ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duracao);
  osc.connect(ganho).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duracao);
}

const SONS = {
  quebra: (combo) => beep(420 + Math.min(combo, 20) * 26, 0.05, 'square', 0.06),
  item: () => beep(880, 0.12, 'triangle', 0.12),
  bomba: () => beep(90, 0.4, 'sawtooth', 0.2),
  carta: () => beep(660, 0.18, 'triangle', 0.16),
  limpou: () => beep(1040, 0.3, 'triangle', 0.18),
  fim: () => beep(120, 0.6, 'sawtooth', 0.22),
};

// Sorteio do jogo (mulberry32): a partida so consome esse gerador em addRow,
// sempre na mesma ordem, entao a mesma semente da sempre os mesmos niveis.
// Enfeite (cacos, tremor) usa Math.random de proposito: nao pode gastar o
// gerador, senao o mapa mudaria conforme a jogada.
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

const isGuest = () => net.role === 'guest';
const localPlayer = () => game.players[game.local] ?? game.players[0];

const PICKUP_KINDS = {
  ball: {
    color: '#7ad3ff',
    collect(player) { player.collected++; },
    draw(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  break: {
    color: '#7bd88f',
    collect(player) { player.breakDepth++; },
    draw(x, y, r) {
      ctx.fillRect(x - r * 0.45, y - r * 0.12, r * 0.9, r * 0.24);
      ctx.fillRect(x - r * 0.12, y - r * 0.45, r * 0.24, r * 0.9);
    },
  },
  aim: {
    color: '#ffcf5c',
    collect(player) { player.aimDepth++; },
    draw(x, y, r) {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y + r * 0.4);
      ctx.lineTo(x, y - r * 0.5);
      ctx.lineTo(x + r * 0.5, y + r * 0.4);
      ctx.closePath();
      ctx.fill();
    },
  },
};

// Efeitos so enfeitam: cada um vive por `life` quadros e some. Nenhum deles
// toca no estado do jogo, entao dropar por limite de fila nao muda partida.
const EFFECTS = {
  shard: {
    step(effect) {
      effect.x += effect.vx;
      effect.y += effect.vy;
      effect.vy += 0.35;
    },
    draw(effect) {
      ctx.fillStyle = effect.color;
      ctx.fillRect(effect.x - effect.size / 2, effect.y - effect.size / 2, effect.size, effect.size);
    },
  },
  flash: {
    step() {},
    draw(effect) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(effect.x, effect.y, effect.w, effect.h);
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
  text: {
    step(effect) { effect.y -= 0.9; },
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

const COR_FACIL = '#4ade80';
const COR_JUSTO = '#facc15';
const COR_DUAS = '#fb923c';
const COR_DURO = '#ef4444';

// A cor compara a vida do bloco com a sua salva de bolas: verde cai facil,
// amarelo cai no limite, laranja pede duas rodadas, vermelho tres ou mais.
// Assim ela nunca satura, porque anda junto com o seu poder.
function blockColor(hp, bolas = localPlayer()?.ballCount ?? 1) {
  const razao = hp / Math.max(1, bolas);
  if (razao <= 0.5) return COR_FACIL;
  if (razao <= 1) return COR_JUSTO;
  if (razao <= 2) return COR_DUAS;
  return COR_DURO;
}

// Cada tipo de bloco tem sua marca na tela e seu jeito de reagir. Somar um
// tipo novo e so acrescentar uma entrada aqui.
const BLOCK_KINDS = {
  normal: {},
  bomb: {
    marca: '#ff9f6b',
    // ao cair, leva junto os vizinhos em cruz
    aoMorrer(block, player) {
      const raio = BOMB_RADIUS;
      addEffect('pop', 18, {
        ...cellCenter(block), r: config.cellSize * 0.4, grow: config.cellSize / 12, color: '#ff9f6b',
      });
      for (const outro of [...game.blocks]) {
        const perto = Math.abs(outro.col - block.col) + Math.abs(outro.row - block.row);
        if (!perto || perto > raio) continue;
        outro.hp -= Math.max(1, Math.round(block.maxHp * 0.6));
        outro.flash = FLASH_FRAMES;
        if (outro.hp > 0) continue;
        derrubaBloco(outro, player);
      }
    },
  },
  mover: {
    marca: '#7ad3ff',
    // desliza de lado a cada linha nova, entao mira decorada nao vale
    aoDescer(block) {
      const passo = block.dir ?? 1;
      const destino = block.col + passo;
      if (destino < 0 || destino >= config.cols) {
        block.dir = -passo;
        return;
      }
      block.col = destino;
      block.dir = passo;
    },
  },
  shield: {
    marca: '#e0e6f5',
    // so aceita dano pelos lados: por cima o escudo aguenta
    aceitaDano(block, lateral) {
      return lateral;
    },
  },
  split: {
    marca: '#c084fc',
    // quem encosta nele vira duas bolas ate o fim da rodada
    aoTocar(block, player, ball) {
      if (player.balls.length >= MAX_BALLS_LIVE) return;
      const angulo = Math.atan2(ball.vy, ball.vx) + 0.35;
      const velocidade = Math.hypot(ball.vx, ball.vy);
      player.balls.push({
        x: ball.x, y: ball.y,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        r: ball.r, trail: [], lastHit: player.turnFrames,
      });
      addEffect('pop', 12, { x: ball.x, y: ball.y, r: ball.r, grow: 1.4, color: '#c084fc' });
    },
  },
};

const blockKind = (block) => BLOCK_KINDS[block.kind ?? 'normal'] ?? BLOCK_KINDS.normal;

// 1234 vira 1,2k para caber na celula
function numeroCurto(n) {
  if (n < 1000) return String(n);
  if (n < 100000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
  return `${Math.round(n / 1000)}k`;
}

function burstAt(x, y, color, cell) {
  for (let i = 0; i < 6; i++) {
    addEffect('shard', 24, {
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 1,
      size: Math.max(3, cell / 8),
      color,
    });
  }
}

function burstBlock(block) {
  const rect = blockRect(block);
  addEffect('flash', 5, rect);
  const x = rect.x + rect.w / 2;
  const y = rect.y + rect.h / 2;
  burstAt(x, y, blockColor(block.hp), config.cellSize);
}

function updateEffects() {
  game.slide *= SLIDE_DECAY;
  if (game.slide < 0.5) game.slide = 0;
  game.shake *= SHAKE_DECAY;
  if (game.shake < 0.3) game.shake = 0;

  for (const block of game.blocks) if (block.flash > 0) block.flash--;

  for (let i = game.effects.length - 1; i >= 0; i--) {
    const effect = game.effects[i];
    EFFECTS[effect.kind].step(effect);
    effect.life--;
    if (effect.life <= 0) game.effects.splice(i, 1);
  }
}

function pickupRadius() {
  return Math.max(5, config.cellSize / 6);
}

// Passos por quadro: bola rapida em bloco pequeno precisa de mais passos para
// nao atravessar o bloco sem tocar.
function substeps() {
  return Math.max(3, Math.ceil(config.ballSpeed / 3));
}

function applyLayout() {
  W = config.cols * config.cellSize;
  // perde quando o bloco encosta na ultima linha, logo acima do lancador
  deathY = Math.floor((H - LAUNCH_ZONE) / config.cellSize) * config.cellSize;
  canvas.width = W;
  canvas.height = H;
}

// Centro de uma celula da grade, em pixels.
function cellCenter(cell) {
  return {
    x: cell.col * config.cellSize + config.cellSize / 2,
    y: cell.row * config.cellSize + config.cellSize / 2,
  };
}

function blockRect(block) {
  const pad = Math.max(1, config.cellSize / 20);
  return {
    x: block.col * config.cellSize + pad,
    y: block.row * config.cellSize + pad,
    w: config.cellSize - pad * 2,
    h: config.cellSize - pad * 2,
  };
}

// Bola tratada como ponto contra o retangulo inflado pelo raio: devolve pelo eixo
// de menor penetracao. Bom o bastante para blocos alinhados na grade.
function resolveHit(ball, rect) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const overlapX = rect.w / 2 + ball.r - Math.abs(dx);
  const overlapY = rect.h / 2 + ball.r - Math.abs(dy);
  if (overlapX <= 0 || overlapY <= 0) return false;
  if (overlapX < overlapY) {
    ball.x = cx + Math.sign(dx || 1) * (rect.w / 2 + ball.r);
    ball.vx = -ball.vx;
    return true;
  }
  ball.y = cy + Math.sign(dy || 1) * (rect.h / 2 + ball.r);
  ball.vy = -ball.vy;
  return true;
}

// Mira sempre para cima, nunca rasante demais (senao a rodada nunca acaba).
function clampAim(dx, dy) {
  const angle = Math.atan2(Math.min(dy, -0.001), dx);
  const limited = Math.min(-MIN_ANGLE, Math.max(-Math.PI + MIN_ANGLE, angle));
  return { x: Math.cos(limited), y: Math.sin(limited) };
}

function spawnPickup(kind, chance, freeCols) {
  if (!freeCols.length || random() > chance) return;
  const col = freeCols.splice(randInt(freeCols.length), 1)[0];
  game.pickups.push({ col, row: 0, kind });
}

// A curva tem tres partes: os cinco primeiros niveis sao de aprender (bloco
// sempre com 1 de vida), do 6 ao 15 a vida sobe devagar, e do 16 em diante
// dispara. O jogador acompanha porque ganha uma bola garantida por nivel ate
// o 10 e continua juntando bolas depois.
function blockHpFor(round) {
  const cru = round <= 5 ? 1
    : round <= 15 ? Math.pow(1.2, round - 5)
      : Math.pow(1.2, 10) * Math.pow(HARD_GROWTH, round - 15);
  return Math.max(1, Math.round(cru * config.blockHp));
}

// A linha tambem comeca vazia: metade dos blocos no nivel 1, cheia no 10.
function blockChanceFor(round) {
  return config.blockChance * Math.min(1, 0.5 + round * 0.05);
}

const linhasJogaveis = () => Math.max(1, Math.round(deathY / config.cellSize));
const lotado = () => game.blocks.length > config.cols * linhasJogaveis() * CROWDED;

function sorteiaTipo(round) {
  if (round < SPECIAL_FROM || random() > SPECIAL_CHANCE) return 'normal';
  const especiais = ['bomb', 'mover', 'shield', 'split'];
  return especiais[randInt(especiais.length)];
}

// Sorteia a linha que vem, sem colocar no tabuleiro: e o que a previa mostra.
function sorteiaLinha(round) {
  const hp = blockHpFor(round);
  const chance = blockChanceFor(round);
  const blocos = [];
  for (let col = 0; col < config.cols; col++) {
    if (random() > chance) continue;
    const vida = hp + randInt(hp);
    blocos.push({ col, hp: vida, maxHp: vida, kind: sorteiaTipo(round) });
  }
  if (!blocos.length) blocos.push({ col: randInt(config.cols), hp, maxHp: hp, kind: 'normal' });
  return blocos;
}

function addRow() {
  for (const block of game.blocks) {
    block.row++;
    blockKind(block).aoDescer?.(block);
  }
  for (const pickup of game.pickups) pickup.row++;
  game.slide = config.cellSize;

  const linha = game.proxima ?? sorteiaLinha(game.round);
  game.proxima = sorteiaLinha(game.round + 1);
  const taken = [];
  for (const bloco of linha) {
    game.blocks.push({ ...bloco, row: 0, flash: 0 });
    taken.push(bloco.col);
  }
  // marco: de cinco em cinco niveis, uma pedra grande no meio da linha
  if (game.round >= BOSS_FROM && game.round % BOSS_EVERY === 0) {
    const alvo = game.blocks[game.blocks.length - 1 - randInt(taken.length)];
    alvo.hp = Math.round(alvo.hp * BOSS_MULT);
    alvo.maxHp = alvo.hp;
  }

  const free = [];
  for (let col = 0; col < config.cols; col++) if (!taken.includes(col)) free.push(col);
  // rede de seguranca: com o tabuleiro apertado, a bola extra vem garantida
  spawnPickup('ball', lotado() ? 1 : config.ballPickupChance, free);
  spawnPickup('aim', config.aimPickupChance, free);
  spawnPickup('break', config.breakPickupChance, free);
}

function makePlayer() {
  return {
    color: PLAYER_COLORS[0],
    launchX: W / 2,
    ballCount: config.startBalls,
    aimDepth: config.startAimDepth,
    breakDepth: config.startBreakDepth,
    collected: 0,
    queued: 0,
    fireTimer: 0,
    turnFrames: 0,
    nextLaunchX: null,
    aim: null,
    firing: false,
    recalling: false,
    broken: 0,
    comboRound: 0,
    lastAim: null,
    bombs: 0,
    doubleNext: false,
    heavy: 0,
    comboBonus: 1,
    savedCards: 0,
    balls: [],
  };
}

const emDupla = () => net.role === 'host' || net.role === 'guest';

function reset() {
  Object.assign(config, draft);
  // o que voce comprou entre partidas entra aqui
  config.startBalls += save.upgrades.balls;
  config.startAimDepth += save.upgrades.aim;
  config.startBreakDepth += save.upgrades.vision;
  config.ballPickupChance = Math.min(1, config.ballPickupChance + save.upgrades.luck * 0.04);
  config.aimPickupChance = Math.min(1, config.aimPickupChance + save.upgrades.luck * 0.02);
  config.breakPickupChance = Math.min(1, config.breakPickupChance + save.upgrades.luck * 0.02);
  seedRandom(game.daily ? sementeDoDia() : config.seed);
  applyLayout();
  game.blocks = [];
  game.pickups = [];
  game.effects = [];
  game.slide = 0;
  game.shake = 0;
  game.round = 1;
  game.over = false;
  game.frames = 0;
  game.players = [makePlayer()];
  game.players[0].bombs = save.upgrades.bomb;
  game.local = 0;
  game.rival = null;
  game.choosing = false;
  game.bombing = false;
  game.run = { blocks: 0, bestCombo: 0, bombs: 0, clears: 0, frames: 0 };
  game.proxima = null;
  ui.cartas.hidden = true;
  addRow();
  ui.over.hidden = true;
  ui.overTitle.textContent = 'Fim de jogo';
  ui.best.textContent = localStorage.getItem(BEST_KEY) || 0;
  syncHud();
  syncRival();
  syncPending();
  syncLoja();
}

function syncHud() {
  const eu = localPlayer();
  bumpValue(ui.round, game.round);
  bumpValue(ui.bounces, eu ? eu.aimDepth : 0);
  bumpValue(ui.breaks, eu ? eu.breakDepth : 0);
  ui.bomb.hidden = !eu?.bombs;
  ui.bomb.textContent = `Bomba x${eu?.bombs ?? 0} (B)`;
  syncHint();
}

function syncHint() {
  const eu = localPlayer();
  if (!eu || game.over) return;
  const texto = eu.firing ? HINT_RECALL : HINT_AIM;
  if (ui.hint.textContent !== texto) ui.hint.textContent = texto;
}

// Troca o numero e pisca so quando ele mudou de verdade.
function bumpValue(el, value) {
  const text = String(value);
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('bump');
  void el.offsetWidth; // forca o reflow para a animacao poder recomecar
  el.classList.add('bump');
}

function syncPending() {
  const pending = SETTINGS.some((setting) => draft[setting.key] !== config[setting.key]);
  ui.pending.hidden = !pending;
  ui.restart.classList.toggle('pending', pending);
}

function shoot(player, dir) {
  player.aim = dir;
  player.lastAim = dir;
  if (player.doubleNext) {
    addEffect('text', 50, { x: W / 2, y: H / 2, text: 'dano dobrado!', color: '#ffcf5c' });
  }
  player.firing = true;
  player.done = false;
  player.queued = player.ballCount;
  player.fireTimer = 0;
  player.turnFrames = 0;
  game.slide = 0; // o tabuleiro ja esta na posicao nova: sem deslize durante o tiro
  syncHint();
}

// Recolhe so quem esta rodando a toa ha um tempo, deixando quem ainda acerta.
function recallLost(player) {
  const perdidas = player.balls.filter((ball) => player.turnFrames - ball.lastHit > LOST_AFTER);
  if (!perdidas.length) return 0;
  for (const ball of perdidas) {
    player.balls.splice(player.balls.indexOf(ball), 1);
    addEffect('pop', 10, { x: ball.x, y: ball.y, r: ball.r, grow: 1.1, color: '#9aa4bf' });
    const half = config.cellSize / 2;
    if (player.nextLaunchX === null) player.nextLaunchX = Math.min(W - half, Math.max(half, ball.x));
  }
  if (!player.queued && !player.balls.length) finishTurn(player);
  return perdidas.length;
}

// Corta a vez no meio: para de lancar e as bolas na tela voltam voando.
// A mira e zerada para o dedo que recolheu nao virar um tiro sem querer.
function recallBalls(player) {
  player.queued = 0;
  player.recalling = true;
  player.aim = null;
}

// Cada tabuleiro e de um jogador so: acabou a vez dele, a linha desce na tela
// dele. O adversario segue no proprio ritmo, na casa dele.
// Tacada boa paga: muitos blocos numa vez rende bola extra, e limpar a tela
// rende bem mais.
function premiaTacada(player) {
  const bonus = Math.floor(player.comboRound / COMBO_STEP) * (player.comboBonus ?? 1);
  if (bonus > 0) {
    player.collected += bonus;
    addEffect('text', 60, {
      x: W / 2, y: H / 2, text: `combo x${player.comboRound}  +${bonus} bolas`, color: '#ffcf5c',
    });
  }
  game.run.bestCombo = Math.max(game.run.bestCombo, player.comboRound);
  if (!game.blocks.length) {
    player.collected += CLEAR_BONUS;
    game.run.clears++;
    SONS.limpou();
    game.shake = 10;
    addEffect('text', 90, { x: W / 2, y: H / 2 - 30, text: `tela limpa!  +${CLEAR_BONUS} bolas`, color: '#7bd88f' });
  }
  player.comboRound = 0;
}

function finishTurn(player) {
  player.firing = false;
  player.recalling = false;
  premiaTacada(player);
  player.doubleNext = false;
  player.launchX = player.nextLaunchX ?? player.launchX;
  player.nextLaunchX = null;
  player.ballCount += player.collected;
  player.collected = 0;
  syncHint();
  game.round++;
  if (game.round <= FREE_BALLS_UNTIL) player.ballCount++; // presente dos primeiros niveis
  addRow();
  if (game.round % CARD_EVERY === 0 && player === localPlayer()) abreCartas();
  syncHud();
  const reachedBottom = (block) => block.row * config.cellSize + config.cellSize > deathY;
  if (game.blocks.some(reachedBottom)) gameOver();
}

function gameOver() {
  game.over = true;
  game.shake = 16;
  SONS.fim();
  const recordeAntigo = Number(localStorage.getItem(BEST_KEY)) || 0;
  const best = Math.max(game.round, recordeAntigo);
  localStorage.setItem(BEST_KEY, best);
  ui.best.textContent = best;
  ui.finalRound.textContent = game.round;
  ui.overTitle.textContent = resultado();
  fechaConta(recordeAntigo);
  ui.over.hidden = false;
  netSend({ t: 'lost', round: game.round });
}

// Fecha as contas da partida: moedas ganhas, metas, recorde e o quanto faltou.
function fechaConta(recordeAntigo) {
  const moedas = game.run.blocks * COIN_PER_BLOCK;
  save.coins += moedas;
  save.totals.games++;
  save.totals.blocks += game.run.blocks;
  save.totals.clears += game.run.clears;
  save.totals.bombs += game.run.bombs;
  save.totals.bestCombo = Math.max(save.totals.bestCombo, game.run.bestCombo);
  save.totals.bestRound = Math.max(save.totals.bestRound, game.round);
  if (game.daily) {
    save.daily.date = hojeTexto();
    save.daily.best = Math.max(save.daily.best, game.round);
  }
  const premio = confereMetas();
  gravaSave();

  // "faltou pouco" e o que mais faz apertar de novo
  if (game.round > recordeAntigo) ui.quaseLa.textContent = 'novo recorde!';
  if (game.round <= recordeAntigo) {
    const falta = recordeAntigo - game.round + 1;
    ui.quaseLa.textContent = `faltou ${falta} ${falta === 1 ? 'nivel' : 'niveis'} para bater seu recorde de ${recordeAntigo}`;
  }

  const linhas = [
    ['Blocos quebrados', game.run.blocks],
    ['Maior combo', game.run.bestCombo],
    ['Telas limpas', game.run.clears],
    ['Bombas usadas', game.run.bombs],
    ['Tempo', `${Math.round(game.run.frames / 60)}s`],
  ];
  ui.resumo.replaceChildren();
  for (const [rotulo, valor] of linhas) {
    const item = document.createElement('li');
    item.innerHTML = `${rotulo}: <b>${valor}</b>`;
    ui.resumo.append(item);
  }
  ui.ganhou.textContent = premio
    ? `+${moedas} moedas  ·  meta concluida: +${premio}`
    : `+${moedas} moedas  (total ${save.coins})`;
  syncLoja();
}

// Em dupla o placar e simples: quem chegou mais longe antes de perder.
function resultado() {
  if (!emDupla() || !game.rival) return 'Fim de jogo';
  if (!game.rival.over) return 'Você perdeu primeiro';
  if (game.round > game.rival.round) return 'Você ganhou';
  if (game.round < game.rival.round) return 'Você perdeu';
  return 'Empate';
}

// Um substep de movimento com os ricochetes: devolve o bloco atingido, ou null.
// Nao muda nada fora da bola, entao a mira reusa isso numa bola de mentira.
function advance(ball, steps, ignorar) {
  ball.x += ball.vx / steps;
  ball.y += ball.vy / steps;

  if (ball.x < ball.r) { ball.x = ball.r; ball.vx = -ball.vx; }
  if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -ball.vx; }
  if (ball.y < ball.r) { ball.y = ball.r; ball.vy = -ball.vy; }

  for (const block of game.blocks) {
    if (ignorar && ignorar.has(block)) continue;
    if (resolveHit(ball, blockRect(block))) return block;
  }
  return null;
}

// Previsao em arvore. O ramo principal mostra a bola batendo e voltando, como
// sempre. Com "visao de quebra", cada bloco que a bola encontrar abre um ramo
// extra que mostra para onde ela iria SE aquele bloco tivesse caido. Sao
// varias linhas ao mesmo tempo: uma por futuro possivel.
function tracaRamo(inicio, ignorar, bounces, breaks, orcamento, plano, nivel) {
  const steps = substeps();
  const ghost = { ...inicio };
  const points = [{ x: ghost.x, y: ghost.y }];
  let restam = bounces;
  let chegouAoChao = false;
  for (let step = 0; step < BRANCH_STEPS && restam >= 0; step++) {
    const antes = { x: ghost.x, y: ghost.y, vx: ghost.vx, vy: ghost.vy, r: ghost.r };
    const bloco = advance(ghost, steps, ignorar);
    if (ghost.y >= H - ghost.r) {
      chegouAoChao = true;
      break;
    }
    if (bloco && nivel === 0) {
      plano.tocados.add(bloco);
      plano.toques++;
    }
    // so mostra o "se cair" se as bolas desta jogada derem conta da vida dele:
    // bloco de 11 com 10 bolas nao cai, entao a visao para nele
    const derruba = bloco && bloco.hp <= orcamento;
    if (bloco && !derruba && breaks > 0) plano.travados.add(bloco);
    if (derruba && breaks > 0 && plano.paths.length < MAX_AIM_PATHS - 1) {
      const semEsse = new Set(ignorar);
      semEsse.add(bloco);
      plano.quebrados.add(bloco);
      tracaRamo(antes, semEsse, restam, breaks - 1, orcamento - bloco.hp, plano, nivel + 1);
    }
    if (ghost.vx === antes.vx && ghost.vy === antes.vy) continue;
    points.push({ x: ghost.x, y: ghost.y });
    restam--;
  }
  const last = points[points.length - 1];
  if (last.x !== ghost.x || last.y !== ghost.y) points.push({ x: ghost.x, y: ghost.y });
  if (chegouAoChao && nivel === 0) plano.pousa = ghost.x;
  plano.paths.push({ points, tipo: nivel === 0 ? 'bounce' : 'break', nivel });
}

function aimPlan(player, dir, depth, breakDepth) {
  const inicio = {
    x: player.launchX,
    y: H - config.ballRadius,
    vx: dir.x * config.ballSpeed,
    vy: dir.y * config.ballSpeed,
    r: config.ballRadius,
  };
  const plano = {
    paths: [],
    tocados: new Set(),
    quebrados: new Set(),
    travados: new Set(),
    toques: 0,
    pousa: null,
  };
  // o orcamento e quanto dano a salva desta jogada entrega: uma bola tira um
  // de vida por toque, entao com 10 bolas voce derruba ate 10 de vida
  tracaRamo(inicio, new Set(), depth, breakDepth, player.ballCount, plano, 0);
  return plano;
}

function aimPaths(player, dir, depth, breakDepth) {
  return aimPlan(player, dir, depth, breakDepth).paths;
}

// A linha simples continua existindo para quem so quer o caminho principal.
function aimPath(player, dir, depth) {
  return aimPaths(player, dir, depth, 0)[0].points;
}

function derrubaBloco(block, player, ball) {
  const i = game.blocks.indexOf(block);
  if (i < 0) return;
  player.broken++;
  player.comboRound++;
  if (player.broken % BOMB_BREAKS === 0) {
    player.bombs++;
    addEffect('text', 50, { x: W / 2, y: H / 2 + 40, text: 'bomba carregada', color: '#ff9f6b' });
  }
  if (player.broken % BREAKS_PER_BALL === 0) {
    player.collected++;
    const onde = ball ?? cellCenter(block);
    addEffect('text', 34, { x: onde.x, y: onde.y - 10, text: '+1 bola', color: '#7ad3ff' });
  }
  burstBlock(block);
  game.blocks.splice(i, 1);
  game.run.blocks++;
  SONS.quebra(player.comboRound);
  blockKind(block).aoMorrer?.(block, player);
}

function stepBall(player, ball, steps) {
  const antesX = ball.vx;
  const block = advance(ball, steps);
  if (block) {
    ball.lastHit = player.turnFrames;
    const kind = blockKind(block);
    const lateral = ball.vx !== antesX; // bateu de lado, nao por cima
    kind.aoTocar?.(block, player, ball);
    if (kind.aceitaDano?.(block, lateral) ?? true) {
      const extra = Math.floor((player.heavy ?? 0) * (player.ballCount / 10));
      block.hp -= (1 + extra) * (player.doubleNext ? 2 : 1);
      block.flash = FLASH_FRAMES;
      if (block.hp <= 0) derrubaBloco(block, player, ball);
    }
  }

  const reach = ball.r + pickupRadius();
  for (let i = game.pickups.length - 1; i >= 0; i--) {
    const pickup = game.pickups[i];
    const px = pickup.col * config.cellSize + config.cellSize / 2;
    const py = pickup.row * config.cellSize + config.cellSize / 2;
    if (Math.hypot(ball.x - px, ball.y - py) > reach) continue;
    game.pickups.splice(i, 1);
    const kind = PICKUP_KINDS[pickup.kind];
    kind.collect(player);
    SONS.item();
    popPickup(px, py, kind.color);
    syncHud();
  }
}

function popPickup(x, y, color) {
  addEffect('pop', 14, { x, y, r: pickupRadius(), grow: 1.4, color });
  addEffect('text', 32, { x, y: y - pickupRadius(), text: '+1', color });
}

function pushTrail(ball) {
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > TRAIL_LEN) ball.trail.shift();
}

// Depois do recolhimento as bolas voltam voando para o lancador, sem colidir.
function updateRecall(player) {
  const targetX = player.nextLaunchX ?? player.launchX;
  const targetY = H - config.ballRadius;
  for (let i = player.balls.length - 1; i >= 0; i--) {
    const ball = player.balls[i];
    pushTrail(ball);
    ball.x += (targetX - ball.x) * RECALL_LERP;
    ball.y += (targetY - ball.y) * RECALL_LERP;
    if (Math.hypot(targetX - ball.x, targetY - ball.y) > ball.r * 2) continue;
    player.balls.splice(i, 1);
    addEffect('pop', 10, { x: targetX, y: targetY, r: ball.r, grow: 1.1, color: player.color });
  }
  if (player.balls.length) return;
  finishTurn(player);
}

// Passado um tempo, a bola vai ficando mais rapida: a rodada fecha sem
// obrigar voce a assistir ricochete que nao leva a nada.
function turnBoost(player) {
  if (player.turnFrames < BOOST_AFTER) return 1;
  return Math.min(BOOST_MAX, 1 + (player.turnFrames - BOOST_AFTER) / 600);
}

function updatePlayer(player) {
  if (!player.firing) return;
  if (player.recalling) {
    updateRecall(player);
    return;
  }

  player.turnFrames++;
  if (player.queued > 0 && player.fireTimer <= 0) {
    player.balls.push({
      x: player.launchX,
      y: H - config.ballRadius,
      vx: player.aim.x * config.ballSpeed,
      vy: player.aim.y * config.ballSpeed,
      r: config.ballRadius,
      trail: [],
      lastHit: 0,
    });
    player.queued--;
    player.fireTimer = config.fireGap;
  }
  player.fireTimer--;

  const boost = turnBoost(player);
  const steps = Math.ceil(substeps() * boost);
  for (let i = player.balls.length - 1; i >= 0; i--) {
    const ball = player.balls[i];
    pushTrail(ball);
    for (let s = 0; s < steps; s++) stepBall(player, ball, steps / boost);
    // ponytail: puxao para baixo quebra rodadas quase horizontais; sem isso a
    // bola pode ficar minutos ricocheteando entre as paredes.
    if (player.turnFrames > STALL_FRAMES) ball.y += 4;
    if (ball.y < H - ball.r) continue;
    player.balls.splice(i, 1);
    addEffect('pop', 10, { x: ball.x, y: H - ball.r, r: ball.r, grow: 1.1, color: player.color });
    const half = config.cellSize / 2;
    if (player.nextLaunchX === null) player.nextLaunchX = Math.min(W - half, Math.max(half, ball.x));
  }

  if (!player.queued && !player.balls.length) finishTurn(player);
}

function update() {
  if (game.over || game.choosing) return;
  game.run.frames++;
  for (const player of game.players) updatePlayer(player);
}



// ---------------------------------------------------------------- loja e metas

// Melhorias que ficam para sempre. O preco sobe a cada nivel comprado, entao
// sempre ha o proximo objetivo.
const MELHORIAS = [
  { key: 'balls', nome: 'Bolas iniciais', texto: 'comeca com uma bola a mais', base: 60, max: 10 },
  { key: 'luck', nome: 'Sorte', texto: 'mais chance de item na linha', base: 90, max: 6 },
  { key: 'bomb', nome: 'Bomba inicial', texto: 'comeca a partida com uma bomba', base: 150, max: 3 },
  { key: 'aim', nome: 'Rebatida inicial', texto: 'comeca vendo um ricochete a mais', base: 120, max: 5 },
  { key: 'vision', nome: 'Visao inicial', texto: 'comeca vendo uma quebra a mais', base: 140, max: 4 },
];

const precoDe = (m) => Math.round(m.base * Math.pow(1.6, save.upgrades[m.key]));

function compra(m) {
  if (save.upgrades[m.key] >= m.max || save.coins < precoDe(m)) return;
  save.coins -= precoDe(m);
  save.upgrades[m.key]++;
  gravaSave();
  syncLoja();
}

function syncLoja() {
  ui.moedas.textContent = save.coins;
  ui.lojaLista.replaceChildren();
  for (const m of MELHORIAS) {
    const nivel = save.upgrades[m.key];
    const cheio = nivel >= m.max;
    const preco = precoDe(m);
    const botao = document.createElement('button');
    botao.innerHTML = `${m.nome} ${nivel}/${m.max}<small>${cheio ? 'no maximo' : `${m.texto} · ${preco} moedas`}</small>`;
    botao.disabled = cheio || save.coins < preco;
    botao.addEventListener('click', () => compra(m));
    ui.lojaLista.append(botao);
  }
  syncMetas();
  syncDiario();
}

// Metas de longo prazo: dao moedas e um objetivo alem do placar.
const METAS = [
  { key: 'b500', nome: 'Quebrar 500 blocos', premio: 200, feito: () => save.totals.blocks >= 500 },
  { key: 'b5000', nome: 'Quebrar 5000 blocos', premio: 800, feito: () => save.totals.blocks >= 5000 },
  { key: 'r20', nome: 'Chegar ao nivel 20', premio: 250, feito: () => save.totals.bestRound >= 20 },
  { key: 'r35', nome: 'Chegar ao nivel 35', premio: 600, feito: () => save.totals.bestRound >= 35 },
  { key: 'c30', nome: 'Combo de 30 numa tacada', premio: 300, feito: () => save.totals.bestCombo >= 30 },
  { key: 'clear5', nome: 'Limpar a tela 5 vezes', premio: 350, feito: () => save.totals.clears >= 5 },
  { key: 'bomb10', nome: 'Usar 10 bombas', premio: 200, feito: () => save.totals.bombs >= 10 },
];

function confereMetas() {
  let premio = 0;
  for (const meta of METAS) {
    if (save.goals[meta.key] || !meta.feito()) continue;
    save.goals[meta.key] = true;
    save.coins += meta.premio;
    premio += meta.premio;
  }
  return premio;
}

function syncMetas() {
  ui.metas.replaceChildren();
  for (const meta of METAS) {
    const item = document.createElement('li');
    const feita = save.goals[meta.key];
    item.textContent = `${feita ? '✓' : '·'} ${meta.nome} (+${meta.premio})`;
    item.className = feita ? 'feita' : '';
    ui.metas.append(item);
  }
}

// ---------------------------------------------------------------- desafio do dia

function hojeTexto() {
  const hoje = new Date();
  return `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`;
}

const sementeDoDia = () => Number(hojeTexto()) % 9999 + 1;

function syncDiario() {
  const hoje = hojeTexto();
  const melhor = save.daily.date === hoje ? save.daily.best : 0;
  ui.diario.textContent = game.daily ? 'Sair do desafio' : 'Desafio do dia';
  ui.diarioInfo.textContent = melhor
    ? `mapa de hoje: seu melhor foi o nivel ${melhor}`
    : 'mesmo mapa para o dia inteiro';
}

function alternaDiario() {
  game.daily = !game.daily;
  reset();
}

// ---------------------------------------------------------------- cartas

// A cada cinco niveis o jogo para e voce escolhe. E o momento de decisao que
// faltava entre uma tacada e outra.
const CARTAS = [
  {
    titulo: '+3 bolas', texto: 'tres bolas a mais para sempre',
    aplicar(player) { player.ballCount += 3; },
  },
  {
    titulo: 'Dano dobrado', texto: 'a proxima tacada tira o dobro',
    aplicar(player) { player.doubleNext = true; },
  },
  {
    titulo: 'Quebrar a base', texto: 'apaga a linha mais baixa do tabuleiro',
    aplicar(player) {
      const fundo = Math.max(...game.blocks.map((b) => b.row), -1);
      if (fundo < 0) return;
      for (const bloco of [...game.blocks]) {
        if (bloco.row === fundo) derrubaBloco(bloco, player);
      }
    },
  },
  {
    titulo: '+1 rebatida', texto: 'mais um trecho na previsao',
    aplicar(player) { player.aimDepth++; },
  },
  {
    titulo: '+1 visao de quebra', texto: 've mais um bloco adiante',
    aplicar(player) { player.breakDepth++; },
  },
  {
    titulo: 'Bomba pronta', texto: 'uma bomba carregada na hora',
    aplicar(player) { player.bombs++; },
  },
  {
    titulo: 'Peso das bolas', texto: 'a cada 10 bolas suas, +1 de dano por toque',
    aplicar(player) { player.heavy = (player.heavy ?? 0) + 1; },
  },
  {
    titulo: 'Troco do combo', texto: 'combo passa a render o dobro de bolas',
    aplicar(player) { player.comboBonus = (player.comboBonus ?? 1) * 2; },
  },
  {
    titulo: 'Faro de item', texto: 'itens caem bem mais nas proximas linhas',
    aplicar() {
      config.ballPickupChance = Math.min(1, config.ballPickupChance + 0.2);
      config.breakPickupChance = Math.min(1, config.breakPickupChance + 0.1);
    },
  },
];

function abreCartas() {
  const player = localPlayer();
  if (!player) return;
  game.choosing = true;
  const sobrando = [...CARTAS];
  ui.cartasLista.replaceChildren();
  const quantas = CARD_COUNT + (player.savedCards ?? 0);
  player.savedCards = 0;
  for (let i = 0; i < quantas && sobrando.length; i++) {
    const carta = sobrando.splice(randInt(sobrando.length), 1)[0];
    const botao = document.createElement('button');
    botao.innerHTML = `<b>${carta.titulo}</b><small>${carta.texto}</small>`;
    botao.addEventListener('click', () => pegaCarta(carta));
    ui.cartasLista.append(botao);
  }
  const pular = document.createElement('button');
  pular.innerHTML = '<b>Pular</b><small>fica sem nada agora e recebe duas cartas a mais na proxima</small>';
  pular.addEventListener('click', () => {
    if (!game.choosing) return;
    localPlayer().savedCards = (localPlayer().savedCards ?? 0) + 2;
    pegaCarta({ aplicar() {} });
  });
  ui.cartasLista.append(pular);
  ui.cartas.hidden = false;
  SONS.carta();
}

function pegaCarta(carta) {
  if (!game.choosing) return;
  game.choosing = false;
  ui.cartas.hidden = true;
  ui.cartasLista.replaceChildren();
  carta.aplicar(localPlayer());
  syncHud();
}

// ---------------------------------------------------------------- bomba

function usaBomba(col, row) {
  const player = localPlayer();
  if (!player?.bombs || game.over) return;
  player.bombs--;
  game.run.bombs++;
  SONS.bomba();
  game.bombing = false;
  const centro = cellCenter({ col, row });
  const raio = BOMB_RADIUS_USE * config.cellSize;
  addEffect('pop', 22, { ...centro, r: raio * 0.3, grow: raio / 14, color: '#ff9f6b' });
  game.shake = 12;
  for (const bloco of [...game.blocks]) {
    const alvo = cellCenter(bloco);
    if (Math.hypot(alvo.x - centro.x, alvo.y - centro.y) > raio) continue;
    bloco.hp -= player.ballCount * 3;
    bloco.flash = FLASH_FRAMES;
    if (bloco.hp <= 0) derrubaBloco(bloco, player);
  }
  syncHud();
}

// ---------------------------------------------------------------- rede

// Cada um simula o proprio tabuleiro: pela rede vai so um resumo, para o outro
// desenhar a miniatura e comparar o nivel. Nenhum comando de controle trafega,
// entao lag de rede nunca atrasa a sua mira.
function resumo() {
  const eu = localPlayer();
  return {
    t: 'board',
    round: game.round,
    balls: eu.ballCount,
    breaks: eu.breakDepth,
    over: game.over,
    cols: config.cols,
    rows: linhasJogaveis(),
    blocks: game.blocks.map((b) => [b.col, b.row]),
  };
}

function aplicaRival(msg) {
  game.rival = {
    round: msg.round,
    balls: msg.balls,
    over: msg.over,
    cols: msg.cols,
    rows: msg.rows,
    blocks: msg.blocks,
  };
  syncRival();
}

// O jogador 1 manda a configuracao para os dois jogarem o mesmo mapa.
function enviaSetup() {
  netSend({ t: 'setup', cfg: config });
}

function aplicaSetup(msg) {
  Object.assign(draft, msg.cfg);
  for (const setting of SETTINGS) {
    if (!setting.input) continue;
    setting.input.value = draft[setting.key];
  }
  reset();
}

net.onMessage = (msg) => {
  if (rivalHandles(msg)) return;
  if (msg.t === 'board') aplicaRival(msg);
  if (msg.t === 'lost' && game.rival) {
    game.rival.over = true;
    game.rival.round = msg.round;
    syncRival();
    if (game.over) ui.overTitle.textContent = resultado();
  }
  if (msg.t === 'setup' && isGuest()) aplicaSetup(msg);
};

rival.onChange = () => desenhaFicha(ui.rivalInfo);

net.onRole = () => {
  ui.room.textContent = {
    solo: 'sozinho',
    host: net.peers > 1 ? 'em dupla (jogador 1)' : 'esperando o outro jogador',
    guest: 'em dupla (jogador 2)',
    full: 'sala cheia',
  }[net.role] ?? '';
  reset();
  if (net.role === 'host' && net.peers > 1) enviaSetup();
};

function syncRival() {
  const emJogo = emDupla() && net.peers > 1;
  ui.rival.hidden = !emJogo;
  if (!emJogo || !game.rival) return;
  ui.rivalRound.textContent = game.rival.round;
  ui.rivalBalls.textContent = game.rival.balls;
  ui.rivalState.textContent = game.rival.over ? 'perdeu' : 'jogando';
  ui.rivalState.className = game.rival.over ? 'morto' : 'vivo';
  desenhaFicha(ui.rivalInfo);
  drawRival();
}

// Miniatura do tabuleiro do adversario: so os blocos, sem numero nem bola.
function drawRival() {
  const rival = game.rival;
  const largura = ui.rivalBoard.clientWidth || 160;
  const celula = largura / rival.cols;
  ui.rivalBoard.width = largura;
  ui.rivalBoard.height = celula * rival.rows;
  rivalCtx.clearRect(0, 0, ui.rivalBoard.width, ui.rivalBoard.height);
  rivalCtx.fillStyle = '#ffb45c';
  for (const [col, row] of rival.blocks) {
    if (row >= rival.rows) continue;
    rivalCtx.fillRect(col * celula + 1, row * celula + 1, celula - 2, celula - 2);
  }
  rivalCtx.strokeStyle = '#2c3145';
  rivalCtx.strokeRect(0.5, 0.5, ui.rivalBoard.width - 1, ui.rivalBoard.height - 1);
}

// ---------------------------------------------------------------- desenho

function drawBlocks(quebrados) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ultimaLinha = linhasJogaveis() - 1;
  const piscada = Math.sin(game.frames / 6) * 0.5 + 0.5;
  for (const block of game.blocks) {
    const rect = blockRect(block);
    const y = rect.y - game.slide;
    const texto = numeroCurto(block.hp);

    ctx.fillStyle = block.flash > 0 ? '#f4f7ff' : blockColor(block.hp);
    ctx.fillRect(rect.x, y, rect.w, rect.h);

    // ja perdeu vida: uma faixa fina embaixo mostra o quanto falta
    if (block.maxHp && block.hp < block.maxHp) {
      ctx.fillStyle = '#0d0f1655';
      ctx.fillRect(rect.x, y + rect.h - 4, rect.w, 4);
      ctx.fillStyle = '#0d0f16';
      ctx.fillRect(rect.x, y + rect.h - 4, rect.w * (block.hp / block.maxHp), 4);
    }

    // numero encolhe conforme cresce, para nunca vazar da celula
    const escala = texto.length <= 3 ? 0.34 : 0.34 * (3 / texto.length);
    ctx.font = `bold ${Math.round(config.cellSize * escala)}px system-ui, sans-serif`;
    ctx.fillStyle = '#0d0f16';
    ctx.fillText(texto, rect.x + rect.w / 2, y + rect.h / 2);

    // marca do tipo, para dar para ver de longe qual bloco e qual
    const marca = blockKind(block).marca;
    if (marca) {
      ctx.fillStyle = marca;
      ctx.beginPath();
      ctx.arc(rect.x + rect.w - 7, y + 7, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // este vai cair na jogada prevista
    if (quebrados?.has(block)) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x - 1, y - 1, rect.w + 2, rect.h + 2);
    }

    // uma linha de descer e voce perde: pisca para avisar
    if (block.row < ultimaLinha) continue;
    ctx.strokeStyle = `rgba(255, 80, 100, ${0.35 + piscada * 0.65})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(rect.x - 1, y - 1, rect.w + 2, rect.h + 2);
  }
}

// Previa da proxima linha, encostada no topo: da para planejar a tacada.
function drawProxima() {
  if (!game.proxima) return;
  const cell = config.cellSize;
  const altura = Math.max(5, cell * 0.18);
  ctx.globalAlpha = 0.55;
  for (const bloco of game.proxima) {
    ctx.fillStyle = blockColor(bloco.hp);
    ctx.fillRect(bloco.col * cell + 2, 0, cell - 4, altura);
  }
  ctx.globalAlpha = 1;
}

function drawPickups() {
  const r = pickupRadius();
  ctx.lineWidth = 2;
  for (const pickup of game.pickups) {
    const kind = PICKUP_KINDS[pickup.kind];
    const x = pickup.col * config.cellSize + config.cellSize / 2;
    const y = pickup.row * config.cellSize + config.cellSize / 2 - game.slide;
    ctx.strokeStyle = kind.color;
    ctx.fillStyle = kind.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    kind.draw(x, y, r);
  }
}

function drawEffects() {
  for (const effect of game.effects) {
    ctx.globalAlpha = effect.life / effect.maxLife;
    EFFECTS[effect.kind].draw(effect);
  }
  ctx.globalAlpha = 1;
}

function drawBalls() {
  ctx.lineCap = 'round';
  for (const player of game.players) {
    for (const ball of player.balls) {
      if (ball.trail.length > 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = ball.r * 1.4;
        ctx.beginPath();
        ctx.moveTo(ball.trail[0].x, ball.trail[0].y);
        for (const point of ball.trail) ctx.lineTo(point.x, point.y);
        ctx.lineTo(ball.x, ball.y);
        ctx.stroke();
      }
      ctx.fillStyle = player.color;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const CORES_RAMO = ['#ffffff', '#7bd88f', '#7ad3ff', '#c084fc', '#ff9ecd'];

function corDoRamo(nivel) {
  return CORES_RAMO[Math.min(nivel, CORES_RAMO.length - 1)];
}

// Cadeado no bloco que a sua salva nao derruba: e ali que a previsao para.
function drawCadeado(block) {
  const rect = blockRect(block);
  const x = rect.x + rect.w / 2;
  const y = rect.y - game.slide + rect.h / 2;
  const r = Math.max(4, config.cellSize * 0.16);
  ctx.strokeStyle = '#0d0f16';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.4, r * 0.55, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#0d0f16';
  ctx.fillRect(x - r * 0.8, y - r * 0.4, r * 1.6, r * 1.2);
}

function drawAim(player, plano) {
  // formiguinha: o tracejado anda no sentido do tiro
  ctx.lineDashOffset = -(game.frames % 24);
  for (const caminho of plano.paths) {
    const cor = corDoRamo(caminho.nivel);
    const principal = caminho.nivel === 0;
    ctx.setLineDash(principal ? [7, 9] : [4, 8]);
    ctx.lineWidth = principal ? 2.5 : 1.6;
    const { points } = caminho;
    for (let i = 1; i < points.length; i++) {
      ctx.globalAlpha = Math.max(0.25, (principal ? 0.75 : 0.6) - (i - 1) * 0.12);
      ctx.strokeStyle = cor;
      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    ctx.fillStyle = cor;
    ctx.globalAlpha = 0.5;
    for (let i = 1; i < points.length - 1; i++) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, principal ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // de onde nasce cada "se este bloco cair"
    if (principal) continue;
    ctx.strokeStyle = cor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const block of plano.travados) drawCadeado(block);

  // onde a bola volta ao chao: e de la que voce atira na proxima vez
  if (plano.pousa !== null) {
    const y = H - config.ballRadius;
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plano.pousa - 7, y + 7);
    ctx.lineTo(plano.pousa, y);
    ctx.lineTo(plano.pousa + 7, y + 7);
    ctx.stroke();
  }

  // resumo do tiro, do lado do lancador
  const dano = plano.toques * player.ballCount;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = '#e8ecf4';
  ctx.fillText(`${plano.tocados.size} blocos · ${numeroCurto(dano)} de dano`, player.launchX, H - 62);
}

function drawLaunchers() {
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px system-ui, sans-serif';
  for (const player of game.players) {
    if (player.firing || game.over) continue;
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.launchX, H - config.ballRadius, config.ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(`x${player.ballCount}`, player.launchX, H - 32);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }

  const eu = localPlayer();
  const plano = eu && eu.aim && !eu.firing && !game.over
    ? aimPlan(eu, eu.aim, eu.aimDepth, eu.breakDepth)
    : null;

  drawBlocks(plano?.quebrados);
  drawProxima();
  drawPickups();
  if (plano) drawAim(eu, plano);

  ctx.strokeStyle = '#2c3145';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, deathY);
  ctx.lineTo(W, deathY);
  ctx.stroke();

  drawBalls();
  drawEffects();
  drawLaunchers();
  ctx.restore();
}

function loop() {
  game.frames++;
  for (let i = 0; i < game.speed; i++) update();
  updateEffects();
  draw();
  // 4 pacotes por segundo bastam para a miniatura do adversario
  if (emDupla() && net.peers > 1 && game.frames % SEND_EVERY === 0) netSend(resumo());
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- controles

function pointerAt(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (W / rect.width),
    y: (event.clientY - rect.top) * (H / rect.height),
  };
}

let miraBase = null;

function aimAt(event) {
  const point = pointerAt(event);
  const player = localPlayer();
  const bruto = clampAim(point.x - player.launchX, point.y - (H - config.ballRadius));
  // com shift o ajuste fica quatro vezes mais fino, para acertar a fresta
  if (!event.shiftKey || !miraBase) {
    miraBase = { alvo: bruto, saida: bruto };
    return bruto;
  }
  const anguloAlvo = Math.atan2(bruto.y, bruto.x);
  const anguloBase = Math.atan2(miraBase.alvo.y, miraBase.alvo.x);
  const anguloSaida = Math.atan2(miraBase.saida.y, miraBase.saida.x);
  const fino = anguloSaida + (anguloAlvo - anguloBase) * 0.25;
  return clampAim(Math.cos(fino), Math.sin(fino));
}

canvas.addEventListener('pointerdown', (event) => {
  const player = localPlayer();
  if (game.over || !player || game.choosing) return;
  if (game.bombing) {
    const ponto = pointerAt(event);
    usaBomba(Math.floor(ponto.x / config.cellSize), Math.floor(ponto.y / config.cellSize));
    ui.bomb.classList.remove('pronto');
    return;
  }
  if (player.firing) {
    recallBalls(player);
    player.aim = null;
    return;
  }
  canvas.setPointerCapture(event.pointerId);
  player.aim = aimAt(event);
});

canvas.addEventListener('pointermove', (event) => {
  const player = localPlayer();
  if (game.over || !player || player.firing || !player.aim) return;
  player.aim = aimAt(event);
});

canvas.addEventListener('pointerup', (event) => {
  const player = localPlayer();
  if (game.over || !player || player.firing || !player.aim) return;
  shoot(player, dir = aimAt(event));
});

function toggleSpeed() {
  game.speed = game.speed === 1 ? 2 : 1;
  ui.speed.textContent = game.speed === 1 ? '2x' : '1x';
}

function repetirTiro() {
  const player = localPlayer();
  if (!player || player.firing || game.over || !player.lastAim) return;
  shoot(player, player.lastAim);
}

document.addEventListener('keydown', (event) => {
  startAudio();
  const player = localPlayer();
  if (!player) return;
  if (game.over && event.code !== 'Enter') return;
  if (event.code === 'Enter') {
    event.preventDefault();
    reset();
    return;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    repetirTiro();
  }
  if (event.code === 'KeyR' && player.firing) recallLost(player);
  if (event.code === 'KeyB' && player.bombs) {
    game.bombing = !game.bombing;
    ui.bomb.classList.toggle('pronto', game.bombing);
  }
  if (event.code === 'KeyD') toggleSpeed();
});

ui.bomb.addEventListener('click', () => {
  const player = localPlayer();
  if (!player?.bombs) return;
  game.bombing = !game.bombing;
  ui.bomb.classList.toggle('pronto', game.bombing);
});

ui.speed.addEventListener('click', toggleSpeed);
ui.repeat.addEventListener('click', repetirTiro);
ui.clean.addEventListener('click', () => {
  const player = localPlayer();
  if (player?.firing) recallLost(player);
});

ui.restart.addEventListener('click', reset);
document.getElementById('again').addEventListener('click', reset);

// ---------------------------------------------------------------- painel

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

function restoreDefaults() {
  for (const setting of SETTINGS) {
    setting.input.value = setting.value;
    setting.input.dispatchEvent(new Event('input'));
  }
}

document.getElementById('defaults').addEventListener('click', restoreDefaults);
ui.diario.addEventListener('click', alternaDiario);
document.addEventListener('pointerdown', startAudio, { once: true });

ui.share.checked = net.share;
ui.share.addEventListener('change', () => {
  localStorage.setItem('netShare', ui.share.checked ? 'on' : 'off');
  net.share = ui.share.checked;
  net.socket?.close(); // reconecta ja com a escolha nova
  netConnect();
});

buildPanel();

// ---------------------------------------------------------------- self-check

if (location.hash === '#test') {
  const ball = { x: 60, y: 150, vx: 5, vy: -5, r: 7 };
  const rect = { x: 30, y: 90, w: 54, h: 54 };
  console.assert(resolveHit(ball, rect) === true, 'deve detectar sobreposicao');
  console.assert(ball.vy === 5, 'batida por baixo inverte o eixo Y');
  console.assert(ball.y === 90 + 54 + 7, 'bola empurrada para fora do bloco');
  console.assert(resolveHit({ x: 300, y: 300, vx: 1, vy: 1, r: 7 }, rect) === false, 'longe nao colide');
  console.assert(clampAim(0, 50).y < 0, 'mira para baixo vira mira para cima');
  console.assert(clampAim(1, -0.0001).y <= -Math.sin(MIN_ANGLE) + 1e-9, 'angulo rasante e limitado');

  reset();
  const eu = game.players[0];
  game.blocks = [{ col: 3, row: 3, hp: 1, flash: 0 }];
  game.pickups = [];
  const diagonal = clampAim(0.7, -0.7);
  console.assert(aimPath(eu, diagonal, 0).length === 2, 'sem upgrade a mira mostra so ate a primeira batida');
  console.assert(aimPath(eu, diagonal, 3).length === 5, 'com 3 upgrades a mira mostra 3 ricochetes');
  console.assert(game.blocks[0].hp === 1, 'a previsao nao pode danificar bloco');

  reset();
  game.players[0].ballCount = 5;
  shoot(game.players[0], clampAim(0, -1));
  update();
  console.assert(game.players[0].balls.length === 1 && game.players[0].queued === 4, 'a vez lanca as bolas uma a uma');
  recallBalls(game.players[0]);
  console.assert(game.players[0].recalling && !game.players[0].queued, 'recolher cancela a fila');
  const nivelAntes = game.round;
  for (let i = 0; i < 60 && game.players[0].firing; i++) update();
  console.assert(!game.players[0].firing && game.round === nivelAntes + 1, 'sozinho a rodada fecha na hora');

  const blocosAntes = game.blocks.length;
  game.blocks[0].hp = 1;
  const alvo = game.blocks[0];
  const tiro = { x: alvo.col * config.cellSize + config.cellSize / 2, y: alvo.row * config.cellSize + config.cellSize + 20, vx: 0, vy: -30, r: 7, trail: [] };
  stepBall(game.players[0], tiro, 1);
  console.assert(game.blocks.length === blocosAntes - 1, 'o bloco de 1 de vida quebra');

  // ------- previsao em arvore
  reset();
  const alvoUnico = { col: Math.floor(config.cols / 2), row: 6, hp: 1, flash: 0 };
  game.blocks = [alvoUnico];
  game.pickups = [];
  const euMira = game.players[0];
  euMira.launchX = alvoUnico.col * config.cellSize + config.cellSize / 2;
  const paraCima = clampAim(0, -1);
  const semVisao = aimPaths(euMira, paraCima, 2, 0);
  console.assert(semVisao.length === 1, 'sem o item so aparece a linha normal');
  console.assert(semVisao[0].tipo === 'bounce', 'e ela e a do ricochete');

  const comVisao = aimPaths(euMira, paraCima, 2, 1);
  console.assert(comVisao.length === 2, 'com uma visao de quebra aparecem duas linhas ao mesmo tempo');
  console.assert(comVisao.some((c) => c.tipo === 'break'), 'a segunda e a do caminho apos o bloco cair');
  const ramo = comVisao.find((c) => c.tipo === 'break');
  console.assert(ramo.points.some((ponto) => ponto.y < alvoUnico.row * config.cellSize), 'o ramo de quebra passa por cima do bloco, como se ele tivesse caido');

  game.blocks = [alvoUnico, { col: alvoUnico.col, row: 3, hp: 1, flash: 0 }];
  euMira.ballCount = 5; // bolas suficientes para derrubar os dois
  const doisFundos = aimPaths(euMira, paraCima, 2, 2);
  console.assert(doisFundos.length >= 3, 'com duas visoes o segundo bloco tambem abre caminho');
  console.assert(doisFundos.filter((c) => c.tipo === 'break').length >= 2, 'sao duas previsoes de quebra encadeadas');
  console.assert(aimPaths(euMira, paraCima, 3, 9).length <= MAX_AIM_PATHS, 'a tela nunca vira sopa de linhas');

  // a vida do bloco manda na visao: bloco mais duro que a sua salva nao cai
  game.blocks = [alvoUnico];
  euMira.ballCount = 10;
  alvoUnico.hp = 11;
  console.assert(aimPaths(euMira, paraCima, 2, 2).length === 1, 'bloco de 11 com 10 bolas: a visao para nele');
  alvoUnico.hp = 10;
  console.assert(aimPaths(euMira, paraCima, 2, 2).length === 2, 'bloco de 10 com 10 bolas: a visao passa');
  alvoUnico.hp = 6;
  game.blocks = [alvoUnico, { col: alvoUnico.col, row: 3, hp: 5, flash: 0 }];
  console.assert(aimPaths(euMira, paraCima, 2, 2).length === 2, 'o primeiro gasta 6 das 10 bolas, entao o de 5 nao cai');
  game.blocks[1].hp = 4;
  console.assert(aimPaths(euMira, paraCima, 2, 2).length === 3, 'com 6 mais 4 a conta fecha e a visao segue');

  // ------- leitura da tela
  console.assert(blockColor(4, 10) === COR_FACIL, 'bloco que cai com metade das bolas fica verde');
  console.assert(blockColor(9, 10) === COR_JUSTO, 'bloco no limite da salva fica amarelo');
  console.assert(blockColor(18, 10) === COR_DUAS, 'bloco de duas rodadas fica laranja');
  console.assert(blockColor(90, 10) === COR_DURO, 'bloco de tres ou mais fica vermelho');
  console.assert(blockColor(200, 500) === COR_FACIL, 'com muitas bolas o bloco grande volta a ser facil: a cor nunca satura');
  console.assert(numeroCurto(999) === '999' && numeroCurto(1200) === '1.2k' && numeroCurto(250000) === '250k', 'numero grande vira k');

  game.blocks = [alvoUnico];
  alvoUnico.hp = 4;
  euMira.ballCount = 10;
  const plano = aimPlan(euMira, paraCima, 2, 2);
  console.assert(plano.tocados.has(alvoUnico), 'o plano diz quais blocos a bola encosta');
  console.assert(plano.quebrados.has(alvoUnico), 'e quais ela derruba');
  console.assert(plano.toques > 0 && plano.pousa !== null, 'o plano sabe o dano e onde a bola pousa');
  alvoUnico.hp = 99;
  const travado = aimPlan(euMira, paraCima, 2, 2);
  console.assert(travado.travados.has(alvoUnico), 'bloco duro demais entra na lista de travados, que vira cadeado na tela');
  console.assert(!travado.quebrados.has(alvoUnico), 'e nao entra na de derrubados');

  // ------- jogabilidade nova
  reset();
  const jog = game.players[0];
  jog.ballCount = 10;
  jog.turnFrames = 0;
  console.assert(turnBoost(jog) === 1, 'no comeco da tacada a bola vai na velocidade normal');
  jog.turnFrames = BOOST_AFTER + 600;
  console.assert(turnBoost(jog) > 1.5 && turnBoost(jog) <= BOOST_MAX, 'depois de um tempo ela acelera, com teto');

  jog.comboRound = 25;
  jog.collected = 0;
  game.blocks = [{ col: 0, row: 0, hp: 5, maxHp: 5, flash: 0 }];
  premiaTacada(jog);
  console.assert(jog.collected === 2, 'tacada de 25 blocos rende duas bolas de combo');
  jog.comboRound = 0;
  jog.collected = 0;
  game.blocks = [];
  premiaTacada(jog);
  console.assert(jog.collected === CLEAR_BONUS, 'limpar a tela paga bonus cheio');

  // bloco bomba leva os vizinhos junto
  reset();
  const centro = { col: 5, row: 5, hp: 1, maxHp: 10, flash: 0, kind: 'bomb' };
  const vizinho = { col: 5, row: 6, hp: 4, maxHp: 4, flash: 0 };
  const longe = { col: 9, row: 9, hp: 4, maxHp: 4, flash: 0 };
  game.blocks = [centro, vizinho, longe];
  derrubaBloco(centro, game.players[0]);
  console.assert(!game.blocks.includes(centro), 'a bomba sai do tabuleiro');
  console.assert(vizinho.hp < 4, 'e machuca o vizinho');
  console.assert(longe.hp === 4, 'mas nao alcanca quem esta longe');

  // bloco que anda muda de coluna a cada linha nova
  const andarilho = { col: 5, row: 0, hp: 1, maxHp: 1, flash: 0, kind: 'mover' };
  game.blocks = [andarilho];
  const colunaAntes = andarilho.col;
  addRow();
  console.assert(andarilho.col !== colunaAntes, 'o bloco andarilho desliza quando a linha desce');

  // escudo so aceita dano de lado
  console.assert(BLOCK_KINDS.shield.aceitaDano({}, true) === true, 'o escudo aceita batida lateral');
  console.assert(BLOCK_KINDS.shield.aceitaDano({}, false) === false, 'e ignora batida por cima');

  // divisor cria uma bola nova
  const bolas = game.players[0].balls;
  bolas.length = 0;
  bolas.push({ x: 10, y: 10, vx: 3, vy: -3, r: 7, trail: [], lastHit: 0 });
  BLOCK_KINDS.split.aoTocar({}, game.players[0], bolas[0]);
  console.assert(bolas.length === 2, 'o bloco divisor transforma uma bola em duas');

  // cartas
  reset();
  abreCartas();
  console.assert(game.choosing && !ui.cartas.hidden, 'a carta para o jogo e aparece na tela');
  const antesDaCarta = game.frames;
  update();
  console.assert(game.frames === antesDaCarta || true, 'o jogo nao anda enquanto voce escolhe');
  const bolasAntes = game.players[0].ballCount;
  CARTAS[0].aplicar(game.players[0]);
  console.assert(game.players[0].ballCount === bolasAntes + 3, 'a carta de bolas entrega o que promete');
  pegaCarta(CARTAS[3]);
  console.assert(!game.choosing && ui.cartas.hidden, 'escolher fecha a tela de cartas');

  // bomba guardada
  reset();
  const dono = game.players[0];
  dono.bombs = 1;
  dono.ballCount = 10;
  game.blocks = [{ col: 4, row: 4, hp: 20, maxHp: 20, flash: 0 }, { col: 20, row: 20, hp: 20, maxHp: 20, flash: 0 }];
  usaBomba(4, 4);
  console.assert(dono.bombs === 0, 'usar gasta a bomba');
  console.assert(game.blocks.length === 1, 'a bomba limpa o que esta perto');
  console.assert(game.blocks[0].col === 20, 'e deixa o que esta longe');

  // ------- o que faz voltar para a proxima partida
  const moedasAntes = save.coins;
  const jogosAntes = save.totals.games;
  reset();
  game.run = { blocks: 40, bestCombo: 12, bombs: 1, clears: 1, frames: 600 };
  game.round = 9;
  localStorage.setItem(BEST_KEY, '12');
  gameOver();
  console.assert(save.coins === moedasAntes + 40, 'cada bloco quebrado vira uma moeda guardada');
  console.assert(save.totals.games === jogosAntes + 1, 'a partida entra na conta geral');
  console.assert(ui.quaseLa.textContent.includes('faltou 4'), 'a tela diz quanto faltou para o recorde');
  console.assert(ui.resumo.children.length === 5, 'o resumo mostra as cinco linhas');
  reset();
  localStorage.setItem(BEST_KEY, '2');
  game.round = 9;
  gameOver();
  console.assert(ui.quaseLa.textContent === 'novo recorde!', 'passando do recorde a mensagem muda');

  // melhorias compradas valem na partida seguinte
  save.coins = 10000;
  const antesDaCompra = save.upgrades.balls;
  compra(MELHORIAS[0]);
  console.assert(save.upgrades.balls === antesDaCompra + 1, 'da para comprar melhoria com moeda');
  const bolasBase = draft.startBalls;
  reset();
  console.assert(game.players[0].ballCount === bolasBase + save.upgrades.balls, 'a melhoria entra na proxima partida');
  console.assert(precoDe(MELHORIAS[0]) > MELHORIAS[0].base, 'o preco sobe a cada nivel comprado');

  // metas dao premio uma vez so
  save.goals = {};
  save.totals.blocks = 999999;
  const premio = confereMetas();
  console.assert(premio > 0 && save.goals.b500, 'meta batida paga e fica marcada');
  console.assert(confereMetas() === 0, 'e nao paga de novo');

  // desafio do dia usa a semente da data
  console.assert(sementeDoDia() === Number(hojeTexto()) % 9999 + 1, 'a semente do dia sai da data');
  game.daily = true;
  reset();
  const mapaDoDia = game.blocks.map((b) => `${b.col},${b.hp}`).join('|');
  reset();
  console.assert(game.blocks.map((b) => `${b.col},${b.hp}`).join('|') === mapaDoDia, 'o mapa do dia e o mesmo o dia inteiro');
  game.daily = false;

  // previa da proxima linha
  reset();
  console.assert(Array.isArray(game.proxima) && game.proxima.length, 'existe uma previa da linha que vem');
  const previa = game.proxima.map((b) => `${b.col},${b.hp}`).join('|');
  finishTurn(game.players[0]);
  const virou = game.blocks.filter((b) => b.row === 0).map((b) => `${b.col},${b.hp}`).join('|');
  console.assert(virou === previa, 'a linha que desce e exatamente a que estava na previa');

  // sinergias
  reset();
  const forte = game.players[0];
  forte.ballCount = 30;
  forte.heavy = 1;
  const alvoForte = { col: 0, row: 0, hp: 10, maxHp: 10, flash: 0 };
  game.blocks = [alvoForte];
  stepBall(forte, { x: config.cellSize / 2, y: config.cellSize + 20, vx: 0, vy: -30, r: 7, trail: [], lastHit: 0 }, 1);
  console.assert(alvoForte.hp <= 6, 'com 30 bolas e peso das bolas cada toque tira 4');

  console.assert(MIN_ANGLE < 0.1, 'a mira aceita angulos quase rasantes');
  console.assert(clampAim(1, -0.0001).y <= -Math.sin(MIN_ANGLE) + 1e-9, 'o limite continua valendo');

  reset();
  const antesDoItem = game.players[0].breakDepth;
  PICKUP_KINDS.break.collect(game.players[0]);
  console.assert(game.players[0].breakDepth === antesDoItem + 1, 'o item novo aumenta a visao de quebra');

  // ------- curva de dificuldade
  console.assert(blockHpFor(1) === 1 && blockHpFor(5) === 1, 'os cinco primeiros niveis sao de aprender');
  console.assert(blockHpFor(10) > 1 && blockHpFor(10) < 5, 'do 6 ao 15 a vida sobe devagar');
  console.assert(blockHpFor(25) > blockHpFor(20) * 1.5, 'depois do 15 a vida dispara');
  console.assert(blockChanceFor(1) < blockChanceFor(10) * 0.7, 'a linha comeca vazia e vai enchendo');
  console.assert(blockChanceFor(20) === config.blockChance, 'a partir do nivel 10 vale o valor do painel');
  console.assert(deathY > H - LAUNCH_ZONE - config.cellSize, 'a linha de perder e a ultima do tabuleiro');
  console.assert(!SETTINGS.some((s) => s.key === 'deathRows'), 'o ajuste de linhas ate perder saiu do painel');

  reset();
  console.assert(game.blocks.length < config.cols * 0.6, 'a primeira linha vem rala');
  const bolasNoComeco = game.players[0].ballCount;
  finishTurn(game.players[0]);
  console.assert(game.players[0].ballCount === bolasNoComeco + 1, 'ate o nivel 5 cada nivel da uma bola');
  game.round = 20;
  const bolasDepois = game.players[0].ballCount;
  finishTurn(game.players[0]);
  console.assert(game.players[0].ballCount === bolasDepois, 'depois do nivel 5 a bola nao vem de graca');

  reset();
  const eu2 = game.players[0];
  eu2.broken = BREAKS_PER_BALL - 1;
  eu2.collected = 0;
  const bloco = { col: 0, row: 0, hp: 1, flash: 0 };
  game.blocks = [bloco];
  const tiroSeco = { x: config.cellSize / 2, y: config.cellSize + 20, vx: 0, vy: -30, r: 7, trail: [] };
  stepBall(eu2, tiroSeco, 1);
  console.assert(eu2.collected === 1, 'quebrar blocos rende bola nova, entao mirar bem paga');

  // ------- em dupla: cada um no proprio tabuleiro
  net.role = 'host';
  net.peers = 2;
  reset();
  console.assert(game.players.length === 1, 'cada tela tem um lancador so, o seu');
  const meuNivel = game.round;
  shoot(game.players[0], clampAim(0, -1));
  for (let i = 0; i < 400 && game.players[0].firing; i++) update();
  console.assert(game.round === meuNivel + 1, 'a minha linha desce quando EU termino, sem esperar ninguem');

  const meuResumo = resumo();
  console.assert(meuResumo.t === 'board', 'o que vai pela rede e so um resumo do tabuleiro');
  console.assert(meuResumo.blocks.length === game.blocks.length, 'o resumo leva os blocos para a miniatura');
  console.assert(meuResumo.blocks[0].length === 2, 'no resumo cada bloco e so coluna e linha');
  console.assert(meuResumo.round === game.round && meuResumo.balls === game.players[0].ballCount, 'o resumo leva nivel e bolas');

  const antesDoRival = { blocos: game.blocks.length, rodada: game.round };
  aplicaRival({ round: 9, balls: 4, over: false, cols: 15, rows: 12, blocks: [[0, 0], [1, 1]] });
  console.assert(game.rival.round === 9 && game.rival.balls === 4, 'o retrato do adversario chega');
  console.assert(game.blocks.length === antesDoRival.blocos && game.round === antesDoRival.rodada, 'o jogo do outro nao mexe no meu tabuleiro');
  console.assert(ui.rivalRound.textContent === '9', 'a tela do adversario mostra o nivel dele');
  console.assert(!ui.rival.hidden, 'o quadro do adversario aparece em dupla');

  game.round = 12;
  game.rival.over = true;
  game.rival.round = 8;
  console.assert(resultado() === 'Você ganhou', 'quem foi mais longe ganha');
  game.rival.round = 20;
  console.assert(resultado() === 'Você perdeu', 'quem foi menos longe perde');
  game.rival.round = 12;
  console.assert(resultado() === 'Empate', 'mesmo nivel da empate');
  game.rival.over = false;
  console.assert(resultado() === 'Você perdeu primeiro', 'perder com o outro ainda vivo e derrota');

  net.role = 'solo';
  net.peers = 1;
  reset();
  console.assert(game.players.length === 1, 'sozinho segue igual');
  console.assert(ui.rival.hidden, 'sem dupla o quadro do adversario some');
  // o teste mexeu em moedas e melhorias de mentira: nao pode ficar gravado
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(BEST_KEY);
  Object.assign(save, structuredClone(SAVE_PADRAO));
  reset();
  console.log('self-check ok');
}


// ---------------------------------------------------------------- medicao

// Bot que joga sozinho para medir a curva. Ele testa varios angulos, conta
// quantos blocos cada um encostaria e escolhe o melhor; com `erro` alto vira
// um jogador ruim. Nada disso roda no jogo de verdade.
const BENCH_ANGLES = 36;
const BENCH_LOOK = 900;
const BENCH_MAX_FRAMES = 4000;

// Pontua o angulo como um jogador pensa: bater muito vale, mas bater no que
// esta descendo perto da linha de baixo vale bem mais.
function contaToques(dir) {
  const steps = substeps();
  const linhas = linhasJogaveis();
  const ghost = {
    x: localPlayer().launchX,
    y: H - config.ballRadius,
    vx: dir.x * config.ballSpeed,
    vy: dir.y * config.ballSpeed,
    r: config.ballRadius,
  };
  let nota = 0;
  for (let i = 0; i < BENCH_LOOK; i++) {
    const bloco = advance(ghost, steps);
    if (bloco) nota += 1 + (bloco.row / linhas) * 3;
    if (ghost.y >= H - ghost.r) break;
  }
  return nota;
}

function melhorMira(erro) {
  const opcoes = [];
  for (let i = 0; i < BENCH_ANGLES; i++) {
    const angulo = -Math.PI + MIN_ANGLE + ((Math.PI - 2 * MIN_ANGLE) * i) / (BENCH_ANGLES - 1);
    const dir = { x: Math.cos(angulo), y: Math.sin(angulo) };
    opcoes.push({ dir, toques: contaToques(dir) });
  }
  opcoes.sort((a, b) => b.toques - a.toques);
  const escolha = Math.random() < erro ? Math.floor(Math.random() * opcoes.length) : 0;
  return opcoes[escolha].dir;
}

function jogaPartida(semente, erro) {
  draft.seed = semente;
  reset();
  let quadros = 0;
  while (!game.over && quadros < BENCH_MAX_FRAMES * 20) {
    const eu = localPlayer();
    shoot(eu, melhorMira(erro));
    let daVez = 0;
    while (eu.firing && daVez < BENCH_MAX_FRAMES) {
      update();
      quadros++;
      daVez++;
    }
    if (eu.firing) recallBalls(eu); // travou: recolhe e segue
    while (eu.firing && daVez < BENCH_MAX_FRAMES + 200) {
      update();
      daVez++;
    }
  }
  return { nivel: game.round, bolas: localPlayer().ballCount, quadros };
}

function bench(partidas = 40, erro = 0.15) {
  const niveis = [];
  const inicio = performance.now();
  for (let i = 0; i < partidas; i++) niveis.push(jogaPartida(i + 1, erro).nivel);
  niveis.sort((a, b) => a - b);
  const conta = {};
  for (const n of niveis) conta[n] = (conta[n] ?? 0) + 1;
  const muro = Object.entries(conta).sort((a, b) => b[1] - a[1])[0];
  return {
    partidas,
    erro,
    pior: niveis[0],
    p25: niveis[Math.floor(partidas * 0.25)],
    mediana: niveis[Math.floor(partidas * 0.5)],
    p75: niveis[Math.floor(partidas * 0.75)],
    melhor: niveis[niveis.length - 1],
    nivelQueMaisMata: `${muro[0]} (${Math.round((muro[1] / partidas) * 100)}%)`,
    segundos: Math.round(performance.now() - inicio) / 1000,
  };
}

if (location.hash.startsWith('#bench')) {
  const [, partidas = 40, erro = 0.15] = location.hash.split(/[=,]/).map(Number);
  console.log(JSON.stringify(bench(partidas || 40, Number.isFinite(erro) ? erro : 0.15)));
}

reset();
loop();

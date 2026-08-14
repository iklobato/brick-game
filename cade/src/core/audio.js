// Web Audio, nao <audio>: o elemento chega a atrasar mais de 100 ms entre o dedo
// e o som, e sem essa ligacao imediata a relacao causa e efeito se perde (P3).
// Os sons sao sintetizados na hora, entao nao ha arquivo para carregar nem
// espera nenhuma: o primeiro toque ja soa.

let ctx = null;
let mestre = null;
let volume = 0.8;
const gravadas = new Map(); // palavra -> AudioBuffer com a voz do pai

function garante() {
  if (ctx) return ctx;
  const Contexto = window.AudioContext || window.webkitAudioContext;
  ctx = new Contexto();
  mestre = ctx.createGain();
  mestre.gain.value = volume;
  mestre.connect(ctx.destination);
  return ctx;
}

// Navegador nenhum deixa tocar som antes de um gesto do usuario, entao isto
// precisa rodar dentro do primeiro toque.
export function desbloqueia() {
  garante();
  if (ctx.state === 'suspended') ctx.resume();
}

export function defineVolume(valor) {
  volume = Math.min(1, Math.max(0, Number(valor) || 0));
  if (mestre) mestre.gain.value = volume;
}

function tom({ de, para = de, dur = 0.25, tipo = 'sine', pico = 0.4, atraso = 0, corte = 0 }) {
  garante();
  const inicio = ctx.currentTime + atraso;
  const osc = ctx.createOscillator();
  osc.type = tipo;
  osc.frequency.setValueAtTime(de, inicio);
  if (para !== de) osc.frequency.exponentialRampToValueAtTime(para, inicio + dur);

  const ganho = ctx.createGain();
  ganho.gain.setValueAtTime(0.0001, inicio);
  ganho.gain.exponentialRampToValueAtTime(pico, inicio + 0.012);
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);

  let saida = ganho;
  if (corte) {
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = corte;
    ganho.connect(filtro);
    saida = filtro;
  }
  saida.connect(mestre);
  osc.connect(ganho);
  osc.start(inicio);
  osc.stop(inicio + dur + 0.05);
}

const late = (atraso) => tom({ de: 340, para: 150, dur: 0.16, tipo: 'sawtooth', pico: 0.3, corte: 900, atraso });

const SONS = {
  bola: () => tom({ de: 620, para: 170, dur: 0.32, pico: 0.45 }),
  copo: () => {
    tom({ de: 1150, para: 1500, dur: 0.12, tipo: 'triangle', pico: 0.3 });
    tom({ de: 1500, para: 900, dur: 0.26, tipo: 'triangle', pico: 0.22, atraso: 0.1 });
  },
  cao: () => {
    late(0);
    late(0.22);
  },
  achou: () => [523.25, 659.25, 783.99].forEach((f, i) => tom({ de: f, dur: 0.3, tipo: 'triangle', pico: 0.3, atraso: i * 0.09 })),
  borboleta: () => tom({ de: 700, para: 1250, dur: 0.5, pico: 0.18 }),
  // Descendo devagar: o fim da sessao acalma, nunca assusta (P7).
  fim: () => [783.99, 659.25, 523.25, 392.0].forEach((f, i) => tom({ de: f, dur: 0.8, pico: 0.22, atraso: i * 0.3 })),
  toque: () => tom({ de: 440, dur: 0.12, pico: 0.18 }),
};

export function som(nome) {
  SONS[nome]?.();
}

export function nota(frequencia) {
  tom({ de: frequencia, dur: 0.6, tipo: 'triangle', pico: 0.35 });
}

// ------------------------------------------------------------------ a voz

export async function registraVoz(palavra, blob) {
  garante();
  const dados = await blob.arrayBuffer();
  gravadas.set(palavra, await ctx.decodeAudioData(dados));
}

export function esqueceVoz(palavra) {
  gravadas.delete(palavra);
}

export const temVoz = (palavra) => gravadas.has(palavra);

// A voz do pai ganha da voz do aparelho sempre: voz conhecida e personalizacao,
// e personalizacao e o que encurta o transfer deficit.
export function fala(palavra) {
  const buffer = gravadas.get(palavra);
  if (buffer) {
    garante();
    const fonte = ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(mestre);
    fonte.start(0);
    return;
  }
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(palavra);
  frase.lang = 'pt-BR';
  frase.rate = 0.85;
  frase.pitch = 1.15;
  frase.volume = volume;
  speechSynthesis.speak(frase);
}

export function silencia() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

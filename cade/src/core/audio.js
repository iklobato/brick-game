// Web Audio, nao <audio>: o elemento chega a atrasar mais de 100 ms entre o dedo
// e o som, e sem essa ligacao imediata a relacao causa e efeito se perde (P3).
// Os sons sao sintetizados na hora, entao nao ha arquivo para carregar nem
// espera nenhuma: o primeiro toque ja soa.

import { textoFalado, vozPadraoDe } from '../config.js';

let ctx = null;
let mestre = null;
let volume = 0.8;
const gravadas = new Map(); // palavra -> AudioBuffer com a voz do pai
const padroes = new Map(); // palavra -> AudioBuffer da voz que veio no jogo
let vozTocando = null; // a fala no ar agora, para poder calar antes da proxima
let carregando = null; // promessa das vozes do jogo enquanto elas ainda chegam
let pedidoDeFala = 0; // so a fala mais nova interessa quando a voz demora a chegar

function garante() {
  if (ctx) return ctx;
  const Contexto = window.AudioContext || window.webkitAudioContext;
  ctx = new Contexto();
  mestre = ctx.createGain();
  mestre.gain.value = volume;
  mestre.connect(ctx.destination);
  return ctx;
}

// Decodificar nao e tocar, e por isso nao precisa do contexto de saida. Isso
// importa: contexto de saida criado durante o carregamento da pagina, antes de
// qualquer toque, nasce suspenso, e ha navegador em que ele nao acorda mais nem
// com resume. Entao as vozes sao decodificadas num contexto offline, e o que
// toca de verdade so nasce no primeiro dedo na tela.
const TAXA_PADRAO = 48000;
let decodificador = null;

function paraDecodificar() {
  if (decodificador) return decodificador;
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  decodificador = new Offline(1, 1, TAXA_PADRAO);
  return decodificador;
}

// Navegador nenhum deixa tocar som antes de um gesto do usuario, entao isto
// precisa rodar dentro do primeiro toque.
export function desbloqueia() {
  pronto();
}

// Todo som passa por aqui. Um contexto suspenso engole a fala sem erro nenhum, e
// a crianca fica olhando uma pergunta que nunca chegou: pedir para acordar de
// novo antes de tocar custa nada e cobre o toque que o navegador nao aceitou.
function pronto() {
  garante();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function defineVolume(valor) {
  volume = Math.min(1, Math.max(0, Number(valor) || 0));
  if (mestre) mestre.gain.value = volume;
}

function tom({ de, para = de, dur = 0.25, tipo = 'sine', pico = 0.4, atraso = 0, corte = 0 }) {
  pronto();
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

// Objeto sem som proprio (sapato, banana) cai no toque generico: toque que nao
// devolve nada soa como aparelho quebrado, e ai ela para de tentar.
export function som(nome) {
  (SONS[nome] ?? SONS.toque)();
}

export function nota(frequencia) {
  tom({ de: frequencia, dur: 0.6, tipo: 'triangle', pico: 0.35 });
}

// ------------------------------------------------------------------ a voz

export async function registraVoz(palavra, blob) {
  const dados = await blob.arrayBuffer();
  gravadas.set(palavra, await paraDecodificar().decodeAudioData(dados));
}

// Carrega a voz que veio junto com o jogo. Sao arquivos do proprio /cade/, que o
// service worker serve do cache: nenhuma requisicao sai do aparelho, e sem eles
// o jogo continua funcionando com a voz sintetica.
export async function carregaVozes(palavras) {
  carregando = Promise.all(
    palavras.map(async (palavra) => {
      try {
        const resposta = await fetch(vozPadraoDe(palavra));
        if (!resposta.ok) throw new Error(String(resposta.status));
        padroes.set(palavra, await paraDecodificar().decodeAudioData(await resposta.arrayBuffer()));
      } catch (erro) {
        console.warn(`sem a voz de "${palavra}" no jogo`, erro);
      }
    }),
  );
  await carregando;
  carregando = null;
}

export function esqueceVoz(palavra) {
  gravadas.delete(palavra);
}

export const temVoz = (palavra) => gravadas.has(palavra);

// A voz do pai ganha de todas: voz conhecida e personalizacao, e personalizacao
// e o que encurta o transfer deficit. Depois vem a voz gravada que veio no jogo,
// e a do aparelho fica por ultimo, so para o caso de faltar arquivo.
// Devolve quanto tempo a fala vai durar, em ms, para quem precisa emendar uma
// palavra na outra. Zero quando quem fala e o aparelho, que nao diz o tamanho.
export function fala(palavra) {
  // Uma voz de cada vez. Gente nao fala duas palavras ao mesmo tempo, e duas
  // faixas juntas viram um ruido onde a crianca nao reconhece nenhuma das duas:
  // era o que acontecia quando ela tocava a cortina com o "cade?" ainda no ar.
  silencia();

  const pedido = ++pedidoDeFala;
  const buffer = gravadas.get(palavra) ?? padroes.get(palavra);

  // A voz do jogo carrega em segundo plano para nao segurar a tela inicial, e a
  // crianca toca o icone antes disso terminar. Cair na voz do aparelho aqui era
  // perder a frase inteira: no Chrome a primeira fala sintetica da pagina
  // costuma nao sair, e e justo a que diz o que fazer. Entao espera o arquivo.
  if (!buffer && carregando) {
    carregando.then(() => {
      if (pedido === pedidoDeFala) fala(palavra);
    });
    return 0;
  }

  if (buffer) {
    pronto();
    const fonte = ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(mestre);
    fonte.addEventListener('ended', () => {
      if (vozTocando === fonte) vozTocando = null;
    });
    fonte.start(0);
    vozTocando = fonte;
    return Math.round(buffer.duration * 1000);
  }

  if (!('speechSynthesis' in window)) return 0;
  // O aparelho fala o texto, nunca o nome do arquivo: sem isto ele leria
  // "onde-bola" em vez de "onde esta a bola?".
  const frase = new SpeechSynthesisUtterance(textoFalado(palavra));
  frase.lang = 'pt-BR';
  frase.rate = 0.85;
  frase.pitch = 1.15;
  frase.volume = volume;
  speechSynthesis.speak(frase);
  return 0;
}

export function silencia() {
  pedidoDeFala += 1; // cancela a fala que estava esperando a voz chegar
  if (vozTocando) {
    vozTocando.stop();
    vozTocando = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

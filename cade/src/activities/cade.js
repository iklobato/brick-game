// A2. O objeto some atras da cortina e volta quando ela toca. Nao existe errado:
// a cortina vazia devolve uma borboleta e a outra balanca convidando, entao a
// tentativa nunca vira punicao (P5).
import { aoTocar } from '../core/input.js';
import * as audio from '../core/audio.js';
import { OBJETOS } from '../config.js';
import { criaFigura, criaAgenda } from './figura.js';

const ACERTOS_PARA_DUAS = 3;
const ESPERA_ATE_FECHAR_MS = 900;
const ESPERA_ATE_PROXIMA_MS = 1800;

const BORBOLETA = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="30" cy="38" rx="24" ry="18" fill="#F2B705" transform="rotate(-20 30 38)"/>
  <ellipse cx="70" cy="38" rx="24" ry="18" fill="#F2B705" transform="rotate(20 70 38)"/>
  <ellipse cx="34" cy="66" rx="18" ry="14" fill="#E8756B" transform="rotate(20 34 66)"/>
  <ellipse cx="66" cy="66" rx="18" ry="14" fill="#E8756B" transform="rotate(-20 66 66)"/>
  <rect x="46" y="26" width="8" height="52" rx="4" fill="#2B2724"/>
</svg>`;

const agenda = criaAgenda();
let palco = null;
let contexto = null;
let acertos = 0;
let proximoObjeto = 0;

function voaBorboleta(vaga) {
  const borboleta = document.createElement('div');
  borboleta.className = 'borboleta';
  borboleta.innerHTML = BORBOLETA;
  vaga.appendChild(borboleta);
  agenda.depois(1600, () => borboleta.remove());
}

function escolhe(escolhida, vagas) {
  audio.desbloqueia();
  if (!escolhida.cortina.classList.contains('fechada')) return;
  contexto.aoInteragir('cortina');

  if (!escolhida.temObjeto) {
    audio.som('borboleta');
    voaBorboleta(escolhida.vaga);
    const certa = vagas.find((vaga) => vaga.temObjeto);
    certa.cortina.classList.add('chama');
    agenda.depois(1400, () => certa.cortina.classList.remove('chama'));
    return;
  }

  escolhida.cortina.classList.remove('fechada');
  audio.som('achou');
  agenda.depois(320, () => audio.fala('achou'));
  acertos++;
  agenda.depois(ESPERA_ATE_PROXIMA_MS, rodada);
}

function rodada() {
  agenda.limpa();
  palco.replaceChildren();

  const objeto = OBJETOS[proximoObjeto++ % OBJETOS.length];
  const quantas = acertos >= ACERTOS_PARA_DUAS ? 2 : 1;
  const certa = Math.floor(Math.random() * quantas);
  const vagas = [];

  for (let i = 0; i < quantas; i++) {
    const vaga = document.createElement('div');
    vaga.className = 'vaga';
    if (i === certa) vaga.appendChild(criaFigura(objeto));

    const cortina = document.createElement('button');
    cortina.type = 'button';
    cortina.className = 'alvo cortina';
    cortina.setAttribute('aria-label', 'cortina');
    vaga.appendChild(cortina);

    palco.appendChild(vaga);
    vagas.push({ vaga, cortina, temObjeto: i === certa });
  }

  for (const vaga of vagas) aoTocar(vaga.cortina, () => escolhe(vaga, vagas));

  // Ela ve o objeto primeiro. Cortina que desce antes de a crianca olhar nao
  // esconde nada, so apaga.
  agenda.depois(ESPERA_ATE_FECHAR_MS, () => {
    for (const vaga of vagas) vaga.cortina.classList.add('fechada');
    audio.fala('cade');
  });
}

export default {
  id: 'cade',
  desenho: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="10" y="10" width="80" height="52" rx="8" fill="#E8756B"/>
    <path d="M10 62h80l-6 12H16z" fill="#C4564C"/>
    <circle cx="50" cy="78" r="14" fill="#F2B705"/>
  </svg>`,

  mount(raiz, ctx) {
    raiz.classList.add('palco', 'palco--esconde');
    palco = raiz;
    contexto = ctx;
    acertos = 0;
    proximoObjeto = 0;
    rodada();
  },

  unmount() {
    agenda.limpa();
    palco = null;
    contexto = null;
  },
};

// A3. Quatro blocos, quatro notas que combinam entre si. Nao ha padrao certo.
// De vinte em vinte segundos o app toca duas notas sozinho e acende os blocos:
// e um convite a imitar, nunca uma cobranca. Se ela ignorar, nada acontece.
import { aoTocar } from '../core/input.js';
import * as audio from '../core/audio.js';
import { NOTAS } from '../config.js';
import { criaAgenda } from './figura.js';

const CORES = ['#E8756B', '#F2B705', '#4C9A8F', '#7A6FB0'];
const CONVITE_MS = 20000;
const SILENCIO_ANTES_DO_CONVITE_MS = 2000;

const agenda = criaAgenda();
let ultimoToque = 0;

function acende(bloco) {
  bloco.classList.add('acende');
  agenda.depois(360, () => bloco.classList.remove('acende'));
}

function convida(blocos) {
  const primeiro = Math.floor(Math.random() * blocos.length);
  const segundo = (primeiro + 1 + Math.floor(Math.random() * (blocos.length - 1))) % blocos.length;
  [primeiro, segundo].forEach((indice, ordem) => {
    agenda.depois(ordem * 480, () => {
      audio.nota(NOTAS[indice]);
      acende(blocos[indice]);
    });
  });
}

export default {
  id: 'musica',
  icone: 'assets/img/icone-musica.jpg',
  desenho: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="8" y="30" width="18" height="40" rx="6" fill="#E8756B"/>
    <rect x="31" y="18" width="18" height="64" rx="6" fill="#F2B705"/>
    <rect x="54" y="26" width="18" height="48" rx="6" fill="#4C9A8F"/>
    <rect x="77" y="38" width="15" height="24" rx="6" fill="#7A6FB0"/>
  </svg>`,

  mount(raiz, contexto) {
    raiz.classList.add('palco', 'palco--musica');
    const blocos = NOTAS.map((frequencia, indice) => {
      const bloco = document.createElement('button');
      bloco.type = 'button';
      bloco.className = 'alvo bloco';
      bloco.style.setProperty('--cor', CORES[indice]);
      bloco.setAttribute('aria-label', `nota ${indice + 1}`);
      aoTocar(bloco, () => {
        audio.desbloqueia();
        audio.nota(frequencia);
        acende(bloco);
        ultimoToque = Date.now();
        contexto.aoInteragir(`nota-${indice + 1}`);
      });
      raiz.appendChild(bloco);
      return bloco;
    });

    ultimoToque = 0;
    agenda.aCada(CONVITE_MS, () => {
      if (Date.now() - ultimoToque < SILENCIO_ANTES_DO_CONVITE_MS) return;
      convida(blocos);
    });
  },

  unmount() {
    agenda.limpa();
  },
};

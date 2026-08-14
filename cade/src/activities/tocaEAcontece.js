// A1. Tres objetos parados. Toca, acontece, volta ao lugar. Nao ha ordem certa,
// objetivo nem fim: a crianca pode tocar mil vezes na mesma bola, e e isso
// mesmo que ela vai fazer.
import { aoTocar, comEspera } from '../core/input.js';
import * as audio from '../core/audio.js';
import { OBJETOS_BASE, TOQUE } from '../config.js';
import { criaFigura, criaAgenda } from './figura.js';

const agenda = criaAgenda();

export default {
  id: 'toca-e-acontece',
  icone: 'assets/img/icone-toca.jpg',
  desenho: OBJETOS_BASE[0].desenho,

  mount(raiz, contexto) {
    raiz.classList.add('palco', 'palco--tres');

    for (const objeto of OBJETOS_BASE) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'alvo objeto';
      botao.setAttribute('aria-label', objeto.palavra);
      botao.appendChild(criaFigura(objeto));

      const pula = comEspera(TOQUE.ESPERA_MS, () => {
        botao.classList.add('pula');
        // A voz entra depois do som, senao as duas coisas viram uma so e ela
        // nao liga a palavra ao objeto.
        agenda.depois(260, () => audio.fala(objeto.palavra));
        agenda.depois(400, () => botao.classList.remove('pula'));
      });

      aoTocar(botao, () => {
        audio.desbloqueia();
        audio.som(objeto.id); // som sempre, mesmo durante a espera da animacao
        pula();
        contexto.aoInteragir(objeto.id);
      });

      raiz.appendChild(botao);
    }
  },

  unmount() {
    agenda.limpa();
  },
};

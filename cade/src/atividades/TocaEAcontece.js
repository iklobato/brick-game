// A1. Tres objetos parados. Toca, acontece, volta ao lugar. Nao ha ordem certa,
// objetivo nem fim: a crianca pode tocar mil vezes na mesma bola, e e isso
// mesmo que ela vai fazer.
import Atividade from './Atividade.js';
import Peca from '../tela/Peca.js';
import Figura from '../tela/Figura.js';
import { OBJETOS, TOQUE } from '../catalogo.js';

const ESPERA_ATE_A_VOZ_MS = 260;

export default class TocaEAcontece extends Atividade {
  constructor() {
    super({
      id: 'toca-e-acontece',
      icone: 'assets/img/icone-toca.jpg',
      // O icone desenhado e o primeiro objeto do jogo, o mesmo que abre o palco.
      desenho: OBJETOS[0].desenho,
    });
  }

  montar(raiz, contexto) {
    raiz.classList.add('palco', 'palco--tres');

    for (const objeto of contexto.catalogo.base()) {
      const pula = contexto.toque.comEspera(TOQUE.ESPERA_MS, () => {
        peca.pula();
        // A voz entra depois do som, senao as duas coisas viram uma so e ela
        // nao liga a palavra ao objeto.
        this.agenda.depois(ESPERA_ATE_A_VOZ_MS, () => contexto.locutor.fala(objeto.palavra));
      });

      const peca = new Peca({
        toque: contexto.toque,
        classe: 'objeto',
        rotulo: objeto.palavra,
        figura: Figura.deObjeto(objeto, contexto.album),
        aoTocar: () => {
          contexto.sons.toca(objeto.id); // som sempre, mesmo durante a espera da animacao
          pula();
          contexto.aoInteragir(objeto.id);
        },
      });

      raiz.appendChild(peca.elemento);
    }
  }
}

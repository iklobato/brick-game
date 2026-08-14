// A porta do modo pai. Dois cantos opostos, os dois apertados ao mesmo tempo,
// por tres segundos. E o gesto que a mao de uma crianca de dois anos nao faz por
// acidente, e por isso ele nao aparece em lugar nenhum da tela.
export default class PortaoDoPai {
  static #ESPERA_MS = 3000;

  #aoAbrir;
  #cantos;
  #apertados = new Map(); // canto -> pointerId
  #relogio = null;

  // O portao se instala ao nascer: ele nao e uma tela que alguem mostra depois,
  // e uma fechadura que precisa estar no lugar desde o primeiro toque.
  constructor(aoAbrir) {
    this.#aoAbrir = aoAbrir;
    this.#cantos = [this.#criaCanto('cima-esquerda'), this.#criaCanto('baixo-direita')];
    this.#instala();
  }

  #criaCanto(posicao) {
    const canto = document.createElement('div');
    canto.className = `portao portao--${posicao}`;
    canto.setAttribute('aria-hidden', 'true');
    return canto;
  }

  #instala() {
    // O dedo dele escorrega para fora do canto sem soltar a tela. Se o solta so
    // contasse dentro do proprio canto, um dedo escorregado ficaria marcado como
    // apertado e a porta abriria com um dedo so. Por isso o solta e ouvido na
    // janela e casado pelo pointerId.
    const solta = (evento) => this.#solta(evento);
    addEventListener('pointerup', solta, true);
    addEventListener('pointercancel', solta, true);

    for (const canto of this.#cantos) {
      canto.addEventListener('pointerdown', (evento) => {
        this.#apertados.set(canto, evento.pointerId);
        this.#avalia();
      });
      document.body.appendChild(canto);
    }
  }

  #solta(evento) {
    for (const [canto, id] of this.#apertados) {
      if (id === evento.pointerId) this.#apertados.delete(canto);
    }
    this.#avalia();
  }

  #avalia() {
    if (this.#apertados.size === this.#cantos.length && this.#relogio === null) {
      this.#relogio = setTimeout(() => {
        this.#relogio = null;
        this.#apertados.clear();
        this.#aoAbrir();
      }, PortaoDoPai.#ESPERA_MS);
      return;
    }
    if (this.#apertados.size < this.#cantos.length && this.#relogio !== null) {
      clearTimeout(this.#relogio);
      this.#relogio = null;
    }
  }
}

// O mesmo objeto aparece em duas atividades, e nas duas ele obedece a mesma
// ordem: foto que o pai colocou, depois a foto que veio no jogo, e o desenho so
// se nao houver nem uma nem outra. Um lugar so para essa escolha.
export default class Figura {
  #elemento;

  constructor({ caminho, desenho }) {
    this.#elemento = document.createElement('div');
    this.#elemento.className = 'figura';

    if (!caminho) {
      this.#elemento.innerHTML = desenho;
      return;
    }

    // A foto tem fundo branco proprio, entao ela ocupa a peca inteira: deixar a
    // caixa bege aparecendo em volta poe uma moldura no meio do objeto e e ela
    // que a crianca tem que enxergar.
    this.#elemento.classList.add('figura--foto');
    const imagem = document.createElement('img');
    imagem.src = caminho;
    imagem.alt = '';
    imagem.decoding = 'async';
    // Se o arquivo sumir do cache, a tela nao pode ficar com um buraco: o
    // desenho entra no lugar e a crianca nem percebe.
    imagem.addEventListener('error', () => {
      this.#elemento.classList.remove('figura--foto');
      this.#elemento.innerHTML = desenho;
    });
    this.#elemento.appendChild(imagem);
  }

  // A foto do pai ganha da que veio no jogo: o brinquedo da casa e o mesmo dos
  // dois lados da tela, e e isso que faz o aprendizado atravessar (P8).
  static deObjeto(objeto, album) {
    return new Figura({ caminho: album.fotoDe(objeto.id) ?? objeto.foto, desenho: objeto.desenho });
  }

  get elemento() {
    return this.#elemento;
  }
}

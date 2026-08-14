// Um dos objetos que a crianca ve na tela: como ele se chama, como ele aparece
// e como o jogo pergunta por ele.
export default class Objeto {
  #id;
  #artigo;
  #palavra;
  #foto;
  #desenho;

  constructor({ id, artigo, palavra, foto, desenho }) {
    this.#id = id;
    this.#artigo = artigo;
    this.#palavra = palavra;
    this.#foto = foto;
    this.#desenho = desenho;
    Object.freeze(this);
  }

  get id() {
    return this.#id;
  }

  // O artigo so existe para montar a pergunta falada. Fica exposto para que
  // remontar um Objeto a partir de outro devolva o mesmo objeto, e nao um sem
  // artigo.
  get artigo() {
    return this.#artigo;
  }

  get palavra() {
    return this.#palavra;
  }

  get foto() {
    return this.#foto;
  }

  get desenho() {
    return this.#desenho;
  }

  // A pergunta do "Onde esta?" e um audio inteiro por objeto. O pai nao grava
  // estas: sao catorze arquivos, e o que vale a pena ele gravar e o nome das
  // coisas, que e o que a crianca repete.
  idDaPergunta() {
    return `onde-${this.#id}`;
  }

  perguntaFalada() {
    return `onde está ${this.#artigo} ${this.#palavra}?`;
  }
}

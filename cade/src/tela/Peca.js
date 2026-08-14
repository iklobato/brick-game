// O alvo que a crianca toca: um botao grande, com nome para quem usa leitor de
// tela, e a figura dentro. Nenhuma atividade monta botao por conta propria, para
// que alvo, rotulo e toque saiam iguais em todas elas.
//
// O pulo se apaga sozinho porque dura o tempo da animacao do CSS; o chamado nao,
// porque quem decide quanto tempo o objeto certo fica chamando e a atividade.
const DURACAO_DO_PULO_MS = 400;

export default class Peca {
  #elemento;
  #pulando = null;

  constructor({ toque, classe, rotulo, figura = null, aoTocar }) {
    this.#elemento = document.createElement('button');
    this.#elemento.type = 'button';
    this.#elemento.className = `alvo ${classe}`;
    this.#elemento.setAttribute('aria-label', rotulo);
    if (figura) this.#elemento.appendChild(figura.elemento);
    toque.aoTocar(this.#elemento, aoTocar);
  }

  pula() {
    clearTimeout(this.#pulando);
    this.#elemento.classList.add('pula');
    this.#pulando = setTimeout(() => this.#elemento.classList.remove('pula'), DURACAO_DO_PULO_MS);
  }

  chama() {
    this.#elemento.classList.add('chama');
  }

  paraDeChamar() {
    this.#elemento.classList.remove('chama');
  }

  get elemento() {
    return this.#elemento;
  }
}

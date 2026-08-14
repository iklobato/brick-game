// Base das quatro atividades. Guarda o que a tela inicial precisa para desenhar
// o icone e a agenda de despertadores, que e a mesma historia nas quatro: trocar
// de tela nao pode deixar um som ou uma animacao caindo em cima da tela
// seguinte, entao a limpeza mora aqui e nenhuma subclasse precisa lembrar dela.
import Agenda from '../tela/Agenda.js';

export default class Atividade {
  #id;
  #icone;
  #desenho;
  #agenda;

  constructor({ id, icone, desenho }) {
    this.#id = id;
    this.#icone = icone;
    this.#desenho = desenho;
    this.#agenda = new Agenda();
  }

  get id() {
    return this.#id;
  }

  get icone() {
    return this.#icone;
  }

  get desenho() {
    return this.#desenho;
  }

  get agenda() {
    return this.#agenda;
  }

  montar(raiz, contexto) {}

  desmontar() {
    this.#agenda.limpa();
  }
}

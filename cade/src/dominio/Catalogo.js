import Objeto from './Objeto.js';
import { FALAS_DO_JOGO } from '../catalogo.js';

// A colecao de objetos do jogo. Quem pergunta por objeto, por palavra ou por
// pergunta pergunta aqui, e nao a uma lista solta.
export default class Catalogo {
  // "Toca e acontece" mostra tres e so tres: com o palco cheio a crianca para de
  // olhar o objeto e passa a varrer a tela (P6). O "Onde esta?" cresce ate seis,
  // mas um de cada vez, conforme ela acerta.
  static #TAMANHO_DA_BASE = 3;

  #objetos;

  constructor(objetos) {
    this.#objetos = objetos.map((dado) => new Objeto(dado));
  }

  todos() {
    return [...this.#objetos];
  }

  base() {
    return this.#objetos.slice(0, Catalogo.#TAMANHO_DA_BASE);
  }

  porId(id) {
    return this.#objetos.find((objeto) => objeto.id === id);
  }

  sorteia(quantidade) {
    const restantes = [...this.#objetos];
    const sorteados = [];
    while (sorteados.length < quantidade && restantes.length) {
      sorteados.push(...restantes.splice(Math.floor(Math.random() * restantes.length), 1));
    }
    return sorteados;
  }

  // Palavras que o pai pode gravar com a propria voz. As dos objetos nomeiam o
  // que esta na tela; "achou" e "cade" sao as falas do jogo do esconde.
  palavras() {
    return [...this.#objetos.map((objeto) => objeto.palavra), ...FALAS_DO_JOGO.keys()];
  }

  perguntas() {
    return this.#objetos.map((objeto) => objeto.idDaPergunta());
  }

  // O que cada arquivo de voz diz, palavra por palavra. Uma lista so, lida pelo
  // gerador de audio e pela voz de reserva do aparelho: assim o que foi gravado
  // e o que seria lido nunca dizem coisas diferentes.
  falas() {
    return new Map([
      ...this.#objetos.map((objeto) => [objeto.palavra, objeto.palavra]),
      ...FALAS_DO_JOGO,
      ...this.#objetos.map((objeto) => [objeto.idDaPergunta(), objeto.perguntaFalada()]),
    ]);
  }
}

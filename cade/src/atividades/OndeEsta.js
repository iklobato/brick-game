// A4. A voz pergunta "onde esta a bola?" e a crianca aponta. E a unica atividade
// com resposta certa, e mesmo assim nao existe errado: tocar no objeto trocado
// faz ele dizer o proprio nome, que e informacao, nao castigo, e o certo balanca
// chamando ate ela achar. Nada se perde, nada trava, ninguem apressa.
//
// Comeca com duas escolhas e a cada tres acertos entra mais uma, ate seis. Duas
// e o minimo para a pergunta querer dizer alguma coisa: com um objeto so na tela
// nao existe escolha nenhuma, e apontar o unico que esta ali nao ensina nada.
import Atividade from './Atividade.js';
import RodadaDeOndeEsta from './RodadaDeOndeEsta.js';

const ACERTOS_POR_NIVEL = 3;
const ESCOLHAS_INICIAIS = 2;
const MAXIMO_DE_ESCOLHAS = 6;
const ESPERA_ATE_PROXIMA_MS = 2000;

const DESENHO = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="28" cy="34" r="16" fill="#E8756B"/>
    <rect x="54" y="18" width="32" height="32" rx="8" fill="#4C9A8F"/>
    <path d="M40 92V66c0-5 8-5 8 0v10l6-2 10 4c4 2 6 5 6 9v5z" fill="#E8B98F"/>
  </svg>`;

export default class OndeEsta extends Atividade {
  #palco = null;
  #contexto = null;
  #acertos = 0;

  constructor() {
    super({ id: 'onde-esta', icone: 'assets/img/icone-onde.jpg', desenho: DESENHO });
  }

  montar(raiz, contexto) {
    raiz.classList.add('palco', 'palco--onde');
    this.#palco = raiz;
    this.#contexto = contexto;
    this.#acertos = 0;
    this.#rodada();
  }

  desmontar() {
    super.desmontar();
    this.#palco = null;
    this.#contexto = null;
  }

  #rodada() {
    this.agenda.limpa();
    this.#palco.replaceChildren();

    new RodadaDeOndeEsta({
      objetos: this.#contexto.catalogo.sorteia(this.#escolhasAgora()),
      palco: this.#palco,
      contexto: this.#contexto,
      agenda: this.agenda,
      aoAcertar: () => {
        this.#acertos += 1;
        this.agenda.depois(ESPERA_ATE_PROXIMA_MS, () => this.#rodada());
      },
    }).comeca();
  }

  #escolhasAgora() {
    return Math.min(
      MAXIMO_DE_ESCOLHAS,
      ESCOLHAS_INICIAIS + Math.floor(this.#acertos / ACERTOS_POR_NIVEL),
    );
  }
}

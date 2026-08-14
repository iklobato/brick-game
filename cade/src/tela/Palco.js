// Troca de tela. Uma tela por vez, sempre pelo mesmo caminho, porque previsivel
// entre sessoes e metade do que faz a crianca entender o jogo sozinha (P9).
const ESPERA_ATE_DESCER_MS = 1200;
const DURACAO_DA_SAIDA_MS = 600;

export default class Palco {
  #raiz;
  #locutor;
  #sons;
  #montada = null;

  constructor(raiz, { locutor, sons }) {
    // Sem voz e sem som o jogo inteiro fica mudo, e isso ja passou despercebido
    // uma vez: melhor quebrar na montagem do que na primeira despedida.
    if (!locutor || !sons) throw new Error('Palco precisa de locutor e sons');
    this.#raiz = raiz;
    this.#locutor = locutor;
    this.#sons = sons;
  }

  mostra(elemento) {
    this.#limpa();
    elemento.classList.add('entra');
    this.#raiz.appendChild(elemento);
    return elemento;
  }

  monta(atividade, contexto) {
    this.#limpa();
    const cena = document.createElement('div');
    cena.className = 'cena entra';
    this.#raiz.appendChild(cena);
    atividade.montar(cena, contexto);
    this.#montada = atividade;
    return cena;
  }

  // O fim nunca pode parecer castigo: os objetos acenam, o som desce e a tela
  // desliza para baixo. So depois disso entra o cartao do pai (P7).
  despede() {
    const cena = this.#raiz.firstElementChild;
    this.#sons.toca('fim');
    if (!cena || this.#semAnimacao()) return Promise.resolve();
    cena.classList.remove('entra');
    cena.classList.add('acena');
    return new Promise((resolve) => {
      setTimeout(() => {
        cena.classList.add('sai');
        setTimeout(resolve, DURACAO_DA_SAIDA_MS);
      }, ESPERA_ATE_DESCER_MS);
    });
  }

  #limpa() {
    this.#montada?.desmontar();
    this.#montada = null;
    this.#locutor.cala();
    this.#raiz.replaceChildren();
  }

  #semAnimacao() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

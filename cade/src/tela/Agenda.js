// Guarda os despertadores da atividade para que trocar de tela nao deixe um
// som ou uma animacao caindo em cima da tela seguinte.
export default class Agenda {
  #esperas = new Set();
  #repeticoes = new Set();

  depois(ms, acao) {
    const id = setTimeout(() => {
      this.#esperas.delete(id);
      acao();
    }, ms);
    this.#esperas.add(id);
    return id;
  }

  aCada(ms, acao) {
    const id = setInterval(acao, ms);
    this.#repeticoes.add(id);
    return id;
  }

  limpa() {
    this.#esperas.forEach(clearTimeout);
    this.#repeticoes.forEach(clearInterval);
    this.#esperas.clear();
    this.#repeticoes.clear();
  }
}

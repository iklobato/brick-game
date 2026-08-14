// Camada de toque. Tres decisoes, todas por causa da mao de uma crianca de dois
// anos:
//   - Pointer Events e nao click, porque o click exige apertar e soltar dentro
//     do mesmo alvo e ela arrasta o dedo no meio do caminho.
//   - Dispara no pointerdown, porque esperar o pointerup e perder o toque.
//   - Ignora o segundo dedo e a mao apoiada, que sao a metade dos toques dela.
export default class Toque {
  #palmaPx;
  #ponteiroAtivo = null;

  constructor({ palmaPx }) {
    this.#palmaPx = palmaPx;

    // O solta e escutado na janela, e nao no elemento: o dedo dela quase nunca
    // sai de cima do mesmo alvo em que entrou, e se o solta so contasse ali o
    // ponteiro ficaria preso e o jogo inteiro parava de responder.
    const solta = () => { this.#ponteiroAtivo = null; };
    addEventListener('pointerup', solta, true);
    addEventListener('pointercancel', solta, true);

    // Menu de contexto e zoom por gesto tiram a crianca do jogo e ela nao sabe
    // voltar sozinha.
    document.addEventListener('contextmenu', (evento) => evento.preventDefault());
    document.addEventListener('gesturestart', (evento) => evento.preventDefault());
  }

  aoTocar(elemento, acao) {
    elemento.addEventListener('pointerdown', (evento) => {
      if (this.#ponteiroAtivo !== null && this.#ponteiroAtivo !== evento.pointerId) return;
      if (this.#ehPalma(evento)) return;
      this.#ponteiroAtivo = evento.pointerId;
      evento.preventDefault();
      acao(evento);
    });
  }

  // Trava so o que a espera protege (a animacao). Quem chama continua tocando o
  // som em todo toque, porque toque sem resposta parece aparelho quebrado.
  comEspera(ms, acao) {
    let ocupado = false;
    return (...args) => {
      if (ocupado) return;
      ocupado = true;
      setTimeout(() => { ocupado = false; }, ms);
      acao(...args);
    };
  }

  #ehPalma(evento) {
    return (evento.width ?? evento.radiusX ?? 0) > this.#palmaPx ||
      (evento.height ?? evento.radiusY ?? 0) > this.#palmaPx;
  }
}

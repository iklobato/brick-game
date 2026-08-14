// O relogio da brincadeira: quanto tempo ela dura e quanto tempo tem que passar
// antes da proxima. O relogio vem de fora para que o teste ande sem esperar.
export default class Sessao {
  #ajustes;
  #relogio;

  constructor({ ajustes, relogio }) {
    this.#ajustes = ajustes;
    this.#relogio = relogio;
  }

  // Le a configuracao a cada pergunta, e nao uma vez no comeco: o pai muda a
  // duracao no painel no meio do dia e o valor novo vale ja na proxima sessao.
  podeComecar() {
    return this.#relogio.agora() - (this.#ajustes.leFim() ?? 0) >= this.#ajustes.le().descansoMs();
  }

  marcaFim() {
    this.#ajustes.guardaFim(this.#relogio.agora());
  }

  // Devolve o cancelador: trocar de tela antes da hora nao pode deixar um
  // despertador solto tocando por cima da tela seguinte.
  comeca(aoAcabar) {
    return this.#relogio.espera(this.#ajustes.le().duracaoMs(), () => {
      this.marcaFim();
      aoAcabar();
    });
  }
}

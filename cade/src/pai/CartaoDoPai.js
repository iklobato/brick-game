// O cartao do fim de sessao: a unica tela do jogo escrita para o adulto ler em
// voz alta. Ele mora em pai/ porque e do pai, nao da crianca: e por isso que
// aqui pode existir texto e um botao comum.
export default class CartaoDoPai {
  static #POUCOS_TOQUES = 5;

  #sugestoes;
  #configuracao;

  constructor({ sugestoes, configuracao }) {
    this.#sugestoes = sugestoes;
    this.#configuracao = configuracao;
  }

  elemento(idAtividade, toques, aoFechar) {
    const sessoes = this.#configuracao.sessoes;
    const { sugestao, perguntas } = this.#sugestoes.sugestaoDe(idAtividade, sessoes);

    const cartao = this.#cria('div', { className: 'cartao' }, [
      this.#cria('h1', { textContent: 'Agora no mundo real' }),
      this.#cria('p', { className: 'sugestao', textContent: sugestao }),
      this.#cria('h2', { textContent: 'Pergunte para ele' }),
      this.#cria('ul', {}, perguntas.map((pergunta) => this.#cria('li', { textContent: pergunta }))),
      this.#cria('p', { className: 'fecho', textContent: this.#sugestoes.FECHO }),
    ]);

    cartao.appendChild(this.#cria('p', { className: 'toques', textContent: this.#engajamento(toques) }));

    if (sessoes <= 1) {
      cartao.appendChild(this.#cria('p', { className: 'nota', textContent: this.#sugestoes.TRAVA_DO_APARELHO }));
    }

    const fechar = this.#cria('button', { type: 'button', className: 'botao botao--principal', textContent: 'fechar' });
    fechar.addEventListener('click', aoFechar);
    cartao.appendChild(fechar);
    return cartao;
  }

  // O unico numero que o app guarda sobre a crianca, e ele nunca sai do aparelho.
  // Zero toque e a informacao mais importante das tres, nao a menos: dedo parado
  // quer dizer que ela nao estava brincando, so olhando, e ai o caminho e menos
  // tela e nao mais.
  #engajamento(toques) {
    if (toques === 0) {
      return 'Ele nao tocou na tela nenhuma vez. Ficar so olhando e o sinal de parar: leve ele para a brincadeira aqui de cima em vez de abrir o jogo de novo.';
    }
    const pouco = toques < CartaoDoPai.#POUCOS_TOQUES ? ' Pouco: veja se a atividade confundiu ou cansou.' : '';
    return `Ele tocou ${toques} ${toques === 1 ? 'vez' : 'vezes'}.${pouco}`;
  }

  #cria(tag, propriedades = {}, filhos = []) {
    const elemento = Object.assign(document.createElement(tag), propriedades);
    elemento.append(...filhos);
    return elemento;
  }
}

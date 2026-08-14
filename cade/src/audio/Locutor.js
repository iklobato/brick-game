// A ordem das fontes e a regra inteira, e por isso ela vive num lugar so: a voz
// do pai ganha de todas, porque voz conhecida e personalizacao, e personalizacao
// e o que encurta o transfer deficit. Depois vem a voz gravada que veio no jogo,
// e a do aparelho fica por ultimo, so para o caso de faltar arquivo.

export default class Locutor {
  #fontes;
  #pedido = 0;

  constructor(fontes) {
    this.#fontes = fontes;
  }

  // Devolve quanto tempo a fala vai durar, em ms, para quem precisa emendar uma
  // palavra na outra. Zero quando quem fala e o aparelho, que nao diz o tamanho.
  fala(id) {
    // Uma voz de cada vez. Gente nao fala duas palavras ao mesmo tempo, e duas
    // faixas juntas viram um ruido onde a crianca nao reconhece nenhuma das
    // duas: era o que acontecia quando ela tocava a cortina com o "cade?" ainda
    // no ar.
    this.cala();
    const pedido = ++this.#pedido;
    const fonte = this.#fontes.find((candidata) => candidata.tem(id));
    if (!fonte) return 0;

    const ms = fonte.fala(id);
    if (ms > 0) return ms;

    // A fonte se disse dona mas o arquivo dela ainda nao chegou. Quando chegar,
    // ou falhar, a escolha recomeca do zero: assim um arquivo que nunca vem
    // ainda cai na voz do aparelho, em vez de virar silencio.
    fonte.quandoPuder?.()?.then(() => {
      if (pedido === this.#pedido) this.fala(id);
    });
    return ms;
  }

  cala() {
    this.#pedido += 1; // cancela a fala que estava esperando o arquivo chegar
    this.#fontes.forEach((fonte) => fonte.cala());
  }
}

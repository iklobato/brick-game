// A voz que veio junto com o jogo. Sao arquivos do proprio /cade/, que o service
// worker serve do cache: nenhuma requisicao sai do aparelho, e sem eles o jogo
// continua funcionando com a voz sintetica.

export default class VozDoJogo {
  #motor;
  #caminhoDe;
  #buffers = new Map(); // id -> AudioBuffer do arquivo que veio no jogo
  #carregando = null; // promessa das vozes enquanto elas ainda chegam

  constructor(motor, { caminhoDe }) {
    this.#motor = motor;
    this.#caminhoDe = caminhoDe;
  }

  async carrega(ids) {
    this.#carregando = Promise.all(
      ids.map(async (id) => {
        try {
          const resposta = await fetch(this.#caminhoDe(id));
          if (!resposta.ok) throw new Error(String(resposta.status));
          this.#buffers.set(id, await this.#motor.decodifica(await resposta.arrayBuffer()));
        } catch (erro) {
          console.warn(`sem a voz de "${id}" no jogo`, erro);
        }
      }),
    );
    await this.#carregando;
    this.#carregando = null;
  }

  // Enquanto os arquivos ainda chegam esta fonte se diz dona de qualquer id. A
  // voz do jogo carrega em segundo plano para nao segurar a tela inicial, e a
  // crianca toca o icone antes disso terminar. Deixar a fonte seguinte falar era
  // perder a frase inteira: no Chrome a primeira fala sintetica da pagina
  // costuma nao sair, e e justo a que diz o que fazer. Entao espera o arquivo.
  tem(id) {
    return this.#buffers.has(id) || this.#carregando !== null;
  }

  fala(id) {
    const buffer = this.#buffers.get(id);
    return buffer ? this.#motor.tocaBuffer(buffer) : 0;
  }

  // Quem espera e o Locutor: se o arquivo nao vier, ele ainda tem a fonte
  // seguinte para tentar, e esta classe nao tem.
  quandoPuder() {
    return this.#carregando;
  }

  cala() {
    this.#motor.cala();
  }
}

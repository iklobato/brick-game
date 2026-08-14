// As gravacoes do pai, feitas no painel e guardadas no aparelho. Primeira fonte
// da cadeia: a voz de quem a crianca conhece vale mais que qualquer sintese.
//
// Ela mesma cuida de onde as gravacoes ficam. Sem isso a gravacao viveria so na
// memoria da aba, e o pai gravaria as oito palavras uma vez, recarregaria a
// pagina e perderia tudo sem nenhum aviso.

export default class VozGravada {
  #motor;
  #arquivos;
  #buffers = new Map(); // id -> AudioBuffer com a voz do pai

  constructor(motor, arquivos) {
    this.#motor = motor;
    this.#arquivos = arquivos;
  }

  async carrega(ids) {
    try {
      // Uma tentativa so. Se o banco nao abre, nao adianta bater na porta uma vez
      // por palavra: seriam oito esperas seguidas antes de a tela inicial
      // aparecer, e a crianca olhando o branco esse tempo todo.
      await this.#arquivos.abre();
    } catch (erro) {
      console.warn('sem IndexedDB: o jogo vai usar a voz que veio nele', erro);
      return;
    }

    for (const id of ids) {
      const blob = await this.#arquivos.le(this.#chave(id));
      if (blob) await this.#decodifica(id, blob);
    }
  }

  async guarda(id, blob) {
    await this.#arquivos.guarda(this.#chave(id), blob);
    await this.#decodifica(id, blob);
  }

  async esquece(id) {
    await this.#arquivos.apaga(this.#chave(id));
    this.#buffers.delete(id);
  }

  tem(id) {
    return this.#buffers.has(id);
  }

  fala(id) {
    return this.#motor.tocaBuffer(this.#buffers.get(id));
  }

  cala() {
    this.#motor.cala();
  }

  async #decodifica(id, blob) {
    this.#buffers.set(id, await this.#motor.decodifica(await blob.arrayBuffer()));
  }

  #chave(id) {
    return `voz:${id}`;
  }
}

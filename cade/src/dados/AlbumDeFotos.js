// As fotos que o pai poe no lugar das que vieram no jogo. O objeto de verdade da
// casa e o que liga a tela ao mundo real (P8), entao vale mais que a foto
// generica; sem foto do pai, o jogo segue com a dele.
export default class AlbumDeFotos {
  #arquivos;
  #fotos = new Map();

  constructor(arquivos) {
    this.#arquivos = arquivos;
  }

  async carrega(objetos) {
    try {
      // Uma tentativa so. Se o banco nao abre, nao adianta bater na porta uma vez
      // por objeto: seriam segundos de tela branca antes dos tres icones.
      await this.#arquivos.abre();
    } catch (erro) {
      console.warn('sem IndexedDB: o jogo vai usar as fotos que vieram nele', erro);
      return;
    }

    for (const objeto of objetos) {
      const blob = await this.#arquivos.le(this.#chave(objeto.id));
      if (blob) this.#fotos.set(objeto.id, URL.createObjectURL(blob));
    }
  }

  async guarda(id, blob) {
    await this.#arquivos.guarda(this.#chave(id), blob);
    this.#esquece(id);
    this.#fotos.set(id, URL.createObjectURL(blob));
  }

  async apaga(id) {
    await this.#arquivos.apaga(this.#chave(id));
    this.#esquece(id);
  }

  fotoDe(id) {
    return this.#fotos.get(id) ?? null;
  }

  // Trocar de foto sem revogar a antiga deixa o blob preso na memoria enquanto a
  // pagina viver, e o pai troca foto varias vezes seguidas ate achar a boa.
  #esquece(id) {
    const antiga = this.#fotos.get(id);
    if (antiga) URL.revokeObjectURL(antiga);
    this.#fotos.delete(id);
  }

  #chave(id) {
    return `foto:${id}`;
  }
}

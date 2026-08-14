// A gaveta do que e pesado: as fotos da casa e a voz gravada do pai. Nada aqui
// sai do aparelho, em nenhuma hipotese.
export default class ArquivosDoAparelho {
  #nome;
  #loja;
  #esperaMs;
  #aberto = null;

  constructor({ nome = 'cade', loja = 'arquivos', esperaMs = 1500 } = {}) {
    this.#nome = nome;
    this.#loja = loja;
    this.#esperaMs = esperaMs;
  }

  // O open do IndexedDB tem um jeito de nunca responder: janela anonima, cota
  // negada, outra aba segurando uma versao antiga do banco. Sem um limite de
  // tempo aqui a crianca fica olhando uma tela branca para sempre, porque o app
  // espera a personalizacao para comecar. Personalizacao e opcional; abrir nao e.
  abre() {
    if (!this.#aberto) {
      this.#aberto = new Promise((resolve, reject) => {
        const pedido = indexedDB.open(this.#nome, 1);
        const desiste = setTimeout(() => reject(new Error('IndexedDB nao respondeu')), this.#esperaMs);
        const conclui = (acao) => (valor) => {
          clearTimeout(desiste);
          acao(valor);
        };
        pedido.onupgradeneeded = () => pedido.result.createObjectStore(this.#loja);
        pedido.onsuccess = conclui(() => resolve(pedido.result));
        pedido.onerror = conclui(() => reject(pedido.error));
        pedido.onblocked = conclui(() => reject(new Error('IndexedDB bloqueado por outra aba')));
      });
      // Falhou uma vez nao quer dizer falhar sempre: a proxima gravacao do pai
      // tenta abrir de novo em vez de herdar a promessa quebrada.
      this.#aberto.catch(() => { this.#aberto = null; });
    }
    return this.#aberto;
  }

  guarda(chave, blob) {
    return this.#transacao('readwrite', (loja) => loja.put(blob, chave));
  }

  apaga(chave) {
    return this.#transacao('readwrite', (loja) => loja.delete(chave));
  }

  // Ler falha quando o navegador esta em janela anonima ou sem cota. Isso custa a
  // personalizacao, nao o jogo: cai no desenho e na voz do aparelho e segue.
  async le(chave) {
    try {
      return (await this.#transacao('readonly', (loja) => loja.get(chave))) ?? null;
    } catch (erro) {
      console.warn(`nao consegui ler ${chave} do IndexedDB`, erro);
      return null;
    }
  }

  #transacao(modo, acao) {
    return this.abre().then(
      (banco) =>
        new Promise((resolve, reject) => {
          const loja = banco.transaction(this.#loja, modo).objectStore(this.#loja);
          const pedido = acao(loja);
          pedido.onsuccess = () => resolve(pedido.result);
          pedido.onerror = () => reject(pedido.error);
        }),
    );
  }
}

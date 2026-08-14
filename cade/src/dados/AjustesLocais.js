// A gaveta dos ajustes: poucos e pequenos, cabem no localStorage. Nada aqui sai
// do aparelho, em nenhuma hipotese.
import Configuracao from '../dominio/Configuracao.js';

const CHAVE_CONFIG = 'cade:config';
const CHAVE_FIM = 'cade:fim';

export default class AjustesLocais {
  #armazem;

  constructor(armazem) {
    this.#armazem = armazem;
  }

  le() {
    const cru = this.#leCru();
    const ajustes = Configuracao.deCru(cru);
    // Conserta na abertura o aparelho que ficou mudo. Isto existe porque uma
    // versao antiga do self-check gravava volume zero e nao devolvia se a pagina
    // fechasse no meio: o jogo emudecia para sempre e nao havia como o pai
    // adivinhar.
    // So regrava o que ja estava gravado errado: sem esta guarda, o aparelho que
    // nunca teve config levaria uma gravacao a cada leitura, e `le()` e chamado a
    // cada pergunta de sessao.
    if (cru.volume !== undefined && ajustes.volume !== Number(cru.volume)) this.guarda(ajustes);
    return ajustes;
  }

  guarda(configuracao) {
    this.#armazem.setItem(CHAVE_CONFIG, JSON.stringify(configuracao.paraCru()));
  }

  leFim() {
    return Number(this.#armazem.getItem(CHAVE_FIM) || 0);
  }

  guardaFim(ms) {
    this.#armazem.setItem(CHAVE_FIM, String(ms));
  }

  apagaFim() {
    this.#armazem.removeItem(CHAVE_FIM);
  }

  #leCru() {
    try {
      return JSON.parse(this.#armazem.getItem(CHAVE_CONFIG)) ?? {};
    } catch {
      return {};
    }
  }
}

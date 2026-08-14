import { SESSAO, VOLUME } from '../catalogo.js';

// Os ajustes do pai, como valor imutavel. Valida tudo na entrada para que nao
// exista configuracao invalida em lugar nenhum: o que vem do localStorage ja
// esteve quebrado e ninguem quer descobrir isso no colo da crianca.
export default class Configuracao {
  static #MS_POR_MINUTO = 60000;

  #nome;
  #duracaoMin;
  #descansoMin;
  #volume;
  #sessoes;
  #ultimaAtividade;

  constructor({ nome, duracaoMin, descansoMin, volume, sessoes, ultimaAtividade } = {}) {
    this.#nome = typeof nome === 'string' ? nome : '';
    this.#duracaoMin = Configuracao.#minutos(duracaoMin, SESSAO.DURACAO_MIN);
    this.#descansoMin = Configuracao.#minutos(descansoMin, SESSAO.DESCANSO_MIN);
    this.#volume = Configuracao.#volumeAudivel(volume);
    this.#sessoes = Configuracao.#contagem(sessoes);
    this.#ultimaAtividade = typeof ultimaAtividade === 'string' ? ultimaAtividade : null;
    Object.freeze(this);
  }

  static padrao() {
    return new Configuracao({});
  }

  // Aceita o que vier do disco, inclusive null, texto ou lixo de uma versao
  // antiga: o que nao der para aproveitar cai no padrao, campo por campo.
  static deCru(cru) {
    return new Configuracao(Object(cru ?? {}));
  }

  // Zero tem que valer zero: com `Number(x) || padrao` o descanso desligado
  // pelo pai viraria os 60 minutos de novo.
  static #minutos(valor, padrao) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : padrao;
  }

  // Conserta o aparelho que ficou mudo. Isto existe porque uma versao antiga do
  // self-check gravava volume zero e nao devolvia se a pagina fechasse no meio:
  // o jogo emudecia para sempre e nao havia como o pai adivinhar.
  static #volumeAudivel(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.min(1, Math.max(VOLUME.MINIMO, numero)) : VOLUME.PADRAO;
  }

  static #contagem(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) && numero >= 0 ? numero : 0;
  }

  get nome() {
    return this.#nome;
  }

  get volume() {
    return this.#volume;
  }

  get sessoes() {
    return this.#sessoes;
  }

  get ultimaAtividade() {
    return this.#ultimaAtividade;
  }

  duracaoMs() {
    return this.#duracaoMin * Configuracao.#MS_POR_MINUTO;
  }

  descansoMs() {
    return this.#descansoMin * Configuracao.#MS_POR_MINUTO;
  }

  com(mudancas) {
    return new Configuracao({ ...this.paraCru(), ...mudancas });
  }

  paraCru() {
    return {
      nome: this.#nome,
      duracaoMin: this.#duracaoMin,
      descansoMin: this.#descansoMin,
      volume: this.#volume,
      sessoes: this.#sessoes,
      ultimaAtividade: this.#ultimaAtividade,
    };
  }
}

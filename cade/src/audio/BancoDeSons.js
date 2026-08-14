// Os sons de retorno de cada toque, sintetizados na hora pelo motor: nao ha
// arquivo para carregar, entao o primeiro toque ja soa.

export default class BancoDeSons {
  #motor;
  #sons;

  constructor(motor) {
    this.#motor = motor;
    const tom = (opcoes) => motor.tom(opcoes);
    const late = (atraso) =>
      tom({ de: 340, para: 150, dur: 0.16, tipo: 'sawtooth', pico: 0.3, corte: 900, atraso });

    this.#sons = new Map([
      ['bola', () => tom({ de: 620, para: 170, dur: 0.32, pico: 0.45 })],
      [
        'copo',
        () => {
          tom({ de: 1150, para: 1500, dur: 0.12, tipo: 'triangle', pico: 0.3 });
          tom({ de: 1500, para: 900, dur: 0.26, tipo: 'triangle', pico: 0.22, atraso: 0.1 });
        },
      ],
      [
        'cao',
        () => {
          late(0);
          late(0.22);
        },
      ],
      [
        'achou',
        () =>
          [523.25, 659.25, 783.99].forEach((f, i) =>
            tom({ de: f, dur: 0.3, tipo: 'triangle', pico: 0.3, atraso: i * 0.09 }),
          ),
      ],
      ['borboleta', () => tom({ de: 700, para: 1250, dur: 0.5, pico: 0.18 })],
      // Descendo devagar: o fim da sessao acalma, nunca assusta (P7).
      [
        'fim',
        () =>
          [783.99, 659.25, 523.25, 392.0].forEach((f, i) =>
            tom({ de: f, dur: 0.8, pico: 0.22, atraso: i * 0.3 }),
          ),
      ],
      ['toque', () => tom({ de: 440, dur: 0.12, pico: 0.18 })],
    ]);
  }

  // Objeto sem som proprio (sapato, banana) cai no toque generico: toque que nao
  // devolve nada soa como aparelho quebrado, e ai ela para de tentar.
  toca(nome) {
    (this.#sons.get(nome) ?? this.#sons.get('toque'))();
  }

  nota(frequencia) {
    this.#motor.tom({ de: frequencia, dur: 0.6, tipo: 'triangle', pico: 0.35 });
  }
}

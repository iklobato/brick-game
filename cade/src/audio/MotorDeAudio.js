// Web Audio, nao <audio>: o elemento chega a atrasar mais de 100 ms entre o dedo
// e o som, e sem essa ligacao imediata a relacao causa e efeito se perde (P3).
// Os sons sao sintetizados na hora, entao nao ha arquivo para carregar nem
// espera nenhuma: o primeiro toque ja soa.

const VOLUME_INICIAL = 0.8;
const TAXA_PADRAO = 48000;

export default class MotorDeAudio {
  #ctx = null;
  #mestre = null;
  #decodificador = null;
  #vozTocando = null; // a fala no ar agora, para poder calar antes da proxima
  #volume = VOLUME_INICIAL;

  constructor({ volume = VOLUME_INICIAL } = {}) {
    this.defineVolume(volume);
  }

  // Navegador nenhum deixa tocar som antes de um gesto do usuario, entao isto
  // precisa rodar dentro do primeiro toque.
  desbloqueia() {
    this.#pronto();
  }

  defineVolume(valor) {
    this.#volume = Math.min(1, Math.max(0, Number(valor) || 0));
    if (this.#mestre) this.#mestre.gain.value = this.#volume;
  }

  volumeAtual() {
    return this.#volume;
  }

  tom({ de, para = de, dur = 0.25, tipo = 'sine', pico = 0.4, atraso = 0, corte = 0 }) {
    const ctx = this.#pronto();
    const inicio = ctx.currentTime + atraso;
    const osc = ctx.createOscillator();
    osc.type = tipo;
    osc.frequency.setValueAtTime(de, inicio);
    if (para !== de) osc.frequency.exponentialRampToValueAtTime(para, inicio + dur);

    const ganho = ctx.createGain();
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(pico, inicio + 0.012);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);

    let saida = ganho;
    if (corte) {
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = corte;
      ganho.connect(filtro);
      saida = filtro;
    }
    saida.connect(this.#mestre);
    osc.connect(ganho);
    osc.start(inicio);
    osc.stop(inicio + dur + 0.05);
  }

  // Uma voz de cada vez: duas faixas juntas viram um ruido onde a crianca nao
  // reconhece nenhuma das duas. Devolve a duracao em ms, para quem precisa
  // emendar uma palavra na outra.
  tocaBuffer(buffer) {
    const ctx = this.#pronto();
    this.cala();
    const fonte = ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(this.#mestre);
    fonte.addEventListener('ended', () => {
      if (this.#vozTocando === fonte) this.#vozTocando = null;
    });
    fonte.start(0);
    this.#vozTocando = fonte;
    return Math.round(buffer.duration * 1000);
  }

  cala() {
    if (!this.#vozTocando) return;
    this.#vozTocando.stop();
    this.#vozTocando = null;
  }

  estaTocandoVoz() {
    return this.#vozTocando !== null;
  }

  decodifica(arrayBuffer) {
    return this.#paraDecodificar().decodeAudioData(arrayBuffer);
  }

  #garante() {
    if (this.#ctx) return this.#ctx;
    const Contexto = window.AudioContext || window.webkitAudioContext;
    this.#ctx = new Contexto();
    this.#mestre = this.#ctx.createGain();
    this.#mestre.gain.value = this.#volume;
    this.#mestre.connect(this.#ctx.destination);
    return this.#ctx;
  }

  // Todo som passa por aqui. Um contexto suspenso engole a fala sem erro nenhum,
  // e a crianca fica olhando uma pergunta que nunca chegou: pedir para acordar de
  // novo antes de tocar custa nada e cobre o toque que o navegador nao aceitou.
  #pronto() {
    this.#garante();
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    return this.#ctx;
  }

  // Decodificar nao e tocar, e por isso nao precisa do contexto de saida. Isso
  // importa: contexto de saida criado durante o carregamento da pagina, antes de
  // qualquer toque, nasce suspenso, e ha navegador em que ele nao acorda mais nem
  // com resume. Entao as vozes sao decodificadas num contexto offline, e o que
  // toca de verdade so nasce no primeiro dedo na tela.
  #paraDecodificar() {
    if (this.#decodificador) return this.#decodificador;
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    this.#decodificador = new Offline(1, 1, TAXA_PADRAO);
    return this.#decodificador;
  }
}

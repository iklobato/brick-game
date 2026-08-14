// Ultima fonte da cadeia: a voz sintetica do aparelho, so para o caso de faltar
// arquivo. Nao diz quanto tempo a fala dura, entao devolve zero.

export default class VozDoAparelho {
  #falas;
  #motor;

  // O motor entra so para o volume: speechSynthesis nao passa pelo ganho mestre,
  // e sem isto o ajuste de volume do pai nao valeria para esta voz.
  constructor(falas, motor = null) {
    this.#falas = falas;
    this.#motor = motor;
  }

  tem() {
    return 'speechSynthesis' in window;
  }

  fala(id) {
    // O aparelho fala o texto, nunca o nome do arquivo: sem isto ele leria
    // "onde-bola" em vez de "onde esta a bola?".
    const frase = new SpeechSynthesisUtterance(this.#falas.get(id) ?? id);
    frase.lang = 'pt-BR';
    frase.rate = 0.85;
    frase.pitch = 1.15;
    frase.volume = this.#motor ? this.#motor.volumeAtual() : 1;
    speechSynthesis.speak(frase);
    return 0;
  }

  cala() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

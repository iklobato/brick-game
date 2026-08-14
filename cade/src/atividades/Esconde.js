// A2. O objeto some atras da cortina e volta quando ela toca. Nao existe errado:
// a cortina vazia devolve uma borboleta e a outra balanca convidando, entao a
// tentativa nunca vira punicao (P5).
import Atividade from './Atividade.js';
import Figura from '../tela/Figura.js';

const ACERTOS_PARA_DUAS = 3;
const ESPERA_ATE_FECHAR_MS = 900;
const ESPERA_ATE_PROXIMA_MS = 1800;
const ESPERA_ATE_A_VOZ_MS = 320;
const ESPERA_DA_BORBOLETA_MS = 1600;
const ESPERA_DO_CHAMADO_MS = 1400;

const BORBOLETA = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <ellipse cx="30" cy="38" rx="24" ry="18" fill="#F2B705" transform="rotate(-20 30 38)"/>
  <ellipse cx="70" cy="38" rx="24" ry="18" fill="#F2B705" transform="rotate(20 70 38)"/>
  <ellipse cx="34" cy="66" rx="18" ry="14" fill="#E8756B" transform="rotate(20 34 66)"/>
  <ellipse cx="66" cy="66" rx="18" ry="14" fill="#E8756B" transform="rotate(-20 66 66)"/>
  <rect x="46" y="26" width="8" height="52" rx="4" fill="#2B2724"/>
</svg>`;

const DESENHO = `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="10" y="10" width="80" height="52" rx="8" fill="#E8756B"/>
    <path d="M10 62h80l-6 12H16z" fill="#C4564C"/>
    <circle cx="50" cy="78" r="14" fill="#F2B705"/>
  </svg>`;

export default class Esconde extends Atividade {
  #palco = null;
  #contexto = null;
  #acertos = 0;
  #proximoObjeto = 0;

  constructor() {
    super({ id: 'cade', icone: 'assets/img/icone-cade.jpg', desenho: DESENHO });
  }

  montar(raiz, contexto) {
    raiz.classList.add('palco', 'palco--esconde');
    this.#palco = raiz;
    this.#contexto = contexto;
    this.#acertos = 0;
    this.#proximoObjeto = 0;
    this.#rodada();
  }

  desmontar() {
    super.desmontar();
    this.#palco = null;
    this.#contexto = null;
  }

  #rodada() {
    this.agenda.limpa();
    this.#palco.replaceChildren();

    const objetos = this.#contexto.catalogo.todos();
    const objeto = objetos[this.#proximoObjeto++ % objetos.length];
    const quantas = this.#acertos >= ACERTOS_PARA_DUAS ? 2 : 1;
    const certa = Math.floor(Math.random() * quantas);
    const vagas = [];

    for (let i = 0; i < quantas; i++) {
      const vaga = document.createElement('div');
      vaga.className = 'vaga';
      if (i === certa) {
        vaga.appendChild(Figura.deObjeto(objeto, this.#contexto.album).elemento);
      }

      const cortina = document.createElement('button');
      cortina.type = 'button';
      cortina.className = 'alvo cortina';
      cortina.setAttribute('aria-label', 'cortina');
      vaga.appendChild(cortina);

      this.#palco.appendChild(vaga);
      vagas.push({ vaga, cortina, temObjeto: i === certa });
    }

    for (const vaga of vagas) {
      this.#contexto.toque.aoTocar(vaga.cortina, () => this.#escolhe(vaga, vagas));
    }

    // Ela ve o objeto primeiro. Cortina que desce antes de a crianca olhar nao
    // esconde nada, so apaga.
    this.agenda.depois(ESPERA_ATE_FECHAR_MS, () => {
      for (const vaga of vagas) vaga.cortina.classList.add('fechada');
      this.#contexto.locutor.fala('cade');
    });
  }

  #escolhe(escolhida, vagas) {
    if (!escolhida.cortina.classList.contains('fechada')) return;
    this.#contexto.aoInteragir('cortina');

    if (!escolhida.temObjeto) {
      this.#contexto.sons.toca('borboleta');
      this.#voaBorboleta(escolhida.vaga);
      const certa = vagas.find((vaga) => vaga.temObjeto);
      certa.cortina.classList.add('chama');
      this.agenda.depois(ESPERA_DO_CHAMADO_MS, () => certa.cortina.classList.remove('chama'));
      return;
    }

    escolhida.cortina.classList.remove('fechada');
    this.#contexto.sons.toca('achou');
    this.agenda.depois(ESPERA_ATE_A_VOZ_MS, () => this.#contexto.locutor.fala('achou'));
    this.#acertos++;
    this.agenda.depois(ESPERA_ATE_PROXIMA_MS, () => this.#rodada());
  }

  #voaBorboleta(vaga) {
    const borboleta = document.createElement('div');
    borboleta.className = 'borboleta';
    borboleta.innerHTML = BORBOLETA;
    vaga.appendChild(borboleta);
    this.agenda.depois(ESPERA_DA_BORBOLETA_MS, () => borboleta.remove());
  }
}

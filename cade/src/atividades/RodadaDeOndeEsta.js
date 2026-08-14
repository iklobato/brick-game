// Uma rodada do "Onde esta?": as escolhas na tela, qual delas e a certa, o que
// acontece no acerto, o que acontece no erro e a pergunta que insiste. A
// atividade so diz quantas escolhas entram e o que fazer quando ela acaba.
import Peca from '../tela/Peca.js';
import Figura from '../tela/Figura.js';

const ESPERA_ATE_PERGUNTAR_MS = 600;
const ESPERA_ATE_REPETIR_MS = 1400;
const ESPERA_ATE_REPETIR_A_PERGUNTA_MS = 6000;
const REPETICOES_DA_PERGUNTA = 3;
const ESPERA_ATE_O_NOME_DO_ERRO_MS = 220;
const ESPERA_ATE_A_VOZ_DO_ACERTO_MS = 260;
const ESPERA_ENTRE_UMA_FALA_E_A_OUTRA_MS = 150;
// Quando a voz e a do aparelho nao da para saber quanto ela dura, entao a
// segunda palavra espera um tempo de palavra falada.
const ESPERA_ENTRE_FALAS_MS = 900;

// Quadrado o mais cheio possivel: seis viram duas fileiras de tres, quatro viram
// duas de duas. Enfileirar seis objetos numa linha so os deixaria menores que o
// dedo dela.
const colunasPara = (quantidade) => Math.ceil(Math.sqrt(quantidade));

export default class RodadaDeOndeEsta {
  #objetos;
  #palco;
  #contexto;
  #agenda;
  #aoAcertar;
  #escolhas = [];
  #certo = null;
  #respondida = false;
  #ultimoToque = 0;

  constructor({ objetos, palco, contexto, agenda, aoAcertar }) {
    this.#objetos = objetos;
    this.#palco = palco;
    this.#contexto = contexto;
    this.#agenda = agenda;
    this.#aoAcertar = aoAcertar;
  }

  comeca() {
    this.#certo = this.#objetos[Math.floor(Math.random() * this.#objetos.length)];
    this.#palco.style.setProperty('--colunas', String(colunasPara(this.#objetos.length)));

    this.#escolhas = this.#objetos.map((objeto) => {
      const escolha = { objeto, peca: null };
      escolha.peca = new Peca({
        toque: this.#contexto.toque,
        classe: 'objeto',
        rotulo: objeto.palavra,
        figura: Figura.deObjeto(objeto, this.#contexto.album),
        aoTocar: () => this.#toca(escolha),
      });
      this.#palco.appendChild(escolha.peca.elemento);
      return escolha;
    });

    // A pergunta so entra depois de tudo na tela: perguntar antes de ela ver as
    // opcoes e perguntar no vazio.
    this.#agenda.depois(ESPERA_ATE_PERGUNTAR_MS, () => this.#pergunta(REPETICOES_DA_PERGUNTA));
  }

  #toca(escolha) {
    this.#ultimoToque = Date.now();
    this.#contexto.aoInteragir(escolha.objeto.id);
    if (this.#respondida) return;
    if (escolha.objeto !== this.#certo) {
      this.#erra(escolha);
      return;
    }
    this.#respondida = true;
    this.#acerta(escolha);
  }

  #erra(escolha) {
    // O nome do que ela tocou: ela apontou uma coisa e ouviu como aquilo se chama.
    this.#contexto.sons.toca(escolha.objeto.id);
    this.#agenda.depois(ESPERA_ATE_O_NOME_DO_ERRO_MS, () =>
      this.#contexto.locutor.fala(escolha.objeto.palavra));

    const certa = this.#escolhas.find((outra) => outra.objeto === this.#certo).peca;
    certa.chama();
    this.#agenda.depois(ESPERA_ATE_REPETIR_MS, () => {
      certa.paraDeChamar();
      this.#contexto.locutor.fala(this.#certo.idDaPergunta());
    });
  }

  #acerta(escolha) {
    escolha.peca.pula();
    this.#contexto.sons.toca('achou');
    // "achou!" e depois o nome, um esperando o outro acabar. Duas falas ao mesmo
    // tempo viram ruido e ela nao reconhece nenhuma das duas palavras.
    this.#agenda.depois(ESPERA_ATE_A_VOZ_DO_ACERTO_MS, () => {
      const duracao = this.#contexto.locutor.fala('achou') || ESPERA_ENTRE_FALAS_MS;
      this.#agenda.depois(duracao + ESPERA_ENTRE_UMA_FALA_E_A_OUTRA_MS, () =>
        this.#contexto.locutor.fala(escolha.objeto.palavra));
    });
    this.#aoAcertar();
  }

  // A pergunta e a instrucao do jogo, e a crianca nao le: se ela olhar para o
  // lado bem na hora, a rodada vira uma tela de figuras sem tarefa nenhuma. Por
  // isso a voz volta a perguntar enquanto ela nao age, e cala a boca assim que
  // ela encosta em alguma coisa, para nao falar por cima dela.
  #pergunta(repeticoes) {
    if (this.#respondida) return;
    this.#contexto.locutor.fala(this.#certo.idDaPergunta());
    if (repeticoes <= 0) return;
    this.#agenda.depois(ESPERA_ATE_REPETIR_A_PERGUNTA_MS, () => {
      if (this.#respondida) return;
      if (Date.now() - this.#ultimoToque < ESPERA_ATE_REPETIR_A_PERGUNTA_MS) return;
      this.#pergunta(repeticoes - 1);
    });
  }
}

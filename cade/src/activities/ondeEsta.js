// A4. A voz pergunta "onde esta a bola?" e a crianca aponta. E a unica atividade
// com resposta certa, e mesmo assim nao existe errado: tocar no objeto trocado
// faz ele dizer o proprio nome, que e informacao, nao castigo, e o certo balanca
// chamando ate ela achar. Nada se perde, nada trava, ninguem apressa.
//
// A cada tres acertos entra mais uma escolha na tela, de uma ate seis. Comeca
// com uma so de proposito: com um objeto so ela nao tem como errar e aprende a
// regra do jogo pelo acerto, nao pela correcao.
import { aoTocar } from '../core/input.js';
import * as audio from '../core/audio.js';
import { OBJETOS, perguntaDe } from '../config.js';
import { criaFigura, criaAgenda } from './figura.js';

const ACERTOS_POR_NIVEL = 3;
const MAXIMO_DE_ESCOLHAS = 6;
const ESPERA_ATE_PERGUNTAR_MS = 600;
const ESPERA_ATE_PROXIMA_MS = 2000;
const ESPERA_ATE_REPETIR_MS = 1400;
// Quando a voz e a do aparelho nao da para saber quanto ela dura, entao a
// segunda palavra espera um tempo de palavra falada.
const ESPERA_ENTRE_FALAS_MS = 900;

const agenda = criaAgenda();
let palco = null;
let contexto = null;
let acertos = 0;

const escolhasAgora = () => Math.min(MAXIMO_DE_ESCOLHAS, 1 + Math.floor(acertos / ACERTOS_POR_NIVEL));

// Quadrado o mais cheio possivel: seis viram duas fileiras de tres, quatro viram
// duas de duas. Enfileirar seis objetos numa linha so os deixaria menores que o
// dedo dela.
const colunasPara = (quantidade) => Math.ceil(Math.sqrt(quantidade));

function sorteia(lista, quantidade) {
  const copia = [...lista];
  const sorteados = [];
  while (sorteados.length < quantidade && copia.length) {
    sorteados.push(...copia.splice(Math.floor(Math.random() * copia.length), 1));
  }
  return sorteados;
}

function erra(pecaTocada, pecaCerta, objetoCerto) {
  // O nome do que ela tocou: ela apontou uma coisa e ouviu como aquilo se chama.
  audio.som(pecaTocada.objeto.id);
  agenda.depois(220, () => audio.fala(pecaTocada.objeto.palavra));
  pecaCerta.botao.classList.add('chama');
  agenda.depois(ESPERA_ATE_REPETIR_MS, () => {
    pecaCerta.botao.classList.remove('chama');
    audio.fala(perguntaDe(objetoCerto.id));
  });
}

function acerta(peca, objeto) {
  acertos += 1;
  peca.botao.classList.add('pula');
  audio.som('achou');
  // "achou!" e depois o nome, um esperando o outro acabar. Duas falas ao mesmo
  // tempo viram ruido e ela nao reconhece nenhuma das duas palavras.
  agenda.depois(260, () => {
    const duracao = audio.fala('achou') || ESPERA_ENTRE_FALAS_MS;
    agenda.depois(duracao + 150, () => audio.fala(objeto.palavra));
  });
  agenda.depois(ESPERA_ATE_PROXIMA_MS, rodada);
}

function rodada() {
  agenda.limpa();
  palco.replaceChildren();

  const escolhas = sorteia(OBJETOS, escolhasAgora());
  const certo = escolhas[Math.floor(Math.random() * escolhas.length)];
  palco.style.setProperty('--colunas', String(colunasPara(escolhas.length)));

  const pecas = escolhas.map((objeto) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'alvo objeto';
    botao.setAttribute('aria-label', objeto.palavra);
    botao.appendChild(criaFigura(objeto));
    palco.appendChild(botao);
    return { botao, objeto };
  });

  let respondida = false;
  for (const peca of pecas) {
    aoTocar(peca.botao, () => {
      audio.desbloqueia();
      contexto.aoInteragir(peca.objeto.id);
      if (respondida) return;
      if (peca.objeto !== certo) {
        erra(peca, pecas.find((outra) => outra.objeto === certo), certo);
        return;
      }
      respondida = true;
      acerta(peca, certo);
    });
  }

  // A pergunta so entra depois de tudo na tela: perguntar antes de ela ver as
  // opcoes e perguntar no vazio.
  agenda.depois(ESPERA_ATE_PERGUNTAR_MS, () => audio.fala(perguntaDe(certo.id)));
}

export default {
  id: 'onde-esta',
  icone: 'assets/img/icone-onde.jpg',
  desenho: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="28" cy="34" r="16" fill="#E8756B"/>
    <rect x="54" y="18" width="32" height="32" rx="8" fill="#4C9A8F"/>
    <path d="M40 92V66c0-5 8-5 8 0v10l6-2 10 4c4 2 6 5 6 9v5z" fill="#E8B98F"/>
  </svg>`,

  mount(raiz, ctx) {
    raiz.classList.add('palco', 'palco--onde');
    palco = raiz;
    contexto = ctx;
    acertos = 0;
    rodada();
  },

  unmount() {
    agenda.limpa();
    palco = null;
    contexto = null;
  },
};

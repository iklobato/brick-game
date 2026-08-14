// Bootstrap e roteamento. Tres telas ao todo: os icones, a atividade, e o
// cartao do pai. Nao existe menu, tutorial nem tela de ajuste ao alcance da
// crianca: se ela consegue chegar la, o desenho falhou.
import * as audio from './core/audio.js';
import * as storage from './core/storage.js';
import * as sessao from './core/session.js';
import * as palco from './core/stage.js';
import { aoTocar } from './core/input.js';
import { criaImagem } from './activities/figura.js';
import { PALAVRAS, PERGUNTAS } from './config.js';
import { instalaPortao } from './parent/gate.js';
import { abrePainel, estaAberto } from './parent/painel.js';
import { criaCartao } from './parent/cartao.js';
import tocaEAcontece from './activities/tocaEAcontece.js';
import cade from './activities/cade.js';
import musica from './activities/musica.js';
import ondeEsta from './activities/ondeEsta.js';

// A ordem nunca muda: ela aprende onde fica cada jogo pela posicao, nao pelo
// desenho (P9). O novo entra no fim para nao empurrar os que ela ja conhece.
const ATIVIDADES = [tocaEAcontece, cade, musica, ondeEsta];

let travaDaTela = null;
let cancelaSessao = null;
let toques = 0;

async function seguraTela() {
  try {
    travaDaTela = (await navigator.wakeLock?.request('screen')) ?? null;
  } catch (erro) {
    // Navegador sem wakeLock, ou bateria baixa. A tela apaga sozinha e o pai
    // desbloqueia: chato, mas nao quebra a brincadeira.
    console.warn('sem trava de tela', erro);
  }
}

function soltaTela() {
  travaDaTela?.release?.();
  travaDaTela = null;
}

// --------------------------------------------------------------- telas

function telaInicial() {
  const tela = document.createElement('div');
  tela.className = 'inicio';
  for (const atividade of ATIVIDADES) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'alvo icone';
    botao.setAttribute('aria-label', atividade.id);
    botao.appendChild(criaImagem(atividade.icone, atividade.desenho));
    aoTocar(botao, () => {
      audio.desbloqueia();
      audio.som('toque');
      comeca(atividade);
    });
    tela.appendChild(botao);
  }
  return tela;
}

const cartaoDoPai = (idAtividade) => criaCartao(idAtividade, toques, abreInicio);

// -------------------------------------------------------------- fluxo

function abreInicio() {
  // O app nunca diz nao para a crianca. Quando ainda esta descansando, ele
  // simplesmente diz sim para outra coisa: a brincadeira de fora da tela.
  if (!sessao.podeComecar()) {
    palco.mostra(cartaoDoPai(storage.config.get('ultimaAtividade') ?? ATIVIDADES[0].id));
    return;
  }
  palco.mostra(telaInicial());
}

function comeca(atividade) {
  toques = 0;
  cancelaSessao?.();
  cancelaSessao = sessao.comeca(() => encerra(atividade));
  seguraTela();
  palco.monta(atividade, {
    nome: storage.config.get('nome'),
    aoInteragir: () => { toques += 1; },
  });
}

async function encerra(atividade) {
  cancelaSessao = null;
  await palco.despede();
  soltaTela();
  storage.config.set('sessoes', (storage.config.get('sessoes') ?? 0) + 1);
  storage.config.set('ultimaAtividade', atividade.id);
  palco.mostra(cartaoDoPai(atividade.id));
}

// --------------------------------------------------------------- boot

async function inicia() {
  // A voz carrega em segundo plano, sem segurar a tela inicial. Decodificar
  // audio pode demorar ou nem responder em navegador estranho, e nenhuma crianca
  // pode ficar olhando tela branca por causa disso: ate a primeira palavra sair,
  // ela ainda vai tocar num icone e depois num objeto.
  audio.carregaVozes([...PALAVRAS, ...PERGUNTAS]);
  await storage.carrega();
  instalaPortao(() => {
    if (estaAberto()) return;
    // A sessao para enquanto o pai mexe nos ajustes, e a crianca volta para a
    // tela inicial quando ele fecha. Mexer na configuracao nao gasta o tempo dela.
    cancelaSessao?.();
    cancelaSessao = null;
    soltaTela();
    abrePainel(abreInicio);
  });
  abreInicio();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((erro) => console.warn('sem service worker', erro));
  }

  // Abrir /cade/#test roda o self-check no aparelho de verdade, que e o unico
  // lugar onde o alvo tem tamanho e o som tem atraso. Sem o hash, nada disso e
  // baixado.
  if (location.hash === '#test') {
    const teste = await import('./selfcheck.js');
    teste.roda();
  }
}

inicia();

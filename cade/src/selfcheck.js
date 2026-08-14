// Self-check do Cade?, no mesmo padrao dos outros jogos daqui: abra
// /cade/#test e leia o console. Ele existe porque tres criterios do RFC so dao
// para medir no aparelho de verdade, nao no node: o tamanho real do alvo em
// pixels, o tempo entre o dedo e o som, e o fluxo inteiro ate o cartao do pai.
// So e carregado quando o hash pede: a crianca nunca baixa este arquivo.
import * as audio from './core/audio.js';
import * as storage from './core/storage.js';

// O volume NAO entra aqui. Ele e baixado so em memoria, durante o teste: gravar
// zero no aparelho e o jeito de deixar o jogo mudo para sempre se a pagina for
// fechada no meio, e ai nem o pai descobre por que sumiu o som.
const AJUSTES_DO_TESTE = { duracaoMin: 0.05, descansoMin: 0 };

const ALVO_MINIMO_PX = 96;
const LATENCIA_MAXIMA_MS = 100;
const ACERTOS_POR_NIVEL = 3;
const ESCOLHAS_INICIAIS = 2;

let falhas = 0;

function checa(condicao, texto) {
  if (condicao) {
    console.log(`ok   ${texto}`);
    return;
  }
  falhas++;
  console.error(`FALHOU ${texto}`);
}

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Esperar o estado, e nao um tanto fixo de tempo: o jogo tem tempos proprios e
// dormir na conta errada acusa o app de quebrado quando quem chegou cedo foi o
// teste.
async function esperaPor(condicao, limiteMs = 6000) {
  const fim = performance.now() + limiteMs;
  while (performance.now() < fim) {
    if (condicao()) return true;
    await espera(80);
  }
  return false;
}

// dispatchEvent e sincrono, entao o que corre entre as duas medidas e o caminho
// inteiro do toque: o listener, a decisao e o agendamento do som.
function toca(elemento) {
  const antes = performance.now();
  elemento.dispatchEvent(
    new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, cancelable: true, width: 20, height: 20 }),
  );
  const depois = performance.now();
  window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
  return depois - antes;
}

function alvosPequenos() {
  return [...document.querySelectorAll('.alvo')]
    .map((elemento) => ({ elemento, caixa: elemento.getBoundingClientRect() }))
    .filter(({ caixa }) => caixa.width < ALVO_MINIMO_PX || caixa.height < ALVO_MINIMO_PX);
}

function confereLayout(onde) {
  const pequenos = alvosPequenos();
  const detalhe = pequenos
    .map(({ elemento, caixa }) => `${elemento.className} ${Math.round(caixa.width)}x${Math.round(caixa.height)}`)
    .join(', ');
  checa(pequenos.length === 0, `todo alvo de ${onde} tem ${ALVO_MINIMO_PX}px ou mais ${detalhe && `(${detalhe})`}`);

  // Alvo cortado pela borda e alvo que ela nao alcanca. Nao da para medir isso
  // pelo scrollWidth da pagina: o body e overflow hidden, entao o que passa da
  // tela some da conta em vez de aparecer como sobra.
  const fora = [...document.querySelectorAll('.alvo')]
    .map((elemento) => elemento.getBoundingClientRect())
    .filter((caixa) => caixa.left < -1 || caixa.right > window.innerWidth + 1 || caixa.bottom > window.innerHeight + 1);
  checa(fora.length === 0, `nenhum alvo de ${onde} fica cortado pela borda da tela`);
}

async function roteiro() {
  const icones = document.querySelectorAll('.icone');
  checa(icones.length === 4, 'a tela inicial tem os quatro icones');
  checa(document.querySelectorAll('.portao').length === 2, 'os dois cantos do modo pai estao instalados');
  checa(!document.getElementById('app').textContent.trim(), 'a tela da crianca nao tem texto nenhum');
  confereLayout('tela inicial');

  // A1
  toca(icones[0]);
  await espera(450); // deixa a animacao de entrada acabar antes de medir
  checa(document.querySelectorAll('.objeto').length === 3, 'A1 abre com tres objetos');
  confereLayout('A1');
  const objeto = document.querySelector('.objeto');
  const latencia = toca(objeto);
  checa(latencia < LATENCIA_MAXIMA_MS, `o som sai em ${latencia.toFixed(1)}ms, abaixo dos ${LATENCIA_MAXIMA_MS}ms`);
  await espera(60);
  checa(objeto.classList.contains('pula'), 'o objeto responde ao toque na hora');

  // Fim da sessao e cartao do pai
  await espera(6000);
  const cartao = document.querySelector('.cartao');
  checa(!!cartao, 'a sessao acaba sozinha e entrega o cartao do pai');
  checa(document.querySelectorAll('.cartao li').length === 3, 'o cartao traz as tres perguntas');
  checa(!!document.querySelector('.cartao .sugestao'), 'o cartao traz a brincadeira fora da tela');
  checa(!!document.querySelector('.cartao .toques'), 'o cartao diz ao pai se ela brincou ou ficou parada');

  cartao.querySelector('.botao').click();
  await espera(450); // deixa a animacao de entrada acabar antes de medir
  checa(document.querySelectorAll('.icone').length === icones.length, 'fechar o cartao volta para a tela inicial');

  // A2
  toca(document.querySelectorAll('.icone')[1]);
  await espera(1400);
  const cortina = document.querySelector('.cortina');
  checa(cortina?.classList.contains('fechada'), 'A2 esconde o objeto atras da cortina');
  confereLayout('A2');
  toca(cortina);
  await espera(100);
  checa(!cortina.classList.contains('fechada'), 'tocar a cortina devolve o objeto');

  await espera(6000);
  document.querySelector('.cartao .botao').click();
  await espera(450); // deixa a animacao de entrada acabar antes de medir

  // A3
  toca(document.querySelectorAll('.icone')[2]);
  await espera(450); // deixa a animacao de entrada acabar antes de medir
  const blocos = document.querySelectorAll('.bloco');
  checa(blocos.length === 4, 'A3 abre com os quatro blocos');
  confereLayout('A3');
  toca(blocos[0]);
  await espera(60);
  checa(blocos[0].classList.contains('acende'), 'o bloco acende junto com a nota');

  // Modo pai: dois cantos opostos, tres segundos.
  const cantos = document.querySelectorAll('.portao');
  cantos[0].dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, bubbles: true }));
  await espera(3400);
  checa(!document.querySelector('.painel'), 'um canto so nao abre o modo pai');
  cantos[1].dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, bubbles: true }));
  await espera(3400);
  checa(!!document.querySelector('.painel'), 'os dois cantos por tres segundos abrem o modo pai');
  document.querySelector('.painel .botao--principal').click();
  await espera(450); // deixa a animacao de entrada acabar antes de medir

  // A4. A sessao do teste dura tres segundos e cortaria as rodadas no meio, entao
  // aqui ela volta a ter tamanho de gente.
  storage.config.set('duracaoMin', 5);
  toca(document.querySelectorAll('.icone')[3]);
  await espera(900);
  checa(document.querySelectorAll('.palco--onde .objeto').length === ESCOLHAS_INICIAIS,
        `A4 comeca com ${ESCOLHAS_INICIAIS} escolhas, senao a pergunta nao pede escolha nenhuma`);
  confereLayout('A4');

  // Toca em todas as escolhas da rodada: uma delas e a certa, e as outras so
  // devolvem o proprio nome. Assim o teste acerta sem precisar espiar a resposta.
  for (let acerto = 1; acerto <= ACERTOS_POR_NIVEL; acerto++) {
    const escolhas = [...document.querySelectorAll('.palco--onde .objeto')];
    for (const escolha of escolhas) {
      toca(escolha);
      await espera(120);
    }
    checa(await esperaPor(() => !escolhas[0].isConnected), `acerto ${acerto} leva a proxima rodada sozinho`);
  }
  checa(document.querySelectorAll('.palco--onde .objeto').length === ESCOLHAS_INICIAIS + 1,
        `depois de ${ACERTOS_POR_NIVEL} acertos entra mais uma escolha na tela`);
  confereLayout(`A4 com ${ESCOLHAS_INICIAIS + 1} escolhas`);

  await confereVoz();
}

// Duas falas ao mesmo tempo viram um borrao em que a crianca nao reconhece
// nenhuma das duas palavras. Isto ja aconteceu de verdade: o "cade?" dura quase
// dois segundos e o "achou!" entrava por cima quando ela tocava a cortina.
async function confereVoz() {
  const original = {
    start: AudioBufferSourceNode.prototype.start,
    stop: AudioBufferSourceNode.prototype.stop,
  };
  let tocando = 0;
  let pico = 0;
  AudioBufferSourceNode.prototype.start = function (...args) {
    tocando += 1;
    pico = Math.max(pico, tocando);
    this.addEventListener('ended', () => { tocando = Math.max(0, tocando - 1); });
    return original.start.apply(this, args);
  };
  AudioBufferSourceNode.prototype.stop = function (...args) {
    tocando = Math.max(0, tocando - 1);
    return original.stop.apply(this, args);
  };

  try {
    const duracao = audio.fala('cade');
    checa(duracao > 0, `a voz do jogo esta carregada: o "cade?" tem ${duracao}ms`);
    await espera(250);
    audio.fala('achou');
    await espera(200);
    checa(pico <= 1, `nunca tocam duas vozes ao mesmo tempo (pico de ${pico})`);
  } finally {
    AudioBufferSourceNode.prototype.start = original.start;
    AudioBufferSourceNode.prototype.stop = original.stop;
    audio.silencia();
  }
}

export async function roda() {
  // O teste mexe no relogio da sessao. O que era do pai volta como estava. Os
  // ajustes passam pelo storage, e nao pelo localStorage cru: o storage guarda
  // a configuracao em memoria e regravaria a antiga por cima na primeira vez
  // que o app contasse uma sessao.
  const antes = Object.fromEntries(Object.keys(AJUSTES_DO_TESTE).map((chave) => [chave, storage.config.get(chave)]));
  const fimAntes = localStorage.getItem('cade:fim');
  for (const [chave, valor] of Object.entries(AJUSTES_DO_TESTE)) storage.config.set(chave, valor);
  localStorage.removeItem('cade:fim');
  audio.defineVolume(0); // so em memoria: o que esta guardado continua o do pai

  try {
    await roteiro();
  } catch (erro) {
    falhas++;
    console.error('FALHOU o self-check parou no meio', erro);
  } finally {
    for (const [chave, valor] of Object.entries(antes)) storage.config.set(chave, valor);
    audio.defineVolume(storage.config.get('volume'));
    if (fimAntes === null) localStorage.removeItem('cade:fim');
    else localStorage.setItem('cade:fim', fimAntes);
  }

  console.log(falhas === 0 ? 'self-check ok' : `self-check com ${falhas} falha(s)`);
}

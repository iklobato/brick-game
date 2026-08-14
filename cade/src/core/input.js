// Camada de toque. Tres decisoes, todas por causa da mao de uma crianca de dois
// anos:
//   - Pointer Events e nao click, porque o click exige apertar e soltar dentro
//     do mesmo alvo e ela arrasta o dedo no meio do caminho.
//   - Dispara no pointerdown, porque esperar o pointerup e perder o toque.
//   - Ignora o segundo dedo e a mao apoiada, que sao a metade dos toques dela.
import { TOQUE } from '../config.js';

let ponteiroAtivo = null;

// O solta e escutado na janela, e nao no elemento: o dedo dela quase nunca sai
// de cima do mesmo alvo em que entrou, e se o solta so contasse ali o ponteiro
// ficaria preso e o jogo inteiro parava de responder.
const solta = () => { ponteiroAtivo = null; };
addEventListener('pointerup', solta, true);
addEventListener('pointercancel', solta, true);

const ehPalma = (evento) =>
  (evento.width ?? evento.radiusX ?? 0) > TOQUE.PALMA_PX ||
  (evento.height ?? evento.radiusY ?? 0) > TOQUE.PALMA_PX;

export function aoTocar(elemento, acao) {
  elemento.addEventListener('pointerdown', (evento) => {
    if (ponteiroAtivo !== null && ponteiroAtivo !== evento.pointerId) return;
    if (ehPalma(evento)) return;
    ponteiroAtivo = evento.pointerId;
    evento.preventDefault();
    acao(evento);
  });
}

// Trava so o que a espera protege (a animacao). Quem chama continua tocando o
// som em todo toque, porque toque sem resposta parece aparelho quebrado.
export function comEspera(ms, acao) {
  let ocupado = false;
  return (...args) => {
    if (ocupado) return;
    ocupado = true;
    setTimeout(() => { ocupado = false; }, ms);
    acao(...args);
  };
}

document.addEventListener('contextmenu', (evento) => evento.preventDefault());
document.addEventListener('gesturestart', (evento) => evento.preventDefault());

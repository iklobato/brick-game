// O cartao do fim de sessao: a unica tela do jogo escrita para o adulto ler em
// voz alta. Ele mora em parent/ porque e do pai, nao da crianca: e por isso que
// aqui pode existir texto e um botao comum.
import * as storage from '../core/storage.js';
import { FECHO, TRAVA_DO_APARELHO, sugestaoDe } from './suggestions.js';

const POUCOS_TOQUES = 5;

function cria(tag, propriedades = {}, filhos = []) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

// O unico numero que o app guarda sobre a crianca, e ele nunca sai do aparelho.
// Zero toque e a informacao mais importante das tres, nao a menos: dedo parado
// quer dizer que ela nao estava brincando, so olhando, e ai o caminho e menos
// tela e nao mais.
function engajamento(toques) {
  if (toques === 0) {
    return 'Ele nao tocou na tela nenhuma vez. Ficar so olhando e o sinal de parar: leve ele para a brincadeira aqui de cima em vez de abrir o jogo de novo.';
  }
  const pouco = toques < POUCOS_TOQUES ? ' Pouco: veja se a atividade confundiu ou cansou.' : '';
  return `Ele tocou ${toques} ${toques === 1 ? 'vez' : 'vezes'}.${pouco}`;
}

export function criaCartao(idAtividade, toques, aoFechar) {
  const sessoes = storage.config.get('sessoes') ?? 0;
  const { sugestao, perguntas } = sugestaoDe(idAtividade, sessoes);

  const cartao = cria('div', { className: 'cartao' }, [
    cria('h1', { textContent: 'Agora no mundo real' }),
    cria('p', { className: 'sugestao', textContent: sugestao }),
    cria('h2', { textContent: 'Pergunte para ele' }),
    cria('ul', {}, perguntas.map((pergunta) => cria('li', { textContent: pergunta }))),
    cria('p', { className: 'fecho', textContent: FECHO }),
  ]);

  cartao.appendChild(cria('p', { className: 'toques', textContent: engajamento(toques) }));

  if (sessoes <= 1) cartao.appendChild(cria('p', { className: 'nota', textContent: TRAVA_DO_APARELHO }));

  const fechar = cria('button', { type: 'button', className: 'botao botao--principal', textContent: 'fechar' });
  fechar.addEventListener('click', aoFechar);
  cartao.appendChild(fechar);
  return cartao;
}

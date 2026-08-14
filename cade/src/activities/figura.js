// O mesmo objeto aparece em duas atividades, e nas duas ele obedece a mesma
// ordem: foto que o pai colocou, depois a foto que veio no jogo, e o desenho so
// se nao houver nem uma nem outra. Um lugar so para essa escolha.
import { fotoDe } from '../core/storage.js';

// Se o arquivo sumir do cache, a tela nao pode ficar com um buraco: o desenho
// entra no lugar e a crianca nem percebe.
export function criaImagem(caminho, desenho) {
  const caixa = document.createElement('div');
  caixa.className = 'figura';
  if (!caminho) {
    caixa.innerHTML = desenho;
    return caixa;
  }
  // A foto tem fundo branco proprio, entao ela ocupa a peca inteira: deixar a
  // caixa bege aparecendo em volta poe uma moldura no meio do objeto e e ela
  // que a crianca tem que enxergar.
  caixa.classList.add('figura--foto');
  const imagem = document.createElement('img');
  imagem.src = caminho;
  imagem.alt = '';
  imagem.decoding = 'async';
  imagem.addEventListener('error', () => {
    caixa.classList.remove('figura--foto');
    caixa.innerHTML = desenho;
  });
  caixa.appendChild(imagem);
  return caixa;
}

export const criaFigura = (objeto) => criaImagem(fotoDe(objeto.id) ?? objeto.foto, objeto.desenho);

// Guarda os despertadores da atividade para que trocar de tela nao deixe um
// som ou uma animacao caindo em cima da tela seguinte.
export function criaAgenda() {
  const esperas = new Set();
  const repeticoes = new Set();
  return {
    depois(ms, acao) {
      const id = setTimeout(() => {
        esperas.delete(id);
        acao();
      }, ms);
      esperas.add(id);
      return id;
    },
    aCada(ms, acao) {
      const id = setInterval(acao, ms);
      repeticoes.add(id);
      return id;
    },
    limpa() {
      esperas.forEach(clearTimeout);
      repeticoes.forEach(clearInterval);
      esperas.clear();
      repeticoes.clear();
    },
  };
}

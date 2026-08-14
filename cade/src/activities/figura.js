// O mesmo objeto aparece em duas atividades, e nas duas ele tem que ser a foto
// da casa quando existe uma. Um lugar so para essa escolha.
import { fotoDe } from '../core/storage.js';

export function criaFigura(objeto) {
  const elemento = document.createElement('div');
  elemento.className = 'figura';
  const foto = fotoDe(objeto.id);
  if (foto) {
    elemento.classList.add('figura--foto');
    elemento.style.backgroundImage = `url(${foto})`;
  } else {
    elemento.innerHTML = objeto.desenho;
  }
  return elemento;
}

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

// Troca de tela. Uma tela por vez, sempre pelo mesmo caminho, porque previsivel
// entre sessoes e metade do que faz a crianca entender o jogo sozinha (P9).
import * as audio from './audio.js';

const raiz = document.getElementById('app');
const semAnimacao = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let montada = null;

function limpa() {
  montada?.unmount?.();
  montada = null;
  audio.silencia();
  raiz.replaceChildren();
}

export function mostra(elemento) {
  limpa();
  elemento.classList.add('entra');
  raiz.appendChild(elemento);
  return elemento;
}

export function monta(atividade, contexto) {
  limpa();
  const cena = document.createElement('div');
  cena.className = 'cena entra';
  raiz.appendChild(cena);
  atividade.mount(cena, contexto);
  montada = atividade;
  return cena;
}

// O fim nunca pode parecer castigo: os objetos acenam, o som desce e a tela
// desliza para baixo. So depois disso entra o cartao do pai (P7).
export function despede() {
  const cena = raiz.firstElementChild;
  audio.som('fim');
  if (!cena || semAnimacao()) return Promise.resolve();
  cena.classList.remove('entra');
  cena.classList.add('acena');
  return new Promise((resolve) => {
    setTimeout(() => {
      cena.classList.add('sai');
      setTimeout(resolve, 600);
    }, 1200);
  });
}

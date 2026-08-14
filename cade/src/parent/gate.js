// A porta do modo pai. Dois cantos opostos, os dois apertados ao mesmo tempo,
// por tres segundos. E o gesto que a mao de uma crianca de dois anos nao faz por
// acidente, e por isso ele nao aparece em lugar nenhum da tela.
const ESPERA_MS = 3000;

function criaCanto(posicao) {
  const canto = document.createElement('div');
  canto.className = `portao portao--${posicao}`;
  canto.setAttribute('aria-hidden', 'true');
  return canto;
}

export function instalaPortao(aoAbrir) {
  const cantos = [criaCanto('cima-esquerda'), criaCanto('baixo-direita')];
  const apertados = new Map(); // canto -> pointerId
  let relogio = null;

  function avalia() {
    if (apertados.size === cantos.length && relogio === null) {
      relogio = setTimeout(() => {
        relogio = null;
        apertados.clear();
        aoAbrir();
      }, ESPERA_MS);
      return;
    }
    if (apertados.size < cantos.length && relogio !== null) {
      clearTimeout(relogio);
      relogio = null;
    }
  }

  // O dedo dele escorrega para fora do canto sem soltar a tela. Se o solta so
  // contasse dentro do proprio canto, um dedo escorregado ficaria marcado como
  // apertado e a porta abriria com um dedo so. Por isso o solta e ouvido na
  // janela e casado pelo pointerId.
  function solta(evento) {
    for (const [canto, id] of apertados) {
      if (id === evento.pointerId) apertados.delete(canto);
    }
    avalia();
  }
  addEventListener('pointerup', solta, true);
  addEventListener('pointercancel', solta, true);

  for (const canto of cantos) {
    canto.addEventListener('pointerdown', (evento) => {
      apertados.set(canto, evento.pointerId);
      avalia();
    });
    document.body.appendChild(canto);
  }
}

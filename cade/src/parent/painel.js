// Modo pai. E a unica tela do app com texto, porque e a unica que nao e para a
// crianca. Tudo aqui e ajuste local: nada disso sai do aparelho.
import * as storage from '../core/storage.js';
import * as audio from '../core/audio.js';
import { OBJETOS, PALAVRAS } from '../config.js';
import { comecaGravacao, podeGravar } from './recorder.js';
import { TRAVA_DO_APARELHO } from './suggestions.js';

let aberto = null;
let aoFechar = () => {};

export const estaAberto = () => aberto !== null;

function cria(tag, propriedades = {}, filhos = []) {
  const elemento = Object.assign(document.createElement(tag), propriedades);
  elemento.append(...filhos);
  return elemento;
}

function campo(rotulo, entrada) {
  return cria('label', { className: 'campo' }, [cria('span', { textContent: rotulo }), entrada]);
}

function ajuste(chave, propriedades, aoMudar = () => {}) {
  const entrada = cria('input', { ...propriedades, value: storage.config.get(chave) });
  entrada.addEventListener('change', () => {
    const valor = entrada.type === 'text' ? entrada.value : Number(entrada.value);
    storage.config.set(chave, valor);
    aoMudar(valor);
  });
  return entrada;
}

function linhaDeVoz(palavra) {
  const linha = cria('div', { className: 'linha' });
  let paraGravacao = null;

  const desenha = () => {
    linha.replaceChildren();
    const gravar = cria('button', {
      type: 'button',
      className: paraGravacao ? 'botao botao--gravando' : 'botao',
      textContent: paraGravacao ? 'parar' : 'gravar',
    });
    gravar.addEventListener('click', async () => {
      try {
        if (paraGravacao) {
          const blob = await paraGravacao();
          paraGravacao = null;
          await storage.guardaVoz(palavra, blob);
        } else {
          paraGravacao = await comecaGravacao();
        }
      } catch (erro) {
        paraGravacao = null;
        linha.appendChild(cria('span', { className: 'erro', textContent: `nao deu para gravar: ${erro.message}` }));
        return;
      }
      desenha();
    });

    linha.append(cria('b', { textContent: palavra }), gravar);
    if (!paraGravacao && audio.temVoz(palavra)) {
      const ouvir = cria('button', { type: 'button', className: 'botao', textContent: 'ouvir' });
      ouvir.addEventListener('click', () => {
        audio.desbloqueia();
        audio.fala(palavra);
      });
      const apagar = cria('button', { type: 'button', className: 'botao', textContent: 'apagar' });
      apagar.addEventListener('click', async () => {
        await storage.apagaVoz(palavra);
        desenha();
      });
      linha.append(ouvir, apagar);
    }
  };

  desenha();
  return linha;
}

function linhaDeFoto(objeto) {
  const escolha = cria('input', { type: 'file', accept: 'image/*' });
  const apagar = cria('button', { type: 'button', className: 'botao', textContent: 'voltar ao desenho' });
  escolha.addEventListener('change', async () => {
    const arquivo = escolha.files?.[0];
    if (arquivo) await storage.guardaFoto(objeto.id, arquivo);
  });
  apagar.addEventListener('click', async () => {
    await storage.apagaFoto(objeto.id);
    escolha.value = '';
  });
  return cria('div', { className: 'linha' }, [cria('b', { textContent: objeto.palavra }), escolha, apagar]);
}

export function abrePainel(aoTerminar = () => {}) {
  if (aberto) return;
  aoFechar = aoTerminar;

  const corpo = cria('div', { className: 'painel-corpo' }, [
    cria('h1', { textContent: 'Modo pai' }),

    cria('section', {}, [
      cria('h2', { textContent: 'Sessao' }),
      campo('Nome da crianca', ajuste('nome', { type: 'text' })),
      campo('Duracao (minutos)', ajuste('duracaoMin', { type: 'number', min: 1, max: 30 })),
      campo('Descanso entre sessoes (minutos)', ajuste('descansoMin', { type: 'number', min: 0, max: 240 })),
      campo('Volume', ajuste('volume', { type: 'range', min: 0, max: 1, step: 0.05 }, audio.defineVolume)),
    ]),

    cria('section', {}, [
      cria('h2', { textContent: 'Sua voz' }),
      cria('p', {
        className: 'nota',
        textContent: podeGravar()
          ? 'Sem gravacao o jogo usa a voz do aparelho. Sua voz vale mais: ela e conhecida e e o que ajuda o que esta na tela a virar coisa de verdade.'
          : 'Este navegador nao deixa gravar audio. O jogo vai usar a voz do aparelho.',
      }),
      ...(podeGravar() ? PALAVRAS.map(linhaDeVoz) : []),
    ]),

    cria('section', {}, [
      cria('h2', { textContent: 'Fotos da casa' }),
      cria('p', {
        className: 'nota',
        textContent: 'Troque cada desenho pela foto do objeto de verdade dele. E o que faz o jogo virar o mundo real.',
      }),
      ...OBJETOS.map(linhaDeFoto),
    ]),

    cria('section', {}, [cria('h2', { textContent: 'Trave o tablet' }), cria('p', { className: 'nota', textContent: TRAVA_DO_APARELHO })]),
  ]);

  const fechar = cria('button', { type: 'button', className: 'botao botao--principal', textContent: 'fechar' });
  fechar.addEventListener('click', fechaPainel);
  corpo.appendChild(fechar);

  aberto = cria('div', { className: 'painel' }, [corpo]);
  document.body.appendChild(aberto);
}

export function fechaPainel() {
  aberto?.remove();
  aberto = null;
  const terminou = aoFechar;
  aoFechar = () => {};
  terminou();
}

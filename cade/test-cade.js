// Teste do "Cade?". Guarda as regras do RFC que um refactor distraido quebra
// sem ninguem perceber: o tamanho minimo do alvo, o toque por pointer, o cache
// completo do service worker e a conta do tempo de sessao.
// Rode com: node cade/test-cade.js
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');

const RAIZ = __dirname;
const FONTE = path.join(RAIZ, 'src');
const IGNORADOS = new Set(['sw.js', 'test-cade.js', 'README.md']);
let falhas = 0;

function checa(condicao, texto) {
  if (condicao) {
    console.log(`ok   ${texto}`);
    return;
  }
  falhas++;
  console.log(`FALHOU ${texto}`);
}

const le = (relativo) => fs.readFileSync(path.join(RAIZ, relativo), 'utf8');

function listaArquivos(pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const cheio = path.join(pasta, item.name);
    if (item.isDirectory()) return listaArquivos(cheio);
    return [path.relative(RAIZ, cheio)];
  });
}

// ------------------------------------------------ P2: o alvo de 2 cm

const css = le('style.css');
const pisoDoAlvo = Number(/--touch-min:\s*(\d+)px/.exec(css)?.[1]);
checa(pisoDoAlvo >= 96, `--touch-min e ${pisoDoAlvo}px, o piso de 2 cm com folga e 96px`);

const regraDoAlvo = /\.alvo\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
checa(/min-width:\s*var\(--touch-min\)/.test(regraDoAlvo), '.alvo prende a largura minima em --touch-min');
checa(/min-height:\s*var\(--touch-min\)/.test(regraDoAlvo), '.alvo prende a altura minima em --touch-min');

// ------------------------------- P1 e P3: toque por pointer, nunca click

const PROIBIDOS = /addEventListener\(\s*['"](click|dblclick|touchmove|touchstart|dragstart|drag)['"]/;
const doJogo = listaArquivos(FONTE).filter((arquivo) => !arquivo.includes(`${path.sep}parent${path.sep}`));
for (const arquivo of doJogo) {
  checa(!PROIBIDOS.test(le(arquivo)), `${arquivo} nao escuta click nem arrastar (so pointer)`);
}
checa(
  /addEventListener\(\s*'pointerdown'/.test(le('src/core/input.js')),
  'input.js dispara no pointerdown, nao no pointerup',
);

// ------------------------- os modulos abrem e cada import aponta para algo

for (const arquivo of listaArquivos(FONTE)) {
  const cheio = path.join(RAIZ, arquivo);
  try {
    execFileSync(process.execPath, ['--check', cheio], { stdio: 'pipe' });
    checa(true, `${arquivo} abre sem erro de sintaxe`);
  } catch (erro) {
    checa(false, `${arquivo} abre sem erro de sintaxe: ${String(erro.stderr).split('\n')[0]}`);
  }

  const importados = [...le(arquivo).matchAll(/from\s+'(\.[^']+)'/g)].map((achado) => achado[1]);
  for (const importado of importados) {
    const destino = path.resolve(path.dirname(cheio), importado);
    checa(fs.existsSync(destino), `${arquivo} importa ${importado}, que existe`);
  }
}

// ---------------------------------------- privacidade: nada sai daqui

const PARA_FORA = /\bfetch\s*\(|XMLHttpRequest|new WebSocket|https?:\/\//;
for (const arquivo of listaArquivos(FONTE)) {
  checa(!PARA_FORA.test(le(arquivo)), `${arquivo} nao fala com a rede`);
}

// ------------------------------------------- offline: o cache completo

const sw = le('sw.js');
const listados = new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map((achado) => achado[1]).filter(Boolean));
const noDisco = listaArquivos(RAIZ)
  .filter((arquivo) => !IGNORADOS.has(arquivo))
  .map((arquivo) => arquivo.split(path.sep).join('/'));

for (const arquivo of noDisco) {
  checa(listados.has(arquivo), `sw.js guarda ${arquivo} no cache`);
}
for (const arquivo of listados) {
  checa(fs.existsSync(path.join(RAIZ, arquivo)), `sw.js lista ${arquivo}, que existe de verdade`);
}
checa(sw.includes("'./'"), 'sw.js guarda a raiz do app, senao abrir offline cai no 404');

// ------------------------------------------------- P7: conta do tempo

const memoria = new Map();
globalThis.localStorage = {
  getItem: (chave) => (memoria.has(chave) ? memoria.get(chave) : null),
  setItem: (chave, valor) => memoria.set(chave, String(valor)),
  removeItem: (chave) => memoria.delete(chave),
};

const config = (objeto) => memoria.set('cade:config', JSON.stringify(objeto));

(async () => {
  const sessao = await import(pathToFileURL(path.join(FONTE, 'core/session.js')).href);

  checa(sessao.duracaoMs() === 4 * 60000, 'sem configuracao a sessao dura os 4 minutos do RFC');
  checa(sessao.descansoMs() === 60 * 60000, 'sem configuracao o descanso e de 60 minutos');
  checa(sessao.podeComecar(), 'antes da primeira sessao a crianca pode comecar');

  sessao.marcaFim();
  checa(!sessao.podeComecar(), 'logo depois de acabar a sessao, comecar de novo esta bloqueado');

  config({ duracaoMin: 2, descansoMin: 0 });
  checa(sessao.duracaoMs() === 2 * 60000, 'o pai encurta a sessao para 2 minutos');
  checa(sessao.podeComecar(), 'descanso zero libera na hora, que e como o pai desliga a trava');

  // Zero tem que valer zero: com `Number(x) || padrao` ele viraria 60 minutos.
  config({ descansoMin: 0 });
  checa(sessao.descansoMs() === 0, 'descanso zero nao cai no padrao de 60 minutos');

  memoria.set('cade:config', '{quebrado');
  checa(sessao.duracaoMs() === 4 * 60000, 'configuracao corrompida volta ao padrao em vez de derrubar o app');

  console.log(falhas === 0 ? '\ntudo certo' : `\n${falhas} falha(s)`);
  process.exit(falhas === 0 ? 0 : 1);
})();

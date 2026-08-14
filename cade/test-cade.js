// Teste do "Cade?". Guarda as regras do RFC que um refactor distraido quebra
// sem ninguem perceber: o tamanho minimo do alvo, o toque por pointer, o cache
// completo do service worker e a conta do tempo de sessao.
// Rode com: node cade/test-cade.js
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');

const RAIZ = __dirname;
const FONTE = path.join(RAIZ, 'src');
// Ficam de fora da conta do cache: o sw nao guarda a si mesmo, e teste e gerador
// sao ferramenta de bancada, nao coisa que o tablet baixa.
const IGNORADOS = new Set(['sw.js', 'test-cade.js', 'gerar-assets.js', 'README.md']);
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
const leBytes = (relativo) => fs.readFileSync(path.join(RAIZ, relativo));

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
// So o modo pai pode ouvir click: e a unica tela que nao e da crianca.
const DO_PAI = [`${path.sep}parent${path.sep}`, `${path.sep}pai${path.sep}`];
const doJogo = listaArquivos(FONTE).filter((arquivo) => !DO_PAI.some((pasta) => arquivo.includes(pasta)));
for (const arquivo of doJogo) {
  checa(!PROIBIDOS.test(le(arquivo)), `${arquivo} nao escuta click nem arrastar (so pointer)`);
}
checa(
  /addEventListener\(\s*'pointerdown'/.test(le('src/tela/Toque.js')),
  'Toque dispara no pointerdown, nao no pointerup',
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

// ------------------------------- OO: nenhum estado mora no modulo

// A regra que segura o refactor de pe. Estado no escopo do modulo e um singleton
// disfarcado: duas telas da mesma atividade passam a se atrapalhar, e o teste nao
// consegue montar uma instancia limpa. Se voltar um 'let' aqui, quebra aqui.
for (const arquivo of listaArquivos(FONTE)) {
  const soltos = le(arquivo).split('\n').filter((linha) => /^(let|var)\s/.test(linha));
  checa(soltos.length === 0, `${arquivo} nao guarda estado no escopo do modulo ${soltos.join(' | ')}`);
}

// ---------------------------------------- privacidade: nada sai daqui

// O jogo usa fetch para buscar a voz que veio nele, e o service worker responde
// do cache. Entao a regra nao pode ser "nada de fetch", tem que ser "nenhum
// endereco que saia daqui": nada de http, nada de //outra-casa, nada de XHR ou
// WebSocket. O que sobra so alcanca arquivo do proprio /cade/.
const PARA_FORA = /XMLHttpRequest|new WebSocket|https?:\/\/|['"`]\/\//;
for (const arquivo of listaArquivos(FONTE)) {
  checa(!PARA_FORA.test(le(arquivo)), `${arquivo} nao alcanca nada fora do aparelho`);
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

// O cache e cache-first e nunca reconsulta a rede, entao o unico aviso de que
// existe versao nova e o nome do cache mudar. Amarrando o nome ao conteudo, um
// arquivo editado sem bumpar o cache falha aqui em vez de falhar no tablet dele
// daqui a um mes.
const digestor = crypto.createHash('sha256');
for (const arquivo of [...listados].sort()) digestor.update(arquivo).update(leBytes(arquivo));
const impressao = digestor.digest('hex').slice(0, 16);
const nomeDoCache = /const CACHE = '([^']+)'/.exec(sw)?.[1];
checa(
  nomeDoCache === `cade-${impressao}`,
  `o nome do cache combina com os arquivos (troque para 'cade-${impressao}' em cade/sw.js)`,
);

// -------------------------------- o teste nao pode deixar o jogo mudo

// Isto ja aconteceu: o self-check gravava volume zero no aparelho e restaurava
// so no fim, entao fechar a pagina no meio deixava o jogo mudo para sempre, sem
// erro nenhum e sem ninguem entender por que a voz sumiu.
const selfcheck = le('src/selfcheck.js');
const ajustesDoTeste = /const AJUSTES_DO_TESTE = \{([^}]*)\}/.exec(selfcheck)?.[1] ?? '';
checa(!/volume/.test(ajustesDoTeste), 'o self-check nao grava volume no aparelho, so baixa em memoria');

// ------------------------------------------------- P7: conta do tempo

const memoria = new Map();
const localStorageFalso = {
  getItem: (chave) => (memoria.has(chave) ? memoria.get(chave) : null),
  setItem: (chave, valor) => memoria.set(chave, String(valor)),
  removeItem: (chave) => memoria.delete(chave),
};

const daPasta = (arquivo) => pathToFileURL(path.join(FONTE, arquivo)).href;

(async () => {
  const { default: AjustesLocais } = await import(daPasta('dados/AjustesLocais.js'));
  const { default: Sessao } = await import(daPasta('dominio/Sessao.js'));
  const { default: Configuracao } = await import(daPasta('dominio/Configuracao.js'));

  // Relogio falso, mas em escala de relogio de verdade: comecar perto do zero
  // faria "nunca jogou" parecer "acabou de jogar", porque o descanso de uma hora
  // e maior que o proprio instante.
  let agora = 1755000000000;
  const relogio = { agora: () => agora, espera: () => () => {} };
  const ajustes = new AjustesLocais(localStorageFalso);
  const sessao = new Sessao({ ajustes, relogio });

  checa(ajustes.le().duracaoMs() === 4 * 60000, 'sem configuracao a sessao dura os 4 minutos do RFC');
  checa(ajustes.le().descansoMs() === 60 * 60000, 'sem configuracao o descanso e de 60 minutos');
  checa(sessao.podeComecar(), 'antes da primeira sessao a crianca pode comecar');

  sessao.marcaFim();
  checa(!sessao.podeComecar(), 'logo depois de acabar a sessao, comecar de novo esta bloqueado');

  agora += 61 * 60000;
  checa(sessao.podeComecar(), 'passado o descanso, a crianca pode comecar de novo');

  ajustes.guarda(ajustes.le().com({ duracaoMin: 2, descansoMin: 0 }));
  checa(ajustes.le().duracaoMs() === 2 * 60000, 'o pai encurta a sessao para 2 minutos');
  sessao.marcaFim();
  checa(sessao.podeComecar(), 'descanso zero libera na hora, que e como o pai desliga a trava');

  // Zero tem que valer zero: com `Number(x) || padrao` ele viraria 60 minutos.
  checa(ajustes.le().descansoMs() === 0, 'descanso zero nao cai no padrao de 60 minutos');

  // O jogo nao tem volume mudo: sem som nao existe jogo, e um aparelho ja ficou
  // assim para sempre por causa de um teste que gravou zero e nao devolveu.
  memoria.set('cade:config', JSON.stringify({ volume: 0 }));
  checa(ajustes.le().volume >= 0.2, 'volume zero guardado no aparelho volta ao minimo audivel');

  memoria.set('cade:config', '{quebrado');
  checa(ajustes.le().duracaoMs() === 4 * 60000, 'configuracao corrompida volta ao padrao em vez de derrubar o app');
  checa(Configuracao.padrao().volume === 0.8, 'o volume padrao continua 0.8');

  console.log(falhas === 0 ? '\ntudo certo' : `\n${falhas} falha(s)`);
  process.exit(falhas === 0 ? 0 : 1);
})();

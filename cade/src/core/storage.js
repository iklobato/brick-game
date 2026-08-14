// Duas gavetas: localStorage para os ajustes (poucos e pequenos) e IndexedDB
// para o que e pesado, as fotos da casa e a voz gravada. Nada aqui sai do
// aparelho, em nenhuma hipotese.
import * as audio from './audio.js';
import { OBJETOS, PALAVRAS, SESSAO } from '../config.js';

const CHAVE_CONFIG = 'cade:config';

const PADRAO = {
  nome: '',
  duracaoMin: SESSAO.DURACAO_MIN,
  descansoMin: SESSAO.DESCANSO_MIN,
  volume: 0.8,
  sessoes: 0,
};

function leConfig() {
  try {
    return { ...PADRAO, ...(JSON.parse(localStorage.getItem(CHAVE_CONFIG)) ?? {}) };
  } catch {
    return { ...PADRAO };
  }
}

let atual = leConfig();

export const config = {
  get: (chave) => atual[chave],
  set(chave, valor) {
    atual[chave] = valor;
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify(atual));
  },
};

// ------------------------------------------------------------- IndexedDB

const BANCO = 'cade';
const LOJA = 'arquivos';
const ESPERA_BANCO_MS = 1500;

let bancoAberto = null;

// O open do IndexedDB tem um jeito de nunca responder: janela anonima, cota
// negada, outra aba segurando uma versao antiga do banco. Sem um limite de
// tempo aqui a crianca fica olhando uma tela branca para sempre, porque o app
// espera a personalizacao para comecar. Personalizacao e opcional; abrir nao e.
function abre() {
  if (!bancoAberto) {
    bancoAberto = new Promise((resolve, reject) => {
      const pedido = indexedDB.open(BANCO, 1);
      const desiste = setTimeout(() => reject(new Error('IndexedDB nao respondeu')), ESPERA_BANCO_MS);
      const conclui = (acao) => (valor) => {
        clearTimeout(desiste);
        acao(valor);
      };
      pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA);
      pedido.onsuccess = conclui(() => resolve(pedido.result));
      pedido.onerror = conclui(() => reject(pedido.error));
      pedido.onblocked = conclui(() => reject(new Error('IndexedDB bloqueado por outra aba')));
    });
    // Falhou uma vez nao quer dizer falhar sempre: a proxima gravacao do pai
    // tenta abrir de novo em vez de herdar a promessa quebrada.
    bancoAberto.catch(() => { bancoAberto = null; });
  }
  return bancoAberto;
}

function transacao(modo, acao) {
  return abre().then(
    (banco) =>
      new Promise((resolve, reject) => {
        const loja = banco.transaction(LOJA, modo).objectStore(LOJA);
        const pedido = acao(loja);
        pedido.onsuccess = () => resolve(pedido.result);
        pedido.onerror = () => reject(pedido.error);
      }),
  );
}

export const guardaArquivo = (chave, blob) => transacao('readwrite', (loja) => loja.put(blob, chave));
export const apagaArquivo = (chave) => transacao('readwrite', (loja) => loja.delete(chave));

// Ler falha quando o navegador esta em janela anonima ou sem cota. Isso custa a
// personalizacao, nao o jogo: cai no desenho e na voz do aparelho e segue.
async function leArquivo(chave) {
  try {
    return (await transacao('readonly', (loja) => loja.get(chave))) ?? null;
  } catch (erro) {
    console.warn(`nao consegui ler ${chave} do IndexedDB`, erro);
    return null;
  }
}

// ------------------------------------------- o que o pai personalizou

const fotos = new Map();

export async function carrega() {
  audio.defineVolume(config.get('volume'));
  try {
    // Uma tentativa so. Se o banco nao abre, nao adianta bater na porta uma vez
    // por palavra: seriam segundos de tela branca antes dos tres icones.
    await abre();
  } catch (erro) {
    console.warn('sem IndexedDB: o jogo vai usar os desenhos e a voz do aparelho', erro);
    return;
  }

  for (const palavra of PALAVRAS) {
    const blob = await leArquivo(`voz:${palavra}`);
    if (blob) await audio.registraVoz(palavra, blob);
  }
  for (const objeto of OBJETOS) {
    const blob = await leArquivo(`foto:${objeto.id}`);
    if (blob) fotos.set(objeto.id, URL.createObjectURL(blob));
  }
}

export const fotoDe = (id) => fotos.get(id) ?? null;

export async function guardaFoto(id, blob) {
  await guardaArquivo(`foto:${id}`, blob);
  const antiga = fotos.get(id);
  if (antiga) URL.revokeObjectURL(antiga);
  fotos.set(id, URL.createObjectURL(blob));
}

export async function apagaFoto(id) {
  await apagaArquivo(`foto:${id}`);
  const antiga = fotos.get(id);
  if (antiga) URL.revokeObjectURL(antiga);
  fotos.delete(id);
}

export async function guardaVoz(palavra, blob) {
  await guardaArquivo(`voz:${palavra}`, blob);
  await audio.registraVoz(palavra, blob);
}

export async function apagaVoz(palavra) {
  await apagaArquivo(`voz:${palavra}`);
  audio.esqueceVoz(palavra);
}

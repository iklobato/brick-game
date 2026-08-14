// Relogio da sessao. Le a configuracao direto do localStorage de proposito: sem
// depender do resto do app, isto roda no teste com um localStorage de mentira.
import { SESSAO } from '../config.js';

const CHAVE_CONFIG = 'cade:config';
const CHAVE_FIM = 'cade:fim';

function config() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CONFIG)) ?? {};
  } catch {
    return {};
  }
}

function minutos(valor, padrao) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : padrao;
}

export const duracaoMs = () => minutos(config().duracaoMin, SESSAO.DURACAO_MIN) * 60000;
export const descansoMs = () => minutos(config().descansoMin, SESSAO.DESCANSO_MIN) * 60000;

export function podeComecar() {
  const fim = Number(localStorage.getItem(CHAVE_FIM) || 0);
  return Date.now() - fim >= descansoMs();
}

export function marcaFim() {
  localStorage.setItem(CHAVE_FIM, String(Date.now()));
}

// Devolve o cancelador: trocar de tela antes da hora nao pode deixar um
// despertador solto tocando por cima da tela seguinte.
export function comeca(aoAcabar) {
  const relogio = setTimeout(() => {
    marcaFim();
    aoAcabar();
  }, duracaoMs());
  return () => clearTimeout(relogio);
}

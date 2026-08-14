// Ponto de entrada. Nao decide nada: entrega o navegador para a Aplicacao, que e
// quem monta as pecas. Tudo o que o jogo precisa do mundo de fora entra por esta
// linha, e por isso da para trocar o mundo de fora inteiro num teste.
import Aplicacao from './Aplicacao.js';

new Aplicacao({ documento: document, janela: window }).inicia();

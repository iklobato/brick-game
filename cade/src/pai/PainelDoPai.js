// Modo pai. E a unica tela do app com texto, porque e a unica que nao e para a
// crianca. Tudo aqui e ajuste local: nada disso sai do aparelho.
import { VOLUME } from '../catalogo.js';
import { TRAVA_DO_APARELHO } from './sugestoes.js';

export default class PainelDoPai {
  static #MS_POR_MINUTO = 60000;

  #ajustes;
  #album;
  #locutor;
  #vozGravada;
  #gravador;
  #catalogo;
  #motor;
  #configuracao = null;
  #aberto = null;
  #aoFechar = () => {};

  constructor({ ajustes, album, locutor, vozGravada, gravador, catalogo, motor }) {
    this.#ajustes = ajustes;
    this.#album = album;
    this.#locutor = locutor;
    this.#vozGravada = vozGravada;
    this.#gravador = gravador;
    this.#catalogo = catalogo;
    this.#motor = motor;
  }

  estaAberto() {
    return this.#aberto !== null;
  }

  abre(aoTerminar = () => {}) {
    if (this.#aberto) return;
    this.#aoFechar = aoTerminar;
    // Le agora, e nao no construtor: entre abrir o painel duas vezes a sessao ja
    // mudou os ajustes, e o pai tem que ver o que esta valendo.
    this.#configuracao = this.#ajustes.le();

    const corpo = this.#cria('div', { className: 'painel-corpo' }, [
      this.#cria('h1', { textContent: 'Modo pai' }),
      this.#secaoDeSessao(),
      this.#secaoDeVoz(),
      this.#secaoDePerguntas(),
      this.#secaoDeFotos(),
      this.#cria('section', {}, [
        this.#cria('h2', { textContent: 'Trave o tablet' }),
        this.#cria('p', { className: 'nota', textContent: TRAVA_DO_APARELHO }),
      ]),
    ]);

    const fechar = this.#cria('button', { type: 'button', className: 'botao botao--principal', textContent: 'fechar' });
    fechar.addEventListener('click', () => this.fecha());
    corpo.appendChild(fechar);

    this.#aberto = this.#cria('div', { className: 'painel' }, [corpo]);
    document.body.appendChild(this.#aberto);
  }

  fecha() {
    this.#aberto?.remove();
    this.#aberto = null;
    const terminou = this.#aoFechar;
    this.#aoFechar = () => {};
    terminou();
  }

  // ------------------------------------------------------------- as secoes

  #secaoDeSessao() {
    const minutos = PainelDoPai.#MS_POR_MINUTO;
    return this.#cria('section', {}, [
      this.#cria('h2', { textContent: 'Sessao' }),
      this.#campoDeTexto('Nome da crianca', 'nome', this.#configuracao.nome),
      // A configuracao so entrega tempo em ms; quem le a tela pensa em minutos.
      this.#campoDeNumero('Duracao (minutos)', 'duracaoMin', this.#configuracao.duracaoMs() / minutos, { min: 1, max: 30 }),
      this.#campoDeNumero('Descanso entre sessoes (minutos)', 'descansoMin', this.#configuracao.descansoMs() / minutos, { min: 0, max: 240 }),
      this.#campoDeVolume(),
    ]);
  }

  #secaoDeVoz() {
    const podeGravar = this.#gravador.podeGravar();
    const linha = podeGravar ? (palavra) => this.#linhaDeVoz(palavra) : (palavra) => this.#linhaSoDeOuvir(palavra);
    return this.#cria('section', {}, [
      this.#cria('h2', { textContent: 'Sua voz' }),
      this.#cria('p', {
        className: 'nota',
        textContent: podeGravar
          ? 'O jogo ja vem com uma voz gravada. A sua vale mais: ela e conhecida, e e isso que ajuda o que esta na tela a virar coisa de verdade para ele.'
          : 'Este navegador nao deixa gravar audio. O jogo vai usar a voz que ja veio nele.',
      }),
      ...this.#catalogo.palavras().map(linha),
    ]);
  }

  #secaoDePerguntas() {
    return this.#cria('section', {}, [
      this.#cria('h2', { textContent: 'As perguntas do "onde esta?"' }),
      this.#cria('p', {
        className: 'nota',
        textContent: 'Estas o jogo fala sozinho. Se voce apertar ouvir e nao sair som, o problema e o volume do aparelho ou o silencioso, nao o jogo.',
      }),
      ...this.#catalogo.todos().map((objeto) =>
        this.#cria('div', { className: 'linha' }, [
          this.#cria('b', { textContent: objeto.perguntaFalada() }),
          this.#botaoDeOuvir(objeto.idDaPergunta()),
        ])),
    ]);
  }

  #secaoDeFotos() {
    return this.#cria('section', {}, [
      this.#cria('h2', { textContent: 'Fotos da casa' }),
      this.#cria('p', {
        className: 'nota',
        textContent: 'As fotos que vieram no jogo sao de brinquedos parecidos. Troque cada uma pela foto do objeto de verdade dele: e o que liga a tela ao mundo real.',
      }),
      ...this.#catalogo.todos().map((objeto) => this.#linhaDeFoto(objeto)),
    ]);
  }

  // ------------------------------------------------------------- os campos

  #campo(rotulo, entrada) {
    return this.#cria('label', { className: 'campo' }, [this.#cria('span', { textContent: rotulo }), entrada]);
  }

  #campoDeTexto(rotulo, chave, valor) {
    const entrada = this.#cria('input', { type: 'text', value: valor });
    entrada.addEventListener('change', () => this.#muda(chave, entrada.value));
    return this.#campo(rotulo, entrada);
  }

  #campoDeNumero(rotulo, chave, valor, limites) {
    const entrada = this.#cria('input', { ...limites, type: 'number', value: valor });
    entrada.addEventListener('change', () => this.#muda(chave, Number(entrada.value)));
    return this.#campo(rotulo, entrada);
  }

  // O volume mostra o numero e toca um som enquanto voce arrasta, para dar para
  // ouvir na hora que esta funcionando. Nao desce ate zero de proposito: mudo nao
  // e ajuste, e o jogo quebrado. Para silencio, o volume do aparelho.
  #campoDeVolume() {
    const valor = this.#cria('b', {});
    const mostra = (nivel) => { valor.textContent = `${Math.round(nivel * 100)}%`; };
    const entrada = this.#cria('input', {
      type: 'range',
      min: VOLUME.MINIMO,
      max: 1,
      step: 0.05,
      value: this.#configuracao.volume,
    });
    entrada.addEventListener('change', () => {
      const nivel = Number(entrada.value);
      this.#muda('volume', nivel);
      this.#motor.defineVolume(nivel);
      mostra(nivel);
      // O painel nao recebe o banco de sons, entao pede o tom direto ao motor. E
      // o mesmo "toque" que a crianca ouve: o pai precisa conferir o volume no
      // som que ela vai escutar, nao em outro.
      this.#motor.tom({ de: 440, dur: 0.12, pico: 0.18 });
    });
    mostra(this.#configuracao.volume);
    return this.#cria('div', { className: 'linha' }, [this.#cria('span', { textContent: 'Volume' }), entrada, valor]);
  }

  #muda(chave, valor) {
    this.#configuracao = this.#configuracao.com({ [chave]: valor });
    this.#ajustes.guarda(this.#configuracao);
  }

  // ------------------------------------------------------------- as linhas

  #botaoDeOuvir(id) {
    const ouvir = this.#cria('button', { type: 'button', className: 'botao', textContent: 'ouvir' });
    ouvir.addEventListener('click', () => {
      this.#motor.desbloqueia();
      this.#locutor.fala(id);
    });
    return ouvir;
  }

  #linhaSoDeOuvir(palavra) {
    return this.#cria('div', { className: 'linha' }, [
      this.#cria('b', { textContent: palavra }),
      this.#botaoDeOuvir(palavra),
    ]);
  }

  #linhaDeVoz(palavra) {
    const linha = this.#cria('div', { className: 'linha' });
    let paraGravacao = null;

    const desenha = () => {
      linha.replaceChildren();
      const gravar = this.#cria('button', {
        type: 'button',
        className: paraGravacao ? 'botao botao--gravando' : 'botao',
        textContent: paraGravacao ? 'parar' : 'gravar',
      });
      gravar.addEventListener('click', async () => {
        try {
          if (paraGravacao) {
            const blob = await paraGravacao();
            paraGravacao = null;
            await this.#vozGravada.guarda(palavra, blob);
          } else {
            paraGravacao = await this.#gravador.comecaGravacao();
          }
        } catch (erro) {
          paraGravacao = null;
          linha.appendChild(this.#cria('span', { className: 'erro', textContent: `nao deu para gravar: ${erro.message}` }));
          return;
        }
        desenha();
      });

      linha.append(this.#cria('b', { textContent: palavra }), gravar);
      if (!paraGravacao) {
        // Ouvir vale sempre, gravado ou nao: e assim que o pai confere se sai som
        // no aparelho antes de entregar o tablet e descobrir no colo que estava mudo.
        linha.append(this.#botaoDeOuvir(palavra));
        if (this.#vozGravada.tem(palavra)) {
          const apagar = this.#cria('button', { type: 'button', className: 'botao', textContent: 'apagar' });
          apagar.addEventListener('click', async () => {
            await this.#vozGravada.esquece(palavra);
            desenha();
          });
          linha.append(apagar);
        }
      }
    };

    desenha();
    return linha;
  }

  #linhaDeFoto(objeto) {
    const escolha = this.#cria('input', { type: 'file', accept: 'image/*' });
    const apagar = this.#cria('button', { type: 'button', className: 'botao', textContent: 'voltar a foto do jogo' });
    escolha.addEventListener('change', async () => {
      const arquivo = escolha.files?.[0];
      if (arquivo) await this.#album.guarda(objeto.id, arquivo);
    });
    apagar.addEventListener('click', async () => {
      await this.#album.apaga(objeto.id);
      escolha.value = '';
    });
    return this.#cria('div', { className: 'linha' }, [this.#cria('b', { textContent: objeto.palavra }), escolha, apagar]);
  }

  #cria(tag, propriedades = {}, filhos = []) {
    const elemento = Object.assign(document.createElement(tag), propriedades);
    elemento.append(...filhos);
    return elemento;
  }
}

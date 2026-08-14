// Self-check do Cade?, no mesmo padrao dos outros jogos daqui: abra /cade/#test e
// leia o console. Ele existe porque tres criterios do RFC so dao para medir no
// aparelho de verdade, nao no node: o tamanho real do alvo em pixels, o tempo
// entre o dedo e o som, e o fluxo inteiro ate o cartao do pai. So e carregado
// quando o hash pede: a crianca nunca baixa este arquivo.

export default class SelfCheck {
  static #ALVO_MINIMO_PX = 96;
  static #LATENCIA_MAXIMA_MS = 100;
  static #ACERTOS_POR_NIVEL = 3;
  static #ESCOLHAS_INICIAIS = 2;
  // O volume NAO e gravado. Ele e baixado so em memoria, durante o teste: gravar
  // zero no aparelho e o jeito de deixar o jogo mudo para sempre se a pagina for
  // fechada no meio, e ai nem o pai descobre por que sumiu o som.
  static #AJUSTES_DO_TESTE = { duracaoMin: 0.05, descansoMin: 0 };

  #app;
  #falhas = 0;

  constructor(aplicacao) {
    this.#app = aplicacao;
  }

  async roda() {
    const ajustes = this.#app.ajustes;
    const antes = ajustes.le();
    const fimAntes = ajustes.leFim();
    ajustes.guarda(antes.com(SelfCheck.#AJUSTES_DO_TESTE));
    ajustes.apagaFim();
    this.#app.motor.defineVolume(0);

    try {
      await this.#roteiro();
    } catch (erro) {
      this.#falhas += 1;
      console.error('FALHOU o self-check parou no meio', erro);
    } finally {
      ajustes.guarda(antes);
      this.#app.motor.defineVolume(antes.volume);
      if (fimAntes) ajustes.guardaFim(fimAntes);
      else ajustes.apagaFim();
    }

    console.log(this.#falhas === 0 ? 'self-check ok' : `self-check com ${this.#falhas} falha(s)`);
  }

  async #roteiro() {
    const icones = document.querySelectorAll('.icone');
    this.#checa(icones.length === 4, 'a tela inicial tem os quatro icones');
    this.#checa(document.querySelectorAll('.portao').length === 2, 'os dois cantos do modo pai estao instalados');
    this.#checa(!document.getElementById('app').textContent.trim(), 'a tela da crianca nao tem texto nenhum');
    this.#confereLayout('tela inicial');

    // A1
    this.#toca(icones[0]);
    await this.#espera(450); // deixa a animacao de entrada acabar antes de medir
    this.#checa(document.querySelectorAll('.objeto').length === 3, 'A1 abre com tres objetos');
    this.#confereLayout('A1');
    const objeto = document.querySelector('.objeto');
    const latencia = this.#toca(objeto);
    this.#checa(
      latencia < SelfCheck.#LATENCIA_MAXIMA_MS,
      `o som sai em ${latencia.toFixed(1)}ms, abaixo dos ${SelfCheck.#LATENCIA_MAXIMA_MS}ms`,
    );
    await this.#espera(60);
    this.#checa(objeto.classList.contains('pula'), 'o objeto responde ao toque na hora');

    // Fim da sessao e cartao do pai
    await this.#espera(6000);
    const cartao = document.querySelector('.cartao');
    this.#checa(!!cartao, 'a sessao acaba sozinha e entrega o cartao do pai');
    this.#checa(document.querySelectorAll('.cartao li').length === 3, 'o cartao traz as tres perguntas');
    this.#checa(!!document.querySelector('.cartao .sugestao'), 'o cartao traz a brincadeira fora da tela');
    this.#checa(!!document.querySelector('.cartao .toques'), 'o cartao diz ao pai se ela brincou ou ficou parada');

    cartao.querySelector('.botao').click();
    await this.#espera(450);
    this.#checa(document.querySelectorAll('.icone').length === icones.length, 'fechar o cartao volta para a tela inicial');

    // A2
    this.#toca(document.querySelectorAll('.icone')[1]);
    await this.#espera(1400);
    const cortina = document.querySelector('.cortina');
    this.#checa(cortina?.classList.contains('fechada'), 'A2 esconde o objeto atras da cortina');
    this.#confereLayout('A2');
    this.#toca(cortina);
    await this.#espera(100);
    this.#checa(!cortina.classList.contains('fechada'), 'tocar a cortina devolve o objeto');

    await this.#espera(6000);
    document.querySelector('.cartao .botao').click();
    await this.#espera(450);

    // A3
    this.#toca(document.querySelectorAll('.icone')[2]);
    await this.#espera(450);
    const blocos = document.querySelectorAll('.bloco');
    this.#checa(blocos.length === 4, 'A3 abre com os quatro blocos');
    this.#confereLayout('A3');
    this.#toca(blocos[0]);
    await this.#espera(60);
    this.#checa(blocos[0].classList.contains('acende'), 'o bloco acende junto com a nota');

    // Modo pai: dois cantos opostos, tres segundos.
    const cantos = document.querySelectorAll('.portao');
    cantos[0].dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, bubbles: true }));
    await this.#espera(3400);
    this.#checa(!document.querySelector('.painel'), 'um canto so nao abre o modo pai');
    cantos[1].dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, bubbles: true }));
    await this.#espera(3400);
    this.#checa(!!document.querySelector('.painel'), 'os dois cantos por tres segundos abrem o modo pai');
    document.querySelector('.painel .botao--principal').click();
    await this.#espera(450);

    // A4. A sessao do teste dura tres segundos e cortaria as rodadas no meio,
    // entao aqui ela volta a ter tamanho de gente.
    this.#app.ajustes.guarda(this.#app.ajustes.le().com({ duracaoMin: 5 }));
    this.#toca(document.querySelectorAll('.icone')[3]);
    await this.#espera(900);
    this.#checa(
      document.querySelectorAll('.palco--onde .objeto').length === SelfCheck.#ESCOLHAS_INICIAIS,
      `A4 comeca com ${SelfCheck.#ESCOLHAS_INICIAIS} escolhas, senao a pergunta nao pede escolha nenhuma`,
    );
    this.#confereLayout('A4');

    // Toca em todas as escolhas da rodada: uma delas e a certa, e as outras so
    // devolvem o proprio nome. Assim o teste acerta sem precisar espiar a resposta.
    for (let acerto = 1; acerto <= SelfCheck.#ACERTOS_POR_NIVEL; acerto++) {
      const escolhas = [...document.querySelectorAll('.palco--onde .objeto')];
      for (const escolha of escolhas) {
        this.#toca(escolha);
        await this.#espera(120);
      }
      this.#checa(await this.#esperaPor(() => !escolhas[0].isConnected), `acerto ${acerto} leva a proxima rodada sozinho`);
    }
    this.#checa(
      document.querySelectorAll('.palco--onde .objeto').length === SelfCheck.#ESCOLHAS_INICIAIS + 1,
      `depois de ${SelfCheck.#ACERTOS_POR_NIVEL} acertos entra mais uma escolha na tela`,
    );
    this.#confereLayout(`A4 com ${SelfCheck.#ESCOLHAS_INICIAIS + 1} escolhas`);

    await this.#confereVoz();
  }

  // Duas falas ao mesmo tempo viram um borrao em que a crianca nao reconhece
  // nenhuma das duas palavras. Isto ja aconteceu de verdade: o "cade?" dura quase
  // dois segundos e o "achou!" entrava por cima quando ela tocava a cortina.
  async #confereVoz() {
    const original = {
      start: AudioBufferSourceNode.prototype.start,
      stop: AudioBufferSourceNode.prototype.stop,
    };
    let tocando = 0;
    let pico = 0;
    AudioBufferSourceNode.prototype.start = function (...args) {
      tocando += 1;
      pico = Math.max(pico, tocando);
      this.addEventListener('ended', () => { tocando = Math.max(0, tocando - 1); });
      return original.start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      tocando = Math.max(0, tocando - 1);
      return original.stop.apply(this, args);
    };

    try {
      const duracao = this.#app.locutor.fala('cade');
      this.#checa(duracao > 0, `a voz do jogo esta carregada: o "cade?" tem ${duracao}ms`);
      await this.#espera(250);
      this.#app.locutor.fala('achou');
      await this.#espera(200);
      this.#checa(pico <= 1, `nunca tocam duas vozes ao mesmo tempo (pico de ${pico})`);
    } finally {
      AudioBufferSourceNode.prototype.start = original.start;
      AudioBufferSourceNode.prototype.stop = original.stop;
      this.#app.locutor.cala();
    }
  }

  #confereLayout(onde) {
    const pequenos = [...document.querySelectorAll('.alvo')]
      .map((elemento) => ({ elemento, caixa: elemento.getBoundingClientRect() }))
      .filter(({ caixa }) => caixa.width < SelfCheck.#ALVO_MINIMO_PX || caixa.height < SelfCheck.#ALVO_MINIMO_PX);
    const detalhe = pequenos
      .map(({ elemento, caixa }) => `${elemento.className} ${Math.round(caixa.width)}x${Math.round(caixa.height)}`)
      .join(', ');
    this.#checa(
      pequenos.length === 0,
      `todo alvo de ${onde} tem ${SelfCheck.#ALVO_MINIMO_PX}px ou mais ${detalhe && `(${detalhe})`}`,
    );

    // Alvo cortado pela borda e alvo que ela nao alcanca. Nao da para medir isso
    // pelo scrollWidth da pagina: o body e overflow hidden, entao o que passa da
    // tela some da conta em vez de aparecer como sobra.
    const fora = [...document.querySelectorAll('.alvo')]
      .map((elemento) => elemento.getBoundingClientRect())
      .filter((caixa) => caixa.left < -1 || caixa.right > window.innerWidth + 1 || caixa.bottom > window.innerHeight + 1);
    this.#checa(fora.length === 0, `nenhum alvo de ${onde} fica cortado pela borda da tela`);
  }

  // dispatchEvent e sincrono, entao o que corre entre as duas medidas e o caminho
  // inteiro do toque: o listener, a decisao e o agendamento do som.
  #toca(elemento) {
    const antes = performance.now();
    elemento.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, bubbles: true, cancelable: true, width: 20, height: 20 }),
    );
    const depois = performance.now();
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
    return depois - antes;
  }

  #checa(condicao, texto) {
    if (condicao) {
      console.log(`ok   ${texto}`);
      return;
    }
    this.#falhas += 1;
    console.error(`FALHOU ${texto}`);
  }

  #espera(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Esperar o estado, e nao um tanto fixo de tempo: o jogo tem tempos proprios e
  // dormir na conta errada acusa o app de quebrado quando quem chegou cedo foi o
  // teste.
  async #esperaPor(condicao, limiteMs = 6000) {
    const fim = performance.now() + limiteMs;
    while (performance.now() < fim) {
      if (condicao()) return true;
      await this.#espera(80);
    }
    return false;
  }
}

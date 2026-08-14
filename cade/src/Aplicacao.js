// Raiz de composicao e roteamento. E a unica classe que conhece todo mundo: ela
// monta as pecas e liga uma na outra. Todo o resto recebe pronto o que usa, e por
// isso nenhuma outra classe precisa saber de onde a coisa veio.
//
// Tres telas ao todo: os icones, a atividade e o cartao do pai. Nao existe menu,
// tutorial nem tela de ajuste ao alcance da crianca: se ela chega la, o desenho
// falhou.
import Catalogo from './dominio/Catalogo.js';
import Sessao from './dominio/Sessao.js';
import MotorDeAudio from './audio/MotorDeAudio.js';
import BancoDeSons from './audio/BancoDeSons.js';
import Locutor from './audio/Locutor.js';
import VozGravada from './audio/VozGravada.js';
import VozDoJogo from './audio/VozDoJogo.js';
import VozDoAparelho from './audio/VozDoAparelho.js';
import AjustesLocais from './dados/AjustesLocais.js';
import ArquivosDoAparelho from './dados/ArquivosDoAparelho.js';
import AlbumDeFotos from './dados/AlbumDeFotos.js';
import Gravador from './dados/Gravador.js';
import Palco from './tela/Palco.js';
import Toque from './tela/Toque.js';
import Figura from './tela/Figura.js';
import PortaoDoPai from './pai/PortaoDoPai.js';
import PainelDoPai from './pai/PainelDoPai.js';
import CartaoDoPai from './pai/CartaoDoPai.js';
import TocaEAcontece from './atividades/TocaEAcontece.js';
import Esconde from './atividades/Esconde.js';
import Musica from './atividades/Musica.js';
import OndeEsta from './atividades/OndeEsta.js';
import * as sugestoes from './pai/sugestoes.js';
import { OBJETOS, TOQUE, caminhoDaVoz } from './catalogo.js';

export default class Aplicacao {
  #documento;
  #janela;
  #catalogo;
  #ajustes;
  #album;
  #arquivos;
  #motor;
  #sons;
  #locutor;
  #vozGravada;
  #vozDoJogo;
  #gravador;
  #toque;
  #palco;
  #sessao;
  #painel;
  #atividades;
  #travaDaTela = null;
  #cancelaSessao = null;
  #toques = 0;

  constructor({ documento, janela }) {
    this.#documento = documento;
    this.#janela = janela;
    this.#catalogo = new Catalogo(OBJETOS);

    this.#arquivos = new ArquivosDoAparelho({});
    this.#ajustes = new AjustesLocais(janela.localStorage);
    this.#album = new AlbumDeFotos(this.#arquivos);
    this.#gravador = new Gravador();

    const configuracao = this.#ajustes.le();
    this.#motor = new MotorDeAudio({ volume: configuracao.volume });
    this.#sons = new BancoDeSons(this.#motor);
    this.#vozGravada = new VozGravada(this.#motor, this.#arquivos);
    this.#vozDoJogo = new VozDoJogo(this.#motor, { caminhoDe: caminhoDaVoz });
    this.#locutor = new Locutor([
      this.#vozGravada,
      this.#vozDoJogo,
      // O motor entra so pelo volume: speechSynthesis nao passa pelo ganho
      // mestre, e sem ele o ajuste do pai nao valeria para a voz sintetica.
      new VozDoAparelho(this.#catalogo.falas(), this.#motor),
    ]);

    this.#toque = new Toque({ palmaPx: TOQUE.PALMA_PX });
    this.#palco = new Palco(documento.getElementById('app'), { locutor: this.#locutor, sons: this.#sons });
    this.#sessao = new Sessao({ ajustes: this.#ajustes, relogio: this.#relogio() });
    this.#painel = new PainelDoPai({
      ajustes: this.#ajustes,
      album: this.#album,
      locutor: this.#locutor,
      vozGravada: this.#vozGravada,
      gravador: this.#gravador,
      catalogo: this.#catalogo,
      motor: this.#motor,
    });

    // A ordem nunca muda: ela aprende onde fica cada jogo pela posicao, nao pelo
    // desenho (P9).
    this.#atividades = [new TocaEAcontece(), new Esconde(), new Musica(), new OndeEsta()];
  }

  async inicia() {
    // A voz carrega em segundo plano, sem segurar a tela inicial. Decodificar
    // audio pode demorar ou nem responder em navegador estranho, e nenhuma
    // crianca pode ficar olhando tela branca por causa disso.
    this.#vozDoJogo.carrega([...this.#catalogo.palavras(), ...this.#catalogo.perguntas()]);
    await this.#carregaPersonalizacao();

    new PortaoDoPai(() => this.#abreModoPai());
    this.abreInicio();
    this.#registraServiceWorker();

    // Abrir /cade/#test roda o self-check no aparelho de verdade, que e o unico
    // lugar onde o alvo tem tamanho e o som tem atraso. Sem o hash, nada disso
    // e baixado.
    if (this.#janela.location.hash === '#test') {
      const modulo = await import('./selfcheck.js');
      new modulo.default(this).roda();
    }
  }

  // O app nunca diz nao para a crianca. Quando ainda esta descansando, ele
  // simplesmente diz sim para outra coisa: a brincadeira de fora da tela.
  abreInicio() {
    if (!this.#sessao.podeComecar()) {
      this.#palco.mostra(this.#cartao(this.#ajustes.le().ultimaAtividade ?? this.#atividades[0].id));
      return;
    }
    this.#palco.mostra(this.#telaInicial());
  }

  get atividades() {
    return [...this.#atividades];
  }

  get ajustes() {
    return this.#ajustes;
  }

  get motor() {
    return this.#motor;
  }

  get locutor() {
    return this.#locutor;
  }

  #telaInicial() {
    const tela = this.#documento.createElement('div');
    tela.className = 'inicio';
    for (const atividade of this.#atividades) {
      const botao = this.#documento.createElement('button');
      botao.type = 'button';
      botao.className = 'alvo icone';
      botao.setAttribute('aria-label', atividade.id);
      botao.appendChild(new Figura({ caminho: atividade.icone, desenho: atividade.desenho }).elemento);
      this.#toque.aoTocar(botao, () => {
        this.#motor.desbloqueia();
        this.#sons.toca('toque');
        this.#comeca(atividade);
      });
      tela.appendChild(botao);
    }
    return tela;
  }

  #comeca(atividade) {
    this.#toques = 0;
    this.#cancelaSessao?.();
    this.#cancelaSessao = this.#sessao.comeca(() => this.#encerra(atividade));
    this.#seguraTela();
    this.#palco.monta(atividade, {
      catalogo: this.#catalogo,
      sons: this.#sons,
      locutor: this.#locutor,
      album: this.#album,
      toque: this.#toque,
      documento: this.#documento,
      aoInteragir: () => { this.#toques += 1; },
    });
  }

  async #encerra(atividade) {
    this.#cancelaSessao = null;
    await this.#palco.despede();
    this.#soltaTela();
    const configuracao = this.#ajustes.le();
    this.#ajustes.guarda(configuracao.com({
      sessoes: configuracao.sessoes + 1,
      ultimaAtividade: atividade.id,
    }));
    this.#palco.mostra(this.#cartao(atividade.id));
  }

  #cartao(idAtividade) {
    return new CartaoDoPai({ sugestoes, configuracao: this.#ajustes.le() })
      .elemento(idAtividade, this.#toques, () => this.abreInicio());
  }

  // A sessao para enquanto o pai mexe nos ajustes, e a crianca volta para a tela
  // inicial quando ele fecha. Mexer na configuracao nao gasta o tempo dela.
  #abreModoPai() {
    if (this.#painel.estaAberto()) return;
    this.#cancelaSessao?.();
    this.#cancelaSessao = null;
    this.#soltaTela();
    this.#painel.abre(() => this.abreInicio());
  }

  async #carregaPersonalizacao() {
    const configuracao = this.#ajustes.le();
    this.#motor.defineVolume(configuracao.volume);
    await this.#album.carrega(this.#catalogo.todos());
    await this.#vozGravada.carrega(this.#catalogo.palavras());
  }

  #relogio() {
    return {
      agora: () => Date.now(),
      espera: (ms, acao) => {
        const id = setTimeout(acao, ms);
        return () => clearTimeout(id);
      },
    };
  }

  async #seguraTela() {
    try {
      this.#travaDaTela = (await this.#janela.navigator.wakeLock?.request('screen')) ?? null;
    } catch (erro) {
      // Navegador sem wakeLock, ou bateria baixa. A tela apaga sozinha e o pai
      // desbloqueia: chato, mas nao quebra a brincadeira.
      console.warn('sem trava de tela', erro);
    }
  }

  #soltaTela() {
    this.#travaDaTela?.release?.();
    this.#travaDaTela = null;
  }

  #registraServiceWorker() {
    if (!('serviceWorker' in this.#janela.navigator)) return;
    this.#janela.navigator.serviceWorker
      .register('./sw.js')
      .catch((erro) => console.warn('sem service worker', erro));
  }
}

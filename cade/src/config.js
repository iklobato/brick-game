// Todo numero que o RFC fixa mora aqui, para nao ficar espalhado por atividade.

export const TOQUE = {
  // Toque mais largo que isso e a mao apoiada na tela, nao o dedo.
  PALMA_PX: 40,
  // Trava so a animacao. O som sai sempre, senao o toque parece morto.
  ESPERA_MS: 250,
};

export const SESSAO = {
  DURACAO_MIN: 4,
  DESCANSO_MIN: 60,
};

const svg = (conteudo) =>
  `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${conteudo}</svg>`;

// Tres camadas, da melhor para a pior: a foto do brinquedo de verdade da casa
// (o modo pai poe), a foto realista que veio junto com o jogo, e o desenho, que
// so aparece se o arquivo faltar. A ordem e essa porque o que faz o aprendizado
// atravessar a tela e o objeto ser o mesmo dos dois lados (P8): foto generica ja
// e melhor que desenho chapado, e o ursinho dele e melhor que as duas.
export const OBJETOS = [
  {
    id: 'bola',
    artigo: 'a',
    palavra: 'bola',
    foto: 'assets/img/bola.jpg',
    desenho: svg(`
      <circle cx="50" cy="52" r="38" fill="#E8756B"/>
      <path d="M12 52a38 38 0 0 1 76 0" fill="none" stroke="#FAF7F2" stroke-width="9"/>
      <path d="M50 14a30 46 0 0 0 0 76" fill="none" stroke="#FAF7F2" stroke-width="9"/>
    `),
  },
  {
    id: 'copo',
    artigo: 'o',
    palavra: 'copo',
    foto: 'assets/img/copo.jpg',
    desenho: svg(`
      <path d="M28 22h44l-6 62a8 8 0 0 1-8 7H42a8 8 0 0 1-8-7z" fill="#4C9A8F"/>
      <path d="M31 46h38l-4 38a8 8 0 0 1-8 7H43a8 8 0 0 1-8-7z" fill="#8FD0C6"/>
      <rect x="24" y="16" width="52" height="12" rx="6" fill="#2F6F67"/>
    `),
  },
  {
    id: 'cao',
    artigo: 'o',
    palavra: 'cachorro',
    foto: 'assets/img/cao.jpg',
    desenho: svg(`
      <ellipse cx="20" cy="46" rx="12" ry="22" fill="#8C6239"/>
      <ellipse cx="80" cy="46" rx="12" ry="22" fill="#8C6239"/>
      <circle cx="50" cy="50" r="34" fill="#C08A5A"/>
      <ellipse cx="50" cy="66" rx="20" ry="15" fill="#EBD3B6"/>
      <circle cx="38" cy="44" r="5" fill="#2B2724"/>
      <circle cx="62" cy="44" r="5" fill="#2B2724"/>
      <ellipse cx="50" cy="59" rx="7" ry="5" fill="#2B2724"/>
      <path d="M50 64v6M50 70c-4 0-6-2-6-4M50 70c4 0 6-2 6-4" fill="none" stroke="#2B2724" stroke-width="3" stroke-linecap="round"/>
    `),
  },
  {
    id: 'sapato',
    artigo: 'o',
    palavra: 'sapato',
    foto: 'assets/img/sapato.jpg',
    desenho: svg(`
      <path d="M18 62c0-14 8-22 22-22h10l14 14h12c8 0 14 5 14 12v6H18z" fill="#F5F2EC"/>
      <path d="M18 72h72v6a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill="#4C6FA8"/>
      <path d="M40 44l16 16" stroke="#4C6FA8" stroke-width="6" fill="none" stroke-linecap="round"/>
    `),
  },
  {
    id: 'banana',
    artigo: 'a',
    palavra: 'banana',
    foto: 'assets/img/banana.jpg',
    desenho: svg(`
      <path d="M22 26c4 34 24 52 56 52 6 0 10 4 8 8-4 8-18 12-32 10C30 92 14 68 14 34c0-6 7-10 8-8z" fill="#F2C10E"/>
      <path d="M20 24c2-4 8-4 9 1l1 6-9 2z" fill="#8C6239"/>
    `),
  },
  {
    id: 'pato',
    artigo: 'o',
    palavra: 'pato',
    foto: 'assets/img/pato.jpg',
    desenho: svg(`
      <ellipse cx="52" cy="66" rx="34" ry="22" fill="#F2C10E"/>
      <circle cx="30" cy="38" r="18" fill="#F2C10E"/>
      <path d="M12 38h-9c0 6 5 9 9 9z" fill="#E8873B"/>
      <circle cx="26" cy="34" r="3.5" fill="#2B2724"/>
    `),
  },
];

export const objetoPorId = (id) => OBJETOS.find((obj) => obj.id === id);

// "Toca e acontece" mostra tres e so tres: com o palco cheio a crianca para de
// olhar o objeto e passa a varrer a tela (P6). O "Onde esta?" cresce ate seis,
// mas um de cada vez, conforme ela acerta.
export const OBJETOS_BASE = OBJETOS.slice(0, 3);

// Palavras que o pai pode gravar com a propria voz. As tres primeiras nomeiam
// os objetos; "achou" e "cade" sao as falas do jogo do esconde.
export const PALAVRAS = [...OBJETOS.map((obj) => obj.palavra), 'achou', 'cade'];

// A pergunta do "Onde esta?" e um audio inteiro por objeto. O pai nao grava
// estas: sao catorze arquivos, e o que vale a pena ele gravar e o nome das
// coisas, que e o que a crianca repete.
export const perguntaDe = (id) => `onde-${id}`;
export const PERGUNTAS = OBJETOS.map((objeto) => perguntaDe(objeto.id));

// O que cada arquivo de voz diz, palavra por palavra. Uma lista so, lida pelo
// gerador de audio e pela voz de reserva do aparelho: assim o que foi gravado e
// o que seria lido nunca dizem coisas diferentes.
export const FALAS = new Map([
  ...OBJETOS.map((objeto) => [objeto.palavra, objeto.palavra]),
  ['achou', 'achou!'],
  ['cade', 'cadê?'],
  ...OBJETOS.map((objeto) => [perguntaDe(objeto.id), `onde está ${objeto.artigo} ${objeto.palavra}?`]),
]);

export const textoFalado = (id) => FALAS.get(id) ?? id;

// A voz que veio no jogo. Serve so enquanto o pai nao grava a dele: voz de gente
// conhecida vale mais que qualquer sintese, e e a gravacao dele que manda.
export const vozPadraoDe = (palavra) => `assets/audio/${palavra}.wav`;

// Do e mi e sol e do de novo: qualquer combinacao dessas quatro soa certa, entao
// nao existe nota errada para a crianca tocar (P5).
export const NOTAS = [261.63, 329.63, 392.0, 523.25];

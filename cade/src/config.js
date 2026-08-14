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

// Os desenhos sao provisorios: o modo pai troca cada um pela foto do objeto de
// verdade da casa, que e o que faz o aprendizado atravessar a tela (P8).
export const OBJETOS = [
  {
    id: 'bola',
    palavra: 'bola',
    desenho: svg(`
      <circle cx="50" cy="52" r="38" fill="#E8756B"/>
      <path d="M12 52a38 38 0 0 1 76 0" fill="none" stroke="#FAF7F2" stroke-width="9"/>
      <path d="M50 14a30 46 0 0 0 0 76" fill="none" stroke="#FAF7F2" stroke-width="9"/>
    `),
  },
  {
    id: 'copo',
    palavra: 'copo',
    desenho: svg(`
      <path d="M28 22h44l-6 62a8 8 0 0 1-8 7H42a8 8 0 0 1-8-7z" fill="#4C9A8F"/>
      <path d="M31 46h38l-4 38a8 8 0 0 1-8 7H43a8 8 0 0 1-8-7z" fill="#8FD0C6"/>
      <rect x="24" y="16" width="52" height="12" rx="6" fill="#2F6F67"/>
    `),
  },
  {
    id: 'cao',
    palavra: 'cachorro',
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
];

export const objetoPorId = (id) => OBJETOS.find((obj) => obj.id === id);

// Palavras que o pai pode gravar com a propria voz. As tres primeiras nomeiam
// os objetos; "achou" e "cade" sao as falas do jogo do esconde.
export const PALAVRAS = [...OBJETOS.map((obj) => obj.palavra), 'achou', 'cade'];

// Do e mi e sol e do de novo: qualquer combinacao dessas quatro soa certa, entao
// nao existe nota errada para a crianca tocar (P5).
export const NOTAS = [261.63, 329.63, 392.0, 523.25];

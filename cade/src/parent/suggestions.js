// O cartao do fim e o produto de verdade: a tela acaba e a brincadeira comeca.
// Cada sugestao usa o que acabou de acontecer na tela e devolve isso ao mundo
// real, com tres perguntas no formato da leitura dialogica (pergunta, espera,
// repete, acrescenta uma palavra).

const BIBLIOTECA = {
  'toca-e-acontece': [
    {
      sugestao: 'Pegue a bola de verdade e rolem os dois no chao, um para o outro.',
      perguntas: ['Cade a bola?', 'A bola e grande ou pequena?', 'Para onde a bola foi?'],
    },
    {
      sugestao: 'Leve o copo dele ate a pia e deixem ele encher e esvaziar sozinho.',
      perguntas: ['O que tem dentro do copo?', 'Esta cheio ou vazio?', 'Voce quer beber agua?'],
    },
    {
      sugestao: 'Pegue o cachorro de pelucia e facam ele andar, comer e dormir.',
      perguntas: ['O que o cachorro faz?', 'Onde o cachorro dorme?', 'O cachorro esta com fome?'],
    },
  ],
  cade: [
    {
      sugestao: 'Esconda um brinquedo debaixo de um pano na frente dele e deixe ele achar. Depois troque: ele esconde, voce procura.',
      perguntas: ['Cade o brinquedo?', 'Esta embaixo ou em cima?', 'Onde mais podemos esconder?'],
    },
    {
      sugestao: 'Brinquem de esconder atras da porta ou do sofa, um de cada vez.',
      perguntas: ['Cade a mamae?', 'Voce me achou?', 'Agora e a sua vez de esconder, onde voce vai?'],
    },
    {
      sugestao: 'Ponha tres copos virados na mesa e esconda um pedacinho de fruta embaixo de um, na frente dele.',
      perguntas: ['Embaixo de qual copo esta?', 'Sumiu ou esta escondido?', 'Voce quer esconder para mim achar?'],
    },
  ],
  'onde-esta': [
    {
      sugestao: 'Ponha tres brinquedos dele no chao, sente junto e peca um de cada vez: "me da a bola". Espere ele escolher sozinho, sem apontar.',
      perguntas: ['Cade a bola?', 'E o sapato, onde esta?', 'O que e isso aqui?'],
    },
    {
      sugestao: 'Na hora de vestir, espalhe as roupas e os sapatos e peca cada peca pelo nome antes de por.',
      perguntas: ['Cade o sapato?', 'Esse e de qual pe?', 'Voce quer por sozinho?'],
    },
    {
      sugestao: 'No banho, deixe o patinho, o copo e uma bola na agua e peca um por vez.',
      perguntas: ['Onde esta o pato?', 'O pato boia ou afunda?', 'Voce quer encher o copo?'],
    },
  ],
  musica: [
    {
      sugestao: 'Peguem duas panelas e duas colheres de pau e batam juntos, primeiro devagar, depois rapido.',
      perguntas: ['Esta rapido ou devagar?', 'Voce faz igual a mim?', 'Que barulho a panela faz?'],
    },
    {
      sugestao: 'Bata palmas num ritmo curto e espere ele repetir. Depois deixe ele inventar e voce repete.',
      perguntas: ['Voce consegue fazer igual?', 'Agora e a sua vez?', 'Que musica voce quer cantar?'],
    },
    {
      sugestao: 'Cantem juntos a musica preferida dele fazendo os gestos com as maos.',
      perguntas: ['Qual musica voce quer?', 'Como faz com a mao?', 'Voce quer cantar de novo?'],
    },
  ],
};

export const FECHO = 'Espere ele responder. Repita o que ele disser e acrescente uma palavra.';

export const TRAVA_DO_APARELHO =
  'Antes da proxima vez, trave o tablet no app: no iPad e Ajustes, Acessibilidade, Acesso Guiado. ' +
  'No Android e "fixar tela". Sem isso ele sai do jogo sozinho e cai em qualquer outro app.';

export function sugestaoDe(idAtividade, rodada = 0) {
  const lista = BIBLIOTECA[idAtividade] ?? BIBLIOTECA['toca-e-acontece'];
  return lista[Math.abs(rodada) % lista.length];
}

// Gera as fotos e as vozes do jogo e grava os arquivos em cade/assets/. Roda
// AQUI, na maquina, uma vez, e o resultado entra no repositorio: o jogo continua
// sem falar com a rede em tempo de execucao, que e a regra do RFC. Nada disto e
// baixado pelo tablet.
//
//   node cade/gerar-assets.js            # so o que falta
//   node cade/gerar-assets.js --refazer  # tudo de novo
//
// Dois provedores, por um motivo pratico: a imagem vem da OpenRouter (Gemini),
// que entrega foto de produto muito boa, e a voz vem do TTS da OpenAI. A saida de
// audio da OpenRouter e um modelo de CONVERSA: mandar "cade?" faz ele responder
// "o que voce esta procurando?" em vez de falar a palavra, e nenhuma instrucao
// de sistema segurou isso. TTS le o texto e pronto.
//
// Depende do sips, que ja vem no macOS, para cortar em quadrado e encolher: uma
// foto de 440 KB por objeto encheria o cache offline do tablet a toa.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHAVE_OPENROUTER = process.env.OPENROUTER_API_KEY;
const CHAVE_OPENAI = process.env.OPENAI_API_KEY;
const MODELO_IMAGEM = 'google/gemini-3-pro-image';
const MODELO_VOZ = 'gpt-4o-mini-tts';
const VOZ = 'coral';
const LADO_PX = 512;
const QUALIDADE_JPEG = 80;

const REFAZER = process.argv.includes('--refazer');
const PASTA_IMG = path.join(__dirname, 'assets', 'img');
const PASTA_AUDIO = path.join(__dirname, 'assets', 'audio');

const FUNDO = 'on a seamless plain white background, soft even studio lighting, sharp focus, centered, square composition, photorealistic, no text, no logos, no hands, no people';

const IMAGENS = [
  ['bola', `A single child's play ball, bright red rubber with one simple white stripe, ${FUNDO}`],
  ['copo', `A single toddler drinking cup made of teal plastic with two handles, ${FUNDO}`],
  ['cao', `A single soft plush toy dog, brown and cream, sitting and facing the camera with a friendly face, ${FUNDO}`],
  ['icone-toca', `Three toddler toys side by side: a red rubber ball, a teal plastic cup and a small brown plush dog, ${FUNDO}`],
  ['icone-cade', `A small brown plush toy peeking out from under a soft cream blanket, half hidden, ${FUNDO}`],
  ['icone-musica', `Four colorful wooden toy blocks in a row, red, yellow, teal and purple, ${FUNDO}`],
];

// O tom importa tanto quanto a palavra: e a voz que a crianca vai ouvir enquanto
// o pai nao gravar a dele, e voz apressada de assistente nao serve.
const TOM =
  'Fale em portugues do Brasil, devagar, com voz calma, quente e alegre, ' +
  'do jeito que um pai fala com um bebe de dois anos no colo.';

// O arquivo usa o id sem acento; o que a crianca ouve leva a pontuacao, porque
// "achou!" e "cade?" so soam certos com ela.
const PALAVRAS = [
  ['bola', 'bola'],
  ['copo', 'copo'],
  ['cachorro', 'cachorro'],
  ['achou', 'achou!'],
  ['cade', 'cadê?'],
];

let custoTotal = 0;

async function pede(corpo) {
  const resposta = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CHAVE_OPENROUTER}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  if (!resposta.ok) throw new Error(`${resposta.status} ${await resposta.text()}`);
  return resposta;
}

// ------------------------------------------------------------------ imagem

const TENTATIVAS = 3;

// O modelo devolve finish_reason "error" e nenhuma imagem de vez em quando, sem
// nada de errado no pedido: repetir resolve.
async function pedeImagem(pedido) {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    try {
      const resposta = await pede({
        model: MODELO_IMAGEM,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: pedido }],
      });
      const dados = await resposta.json();
      custoTotal += dados.usage?.cost ?? 0;
      const imagens = dados.choices?.[0]?.message?.images ?? [];
      if (imagens.length) return imagens;
      ultimoErro = new Error(`veio sem imagem (${dados.choices?.[0]?.finish_reason})`);
    } catch (erro) {
      ultimoErro = erro;
    }
    await new Promise((pronto) => setTimeout(pronto, 2000 * tentativa));
  }
  throw ultimoErro;
}

async function geraImagem(nome, pedido) {
  const destino = path.join(PASTA_IMG, `${nome}.jpg`);
  if (!REFAZER && fs.existsSync(destino)) return console.log(`  ${nome}.jpg ja existe`);

  const imagens = await pedeImagem(pedido);

  // Quando volta mais de uma, a ultima e a versao final do modelo.
  const url = imagens[imagens.length - 1].image_url.url;
  const bruta = Buffer.from(url.split(',', 2)[1], 'base64');
  const provisoria = path.join(PASTA_IMG, `${nome}.bruta`);
  fs.writeFileSync(provisoria, bruta);

  const sips = (...args) => execFileSync('sips', args, { stdio: 'pipe' }).toString();
  const medida = sips('-g', 'pixelWidth', '-g', 'pixelHeight', provisoria);
  const [largura, altura] = [...medida.matchAll(/pixel(?:Width|Height): (\d+)/g)].map((m) => Number(m[1]));
  const lado = Math.min(largura, altura);
  sips('-c', String(lado), String(lado), '-Z', String(LADO_PX),
       '-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALIDADE_JPEG),
       provisoria, '--out', destino);
  fs.unlinkSync(provisoria);
  console.log(`  ${nome}.jpg  ${Math.round(fs.statSync(destino).size / 1024)} KB (de ${largura}x${altura})`);
}

// -------------------------------------------------------------------- voz

const TAXA = 24000;
const SILENCIO = 500; // amplitude abaixo disto e silencio de gravacao
const FOLGA_MS = 30;

// Corta o silencio das pontas. O que sobra de silencio no comeco do arquivo vira
// atraso entre o dedo e a palavra, e atraso e exatamente o que quebra a relacao
// de causa e efeito nessa idade.
function tiraSilencio(pcm) {
  const amostras = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  let inicio = 0;
  let fim = amostras.length - 1;
  while (inicio < amostras.length && Math.abs(amostras[inicio]) < SILENCIO) inicio++;
  while (fim > inicio && Math.abs(amostras[fim]) < SILENCIO) fim--;
  if (inicio >= fim) return pcm;
  const folga = (FOLGA_MS * TAXA) / 1000;
  inicio = Math.max(0, inicio - folga);
  fim = Math.min(amostras.length - 1, fim + folga);
  return pcm.subarray(inicio * 2, (fim + 1) * 2);
}

function montaWav(pcm) {
  const cabecalho = Buffer.alloc(44);
  cabecalho.write('RIFF', 0);
  cabecalho.writeUInt32LE(36 + pcm.length, 4);
  cabecalho.write('WAVEfmt ', 8);
  cabecalho.writeUInt32LE(16, 16);
  cabecalho.writeUInt16LE(1, 20); // PCM
  cabecalho.writeUInt16LE(1, 22); // mono
  cabecalho.writeUInt32LE(TAXA, 24);
  cabecalho.writeUInt32LE(TAXA * 2, 28);
  cabecalho.writeUInt16LE(2, 32);
  cabecalho.writeUInt16LE(16, 34);
  cabecalho.write('data', 36);
  cabecalho.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([cabecalho, pcm]);
}

const CURTO_DEMAIS_S = 0.15;
const LONGO_DEMAIS_S = 4;

// Pede o audio ja em PCM cru: assim ele passa pelo mesmo corte de silencio das
// pontas e sai no mesmo WAV que a gravacao do pai, sem um segundo formato no meio.
async function geraVoz([arquivo, texto]) {
  const destino = path.join(PASTA_AUDIO, `${arquivo}.wav`);
  if (!REFAZER && fs.existsSync(destino)) return console.log(`  ${arquivo}.wav ja existe`);

  const resposta = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CHAVE_OPENAI}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODELO_VOZ, voice: VOZ, input: texto, instructions: TOM, response_format: 'pcm' }),
  });
  if (!resposta.ok) throw new Error(`${arquivo}: ${resposta.status} ${await resposta.text()}`);

  const pcm = tiraSilencio(Buffer.from(await resposta.arrayBuffer()));
  const segundos = pcm.length / 2 / TAXA;
  if (segundos < CURTO_DEMAIS_S || segundos > LONGO_DEMAIS_S) {
    throw new Error(`${arquivo}: saiu com ${segundos.toFixed(2)}s, o que nao e uma palavra solta`);
  }
  fs.writeFileSync(destino, montaWav(pcm));
  console.log(`  ${arquivo}.wav  ${segundos.toFixed(2)}s  "${texto}"`);
}

// ------------------------------------------------------------------- main

async function principal() {
  if (!CHAVE_OPENROUTER) throw new Error('falta OPENROUTER_API_KEY no ambiente');
  if (!CHAVE_OPENAI) throw new Error('falta OPENAI_API_KEY no ambiente');
  fs.mkdirSync(PASTA_IMG, { recursive: true });
  fs.mkdirSync(PASTA_AUDIO, { recursive: true });

  console.log(`fotos (${MODELO_IMAGEM}):`);
  for (const [nome, pedido] of IMAGENS) await geraImagem(nome, pedido);

  console.log(`vozes (${MODELO_VOZ}, voz ${VOZ}):`);
  for (const palavra of PALAVRAS) await geraVoz(palavra);

  console.log(`\ncusto desta rodada: US$ ${custoTotal.toFixed(4)}`);
  console.log('agora rode: node cade/test-cade.js  (ele cobra o nome novo do cache)');
}

principal().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});

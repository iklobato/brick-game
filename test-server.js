// Teste do servidor: cria clientes WebSocket de verdade (handshake + quadros
// mascarados) e confere salas por jogo, papeis, repasse, lobby e saida.
// Rode com o servidor no ar: node server.js  (em outro terminal)  node test-server.js
const net = require('net');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// Ancora do handshake: par chave/resposta publicado na RFC 6455. Sem ele o teste
// so compara o servidor com uma copia da mesma constante, entao um GUID errado
// passa despercebido: foi exatamente assim que um 'C' fora de lugar sobreviveu
// aos testes e quebrou todo navegador de verdade.
const RFC_CHAVE = 'dGhlIHNhbXBsZSBub25jZQ==';
const RFC_ACCEPT = 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=';
let falhas = 0;

function checa(condicao, texto) {
  if (condicao) {
    console.log(`ok   ${texto}`);
    return;
  }
  falhas++;
  console.log(`FALHOU ${texto}`);
}

function frameCliente(texto) {
  const corpo = Buffer.from(texto);
  const mascara = crypto.randomBytes(4);
  const cabecalho = corpo.length < 126
    ? Buffer.from([0x81, 0x80 | corpo.length])
    : Buffer.concat([Buffer.from([0x81, 0xfe]), (() => { const b = Buffer.alloc(2); b.writeUInt16BE(corpo.length); return b; })()]);
  const misturado = Buffer.from(corpo);
  for (let i = 0; i < misturado.length; i++) misturado[i] ^= mascara[i % 4];
  return Buffer.concat([cabecalho, mascara, misturado]);
}

function leQuadros(estado, chunk, onTexto) {
  estado.buf = Buffer.concat([estado.buf, chunk]);
  for (;;) {
    const buf = estado.buf;
    if (buf.length < 2) return;
    let tamanho = buf[1] & 0x7f;
    let inicio = 2;
    if (tamanho === 126) {
      if (buf.length < 4) return;
      tamanho = buf.readUInt16BE(2);
      inicio = 4;
    }
    if (buf.length < inicio + tamanho) return;
    const corpo = buf.subarray(inicio, inicio + tamanho).toString();
    estado.buf = buf.subarray(inicio + tamanho);
    onTexto(corpo);
  }
}

function conecta(nome, jogo) {
  return new Promise((resolve) => {
    const chave = crypto.randomBytes(16).toString('base64');
    const socket = net.connect(PORT, '127.0.0.1');
    const cliente = { nome, socket, buf: Buffer.alloc(0), recebidas: [], pronto: false };
    cliente.envia = (obj) => socket.write(frameCliente(JSON.stringify(obj)));
    socket.on('connect', () => {
      socket.write(
        `GET / HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${chave}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
      );
    });
    socket.on('data', (chunk) => {
      if (!cliente.pronto) {
        const texto = chunk.toString();
        const corte = texto.indexOf('\r\n\r\n');
        const esperado = crypto.createHash('sha1').update(chave + GUID).digest('base64');
        checa(texto.slice(0, corte).includes(`Sec-WebSocket-Accept: ${esperado}`), `${nome}: handshake aceito`);
        cliente.pronto = true;
        const sobra = chunk.subarray(corte + 4);
        if (sobra.length) leQuadros(cliente, sobra, (t) => cliente.recebidas.push(JSON.parse(t)));
        cliente.envia({ t: 'join', game: jogo });
        resolve(cliente);
        return;
      }
      leQuadros(cliente, chunk, (t) => cliente.recebidas.push(JSON.parse(t)));
    });
  });
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const ultima = (cliente, tipo) => [...cliente.recebidas].reverse().find((m) => m.t === tipo);

function testaHandshakeDaRfc() {
  return new Promise((resolve) => {
    const socket = net.connect(PORT, '127.0.0.1', () => {
      socket.write(
        `GET / HTTP/1.1\r\nHost: 127.0.0.1:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${RFC_CHAVE}\r\nSec-WebSocket-Version: 13\r\n\r\n`,
      );
    });
    socket.once('data', (chunk) => {
      const recebido = /sec-websocket-accept: (.*)/i.exec(chunk.toString())?.[1];
      checa(recebido === RFC_ACCEPT, 'o handshake bate com o exemplo publicado na RFC 6455');
      socket.destroy();
      resolve();
    });
  });
}

async function main() {
  await testaHandshakeDaRfc();

  const menu = await conecta('menu', 'menu');
  await espera(150);
  checa(ultima(menu, 'lobby') !== undefined, 'quem abre o menu recebe o quadro de salas');

  const a = await conecta('A', 'brick');
  await espera(150);
  checa(ultima(a, 'room')?.role === 'host', 'quem entra primeiro vira host');
  checa(ultima(a, 'room')?.game === 'brick', 'a sala vem com o nome do jogo');
  checa(ultima(menu, 'lobby')?.rooms?.brick === 1, 'o menu ve 1 pessoa no brick');

  const outroJogo = await conecta('X', 'tower');
  await espera(150);
  checa(ultima(outroJogo, 'room')?.role === 'host', 'quem entra em outro jogo tambem e host');
  checa(ultima(a, 'room')?.peers === 1, 'quem esta no brick nao pareia com quem esta no tower');
  checa(ultima(menu, 'lobby')?.rooms?.tower === 1, 'o menu conta as duas salas');

  const b = await conecta('B', 'brick');
  await espera(150);
  checa(ultima(b, 'room')?.role === 'guest', 'quem entra depois no mesmo jogo vira convidado');
  checa(ultima(a, 'room')?.peers === 2, 'o host fica sabendo que encheu');

  checa(ultima(a, 'who') !== undefined, 'quem pareia recebe o cartao do adversario');
  checa(ultima(b, 'who')?.info?.local === true, 'jogando na mesma rede o cartao diz que e local');
  checa(typeof ultima(a, 'who')?.info?.ip === 'string', 'o cartao sempre traz o ip');

  a.envia({ t: 'state', round: 7 });
  await espera(150);
  checa(ultima(b, 'state')?.round === 7, 'o estado do host chega no convidado');
  checa(!ultima(a, 'state'), 'o host nao recebe de volta o proprio estado');
  checa(!ultima(outroJogo, 'state'), 'o estado nao vaza para o outro jogo');

  b.envia({ t: 'in', a: 'shoot' });
  await espera(150);
  checa(ultima(a, 'in')?.a === 'shoot', 'o comando do convidado chega no host');

  const c = await conecta('C', 'brick');
  await espera(150);
  checa(ultima(c, 'full')?.game === 'brick', 'o terceiro do mesmo jogo recebe sala cheia');

  a.socket.destroy();
  await espera(250);
  checa(ultima(b, 'room')?.role === 'host', 'saindo o host, quem ficou assume');
  checa(ultima(b, 'room')?.peers === 1, 'a sala volta a ter 1');
  checa(ultima(menu, 'lobby')?.rooms?.brick === 1, 'o menu acompanha a saida');

  b.socket.destroy();
  outroJogo.socket.destroy();
  c.socket.destroy();
  await espera(250);
  checa(Object.keys(ultima(menu, 'lobby')?.rooms ?? {}).length === 0, 'com todos fora o quadro fica vazio');

  menu.socket.destroy();
  await espera(100);
  console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo no servidor');
  process.exit(falhas ? 1 : 0);
}

main();

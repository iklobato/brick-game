// Servidor do modo dois jogadores: serve os arquivos do jogo e repassa as
// mensagens entre os dois navegadores. Sem dependencia nenhuma: o WebSocket e
// implementado na mao (RFC 6455, so quadros de texto, que e tudo que o jogo usa).
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;
// Atras do tunel o servidor escuta so no loopback: nada fica exposto na
// internet, igual ao hub que ja roda no mesmo droplet.
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  // sem o tipo certo o navegador recusa o svg e cai de volta no favicon.ico
  '.svg': 'image/svg+xml',
};

// "/" e "/brick" e "/brick/" viram todos o index.html da pasta certa
function caminhoDo(pedido) {
  const base = path.join(ROOT, pedido);
  if (path.extname(base) && !pedido.endsWith('/')) return base;
  return path.join(base, 'index.html');
}

const server = http.createServer((req, res) => {
  const pedido = decodeURIComponent(req.url.split('?')[0]);
  const alvo = caminhoDo(pedido);
  if (!alvo.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('fora da pasta');
    return;
  }
  fs.readFile(alvo, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('nao achei');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(alvo)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

// ---------------------------------------------------------------- websocket

// opcode 1 = texto, 9 = ping, 10 = pong, 8 = close
function encodeFrame(text, opcode = 0x1) {
  const corpo = Buffer.isBuffer(text) ? text : Buffer.from(text);
  const tamanho = corpo.length;
  const primeiro = 0x80 | opcode;
  if (tamanho < 126) return Buffer.concat([Buffer.from([primeiro, tamanho]), corpo]);
  if (tamanho < 65536) {
    const cabecalho = Buffer.alloc(4);
    cabecalho[0] = primeiro;
    cabecalho[1] = 126;
    cabecalho.writeUInt16BE(tamanho, 2);
    return Buffer.concat([cabecalho, corpo]);
  }
  const cabecalho = Buffer.alloc(10);
  cabecalho[0] = primeiro;
  cabecalho[1] = 127;
  cabecalho.writeBigUInt64BE(BigInt(tamanho), 2);
  return Buffer.concat([cabecalho, corpo]);
}

// Le do buffer acumulado quantos quadros completos couberem. Alem do texto,
// precisa responder PING: quem esta no meio (Cloudflare, proxy) manda ping e
// derruba a conexao se ninguem responde, o que aparece como erro 1006.
function readFrames(cliente, chunk, onText, onClose) {
  cliente.buffer = Buffer.concat([cliente.buffer, chunk]);
  for (;;) {
    const buf = cliente.buffer;
    if (buf.length < 2) return;
    const opcode = buf[0] & 0x0f;
    const ehFinal = (buf[0] & 0x80) !== 0;
    const temMascara = (buf[1] & 0x80) !== 0;
    let tamanho = buf[1] & 0x7f;
    let inicio = 2;
    if (tamanho === 126) {
      if (buf.length < 4) return;
      tamanho = buf.readUInt16BE(2);
      inicio = 4;
    }
    if (tamanho === 127) {
      if (buf.length < 10) return;
      tamanho = Number(buf.readBigUInt64BE(2));
      inicio = 10;
    }
    let mascara = null;
    if (temMascara) {
      if (buf.length < inicio + 4) return;
      mascara = buf.subarray(inicio, inicio + 4);
      inicio += 4;
    }
    if (buf.length < inicio + tamanho) return;
    const corpo = Buffer.from(buf.subarray(inicio, inicio + tamanho));
    if (mascara) for (let i = 0; i < corpo.length; i++) corpo[i] ^= mascara[i % 4];
    cliente.buffer = buf.subarray(inicio + tamanho);
    if (opcode === 0x8) return onClose();
    if (opcode === 0x9) {
      cliente.socket.write(encodeFrame(corpo, 0xa)); // pong com o mesmo conteudo
      continue;
    }
    if (opcode === 0xa) continue; // pong de resposta ao nosso ping: nada a fazer
    // 0x0 e continuacao: junta ate o quadro final chegar
    if (opcode === 0x0 || opcode === 0x1) {
      cliente.parcial = opcode === 0x1 ? corpo : Buffer.concat([cliente.parcial ?? Buffer.alloc(0), corpo]);
      const fim = ehFinal;
      if (!fim) continue;
      const inteiro = cliente.parcial;
      cliente.parcial = null;
      onText(inteiro.toString());
    }
  }
}

const LOBBY = 'menu';
const MAX_POR_SALA = 2;
const IP_TIMEOUT = 2500;
const PRIVADO = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|169\.254\.)/i;

// De onde o adversario esta jogando. O servidor pergunta uma vez por IP e
// guarda a resposta; rede local e internet fora do ar caem no "nao descobri".
const lugares = new Map();

function limpaIp(bruto) {
  return String(bruto ?? '').replace(/^::ffff:/, '');
}

// Atras do Caddy quem abre a conexao e o proxy, entao socket.remoteAddress e o
// container dele e todo adversario apareceria como vizinho de rede. O IP do
// jogador so existe no X-Forwarded-For, e vale o ULTIMO da lista: o proxy anexa
// o endereco real no fim, enquanto o que vem antes pode ter sido escrito pelo
// proprio cliente. Sem proxy o header nao existe e o socket ja diz a verdade.
function ipDoCliente(req, socket) {
  const encaminhado = String(req.headers['x-forwarded-for'] ?? '').split(',').pop().trim();
  return limpaIp(encaminhado || socket.remoteAddress);
}

function consultaIp(ip) {
  return new Promise((resolve) => {
    const req = https.get(`https://ipinfo.io/${ip}/json`, { timeout: IP_TIMEOUT }, (res) => {
      let corpo = '';
      res.on('data', (parte) => { corpo += parte; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(corpo));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function descobreLugar(ip) {
  if (!ip) return { ip: '?', local: true };
  if (lugares.has(ip)) return lugares.get(ip);
  const local = PRIVADO.test(ip);
  const dados = local ? null : await consultaIp(ip);
  const lugar = dados && !dados.error
    ? { ip, city: dados.city, region: dados.region, country: dados.country, org: dados.org, postal: dados.postal, timezone: dados.timezone }
    : { ip, local };
  lugares.set(ip, lugar);
  return lugar;
}

// Uma sala por jogo: quem esta no brick nao encontra quem esta no agar.
// Quem fica no menu nao joga, so acompanha quantos tem em cada sala.
const salas = new Map();
const espectadores = new Set();

const salaDe = (jogo) => {
  if (!salas.has(jogo)) salas.set(jogo, []);
  return salas.get(jogo);
};

function envia(cliente, obj) {
  if (cliente.socket.destroyed) return;
  cliente.socket.write(encodeFrame(JSON.stringify(obj)));
}

function contagem() {
  const quadro = {};
  for (const [jogo, sala] of salas) if (sala.length) quadro[jogo] = sala.length;
  return quadro;
}

function avisaTodos(jogo) {
  const sala = salaDe(jogo);
  for (const cliente of sala) {
    envia(cliente, { t: 'room', game: jogo, role: cliente.role, peers: sala.length });
  }
  const quadro = contagem();
  for (const cliente of espectadores) envia(cliente, { t: 'lobby', rooms: quadro });
}

function entraNaSala(cliente, jogo) {
  if (jogo === LOBBY) {
    espectadores.add(cliente);
    cliente.jogo = LOBBY;
    envia(cliente, { t: 'lobby', rooms: contagem() });
    return;
  }
  const sala = salaDe(jogo);
  if (sala.length >= MAX_POR_SALA) {
    envia(cliente, { t: 'full', game: jogo });
    return;
  }
  cliente.jogo = jogo;
  cliente.role = sala.length === 0 ? 'host' : 'guest';
  sala.push(cliente);
  console.log(`entrou no ${jogo} como ${cliente.role} (${sala.length}/${MAX_POR_SALA})`);
  avisaTodos(jogo);
  trocaCartoes(sala);
}

// Cada um recebe o cartao do outro: quem nao quer compartilhar manda so o basico.
async function trocaCartoes(sala) {
  if (sala.length < 2) return;
  const cartoes = await Promise.all(sala.map(async (cliente) => {
    if (cliente.share === false) return { escondido: true };
    return descobreLugar(cliente.ip);
  }));
  sala.forEach((cliente, i) => {
    const outro = cartoes[1 - i];
    if (outro) envia(cliente, { t: 'who', info: outro });
  });
}

const PING_INTERVAL = 25000;

function entra(socket, ip) {
  const cliente = { socket, buffer: Buffer.alloc(0), parcial: null, jogo: null, role: null, ip, share: true };
  // mantem viva a conexao ociosa: sem trafego, proxies fecham por conta propria
  const batida = setInterval(() => {
    if (socket.destroyed) return;
    socket.write(encodeFrame(Buffer.alloc(0), 0x9));
  }, PING_INTERVAL);

  socket.on('data', (chunk) => {
    readFrames(
      cliente,
      chunk,
      (texto) => {
        const msg = JSON.parse(texto);
        if (msg.t === 'join') {
          cliente.share = msg.share !== false;
          entraNaSala(cliente, msg.game);
          return;
        }
        // o servidor so leva e traz: quem manda no jogo e o navegador host
        if (!cliente.jogo || cliente.jogo === LOBBY) return;
        for (const outro of salaDe(cliente.jogo)) {
          if (outro === cliente || outro.socket.destroyed) continue;
          outro.socket.write(encodeFrame(texto));
        }
      },
      () => socket.destroy(),
    );
  });

  const sai = () => {
    clearInterval(batida);
    socket.destroy();
    espectadores.delete(cliente);
    if (!cliente.jogo || cliente.jogo === LOBBY) return;
    const sala = salaDe(cliente.jogo);
    const i = sala.indexOf(cliente);
    if (i < 0) return;
    sala.splice(i, 1);
    console.log(`saiu do ${cliente.jogo} (${sala.length}/${MAX_POR_SALA})`);
    // quem ficou vira host, senao ninguem simula o jogo
    sala.forEach((restante, indice) => {
      restante.role = indice === 0 ? 'host' : 'guest';
    });
    avisaTodos(cliente.jogo);
    cliente.jogo = null;
  };

  // socket de upgrade aceita meio-fechado: sem escutar o 'end' o navegador que
  // fecha a aba vira fantasma na sala e ninguem mais consegue entrar
  socket.on('end', sai);
  socket.on('close', sai);
  socket.on('error', sai);
}

server.on('upgrade', (req, socket) => {
  const chave = req.headers['sec-websocket-key'];
  if (!chave) {
    socket.destroy();
    return;
  }
  const aceite = crypto.createHash('sha1').update(chave + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${aceite}\r\n\r\n`,
  );
  socket.setNoDelay(true);
  entra(socket, ipDoCliente(req, socket));
});

server.listen(PORT, HOST, () => {
  const rede = Object.values(require('os').networkInterfaces())
    .flat()
    .filter((info) => info.family === 'IPv4' && !info.internal)
    .map((info) => info.address);
  console.log(`Jogo em http://localhost:${PORT} (escutando em ${HOST})`);
  for (const ip of rede) console.log(`Na rede local: http://${ip}:${PORT}`);
});

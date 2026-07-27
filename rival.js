// Ficha de quem esta do outro lado: de onde joga, que rede usa, que horas sao
// la e quanto demora a mensagem chegar. Usada pelo brick e pelo tower.
const PING_EVERY_MS = 2000;

const rival = {
  info: null,
  ping: null,
  onChange: null,
};

function bandeira(pais) {
  if (!pais || pais.length !== 2) return '';
  return String.fromCodePoint(...[...pais.toUpperCase()].map((letra) => 0x1f1a5 + letra.charCodeAt(0)));
}

// Hora que esta na casa dele agora, e a diferenca para a sua.
function horaDele(fuso) {
  try {
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { timeZone: fuso, hour: '2-digit', minute: '2-digit' });
    const meu = new Date(agora.toLocaleString('en-US'));
    const dele = new Date(agora.toLocaleString('en-US', { timeZone: fuso }));
    const horas = Math.round((dele - meu) / 3600000);
    if (!horas) return `${hora} (mesma hora que voce)`;
    return `${hora} (${Math.abs(horas)}h ${horas > 0 ? 'a mais' : 'a menos'})`;
  } catch {
    return fuso;
  }
}

function linhasDaFicha() {
  const info = rival.info;
  const linhas = [];
  if (!info) return linhas;
  if (info.escondido) linhas.push(['Lugar', 'ele preferiu nao dizer']);
  if (info.local) linhas.push(['Lugar', 'aqui na sua rede']);
  if (info.city) linhas.push(['Cidade', `${bandeira(info.country)} ${info.city}, ${info.region}`]);
  if (info.ip) linhas.push(['IP', info.ip]);
  if (info.org) linhas.push(['Rede', info.org]);
  if (info.postal) linhas.push(['CEP', info.postal]);
  if (info.timezone) linhas.push(['Hora la', horaDele(info.timezone)]);
  if (rival.ping !== null) linhas.push(['Ping', `${rival.ping} ms`]);
  return linhas;
}

function desenhaFicha(alvo) {
  alvo.replaceChildren();
  for (const [rotulo, valor] of linhasDaFicha()) {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = rotulo;
    dd.textContent = valor;
    alvo.append(dt, dd);
  }
}

// Responde ping, mede o pong e guarda o cartao. Devolve true se cuidou da
// mensagem, para o jogo nao precisar tratar de novo.
function rivalHandles(msg) {
  if (msg.t === 'who') {
    rival.info = msg.info;
    rival.onChange?.();
    return true;
  }
  if (msg.t === 'ping') {
    netSend({ t: 'pong', ts: msg.ts });
    return true;
  }
  if (msg.t === 'pong') {
    rival.ping = Math.round(performance.now() - msg.ts);
    rival.onChange?.();
    return true;
  }
  return false;
}

setInterval(() => {
  if (net.peers > 1) netSend({ t: 'ping', ts: performance.now() });
}, PING_EVERY_MS);

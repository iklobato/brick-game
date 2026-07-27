// Ligacao com o servidor. O nome da sala sai da propria pasta do jogo
// (/brick/ -> "brick"), entao cada jogo pareia so com quem esta no mesmo jogo.
// Sem servidor (arquivo aberto direto do disco) tudo funciona sozinho: 'solo'.
const net = {
  socket: null,
  game: location.pathname.split('/').filter(Boolean)[0] ?? 'menu',
  role: 'solo',
  peers: 1,
  rooms: {},
  erro: null,
  // quem nao quiser dizer de onde joga desliga aqui; vale na proxima conexao
  share: localStorage.getItem('netShare') !== 'off',
  onRole: null,
  onLobby: null,
  onMessage: null,
};

function netSend(obj) {
  if (!net.socket || net.socket.readyState !== WebSocket.OPEN) return;
  net.socket.send(JSON.stringify(obj));
}

function netConnect() {
  if (!location.protocol.startsWith('http')) return; // aberto do disco: fica solo
  // https na pagina obriga wss no socket
  const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocolo}//${location.host}`);
  net.socket = socket;

  socket.addEventListener('open', () => netSend({ t: 'join', game: net.game, share: net.share }));

  socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.t === 'lobby') {
      net.rooms = msg.rooms;
      net.onLobby?.();
      return;
    }
    if (msg.t === 'room') {
      net.role = msg.role;
      net.peers = msg.peers;
      net.onRole?.();
      return;
    }
    if (msg.t === 'full') {
      net.role = 'full';
      net.onRole?.();
      return;
    }
    net.onMessage?.(msg);
  });

  const desconectou = (evento) => {
    // guarda por que caiu, para a tela poder explicar em vez de chutar
    net.erro = evento?.type === 'error' ? 'recusado' : `fechou (${evento?.code ?? '?'})`;
    net.socket = null;
    net.role = 'solo';
    net.peers = 1;
    net.onRole?.();
    net.onLobby?.();
  };

  socket.addEventListener('close', desconectou);
  socket.addEventListener('error', desconectou);
}

netConnect();

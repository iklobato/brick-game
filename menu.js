const ui = {
  status: document.getElementById('status'),
  endereco: document.getElementById('endereco'),
  brick: document.getElementById('sala-brick'),
};

const TEXTO_SALA = {
  0: ['ninguém jogando', 'vazio'],
  1: ['1 pessoa esperando', 'esperando'],
  2: ['sala cheia', 'cheio'],
};

ui.endereco.textContent = location.origin;

function mostraSalas() {
  const quantos = Math.min(2, net.rooms.brick ?? 0);
  const [texto, classe] = TEXTO_SALA[quantos];
  ui.brick.textContent = texto;
  ui.brick.className = classe;
}

function mostraStatus() {
  if (net.socket && net.role !== 'solo') {
    ui.status.textContent = 'conectado: dá para jogar em dois';
    ui.status.className = 'status ok';
    mostraSalas();
    return;
  }
  if (net.socket) {
    ui.status.textContent = 'conectando...';
    ui.status.className = 'status';
    return;
  }
  // sem socket: ou a pagina veio do disco, ou a conexao foi recusada
  if (!location.protocol.startsWith('http')) {
    ui.status.textContent = 'aberto direto do arquivo: para jogar em dois abra pelo endereço do servidor';
    ui.status.className = 'status off';
    return;
  }
  ui.status.innerHTML = net.erro === 'recusado'
    ? 'o navegador recusou a conexão do modo dois jogadores. <a href="/diagnostico.html">abrir o diagnóstico</a>'
    : `a conexão caiu: ${net.erro ?? 'sem resposta'}. <a href="/diagnostico.html">abrir o diagnóstico</a>`;
  ui.status.className = 'status off';
}

net.onLobby = mostraStatus;
net.onRole = mostraStatus;
setTimeout(mostraStatus, 2500);

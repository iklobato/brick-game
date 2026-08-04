const ui = {
  status: document.getElementById('status'),
  // Um por jogo que aceita dupla: o data-sala diz de qual sala a tag fala, entao
  // ligar um jogo novo na rede e so marcar a tag dele no html.
  salas: document.querySelectorAll('[data-sala]'),
};

const TEXTO_SALA = {
  0: ['ninguém jogando', 'vazio'],
  1: ['1 pessoa esperando', 'esperando'],
  2: ['sala cheia', 'cheio'],
};

function mostraSalas() {
  for (const tag of ui.salas) {
    const quantos = Math.min(2, net.rooms[tag.dataset.sala] ?? 0);
    const [texto, classe] = TEXTO_SALA[quantos];
    tag.textContent = texto;
    tag.className = classe;
  }
}

// O servidor fica no ar o tempo todo, entao conectar e o esperado e nao merece
// aviso nenhum: a linha so aparece quando o modo dois jogadores nao sobe, que e
// a unica hora em que quem esta na pagina precisa saber de alguma coisa.
function mostraStatus() {
  if (net.socket) {
    ui.status.hidden = true;
    // Quem esta no menu nunca pareia com ninguem, entao o papel aqui e sempre
    // 'solo'. Esperar sair de solo para desenhar as salas era esperar por algo
    // que nao acontece: o quadro de salas vem do lobby, nao do papel.
    mostraSalas();
    return;
  }
  // sem socket: ou a pagina veio do disco, ou a conexao foi recusada
  if (!location.protocol.startsWith('http')) {
    ui.status.textContent = 'aberto direto do arquivo: para jogar em dois abra pelo endereço do site';
  } else {
    ui.status.innerHTML = net.erro === 'recusado'
      ? 'o navegador recusou a conexão do modo dois jogadores. <a href="/diagnostico.html">abrir o diagnóstico</a>'
      : `a conexão caiu: ${net.erro ?? 'sem resposta'}. <a href="/diagnostico.html">abrir o diagnóstico</a>`;
  }
  ui.status.hidden = false;
}

net.onLobby = mostraStatus;
net.onRole = mostraStatus;
setTimeout(mostraStatus, 2500);

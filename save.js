// Progresso que sobrevive entre partidas, igual para qualquer jogo: moedas,
// melhorias compradas, metas concluidas, totais e o desafio do dia. Cada jogo
// guarda na sua propria chave e traz a propria lista de melhorias e metas.
const SAVE_BASE = {
  coins: 0,
  upgrades: {},
  totals: {},
  goals: {},
  daily: { date: '', best: 0 },
};

function criaSave(jogo, upgradesPadrao = {}, totaisPadrao = {}) {
  const chave = `save:${jogo}`;
  let cru = {};
  try {
    cru = JSON.parse(localStorage.getItem(chave) ?? '{}');
  } catch {
    cru = {};
  }
  return {
    chave,
    padrao: { upgradesPadrao, totaisPadrao },
    coins: cru.coins ?? 0,
    upgrades: { ...upgradesPadrao, ...cru.upgrades },
    totals: { ...totaisPadrao, ...cru.totals },
    goals: { ...cru.goals },
    daily: { ...SAVE_BASE.daily, ...cru.daily },
  };
}

function gravaSave(save) {
  localStorage.setItem(save.chave, JSON.stringify({
    coins: save.coins,
    upgrades: save.upgrades,
    totals: save.totals,
    goals: save.goals,
    daily: save.daily,
  }));
}

function limpaSave(save) {
  localStorage.removeItem(save.chave);
  save.coins = 0;
  save.upgrades = { ...save.padrao.upgradesPadrao };
  save.totals = { ...save.padrao.totaisPadrao };
  save.goals = {};
  save.daily = { date: '', best: 0 };
}

// O preco sobe a cada nivel comprado, entao sempre ha um proximo objetivo.
const precoDe = (save, melhoria) => Math.round(melhoria.base * Math.pow(1.6, save.upgrades[melhoria.key] ?? 0));

function compraMelhoria(save, melhoria) {
  const nivel = save.upgrades[melhoria.key] ?? 0;
  const preco = precoDe(save, melhoria);
  if (nivel >= melhoria.max || save.coins < preco) return false;
  save.coins -= preco;
  save.upgrades[melhoria.key] = nivel + 1;
  gravaSave(save);
  return true;
}

// Devolve quanto pagou nas metas concluidas agora; cada uma paga uma vez so.
function confereMetas(save, metas) {
  let premio = 0;
  for (const meta of metas) {
    if (save.goals[meta.key] || !meta.feito(save)) continue;
    save.goals[meta.key] = true;
    save.coins += meta.premio;
    premio += meta.premio;
  }
  return premio;
}

function desenhaLoja(save, melhorias, metas, ui, aoComprar) {
  ui.moedas.textContent = save.coins;
  ui.lojaLista.replaceChildren();
  for (const melhoria of melhorias) {
    const nivel = save.upgrades[melhoria.key] ?? 0;
    const cheio = nivel >= melhoria.max;
    const preco = precoDe(save, melhoria);
    const botao = document.createElement('button');
    botao.innerHTML = `${melhoria.nome} ${nivel}/${melhoria.max}<small>${cheio ? 'no maximo' : `${melhoria.texto} · ${preco} moedas`}</small>`;
    botao.disabled = cheio || save.coins < preco;
    botao.addEventListener('click', () => {
      if (compraMelhoria(save, melhoria)) aoComprar();
    });
    ui.lojaLista.append(botao);
  }
  ui.metas.replaceChildren();
  for (const meta of metas) {
    const item = document.createElement('li');
    const feita = save.goals[meta.key];
    item.textContent = `${feita ? '✓' : '·'} ${meta.nome} (+${meta.premio})`;
    item.className = feita ? 'feita' : '';
    ui.metas.append(item);
  }
}

// ------------------------------------------------------------ desafio do dia

function hojeTexto() {
  const hoje = new Date();
  return `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`;
}

const sementeDoDia = () => (Number(hojeTexto()) % 9999) + 1;

function melhorDoDia(save) {
  return save.daily.date === hojeTexto() ? save.daily.best : 0;
}

function guardaDoDia(save, valor) {
  const hoje = hojeTexto();
  if (save.daily.date !== hoje) save.daily = { date: hoje, best: 0 };
  save.daily.best = Math.max(save.daily.best, valor);
}

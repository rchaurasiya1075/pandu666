// ===== Demo State =====
const demoState = {
  wallet: 10000,
  matches: [
    {
      id: 'IND-AUS',
      teams: ['IND', 'AUS'],
      oversTotal: 20,
      score: { batting: 'IND', IND: {runs: 0, wkts: 0, overs: 0.0}, AUS: {runs: 0, wkts: 0, overs: 0.0} },
      players: {
        IND: ['R. Sharma','V. Kohli','S. Gill','S. Iyer','S. Yadav'],
        AUS: ['D. Warner','T. Head','M. Marsh','S. Smith','G. Maxwell']
      },
      status: 'live', // or 'finished'
      odds: { // starting odds
        match_winner: { IND: 1.85, AUS: 2.05 },
        over_runs:   { Over: 1.90, Under: 1.90, line: 9.5, overNumber: 1 },
        top_batter:  {}
      }
    },
    {
      id: 'ENG-PAK',
      teams: ['ENG', 'PAK'],
      oversTotal: 20,
      score: { batting: 'ENG', ENG: {runs: 0, wkts: 0, overs: 0.0}, PAK: {runs: 0, wkts: 0, overs: 0.0} },
      players: {
        ENG: ['J. Buttler','P. Salt','J. Bairstow','H. Brook','M. Ali'],
        PAK: ['B. Azam','M. Rizwan','F. Zaman','S. Ayub','I. Ahmed']
      },
      status: 'live',
      odds: {
        match_winner: { ENG: 1.95, PAK: 1.95 },
        over_runs:   { Over: 1.88, Under: 1.92, line: 8.5, overNumber: 1 },
        top_batter:  {}
      }
    }
  ],
  currentMatchId: 'IND-AUS',
  slip: null,
  openBets: [],
  settledBets: []
};

// build top_batter odds from players
function initTopBatterOdds(match){
  const all = [...match.players[match.teams[0]], ...match.players[match.teams[1]]];
  const base = 2.8;
  const odds = {};
  all.forEach((p,i)=> odds[p] = +(base + (i%5)*0.2 + Math.random()*0.25).toFixed(2));
  match.odds.top_batter = odds;
}

// ===== UI Elements =====
const walletEl = document.getElementById('wallet-balance');
const matchSelect = document.getElementById('match-select');
const scoreWrap = document.getElementById('score-wrap');

const mwOutcomes = document.getElementById('mw-outcomes');
const ouOutcomes = document.getElementById('ou-outcomes');
const tbOutcomes = document.getElementById('tb-outcomes');

const mwStamp = document.getElementById('mw-last-updated');
const ouStamp = document.getElementById('ou-last-updated');
const tbStamp = document.getElementById('tb-last-updated');

const slipEmpty = document.getElementById('slip-empty');
const slipItems = document.getElementById('slip-items');
const stakeInput = document.getElementById('stake');
const potentialEl = document.getElementById('potential');
const placeBetBtn = document.getElementById('place-bet');

const openPane = document.getElementById('open-bets');
const settledPane = document.getElementById('settled-bets');

const addFundsBtn = document.getElementById('btn-add-funds');
const resetBtn = document.getElementById('btn-reset');
const fundsDialog = document.getElementById('funds-dialog');
const fundsAmount = document.getElementById('funds-amount');
const confirmAdd = document.getElementById('confirm-add');

const simulateOverBtn = document.getElementById('simulate-over');
const settleMatchBtn = document.getElementById('settle-match');

// ===== Helpers =====
const fmtINR = (n)=> '₹' + n.toLocaleString('en-IN');
function nowStamp(){ return new Date().toLocaleTimeString(); }

function getMatch(){ return demoState.matches.find(m=>m.id===demoState.currentMatchId); }

function saveLocal(){
  localStorage.setItem('cricket_demo_state', JSON.stringify(demoState));
}
function loadLocal(){
  try{
    const raw = localStorage.getItem('cricket_demo_state');
    if(!raw) return;
    const data = JSON.parse(raw);
    Object.assign(demoState, data);
  }catch(e){}
}

// ===== Renderers =====
function renderWallet(){
  walletEl.textContent = fmtINR(demoState.wallet);
}

function renderMatchSelect(){
  matchSelect.innerHTML = '';
  demoState.matches.forEach(m=>{
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.teams[0]} vs ${m.teams[1]} (${m.oversTotal} ov)`;
    if(m.id===demoState.currentMatchId) opt.selected = true;
    matchSelect.appendChild(opt);
  });
}

function renderScore(){
  const m = getMatch();
  const a = m.teams[0], b = m.teams[1];
  const A = m.score[a], B = m.score[b];
  scoreWrap.innerHTML = `
    <div class="score">
      <div class="teams"><span>${a}</span><span>${A.runs}/${A.wkts} (${A.overs.toFixed(1)})</span></div>
      <div class="detail"><span>RR: ${(A.overs? (A.runs / Math.floor(A.overs)) : 0).toFixed(1)}</span><span>${m.score.batting===a?'Batting':''}</span></div>
    </div>
    <div class="score">
      <div class="teams"><span>${b}</span><span>${B.runs}/${B.wkts} (${B.overs.toFixed(1)})</span></div>
      <div class="detail"><span>RR: ${(B.overs? (B.runs / Math.floor(B.overs)) : 0).toFixed(1)}</span><span>${m.score.batting===b?'Batting':''}</span></div>
    </div>
  `;
}

function oddsButton(name, price, onClick){
  const btn = document.createElement('button');
  btn.className = 'outcome';
  btn.innerHTML = `<span class="name">${name}</span><span class="odds">${price.toFixed(2)}</span>`;
  btn.addEventListener('click', onClick);
  return btn;
}

function renderMarkets(){
  const m = getMatch();
  // Match Winner
  mwOutcomes.innerHTML = '';
  Object.entries(m.odds.match_winner).forEach(([team,price])=>{
    mwOutcomes.appendChild(oddsButton(team, price, ()=>selectToSlip('Match Winner', 'match_winner', team, price)));
  });
  mwStamp.textContent = `Updated ${nowStamp()}`;

  // Over/Under
  ouOutcomes.innerHTML = '';
  const line = m.odds.over_runs.line;
  ['Over','Under'].forEach(side=>{
    const price = m.odds.over_runs[side];
    ouOutcomes.appendChild(oddsButton(`${side} ${line}`, price, ()=>selectToSlip(`Over/Under ${line}`, 'over_runs', side, price)));
  });
  ouStamp.textContent = `Updated ${nowStamp()}`;

  // Top Batter
  if(Object.keys(m.odds.top_batter).length===0) initTopBatterOdds(m);
  tbOutcomes.innerHTML = '';
  Object.entries(m.odds.top_batter).forEach(([player,price])=>{
    tbOutcomes.appendChild(oddsButton(player, price, ()=>selectToSlip('Top Batter', 'top_batter', player, price)));
  });
  tbStamp.textContent = `Updated ${nowStamp()}`;
}

function renderSlip(){
  slipItems.innerHTML = '';
  if(!demoState.slip){
    slipEmpty.style.display='block';
    placeBetBtn.disabled = true;
    potentialEl.textContent = fmtINR(0);
    return;
  }
  slipEmpty.style.display='none';
  const s = demoState.slip;

  const wrap = document.createElement('div');
  wrap.className = 'slip-item';
  wrap.innerHTML = `
    <div class="row">
      <div><strong>${s.marketName}</strong> — <span>${s.selection}</span></div>
      <button class="btn ghost" id="remove-slip">✕</button>
    </div>
    <div class="row meta">
      <span>${s.matchId}</span>
      <span>Odds: <strong>${s.odds.toFixed(2)}</strong></span>
      <span>Time: ${nowStamp()}</span>
    </div>
  `;
  slipItems.appendChild(wrap);
  document.getElementById('remove-slip').onclick = ()=>{ demoState.slip=null; renderSlip(); saveLocal(); };

  updatePotential();
  placeBetBtn.disabled = false;
}

function renderOpenBets(){
  openPane.innerHTML = '';
  if(demoState.openBets.length===0){
    openPane.innerHTML = `<div class="betrow">No open bets</div>`;
    return;
  }
  demoState.openBets.forEach(b=>{
    const el = document.createElement('div');
    el.className = 'betrow';
    el.innerHTML = `
      <div>
        <div><strong>${b.marketName}</strong> — ${b.selection}</div>
        <small class="meta">${b.matchId} • Placed ${new Date(b.placedAt).toLocaleTimeString()}</small>
      </div>
      <div>Odds ${b.odds.toFixed(2)}</div>
      <div>Stake ${fmtINR(b.stake)}</div>
      <div>Return ${fmtINR((b.stake*b.odds).toFixed(0))}</div>
    `;
    openPane.appendChild(el);
  });
}

function renderSettled(){
  settledPane.innerHTML = '';
  if(demoState.settledBets.length===0){
    settledPane.innerHTML = `<div class="betrow">No settled bets</div>`;
    return;
  }
  demoState.settledBets.slice().reverse().forEach(b=>{
    const el = document.createElement('div');
    el.className = 'betrow';
    const won = b.result === 'WIN';
    el.innerHTML = `
      <div>
        <div><strong>${b.marketName}</strong> — ${b.selection}</div>
        <small class="meta">${b.matchId} • Settled ${new Date(b.settledAt).toLocaleTimeString()}</small>
      </div>
      <div>${won?'<span class="badge win">WIN</span>':'<span class="badge lose">LOSE</span>'}</div>
      <div>Stake ${fmtINR(b.stake)}</div>
      <div>${won? 'Payout '+fmtINR(b.payout): 'Return '+fmtINR(0)}</div>
    `;
    settledPane.appendChild(el);
  });
}

// ===== Slip & Bets =====
function selectToSlip(marketName, marketKey, selection, odds){
  demoState.slip = { marketName, marketKey, selection, odds, matchId: demoState.currentMatchId };
  renderSlip(); saveLocal();
  // focus stake for quick betting
  setTimeout(()=> stakeInput.focus(), 0);
}
function updatePotential(){
  const s = demoState.slip;
  if(!s){ potentialEl.textContent = fmtINR(0); return; }
  const stake = Number(stakeInput.value || 0);
  const ret = Math.max(0, stake * s.odds);
  potentialEl.textContent = fmtINR(Math.floor(ret));
}
stakeInput.addEventListener('input', updatePotential);

placeBetBtn.addEventListener('click', ()=>{
  const s = demoState.slip;
  if(!s) return;
  const stake = Math.max(10, Number(stakeInput.value||0));
  if(stake > demoState.wallet){ alert('Insufficient wallet in demo'); return; }
  demoState.wallet -= stake;
  demoState.openBets.push({
    ...s,
    stake,
    placedAt: Date.now(),
    id: 'B'+Math.random().toString(36).slice(2,9)
  });
  demoState.slip = null;
  renderWallet(); renderSlip(); renderOpenBets(); saveLocal();
});

// ===== Odds & Score Simulation =====
function randomFloat(min,max){ return Math.random()*(max-min)+min; }
function nudge(v, pct=0.05){ // move odds +-5%
  const delta = v * (randomFloat(-pct, pct));
  return Math.max(1.30, +(v+delta).toFixed(2));
}

function tickOddsAndScore(){
  const m = getMatch();

  // Nudge MW odds inversely based on current run rates (very rough)
  const a = m.teams[0], b = m.teams[1];
  const rrA = (Math.floor(m.score[a].overs) ? m.score[a].runs / Math.floor(m.score[a].overs) : 0);
  const rrB = (Math.floor(m.score[b].overs) ? m.score[b].runs / Math.floor(m.score[b].overs) : 0);

  if(rrA > rrB){ m.odds.match_winner[a] = Math.max(1.35, nudge(m.odds.match_winner[a], .08)); m.odds.match_winner[b] = Math.max(1.35, nudge(m.odds.match_winner[b], .08)); }
  else { m.odds.match_winner[a] = Math.max(1.35, nudge(m.odds.match_winner[a], .08)); m.odds.match_winner[b] = Math.max(1.35, nudge(m.odds.match_winner[b], .08)); }

  // Over/Under line drifts a bit
  m.odds.over_runs.line = +(m.odds.over_runs.line + randomFloat(-0.4,0.4)).toFixed(1);
  m.odds.over_runs.Over = nudge(m.odds.over_runs.Over, .07);
  m.odds.over_runs.Under = nudge(m.odds.over_runs.Under, .07);

  // Top batter small jitter
  Object.keys(m.odds.top_batter).forEach(p=>{
    m.odds.top_batter[p] = nudge(m.odds.top_batter[p], .03);
  });

  renderMarkets();
}

// simulate an over (very rough)
function simulateOver(){
  const m = getMatch();
  const batting = m.score.batting;
  const side = m.score[batting];
  const balls = 6;
  let runs = 0, wkts = 0;
  for(let i=0;i<balls;i++){
    const r = [0,1,2,3,4,6,0,1,4,0,2,6][Math.floor(Math.random()*12)];
    runs += r;
    if(Math.random()<0.12) wkts++;
  }
  side.runs += runs;
  side.wkts = Math.min(10, side.wkts + wkts);
  side.overs = +(side.overs + 1.0).toFixed(1);

  // rotate strike randomly to "affect" top_batter winners later (for demo only)
  if(Math.random()<0.5) m.score.batting = m.teams.find(t=>t!==batting);

  // Over/Under market over number advance
  m.odds.over_runs.overNumber += 1;
  renderScore(); tickOddsAndScore(); saveLocal();
}

// Settle the match randomly & pay out
function settleMatch(){
  const m = getMatch();
  m.status = 'finished';

  // pick winners
  const mwWinner = Math.random()<0.5 ? m.teams[0] : m.teams[1];
  const ouWinner = Math.random()<0.5 ? 'Over' : 'Under';

  // pick random top batter from all players with small bias to 1st 3
  const all = Object.keys(m.odds.top_batter);
  const favPool = all.slice(0,3);
  const tbWinner = Math.random()<0.55 ? favPool[Math.floor(Math.random()*favPool.length)] : all[Math.floor(Math.random()*all.length)];

  // settle open bets for this match
  const remaining = [];
  demoState.openBets.forEach(b=>{
    if(b.matchId !== m.id){ remaining.push(b); return; }
    let win = false;
    if(b.marketKey==='match_winner' && b.selection===mwWinner) win = true;
    if(b.marketKey==='over_runs' && b.selection===ouWinner) win = true;
    if(b.marketKey==='top_batter' && b.selection===tbWinner) win = true;

    if(win){
      const payout = Math.floor(b.stake * b.odds);
      demoState.wallet += payout;
      demoState.settledBets.push({...b, result:'WIN', payout, settledAt: Date.now()});
    }else{
      demoState.settledBets.push({...b, result:'LOSE', payout:0, settledAt: Date.now()});
    }
  });
  demoState.openBets = remaining;

  renderWallet(); renderOpenBets(); renderSettled(); saveLocal();
  alert(`Match Settled!\nWinners:\n• Match Winner: ${mwWinner}\n• Over/Under: ${ouWinner}\n• Top Batter: ${tbWinner}`);
}

// ===== Tabs & Events =====
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab==='open'?'open-bets':'settled-bets').classList.add('active');
  });
});

matchSelect.addEventListener('change', ()=>{
  demoState.currentMatchId = matchSelect.value;
  renderScore(); renderMarkets(); saveLocal();
});

addFundsBtn.addEventListener('click', ()=> fundsDialog.showModal());
confirmAdd.addEventListener('click', ()=>{
  const val = Math.max(0, Number(fundsAmount.value||0));
  demoState.wallet += val;
  renderWallet(); fundsDialog.close(); saveLocal();
});
resetBtn.addEventListener('click', ()=>{
  localStorage.removeItem('cricket_demo_state');
  location.reload();
});

simulateOverBtn.addEventListener('click', simulateOver);
settleMatchBtn.addEventListener('click', settleMatch);

// ===== Boot =====
(function boot(){
  loadLocal();
  // first-time init for top_batter odds
  demoState.matches.forEach(m=>{ if(!m.odds.top_batter || !Object.keys(m.odds.top_batter).length) initTopBatterOdds(m); });

  renderWallet();
  renderMatchSelect();
  renderScore();
  renderMarkets();
  renderOpenBets();
  renderSettled();
  updatePotential();

  // periodic odds drift
  setInterval(tickOddsAndScore, 4000);
})();

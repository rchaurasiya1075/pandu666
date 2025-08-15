/* ====== DEMO STATE ====== */
const state = {
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
      status: 'live',
      odds: { match_winner: { IND: 1.85, AUS: 2.05 }, over_runs: { Over: 1.90, Under: 1.90, line: 9.5, overNumber: 1 }, top_batter: {} }
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
      odds: { match_winner: { ENG: 1.95, PAK: 1.95 }, over_runs: { Over: 1.88, Under: 1.92, line: 8.5, overNumber: 1 }, top_batter: {} }
    }
  ],
  currentMatchId: 'IND-AUS',
  slip: null,
  openBets: [],
  settledBets: [],
  // manual payments
  deposits: [],       // {id, amount, utr, ss, status:PENDING|APPROVED|REJECTED, createdAt}
  withdrawals: [],    // {id, amount, upi, status:PENDING|PAID|DECLINED, createdAt}
  history: []         // log lines
};

/* ====== PERSIST ====== */
function save(){ localStorage.setItem('cricket_demo_full', JSON.stringify(state)); }
function load(){
  const raw = localStorage.getItem('cricket_demo_full');
  if(!raw) return;
  try{ Object.assign(state, JSON.parse(raw)); }catch(e){}
}

/* ====== ELEMENTS ====== */
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
const paymentsPane = document.getElementById('payments-pane');

const simulateOverBtn = document.getElementById('simulate-over');
const settleMatchBtn = document.getElementById('settle-match');
const resetBtn = document.getElementById('btn-reset');

const depForm = document.getElementById('deposit-form');
const depAmount = document.getElementById('dep-amount');
const depUtr = document.getElementById('dep-utr');
const depSS = document.getElementById('dep-ss');

const wdForm = document.getElementById('withdraw-form');
const wdAmount = document.getElementById('wd-amount');
const wdUpi = document.getElementById('wd-upi');

/* ====== UTILS ====== */
const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');
const uid = p => (p||'X') + Math.random().toString(36).slice(2,9);
const nowStr = () => new Date().toLocaleString();

/* ====== INIT HELPERS ====== */
function initTopBatterOdds(match){
  const all = [...match.players[match.teams[0]], ...match.players[match.teams[1]]];
  const base = 2.8, odds = {};
  all.forEach((p,i)=> odds[p] = +(base + (i%5)*0.2 + Math.random()*0.25).toFixed(2));
  match.odds.top_batter = odds;
}

/* ====== RENDERERS ====== */
function renderWallet(){ walletEl.textContent = INR(state.wallet); }
function renderMatchSelect(){
  matchSelect.innerHTML = '';
  state.matches.forEach(m=>{
    const o = document.createElement('option');
    o.value = m.id; o.textContent = `${m.teams[0]} vs ${m.teams[1]} (${m.oversTotal} ov)`;
    if(m.id===state.currentMatchId) o.selected = true;
    matchSelect.appendChild(o);
  });
}
function getMatch(){ return state.matches.find(m=>m.id===state.currentMatchId); }
function renderScore(){
  const m = getMatch();
  const [a,b] = m.teams; const A=m.score[a], B=m.score[b];
  const rr = (o)=> (Math.floor(o)? (o.runs/Math.floor(o)).toFixed(1) : '0.0');
  scoreWrap.innerHTML = `
    <div class="score">
      <div class="teams"><span>${a}</span><span>${A.runs}/${A.wkts} (${A.overs.toFixed(1)})</span></div>
      <div class="detail"><span>RR: ${rr(A.overs)}</span><span>${m.score.batting===a?'Batting':''}</span></div>
    </div>
    <div class="score">
      <div class="teams"><span>${b}</span><span>${B.runs}/${B.wkts} (${B.overs.toFixed(1)})</span></div>
      <div class="detail"><span>RR: ${rr(B.overs)}</span><span>${m.score.batting===b?'Batting':''}</span></div>
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
  mwOutcomes.innerHTML = '';
  Object.entries(m.odds.match_winner).forEach(([team,price])=>{
    mwOutcomes.appendChild(oddsButton(team, price, ()=>toSlip('Match Winner','match_winner',team,price)));
  });
  mwStamp.textContent = `Updated ${new Date().toLocaleTimeString()}`;

  ouOutcomes.innerHTML = '';
  const line = m.odds.over_runs.line;
  ['Over','Under'].forEach(side=>{
    const price = m.odds.over_runs[side];
    ouOutcomes.appendChild(oddsButton(`${side} ${line}`, price, ()=>toSlip(`Over/Under ${line}`,'over_runs',side,price)));
  });
  ouStamp.textContent = `Updated ${new Date().toLocaleTimeString()}`;

  if(Object.keys(m.odds.top_batter).length===0) initTopBatterOdds(m);
  tbOutcomes.innerHTML='';
  Object.entries(m.odds.top_batter).forEach(([player,price])=>{
    tbOutcomes.appendChild(oddsButton(player, price, ()=>toSlip('Top Batter','top_batter',player,price)));
  });
  tbStamp.textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

function renderSlip(){
  slipItems.innerHTML='';
  if(!state.slip){ slipEmpty.style.display='block'; placeBetBtn.disabled=true; potentialEl.textContent=INR(0); return; }
  slipEmpty.style.display='none';
  const s = state.slip;
  const wrap=document.createElement('div');
  wrap.className='slip-item';
  wrap.innerHTML=`
    <div class="row">
      <div><strong>${s.marketName}</strong> — <span>${s.selection}</span></div>
      <button class="btn ghost" id="remove-slip">✕</button>
    </div>
    <div class="row meta">
      <span>${s.matchId}</span>
      <span>Odds: <strong>${s.odds.toFixed(2)}</strong></span>
      <span>${nowStr()}</span>
    </div>`;
  slipItems.appendChild(wrap);
  document.getElementById('remove-slip').onclick=()=>{ state.slip=null; renderSlip(); save(); };
  updatePotential(); placeBetBtn.disabled=false;
}
function renderOpenBets(){
  openPane.innerHTML='';
  if(state.openBets.length===0){ openPane.innerHTML='<div class="betrow">No open bets</div>'; return; }
  state.openBets.forEach(b=>{
    const el=document.createElement('div'); el.className='betrow';
    el.innerHTML=`
      <div>
        <div><strong>${b.marketName}</strong> — ${b.selection}</div>
        <small class="meta">${b.matchId} • Placed ${new Date(b.placedAt).toLocaleTimeString()}</small>
      </div>
      <div>Odds ${b.odds.toFixed(2)}</div>
      <div>Stake ${INR(b.stake)}</div>
      <div>Return ${INR(Math.floor(b.stake*b.odds))}</div>`;
    openPane.appendChild(el);
  });
}
function renderSettled(){
  settledPane.innerHTML='';
  if(state.settledBets.length===0){ settledPane.innerHTML='<div class="betrow">No settled bets</div>'; return; }
  state.settledBets.slice().reverse().forEach(b=>{
    const won = b.result==='WIN';
    const el=document.createElement('div'); el.className='betrow';
    el.innerHTML=`
      <div>
        <div><strong>${b.marketName}</strong> — ${b.selection}</div>
        <small class="meta">${b.matchId} • Settled ${new Date(b.settledAt).toLocaleTimeString()}</small>
      </div>
      <div>${won?'<span class="badge win">WIN</span>':'<span class="badge lose">LOSE</span>'}</div>
      <div>Stake ${INR(b.stake)}</div>
      <div>${won? 'Payout '+INR(b.payout): 'Return '+INR(0)}</div>`;
    settledPane.appendChild(el);
  });
}
function renderPayments(){
  const depPending = state.deposits.filter(d=>d.status==='PENDING').length;
  const wdPending = state.withdrawals.filter(w=>w.status==='PENDING').length;
  const last10 = state.history.slice(-10).reverse();
  paymentsPane.innerHTML = `
    <div class="betrow">
      <div><strong>Pending Deposits</strong></div>
      <div>${depPending}</div><div></div><div></div>
    </div>
    <div class="betrow">
      <div><strong>Pending Withdrawals</strong></div>
      <div>${wdPending}</div><div></div><div></div>
    </div>
    ${last10.map(h=>`
      <div class="betrow">
        <div>${h.text}</div>
        <div class="status-chip">${h.type}</div>
        <div>${h.amount?INR(h.amount):''}</div>
        <div><small class="muted">${new Date(h.time).toLocaleString()}</small></div>
      </div>
    `).join('')}
  `;
}

/* ====== SLIP / BETS ====== */
function toSlip(marketName, marketKey, selection, odds){
  state.slip = {marketName, marketKey, selection, odds, matchId: state.currentMatchId};
  renderSlip(); save(); setTimeout(()=>stakeInput.focus(),0);
}
function updatePotential(){
  const s = state.slip; if(!s){ potentialEl.textContent=INR(0); return; }
  const stake = Math.max(0, Number(stakeInput.value||0));
  potentialEl.textContent = INR(Math.floor(stake*s.odds));
}
stakeInput.addEventListener('input', updatePotential);

placeBetBtn.addEventListener('click', ()=>{
  const s = state.slip; if(!s) return;
  const stake = Math.max(10, Number(stakeInput.value||0));
  if(stake>state.wallet){ alert('Insufficient wallet (demo)'); return; }
  state.wallet -= stake;
  state.openBets.push({...s, stake, placedAt: Date.now(), id: uid('B')});
  state.slip=null;
  save(); renderWallet(); renderSlip(); renderOpenBets();
});

/* ====== ODDS / SCORE SIM ====== */
const rand = (min,max)=> Math.random()*(max-min)+min;
const nudge = (v,p=.05)=> Math.max(1.30, +(v + v*rand(-p,p)).toFixed(2));

function tick(){
  const m = getMatch();
  // drift odds
  m.odds.over_runs.line = +(m.odds.over_runs.line + rand(-0.4,0.4)).toFixed(1);
  Object.keys(m.odds.match_winner).forEach(k=> m.odds.match_winner[k]=nudge(m.odds.match_winner[k], .08));
  ['Over','Under'].forEach(k=> m.odds.over_runs[k]=nudge(m.odds.over_runs[k], .07));
  Object.keys(m.odds.top_batter).forEach(p=> m.odds.top_batter[p]=nudge(m.odds.top_batter[p], .03));
  renderMarkets();
}
function simulateOver(){
  const m = getMatch(); const bat = m.score.batting; const side = m.score[bat];
  let runs=0, wkts=0; for(let i=0;i<6;i++){ const r=[0,1,2,3,4,6][Math.floor(Math.random()*6)]; runs+=r; if(Math.random()<0.12) wkts++; }
  side.runs += runs; side.wkts = Math.min(10, side.wkts+wkts); side.overs = +(side.overs+1.0).toFixed(1);
  if(Math.random()<0.5) m.score.batting = m.teams.find(t=>t!==bat);
  m.odds.over_runs.overNumber += 1;
  renderScore(); tick(); save();
}
function settleMatch(){
  const m = getMatch(); m.status='finished';
  const mwWinner = Math.random()<0.5? m.teams[0]:m.teams[1];
  const ouWinner = Math.random()<0.5? 'Over':'Under';
  const all = Object.keys(m.odds.top_batter); const fav = all.slice(0,3);
  const tbWinner = Math.random()<0.55? fav[Math.floor(Math.random()*fav.length)] : all[Math.floor(Math.random()*all.length)];

  const keep=[]; state.openBets.forEach(b=>{
    if(b.matchId!==m.id){ keep.push(b); return; }
    let win=false;
    if(b.marketKey==='match_winner' && b.selection===mwWinner) win=true;
    if(b.marketKey==='over_runs' && b.selection===ouWinner) win=true;
    if(b.marketKey==='top_batter' && b.selection===tbWinner) win=true;
    if(win){ const payout=Math.floor(b.stake*b.odds); state.wallet+=payout; state.settledBets.push({...b,result:'WIN',payout,settledAt:Date.now()}); }
    else{ state.settledBets.push({...b,result:'LOSE',payout:0,settledAt:Date.now()}); }
  });
  state.openBets = keep;
  save(); renderWallet(); renderOpenBets(); renderSettled();
  alert(`Match Settled!\n• Winner: ${mwWinner}\n• O/U: ${ouWinner}\n• Top Batter: ${tbWinner}`);
}

/* ====== MANUAL PAYMENTS (DEMO) ====== */
function addHistory(type, text, amount){ state.history.push({type, text, amount, time: Date.now()}); }

depForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const amt = Math.max(100, Number(depAmount.value||0));
  const utr = depUtr.value.trim();
  if(!utr){ alert('UTR required'); return; }
  const rec = { id: uid('D'), amount: amt, utr, ss: depSS.value.trim(), status:'PENDING', createdAt: Date.now() };
  state.deposits.push(rec);
  addHistory('DEPOSIT','Deposit submitted: '+utr, amt);
  save(); renderPayments();
  e.target.reset();
  alert('Deposit submitted. Admin (demo) se approve hone par wallet me add hoga.');
});

wdForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const amt = Math.max(100, Number(wdAmount.value||0));
  if(amt>state.wallet){ alert('Wallet me itna balance nahi (demo)'); return; }
  const upi = wdUpi.value.trim();
  if(!upi || !upi.includes('@')){ alert('Valid UPI ID dalo'); return; }
  const rec = { id: uid('W'), amount: amt, upi, status:'PENDING', createdAt: Date.now() };
  state.withdrawals.push(rec);
  addHistory('WITHDRAW','Withdraw requested to '+upi, amt);
  save(); renderPayments();
  e.target.reset();
  alert('Withdraw request submitted. Admin (demo) approve karega to PAID dikhayega.');
});

/* ====== TABS & EVENTS ====== */
document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(
      t.dataset.tab==='open' ? 'open-bets' :
      t.dataset.tab==='settled' ? 'settled-bets' : 'payments-pane'
    ).classList.add('active');
  });
});

matchSelect.addEventListener('change', ()=>{ state.currentMatchId=matchSelect.value; renderScore(); renderMarkets(); save(); });
simulateOverBtn.addEventListener('click', simulateOver);
settleMatchBtn.addEventListener('click', settleMatch);
resetBtn.addEventListener('click', ()=>{ localStorage.removeItem('cricket_demo_full'); location.reload(); });

/* ====== BOOT ====== */
(function(){
  load();
  state.matches.forEach(m=>{ if(!m.odds.top_batter || !Object.keys(m.odds.top_batter).length) initTopBatterOdds(m); });
  renderWallet(); renderMatchSelect(); renderScore(); renderMarkets(); renderOpenBets(); renderSettled(); renderPayments();
  setInterval(tick, 4000);
})();

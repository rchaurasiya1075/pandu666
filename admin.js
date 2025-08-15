/* Admin side (demo only) */
const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');
const get = () => JSON.parse(localStorage.getItem('cricket_demo_full')||'{}');
const put = (s) => localStorage.setItem('cricket_demo_full', JSON.stringify(s));

const depBox = document.getElementById('pending-deposits');
const wdBox = document.getElementById('pending-withdrawals');
const allBox = document.getElementById('all-history');
const resetBtn = document.getElementById('btn-reset');

function render(){
  const s = get();
  // pending deposits
  depBox.innerHTML = (s.deposits||[]).filter(d=>d.status==='PENDING').map(d=>`
    <div class="betrow">
      <div>
        <div><strong>Deposit</strong> — ${INR(d.amount)}</div>
        <div class="kv">
          <span>ID ${d.id}</span><span>UTR ${d.utr}</span><span>${new Date(d.createdAt).toLocaleString()}</span>
        </div>
        ${d.ss? `<div><a target="_blank" rel="noopener" href="${d.ss}">Screenshot</a></div>`:''}
      </div>
      <div><span class="status-chip">PENDING</span></div>
      <div><button class="btn" onclick="approveDeposit('${d.id}')">Approve</button></div>
      <div><button class="btn ghost" onclick="rejectDeposit('${d.id}')">Reject</button></div>
    </div>
  `).join('') || '<div class="betrow">No pending deposits</div>';

  // pending withdrawals
  wdBox.innerHTML = (s.withdrawals||[]).filter(w=>w.status==='PENDING').map(w=>`
    <div class="betrow">
      <div>
        <div><strong>Withdraw</strong> — ${INR(w.amount)}</div>
        <div class="kv">
          <span>ID ${w.id}</span><span>UPI ${w.upi}</span><span>${new Date(w.createdAt).toLocaleString()}</span>
        </div>
      </div>
      <div><span class="status-chip">PENDING</span></div>
      <div><button class="btn" onclick="payWithdraw('${w.id}')">Mark Paid</button></div>
      <div><button class="btn ghost" onclick="declineWithdraw('${w.id}')">Decline</button></div>
    </div>
  `).join('') || '<div class="betrow">No pending withdrawals</div>';

  // history
  allBox.innerHTML = (s.history||[]).slice().reverse().map(h=>`
    <div class="betrow">
      <div>${h.text}</div>
      <div class="status-chip">${h.type}</div>
      <div>${h.amount?INR(h.amount):''}</div>
      <div><small class="muted">${new Date(h.time).toLocaleString()}</small></div>
    </div>
  `).join('') || '<div class="betrow">No history</div>';
}

window.approveDeposit = function(id){
  const s=get(); const d=(s.deposits||[]).find(x=>x.id===id); if(!d) return;
  d.status='APPROVED'; s.wallet = Math.max(0, Number(s.wallet||0)) + Number(d.amount||0);
  (s.history=s.history||[]).push({type:'DEPOSIT-APPROVED', text:`Deposit approved ${d.utr}`, amount:d.amount, time:Date.now()});
  put(s); render(); alert('Deposit approved & wallet updated (demo).');
}
window.rejectDeposit = function(id){
  const s=get(); const d=(s.deposits||[]).find(x=>x.id===id); if(!d) return;
  d.status='REJECTED';
  (s.history=s.history||[]).push({type:'DEPOSIT-REJECTED', text:`Deposit rejected ${d.utr}`, amount:d.amount, time:Date.now()});
  put(s); render(); alert('Deposit rejected (demo).');
}
window.payWithdraw = function(id){
  const s=get(); const w=(s.withdrawals||[]).find(x=>x.id===id); if(!w) return;
  if(Number(s.wallet||0) < Number(w.amount||0)){ alert('Wallet insufficient (demo).'); return; }
  w.status='PAID'; s.wallet = Math.max(0, Number(s.wallet||0) - Number(w.amount||0));
  (s.history=s.history||[]).push({type:'WITHDRAW-PAID', text:`Withdraw paid to ${w.upi}`, amount:w.amount, time:Date.now()});
  put(s); render(); alert('Withdraw marked PAID & wallet deducted (demo).');
}
window.declineWithdraw = function(id){
  const s=get(); const w=(s.withdrawals||[]).find(x=>x.id===id); if(!w) return;
  w.status='DECLINED';
  (s.history=s.history||[]).push({type:'WITHDRAW-DECLINED', text:`Withdraw declined ${w.upi}`, amount:w.amount, time:Date.now()});
  put(s); render(); alert('Withdraw declined (demo).');
}

document.getElementById('btn-reset').addEventListener('click', ()=>{
  localStorage.removeItem('cricket_demo_full'); location.reload();
});

render();

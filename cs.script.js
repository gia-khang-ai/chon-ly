(() => {
    const canvas = document.getElementById('diceCanvas');
    const ctx = canvas.getContext('2d');
    
    const balanceEl = document.getElementById('balance');
    const betInput = document.getElementById('betInput');
    const resultText = document.getElementById('resultText');
    const currentChoiceEl = document.getElementById('currentChoice');
    const historyList = document.getElementById('historyList');
    const coverEl = null;
    const revealBtn = null;
    
    const betTaiBtn = document.getElementById('betTai');
    const betXiuBtn = document.getElementById('betXiu');
    const rollBtn = document.getElementById('rollBtn');
    const clearBetBtn = document.getElementById('clearBet');
    const resetBalanceBtn = document.getElementById('resetBalance');
    const clearHistoryBtn = document.getElementById('clearHistory');
    
    let choice = null; // 'TAI' | 'XIU'
    let rolling = false;
    let balance = 10000;
    let history = [];
    let pending = null; // no cover now; will settle immediately
    
    // persistence
    try{
      const saved = localStorage.getItem('tx-state');
      if(saved){ const s = JSON.parse(saved); balance = s.balance ?? balance; history = s.history ?? []; }
    }catch(_){ }
    
    function save(){
      try{ localStorage.setItem('tx-state', JSON.stringify({balance, history})); }catch(_){ }
    }
    
    function format(n){
      return n.toLocaleString('vi-VN');
    }
    
    function setChoice(newChoice){
      choice = newChoice;
      currentChoiceEl.textContent = choice ? (choice==='TAI'?'Tài':'Xỉu') : 'Chưa chọn';
      betTaiBtn.classList.toggle('active', choice==='TAI');
      betXiuBtn.classList.toggle('active', choice==='XIU');
    }
    
    function addHistory(item){
      history.unshift(item);
      if(history.length>50) history.pop();
      renderHistory();
      save();
    }
    
    function renderHistory(){
      historyList.innerHTML = '';
      for(const h of history){
        const li = document.createElement('li');
        li.textContent = `${h.time} – Xúc xắc: ${h.dice.join(', ')} = ${h.sum} (${h.outcome}) | Cược ${h.betChoice ?? '—'} ${h.betAmount ? format(h.betAmount) : ''} → ${h.delta>0?'+':''}${format(h.delta)} xu`;
        historyList.appendChild(li);
      }
    }
    
    function updateHUD(){
      balanceEl.textContent = format(balance);
    }
    
    function drawTable(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    
    function drawDie(x,y,size,face){
      ctx.fillStyle = '#e5e7eb';
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 3;
      ctx.fillRect(x,y,size,size);
      ctx.strokeRect(x,y,size,size);
      ctx.fillStyle = '#111827';
      const dot = (dx,dy)=>{ ctx.beginPath(); ctx.arc(x+dx,y+dy, size*0.08, 0, Math.PI*2); ctx.fill(); };
      const c = size/2, m = size*0.25;
      const map = {
        1: [[c,c]],
        2: [[m,m],[size-m,size-m]],
        3: [[m,m],[c,c],[size-m,size-m]],
        4: [[m,m],[size-m,m],[m,size-m],[size-m,size-m]],
        5: [[m,m],[size-m,m],[c,c],[m,size-m],[size-m,size-m]],
        6: [[m,m],[m,c],[m,size-m],[size-m,m],[size-m,c],[size-m,size-m]]
      };
      for(const [dx,dy] of map[face]) dot(dx,dy);
    }
    
    function random1to6(){ return 1 + Math.floor(Math.random()*6); }
    
    function rollDiceAnimation(betAmount){
      if(rolling) return;
      if(!choice){ resultText.textContent = 'Hãy chọn Tài/Xỉu trước.'; return; }
      const amt = Math.max(1, Math.floor(Number(betInput.value)||0));
      if(amt>balance){ resultText.textContent = 'Không đủ số dư.'; return; }
      rolling = true;
      rollBtn.disabled = true;
      resultText.textContent = 'Đang tung...';
      pending = null;
    
      const start = performance.now();
      const duration = 1200;
      const pos = [[40,40],[170,40],[300,40]];
      const size = 100;
      let raf;
    
      function frame(t){
        const p = Math.min(1, (t-start)/duration);
        drawTable();
        const faces = [random1to6(), random1to6(), random1to6()];
        for(let i=0;i<3;i++) drawDie(pos[i][0], pos[i][1], size, faces[i]);
        if(p<1){ raf = requestAnimationFrame(frame); } else {
          finishRoll(amt);
        }
      }
      drawTable();
      raf = requestAnimationFrame(frame);
    }
    
    function finishRoll(amt){
      const dice = [random1to6(), random1to6(), random1to6()];
      const sum = dice[0]+dice[1]+dice[2];
      const triple = (dice[0]===dice[1] && dice[1]===dice[2]);
      const outcome = triple ? 'TAM HOA' : (sum>=11? 'TAI' : 'XIU');
      // draw final
      drawTable();
      const pos = [[40,40],[170,40],[300,40]];
      const size = 100;
      for(let i=0;i<3;i++) drawDie(pos[i][0], pos[i][1], size, dice[i]);
      // settle immediately
      let delta = 0;
      if(!triple && choice && (choice===outcome)){
        delta = amt; balance += amt;
        resultText.textContent = `Kết quả: ${sum} (${outcome === 'TAI' ? 'Tài' : 'Xỉu'}) – Bạn thắng +${format(amt)} xu`;
      } else {
        delta = -amt; balance -= amt;
        resultText.textContent = triple ? `Kết quả: Tam hoa – Thua cược` : `Kết quả: ${sum} (${outcome==='TAI'?'Tài':'Xỉu'}) – Thua cược`;
      }
      addHistory({ time: new Date().toLocaleTimeString('vi-VN'), dice, sum, outcome, betChoice: choice, betAmount: amt, delta });
      updateHUD(); save();
      rolling = false;
      rollBtn.disabled = false;
    }
    
    // UI bindings
    document.querySelectorAll('[data-chip]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const v = Number(btn.getAttribute('data-chip'))||0;
        const current = Math.max(0, Math.floor(Number(betInput.value)||0));
        betInput.value = String(current + v);
      });
    });
    
    clearBetBtn.addEventListener('click', ()=>{ betInput.value = '0'; });
    betTaiBtn.addEventListener('click', ()=> setChoice('TAI'));
    betXiuBtn.addEventListener('click', ()=> setChoice('XIU'));
    rollBtn.addEventListener('click', ()=> rollDiceAnimation());
    resetBalanceBtn.addEventListener('click', ()=>{ balance = 10000; updateHUD(); save(); });
    clearHistoryBtn.addEventListener('click', ()=>{ history = []; renderHistory(); save(); });
    
    // cover removed
    
    // Init
    function init(){
      updateHUD();
      renderHistory();
      drawTable();
    }
    init();
    })();
    
    
    
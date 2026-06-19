/* ── DATA ── */
  const contacts = {
    priya:  { name:'Priya Sharma',   handle:'@priya.sharma',  av:'PS', avClass:'av-green',  status:'online',  sub:'● Online — last seen just now',    subColor:'#3ecf8e' },
    rahul:  { name:'Rahul Sinha',    handle:'@rahul.sinha',   av:'RS', avClass:'av-blue',   status:'online',  sub:'● Online',                          subColor:'#3ecf8e' },
    aarav:  { name:'Aarav Agarwal',  handle:'@aarav.ag',      av:'AA', avClass:'av-amber',  status:'away',    sub:'● Away — last seen 22m ago',         subColor:'#f5a623' },
    tushar: { name:'Tushar Satija',  handle:'@tushar.sir',    av:'TS', avClass:'av-purple', status:'busy',    sub:'🔴 Do not disturb',                  subColor:'#f06060' },
    neha:   { name:'Neha Kapoor',    handle:'@neha.k',        av:'NK', avClass:'av-pink',   status:'offline', sub:'Last seen 3h ago',                  subColor:'#9191a8' },
    cse:    { name:'CSE Batch 2024', handle:'48 members',     av:'👥', avClass:'av-purple', status:null,      sub:'48 members online',                 subColor:'#9191a8' },
    devpro: { name:'Dev Pro — Premium', handle:'240 members', av:'⭐', avClass:'av-amber',  status:null,      sub:'⭐ Premium channel · 240 members',   subColor:'#f5a623' }
  };
 
  let activeChat = 'priya';
  let callInterval = null;
  let callSeconds = 0;
  let callType = 'voice';
 
  /* ── SWITCH CHAT ── */
  function switchChat(el, key) {
    document.querySelectorAll('.contact-item').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    el.querySelector('.unread-badge') && el.querySelector('.unread-badge').remove();
    activeChat = key;
    const c = contacts[key];
    document.getElementById('topbarName').textContent = c.name;
    const sub = document.getElementById('topbarSub');
    sub.textContent = c.sub;
    sub.style.color = c.subColor;
    const tAv = document.getElementById('topbarAv');
    tAv.className = `av ${c.avClass}`;
    tAv.childNodes[0].textContent = c.av;
    document.getElementById('panelName').textContent = c.name;
    document.getElementById('panelHandle').textContent = c.handle + ' · ' + (c.status || 'group');
    document.getElementById('typingIndicator').style.display = key === 'priya' ? 'flex' : 'none';
  }
 
  /* ── SEND MESSAGE ── */
  function sendMessage() {
    const inp = document.getElementById('msgInput');
    const txt = inp.value.trim();
    if (!txt) return;
    const area = document.getElementById('msgsArea');
    const typing = document.getElementById('typingIndicator');
    const group = document.createElement('div');
    group.className = 'msg-group me';
    const now = new Date();
    const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    group.innerHTML = `
      <div class="msg-sender-row">
        <div class="bubble-col">
          <div class="bubble me">${escHtml(txt)}</div>
          <div class="bubble-meta">${time} <span class="read-ticks">✓</span></div>
        </div>
      </div>`;
    area.insertBefore(group, typing);
    inp.value = '';
    area.scrollTop = area.scrollHeight;
    setTimeout(() => {
      group.querySelector('.read-ticks').textContent = '✓✓';
    }, 800);
  }
 
  function handleKey(e) { if (e.key === 'Enter') sendMessage(); }
 
  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
 
  /* ── REACTIONS ── */
  function toggleReact(el) {
    const parts = el.textContent.trim().split(' ');
    const emoji = parts[0];
    const count = parseInt(parts[1]) || 0;
    el.textContent = emoji + ' ' + (count + 1);
    el.style.borderColor = 'var(--accent)';
    el.style.background = 'var(--accent-glow)';
  }
 
  /* ── CALL ── */
  function openCall(type) {
    callType = type;
    const c = contacts[activeChat];
    document.getElementById('callModalAv').textContent = c.av;
    document.getElementById('callModalName').textContent = c.name;
    document.getElementById('callStatusText').textContent = type === 'video' ? 'Video call connecting…' : 'Voice call connecting…';
    document.getElementById('callTimer').textContent = '0:00';
    document.getElementById('callModal').classList.add('show');
    callSeconds = 0;
    clearInterval(callInterval);
    setTimeout(() => {
      document.getElementById('callStatusText').textContent = type === 'video' ? 'Video call in progress' : 'Call in progress';
      callInterval = setInterval(() => {
        callSeconds++;
        const m = Math.floor(callSeconds / 60);
        const s = (callSeconds % 60).toString().padStart(2, '0');
        document.getElementById('callTimer').textContent = m + ':' + s;
      }, 1000);
    }, 1500);
  }
 
  function endCall() {
    clearInterval(callInterval);
    document.getElementById('callModal').classList.remove('show');
    showToast('Call ended · ' + document.getElementById('callTimer').textContent);
  }
 
  function closeCallOnBg(e) {
    if (e.target === document.getElementById('callModal')) endCall();
  }
 
  /* ── SEARCH ── */
  function filterContacts(q) {
    document.querySelectorAll('.contact-item').forEach(item => {
      const name = item.querySelector('.contact-name').textContent.toLowerCase();
      item.style.display = name.includes(q.toLowerCase()) ? 'flex' : 'none';
    });
  }
 
  /* ── TOAST ── */
  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }
 
  /* ── AUTO SCROLL ── */
  document.getElementById('msgsArea').scrollTop = 9999;
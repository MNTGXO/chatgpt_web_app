// --- Utils ------------------------------------------------
function renderMarkdown(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/`(.+?)`/g,'<code>$1</code>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm,'<li>$1</li>');
}
function timestamp() {
  const d = new Date(); return d.toLocaleTimeString();
}

// --- State & Elements -------------------------------------
let history = JSON.parse(localStorage.getItem('chatHistory')||'[]');
const chatbox = document.getElementById('chatbox'), input = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn'), resetBtn = document.getElementById('resetBtn');
const typingIndicator = document.getElementById('typingIndicator');
const scrollBtn = document.getElementById('scrollBtn');
const exportBtn = document.getElementById('exportBtn'), searchInput = document.getElementById('searchInput');
const emojiBtn = document.getElementById('emojiBtn'), emojiPicker = document.getElementById('emojiPicker');

// --- Init -------------------------------------------------
history.forEach(m=>appendMessage(m));
input.value = sessionStorage.getItem('draft')||'';

// --- Emoji Picker -----------------------------------------
const emojis = ['😀','😂','😉','😍','😎','😢','👍','🙏','🎉','💡','🚀','🔥'];
emojis.forEach(e=> {
  const btn = document.createElement('div'); btn.textContent=e; btn.className='emoji';
  btn.onclick=()=> input.value+=e;
  emojiPicker.appendChild(btn);
});
emojiBtn.onclick = ()=> emojiPicker.classList.toggle('hidden');

// --- Handlers ---------------------------------------------
function appendMessage({role, content, time}) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = renderMarkdown(content) +
    `<div class="timestamp">${time}</div>`;
  const copy = document.createElement('button');
  copy.textContent='📋'; copy.className='copyBtn';
  copy.onclick=()=>navigator.clipboard.writeText(content);
  div.appendChild(copy);
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}
async function sendMessage() {
  const prompt = input.value.trim(); if(!prompt) return;
  const time = timestamp();
  const userMsg = {role:'user', content:prompt, time};
  appendMessage(userMsg); history.push(userMsg);
  localStorage.setItem('chatHistory', JSON.stringify(history));
  input.value=''; sessionStorage.removeItem('draft');
  typingIndicator.classList.remove('hidden');

  const res = await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
  typingIndicator.classList.add('hidden');
  const data = await res.json();
  const botMsg = {role:'bot', content:data.response||data.error, time:timestamp()};
  appendMessage(botMsg); history.push(botMsg);
  localStorage.setItem('chatHistory', JSON.stringify(history));
}

// --- Extras -----------------------------------------------
resetBtn.onclick = ()=>{ localStorage.clear(); sessionStorage.clear(); chatbox.innerHTML=''; history=[]; };
sendBtn.onclick = sendMessage;
input.addEventListener('input', ()=> sessionStorage.setItem('draft', input.value));
input.addEventListener('keydown', e=>{
  if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); }
  if(e.key==='ArrowUp'&&!input.value){ input.value = history.slice(-1)[0]?.content||''; }
});

// Scroll-to-Bottom Button
chatbox.addEventListener('scroll',()=>{
  if(chatbox.scrollTop + chatbox.clientHeight < chatbox.scrollHeight - 20) 
    scrollBtn.classList.remove('hidden');
  else scrollBtn.classList.add('hidden');
});
scrollBtn.onclick = ()=> chatbox.scrollTop = chatbox.scrollHeight;

// Export Chat
exportBtn.onclick = ()=> {
  const text = history.map(m=>`[${m.time}] ${m.role}: ${m.content}`).join('\n');
  const blob = new Blob([text],{type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'chat_history.txt'; a.click();
};

// Search Messages
searchInput.addEventListener('input',()=>{
  const q = searchInput.value.toLowerCase();
  document.querySelectorAll('.message').forEach(el=>{
    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

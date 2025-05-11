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
  console.log("🔔 sendMessage() fired");          // ← debug
  const prompt = input.value.trim();
  if (!prompt) return;

  // show the user’s message in chat
  const time = timestamp();
  appendMessage({ role:'user', content: prompt, time });
  history.push({ role:'user', content: prompt, time });
  localStorage.setItem('chatHistory', JSON.stringify(history));
  input.value = ''; sessionStorage.removeItem('draft');

  // show typing indicator
  typingIndicator.classList.remove('hidden');

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    console.log("→ fetch status:", res.status);    // ← debug

    const data = await res.json();
    console.log("→ response JSON:", data);        // ← debug

    // always render something, even if it’s an error
    const botText = data.response || data.error || "⚠️ No response received";
    const botMsg = { role:'bot', content: botText, time: timestamp() };
    appendMessage(botMsg);
    history.push(botMsg);
    localStorage.setItem('chatHistory', JSON.stringify(history));

  } catch (err) {
    console.error("🔥 sendMessage error:", err);
    const botMsg = { role:'bot', content: `Error: ${err.message}`, time: timestamp() };
    appendMessage(botMsg);
    history.push(botMsg);
    localStorage.setItem('chatHistory', JSON.stringify(history));
  } finally {
    typingIndicator.classList.add('hidden');
  }
}

const chatHistory = [];

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const model = document.getElementById('chatModel').value;
  if (!model) return showToast('Select a model first', 'error');

  const temp = parseFloat(document.getElementById('chatTemp').value);
  input.value = '';

  addMessage(text, 'user');
  chatHistory.push({ role: 'user', content: text });

  const msgEl = addMessage('Thinking...', 'assistant');

  try {
    const res = await Api.chat(model, chatHistory, { temperature: temp });
    const reply = res.message?.content || res.response || '';
    msgEl.textContent = reply;
    chatHistory.push({ role: 'assistant', content: reply });

    if (res.eval_count != null && res.eval_duration) {
      const tokensPerSec = (res.eval_count / (res.eval_duration / 1e9)).toFixed(1);
      const footer = document.createElement('div');
      footer.style.cssText = 'font-size:11px;color:var(--text-muted);margin-top:4px';
      footer.textContent = `${res.eval_count} tokens · ${tokensPerSec} tok/s · ${(res.eval_duration / 1e9).toFixed(2)}s`;
      msgEl.appendChild(footer);
    }
  } catch (err) {
    msgEl.textContent = `Error: ${err.message}`;
    chatHistory.pop();
  }
}

function addMessage(text, role) {
  const container = document.getElementById('chatMessages');
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return el;
}

function clearChat() {
  chatHistory.length = 0;
  const container = document.getElementById('chatMessages');
  container.innerHTML = '<div class="message system-msg">Chat cleared. Start a new conversation.</div>';
}

function setupChatInput() {
  document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
}

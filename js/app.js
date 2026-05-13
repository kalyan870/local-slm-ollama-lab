document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupConnectionCheck();
  setupOllamaUrl();
  setupChatInput();
  setupQuickChatEnter();
  loadModels();
});

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      switchSection(section);
    });
  });
}

function switchSection(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelector(`.nav-btn[data-section="${name}"]`)?.classList.add('active');
  document.getElementById(`section-${name}`)?.classList.add('active');

  if (name === 'models') loadModels();
  if (name === 'benchmark') renderBenchHistory();
}

async function setupConnectionCheck() {
  const status = document.getElementById('connectionStatus');
  const dot = status.querySelector('.status-dot');
  const label = status.querySelector('span:last-child');

  const connected = await Api.checkConnection();
  dot.className = `status-dot ${connected ? 'online' : 'offline'}`;
  label.textContent = connected ? 'Connected' : 'Disconnected';
}

function setupOllamaUrl() {
  const input = document.getElementById('ollamaUrl');
  input.addEventListener('change', async () => {
    Api.setBaseUrl(input.value);
    showToast('Reconnecting...', 'info');
    await setupConnectionCheck();
    loadModels();
  });
}

function setupQuickChatEnter() {
  document.getElementById('quickPrompt').addEventListener('keydown', e => {
    if (e.key === 'Enter') quickChat();
  });
}

async function quickChat() {
  const model = document.getElementById('quickModel').value;
  const prompt = document.getElementById('quickPrompt').value.trim();
  if (!model || !prompt) return showToast('Select a model and enter a prompt', 'error');

  const respEl = document.getElementById('quickResponse');
  respEl.style.display = 'block';
  respEl.innerHTML = '<span class="spinner"></span> Thinking...';

  try {
    const res = await Api.generate(model, prompt, { num_predict: 128 });
    respEl.textContent = res.response || 'No response';
  } catch (err) {
    respEl.textContent = `Error: ${err.message}`;
  }
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

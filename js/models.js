async function loadModels() {
  try {
    const models = await Api.listModels();
    const running = await Api.listRunning();
    const runningNames = new Set(running.map(m => m.name));

    renderModels(models, runningNames);
    updateModelSelects(models);
    updateDashboardStats(models, running);
    renderModelRef(models);
  } catch (err) {
    document.getElementById('modelGrid').innerHTML = `<p class="text-muted">Could not connect: ${err.message}</p>`;
  }
}

function renderModels(models, runningNames) {
  const grid = document.getElementById('modelGrid');
  if (!models.length) {
    grid.innerHTML = `<div class="card"><div class="card-body"><p class="text-muted">No models installed. Pull one like <code>llama3.2:1b</code> or <code>mistral</code> or <code>qwen2.5:1.5b</code>.</p></div></div>`;
    return;
  }
  grid.innerHTML = models.map(m => {
    const isRunning = runningNames.has(m.name);
    const sizeGb = (m.size / 1e9).toFixed(1);
    const quant = detectQuantization(m.name, m.details);
    const family = m.details?.family || m.name.split(':')[0] || 'unknown';
    return `
      <div class="model-card ${isRunning ? 'running' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div class="model-name">${m.name}</div>
          ${isRunning ? '<span class="model-tag q4" style="font-size:10px">RUNNING</span>' : ''}
        </div>
        <div class="model-detail">Family: ${family}</div>
        <div class="model-detail">Size: ${sizeGb} GB</div>
        <div class="model-detail">Quant: <span class="model-tag ${quant}">${m.details?.quantization_level || 'unknown'}</span></div>
        <div class="model-detail">Modified: ${new Date(m.modified).toLocaleDateString()}</div>
        <div class="model-card-actions">
          <button class="btn btn-sm btn-outline" onclick="useModel('${m.name}')">Chat</button>
          <button class="btn btn-sm btn-danger" onclick="deleteModelConfirm('${m.name}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function detectQuantization(name, details) {
  const q = (details?.quantization_level || name).toLowerCase();
  if (q.includes('q4') || q.includes('4bit')) return 'q4';
  if (q.includes('q8') || q.includes('8bit')) return 'q8';
  if (q.includes('f16') || q.includes('fp16')) return 'f16';
  return 'unknown';
}

function updateModelSelects(models) {
  const names = models.map(m => m.name);
  const selects = ['quickModel', 'chatModel', 'benchModel'];
  selects.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = names.map(n => `<option value="${n}" ${n === current ? 'selected' : ''}>${n}</option>`).join('');
  });
}

function updateDashboardStats(models, running) {
  document.getElementById('statModels').textContent = models.length;
  document.getElementById('statRunning').textContent = running.length;
  const benchCount = benchmarkHistory.length ? new Set(benchmarkHistory.map(b => b.model)).size : 0;
  document.getElementById('statBenchmarked').textContent = benchCount;

  const quickSel = document.getElementById('quickModel');
  if (models.length) quickSel.innerHTML = models.map(m => `<option value="${m.name}">${m.name}</option>`).join('');
}

function renderModelRef(models) {
  const refData = [
    { model: 'Llama 3.2 1B', params: '1B', vram: '~1GB', quant: 'Q4_K_M' },
    { model: 'Qwen 2.5 1.5B', params: '1.5B', vram: '~1.2GB', quant: 'Q4_K_M' },
    { model: 'Mistral 7B', params: '7B', vram: '~4.5GB', quant: 'Q4_K_M' },
    { model: 'Llama 3.1 8B', params: '8B', vram: '~5.2GB', quant: 'Q4_K_M' },
    { model: 'Qwen 2.5 7B', params: '7B', vram: '~4.5GB', quant: 'Q4_K_M' },
    { model: 'CodeLlama 7B', params: '7B', vram: '~4.5GB', quant: 'Q4_K_M' },
    { model: 'DeepSeek Coder 6.7B', params: '6.7B', vram: '~4GB', quant: 'Q4_K_M' },
    { model: 'Phi-3 Mini 3.8B', params: '3.8B', vram: '~2.5GB', quant: 'Q4_K_M' },
    { model: 'Gemma 2 2B', params: '2B', vram: '~1.5GB', quant: 'Q4_K_M' },
    { model: 'Llama 3.2 3B', params: '3B', vram: '~2GB', quant: 'Q4_K_M' },
  ];

  const container = document.getElementById('modelRefTable');
  container.innerHTML = refData.map(r => `
    <div class="ref-row">
      <span class="ref-model">${r.model}</span>
      <span class="ref-vram">${r.params} · ${r.vram} · ${r.quant}</span>
    </div>
  `).join('');

  updateRecentBenchmarks();
}

function updateRecentBenchmarks() {
  const container = document.getElementById('recentBenchmarks');
  if (!benchmarkHistory.length) {
    container.innerHTML = '<p class="text-muted">No benchmarks yet. Run one in <a href="#" onclick="switchSection(\'benchmark\')">Benchmark</a>.</p>';
    return;
  }
  container.innerHTML = benchmarkHistory.slice(0, 5).map(b => `
    <div class="info-row">
      <span class="info-label">${b.model}</span>
      <span class="info-value">${b.tokensPerSec} tok/s · ${b.totalTime}s total</span>
    </div>
  `).join('');
}

async function pullModel() {
  const input = document.getElementById('pullModelName');
  const name = input.value.trim();
  if (!name) return showToast('Enter a model name', 'error');
  input.value = '';
  showToast(`Pulling ${name}...`, 'info');
  try {
    await Api.pullModel(name);
    showToast(`Pulled ${name} successfully`, 'success');
    loadModels();
  } catch (err) {
    showToast(`Failed to pull ${name}: ${err.message}`, 'error');
  }
}

async function deleteModelConfirm(name) {
  if (!confirm(`Delete model "${name}"?`)) return;
  try {
    await Api.deleteModel(name);
    showToast(`Deleted ${name}`, 'success');
    loadModels();
  } catch (err) {
    showToast(`Failed to delete: ${err.message}`, 'error');
  }
}

function useModel(name) {
  const sel = document.getElementById('chatModel');
  sel.value = name;
  switchSection('chat');
  showToast(`Switched to ${name}`, 'info');
}

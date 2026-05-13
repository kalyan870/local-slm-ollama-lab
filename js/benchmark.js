const benchmarkHistory = [];

const BENCH_PROMPTS = {
  short: 'What is artificial intelligence?',
  medium: 'Explain the key differences between machine learning, deep learning, and neural networks. Include practical examples of each and discuss their real-world applications in healthcare, finance, and autonomous systems.',
  long: 'Write a comprehensive technical analysis of modern natural language processing architectures. Cover transformer models, attention mechanisms, BERT, GPT, T5, and recent advances in efficient fine-tuning methods like LoRA and QLoRA. Discuss quantization techniques (GPTQ, AWQ, GGUF), their tradeoffs between model size, speed, and quality. Include practical deployment considerations for edge devices and production environments. Compare the carbon footprint and computational costs of training vs. inference. Finally, outline the future directions including multimodal models, agentic AI, and on-device SLMs.',
};

async function runBenchmark() {
  const model = document.getElementById('benchModel').value;
  if (!model) return showToast('Select a model', 'error');

  const promptLen = document.getElementById('benchPromptLength').value;
  const maxTokens = parseInt(document.getElementById('benchMaxTokens').value) || 256;
  const prompt = BENCH_PROMPTS[promptLen];

  const progress = document.getElementById('benchProgress');
  const progressFill = document.getElementById('benchProgressFill');
  const progressText = document.getElementById('benchProgressText');
  const results = document.getElementById('benchResults');

  progress.style.display = 'block';
  results.style.display = 'none';
  progressFill.style.width = '0%';
  progressText.textContent = 'Warming up...';

  const parts = [
    'Loading model into memory...',
    'Running inference...',
    'Finalizing benchmark...',
  ];

  try {
    for (let i = 0; i < parts.length; i++) {
      progressText.textContent = parts[i];
      progressFill.style.width = `${((i + 1) / parts.length) * 80}%`;
      await new Promise(r => setTimeout(r, 300));
    }

    const startTime = performance.now();
    const res = await Api.generate(model, prompt, { num_predict: maxTokens });
    const endTime = performance.now();

    progressFill.style.width = '100%';
    progressText.textContent = 'Done!';

    const totalTime = (endTime - startTime) / 1000;
    const evalDuration = res.eval_duration ? res.eval_duration / 1e9 : totalTime;
    const evalCount = res.eval_count || 0;
    const tokensPerSec = evalDuration > 0 ? (evalCount / evalDuration) : (evalCount / totalTime);
    const loadDuration = res.load_duration ? res.load_duration / 1e9 : 0;
    const promptEvalCount = res.prompt_eval_count || 0;
    const promptEvalDuration = res.prompt_eval_duration ? res.prompt_eval_duration / 1e9 : 0;
    const ttft = res.prompt_eval_duration ? res.prompt_eval_duration / 1e9 : loadDuration;

    const bench = {
      model, promptLen, maxTokens,
      tokensPerSec: tokensPerSec.toFixed(1),
      latency: ttft.toFixed(3),
      totalTime: totalTime.toFixed(2),
      evalDuration: evalDuration.toFixed(2),
      evalCount,
      promptEvalCount,
      promptEvalDuration: promptEvalDuration.toFixed(3),
      timestamp: new Date().toISOString(),
    };

    benchmarkHistory.unshift(bench);
    displayBenchResults(bench);
    renderBenchHistory();

    setTimeout(() => {
      progress.style.display = 'none';
    }, 1500);
  } catch (err) {
    progressText.textContent = `Error: ${err.message}`;
    progressFill.style.width = '0%';
    progressFill.style.background = 'var(--danger)';
  }
}

function displayBenchResults(bench) {
  const grid = document.getElementById('benchResultsGrid');
  const results = document.getElementById('benchResults');
  results.style.display = 'block';

  grid.innerHTML = `
    <div class="bench-result-item"><div class="bench-result-value">${bench.tokensPerSec}</div><div class="bench-result-label">Tokens/sec</div></div>
    <div class="bench-result-item"><div class="bench-result-value">${bench.latency}s</div><div class="bench-result-label">Time to First Token</div></div>
    <div class="bench-result-item"><div class="bench-result-value">${bench.totalTime}s</div><div class="bench-result-label">Total Time</div></div>
    <div class="bench-result-item"><div class="bench-result-value">${bench.evalCount}</div><div class="bench-result-label">Tokens Generated</div></div>
    <div class="bench-result-item"><div class="bench-result-value">${bench.evalDuration}s</div><div class="bench-result-label">Eval Duration</div></div>
    <div class="bench-result-item"><div class="bench-result-value">${bench.promptEvalCount}</div><div class="bench-result-label">Prompt Tokens</div></div>
  `;
}

function renderBenchHistory() {
  const tbody = document.getElementById('benchTbody');
  if (!benchmarkHistory.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center;padding:20px">No benchmarks yet</td></tr>';
    return;
  }
  tbody.innerHTML = benchmarkHistory.slice(0, 20).map(b => `
    <tr>
      <td><strong>${b.model}</strong></td>
      <td>${b.tokensPerSec}</td>
      <td>${b.latency}s</td>
      <td>${b.evalCount}</td>
      <td>${b.totalTime}s</td>
    </tr>
  `).join('');
}

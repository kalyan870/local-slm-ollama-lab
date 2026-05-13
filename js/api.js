const Api = {
  _baseUrl: localStorage.getItem('ollamaUrl') || 'http://localhost:11434',

  get baseUrl() { return this._baseUrl; },

  setBaseUrl(url) {
    this._baseUrl = url.replace(/\/+$/, '');
    localStorage.setItem('ollamaUrl', this._baseUrl);
  },

  async _fetch(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const e = await res.json(); msg = e.error || msg; } catch {}
      throw new Error(msg);
    }
    return res;
  },

  async listModels() {
    const res = await this._fetch('/api/tags');
    const data = await res.json();
    return (data.models || []).map(m => ({
      name: m.name,
      size: m.size,
      modified: m.modified_at,
      digest: m.digest,
      details: m.details || {},
    }));
  },

  async listRunning() {
    try {
      const res = await this._fetch('/api/ps');
      const data = await res.json();
      return (data.models || []).map(m => ({
        name: m.name,
        size: m.size,
        processor: m.details?.processor || 'unknown',
        until: m.expires_at || '',
      }));
    } catch {
      return [];
    }
  },

  async chat(model, messages, options = {}) {
    const res = await this._fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ model, messages, stream: false, options }),
    });
    const data = await res.json();
    return data;
  },

  async generate(model, prompt, options = {}) {
    const res = await this._fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ model, prompt, stream: false, options }),
    });
    const data = await res.json();
    return data;
  },

  async *generateStream(model, prompt, options = {}) {
    const res = await this._fetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ model, prompt, stream: true, options }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try { yield JSON.parse(line); } catch {}
      }
    }
    if (buffer.trim()) {
      try { yield JSON.parse(buffer); } catch {}
    }
  },

  async pullModel(name) {
    const res = await this._fetch('/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name, stream: false }),
    });
    return res.json();
  },

  async deleteModel(name) {
    await this._fetch('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify({ name }),
    });
  },

  async checkConnection() {
    try {
      const res = await this._fetch('/api/tags', { signal: AbortSignal.timeout(5000) });
      return true;
    } catch {
      return false;
    }
  },
};

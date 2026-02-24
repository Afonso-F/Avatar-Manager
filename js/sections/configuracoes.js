/* ============================================================
   sections/configuracoes.js
   ============================================================ */
function renderConfiguracoes(container) {
  const cfg = Config.getAll();

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Configurações</div>
        <div class="section-subtitle">API keys e integrações</div>
      </div>
      <button class="btn btn-primary" onclick="saveAllConfigs()">
        <i class="fa-solid fa-floppy-disk"></i> Guardar tudo
      </button>
    </div>

    <!-- Gemini -->
    <div class="settings-section">
      <div class="settings-section-title"><i class="fa-solid fa-wand-magic-sparkles"></i> Google Gemini AI</div>
      <div class="form-group mb-0">
        <label class="form-label">API Key <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-sm" style="color:var(--accent)">(obter chave)</a></label>
        <div class="key-field">
          <input id="cfg-gemini" class="form-control" type="password" value="${cfg.GEMINI}" placeholder="AIza…">
          <button class="key-toggle" onclick="toggleKeyVisibility('cfg-gemini', this)"><i class="fa-solid fa-eye"></i></button>
        </div>
        <div class="form-hint">Usada para gerar legendas, hashtags e imagens (Imagen 3)</div>
      </div>
      <div class="mt-2">
        <button class="btn btn-sm btn-secondary" onclick="testGemini()"><i class="fa-solid fa-flask"></i> Testar conexão</button>
        <span id="gemini-test-result" class="text-sm ml-1"></span>
      </div>
    </div>

    <!-- Supabase -->
    <div class="settings-section">
      <div class="settings-section-title"><i class="fa-solid fa-database"></i> Supabase</div>
      <div class="grid-2">
        <div class="form-group mb-0">
          <label class="form-label">Project URL <a href="https://supabase.com/dashboard" target="_blank" class="text-sm" style="color:var(--accent)">(dashboard)</a></label>
          <input id="cfg-supabase-url" class="form-control" type="url" value="${cfg.SUPABASE_URL}" placeholder="https://xxx.supabase.co">
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Anon Key</label>
          <div class="key-field">
            <input id="cfg-supabase-key" class="form-control" type="password" value="${cfg.SUPABASE_KEY}" placeholder="eyJ…">
            <button class="key-toggle" onclick="toggleKeyVisibility('cfg-supabase-key', this)"><i class="fa-solid fa-eye"></i></button>
          </div>
        </div>
      </div>
      <div class="mt-2">
        <button class="btn btn-sm btn-secondary" onclick="testSupabase()"><i class="fa-solid fa-flask"></i> Testar conexão</button>
        <span id="supabase-test-result" class="text-sm ml-1"></span>
      </div>
    </div>

    <!-- Social -->
    <div class="settings-section">
      <div class="settings-section-title"><i class="fa-solid fa-share-nodes"></i> Redes sociais</div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label"><i class="fa-brands fa-instagram icon-instagram"></i> Instagram Access Token</label>
          <div class="key-field">
            <input id="cfg-instagram" class="form-control" type="password" value="${cfg.INSTAGRAM}" placeholder="EAA…">
            <button class="key-toggle" onclick="toggleKeyVisibility('cfg-instagram', this)"><i class="fa-solid fa-eye"></i></button>
          </div>
          <div class="form-hint">Meta Business — Graph API Token</div>
        </div>
        <div class="form-group">
          <label class="form-label"><i class="fa-brands fa-tiktok icon-tiktok"></i> TikTok Access Token</label>
          <div class="key-field">
            <input id="cfg-tiktok" class="form-control" type="password" value="${cfg.TIKTOK}" placeholder="Token…">
            <button class="key-toggle" onclick="toggleKeyVisibility('cfg-tiktok', this)"><i class="fa-solid fa-eye"></i></button>
          </div>
          <div class="form-hint">TikTok for Business API</div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label"><i class="fa-brands fa-facebook icon-facebook"></i> Facebook Page Token</label>
          <div class="key-field">
            <input id="cfg-facebook" class="form-control" type="password" value="${cfg.FACEBOOK}" placeholder="EAA…">
            <button class="key-toggle" onclick="toggleKeyVisibility('cfg-facebook', this)"><i class="fa-solid fa-eye"></i></button>
          </div>
        </div>
        <div class="form-group mb-0">
          <label class="form-label"><i class="fa-brands fa-youtube icon-youtube"></i> YouTube API Key</label>
          <div class="key-field">
            <input id="cfg-youtube" class="form-control" type="password" value="${cfg.YOUTUBE}" placeholder="AIza…">
            <button class="key-toggle" onclick="toggleKeyVisibility('cfg-youtube', this)"><i class="fa-solid fa-eye"></i></button>
          </div>
        </div>
      </div>
    </div>

    <!-- GitHub Actions -->
    <div class="settings-section">
      <div class="settings-section-title"><i class="fa-brands fa-github"></i> GitHub Actions</div>
      <p class="text-sm text-muted mb-2" style="line-height:1.6">
        O workflow <code style="background:var(--bg-elevated);padding:2px 6px;border-radius:4px">.github/workflows/publish.yml</code>
        corre a cada hora e publica automaticamente os posts agendados.<br>
        Adiciona as tuas API keys como <strong>Secrets</strong> no repositório GitHub.
      </p>
      <div class="flex gap-1 flex-wrap">
        ${['GEMINI_API_KEY','SUPABASE_URL','SUPABASE_KEY','INSTAGRAM_TOKEN','TIKTOK_TOKEN','FACEBOOK_TOKEN','YOUTUBE_TOKEN'].map(k =>
          `<code style="background:var(--bg-elevated);padding:4px 8px;border-radius:4px;font-size:.8rem;color:var(--accent)">${k}</code>`
        ).join('')}
      </div>
    </div>

    <!-- Danger zone -->
    <div class="settings-section" style="border-color:var(--red-soft)">
      <div class="settings-section-title" style="color:var(--red)"><i class="fa-solid fa-triangle-exclamation" style="color:var(--red)"></i> Zona de perigo</div>
      <button class="btn btn-danger btn-sm" onclick="clearAllConfig()">
        <i class="fa-solid fa-trash"></i> Limpar todas as API keys
      </button>
    </div>`;
}

function toggleKeyVisibility(id, btn) {
  const input = document.getElementById(id);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
}

function saveAllConfigs() {
  const map = {
    GEMINI:       'cfg-gemini',
    SUPABASE_URL: 'cfg-supabase-url',
    SUPABASE_KEY: 'cfg-supabase-key',
    INSTAGRAM:    'cfg-instagram',
    TIKTOK:       'cfg-tiktok',
    FACEBOOK:     'cfg-facebook',
    YOUTUBE:      'cfg-youtube',
  };
  for (const [key, elId] of Object.entries(map)) {
    const el = document.getElementById(elId);
    if (el) Config.set(key, el.value);
  }
  app.initSupabase();
  app.toast('Configurações guardadas!', 'success');
}

async function testGemini() {
  const key = document.getElementById('cfg-gemini')?.value.trim();
  if (!key) { app.toast('Introduz uma API key primeiro', 'warning'); return; }
  Config.set('GEMINI', key);
  const el = document.getElementById('gemini-test-result');
  el.textContent = 'A testar…';
  try {
    const text = await Gemini.generateText('Responde com "OK" apenas.', { maxTokens: 10 });
    el.innerHTML = '<span style="color:var(--green)"><i class="fa-solid fa-circle-check"></i> Ligado!</span>';
    app.toast('Gemini OK!', 'success');
  } catch (e) {
    el.innerHTML = `<span style="color:var(--red)"><i class="fa-solid fa-circle-xmark"></i> Erro: ${e.message}</span>`;
    app.toast('Erro Gemini: ' + e.message, 'error');
  }
}

async function testSupabase() {
  const url = document.getElementById('cfg-supabase-url')?.value.trim();
  const key = document.getElementById('cfg-supabase-key')?.value.trim();
  if (!url || !key) { app.toast('Introduz URL e key primeiro', 'warning'); return; }
  Config.set('SUPABASE_URL', url);
  Config.set('SUPABASE_KEY', key);
  const ok = DB.init();
  const el = document.getElementById('supabase-test-result');
  if (ok) {
    const { error } = await DB.getAvatares();
    if (!error) {
      el.innerHTML = '<span style="color:var(--green)"><i class="fa-solid fa-circle-check"></i> Ligado!</span>';
      app.toast('Supabase OK!', 'success');
      app.initSupabase();
    } else {
      el.innerHTML = `<span style="color:var(--yellow)"><i class="fa-solid fa-triangle-exclamation"></i> Ligado mas: ${error?.message || JSON.stringify(error)}</span>`;
    }
  } else {
    el.innerHTML = '<span style="color:var(--red)"><i class="fa-solid fa-circle-xmark"></i> Falhou</span>';
    app.toast('Supabase falhou', 'error');
  }
}

function clearAllConfig() {
  if (!confirm('Apagar todas as API keys guardadas?')) return;
  Object.values(Config.KEYS).forEach(k => localStorage.removeItem(k));
  app.toast('Keys apagadas', 'success');
  renderConfiguracoes(document.getElementById('content'));
}

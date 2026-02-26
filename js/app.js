/* ============================================================
   app.js — Navegação, estado global, utils
   ============================================================ */
const app = (() => {
  // fn strings resolved at navigate-time so load order doesn't matter
  const sections = {
    dashboard:      { title: 'Dashboard',        fn: 'renderDashboard' },
    avatares:       { title: 'Avatares',          fn: 'renderAvatares' },
    youtube:        { title: 'Canais de Vídeo',   fn: 'renderYoutube' },
    musicos:        { title: 'Músicos & Bandas',  fn: 'renderMusicos' },
    criar:          { title: 'Criar Post',        fn: 'renderCriarPost' },
    fila:           { title: 'Fila / Agenda',     fn: 'renderFila' },
    publicados:     { title: 'Publicados',        fn: 'renderPublicados' },
    biblioteca:     { title: 'Biblioteca',        fn: 'renderBiblioteca' },
    campanhas:      { title: 'Campanhas',         fn: 'renderCampanhas' },
    analises:       { title: 'Análises',          fn: 'renderAnalises' },
    monetizacao:    { title: 'Monetização',       fn: 'renderMonetizacao' },
    despesas:       { title: 'Despesas',          fn: 'renderDespesas' },
    configuracoes:  { title: 'Configurações',     fn: 'renderConfiguracoes' },
  };

  let current = 'dashboard';
  let _version = null;
  let _features = {};
  let _changelog = [];
  let _navId = 0;

  /* ── Init ── */
  function init() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('collapsed');
    });

    // Nav clicks
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        navigate(el.dataset.section);
      });
    });

    // Enter no form de login
    document.getElementById('login-password').addEventListener('keydown', e => {
      if (e.key === 'Enter') authLogin();
    });

    // Hash routing
    const hash = location.hash.replace('#', '') || 'dashboard';
    navigate(sections[hash] ? hash : 'dashboard');

    // Init Supabase
    initSupabase();

    // Auth check
    checkAuth();

    // Load version & features
    loadAppMeta();

    // Theme
    initTheme();

    // Keyboard shortcuts
    initKeyboardShortcuts();

    // Onboarding (primeiro acesso)
    setTimeout(checkOnboarding, 800);
  }

  /* ── Auth ── */
  async function checkAuth() {
    if (!DB.ready()) {
      document.getElementById('appSplash')?.remove();
      return;
    }
    const session = await DB.getSession();
    document.getElementById('appSplash')?.remove();
    if (!session) {
      _showLogin();
    } else {
      _hideLogin();
    }
    DB.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN')  _hideLogin();
      if (event === 'SIGNED_OUT') _showLogin();
    });
  }

  function _showLogin() {
    const ol = document.getElementById('loginOverlay');
    if (ol) ol.style.display = 'flex';
    const lb = document.getElementById('logoutBtn');
    if (lb) lb.style.display = 'none';
  }

  function _hideLogin() {
    const ol = document.getElementById('loginOverlay');
    if (ol) ol.style.display = 'none';
    const lb = document.getElementById('logoutBtn');
    if (lb) lb.style.display = '';
  }

  async function authLogin() {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    const errEl    = document.getElementById('login-error');
    if (!email || !password) {
      errEl.textContent = 'Preenche email e password.';
      errEl.style.display = 'block';
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div> A entrar…';
    errEl.style.display = 'none';
    const { error } = await DB.signIn(email, password);
    if (error) {
      errEl.textContent = 'Email ou password incorretos.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
    }
  }

  async function authLogout() {
    await DB.signOut();
  }

  /* ── Load version.json, changelog.json, features.json ── */
  async function loadAppMeta() {
    try {
      const [vRes, cRes, fRes] = await Promise.all([
        fetch('version.json'),
        fetch('changelog.json'),
        fetch('features.json'),
      ]);
      _version  = vRes.ok  ? await vRes.json()  : null;
      _changelog = cRes.ok ? await cRes.json()  : [];
      _features  = fRes.ok ? await fRes.json()  : {};
    } catch (_) {
      // offline / file missing — silently ignore
    }
    renderVersionBadge();
  }

  function renderVersionBadge() {
    if (!_version) return;
    const btn  = document.getElementById('versionBtn');
    const txt  = document.getElementById('versionText');
    const badge = document.getElementById('newBadge');
    if (!btn) return;

    txt.textContent = `v${_version.version}`;

    const seenKey = 'as_seen_version';
    const seen    = localStorage.getItem(seenKey);
    const isNew   = seen !== _version.version;
    badge.style.display = isNew ? 'inline-flex' : 'none';

    btn.onclick = () => {
      if (_features.changelog_modal) openChangelogModal();
      localStorage.setItem(seenKey, _version.version);
      badge.style.display = 'none';
    };
  }

  function openChangelogModal() {
    if (!_version) return;
    const entriesHTML = _changelog.map(entry => `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="font-weight:700;font-size:1rem">v${entry.version}</span>
          <span class="badge badge-muted" style="font-size:0.75rem">${entry.date}</span>
          ${entry.type === 'major' ? '<span class="badge badge-accent">Major</span>' : ''}
        </div>
        <div style="font-size:0.9rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px">${entry.title}</div>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:6px">
          ${entry.changes.map(c => `
            <li style="display:flex;align-items:flex-start;gap:8px;font-size:0.85rem;color:var(--text-secondary)">
              <i class="fa-solid fa-circle-check" style="color:var(--green);margin-top:2px;flex-shrink:0"></i>
              <span>${c}</span>
            </li>`).join('')}
        </ul>
      </div>`).join('<hr style="border-color:var(--border);margin:16px 0">');

    openModal(
      `Novidades — v${_version.version}`,
      `<div style="max-height:420px;overflow-y:auto;padding-right:4px">${entriesHTML}</div>`,
      `<button class="btn btn-primary" onclick="app.closeModal()">Fechar</button>`
    );
  }

  function getFeature(key) { return !!_features[key]; }

  function initSupabase() {
    const ok = DB.init();
    const dot  = document.querySelector('.status-dot');
    const txt  = document.querySelector('.status-text');
    if (ok) {
      dot.className = 'status-dot online';
      txt.textContent = 'Supabase ligado';
    } else {
      dot.className = 'status-dot offline';
      txt.textContent = 'Supabase desligado';
    }
  }

  /* ── Navigate ── */
  function navigate(section) {
    if (!sections[section]) return;
    current = section;
    location.hash = section;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    // Update title
    document.getElementById('pageTitle').textContent = sections[section].title;

    // Show/hide topbar action button
    const btn = document.getElementById('topbarActionBtn');
    btn.style.display = section === 'criar' ? 'none' : 'inline-flex';

    // Render section — resolve fn at call-time (works regardless of script load order)
    const renderFn = (typeof window !== 'undefined' ? window : global)[sections[section].fn];
    const content = document.getElementById('content');
    content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>A carregar…</span></div>';
    const navId = ++_navId;
    setTimeout(() => { if (navId === _navId) renderFn(content); }, 60);
  }

  /* ── Formatar erro Supabase/JS para string legível ── */
  function fmtErr(e) {
    if (!e) return 'Erro desconhecido';
    if (typeof e === 'string') return e;
    const pick = v => (v && typeof v === 'string') ? v : null;
    return pick(e.message) || pick(e.details) || pick(e.hint) || pick(e.code)
      || (() => { try { const j = JSON.stringify(e); return j && j !== '{}' ? j : null; } catch { return null; } })()
      || 'Erro desconhecido';
  }

  /* ── Toast ── */
  function toast(message, type = 'info', duration = 3500) {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'slideIn .3s ease reverse';
      setTimeout(() => el.remove(), 280);
    }, duration);
  }

  /* ── Modal ── */
  function openModal(title, bodyHTML, footerHTML = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').style.display = 'flex';
  }

  function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
  }

  // Close modal on overlay click
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  /* ── Format helpers ── */
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatNumber(n) {
    if (!n && n !== 0) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
    return String(n);
  }

  function platformIcon(p) {
    const map = {
      instagram:   'fa-brands fa-instagram icon-instagram',
      tiktok:      'fa-brands fa-tiktok icon-tiktok',
      facebook:    'fa-brands fa-facebook icon-facebook',
      youtube:     'fa-brands fa-youtube icon-youtube',
      fansly:      'fa-solid fa-dollar-sign icon-fansly',
      onlyfans:    'fa-solid fa-fire icon-onlyfans',
      patreon:     'fa-brands fa-patreon icon-patreon',
      twitch:      'fa-brands fa-twitch icon-twitch',
      spotify:     'fa-brands fa-spotify icon-spotify',
      vimeo:       'fa-brands fa-vimeo-v icon-vimeo',
      rumble:      'fa-solid fa-video icon-rumble',
      dailymotion: 'fa-solid fa-play icon-dailymotion',
      pinterest:   'fa-brands fa-pinterest icon-pinterest',
      linkedin:    'fa-brands fa-linkedin icon-linkedin',
      x:           'fa-brands fa-x-twitter icon-x',
      twitter:     'fa-brands fa-x-twitter icon-x',
      threads:     'fa-brands fa-threads icon-threads',
      bluesky:     'fa-solid fa-cloud icon-bluesky',
    };
    return `<i class="${map[p] || 'fa-solid fa-globe'}"></i>`;
  }

  function platformLabel(p) {
    const labels = {
      instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook',
      youtube: 'YouTube', fansly: 'Fansly', onlyfans: 'OnlyFans',
      patreon: 'Patreon', twitch: 'Twitch', spotify: 'Spotify',
      vimeo: 'Vimeo', rumble: 'Rumble', dailymotion: 'Dailymotion',
    };
    return labels[p] || p.charAt(0).toUpperCase() + p.slice(1);
  }

  function statusBadge(status) {
    const map = {
      rascunho:   '<span class="badge badge-muted">Rascunho</span>',
      agendado:   '<span class="badge badge-yellow">Agendado</span>',
      publicado:  '<span class="badge badge-green">Publicado</span>',
      erro:       '<span class="badge badge-red">Erro</span>',
    };
    return map[status] || `<span class="badge badge-muted">${status}</span>`;
  }

  /* ── Active avatar ── */
  let _avatares = [];
  function setAvatares(list) { _avatares = list; }
  function getAvatares() { return _avatares; }
  function getActiveAvatar() {
    const id = Config.get('ACTIVE_AVATAR');
    return _avatares.find(a => String(a.id) === String(id)) || _avatares[0] || null;
  }

  /* ── Dark / Light mode ── */
  function initTheme() {
    const saved = localStorage.getItem('as_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = saved === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }

  function toggleTheme() {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('as_theme', next);
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.innerHTML = next === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    toast('Modo ' + (next === 'dark' ? 'escuro' : 'claro') + ' ativado', 'info', 1500);
  }

  /* ── Keyboard shortcuts ── */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Ignore when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      // Cmd+K / Ctrl+K — command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Single key shortcuts (no modifier)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map = {
        'd': 'dashboard', 'a': 'avatares', 'c': 'criar',
        'f': 'fila', 'p': 'publicados', 'n': 'analises',
        'm': 'monetizacao', 'b': 'biblioteca', 'g': 'configuracoes',
      };
      if (map[e.key]) { navigate(map[e.key]); }
      if (e.key === 't') toggleTheme();
      if (e.key === '?') openShortcutsHelp();
      if (e.key === 'Escape') {
        closeModal();
        closeCommandPalette();
      }
    });
  }

  function openShortcutsHelp() {
    const shortcuts = [
      ['D', 'Dashboard'], ['A', 'Avatares'], ['C', 'Criar Post'],
      ['F', 'Fila / Agenda'], ['P', 'Publicados'], ['N', 'Análises'],
      ['M', 'Monetização'], ['B', 'Biblioteca'], ['G', 'Configurações'],
      ['T', 'Toggle dark/light mode'], ['Cmd+K', 'Paleta de comandos'],
      ['Esc', 'Fechar modal'], ['?', 'Esta ajuda'],
    ];
    const body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${shortcuts.map(([k, d]) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <kbd style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:.8rem;font-family:monospace;min-width:36px;text-align:center">${k}</kbd>
          <span class="text-sm">${d}</span>
        </div>`).join('')}
    </div>`;
    openModal('Atalhos de teclado', body, `<button class="btn btn-primary" onclick="app.closeModal()">Fechar</button>`);
  }

  /* ── Command Palette ── */
  const _cmdItems = [
    { icon: 'fa-chart-line', label: 'Dashboard', action: () => navigate('dashboard') },
    { icon: 'fa-masks-theater', label: 'Avatares', action: () => navigate('avatares') },
    { icon: 'fa-plus-circle', label: 'Criar Post', action: () => navigate('criar') },
    { icon: 'fa-calendar-days', label: 'Fila / Agenda', action: () => navigate('fila') },
    { icon: 'fa-database', label: 'Publicados', action: () => navigate('publicados') },
    { icon: 'fa-images', label: 'Biblioteca', action: () => navigate('biblioteca') },
    { icon: 'fa-bullhorn', label: 'Campanhas', action: () => navigate('campanhas') },
    { icon: 'fa-chart-bar', label: 'Análises', action: () => navigate('analises') },
    { icon: 'fa-euro-sign', label: 'Monetização', action: () => navigate('monetizacao') },
    { icon: 'fa-receipt', label: 'Despesas', action: () => navigate('despesas') },
    { icon: 'fa-gear', label: 'Configurações', action: () => navigate('configuracoes') },
    { icon: 'fa-sun', label: 'Toggle Dark/Light Mode', action: () => toggleTheme() },
    { icon: 'fa-keyboard', label: 'Ver atalhos de teclado', action: () => openShortcutsHelp() },
  ];

  function openCommandPalette() {
    let overlay = document.getElementById('cmdPaletteOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cmdPaletteOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding-top:120px';
      overlay.addEventListener('click', e => { if (e.target === overlay) closeCommandPalette(); });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;width:520px;max-width:94vw;box-shadow:var(--shadow)">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
          <i class="fa-solid fa-magnifying-glass" style="color:var(--text-muted)"></i>
          <input id="cmdPaletteInput" class="form-control" style="border:none;background:transparent;padding:0;font-size:1rem" placeholder="Pesquisar comando…" oninput="filterCmdPalette(this.value)" autocomplete="off">
          <kbd style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:4px;padding:2px 6px;font-size:.75rem;color:var(--text-muted);flex-shrink:0">Esc</kbd>
        </div>
        <div id="cmdPaletteList" style="max-height:320px;overflow-y:auto;padding:8px"></div>
      </div>`;
    overlay.style.display = 'flex';
    filterCmdPalette('');
    setTimeout(() => document.getElementById('cmdPaletteInput')?.focus(), 50);
  }

  function filterCmdPalette(query) {
    const list = document.getElementById('cmdPaletteList');
    if (!list) return;
    const q     = (query || '').toLowerCase();
    const items = _cmdItems.filter(it => !q || it.label.toLowerCase().includes(q));
    list.innerHTML = items.map((it, i) => `
      <div class="cmd-palette-item" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:6px;cursor:pointer" onmouseenter="this.style.background='var(--bg-elevated)'" onmouseleave="this.style.background=''" onclick="executeCmdItem(${i}, '${q}')">
        <i class="fa-solid ${it.icon}" style="color:var(--accent);width:16px;text-align:center"></i>
        <span class="text-sm">${it.label}</span>
      </div>`).join('') || '<div class="text-muted text-sm text-center" style="padding:16px">Nenhum resultado</div>';
    window._cmdFiltered = items;
  }

  function executeCmdItem(idx, _q) {
    const items = window._cmdFiltered || _cmdItems;
    const item  = items[idx];
    if (!item) return;
    closeCommandPalette();
    item.action();
  }

  function closeCommandPalette() {
    const overlay = document.getElementById('cmdPaletteOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  /* ── Global search ── */
  function openGlobalSearch() {
    openCommandPalette();
  }

  /* ── Activity log ── */
  function logRecentActivity(acao, detalhes = '') {
    const log = JSON.parse(localStorage.getItem('as_activity_log') || '[]');
    log.unshift({ acao, detalhes, ts: new Date().toISOString() });
    localStorage.setItem('as_activity_log', JSON.stringify(log.slice(0, 50)));
  }

  function getActivityLog() {
    return JSON.parse(localStorage.getItem('as_activity_log') || '[]');
  }

  /* ── Onboarding ── */
  function checkOnboarding() {
    if (localStorage.getItem('as_onboarding_done')) return;
    const steps = [
      { title: 'Bem-vindo ao ContentHub!', body: 'Gere todos os teus conteúdos digitais num só lugar. Avatares, posts, análises, monetização e muito mais.', icon: 'fa-layer-group' },
      { title: 'Cria o teu primeiro avatar', body: 'Vai a <strong>Avatares</strong> e cria um perfil de conteúdo. Define o nome, nicho, estilo e o prompt base para geração de IA.', icon: 'fa-masks-theater' },
      { title: 'Cria e agenda posts', body: 'Em <strong>Criar Post</strong>, usa a IA para gerar legendas, hashtags e imagens. Agenda para publicação automática.', icon: 'fa-plus-circle' },
      { title: 'Publica automaticamente', body: 'O sistema publica automaticamente os teus posts agendados via GitHub Actions. Configura os tokens nas <strong>Configurações</strong>.', icon: 'fa-rocket' },
      { title: 'Monitoriza as análises', body: 'Vê o engagement, top posts, heatmap de actividade e projeções de crescimento em <strong>Análises</strong>.', icon: 'fa-chart-bar' },
    ];
    let step = 0;
    function showStep() {
      if (step >= steps.length) { localStorage.setItem('as_onboarding_done', '1'); closeModal(); return; }
      const s = steps[step];
      const body = `
        <div style="text-align:center;padding:16px 0">
          <i class="fa-solid ${s.icon}" style="font-size:2.5rem;color:var(--accent);margin-bottom:16px"></i>
          <p style="color:var(--text-secondary);line-height:1.7">${s.body}</p>
          <div style="margin-top:20px;display:flex;gap:6px;justify-content:center">
            ${steps.map((_, i) => `<span style="width:8px;height:8px;border-radius:50%;background:${i===step ? 'var(--accent)' : 'var(--border)'}"></span>`).join('')}
          </div>
        </div>`;
      const footer = `
        ${step > 0 ? `<button class="btn btn-secondary" onclick="onboardingPrev()">Anterior</button>` : '<span></span>'}
        <button class="btn btn-primary" onclick="onboardingNext()">${step === steps.length - 1 ? '<i class="fa-solid fa-check"></i> Começar' : 'Seguinte <i class="fa-solid fa-arrow-right"></i>'}</button>`;
      openModal(s.title, body, footer);
      window._onboardingStep = step;
      window._onboardingSteps = steps;
    }
    window.onboardingNext = () => { step++; showStep(); };
    window.onboardingPrev = () => { step--; showStep(); };
    showStep();
  }

  /* ── Public API ── */
  return { init, navigate, toast, fmtErr, openModal, closeModal, formatDate, formatNumber, platformIcon, platformLabel, statusBadge, setAvatares, getAvatares, getActiveAvatar, initSupabase, getFeature, openChangelogModal, authLogin, authLogout, toggleTheme, openCommandPalette, openGlobalSearch, logRecentActivity, getActivityLog, checkOnboarding, openShortcutsHelp };
})();

document.addEventListener('DOMContentLoaded', () => app.init());

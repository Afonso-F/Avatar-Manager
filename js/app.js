/* ============================================================
   app.js — Navegação, estado global, utils
   ============================================================ */
const app = (() => {
  // fn strings resolved at navigate-time so load order doesn't matter
  const sections = {
    dashboard:      { title: 'Dashboard',      fn: 'renderDashboard' },
    avatares:       { title: 'Avatares',        fn: 'renderAvatares' },
    criar:          { title: 'Criar Post',      fn: 'renderCriarPost' },
    fila:           { title: 'Fila / Agenda',   fn: 'renderFila' },
    publicados:     { title: 'Publicados',      fn: 'renderPublicados' },
    analises:       { title: 'Análises',        fn: 'renderAnalises' },
    configuracoes:  { title: 'Configurações',   fn: 'renderConfiguracoes' },
  };

  let current = 'dashboard';
  let _version = null;
  let _features = {};
  let _changelog = [];

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

    // Hash routing
    const hash = location.hash.replace('#', '') || 'dashboard';
    navigate(sections[hash] ? hash : 'dashboard');

    // Init Supabase
    initSupabase();

    // Load version & features
    loadAppMeta();
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
    setTimeout(() => renderFn(content), 60);
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
    const map = { instagram: 'fa-brands fa-instagram icon-instagram', tiktok: 'fa-brands fa-tiktok icon-tiktok', facebook: 'fa-brands fa-facebook icon-facebook', youtube: 'fa-brands fa-youtube icon-youtube' };
    return `<i class="${map[p] || 'fa-solid fa-globe'}"></i>`;
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

  /* ── Public API ── */
  return { init, navigate, toast, openModal, closeModal, formatDate, formatNumber, platformIcon, statusBadge, setAvatares, getAvatares, getActiveAvatar, initSupabase, getFeature, openChangelogModal };
})();

document.addEventListener('DOMContentLoaded', () => app.init());

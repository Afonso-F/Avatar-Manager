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
  }

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
  return { init, navigate, toast, openModal, closeModal, formatDate, formatNumber, platformIcon, statusBadge, setAvatares, getAvatares, getActiveAvatar, initSupabase };
})();

document.addEventListener('DOMContentLoaded', () => app.init());

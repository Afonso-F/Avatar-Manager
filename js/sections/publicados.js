/* ============================================================
   sections/publicados.js — Base de dados de posts publicados
   ============================================================ */
let _pubState = { page: 0, search: '', avatarId: '', plataforma: '' };
const PUB_PAGE_SIZE = 20;

async function renderPublicados(container) {
  let avatares = app.getAvatares();
  if (!avatares.length && DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
    app.setAvatares(avatares);
  }

  _pubState.avatares = avatares;
  _pubState.page = 0;

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Publicados</div>
        <div class="section-subtitle">Todos os posts publicados</div>
      </div>
      <div id="pub-total" class="text-muted text-sm"></div>
    </div>

    <div class="filter-bar">
      <div class="search-input">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input class="form-control" id="pub-search" placeholder="Pesquisar legenda…" oninput="setPubFilter('search', this.value)">
      </div>
      <select class="form-control" style="width:auto" id="pub-avatar" onchange="setPubFilter('avatarId', this.value)">
        <option value="">Todos os avatares</option>
        ${avatares.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
      </select>
      <select class="form-control" style="width:auto" id="pub-platform" onchange="setPubFilter('plataforma', this.value)">
        <option value="">Todas as plataformas</option>
        <option value="instagram">Instagram</option>
        <option value="tiktok">TikTok</option>
        <option value="facebook">Facebook</option>
        <option value="youtube">YouTube</option>
      </select>
    </div>

    <div class="card" style="padding:0">
      <div class="table-wrapper">
        <table class="table" id="pub-table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Avatar</th>
              <th>Plataforma</th>
              <th>Publicado em</th>
              <th class="text-right">Likes</th>
              <th class="text-right">Comentários</th>
              <th class="text-right">Views</th>
            </tr>
          </thead>
          <tbody id="pub-tbody">
            <tr><td colspan="7"><div class="loading-overlay"><div class="spinner"></div></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div id="pub-pagination"></div>`;

  await loadPublicados();
}

async function loadPublicados() {
  const { search, avatarId, plataforma, page } = _pubState;
  const tbody = document.getElementById('pub-tbody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7"><div class="loading-overlay" style="padding:30px"><div class="spinner"></div></div></td></tr>`;

  if (!DB.ready()) {
    tbody.innerHTML = renderPubDemoRows();
    document.getElementById('pub-total').textContent = 'Demo — ligue o Supabase';
    renderPubPagination(1, 0);
    return;
  }

  const { data, count, error } = await DB.getPublicados({
    avatar_id:  avatarId || undefined,
    plataforma: plataforma || undefined,
    search:     search || undefined,
    limit:  PUB_PAGE_SIZE,
    offset: page * PUB_PAGE_SIZE,
  });

  if (error && error !== 'not connected') {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Erro ao carregar dados</td></tr>`;
    return;
  }

  const rows = (data || []);
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><i class="fa-solid fa-database"></i><p>Nenhum post publicado encontrado</p></div></td></tr>`;
    document.getElementById('pub-total').textContent = '0 posts';
    renderPubPagination(0, 0);
    return;
  }

  const avatares = _pubState.avatares || [];
  tbody.innerHTML = rows.map(p => {
    const av      = avatares.find(a => String(a.id) === String(p.avatar_id));
    const caption = p.posts?.legenda || '—';
    const img     = p.posts?.imagem_url;
    return `
      <tr>
        <td>
          <div class="flex items-center gap-1">
            <div class="post-thumb" style="width:40px;height:40px;font-size:1rem;flex-shrink:0">
              ${img ? `<img src="${img}" alt="">` : '<i class="fa-regular fa-image"></i>'}
            </div>
            <span class="truncate" style="max-width:200px" title="${caption}">${caption}</span>
          </div>
        </td>
        <td>${av ? `${av.emoji || '🎭'} ${av.nome}` : '—'}</td>
        <td>${app.platformIcon(p.plataforma)} ${p.plataforma || '—'}</td>
        <td class="text-muted">${app.formatDate(p.publicado_em)}</td>
        <td class="text-right font-bold">${app.formatNumber(p.likes)}</td>
        <td class="text-right">${app.formatNumber(p.comentarios)}</td>
        <td class="text-right">${app.formatNumber(p.visualizacoes)}</td>
      </tr>`;
  }).join('');

  const total = count || rows.length;
  document.getElementById('pub-total').textContent = `${total} posts`;
  renderPubPagination(Math.ceil(total / PUB_PAGE_SIZE), page);
}

function renderPubDemoRows() {
  const demo = [
    { platform: 'instagram', caption: 'Bom dia! Começa o dia com energia ☀️', likes: 1240, comments: 88, views: 9400, date: '2024-01-15', avatar: 'Luna 🌙' },
    { platform: 'tiktok',    caption: 'Tutorial: 5 hacks de produtividade',    likes: 4500, comments: 312, views: 62000, date: '2024-01-14', avatar: 'Aria ⚡' },
    { platform: 'instagram', caption: 'OOTD: look minimalista para o trabalho', likes: 2100, comments: 145, views: 18000, date: '2024-01-13', avatar: 'Zara ✨' },
    { platform: 'youtube',   caption: 'Treino HIIT 20min sem equipamento',     likes: 890,  comments: 67, views: 24000, date: '2024-01-12', avatar: 'Nova 🔥' },
  ];
  return demo.map(p => `
    <tr>
      <td><div class="flex items-center gap-1"><div class="post-thumb" style="width:40px;height:40px;font-size:1rem"><i class="fa-regular fa-image"></i></div><span>${p.caption}</span></div></td>
      <td>${p.avatar}</td>
      <td>${app.platformIcon(p.platform)} ${p.platform}</td>
      <td class="text-muted">${p.date}</td>
      <td class="text-right font-bold">${app.formatNumber(p.likes)}</td>
      <td class="text-right">${app.formatNumber(p.comments)}</td>
      <td class="text-right">${app.formatNumber(p.views)}</td>
    </tr>`).join('');
}

function renderPubPagination(totalPages, current) {
  const el = document.getElementById('pub-pagination');
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }

  let html = '<div class="pagination">';
  html += `<button class="page-btn" onclick="setPubPage(${current - 1})" ${current === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
  const start = Math.max(0, current - 2);
  const end   = Math.min(totalPages - 1, current + 2);
  if (start > 0)         html += `<button class="page-btn" onclick="setPubPage(0)">1</button>${start > 1 ? '<span class="text-muted" style="padding:0 4px">…</span>' : ''}`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn${i === current ? ' active' : ''}" onclick="setPubPage(${i})">${i + 1}</button>`;
  }
  if (end < totalPages - 1) html += `${end < totalPages - 2 ? '<span class="text-muted" style="padding:0 4px">…</span>' : ''}<button class="page-btn" onclick="setPubPage(${totalPages - 1})">${totalPages}</button>`;
  html += `<button class="page-btn" onclick="setPubPage(${current + 1})" ${current >= totalPages - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
  html += '</div>';
  el.innerHTML = html;
}

let _pubSearchTimer;
function setPubFilter(key, value) {
  _pubState[key] = value;
  _pubState.page = 0;
  clearTimeout(_pubSearchTimer);
  _pubSearchTimer = setTimeout(loadPublicados, 300);
}

function setPubPage(p) {
  _pubState.page = p;
  loadPublicados();
}

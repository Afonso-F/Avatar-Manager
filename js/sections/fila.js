/* ============================================================
   sections/fila.js — Fila / Agenda
   ============================================================ */
let _filaState = { tab: 'agendado', avatarFilter: '', page: 0 };
const FILA_PAGE_SIZE = 10;

async function renderFila(container) {
  let posts    = [];
  let avatares = app.getAvatares();

  if (!avatares.length && DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
    app.setAvatares(avatares);
  }

  if (DB.ready()) {
    const { data } = await DB.getPosts({ limit: 200 });
    posts = data || [];
  }

  _filaState.allPosts = posts;
  _filaState.avatares = avatares;

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Fila / Agenda</div>
        <div class="section-subtitle">Posts agendados e rascunhos</div>
      </div>
      <button class="btn btn-primary" onclick="app.navigate('criar')">
        <i class="fa-solid fa-plus"></i> Novo post
      </button>
    </div>

    <div class="tabs" id="fila-tabs">
      <button class="tab-btn${_filaState.tab === 'agendado'  ? ' active' : ''}" onclick="setFilaTab('agendado', this)">Agendados</button>
      <button class="tab-btn${_filaState.tab === 'rascunho'  ? ' active' : ''}" onclick="setFilaTab('rascunho', this)">Rascunhos</button>
      <button class="tab-btn${_filaState.tab === 'all'       ? ' active' : ''}" onclick="setFilaTab('all', this)">Todos</button>
    </div>

    <div class="filter-bar">
      <div class="search-input">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input class="form-control" id="fila-search" placeholder="Pesquisar…" oninput="renderFilaList()">
      </div>
      <select class="form-control" style="width:auto" id="fila-avatar" onchange="renderFilaList()">
        <option value="">Todos os avatares</option>
        ${avatares.map(a => `<option value="${a.id}">${a.nome}</option>`).join('')}
      </select>
    </div>

    <div id="fila-list"></div>
    <div id="fila-pagination"></div>`;

  renderFilaList();
}

function setFilaTab(tab, btn) {
  _filaState.tab  = tab;
  _filaState.page = 0;
  document.querySelectorAll('#fila-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFilaList();
}

function renderFilaList() {
  const search    = (document.getElementById('fila-search')?.value || '').toLowerCase();
  const avatarId  = document.getElementById('fila-avatar')?.value || '';
  const tab       = _filaState.tab;
  const page      = _filaState.page;

  let posts = (_filaState.allPosts || []).filter(p => {
    if (tab !== 'all' && p.status !== tab) return false;
    if (avatarId && String(p.avatar_id) !== String(avatarId)) return false;
    if (search && !(p.legenda || '').toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => {
    if (a.agendado_para && b.agendado_para) return new Date(a.agendado_para) - new Date(b.agendado_para);
    return 0;
  });

  const total     = posts.length;
  const paginated = posts.slice(page * FILA_PAGE_SIZE, (page + 1) * FILA_PAGE_SIZE);
  const listEl    = document.getElementById('fila-list');
  const pagEl     = document.getElementById('fila-pagination');
  if (!listEl) return;

  if (!paginated.length) {
    listEl.innerHTML = `<div class="empty-state"><i class="fa-regular fa-calendar-xmark"></i><p>Nenhum post encontrado</p></div>`;
    pagEl.innerHTML  = '';
    return;
  }

  const avatares = _filaState.avatares || [];

  listEl.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px">
    ${paginated.map(p => {
      const av = avatares.find(a => String(a.id) === String(p.avatar_id));
      const platforms = (p.plataformas || []).map(pl => app.platformIcon(pl)).join(' ');
      return `
        <div class="post-card">
          <div class="post-thumb">
            ${p.imagem_url ? `<img src="${p.imagem_url}" alt="">` : '<i class="fa-regular fa-image"></i>'}
          </div>
          <div class="post-body">
            <div class="post-caption">${p.legenda || '(sem legenda)'}</div>
            <div class="post-meta">
              ${app.statusBadge(p.status)}
              ${av ? `<span class="text-sm text-muted">${av.emoji || '🎭'} ${av.nome}</span>` : ''}
              <span class="post-time"><i class="fa-regular fa-clock"></i> ${app.formatDate(p.agendado_para)}</span>
              <span class="text-sm text-muted">${platforms}</span>
            </div>
          </div>
          <div class="post-actions flex-col gap-1">
            <button class="btn btn-sm btn-secondary btn-icon" onclick="editPost('${p.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger btn-icon"    onclick="deleteFilaPost('${p.id}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
    }).join('')}
  </div>`;

  // Pagination
  const totalPages = Math.ceil(total / FILA_PAGE_SIZE);
  if (totalPages <= 1) { pagEl.innerHTML = ''; return; }

  let paginationHTML = '<div class="pagination">';
  paginationHTML += `<button class="page-btn" onclick="setFilaPage(${page - 1})" ${page === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i = 0; i < totalPages; i++) {
    paginationHTML += `<button class="page-btn${i === page ? ' active' : ''}" onclick="setFilaPage(${i})">${i + 1}</button>`;
  }
  paginationHTML += `<button class="page-btn" onclick="setFilaPage(${page + 1})" ${page >= totalPages - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
  paginationHTML += '</div>';
  pagEl.innerHTML = paginationHTML;
}

function setFilaPage(p) {
  _filaState.page = p;
  renderFilaList();
}

function editPost(id) {
  const post = (_filaState.allPosts || []).find(p => String(p.id) === String(id));
  if (!post) { app.toast('Post não encontrado', 'error'); return; }

  const scheduleVal = post.agendado_para
    ? new Date(post.agendado_para).toISOString().slice(0, 16)
    : '';

  const body = `
    <div class="form-group">
      <label class="form-label">Legenda</label>
      <textarea id="edit-legenda" class="form-control" rows="4">${post.legenda || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Hashtags</label>
      <textarea id="edit-hashtags" class="form-control" rows="2" style="min-height:60px">${post.hashtags || ''}</textarea>
    </div>
    <div class="grid-2">
      <div class="form-group mb-0">
        <label class="form-label">Agendar para</label>
        <input id="edit-schedule" type="datetime-local" class="form-control" value="${scheduleVal}">
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Status</label>
        <select id="edit-status" class="form-control">
          <option value="rascunho" ${post.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
          <option value="agendado" ${post.status === 'agendado' ? 'selected' : ''}>Agendado</option>
        </select>
      </div>
    </div>
    <div class="form-group mt-3 mb-0">
      <label class="form-label">Plataformas</label>
      <div class="platform-toggles" id="edit-platforms">
        ${['instagram','tiktok','facebook','youtube'].map(p => {
          const active = (post.plataformas || []).includes(p);
          return `<div class="platform-toggle${active ? ' active ' + p : ''}" data-p="${p}" onclick="togglePlatformModal(this)">${app.platformIcon(p)} ${p}</div>`;
        }).join('')}
      </div>
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveEditedPost('${id}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;

  app.openModal('Editar post', body, footer);
}

async function saveEditedPost(id) {
  const legenda   = document.getElementById('edit-legenda').value.trim();
  const hashtags  = document.getElementById('edit-hashtags').value.trim();
  const schedule  = document.getElementById('edit-schedule').value;
  const status    = document.getElementById('edit-status').value;
  const platforms = [...document.querySelectorAll('#edit-platforms .platform-toggle.active')].map(el => el.dataset.p);

  if (!legenda) { app.toast('Adiciona uma legenda', 'warning'); return; }

  const updated = {
    id,
    legenda,
    hashtags,
    plataformas:   platforms,
    status,
    agendado_para: schedule ? new Date(schedule).toISOString() : null,
  };

  if (DB.ready()) {
    const { error } = await DB.upsertPost(updated);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }

  const idx = (_filaState.allPosts || []).findIndex(p => String(p.id) === String(id));
  if (idx >= 0) _filaState.allPosts[idx] = { ..._filaState.allPosts[idx], ...updated };

  app.toast('Post atualizado!', 'success');
  app.closeModal();
  renderFilaList();
}

async function deleteFilaPost(id) {
  if (!confirm('Apagar este post?')) return;
  if (DB.ready()) {
    const { error } = await DB.deletePost(id);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  _filaState.allPosts = (_filaState.allPosts || []).filter(p => String(p.id) !== String(id));
  app.toast('Post apagado', 'success');
  renderFilaList();
}

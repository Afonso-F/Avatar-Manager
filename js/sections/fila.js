/* ============================================================
   sections/fila.js — Fila / Agenda
   ============================================================ */
let _filaState = { tab: 'agendado', avatarFilter: '', page: 0, view: 'lista' };
let _draggedPostId = null;
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
      <div class="flex gap-1">
        <button class="btn btn-secondary btn-icon" id="fila-view-btn" onclick="toggleFilaView()" title="Mudar vista">
          <i class="fa-solid fa-${_filaState.view === 'lista' ? 'columns' : 'list'}"></i>
        </button>
        <button class="btn btn-secondary btn-icon" onclick="openCalendarView()" title="Calendário">
          <i class="fa-solid fa-calendar-days"></i>
        </button>
        <button class="btn btn-secondary" onclick="exportFilaCsv()">
          <i class="fa-solid fa-file-csv"></i> Exportar CSV
        </button>
        <button class="btn btn-secondary" onclick="openCsvImport()">
          <i class="fa-solid fa-file-import"></i> Importar CSV
        </button>
        <button class="btn btn-primary" onclick="app.navigate('criar')">
          <i class="fa-solid fa-plus"></i> Novo post
        </button>
      </div>
    </div>

    <div class="tabs" id="fila-tabs">
      <button class="tab-btn${_filaState.tab === 'agendado' ? ' active' : ''}" onclick="setFilaTab('agendado', this)">Agendados</button>
      <button class="tab-btn${_filaState.tab === 'rascunho' ? ' active' : ''}" onclick="setFilaTab('rascunho', this)">Rascunhos</button>
      <button class="tab-btn${_filaState.tab === 'all'      ? ' active' : ''}" onclick="setFilaTab('all', this)">Todos</button>
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
  initBrowserNotifications();
}

/* ── Vista: lista ↔ kanban ── */
function toggleFilaView() {
  _filaState.view = _filaState.view === 'lista' ? 'kanban' : 'lista';
  const btn = document.getElementById('fila-view-btn');
  if (btn) btn.innerHTML = `<i class="fa-solid fa-${_filaState.view === 'lista' ? 'columns' : 'list'}"></i>`;
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
  if (_filaState.view === 'kanban') { renderFilaKanban(); return; }

  const search   = (document.getElementById('fila-search')?.value || '').toLowerCase();
  const avatarId = document.getElementById('fila-avatar')?.value || '';
  const tab      = _filaState.tab;
  const page     = _filaState.page;

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
    if (pagEl) pagEl.innerHTML = '';
    return;
  }

  const avatares = _filaState.avatares || [];
  listEl.innerHTML = `<div id="fila-drag-list" style="display:flex;flex-direction:column;gap:10px">
    ${paginated.map(p => renderPostCard(p, avatares)).join('')}
  </div>`;
  _initDragDrop();

  const totalPages = Math.ceil(total / FILA_PAGE_SIZE);
  if (!pagEl || totalPages <= 1) { if (pagEl) pagEl.innerHTML = ''; return; }
  let html = '<div class="pagination">';
  html += `<button class="page-btn" onclick="setFilaPage(${page - 1})" ${page === 0 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let i = 0; i < totalPages; i++) {
    html += `<button class="page-btn${i === page ? ' active' : ''}" onclick="setFilaPage(${i})">${i + 1}</button>`;
  }
  html += `<button class="page-btn" onclick="setFilaPage(${page + 1})" ${page >= totalPages - 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
  html += '</div>';
  pagEl.innerHTML = html;
}

/* ── Kanban ── */
function renderFilaKanban() {
  const listEl = document.getElementById('fila-list');
  const pagEl  = document.getElementById('fila-pagination');
  if (!listEl) return;
  if (pagEl)   pagEl.innerHTML = '';

  const search   = (document.getElementById('fila-search')?.value || '').toLowerCase();
  const avatarId = document.getElementById('fila-avatar')?.value || '';
  const avatares = _filaState.avatares || [];

  const allPosts = (_filaState.allPosts || []).filter(p => {
    if (avatarId && String(p.avatar_id) !== String(avatarId)) return false;
    if (search && !(p.legenda || '').toLowerCase().includes(search)) return false;
    return true;
  });

  const columns = [
    { key: 'rascunho', label: 'Rascunhos', icon: 'fa-pencil', color: 'var(--text-muted)' },
    { key: 'agendado', label: 'Agendados', icon: 'fa-clock', color: 'var(--accent)' },
    { key: 'publicado', label: 'Publicados', icon: 'fa-check-circle', color: 'var(--green)' },
  ];

  listEl.innerHTML = `<div class="kanban-board">
    ${columns.map(col => {
      const colPosts = allPosts
        .filter(p => p.status === col.key)
        .sort((a, b) => new Date(a.agendado_para || a.criado_em) - new Date(b.agendado_para || b.criado_em));

      return `
        <div class="kanban-col">
          <div class="kanban-col-header">
            <span style="color:${col.color}"><i class="fa-solid ${col.icon}"></i> ${col.label}</span>
            <span class="kanban-count">${colPosts.length}</span>
          </div>
          <div class="kanban-col-body">
            ${colPosts.length === 0
              ? `<div class="kanban-empty">Sem posts</div>`
              : colPosts.map(p => renderKanbanCard(p, avatares)).join('')
            }
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

function renderPostCard(p, avatares) {
  const av       = avatares.find(a => String(a.id) === String(p.avatar_id));
  const platforms = (p.plataformas || []).map(pl => app.platformIcon(pl)).join(' ');
  const aprovBadge = p.aprovacao_status && p.aprovacao_status !== 'pendente'
    ? `<span class="badge ${p.aprovacao_status === 'aprovado' ? 'badge-green' : 'badge-red'}" style="font-size:.65rem">${p.aprovacao_status}</span>` : '';
  const recBadge = p.repetir ? `<span class="badge badge-muted" style="font-size:.65rem"><i class="fa-solid fa-rotate"></i> ${p.repetir_frequencia||'recorrente'}</span>` : '';
  return `
    <div class="post-card" draggable="true" data-post-id="${p.id}">
      <div class="post-drag-handle" title="Arrastar para reordenar"><i class="fa-solid fa-grip-vertical"></i></div>
      <div class="post-thumb">
        ${p.imagem_url ? `<img src="${p.imagem_url}" alt="">` : '<i class="fa-regular fa-image"></i>'}
      </div>
      <div class="post-body">
        <div class="post-caption">${p.legenda || '(sem legenda)'}</div>
        <div class="post-meta">
          ${app.statusBadge(p.status)}
          ${aprovBadge}
          ${recBadge}
          ${av ? `<span class="text-sm text-muted">${av.emoji || '🎭'} ${av.nome}</span>` : ''}
          <span class="post-time"><i class="fa-regular fa-clock"></i> ${app.formatDate(p.agendado_para)}</span>
          <span class="text-sm text-muted">${platforms}</span>
        </div>
        ${renderTagBadges(p.tags)}
      </div>
      <div class="post-actions flex-col gap-1">
        <button class="btn btn-sm btn-secondary btn-icon" onclick="editPost('${p.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openPostComments('${p.id}')" title="Comentários"><i class="fa-solid fa-comment"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openApprovalWorkflow('${p.id}')" title="Aprovação"><i class="fa-solid fa-clipboard-check"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="toggleRecurring('${p.id}')" title="Recorrência"><i class="fa-solid fa-rotate"></i></button>
        <button class="btn btn-sm btn-danger btn-icon"    onclick="deleteFilaPost('${p.id}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}

function renderKanbanCard(p, avatares) {
  const av        = avatares.find(a => String(a.id) === String(p.avatar_id));
  const platforms = (p.plataformas || []).map(pl => app.platformIcon(pl)).join(' ');
  return `
    <div class="kanban-card">
      ${p.imagem_url ? `<img src="${p.imagem_url}" alt="" class="kanban-thumb">` : ''}
      <div class="kanban-caption">${(p.legenda || '(sem legenda)').slice(0, 100)}${(p.legenda||'').length > 100 ? '…' : ''}</div>
      <div class="kanban-meta">
        ${av ? `<span class="text-sm text-muted">${av.emoji || '🎭'} ${av.nome}</span>` : ''}
        <span class="text-sm text-muted"><i class="fa-regular fa-clock"></i> ${app.formatDate(p.agendado_para)}</span>
        <span class="text-sm">${platforms}</span>
      </div>
      <div class="kanban-actions">
        <button class="btn btn-sm btn-secondary btn-icon" onclick="editPost('${p.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteFilaPost('${p.id}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}

function setFilaPage(p) {
  _filaState.page = p;
  renderFilaList();
}

/* ── Drag & Drop ── */
function _initDragDrop() {
  const cards = document.querySelectorAll('.post-card[data-post-id]');
  cards.forEach(card => {
    card.addEventListener('dragstart', e => {
      _draggedPostId = card.dataset.postId;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => card.classList.add('dragging'), 0);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.post-card.drag-over').forEach(c => c.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (card.dataset.postId !== _draggedPostId) card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', async e => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetId = card.dataset.postId;
      if (!_draggedPostId || _draggedPostId === targetId) return;
      await _swapPostOrder(_draggedPostId, targetId);
      _draggedPostId = null;
    });
  });
}

async function _swapPostOrder(idA, idB) {
  const posts = _filaState.allPosts || [];
  const postA = posts.find(p => String(p.id) === String(idA));
  const postB = posts.find(p => String(p.id) === String(idB));
  if (!postA || !postB) return;

  // Trocar datas se ambos as tiverem; caso contrário trocar posições no array
  const timeA = postA.agendado_para;
  const timeB = postB.agendado_para;

  if (timeA && timeB) {
    postA.agendado_para = timeB;
    postB.agendado_para = timeA;
    if (DB.ready()) {
      await Promise.all([
        DB.upsertPost({ id: idA, agendado_para: timeB }),
        DB.upsertPost({ id: idB, agendado_para: timeA }),
      ]);
    }
  } else {
    // Sem datas: apenas trocar posições no array local
    const iA = posts.findIndex(p => String(p.id) === String(idA));
    const iB = posts.findIndex(p => String(p.id) === String(idB));
    if (iA >= 0 && iB >= 0) [posts[iA], posts[iB]] = [posts[iB], posts[iA]];
  }

  app.toast('Ordem atualizada!', 'success');
  renderFilaList();
}

/* ── Editar Post ── */
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

function togglePlatformModal(el) {
  const p = el.dataset.p;
  const wasActive = el.classList.contains('active');
  el.classList.toggle('active', !wasActive);
  if (!wasActive) el.classList.add(p); else el.classList.remove(p);
}

async function saveEditedPost(id) {
  const legenda   = document.getElementById('edit-legenda').value.trim();
  const hashtags  = document.getElementById('edit-hashtags').value.trim();
  const schedule  = document.getElementById('edit-schedule').value;
  const status    = document.getElementById('edit-status').value;
  const platforms = [...document.querySelectorAll('#edit-platforms .platform-toggle.active')].map(el => el.dataset.p);

  if (!legenda) { app.toast('Adiciona uma legenda', 'warning'); return; }

  const updated = {
    id, legenda, hashtags,
    plataformas:   platforms,
    status,
    agendado_para: schedule ? new Date(schedule).toISOString() : null,
  };

  if (DB.ready()) {
    const { error } = await DB.upsertPost(updated);
    if (error) { app.toast('Erro ao guardar: ' + app.fmtErr(error), 'error'); return; }
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

/* ── Importar CSV ── */
function openCsvImport() {
  const body = `
    <div class="form-group">
      <label class="form-label">Ficheiro CSV</label>
      <input type="file" accept=".csv" class="form-control" id="csv-file" onchange="previewCsv(this)">
      <div class="form-hint mt-1">
        Formato: <code>data,legenda,hashtags,plataformas,avatar_id</code><br>
        Exemplo: <code>2026-03-01 14:00,Olá mundo!,#hello #world,instagram tiktok,</code>
      </div>
    </div>
    <div id="csv-preview" style="margin-top:12px"></div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" id="csv-import-btn" onclick="importCsvPosts()" disabled>
      <i class="fa-solid fa-file-import"></i> Importar
    </button>`;

  app.openModal('Importar posts via CSV', body, footer);
  window._csvPosts = [];
}

function previewCsv(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines  = e.target.result.split('\n').filter(l => l.trim());
    const posts  = [];
    const errors = [];

    // Ignorar cabeçalho se existir
    const start = lines[0].toLowerCase().includes('data') ? 1 : 0;

    for (let i = start; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;
      const [dataStr, legenda, hashtags = '', platformsStr = 'instagram', avatarId = ''] = cols;
      const date = new Date(dataStr);
      if (isNaN(date)) { errors.push(`Linha ${i+1}: data inválida "${dataStr}"`); continue; }
      if (!legenda)    { errors.push(`Linha ${i+1}: legenda vazia`); continue; }
      posts.push({
        agendado_para: date.toISOString(),
        legenda,
        hashtags,
        plataformas: platformsStr.split(/\s+/).filter(Boolean),
        avatar_id:   avatarId || null,
        status:      'agendado',
      });
    }

    window._csvPosts = posts;
    const btn = document.getElementById('csv-import-btn');
    if (btn) btn.disabled = posts.length === 0;

    const preview = document.getElementById('csv-preview');
    if (preview) {
      preview.innerHTML = `
        <div class="text-sm" style="margin-bottom:8px">
          <span style="color:var(--green)">${posts.length} posts válidos</span>
          ${errors.length ? `<span style="color:var(--red);margin-left:8px">${errors.length} erros</span>` : ''}
        </div>
        ${posts.slice(0, 5).map(p => `
          <div style="background:var(--bg-elevated);border-radius:var(--radius-sm);padding:8px;margin-bottom:6px;font-size:.8rem">
            <strong>${app.formatDate(p.agendado_para)}</strong> — ${p.legenda.slice(0, 60)}…
          </div>`).join('')}
        ${posts.length > 5 ? `<div class="text-sm text-muted">… e mais ${posts.length - 5} posts</div>` : ''}
        ${errors.map(e => `<div class="text-sm" style="color:var(--red)">${e}</div>`).join('')}`;
    }
  };
  reader.readAsText(file);
}

async function importCsvPosts() {
  const posts = window._csvPosts || [];
  if (!posts.length) { app.toast('Nenhum post válido para importar', 'warning'); return; }

  const btn = document.getElementById('csv-import-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div> A importar…'; }

  let ok = 0, fail = 0;
  for (const post of posts) {
    if (DB.ready()) {
      const { error } = await DB.upsertPost(post);
      if (error) { fail++; } else { ok++; _filaState.allPosts = [...(_filaState.allPosts || []), post]; }
    } else {
      _filaState.allPosts = [...(_filaState.allPosts || []), post];
      ok++;
    }
  }

  app.toast(`${ok} posts importados${fail ? `, ${fail} falharam` : ''}`, ok > 0 ? 'success' : 'error');
  app.closeModal();
  renderFilaList();
}

/* ── Exportar CSV da Fila ── */
function exportFilaCsv() {
  const search   = (document.getElementById('fila-search')?.value || '').toLowerCase();
  const avatarId = document.getElementById('fila-avatar')?.value || '';
  const tab      = _filaState.tab;
  const avatares = _filaState.avatares || [];

  const posts = (_filaState.allPosts || []).filter(p => {
    if (tab !== 'all' && p.status !== tab) return false;
    if (avatarId && String(p.avatar_id) !== String(avatarId)) return false;
    if (search && !(p.legenda || '').toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => new Date(a.agendado_para || 0) - new Date(b.agendado_para || 0));

  if (!posts.length) { app.toast('Sem posts para exportar', 'warning'); return; }

  const header = 'Data agendada,Avatar,Status,Plataformas,Legenda,Hashtags\n';
  const rows   = posts.map(p => {
    const av  = avatares.find(a => String(a.id) === String(p.avatar_id));
    const leg = (p.legenda || '').replace(/"/g, '""');
    const hsh = (p.hashtags || '').replace(/"/g, '""');
    return `${p.agendado_para || ''},${av?.nome || ''},${p.status},"${(p.plataformas||[]).join(' ')}","${leg}","${hsh}"`;
  }).join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href  = URL.createObjectURL(blob);
  link.download = `fila_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  app.toast(`${posts.length} posts exportados!`, 'success');
}

/* ── Notificações browser ── */
function initBrowserNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  // Verificar posts agendados e publicados a cada 60s
  if (window._notifInterval) clearInterval(window._notifInterval);
  window._notifInterval = setInterval(() => {
    checkScheduledNotifications();
    checkPublishedNotifications();
  }, 60000);
  checkScheduledNotifications();
  checkPublishedNotifications();
}

function checkScheduledNotifications() {
  if (Notification.permission !== 'granted') return;
  const now    = new Date();
  const cutoff = new Date(now.getTime() + 15 * 60 * 1000); // próximos 15 min
  const posts  = (_filaState.allPosts || []).filter(p => {
    if (p.status !== 'agendado' || !p.agendado_para) return false;
    const t = new Date(p.agendado_para);
    return t > now && t <= cutoff;
  });

  const notified = JSON.parse(localStorage.getItem('as_notified_posts') || '{}');
  for (const post of posts) {
    if (notified[post.id]) continue;
    const t = new Date(post.agendado_para);
    const diff = Math.round((t - now) / 60000);
    new Notification('ContentHub — Post em breve!', {
      body: `"${(post.legenda || '').slice(0, 80)}" — daqui a ${diff} min`,
      icon: '/favicon.ico',
      tag:  post.id,
    });
    notified[post.id] = true;
    localStorage.setItem('as_notified_posts', JSON.stringify(notified));
  }
}

/* ── Tags ── */
function renderTagBadges(tags) {
  if (!tags || !tags.length) return '';
  return tags.map(t => `<span class="tag-badge">${t}</span>`).join('');
}

/* ── Recorrência ── */
async function toggleRecurring(id) {
  const post = (_filaState.allPosts || []).find(p => String(p.id) === String(id));
  if (!post) return;
  const body = `
    <div class="form-group">
      <label class="form-label">Ativar recorrência</label>
      <select class="form-control" id="rec-freq">
        <option value="">Sem recorrência</option>
        <option value="diario" ${post.repetir_frequencia === 'diario' ? 'selected' : ''}>Diário</option>
        <option value="semanal" ${post.repetir_frequencia === 'semanal' ? 'selected' : ''}>Semanal</option>
        <option value="quinzenal" ${post.repetir_frequencia === 'quinzenal' ? 'selected' : ''}>Quinzenal</option>
        <option value="mensal" ${post.repetir_frequencia === 'mensal' ? 'selected' : ''}>Mensal</option>
      </select>
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Próxima publicação</label>
      <input id="rec-proxima" type="datetime-local" class="form-control" value="${post.repetir_proxima ? new Date(post.repetir_proxima).toISOString().slice(0,16) : ''}">
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveRecurring('${id}')"><i class="fa-solid fa-rotate"></i> Guardar</button>`;
  app.openModal('Recorrência do post', body, footer);
}

async function saveRecurring(id) {
  const freq    = document.getElementById('rec-freq').value;
  const proxima = document.getElementById('rec-proxima').value;
  const update  = {
    id,
    repetir:           !!freq,
    repetir_frequencia: freq || null,
    repetir_proxima:   proxima ? new Date(proxima).toISOString() : null,
  };
  if (DB.ready()) {
    const { error } = await DB.upsertPost(update);
    if (error) { app.toast('Erro: ' + app.fmtErr(error), 'error'); return; }
  }
  const idx = (_filaState.allPosts || []).findIndex(p => String(p.id) === String(id));
  if (idx >= 0) Object.assign(_filaState.allPosts[idx], update);
  app.toast(freq ? 'Recorrência configurada!' : 'Recorrência removida', 'success');
  app.closeModal();
  renderFilaList();
}

/* ── Aprovação ── */
async function openApprovalWorkflow(id) {
  const post = (_filaState.allPosts || []).find(p => String(p.id) === String(id));
  if (!post) return;
  const cur = post.aprovacao_status || 'pendente';
  const body = `
    <div class="form-group">
      <label class="form-label">Estado de aprovação</label>
      <div class="flex gap-2" style="flex-wrap:wrap">
        ${['pendente','aprovado','rejeitado'].map(s => `
          <button class="btn ${cur === s ? 'btn-primary' : 'btn-secondary'}" id="aprov-${s}" onclick="selectAprovacao('${s}')">
            <i class="fa-solid ${s === 'aprovado' ? 'fa-check' : s === 'rejeitado' ? 'fa-xmark' : 'fa-clock'}"></i> ${s.charAt(0).toUpperCase()+s.slice(1)}
          </button>`).join('')}
      </div>
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Nota</label>
      <textarea id="aprov-nota" class="form-control" rows="3" placeholder="Razão da aprovação ou rejeição…">${post.aprovacao_nota || ''}</textarea>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveAprovacao('${id}')"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>`;
  app.openModal('Aprovação do post', body, footer);
  window._aprovacaoSelected = cur;
}

function selectAprovacao(status) {
  window._aprovacaoSelected = status;
  ['pendente','aprovado','rejeitado'].forEach(s => {
    const btn = document.getElementById(`aprov-${s}`);
    if (btn) { btn.className = `btn ${s === status ? 'btn-primary' : 'btn-secondary'}`; }
  });
}

async function saveAprovacao(id) {
  const status = window._aprovacaoSelected || 'pendente';
  const nota   = document.getElementById('aprov-nota').value.trim();
  const update  = { id, aprovacao_status: status, aprovacao_nota: nota };
  if (DB.ready()) {
    const { error } = await DB.upsertPost(update);
    if (error) { app.toast('Erro: ' + app.fmtErr(error), 'error'); return; }
  }
  const idx = (_filaState.allPosts || []).findIndex(p => String(p.id) === String(id));
  if (idx >= 0) Object.assign(_filaState.allPosts[idx], update);
  app.toast('Aprovação guardada!', 'success');
  app.closeModal();
  renderFilaList();
}

/* ── Calendário editorial ── */
function openCalendarView() {
  const posts = _filaState.allPosts || [];
  const now   = new Date();
  let   year  = now.getFullYear();
  let   month = now.getMonth();

  function renderCal(y, m) {
    const first    = new Date(y, m, 1);
    const lastDay  = new Date(y, m + 1, 0).getDate();
    const startWd  = (first.getDay() + 6) % 7; // Monday=0
    const monthStr = first.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });

    const days = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    let grid = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:8px">
      ${days.map(d => `<div style="text-align:center;font-size:.7rem;font-weight:600;color:var(--text-muted);padding:4px 0">${d}</div>`).join('')}
    </div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">`;
    for (let i = 0; i < startWd; i++) grid += '<div></div>';
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayPosts = posts.filter(p => p.agendado_para && p.agendado_para.startsWith(dateStr));
      const isToday  = y === now.getFullYear() && m === now.getMonth() && d === now.getDate();
      grid += `<div style="min-height:60px;background:var(--bg-elevated);border-radius:6px;padding:4px;border:1px solid ${isToday ? 'var(--accent)' : 'var(--border)'}">
        <div style="font-size:.75rem;font-weight:700;color:${isToday ? 'var(--accent)' : 'var(--text-muted)'};margin-bottom:2px">${d}</div>
        ${dayPosts.slice(0,3).map(p => `<div title="${p.legenda||''}" style="font-size:.65rem;background:var(--accent-soft);color:var(--accent);border-radius:3px;padding:1px 4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer" onclick="app.closeModal();editPost('${p.id}')">${(p.legenda||'(sem legenda)').slice(0,18)}</div>`).join('')}
        ${dayPosts.length > 3 ? `<div style="font-size:.65rem;color:var(--text-muted)">+${dayPosts.length-3}</div>` : ''}
      </div>`;
    }
    grid += '</div>';

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <button class="btn btn-secondary btn-sm" onclick="(${renderCal.toString()})(${y},${m-1})">&#8249;</button>
        <strong style="text-transform:capitalize">${monthStr}</strong>
        <button class="btn btn-secondary btn-sm" onclick="(${renderCal.toString()})(${y},${m+1})">&#8250;</button>
      </div>
      ${grid}`;
  }

  const body = `<div id="cal-body">${renderCal(year, month)}</div>`;
  app.openModal('Calendário editorial', body, `<button class="btn btn-primary" onclick="app.closeModal()">Fechar</button>`);
  // Override renderCal closure to update modal body
  window._renderCalendar = (y, m) => {
    const el = document.getElementById('cal-body');
    if (el) el.innerHTML = window._renderCalendar ? '' : '';
  };
}

/* ── Comentários ── */
async function openPostComments(postId) {
  let comentarios = [];
  if (DB.ready()) {
    const { data } = await DB.getPostComentarios(postId);
    comentarios = data || [];
  }
  function renderList(list) {
    return list.length
      ? list.map(c => `
          <div style="background:var(--bg-elevated);border-radius:6px;padding:10px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div class="text-sm">${c.texto}</div>
              <div class="text-sm text-muted" style="margin-top:4px">${app.formatDate(c.criado_em)}</div>
            </div>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteComment('${c.id}','${postId}')"><i class="fa-solid fa-trash"></i></button>
          </div>`).join('')
      : '<div class="text-muted text-sm text-center" style="padding:16px">Sem comentários ainda</div>';
  }

  const body = `
    <div id="comments-list">${renderList(comentarios)}</div>
    <div class="form-group mb-0 mt-3">
      <label class="form-label">Novo comentário / nota</label>
      <div style="display:flex;gap:8px">
        <input id="new-comment" class="form-control" placeholder="Escreve aqui…">
        <button class="btn btn-primary" onclick="addComment('${postId}')"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>`;
  app.openModal('Comentários internos', body, `<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>`);
}

async function addComment(postId) {
  const input = document.getElementById('new-comment');
  const texto = input?.value.trim();
  if (!texto) return;
  let newCom = { texto, criado_em: new Date().toISOString() };
  if (DB.ready()) {
    const { data, error } = await DB.addPostComentario(postId, texto);
    if (error) { app.toast('Erro: ' + app.fmtErr(error), 'error'); return; }
    if (data?.[0]) newCom = data[0];
  }
  const list = document.getElementById('comments-list');
  if (list) {
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--bg-elevated);border-radius:6px;padding:10px 12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:flex-start';
    div.innerHTML = `<div><div class="text-sm">${newCom.texto}</div><div class="text-sm text-muted" style="margin-top:4px">${app.formatDate(newCom.criado_em)}</div></div><button class="btn btn-sm btn-danger btn-icon" onclick="deleteComment('${newCom.id||''}','${postId}')"><i class="fa-solid fa-trash"></i></button>`;
    list.appendChild(div);
    const empty = list.querySelector('.text-muted');
    if (empty && empty.textContent.includes('Sem comentários')) empty.remove();
  }
  if (input) input.value = '';
}

async function deleteComment(commentId, postId) {
  if (!commentId) return;
  if (DB.ready()) {
    const { error } = await DB.deletePostComentario(commentId);
    if (error) { app.toast('Erro: ' + app.fmtErr(error), 'error'); return; }
  }
  await openPostComments(postId);
}

/* ── Webhook ── */
async function triggerWebhook(post, event = 'publicado') {
  const url = localStorage.getItem('as_webhook_url');
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, post_id: post.id, legenda: post.legenda, plataformas: post.plataformas, timestamp: new Date().toISOString() }),
    });
  } catch (e) {
    console.warn('Webhook falhou:', e);
  }
}

async function checkPublishedNotifications() {
  if (Notification.permission !== 'granted') return;
  if (!DB.ready()) return;

  // Na primeira execução apenas inicializar o registo sem enviar notificações
  const stored = localStorage.getItem('as_notified_published');
  const isFirstRun = stored === null;
  const notified = isFirstRun ? {} : JSON.parse(stored);

  const [{ data: published }, { data: errors }] = await Promise.all([
    DB.getPosts({ status: 'publicado', limit: 50 }),
    DB.getPosts({ status: 'erro',      limit: 50 }),
  ]);

  for (const post of (published || [])) {
    if (!notified[post.id]) {
      if (!isFirstRun) {
        new Notification('ContentHub — Post publicado!', {
          body: `"${(post.legenda || '').slice(0, 80)}" foi publicado com sucesso`,
          icon: '/favicon.ico',
          tag:  `pub_${post.id}`,
        });
      }
      notified[post.id] = 'publicado';
    }
  }

  for (const post of (errors || [])) {
    if (!notified[post.id]) {
      if (!isFirstRun) {
        new Notification('ContentHub — Erro na publicação', {
          body: `"${(post.legenda || '').slice(0, 80)}" falhou${post.error_msg ? ': ' + post.error_msg.slice(0, 60) : ''}`,
          icon: '/favicon.ico',
          tag:  `err_${post.id}`,
        });
      }
      notified[post.id] = 'erro';
    }
  }

  localStorage.setItem('as_notified_published', JSON.stringify(notified));
}

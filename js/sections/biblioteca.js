/* ============================================================
   sections/biblioteca.js — Biblioteca de Prompts & Imagens
   ============================================================ */

const CATEGORIAS_BIB = [
  { key: 'geral',        label: 'Geral',        color: 'var(--accent)' },
  { key: 'lifestyle',    label: 'Lifestyle',    color: 'var(--pink)' },
  { key: 'fitness',      label: 'Fitness',      color: 'var(--green)' },
  { key: 'moda',         label: 'Moda',         color: 'var(--yellow)' },
  { key: 'comida',       label: 'Comida',       color: 'var(--red)' },
  { key: 'viagens',      label: 'Viagens',      color: 'var(--accent)' },
  { key: 'beleza',       label: 'Beleza',       color: 'var(--pink)' },
  { key: 'motivacional', label: 'Motivacional', color: 'var(--yellow)' },
  { key: 'anime',        label: 'Anime',        color: 'var(--purple, #9b59b6)' },
  { key: 'natureza',     label: 'Natureza',     color: 'var(--green)' },
  { key: 'retrato',      label: 'Retrato',      color: 'var(--text-muted)' },
  { key: 'produto',      label: 'Produto',      color: 'var(--accent)' },
  { key: 'humor',        label: 'Humor',        color: 'var(--yellow)' },
  { key: 'nsfw',         label: 'NSFW',         color: 'var(--red)' },
];

let _bibState = { tab: 'all', items: [] };

async function renderBiblioteca(container) {
  let items = [];
  if (DB.ready()) {
    const { data } = await DB.getPromptLibrary();
    items = data || [];
  }
  _bibState.items = items;

  const totalImagens = items.filter(i => i.tipo === 'imagem').length;
  const totalVideos  = items.filter(i => i.tipo === 'video').length;
  const maisUsado    = items.reduce((max, i) => (i.vezes_usado || 0) > (max.vezes_usado || 0) ? i : max, {});

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Biblioteca de Prompts</div>
        <div class="section-subtitle">Prompts reutilizáveis para imagens e vídeos, organizados por categoria</div>
      </div>
      <button class="btn btn-primary" onclick="openAddPromptModal()">
        <i class="fa-solid fa-plus"></i> Novo prompt
      </button>
    </div>

    <!-- KPIs -->
    <div class="grid-3 mb-3">
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Total de prompts</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--accent)">${items.length}</div>
        <div class="text-muted text-sm">${totalImagens} imagem · ${totalVideos} vídeo</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Categorias</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--pink)">${new Set(items.map(i => i.categoria)).size}</div>
        <div class="text-muted text-sm">categorias activas</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Mais usado</div>
        ${maisUsado.titulo ? `
          <div style="font-size:1rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${maisUsado.titulo}</div>
          <div class="text-muted text-sm">${maisUsado.vezes_usado || 0}× utilizado</div>
        ` : '<div class="text-muted text-sm" style="margin-top:8px">—</div>'}
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs mb-2" id="bib-tabs">
      <button class="tab-btn${_bibState.tab === 'all'    ? ' active' : ''}" onclick="setBibTab('all',this)">
        Todos (${items.length})
      </button>
      <button class="tab-btn${_bibState.tab === 'imagem' ? ' active' : ''}" onclick="setBibTab('imagem',this)">
        <i class="fa-regular fa-image"></i> Imagens (${totalImagens})
      </button>
      <button class="tab-btn${_bibState.tab === 'video'  ? ' active' : ''}" onclick="setBibTab('video',this)">
        <i class="fa-solid fa-film"></i> Vídeos (${totalVideos})
      </button>
    </div>

    <!-- Filtros -->
    <div class="filter-bar mb-3">
      <div class="search-input">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input class="form-control" id="bib-search" placeholder="Pesquisar título ou prompt…" oninput="filterBiblioteca()">
      </div>
      <select class="form-control" style="width:auto" id="bib-cat-filter" onchange="filterBiblioteca()">
        <option value="">Todas as categorias</option>
        ${CATEGORIAS_BIB.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
      </select>
    </div>

    <!-- Grid -->
    <div id="bib-grid"></div>`;

  filterBiblioteca();
}

function setBibTab(tab, btn) {
  _bibState.tab = tab;
  document.querySelectorAll('#bib-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  filterBiblioteca();
}

function filterBiblioteca() {
  const search = (document.getElementById('bib-search')?.value || '').toLowerCase();
  const cat    = document.getElementById('bib-cat-filter')?.value || '';
  const tab    = _bibState.tab;

  const filtered = (_bibState.items || []).filter(item => {
    if (tab !== 'all' && item.tipo !== tab) return false;
    if (cat && item.categoria !== cat) return false;
    if (search && !(item.titulo || '').toLowerCase().includes(search) && !(item.prompt || '').toLowerCase().includes(search)) return false;
    return true;
  }).sort((a, b) => (b.vezes_usado || 0) - (a.vezes_usado || 0));

  renderBibGrid(filtered);
}

function renderBibGrid(items) {
  const el = document.getElementById('bib-grid');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-images"></i>
        <p>Nenhum prompt encontrado</p>
        <button class="btn btn-primary btn-sm" onclick="openAddPromptModal()">
          <i class="fa-solid fa-plus"></i> Adicionar prompt
        </button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
      ${items.map(item => renderBibCard(item)).join('')}
    </div>`;
}

function renderBibCard(item) {
  const cat   = CATEGORIAS_BIB.find(c => c.key === item.categoria) || { label: item.categoria || 'geral', color: 'var(--accent)' };
  const isImg = item.tipo === 'imagem';

  return `
    <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column">
      <!-- Thumbnail -->
      <div style="width:100%;aspect-ratio:4/3;background:var(--bg-elevated);position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--text-muted)">
        ${item.imagem_url
          ? `<img src="${item.imagem_url}" alt="" style="width:100%;height:100%;object-fit:cover">`
          : `<i class="fa-solid ${isImg ? 'fa-image' : 'fa-film'}" style="font-size:2.5rem;opacity:.3"></i>`}
        <!-- Tipo badge -->
        <div style="position:absolute;top:8px;left:8px">
          <span style="background:rgba(0,0,0,.65);color:#fff;font-size:.7rem;padding:2px 7px;border-radius:20px;backdrop-filter:blur(4px)">
            <i class="fa-solid ${isImg ? 'fa-image' : 'fa-film'}"></i> ${isImg ? 'Imagem' : 'Vídeo'}
          </span>
        </div>
        <!-- Contador de uso -->
        ${(item.vezes_usado || 0) > 0 ? `
        <div style="position:absolute;top:8px;right:8px">
          <span style="background:rgba(0,0,0,.65);color:var(--green);font-size:.7rem;padding:2px 7px;border-radius:20px;backdrop-filter:blur(4px)">
            <i class="fa-solid fa-repeat"></i> ${item.vezes_usado}×
          </span>
        </div>` : ''}
      </div>

      <!-- Conteúdo -->
      <div style="padding:12px;display:flex;flex-direction:column;gap:6px;flex:1">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="font-weight:700;font-size:.9rem;line-height:1.3" title="${item.titulo}">${item.titulo}</div>
          <span class="badge" style="background:${cat.color}20;color:${cat.color};flex-shrink:0;font-size:.68rem;white-space:nowrap">${cat.label}</span>
        </div>
        <div style="font-size:.78rem;color:var(--text-muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden" title="${(item.prompt || '').replace(/"/g, '&quot;')}">
          ${item.prompt}
        </div>
        ${(item.tags || []).length ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${item.tags.slice(0, 5).map(t => `<span class="badge badge-muted" style="font-size:.65rem">${t}</span>`).join('')}
        </div>` : ''}
      </div>

      <!-- Ações -->
      <div style="padding:8px 12px;border-top:1px solid var(--border);display:flex;gap:6px">
        <button class="btn btn-primary btn-sm flex-1" onclick="usarPromptBib('${item.id}')">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Usar
        </button>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="openEditPromptModal('${item.id}')" title="Editar">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="apagarPromptBib('${item.id}')" title="Apagar">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`;
}

/* ── Usar prompt (navega para Criar Post com prompt pré-preenchido) ── */
async function usarPromptBib(id) {
  const item = (_bibState.items || []).find(i => String(i.id) === String(id));
  if (!item) return;

  localStorage.setItem('as_library_prompt', JSON.stringify({
    tipo:      item.tipo,
    prompt:    item.prompt,
    imagem_url: item.imagem_url || null,
    titulo:    item.titulo,
  }));

  if (DB.ready()) {
    await DB.incrementPromptUsage(id);
    const idx = (_bibState.items || []).findIndex(i => String(i.id) === String(id));
    if (idx >= 0) _bibState.items[idx].vezes_usado = (_bibState.items[idx].vezes_usado || 0) + 1;
  }

  app.toast(`Prompt "${item.titulo}" pronto a usar!`, 'success');
  app.navigate('criar');
}

/* ── Formulário ── */
function openAddPromptModal(existing) {
  const body = `
    <div class="form-group">
      <label class="form-label">Título</label>
      <input id="bib-f-titulo" class="form-control" value="${existing?.titulo || ''}" placeholder="Ex: Pôr do sol minimalista em tons pastel">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select id="bib-f-tipo" class="form-control">
          <option value="imagem" ${(!existing || existing.tipo === 'imagem') ? 'selected' : ''}>Imagem</option>
          <option value="video"  ${existing?.tipo === 'video' ? 'selected' : ''}>Vídeo</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select id="bib-f-cat" class="form-control">
          ${CATEGORIAS_BIB.map(c => `<option value="${c.key}" ${(existing?.categoria || 'geral') === c.key ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Prompt</label>
      <textarea id="bib-f-prompt" class="form-control" rows="5" placeholder="Descreve em detalhe a imagem ou vídeo…">${existing?.prompt || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">URL de imagem de exemplo <span class="text-muted">(opcional)</span></label>
      <input id="bib-f-img" class="form-control" value="${existing?.imagem_url || ''}" placeholder="https://…">
      <div class="form-hint">URL pública de uma imagem gerada com este prompt</div>
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Tags <span class="text-muted">(separadas por vírgula)</span></label>
      <input id="bib-f-tags" class="form-control" value="${(existing?.tags || []).join(', ')}" placeholder="Ex: sunset, minimal, pastel, aesthetic">
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="guardarPromptBib('${existing?.id || ''}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;

  app.openModal(existing ? 'Editar prompt' : 'Novo prompt', body, footer);
  setTimeout(() => document.getElementById('bib-f-titulo')?.focus(), 100);
}

function openEditPromptModal(id) {
  const item = (_bibState.items || []).find(i => String(i.id) === String(id));
  if (item) openAddPromptModal(item);
}

async function guardarPromptBib(id) {
  const titulo    = document.getElementById('bib-f-titulo')?.value.trim();
  const tipo      = document.getElementById('bib-f-tipo')?.value || 'imagem';
  const categoria = document.getElementById('bib-f-cat')?.value || 'geral';
  const prompt    = document.getElementById('bib-f-prompt')?.value.trim();
  const imagem_url = document.getElementById('bib-f-img')?.value.trim() || null;
  const tagsStr   = document.getElementById('bib-f-tags')?.value || '';
  const tags      = tagsStr.split(',').map(t => t.trim()).filter(Boolean);

  if (!titulo) { app.toast('Adiciona um título', 'warning'); return; }
  if (!prompt) { app.toast('O prompt não pode estar vazio', 'warning'); return; }

  const entry = { titulo, tipo, categoria, prompt, imagem_url, tags };
  if (id) entry.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertPromptEntry(entry);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
    if (id) {
      _bibState.items = (_bibState.items || []).map(i => String(i.id) === String(id) ? { ...i, ...entry } : i);
    } else {
      _bibState.items = [saved || { id: Date.now(), ...entry, vezes_usado: 0 }, ...(_bibState.items || [])];
    }
  }

  app.toast('Prompt guardado!', 'success');
  app.closeModal();
  filterBiblioteca();
}

async function apagarPromptBib(id) {
  if (!confirm('Apagar este prompt da biblioteca?')) return;
  if (DB.ready()) {
    const { error } = await DB.deletePromptEntry(id);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  _bibState.items = (_bibState.items || []).filter(i => String(i.id) !== String(id));
  app.toast('Prompt apagado', 'success');
  filterBiblioteca();
}

/* ── Modal picker para usar no Criar Post ── */
async function openLibraryPickerModal(tipo, targetInputId) {
  let items = (_bibState.items || []).filter(i => tipo === 'all' || i.tipo === tipo);

  if (!items.length && DB.ready()) {
    const { data } = await DB.getPromptLibrary({ tipo: tipo !== 'all' ? tipo : undefined });
    items = data || [];
  }

  if (!items.length) {
    app.openModal(
      'Biblioteca vazia',
      `<div class="empty-state" style="padding:24px">
        <i class="fa-solid fa-images"></i>
        <p>Ainda não tens prompts na biblioteca.</p>
        <button class="btn btn-primary btn-sm" onclick="app.closeModal();app.navigate('biblioteca')">
          Ir para a Biblioteca
        </button>
      </div>`,
      '<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>'
    );
    return;
  }

  window._libPicker = { items, targetInputId };

  const body = `
    <div class="filter-bar mb-2" style="gap:8px">
      <div class="search-input" style="flex:1">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input class="form-control" id="lib-picker-search" placeholder="Pesquisar…" oninput="filterLibPicker()">
      </div>
      <select class="form-control" style="width:auto" id="lib-picker-cat" onchange="filterLibPicker()">
        <option value="">Todas</option>
        ${CATEGORIAS_BIB.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
      </select>
    </div>
    <div id="lib-picker-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;max-height:380px;overflow-y:auto;padding:2px"></div>`;

  app.openModal(
    `Biblioteca — ${tipo === 'imagem' ? 'Imagens' : tipo === 'video' ? 'Vídeos' : 'Todos'}`,
    body,
    '<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>'
  );

  renderLibPickerGrid(items);
}

function filterLibPicker() {
  const search = (document.getElementById('lib-picker-search')?.value || '').toLowerCase();
  const cat    = document.getElementById('lib-picker-cat')?.value || '';
  const items  = (window._libPicker?.items || []).filter(i => {
    if (cat && i.categoria !== cat) return false;
    if (search && !(i.titulo || '').toLowerCase().includes(search) && !(i.prompt || '').toLowerCase().includes(search)) return false;
    return true;
  });
  renderLibPickerGrid(items);
}

function renderLibPickerGrid(items) {
  const el = document.getElementById('lib-picker-grid');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<div class="text-muted text-sm text-center" style="padding:20px;grid-column:1/-1">Sem resultados</div>';
    return;
  }

  el.innerHTML = items.map(item => {
    const cat = CATEGORIAS_BIB.find(c => c.key === item.categoria) || { color: 'var(--accent)', label: item.categoria };
    return `
      <div onclick="pickFromLibrary('${item.id}')"
           style="cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid var(--border);transition:all .15s"
           onmouseenter="this.style.borderColor='var(--accent)';this.style.transform='scale(1.02)'"
           onmouseleave="this.style.borderColor='var(--border)';this.style.transform='scale(1)'">
        <div style="aspect-ratio:1;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center;color:var(--text-muted);overflow:hidden">
          ${item.imagem_url
            ? `<img src="${item.imagem_url}" alt="" style="width:100%;height:100%;object-fit:cover">`
            : `<i class="fa-solid ${item.tipo === 'imagem' ? 'fa-image' : 'fa-film'}" style="font-size:1.5rem;opacity:.4"></i>`}
        </div>
        <div style="padding:6px 8px">
          <div style="font-size:.75rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.titulo}</div>
          <span class="badge" style="background:${cat.color}20;color:${cat.color};font-size:.6rem;margin-top:2px">${cat.label}</span>
        </div>
      </div>`;
  }).join('');
}

async function pickFromLibrary(id) {
  const { items, targetInputId } = window._libPicker || {};
  const item = (items || []).find(i => String(i.id) === String(id));
  if (!item) return;

  const el = document.getElementById(targetInputId);
  if (el) {
    el.value = item.prompt;
    el.dispatchEvent(new Event('input'));
  }

  if (DB.ready()) await DB.incrementPromptUsage(id);

  app.toast(`"${item.titulo}" aplicado!`, 'success');
  app.closeModal();
}

/* ── Guardar na biblioteca a partir do Criar Post ── */
function openSaveToLibraryForm(tipo) {
  const fieldId = tipo === 'video' ? 'cp-vid-prompt' : 'cp-img-prompt';
  const prompt  = document.getElementById(fieldId)?.value.trim() || '';

  const body = `
    <div class="form-group">
      <label class="form-label">Título</label>
      <input id="lib-save-titulo" class="form-control" placeholder="Nome curto para identificar este prompt" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">Categoria</label>
      <select id="lib-save-cat" class="form-control">
        ${CATEGORIAS_BIB.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Tags <span class="text-muted">(separadas por vírgula)</span></label>
      <input id="lib-save-tags" class="form-control" placeholder="Ex: minimal, sunset, portrait">
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Prompt</label>
      <textarea id="lib-save-prompt" class="form-control" rows="3">${prompt}</textarea>
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="confirmarSaveToLibrary('${tipo}')">
      <i class="fa-solid fa-bookmark"></i> Guardar na biblioteca
    </button>`;

  app.openModal('Guardar na biblioteca', body, footer);
  setTimeout(() => document.getElementById('lib-save-titulo')?.focus(), 100);
}

async function confirmarSaveToLibrary(tipo) {
  const titulo    = document.getElementById('lib-save-titulo')?.value.trim();
  const categoria = document.getElementById('lib-save-cat')?.value || 'geral';
  const tagsStr   = document.getElementById('lib-save-tags')?.value || '';
  const tags      = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  const prompt    = document.getElementById('lib-save-prompt')?.value.trim();

  if (!titulo) { app.toast('Adiciona um título', 'warning'); return; }
  if (!prompt) { app.toast('O prompt não pode estar vazio', 'warning'); return; }

  // Tentar guardar imagem no Storage se existir data URL
  let imagem_url = null;
  if (tipo === 'imagem' && typeof _criarState !== 'undefined' && _criarState?.imageDataUrl && DB.ready()) {
    const tempId = `lib-${Date.now()}`;
    const { url } = await DB.uploadLibraryImage(_criarState.imageDataUrl, tempId);
    imagem_url = url || null;
  }

  const entry = { titulo, tipo, categoria, prompt, tags, imagem_url };

  if (DB.ready()) {
    const { error } = await DB.upsertPromptEntry(entry);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }

  app.toast(`Prompt "${titulo}" guardado na biblioteca!`, 'success');
  app.closeModal();
}

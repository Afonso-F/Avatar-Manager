/* ============================================================
   sections/campanhas.js — Gestão de Campanhas Publicitárias
   ============================================================ */

const CAMP_STATUS = {
  planeamento: { label: 'Planeamento', color: 'var(--yellow)' },
  ativa:       { label: 'Ativa',        color: 'var(--green)' },
  pausada:     { label: 'Pausada',      color: 'var(--orange, #f97316)' },
  finalizada:  { label: 'Finalizada',   color: 'var(--text-muted)' },
};

const CAMP_OBJETIVO = {
  reconhecimento: 'Reconhecimento',
  trafego:        'Tráfego',
  leads:          'Leads',
  conversoes:     'Conversões',
  engagement:     'Engagement',
};

let _campState = { tab: 'todas', items: [], avatares: [] };

async function renderCampanhas(container) {
  let campanhas = [];
  let avatares  = [];

  if (DB.ready()) {
    const [cRes, aRes] = await Promise.all([
      DB.getCampanhas(),
      DB.getAvatares(),
    ]);
    campanhas = cRes.data || [];
    avatares  = aRes.data || [];
  }

  _campState.items    = campanhas;
  _campState.avatares = avatares;

  // KPIs
  const ativas       = campanhas.filter(c => c.status === 'ativa');
  const budgetTotal  = campanhas.reduce((s, c) => s + parseFloat(c.budget_total || 0), 0);
  const budgetGasto  = campanhas.reduce((s, c) => s + parseFloat(c.budget_gasto  || 0), 0);
  const totalImpressoes = campanhas.reduce((s, c) => s + (c.impressoes || 0), 0);
  const totalCliques    = campanhas.reduce((s, c) => s + (c.cliques    || 0), 0);
  const ctr = totalImpressoes > 0 ? ((totalCliques / totalImpressoes) * 100).toFixed(2) : '—';

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Campanhas</div>
        <div class="section-subtitle">Publicidade &amp; promoções dos teus avatares</div>
      </div>
      <button class="btn btn-primary" onclick="openCampanhaForm()">
        <i class="fa-solid fa-plus"></i> Nova Campanha
      </button>
    </div>

    <!-- KPIs -->
    <div class="grid-3 mb-3">
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Campanhas ativas</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--green)">${ativas.length}</div>
        <div class="text-muted text-sm">${campanhas.length} total</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Budget total / gasto</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--accent)">€${budgetGasto.toFixed(0)}</div>
        <div class="text-muted text-sm">de €${budgetTotal.toFixed(0)} alocados</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">CTR médio</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--blue,#4f8ef7)">${ctr}${ctr !== '—' ? '%' : ''}</div>
        <div class="text-muted text-sm">${app.formatNumber(totalCliques)} cliques · ${app.formatNumber(totalImpressoes)} impressões</div>
      </div>
    </div>

    <!-- Tabs + filtros -->
    <div class="card mb-3" style="padding:0">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border)">
        <div class="tabs" style="border-bottom:none;gap:4px">
          ${['todas','ativa','pausada','planeamento','finalizada'].map(t => {
            const labels = { todas:'Todas', ativa:'Ativas', pausada:'Pausadas', planeamento:'Planeamento', finalizada:'Finalizadas' };
            const count = t === 'todas' ? campanhas.length : campanhas.filter(c => c.status === t).length;
            return `<button class="tab-btn ${_campState.tab === t ? 'active' : ''}"
              onclick="_campSetTab('${t}')">${labels[t]} <span class="badge" style="margin-left:4px;font-size:.7rem">${count}</span></button>`;
          }).join('')}
        </div>
        <div class="flex gap-1">
          <select class="form-control" style="width:auto;font-size:.8rem" id="camp-filter-avatar" onchange="_campFilter()">
            <option value="">Todos os avatares</option>
            ${avatares.map(a => `<option value="${a.id}">${a.emoji || ''} ${a.nome}</option>`).join('')}
          </select>
          <select class="form-control" style="width:auto;font-size:.8rem" id="camp-filter-plat" onchange="_campFilter()">
            <option value="">Todas as plataformas</option>
            ${['instagram','tiktok','facebook','youtube','twitter','linkedin'].map(p =>
              `<option value="${p}">${p.charAt(0).toUpperCase()+p.slice(1)}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div id="camp-list" style="padding:12px 16px"></div>
    </div>`;

  _campFilter();
}

function _campSetTab(tab) {
  _campState.tab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.trim().toLowerCase().startsWith(
      { todas:'todas', ativa:'ativas', pausada:'pausadas', planeamento:'planea', finalizada:'finali' }[tab]
    ));
  });
  _campFilter();
}

function _campFilter() {
  const tab         = _campState.tab;
  const avatarFilter = document.getElementById('camp-filter-avatar')?.value || '';
  const platFilter   = document.getElementById('camp-filter-plat')?.value   || '';

  let list = _campState.items;
  if (tab !== 'todas')    list = list.filter(c => c.status === tab);
  if (avatarFilter)       list = list.filter(c => c.avatar_id === avatarFilter);
  if (platFilter)         list = list.filter(c => (c.plataformas || []).includes(platFilter));

  _campRenderList(list);
}

function _campRenderList(campanhas) {
  const el = document.getElementById('camp-list');
  if (!el) return;

  if (!campanhas.length) {
    el.innerHTML = `<div class="empty-state">
      <i class="fa-solid fa-bullhorn"></i>
      <p>Sem campanhas nesta vista</p>
      <button class="btn btn-primary btn-sm" onclick="openCampanhaForm()">
        <i class="fa-solid fa-plus"></i> Nova campanha
      </button>
    </div>`;
    return;
  }

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px">
    ${campanhas.map(c => _campCard(c)).join('')}
  </div>`;
}

function _campCard(c) {
  const st       = CAMP_STATUS[c.status] || CAMP_STATUS.planeamento;
  const avatar   = _campState.avatares.find(a => a.id === c.avatar_id);
  const pctGasto = c.budget_total > 0 ? Math.min(100, Math.round((c.budget_gasto / c.budget_total) * 100)) : 0;
  const ctr      = c.impressoes > 0 ? ((c.cliques / c.impressoes) * 100).toFixed(1) : '—';
  const cpc      = c.cliques > 0 ? (c.budget_gasto / c.cliques).toFixed(2) : '—';

  const plats = (c.plataformas || []).map(p => app.platformIcon ? app.platformIcon(p) : `<span class="badge">${p}</span>`).join(' ');

  return `
    <div style="background:var(--bg-elevated);border-radius:10px;padding:14px 16px;border:1px solid var(--border)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <span style="font-weight:700;font-size:.95rem">${c.nome}</span>
            <span class="badge" style="background:${st.color}20;color:${st.color};font-size:.7rem">${st.label}</span>
            <span class="badge" style="background:var(--accent)15;color:var(--accent);font-size:.7rem">${CAMP_OBJETIVO[c.objetivo] || c.objetivo}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:.78rem;color:var(--text-muted)">
            ${avatar ? `<span><i class="fa-solid fa-user-circle"></i> ${avatar.emoji || ''} ${avatar.nome}</span>` : ''}
            <span><i class="fa-regular fa-calendar"></i> ${c.data_inicio}${c.data_fim ? ' → ' + c.data_fim : ''}</span>
            ${plats ? `<span>${plats}</span>` : ''}
          </div>
          ${c.descricao ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.descricao}</div>` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-secondary btn-icon" onclick="editCampanha('${c.id}')" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-icon" onclick="deleteCampanha('${c.id}')" title="Apagar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <!-- Budget bar -->
      <div style="margin-top:12px">
        <div style="display:flex;justify-content:space-between;font-size:.76rem;color:var(--text-muted);margin-bottom:4px">
          <span>Budget: €${parseFloat(c.budget_gasto||0).toFixed(0)} / €${parseFloat(c.budget_total||0).toFixed(0)}</span>
          <span>${pctGasto}% utilizado</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pctGasto}%;background:${pctGasto >= 90 ? 'var(--red)' : pctGasto >= 70 ? 'var(--yellow)' : 'var(--accent)'}"></div>
        </div>
      </div>

      <!-- Métricas -->
      <div style="display:flex;gap:16px;margin-top:10px;flex-wrap:wrap">
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">Impressões</div>
          <div style="font-weight:700;font-size:.88rem">${app.formatNumber(c.impressoes || 0)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">Cliques</div>
          <div style="font-weight:700;font-size:.88rem">${app.formatNumber(c.cliques || 0)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">CTR</div>
          <div style="font-weight:700;font-size:.88rem">${ctr}${ctr !== '—' ? '%' : ''}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">Conversões</div>
          <div style="font-weight:700;font-size:.88rem">${app.formatNumber(c.conversoes || 0)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:.7rem;color:var(--text-muted)">CPC</div>
          <div style="font-weight:700;font-size:.88rem">${cpc !== '—' ? '€'+cpc : '—'}</div>
        </div>
      </div>
    </div>`;
}

/* ── Forms / Modal ── */
function openCampanhaForm(existing) {
  const avatares = _campState.avatares;
  const hoje = new Date().toISOString().slice(0, 10);
  const PLATS = ['instagram','tiktok','facebook','youtube','twitter','linkedin'];
  const selPlats = existing?.plataformas || [];

  const body = `
    <div class="form-group">
      <label class="form-label">Nome da campanha *</label>
      <input id="camp-nome" class="form-control" value="${existing?.nome || ''}" placeholder="Ex: Lançamento Verão 2026">
    </div>
    <div class="form-group">
      <label class="form-label">Descrição</label>
      <textarea id="camp-desc" class="form-control" rows="2" placeholder="Objetivo e notas da campanha">${existing?.descricao || ''}</textarea>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Objetivo</label>
        <select id="camp-obj" class="form-control">
          ${Object.entries(CAMP_OBJETIVO).map(([k, v]) =>
            `<option value="${k}" ${(existing?.objetivo || 'reconhecimento') === k ? 'selected' : ''}>${v}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="camp-status" class="form-control">
          ${Object.entries(CAMP_STATUS).map(([k, v]) =>
            `<option value="${k}" ${(existing?.status || 'planeamento') === k ? 'selected' : ''}>${v.label}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Avatar</label>
        <select id="camp-avatar" class="form-control">
          <option value="">— Nenhum —</option>
          ${avatares.map(a => `<option value="${a.id}" ${existing?.avatar_id === a.id ? 'selected' : ''}>${a.emoji || ''} ${a.nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Plataformas</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0">
          ${PLATS.map(p => `
            <label style="display:flex;align-items:center;gap:4px;font-size:.82rem;cursor:pointer">
              <input type="checkbox" value="${p}" class="camp-plat-check" ${selPlats.includes(p) ? 'checked' : ''}> ${p}
            </label>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Budget total (€)</label>
        <input id="camp-budget-total" class="form-control" type="number" min="0" step="1" value="${existing?.budget_total || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Budget gasto (€)</label>
        <input id="camp-budget-gasto" class="form-control" type="number" min="0" step="0.01" value="${existing?.budget_gasto || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Data início *</label>
        <input id="camp-inicio" class="form-control" type="date" value="${existing?.data_inicio || hoje}">
      </div>
      <div class="form-group">
        <label class="form-label">Data fim</label>
        <input id="camp-fim" class="form-control" type="date" value="${existing?.data_fim || ''}">
      </div>
    </div>

    <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
      <div class="section-subtitle" style="margin-bottom:8px">Métricas (actualização manual)</div>
      <div class="grid-3">
        <div class="form-group mb-0">
          <label class="form-label">Impressões</label>
          <input id="camp-impressoes" class="form-control" type="number" min="0" value="${existing?.impressoes || 0}">
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Cliques</label>
          <input id="camp-cliques" class="form-control" type="number" min="0" value="${existing?.cliques || 0}">
        </div>
        <div class="form-group mb-0">
          <label class="form-label">Conversões</label>
          <input id="camp-conversoes" class="form-control" type="number" min="0" value="${existing?.conversoes || 0}">
        </div>
      </div>
    </div>
    <div class="form-group" style="margin-top:12px">
      <label class="form-label">Notas</label>
      <textarea id="camp-notas" class="form-control" rows="2" placeholder="Observações adicionais">${existing?.notas || ''}</textarea>
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveCampanha('${existing?.id || ''}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;

  app.openModal(existing ? 'Editar campanha' : 'Nova campanha', body, footer);
  setTimeout(() => document.getElementById('camp-nome')?.focus(), 100);
}

function editCampanha(id) {
  const c = (_campState.items || []).find(x => String(x.id) === String(id));
  if (c) openCampanhaForm(c);
}

async function saveCampanha(id) {
  const nome    = document.getElementById('camp-nome')?.value.trim();
  const inicio  = document.getElementById('camp-inicio')?.value;

  if (!nome)   { app.toast('Nome é obrigatório', 'warning'); return; }
  if (!inicio) { app.toast('Data de início é obrigatória', 'warning'); return; }

  const plataformas = [...document.querySelectorAll('.camp-plat-check:checked')].map(c => c.value);

  const campanha = {
    nome,
    descricao:    document.getElementById('camp-desc')?.value.trim() || null,
    objetivo:     document.getElementById('camp-obj')?.value || 'reconhecimento',
    status:       document.getElementById('camp-status')?.value || 'planeamento',
    avatar_id:    document.getElementById('camp-avatar')?.value || null,
    plataformas,
    budget_total: parseFloat(document.getElementById('camp-budget-total')?.value || '0') || 0,
    budget_gasto: parseFloat(document.getElementById('camp-budget-gasto')?.value || '0') || 0,
    data_inicio:  inicio,
    data_fim:     document.getElementById('camp-fim')?.value || null,
    impressoes:   parseInt(document.getElementById('camp-impressoes')?.value || '0') || 0,
    cliques:      parseInt(document.getElementById('camp-cliques')?.value || '0') || 0,
    conversoes:   parseInt(document.getElementById('camp-conversoes')?.value || '0') || 0,
    notas:        document.getElementById('camp-notas')?.value.trim() || null,
    atualizado_em: new Date().toISOString(),
  };
  if (id) campanha.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertCampanha(campanha);
    if (error) { app.toast('Erro ao guardar: ' + app.fmtErr(error), 'error'); return; }
    if (id) {
      _campState.items = _campState.items.map(c => String(c.id) === String(id) ? { ...c, ...campanha } : c);
    } else {
      _campState.items = [saved || { id: Date.now(), ...campanha }, ..._campState.items];
    }
  }

  app.toast('Campanha guardada!', 'success');
  app.closeModal();
  _campFilter();
}

async function deleteCampanha(id) {
  if (!confirm('Apagar esta campanha?')) return;
  if (DB.ready()) {
    const { error } = await DB.deleteCampanha(id);
    if (error) { app.toast('Erro: ' + (error.message || error), 'error'); return; }
  }
  _campState.items = _campState.items.filter(c => String(c.id) !== String(id));
  app.toast('Campanha apagada', 'success');
  _campFilter();
}

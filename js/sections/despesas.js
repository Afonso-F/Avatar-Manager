/* ============================================================
   sections/despesas.js — Gestão de Despesas
   ============================================================ */

async function renderDespesas(container) {
  // Carregar despesas da BD
  let despesas = [];
  if (DB.ready()) {
    const { data } = await DB.getDespesas();
    despesas = data || [];
  }

  // Calcular totais por categoria
  const categColors = {
    producao:    'var(--accent)',
    ads:         'var(--yellow)',
    software:    'var(--blue, #4f8ef7)',
    equipamento: 'var(--pink)',
    outro:       'var(--text-muted)',
  };
  const categLabels = {
    producao: 'Produção', ads: 'Publicidade', software: 'Software',
    equipamento: 'Equipamento', outro: 'Outro',
  };

  const totalGeral = despesas.reduce((s, d) => s + parseFloat(d.valor || 0), 0);

  const porCategoria = {};
  for (const d of despesas) {
    const cat = d.categoria || 'outro';
    porCategoria[cat] = (porCategoria[cat] || 0) + parseFloat(d.valor || 0);
  }

  // Agrupar por mês
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7);
  const despesasMes = despesas.filter(d => d.data && d.data.startsWith(mesAtual));
  const totalMes = despesasMes.reduce((s, d) => s + parseFloat(d.valor || 0), 0);

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Despesas</div>
        <div class="section-subtitle">Controlo de gastos — ${hoje.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</div>
      </div>
      <div class="flex gap-1">
        <button class="btn btn-secondary" onclick="exportDespesasCsv()">
          <i class="fa-solid fa-file-csv"></i> Exportar CSV
        </button>
        <button class="btn btn-primary" onclick="openDespesaFormPage()">
          <i class="fa-solid fa-plus"></i> Adicionar
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div class="grid-3 mb-3">
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Total este mês</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--red)">€${totalMes.toFixed(2)}</div>
        <div class="text-muted text-sm">${despesasMes.length} despesa${despesasMes.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Total histórico</div>
        <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary)">€${totalGeral.toFixed(2)}</div>
        <div class="text-muted text-sm">${despesas.length} despesa${despesas.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="card" style="text-align:center">
        <div class="text-muted text-sm mb-1">Categoria mais cara</div>
        ${Object.keys(porCategoria).length ? (() => {
          const topCat = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0];
          return `<div style="font-size:1.8rem;font-weight:800;color:${categColors[topCat[0]] || 'var(--accent)'}">€${topCat[1].toFixed(2)}</div>
                  <div class="text-muted text-sm">${categLabels[topCat[0]] || topCat[0]}</div>`;
        })() : '<div class="text-muted text-sm" style="margin-top:8px">—</div>'}
      </div>
    </div>

    <!-- Distribuição por categoria -->
    ${Object.keys(porCategoria).length ? `
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title"><i class="fa-solid fa-chart-pie" style="color:var(--accent)"></i> Por categoria</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${Object.entries(porCategoria)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, val]) => {
            const pct = totalGeral > 0 ? Math.round((val / totalGeral) * 100) : 0;
            return `
              <div>
                <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                  <span class="text-sm" style="color:${categColors[cat] || 'var(--text-muted)'}">${categLabels[cat] || cat}</span>
                  <span class="text-sm" style="font-weight:700">€${val.toFixed(2)} <span style="color:var(--text-muted)">(${pct}%)</span></span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${pct}%;background:${categColors[cat] || 'var(--text-muted)'}"></div>
                </div>
              </div>`;
          }).join('')}
      </div>
    </div>` : ''}

    <!-- Lista de despesas -->
    <div class="card" id="despesas-page-card">
      <div class="card-header">
        <div class="card-title"><i class="fa-solid fa-receipt" style="color:var(--red)"></i> Lista de despesas</div>
        <div class="flex gap-1">
          <select class="form-control" style="width:auto;font-size:.8rem" id="desp-filter-cat" onchange="filterDespesasPage()">
            <option value="">Todas as categorias</option>
            ${Object.entries(categLabels).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <select class="form-control" style="width:auto;font-size:.8rem" id="desp-filter-mes" onchange="filterDespesasPage()">
            <option value="">Todos os meses</option>
            ${[...new Set(despesas.map(d => d.data?.slice(0, 7)).filter(Boolean))].sort().reverse()
              .map(m => `<option value="${m}" ${m === mesAtual ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="despesas-page-list"></div>
    </div>`;

  // Guardar cache e renderizar lista
  window._despesasPageCache = despesas;
  filterDespesasPage();
}

function filterDespesasPage() {
  const catFilter = document.getElementById('desp-filter-cat')?.value || '';
  const mesFilter = document.getElementById('desp-filter-mes')?.value || '';
  const all       = window._despesasPageCache || [];

  const filtered = all.filter(d => {
    if (catFilter && d.categoria !== catFilter) return false;
    if (mesFilter && !(d.data || '').startsWith(mesFilter)) return false;
    return true;
  });

  renderDespesasPageList(filtered);
}

function renderDespesasPageList(despesas) {
  const el = document.getElementById('despesas-page-list');
  if (!el) return;

  const categColors = {
    producao: 'var(--accent)', ads: 'var(--yellow)', software: 'var(--blue, #4f8ef7)',
    equipamento: 'var(--pink)', outro: 'var(--text-muted)',
  };
  const total = despesas.reduce((s, d) => s + parseFloat(d.valor || 0), 0);

  if (!despesas.length) {
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>Sem despesas neste período</p>
      <button class="btn btn-primary btn-sm" onclick="openDespesaFormPage()"><i class="fa-solid fa-plus"></i> Adicionar despesa</button></div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${despesas.map(d => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--bg-elevated);border-radius:8px">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="badge" style="background:${categColors[d.categoria]||'var(--text-muted)'}20;color:${categColors[d.categoria]||'var(--text-muted)'}">
              ${d.categoria || 'outro'}
            </span>
            <div>
              <div style="font-size:.88rem;font-weight:600">${d.descricao}</div>
              <div style="font-size:.75rem;color:var(--text-muted)">${d.data || ''}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-weight:700;color:var(--red)">-€${parseFloat(d.valor).toFixed(2)}</span>
            <button class="btn btn-sm btn-secondary btn-icon" onclick="editDespesaPage('${d.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="deleteDespesaPage('${d.id}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`).join('')}
      <div style="border-top:1px solid var(--border);padding-top:10px;display:flex;justify-content:space-between;align-items:center">
        <span class="text-sm text-muted">${despesas.length} despesa${despesas.length !== 1 ? 's' : ''} no filtro atual</span>
        <span style="font-weight:700;color:var(--red)">Total: -€${total.toFixed(2)}</span>
      </div>
    </div>`;
}

function openDespesaFormPage(existing) {
  const body = `
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input id="desp-desc" class="form-control" value="${existing?.descricao || ''}" placeholder="Ex: Adobe CC, Meta Ads…">
      </div>
      <div class="form-group">
        <label class="form-label">Valor (€)</label>
        <input id="desp-valor" class="form-control" type="number" min="0" step="0.01" value="${existing?.valor || ''}">
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Categoria</label>
        <select id="desp-cat" class="form-control">
          ${['producao','ads','software','equipamento','outro'].map(c =>
            `<option value="${c}" ${(existing?.categoria || 'outro') === c ? 'selected' : ''}>${c}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-group mb-0">
        <label class="form-label">Data</label>
        <input id="desp-data" class="form-control" type="date" value="${existing?.data || new Date().toISOString().slice(0,10)}">
      </div>
    </div>`;
  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveDespesaPage('${existing?.id || ''}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;
  app.openModal(existing ? 'Editar despesa' : 'Adicionar despesa', body, footer);
  setTimeout(() => document.getElementById('desp-desc')?.focus(), 100);
}

function editDespesaPage(id) {
  const d = (window._despesasPageCache || []).find(x => String(x.id) === String(id));
  if (d) openDespesaFormPage(d);
}

async function saveDespesaPage(id) {
  const descricao = document.getElementById('desp-desc')?.value.trim();
  const valor     = parseFloat(document.getElementById('desp-valor')?.value || '0');
  const categoria = document.getElementById('desp-cat')?.value || 'outro';
  const data      = document.getElementById('desp-data')?.value;

  if (!descricao) { app.toast('Adiciona uma descrição', 'warning'); return; }
  if (isNaN(valor) || valor <= 0) { app.toast('Valor inválido', 'warning'); return; }

  const despesa = { descricao, valor, categoria, data };
  if (id) despesa.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertDespesa(despesa);
    if (error) { app.toast('Erro ao guardar: ' + app.fmtErr(error), 'error'); return; }
    if (id) {
      window._despesasPageCache = (window._despesasPageCache || []).map(d => String(d.id) === String(id) ? { ...d, ...despesa } : d);
    } else {
      window._despesasPageCache = [saved || { id: Date.now(), ...despesa }, ...(window._despesasPageCache || [])];
    }
  }

  app.toast('Despesa guardada!', 'success');
  app.closeModal();
  filterDespesasPage();
}

async function deleteDespesaPage(id) {
  if (!confirm('Apagar esta despesa?')) return;
  if (DB.ready()) {
    const { error } = await DB.deleteDespesa(id);
    if (error) { app.toast('Erro: ' + error, 'error'); return; }
  }
  window._despesasPageCache = (window._despesasPageCache || []).filter(d => String(d.id) !== String(id));
  app.toast('Despesa apagada', 'success');
  filterDespesasPage();
}

function exportDespesasCsv() {
  const despesas = window._despesasPageCache || [];
  if (!despesas.length) { app.toast('Sem despesas para exportar', 'warning'); return; }

  const header = 'Data,Descrição,Categoria,Valor (€)\n';
  const rows   = despesas.map(d =>
    `${d.data || ''},"${(d.descricao || '').replace(/"/g, '""')}",${d.categoria || 'outro'},${parseFloat(d.valor).toFixed(2)}`
  ).join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href  = URL.createObjectURL(blob);
  link.download = `despesas_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  app.toast('CSV exportado!', 'success');
}

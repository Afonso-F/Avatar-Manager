/* ============================================================
   sections/pagamentos.js — Stripe Connect Payouts
   Withdraw revenue from avatars / YouTube channels to bank accounts.
   ============================================================ */

async function renderPagamentos(container) {
  if (!Config.get('STRIPE_SECRET')) {
    container.innerHTML = `
      <div class="section-header">
        <div>
          <div class="section-title">Pagamentos</div>
          <div class="section-subtitle">Levantamentos para conta bancária via Stripe Connect</div>
        </div>
      </div>
      <div class="empty-state">
        <i class="fa-brands fa-stripe" style="font-size:2.5rem;color:var(--accent);margin-bottom:12px"></i>
        <div class="empty-title">Stripe não configurado</div>
        <div class="empty-desc">Adiciona a tua <strong>Stripe Secret Key</strong> nas <a href="#configuracoes" onclick="app.navigate('configuracoes')" style="color:var(--accent)">Configurações</a> para activar levantamentos.</div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Pagamentos</div>
        <div class="section-subtitle">Levantamentos para conta bancária via Stripe Connect</div>
      </div>
      <button class="btn btn-primary" onclick="_pagamentos.novaContaBancaria()">
        <i class="fa-solid fa-plus"></i> Nova Conta Bancária
      </button>
    </div>

    <!-- Stripe balance card -->
    <div id="pagamentos-balance" class="stats-grid mb-3" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
      <div class="stat-card">
        <div class="stat-label"><i class="fa-brands fa-stripe"></i> A carregar saldo…</div>
        <div class="stat-value">—</div>
      </div>
    </div>

    <!-- Tabs: Avatares / Canais YouTube -->
    <div class="tab-bar" style="margin-bottom:16px">
      <button class="tab-btn active" data-tab="avatares" onclick="_pagamentos.switchTab('avatares',this)">
        <i class="fa-solid fa-masks-theater"></i> Avatares
      </button>
      <button class="tab-btn" data-tab="youtube" onclick="_pagamentos.switchTab('youtube',this)">
        <i class="fa-solid fa-video"></i> Canais YouTube
      </button>
    </div>

    <div id="pagamentos-tab-content"></div>
  `;

  // Load balance and first tab
  _pagamentos.loadBalance();
  _pagamentos.loadTab('avatares');
}

/* ── Internal module ── */
const _pagamentos = (() => {
  let _currentTab = 'avatares';

  /* ── Balance ── */
  async function loadBalance() {
    const el = document.getElementById('pagamentos-balance');
    if (!el) return;
    try {
      const balance = await Stripe.getBalance();
      const available = (balance.available || []).reduce((s, b) => {
        s[b.currency] = (s[b.currency] || 0) + b.amount;
        return s;
      }, {});
      const pending = (balance.pending || []).reduce((s, b) => {
        s[b.currency] = (s[b.currency] || 0) + b.amount;
        return s;
      }, {});

      const fmt = (amountCents, cur) =>
        (amountCents / 100).toLocaleString('pt-PT', { style: 'currency', currency: cur.toUpperCase() });

      const currencies = [...new Set([...Object.keys(available), ...Object.keys(pending)])];
      if (!currencies.length) currencies.push('eur');

      el.innerHTML = currencies.map(cur => `
        <div class="stat-card">
          <div class="stat-label"><i class="fa-brands fa-stripe"></i> Disponível (${cur.toUpperCase()})</div>
          <div class="stat-value" style="color:var(--green)">${fmt(available[cur] || 0, cur)}</div>
          <div class="text-sm text-muted">Pendente: ${fmt(pending[cur] || 0, cur)}</div>
        </div>`).join('');
    } catch (e) {
      el.innerHTML = `<div class="stat-card"><div class="stat-label" style="color:var(--red)"><i class="fa-solid fa-circle-xmark"></i> Erro Stripe: ${e.message}</div></div>`;
    }
  }

  /* ── Tabs ── */
  function switchTab(tab, btn) {
    _currentTab = tab;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadTab(tab);
  }

  async function loadTab(tab) {
    const el = document.getElementById('pagamentos-tab-content');
    if (!el) return;
    el.innerHTML = '<div class="spinner" style="margin:32px auto"></div>';

    if (tab === 'avatares') {
      const { data: avatares } = await DB.getAvatares();
      renderEntityList(el, avatares || [], 'avatar');
    } else {
      const { data: canais } = await DB.getYoutubeChannels();
      renderEntityList(el, canais || [], 'youtube');
    }
  }

  /* ── Entity list (avatares or youtube channels) ── */
  function renderEntityList(el, items, tipo) {
    if (!items.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-title">Sem ${tipo === 'avatar' ? 'avatares' : 'canais'}</div></div>`;
      return;
    }

    el.innerHTML = items.map(item => {
      const id = item.id;
      const nome = item.nome || '—';
      return `
        <div class="card mb-2" id="entity-card-${id}">
          <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer"
               onclick="_pagamentos.toggleEntity('${id}','${tipo}')">
            <div style="display:flex;align-items:center;gap:10px">
              <i class="fa-solid fa-${tipo === 'avatar' ? 'masks-theater' : 'video'}" style="color:var(--accent)"></i>
              <strong>${escHtml(nome)}</strong>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();_pagamentos.openLevantar('${id}','${tipo}','${escHtml(nome)}')">
                <i class="fa-solid fa-money-bill-transfer"></i> Levantar
              </button>
              <i class="fa-solid fa-chevron-down text-muted" id="chevron-${id}"></i>
            </div>
          </div>
          <div id="entity-detail-${id}" style="display:none;padding:16px 20px;border-top:1px solid var(--border)">
            <div class="spinner" style="margin:16px auto"></div>
          </div>
        </div>`;
    }).join('');
  }

  async function toggleEntity(id, tipo) {
    const detail = document.getElementById(`entity-detail-${id}`);
    const chevron = document.getElementById(`chevron-${id}`);
    if (!detail) return;

    if (detail.style.display !== 'none') {
      detail.style.display = 'none';
      if (chevron) chevron.className = 'fa-solid fa-chevron-down text-muted';
      return;
    }

    detail.style.display = 'block';
    if (chevron) chevron.className = 'fa-solid fa-chevron-up text-muted';

    const filter = tipo === 'avatar' ? { avatar_id: id } : { youtube_channel_id: id };
    const [{ data: contas }, { data: levantamentos }] = await Promise.all([
      DB.getContasBancarias(filter),
      DB.getLevantamentos({ ...filter, limit: 10 }),
    ]);

    detail.innerHTML = _renderEntityDetail(id, tipo, contas || [], levantamentos || []);
  }

  function _renderEntityDetail(entityId, tipo, contas, levantamentos) {
    const contasHtml = contas.length
      ? contas.map(c => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-muted)">
            <div>
              <div style="font-weight:600">${escHtml(c.titular)}</div>
              <div class="text-sm text-muted">${escHtml(c.banco || '')} · IBAN: ${escHtml(c.iban || '').replace(/(.{4})/g,'$1 ').trim()}</div>
              ${c.stripe_external_account_id ? `<div class="text-sm" style="color:var(--green)"><i class="fa-solid fa-circle-check"></i> Stripe: ${escHtml(c.stripe_external_account_id)}</div>` : ''}
            </div>
            <button class="btn btn-sm btn-danger" onclick="_pagamentos.deleteContaBancaria('${c.id}','${entityId}','${tipo}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>`).join('')
      : '<div class="text-sm text-muted">Sem contas bancárias registadas.</div>';

    const levHtml = levantamentos.length
      ? `<table class="data-table" style="margin-top:12px">
           <thead><tr><th>Data</th><th>Montante</th><th>Estado</th><th>Descrição</th></tr></thead>
           <tbody>
             ${levantamentos.map(l => `
               <tr>
                 <td>${l.criado_em ? new Date(l.criado_em).toLocaleDateString('pt-PT') : '—'}</td>
                 <td>${(l.montante/100).toLocaleString('pt-PT',{style:'currency',currency:(l.moeda||'eur').toUpperCase()})}</td>
                 <td><span class="badge badge-${_statusColor(l.status)}">${l.status}</span></td>
                 <td class="text-muted">${escHtml(l.descricao || '')}</td>
               </tr>`).join('')}
           </tbody>
         </table>`
      : '<div class="text-sm text-muted" style="margin-top:8px">Sem levantamentos registados.</div>';

    return `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <strong style="font-size:.9rem">Contas Bancárias</strong>
          <button class="btn btn-sm btn-secondary" onclick="_pagamentos.addContaBancaria('${entityId}','${tipo}')">
            <i class="fa-solid fa-plus"></i> Adicionar
          </button>
        </div>
        ${contasHtml}
        <div style="margin-top:16px">
          <strong style="font-size:.9rem">Últimos Levantamentos</strong>
          ${levHtml}
        </div>
      </div>`;
  }

  function _statusColor(status) {
    const map = { paid: 'green', pending: 'yellow', failed: 'red', in_transit: 'blue', canceled: 'muted' };
    return map[status] || 'muted';
  }

  /* ── Nova Conta Bancária (modal) ── */
  function novaContaBancaria() {
    // Generic: pick entity first
    app.openModal('Nova Conta Bancária', `
      <p class="text-sm text-muted mb-3">Selecciona a quem pertence esta conta bancária:</p>
      <div id="nb-entity-picker">
        <div class="spinner" style="margin:16px auto"></div>
      </div>`, []);
    _loadEntityPicker();
  }

  async function _loadEntityPicker() {
    const el = document.getElementById('nb-entity-picker');
    if (!el) return;
    const [{ data: avatares }, { data: canais }] = await Promise.all([
      DB.getAvatares(), DB.getYoutubeChannels(),
    ]);

    el.innerHTML = `
      <div class="form-group">
        <label class="form-label">Tipo</label>
        <select id="nb-tipo" class="form-control" onchange="_pagamentos._onNbTipoChange()">
          <option value="avatar">Avatar</option>
          <option value="youtube">Canal YouTube</option>
        </select>
      </div>
      <div class="form-group" id="nb-entity-group">
        <label class="form-label">Avatar</label>
        <select id="nb-entity-id" class="form-control">
          ${(avatares||[]).map(a => `<option value="${a.id}">${escHtml(a.nome)}</option>`).join('')}
        </select>
      </div>
      ${_contaFormFields()}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="_pagamentos._saveNovaConta()">
          <i class="fa-solid fa-floppy-disk"></i> Guardar
        </button>
      </div>`;

    // Store references for picker change
    el._avatares = avatares || [];
    el._canais   = canais || [];
  }

  function _onNbTipoChange() {
    const tipo   = document.getElementById('nb-tipo')?.value;
    const picker = document.getElementById('nb-entity-picker');
    const group  = document.getElementById('nb-entity-group');
    if (!group || !picker) return;
    const items = tipo === 'avatar' ? (picker._avatares || []) : (picker._canais || []);
    group.querySelector('label').textContent = tipo === 'avatar' ? 'Avatar' : 'Canal YouTube';
    document.getElementById('nb-entity-id').innerHTML =
      items.map(i => `<option value="${i.id}">${escHtml(i.nome)}</option>`).join('');
  }

  function _contaFormFields() {
    return `
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Titular da Conta *</label>
          <input id="nb-titular" class="form-control" placeholder="Nome completo">
        </div>
        <div class="form-group">
          <label class="form-label">Banco</label>
          <input id="nb-banco" class="form-control" placeholder="ex: Millennium BCP">
        </div>
        <div class="form-group">
          <label class="form-label">IBAN *</label>
          <input id="nb-iban" class="form-control" placeholder="PT50 0000 0000 0000 0000 0000 0">
        </div>
        <div class="form-group">
          <label class="form-label">BIC / SWIFT</label>
          <input id="nb-bic" class="form-control" placeholder="ex: BCOMPTPL">
        </div>
        <div class="form-group">
          <label class="form-label">País</label>
          <input id="nb-country" class="form-control" value="PT" placeholder="PT">
        </div>
        <div class="form-group">
          <label class="form-label">Moeda</label>
          <select id="nb-currency" class="form-control">
            <option value="eur">EUR</option>
            <option value="usd">USD</option>
            <option value="gbp">GBP</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Stripe Connect Account ID <span class="text-muted text-sm">(opcional — acct_xxx)</span></label>
        <input id="nb-stripe-acct" class="form-control" placeholder="acct_1A2B3C4D…">
        <div class="form-hint">Deixa em branco se não usas Stripe Connect por avatar.</div>
      </div>`;
  }

  async function _saveNovaConta() {
    const tipo      = document.getElementById('nb-tipo')?.value || 'avatar';
    const entityId  = document.getElementById('nb-entity-id')?.value;
    const titular   = document.getElementById('nb-titular')?.value.trim();
    const banco     = document.getElementById('nb-banco')?.value.trim();
    const iban      = document.getElementById('nb-iban')?.value.replace(/\s/g,'').toUpperCase();
    const bic       = document.getElementById('nb-bic')?.value.trim();
    const country   = document.getElementById('nb-country')?.value.trim() || 'PT';
    const currency  = document.getElementById('nb-currency')?.value || 'eur';
    const stripeAcct = document.getElementById('nb-stripe-acct')?.value.trim();

    if (!titular || !iban) { app.toast('Titular e IBAN são obrigatórios', 'warning'); return; }

    const conta = {
      titular, banco, iban, bic, country, currency,
      stripe_account_id:           stripeAcct || null,
      stripe_external_account_id:  null,
    };
    if (tipo === 'avatar') conta.avatar_id = entityId;
    else                   conta.youtube_channel_id = entityId;

    const { error } = await DB.upsertContaBancaria(conta);
    if (error) { app.toast('Erro ao guardar: ' + (error.message || error), 'error'); return; }

    app.closeModal();
    app.toast('Conta bancária guardada!', 'success');
    loadTab(_currentTab);
  }

  /* ── Add conta from inside entity detail ── */
  function addContaBancaria(entityId, tipo) {
    app.openModal('Adicionar Conta Bancária', `
      ${_contaFormFields()}
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
        <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="_pagamentos._saveContaForEntity('${entityId}','${tipo}')">
          <i class="fa-solid fa-floppy-disk"></i> Guardar
        </button>
      </div>`, []);
  }

  async function _saveContaForEntity(entityId, tipo) {
    const titular   = document.getElementById('nb-titular')?.value.trim();
    const banco     = document.getElementById('nb-banco')?.value.trim();
    const iban      = document.getElementById('nb-iban')?.value.replace(/\s/g,'').toUpperCase();
    const bic       = document.getElementById('nb-bic')?.value.trim();
    const country   = document.getElementById('nb-country')?.value.trim() || 'PT';
    const currency  = document.getElementById('nb-currency')?.value || 'eur';
    const stripeAcct = document.getElementById('nb-stripe-acct')?.value.trim();

    if (!titular || !iban) { app.toast('Titular e IBAN são obrigatórios', 'warning'); return; }

    const conta = {
      titular, banco, iban, bic, country, currency,
      stripe_account_id:           stripeAcct || null,
      stripe_external_account_id:  null,
    };
    if (tipo === 'avatar') conta.avatar_id = entityId;
    else                   conta.youtube_channel_id = entityId;

    const { error } = await DB.upsertContaBancaria(conta);
    if (error) { app.toast('Erro: ' + (error.message || error), 'error'); return; }

    app.closeModal();
    app.toast('Conta guardada!', 'success');
    // Refresh the detail panel
    await toggleEntity(entityId, tipo); // close
    await toggleEntity(entityId, tipo); // reopen with fresh data
  }

  async function deleteContaBancaria(contaId, entityId, tipo) {
    if (!confirm('Apagar esta conta bancária?')) return;
    const { error } = await DB.deleteContaBancaria(contaId);
    if (error) { app.toast('Erro: ' + (error.message || error), 'error'); return; }
    app.toast('Conta removida', 'success');
    await toggleEntity(entityId, tipo);
    await toggleEntity(entityId, tipo);
  }

  /* ── Levantar (Payout) modal ── */
  async function openLevantar(entityId, tipo, nome) {
    // Load bank accounts for this entity
    const filter = tipo === 'avatar' ? { avatar_id: entityId } : { youtube_channel_id: entityId };
    const { data: contas } = await DB.getContasBancarias(filter);

    if (!contas || !contas.length) {
      app.toast('Adiciona primeiro uma conta bancária a este ' + (tipo === 'avatar' ? 'avatar' : 'canal'), 'warning');
      return;
    }

    app.openModal(`Levantar — ${escHtml(nome)}`, `
      <div class="form-group">
        <label class="form-label">Conta Bancária Destino</label>
        <select id="lev-conta" class="form-control">
          ${contas.map(c => `<option value="${c.id}" data-stripe-acct="${c.stripe_account_id||''}" data-currency="${c.currency||'eur'}">
            ${escHtml(c.titular)} — ${escHtml(c.banco||'')} (${(c.currency||'eur').toUpperCase()})
          </option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Montante (€)</label>
        <input id="lev-montante" class="form-control" type="number" min="1" step="0.01" placeholder="ex: 250.00">
      </div>
      <div class="form-group">
        <label class="form-label">Descrição</label>
        <input id="lev-descricao" class="form-control" placeholder="ex: Receita Fansly Fevereiro 2026" value="ContentHub payout ${new Date().toISOString().slice(0,7)}">
      </div>
      <div class="form-group">
        <label class="form-label">Stripe Account ID <span class="text-muted text-sm">(acct_xxx)</span></label>
        <input id="lev-stripe-acct" class="form-control" placeholder="acct_1A2B3C4D…">
        <div class="form-hint">Requerido para fazer o payout via Stripe Connect. Deixa em branco para registar apenas localmente.</div>
      </div>
      <div id="lev-error" style="color:var(--red);font-size:.85rem;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
        <button class="btn btn-primary" id="lev-btn" onclick="_pagamentos._submitLevantar('${entityId}','${tipo}')">
          <i class="fa-solid fa-money-bill-transfer"></i> Levantar
        </button>
      </div>`, []);

    // Pre-fill stripe account id from selected conta
    document.getElementById('lev-conta')?.addEventListener('change', function () {
      const opt = this.options[this.selectedIndex];
      document.getElementById('lev-stripe-acct').value = opt.dataset.stripeAcct || '';
    });
    const firstOpt = document.getElementById('lev-conta')?.options[0];
    if (firstOpt) document.getElementById('lev-stripe-acct').value = firstOpt.dataset.stripeAcct || '';
  }

  async function _submitLevantar(entityId, tipo) {
    const contaId    = document.getElementById('lev-conta')?.value;
    const montanteEur = parseFloat(document.getElementById('lev-montante')?.value);
    const descricao  = document.getElementById('lev-descricao')?.value.trim();
    const stripeAcct = document.getElementById('lev-stripe-acct')?.value.trim();
    const errEl      = document.getElementById('lev-error');
    const btn        = document.getElementById('lev-btn');

    if (!montanteEur || montanteEur <= 0) { errEl.textContent = 'Introduz um montante válido.'; errEl.style.display='block'; return; }
    errEl.style.display = 'none';

    // Determine currency from selected conta option
    const contaSelect = document.getElementById('lev-conta');
    const currency = contaSelect?.options[contaSelect.selectedIndex]?.dataset.currency || 'eur';
    const montanteCents = Math.round(montanteEur * 100);

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></div> A processar…';

    let stripePayoutId = null;
    let status = 'pending';

    try {
      if (stripeAcct) {
        const payout = await Stripe.createPayout(stripeAcct, montanteCents, currency, descricao);
        stripePayoutId = payout.id;
        status = payout.status || 'pending';
      }

      // Save to DB
      const lev = {
        conta_bancaria_id:  contaId,
        montante:           montanteCents,
        moeda:              currency,
        status,
        stripe_payout_id:   stripePayoutId,
        descricao:          descricao || null,
      };
      if (tipo === 'avatar') lev.avatar_id = entityId;
      else                   lev.youtube_channel_id = entityId;

      const { error } = await DB.upsertLevantamento(lev);
      if (error) throw new Error(error.message || JSON.stringify(error));

      app.closeModal();
      app.toast(stripePayoutId ? 'Levantamento Stripe iniciado!' : 'Levantamento registado!', 'success');
      loadBalance();
      loadTab(_currentTab);
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-money-bill-transfer"></i> Levantar';
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
  }

  return {
    loadBalance,
    switchTab,
    loadTab,
    toggleEntity,
    novaContaBancaria,
    addContaBancaria,
    deleteContaBancaria,
    openLevantar,
    _onNbTipoChange,
    _saveNovaConta,
    _saveContaForEntity,
    _submitLevantar,
  };
})();

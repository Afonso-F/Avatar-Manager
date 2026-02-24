/* ============================================================
   sections/avatares.js
   ============================================================ */
async function renderAvatares(container) {
  let avatares = [];

  if (DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
  }

  app.setAvatares(avatares);
  const activeId = Config.get('ACTIVE_AVATAR') || avatares[0]?.id;

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Avatares</div>
        <div class="section-subtitle">Gerencie os seus criadores de conteúdo</div>
      </div>
      <button class="btn btn-primary" onclick="openAvatarModal(null)">
        <i class="fa-solid fa-plus"></i> Novo avatar
      </button>
    </div>

    <div class="grid-auto" id="avatarGrid">
      ${avatares.length
        ? avatares.map(a => renderAvatarCard(a, String(a.id) === String(activeId))).join('')
        : `<div class="empty-state" style="grid-column:1/-1;padding:60px 20px">
             <i class="fa-solid fa-masks-theater" style="font-size:2.5rem;color:var(--border);margin-bottom:12px"></i>
             <p style="font-size:1.1rem;font-weight:600;margin-bottom:6px">Sem avatares criados</p>
             <p class="text-muted" style="margin-bottom:20px">Cria o teu primeiro avatar para começar a agendar posts</p>
             <button class="btn btn-primary" onclick="openAvatarModal(null)"><i class="fa-solid fa-plus"></i> Criar primeiro avatar</button>
           </div>`
      }
    </div>
  `;
}

function renderAvatarCard(a, isActive) {
  const platforms = (a.plataformas || []).map(p =>
    `<span class="platform-toggle active ${p}" style="cursor:default">${app.platformIcon(p)} ${p}</span>`
  ).join('');

  return `
    <div class="avatar-card${isActive ? ' active-avatar' : ''}" id="ac-${a.id}">
      ${isActive ? '<div class="avatar-active-badge" title="Avatar ativo"></div>' : ''}
      <div class="flex items-center gap-2">
        <div class="avatar-img">
          ${a.imagem_url ? `<img src="${a.imagem_url}" alt="${a.nome}">` : `<span>${a.emoji || '🎭'}</span>`}
        </div>
        <div>
          <div class="avatar-name">${a.nome}</div>
          <div class="avatar-niche">${a.nicho}</div>
        </div>
      </div>

      <div class="avatar-meta platform-toggles">
        ${platforms}
      </div>

      ${a.prompt_base ? `<div class="text-sm text-muted" style="line-height:1.5;font-style:italic">"${a.prompt_base}"</div>` : ''}

      <div class="flex gap-1 mt-1">
        ${!isActive ? `<button class="btn btn-sm btn-secondary flex-1" onclick="setActiveAvatar('${a.id}')"><i class="fa-solid fa-star"></i> Ativar</button>` : '<span class="btn btn-sm btn-secondary flex-1 text-center" style="cursor:default;opacity:.5"><i class="fa-solid fa-star"></i> Ativo</span>'}
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openContasModal('${a.id}','${a.nome}')" title="Contas sociais"><i class="fa-solid fa-link"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openAvatarModal('${a.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="confirmDeleteAvatar('${a.id}', this.dataset.nome)" data-nome="${(a.nome || '').replace(/"/g, '&quot;')}" title="Apagar"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}

function setActiveAvatar(id) {
  Config.set('ACTIVE_AVATAR', id);
  // Re-render
  const avatares = app.getAvatares();
  const grid = document.getElementById('avatarGrid');
  if (grid) grid.innerHTML = avatares.map(a => renderAvatarCard(a, String(a.id) === String(id))).join('');
  app.toast('Avatar ativo alterado!', 'success');
}

function openAvatarModal(id) {
  const avatares = app.getAvatares();
  const a = id ? avatares.find(x => String(x.id) === String(id)) : null;
  const isNew = !a;

  const body = `
    <div class="form-group">
      <label class="form-label">Nome *</label>
      <input id="av-nome" class="form-control" value="${a?.nome || ''}" placeholder="Ex: Luna">
    </div>
    <div class="form-group">
      <label class="form-label">Nicho *</label>
      <input id="av-nicho" class="form-control" value="${a?.nicho || ''}" placeholder="Ex: Lifestyle & Wellness">
    </div>
    <div class="form-group">
      <label class="form-label">Emoji / Ícone</label>
      <input id="av-emoji" class="form-control" value="${a?.emoji || '🎭'}" placeholder="🎭" maxlength="4">
    </div>
    <div class="form-group">
      <label class="form-label">Prompt base (personalidade para o Gemini)</label>
      <textarea id="av-prompt" class="form-control" rows="3" placeholder="Descreve o estilo, tom e personalidade do avatar…">${a?.prompt_base || ''}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Plataformas</label>
      <div class="platform-toggles" id="av-platforms">
        ${['instagram','tiktok','facebook','youtube'].map(p => {
          const active = (a?.plataformas || []).includes(p);
          return `<div class="platform-toggle${active ? ' active ' + p : ''}" data-p="${p}" onclick="togglePlatformModal(this)">${app.platformIcon(p)} ${p}</div>`;
        }).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">URL da imagem (opcional)</label>
      <input id="av-img" class="form-control" value="${a?.imagem_url || ''}" placeholder="https://…">
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveAvatar('${id || ''}')">
      <i class="fa-solid fa-floppy-disk"></i> ${isNew ? 'Criar' : 'Guardar'}
    </button>`;

  app.openModal(isNew ? 'Novo avatar' : `Editar — ${a.nome}`, body, footer);
}

function togglePlatformModal(el) {
  const p = el.dataset.p;
  el.classList.toggle('active');
  el.classList.toggle(p);
}

async function saveAvatar(id) {
  const nome     = document.getElementById('av-nome').value.trim();
  const nicho    = document.getElementById('av-nicho').value.trim();
  const emoji    = document.getElementById('av-emoji').value.trim();
  const prompt   = document.getElementById('av-prompt').value.trim();
  const imgUrl   = document.getElementById('av-img').value.trim();
  const platforms = [...document.querySelectorAll('#av-platforms .platform-toggle.active')].map(el => el.dataset.p);

  if (!nome || !nicho) { app.toast('Nome e nicho são obrigatórios', 'error'); return; }

  const avatar = { nome, nicho, emoji, prompt_base: prompt, plataformas: platforms, imagem_url: imgUrl };
  if (id) avatar.id = id;

  if (DB.ready()) {
    const { error } = await DB.upsertAvatar(avatar);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  } else {
    // Local
    const list = app.getAvatares();
    if (id) {
      const idx = list.findIndex(x => String(x.id) === String(id));
      if (idx >= 0) list[idx] = { ...list[idx], ...avatar };
    } else {
      avatar.id = Date.now().toString();
      list.push(avatar);
    }
    app.setAvatares(list);
  }

  app.toast(id ? 'Avatar atualizado!' : 'Avatar criado!', 'success');
  app.closeModal();
  renderAvatares(document.getElementById('content'));
}

function confirmDeleteAvatar(id, nome) {
  app.openModal(
    'Apagar avatar',
    `<p>Tens a certeza que queres apagar <strong>${nome}</strong>? Esta ação é irreversível.</p>`,
    `<button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
     <button class="btn btn-danger" onclick="deleteAvatarConfirmed('${id}')"><i class="fa-solid fa-trash"></i> Apagar</button>`
  );
}

async function deleteAvatarConfirmed(id) {
  if (DB.ready()) {
    const { error } = await DB.deleteAvatar(id);
    if (error) { app.toast('Erro ao apagar: ' + error, 'error'); return; }
  } else {
    const list = app.getAvatares().filter(a => String(a.id) !== String(id));
    app.setAvatares(list);
  }
  app.toast('Avatar apagado', 'success');
  app.closeModal();
  renderAvatares(document.getElementById('content'));
}

/* ── Contas de redes sociais ── */
const PLATAFORMAS_INFO = {
  instagram: { label: 'Instagram',  icon: 'fa-brands fa-instagram icon-instagram', placeholder_id: 'Ex: 17841400000000000', placeholder_user: 'Ex: @minha_conta' },
  tiktok:    { label: 'TikTok',     icon: 'fa-brands fa-tiktok icon-tiktok',       placeholder_id: 'Ex: 6784563210987654',   placeholder_user: 'Ex: @minha_conta' },
  facebook:  { label: 'Facebook',   icon: 'fa-brands fa-facebook icon-facebook',   placeholder_id: 'Ex: 123456789012345',    placeholder_user: 'Ex: Nome da Página' },
  youtube:   { label: 'YouTube',    icon: 'fa-brands fa-youtube icon-youtube',     placeholder_id: 'Ex: UCxxxxxxxxxxxxxx',   placeholder_user: 'Ex: @meucanal' },
};

async function openContasModal(avatarId, avatarNome) {
  if (!DB.ready()) { app.toast('Supabase necessário para gerir contas', 'warning'); return; }

  const { data: contas } = await DB.getContas(avatarId);
  const contasMap = {};
  (contas || []).forEach(c => { contasMap[c.plataforma] = c; });

  const body = `
    <p class="text-muted text-sm mb-3" style="line-height:1.5">
      Associa as contas de redes sociais a este avatar. Estas credenciais são usadas para publicar automaticamente.
    </p>
    <div style="display:flex;flex-direction:column;gap:16px" id="contas-list">
      ${Object.entries(PLATAFORMAS_INFO).map(([p, info]) => {
        const c = contasMap[p] || {};
        return `
          <div style="background:var(--bg-elevated);border-radius:10px;padding:14px" data-plataforma="${p}">
            <div class="flex items-center gap-2 mb-2" style="font-weight:600">
              <i class="${info.icon}"></i> ${info.label}
              ${c.id ? `<span class="badge badge-green" style="margin-left:auto">Configurado</span>` : `<span class="badge badge-muted" style="margin-left:auto">Não configurado</span>`}
            </div>
            <div class="grid-2" style="gap:8px">
              <div>
                <label class="form-label" style="font-size:.75rem">Username / Handle</label>
                <input class="form-control" data-field="username" value="${c.username || ''}" placeholder="${info.placeholder_user}">
              </div>
              <div>
                <label class="form-label" style="font-size:.75rem">ID da Conta</label>
                <input class="form-control" data-field="conta_id" value="${c.conta_id || ''}" placeholder="${info.placeholder_id}">
              </div>
            </div>
            <div class="mt-2">
              <label class="form-label" style="font-size:.75rem">Access Token</label>
              <div class="key-field">
                <input class="form-control" type="password" data-field="access_token" value="${c.access_token || ''}" placeholder="Token de acesso OAuth…">
                <button class="key-toggle" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password';this.innerHTML=this.previousElementSibling.type==='password'?'<i class=\\'fa-solid fa-eye\\'></i>':'<i class=\\'fa-solid fa-eye-slash\\'></i>'"><i class="fa-solid fa-eye"></i></button>
              </div>
            </div>
            <div class="mt-2">
              <label class="form-label" style="font-size:.75rem">Notas (opcional)</label>
              <input class="form-control" data-field="notas" value="${c.notas || ''}" placeholder="Ex: Conta principal, expira em Março…">
            </div>
            <input type="hidden" data-field="id" value="${c.id || ''}">
          </div>`;
      }).join('')}
    </div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>
    <button class="btn btn-primary" onclick="saveContas('${avatarId}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar contas
    </button>`;

  app.openModal(`Contas — ${avatarNome}`, body, footer);
}

async function saveContas(avatarId) {
  if (!DB.ready()) return;

  const blocos = document.querySelectorAll('#contas-list [data-plataforma]');
  let saved = 0, errors = 0;

  for (const bloco of blocos) {
    const plataforma = bloco.dataset.plataforma;
    const get = (field) => bloco.querySelector(`[data-field="${field}"]`)?.value.trim() || '';

    const username     = get('username');
    const conta_id     = get('conta_id');
    const access_token = get('access_token');
    const notas        = get('notas');
    const existingId   = get('id');

    // Só guarda se tiver pelo menos um campo preenchido
    if (!username && !conta_id && !access_token) continue;

    const payload = { avatar_id: avatarId, plataforma, username, conta_id, access_token, notas };
    if (existingId) payload.id = existingId;

    const { error } = await DB.upsertConta(payload);
    if (error) { errors++; console.error('Erro conta', plataforma, error); }
    else saved++;
  }

  if (errors) app.toast(`${errors} erro(s) ao guardar`, 'error');
  else if (saved) app.toast(`${saved} conta(s) guardada(s)!`, 'success');
  else app.toast('Nenhuma alteração para guardar', 'info');

  app.closeModal();
}

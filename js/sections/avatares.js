/* ============================================================
   sections/avatares.js
   ============================================================ */
const DEFAULT_AVATARES = [
  { id: 'luna',  nome: 'Luna',  nicho: 'Lifestyle & Wellness',  plataformas: ['instagram','tiktok'],         prompt_base: 'Criativa, positiva, inspira o bem-estar e autenticidade', emoji: '🌙' },
  { id: 'aria',  nome: 'Aria',  nicho: 'Tech & Productivity',   plataformas: ['instagram','youtube'],        prompt_base: 'Analítica, clara, simplifica tecnologia e produtividade',  emoji: '⚡' },
  { id: 'zara',  nome: 'Zara',  nicho: 'Fashion & Beauty',      plataformas: ['instagram','tiktok','facebook'], prompt_base: 'Elegante, trendy, apaixonada por moda sustentável',       emoji: '✨' },
  { id: 'nova',  nome: 'Nova',  nicho: 'Fitness & Nutrition',   plataformas: ['instagram','youtube'],        prompt_base: 'Energética, motivadora, foco em saúde real e sem filtros', emoji: '🔥' },
];

async function renderAvatares(container) {
  let avatares = [];

  if (DB.ready()) {
    const { data } = await DB.getAvatares();
    avatares = data || [];
  }

  // Seed defaults if empty
  if (!avatares.length) {
    avatares = DEFAULT_AVATARES;
    app.toast('A usar avatares locais — ligue o Supabase para persistir', 'info');
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
      ${avatares.map(a => renderAvatarCard(a, String(a.id) === String(activeId))).join('')}
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
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openAvatarModal('${a.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="confirmDeleteAvatar('${a.id}','${a.nome}')" title="Apagar"><i class="fa-solid fa-trash"></i></button>
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

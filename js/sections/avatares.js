/* ============================================================
   sections/avatares.js
   ============================================================ */

// Estado das imagens de referência no modal de avatar
let _refImagesState = []; // { url, isNew, dataUrl? }

// Todas as plataformas suportadas
const PLATAFORMAS_AVATAR = ['instagram','tiktok','facebook','youtube','fansly','onlyfans','patreon','twitch','spotify','vimeo','rumble','dailymotion'];

// Categorias/tags predefinidas
const CATEGORIAS_PRESET = ['SFW','NSFW','Anime','Cosplay','Realista','Lifestyle','Gaming','Music','Fitness','Art'];

// Escape simples para uso em atributos HTML
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
    `<span class="platform-toggle active ${p}" style="cursor:default">${app.platformIcon(p)} ${app.platformLabel(p)}</span>`
  ).join('');
  const refs     = a.imagens_referencia || [];
  const refCount = refs.length;
  const avatarSrc = refs[0] || a.imagem_url || null;

  // Profile URL
  const profileLink = a.profile_url
    ? `<a class="avatar-profile-link" href="${escHtml(a.profile_url)}" target="_blank" rel="noopener" title="Perfil público">
         <i class="fa-solid fa-arrow-up-right-from-square"></i> ${escHtml(a.profile_url.replace(/^https?:\/\//, ''))}
       </a>`
    : '';

  // Categorias
  const cats = Array.isArray(a.categorias) ? a.categorias : [];
  const catTags = cats.length
    ? `<div class="avatar-cat-row">${cats.map(c => `<span class="avatar-cat-tag ${c.toLowerCase()}">${escHtml(c)}</span>`).join('')}</div>`
    : '';

  return `
    <div class="avatar-card${isActive ? ' active-avatar' : ''}" id="ac-${a.id}">
      ${isActive ? '<div class="avatar-active-badge" title="Avatar ativo"></div>' : ''}
      <div class="flex items-center gap-2">
        <div class="avatar-img">
          ${avatarSrc
            ? `<img src="${escHtml(avatarSrc)}" alt="${escHtml(a.nome)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
            : `<span>${escHtml(a.emoji || '🎭')}</span>`}
        </div>
        <div style="min-width:0">
          <div class="avatar-name">${escHtml(a.nome)}</div>
          <div class="avatar-niche">${escHtml(a.nicho)}</div>
          ${profileLink}
        </div>
      </div>

      ${catTags}

      <div class="avatar-meta platform-toggles">
        ${platforms}
      </div>

      ${a.prompt_base ? `<div class="text-sm text-muted" style="line-height:1.5;font-style:italic">"${escHtml(a.prompt_base)}"</div>` : ''}
      ${refCount > 0 ? `<div class="text-sm text-muted" style="display:flex;align-items:center;gap:5px"><i class="fa-regular fa-images" style="color:var(--accent)"></i> ${refCount} imagem(ns) de referência</div>` : ''}

      <div class="flex gap-1 mt-1">
        ${!isActive
          ? `<button class="btn btn-sm btn-secondary flex-1" onclick="setActiveAvatar('${a.id}')"><i class="fa-solid fa-star"></i> Ativar</button>`
          : '<span class="btn btn-sm btn-secondary flex-1 text-center" style="cursor:default;opacity:.5"><i class="fa-solid fa-star"></i> Ativo</span>'}
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openAvatarMonetizacaoModal('${a.id}')" title="Monetização"><i class="fa-solid fa-coins" style="color:var(--yellow)"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openContasModal('${a.id}','${escHtml(a.nome)}')" title="Contas sociais"><i class="fa-solid fa-link"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon" onclick="openAvatarModal('${a.id}')" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="confirmDeleteAvatar('${a.id}', this.dataset.nome)" data-nome="${escHtml(a.nome)}" title="Apagar"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}

function setActiveAvatar(id) {
  Config.set('ACTIVE_AVATAR', id);
  const avatares = app.getAvatares();
  const grid = document.getElementById('avatarGrid');
  if (grid) grid.innerHTML = avatares.map(a => renderAvatarCard(a, String(a.id) === String(id))).join('');
  app.toast('Avatar ativo alterado!', 'success');
}

function openAvatarModal(id) {
  const avatares = app.getAvatares();
  const a = id ? avatares.find(x => String(x.id) === String(id)) : null;
  const isNew = !a;

  _refImagesState = (a?.imagens_referencia || []).map(url => ({ url, isNew: false }));
  const avatarCats = Array.isArray(a?.categorias) ? a.categorias : [];

  const body = `
    <div class="prompts-toggle-bar">
      <button id="prompts-toggle-btn-avatar" class="btn btn-sm btn-ghost" onclick="PromptsLibrary.toggle('avatar')">
        <i class="fa-solid fa-book-open"></i> Biblioteca de prompts
      </button>
    </div>
    ${PromptsLibrary.renderAvatarPanel()}
    <div class="form-group">
      <label class="form-label">Nome *</label>
      <input id="av-nome" class="form-control" value="${escHtml(a?.nome || '')}" placeholder="Ex: Luna">
    </div>
    <div class="form-group">
      <label class="form-label">Nicho *</label>
      <input id="av-nicho" class="form-control" value="${escHtml(a?.nicho || '')}" placeholder="Ex: Lifestyle &amp; Wellness">
    </div>
    <div class="form-group">
      <label class="form-label">Emoji / Ícone</label>
      <input id="av-emoji" class="form-control" value="${escHtml(a?.emoji || '🎭')}" placeholder="🎭" maxlength="4">
    </div>
    <div class="form-group">
      <label class="form-label">URL do perfil público</label>
      <input id="av-profile-url" class="form-control" value="${escHtml(a?.profile_url || '')}" placeholder="https://fansly.com/minhaconta">
    </div>
    <div class="form-group">
      <label class="form-label">Categorias</label>
      <div class="category-chips" id="av-cats">
        ${CATEGORIAS_PRESET.map(c => {
          const active = avatarCats.includes(c);
          return `<div class="category-chip${active ? ' active' : ''} ${c.toLowerCase()}" data-cat="${escHtml(c)}" onclick="toggleCategoryChip(this)">${escHtml(c)}</div>`;
        }).join('')}
      </div>
      <div class="form-hint mt-1">Clica para selecionar/deselecionar</div>
    </div>
    <div class="form-group">
      <label class="form-label">Prompt base (personalidade para a IA)</label>
      <textarea id="av-prompt" class="form-control" rows="3" placeholder="Descreve o estilo, tom e personalidade do avatar…">${escHtml(a?.prompt_base || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Plataformas</label>
      <div class="platform-toggles" id="av-platforms">
        ${PLATAFORMAS_AVATAR.map(p => {
          const active = (a?.plataformas || []).includes(p);
          return `<div class="platform-toggle${active ? ' active ' + p : ''}" data-p="${p}" onclick="togglePlatformModal(this)">${app.platformIcon(p)} ${app.platformLabel(p)}</div>`;
        }).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">URL da imagem (opcional)</label>
      <input id="av-img" class="form-control" value="${escHtml(a?.imagem_url || '')}" placeholder="https://…">
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Imagens de referência <span class="text-muted" style="font-weight:400">(até 5 — usadas pela IA para gerar conteúdo)</span></label>
      <div class="ref-images-grid" id="av-ref-imgs"></div>
      <div class="form-hint mt-1">Adiciona fotos do avatar, exemplos de estilo ou inspiração visual</div>
    </div>
    <div id="av-gen-progress" style="min-height:22px;margin-top:12px;text-align:center;font-size:.82rem;color:var(--accent)"></div>`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    ${isNew ? `<button id="btn-gerar-aleatorio" class="btn btn-ghost" onclick="gerarAvatarAleatorio()" title="Gera nome, personalidade, foto de perfil e imagens de referência automaticamente">
      <i class="fa-solid fa-dice"></i> Gerar aleatório
    </button>` : ''}
    <button class="btn btn-primary" onclick="saveAvatar('${id || ''}')">
      <i class="fa-solid fa-floppy-disk"></i> ${isNew ? 'Criar' : 'Guardar'}
    </button>`;

  app.openModal(isNew ? 'Novo avatar' : `Editar — ${a.nome}`, body, footer);
  setTimeout(() => _renderRefImages(), 0);
}

function toggleCategoryChip(el) {
  const cat = el.dataset.cat;
  el.classList.toggle('active');
}

function _renderRefImages() {
  const grid = document.getElementById('av-ref-imgs');
  if (!grid) return;
  const items = _refImagesState.map((img, i) => `
    <div class="ref-image-item">
      <img src="${img.dataUrl || img.url}" alt="ref ${i + 1}">
      <button class="ref-image-delete" onclick="removeRefImage(${i})" title="Remover"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join('');
  const addBtn = _refImagesState.length < 5 ? `
    <label class="ref-image-add" title="Adicionar imagem">
      <i class="fa-solid fa-plus"></i>
      <input type="file" accept="image/*" style="display:none" onchange="addRefImage(this)">
    </label>` : '';
  grid.innerHTML = items + addBtn;
}

function addRefImage(input) {
  const file = input.files[0];
  if (!file) return;
  if (_refImagesState.length >= 5) { app.toast('Máximo 5 imagens de referência', 'warning'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    _refImagesState.push({ dataUrl: e.target.result, isNew: true });
    _renderRefImages();
  };
  reader.readAsDataURL(file);
}

function removeRefImage(i) {
  _refImagesState.splice(i, 1);
  _renderRefImages();
}

function togglePlatformModal(el) {
  const p = el.dataset.p;
  el.classList.toggle('active');
  el.classList.toggle(p);
}

async function saveAvatar(id) {
  const nome       = document.getElementById('av-nome').value.trim();
  const nicho      = document.getElementById('av-nicho').value.trim();
  const emoji      = document.getElementById('av-emoji').value.trim();
  const prompt     = document.getElementById('av-prompt').value.trim();
  const imgUrl     = document.getElementById('av-img').value.trim();
  const profileUrl = document.getElementById('av-profile-url').value.trim();
  const platforms  = [...document.querySelectorAll('#av-platforms .platform-toggle.active')].map(el => el.dataset.p);
  const categorias = [...document.querySelectorAll('#av-cats .category-chip.active')].map(el => el.dataset.cat);

  if (!nome || !nicho) { app.toast('Nome e nicho são obrigatórios', 'error'); return; }

  const avatar = {
    nome, nicho, emoji, prompt_base: prompt,
    plataformas: platforms, imagem_url: imgUrl,
    profile_url: profileUrl || null,
    categorias,
  };
  if (id) avatar.id = id;

  if (DB.ready()) {
    const { data: saved, error } = await DB.upsertAvatar(avatar);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }

    const savedId = saved?.id || id;
    const storagePrefix = savedId || String(Date.now());
    const refUrls = [];

    for (const img of _refImagesState) {
      if (!img.isNew) {
        refUrls.push(img.url);
      } else if (img.dataUrl) {
        const { url, error: uploadErr } = await DB.uploadAvatarReferenceImage(img.dataUrl, storagePrefix);
        if (uploadErr) {
          console.warn('Erro ao fazer upload de imagem de referência:', uploadErr);
        } else {
          refUrls.push(url);
        }
      }
    }

    if (savedId) {
      const { error: refErr } = await DB.updateAvatarRefImages(savedId, refUrls);
      if (refErr) console.warn('Erro ao guardar imagens de referência:', refErr);
    }
  } else {
    avatar.imagens_referencia = _refImagesState.filter(i => !i.isNew).map(i => i.url);
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
    `<p>Tens a certeza que queres apagar <strong>${escHtml(nome)}</strong>? Esta ação é irreversível.</p>`,
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

/* ── Geração aleatória de avatar com IA ── */
async function gerarAvatarAleatorio() {
  const btnGerar  = document.getElementById('btn-gerar-aleatorio');
  const progressEl = document.getElementById('av-gen-progress');
  const setProgress = (msg) => { if (progressEl) progressEl.innerHTML = msg; };

  if (btnGerar) {
    btnGerar.disabled = true;
    btnGerar.innerHTML = '<div class="spinner" style="width:14px;height:14px;display:inline-block"></div> A gerar…';
  }

  try {
    /* ── Passo 1: Gerar identidade completa ── */
    setProgress('<i class="fa-solid fa-wand-magic-sparkles"></i> A criar identidade do avatar…');

    const jsonPrompt = `Cria um avatar de criador de conteúdo fictício para redes sociais.
Responde APENAS com JSON válido, sem markdown, sem código, sem backticks:
{
  "nome": "Nome único e criativo (1-2 palavras, soa real)",
  "nicho": "Nicho de conteúdo específico e interessante",
  "emoji": "1 emoji representativo do nicho",
  "aparencia": "Descrição física detalhada em inglês para geração de imagem: etnia, cabelo (cor e estilo), cor dos olhos, expressão, roupa típica, ambiente/fundo sugerido",
  "ambiente_lifestyle": "Ambiente/cenário em inglês para fotos de lifestyle relacionado com o nicho",
  "categorias": ["máx 3 itens de: SFW, NSFW, Anime, Cosplay, Realista, Lifestyle, Gaming, Music, Fitness, Art"],
  "plataformas": ["2-4 itens de: instagram, tiktok, facebook, youtube, fansly, onlyfans, patreon, twitch, spotify"],
  "prompt_base": "Personalidade detalhada em português: estilo visual, tom de voz, características únicas, tipo de conteúdo que cria, como interage com a audiência — 3-4 frases ricas"
}
Sê muito criativo, específico e coerente. O avatar deve ter uma identidade única e memorável.`;

    const rawJson = await Gemini.generateText(jsonPrompt, { temperature: 0.95 });

    let data;
    try {
      const match = rawJson.match(/\{[\s\S]*\}/);
      data = JSON.parse(match ? match[0] : rawJson);
    } catch (_) {
      throw new Error('Formato de resposta inválido. Tenta novamente.');
    }

    /* ── Passo 2: Preencher campos de texto ── */
    setProgress('<i class="fa-solid fa-pen"></i> A preencher campos…');

    const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    setVal('av-nome',       data.nome);
    setVal('av-nicho',      data.nicho);
    setVal('av-emoji',      data.emoji || '🎭');
    setVal('av-prompt',     data.prompt_base);

    // Categorias
    document.querySelectorAll('#av-cats .category-chip').forEach(chip => {
      const cat = chip.dataset.cat;
      const on  = (data.categorias || []).some(c => c.toLowerCase() === cat.toLowerCase());
      chip.classList.toggle('active', on);
    });

    // Plataformas — resetar todas e activar as seleccionadas
    document.querySelectorAll('#av-platforms .platform-toggle').forEach(toggle => {
      const p  = toggle.dataset.p;
      const on = (data.plataformas || []).includes(p);
      const isActive = toggle.classList.contains('active');
      if (on !== isActive) togglePlatformModal(toggle);
    });

    /* ── Passo 3: Gerar foto de perfil ── */
    setProgress('<i class="fa-regular fa-image"></i> A gerar foto de perfil…');

    const portraitPrompt = `Professional portrait photo, ${data.aparencia}, content creator for ${data.nicho}, soft diffused studio lighting, looking at camera, clean subtle gradient background, photorealistic, ultra high quality, 4K, sharp focus, Instagram-worthy headshot`;

    const avatarDataUrl = await Gemini.generateImage(portraitPrompt, { aspectRatio: '1:1' });
    if (avatarDataUrl) {
      _refImagesState = [{ dataUrl: avatarDataUrl, isNew: true, _isPortrait: true }, ..._refImagesState.slice(0, 4)];
      _renderRefImages();
    }

    /* ── Passo 4: Gerar 2 imagens de referência lifestyle ── */
    const refPrompts = [
      `Candid lifestyle photo, ${data.aparencia}, ${data.nicho} content creator, ${data.ambiente_lifestyle || data.nicho + ' setting'}, natural warm lighting, slightly shallow depth of field, Instagram aesthetic, photorealistic, high quality`,
      `Behind-the-scenes content creation, ${data.aparencia}, creating ${data.nicho} content, aesthetic and cozy workspace, golden hour lighting, photorealistic, Instagram-worthy, lifestyle photography`,
    ];

    for (let i = 0; i < refPrompts.length; i++) {
      if (_refImagesState.length >= 5) break;
      setProgress(`<i class="fa-solid fa-images"></i> A gerar imagem de referência ${i + 1}/2…`);
      try {
        const refDataUrl = await Gemini.generateImage(refPrompts[i], { aspectRatio: '4:5' });
        if (refDataUrl) {
          _refImagesState.push({ dataUrl: refDataUrl, isNew: true });
          _renderRefImages();
        }
      } catch (e) {
        console.warn('Falha ao gerar imagem de referência ' + (i + 1), e);
      }
    }

    setProgress('');
    app.toast(`Avatar "${data.nome}" gerado! Revê os campos e guarda.`, 'success');

  } catch (e) {
    setProgress('');
    app.toast('Erro: ' + e.message, 'error');
  } finally {
    if (btnGerar) {
      btnGerar.disabled = false;
      btnGerar.innerHTML = '<i class="fa-solid fa-dice"></i> Gerar aleatório';
    }
  }
}

/* ── Fansly Stats por Avatar ── */
async function openAvatarFanslyModal(avatarId) {
  const a = app.getAvatares().find(x => String(x.id) === String(avatarId));
  const avatarNome = a?.nome || '';
  const refs       = a?.imagens_referencia || [];
  const avatarSrc  = refs[0] || a?.imagem_url || null;

  let statsHistorico = [];
  const hoje     = new Date();
  const mesAtual = hoje.toISOString().slice(0,7) + '-01';

  if (DB.ready()) {
    const { data } = await DB.getFanslyStats(avatarId);
    statsHistorico = data || [];
  }

  const statMesAtual = statsHistorico.find(s => s.mes === mesAtual);

  const body = `
    <div style="background:linear-gradient(135deg,rgba(236,72,153,0.1),rgba(124,58,237,0.1));border:1px solid rgba(236,72,153,0.3);border-radius:12px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center">
        ${avatarSrc
          ? `<img src="${escHtml(avatarSrc)}" style="width:100%;height:100%;object-fit:cover">`
          : `<span style="font-size:1.8rem">${escHtml(a?.emoji || '🎭')}</span>`}
      </div>
      <div>
        <div style="font-weight:700;font-size:1.05rem">${escHtml(avatarNome)}</div>
        <div style="font-size:.8rem;color:var(--pink)"><i class="fa-solid fa-dollar-sign"></i> Fansly</div>
      </div>
    </div>

    <div style="font-weight:700;margin-bottom:12px">Mês atual — ${hoje.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Subscritores</label>
        <input id="avfl-subs" class="form-control" type="number" min="0" value="${statMesAtual?.subscribers||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Novos subscritores</label>
        <input id="avfl-novos" class="form-control" type="number" min="0" value="${statMesAtual?.novos_subs||0}">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Receita subscrições (€)</label>
        <input id="avfl-receita" class="form-control" type="number" min="0" step="0.01" value="${statMesAtual?.receita||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Tips (€)</label>
        <input id="avfl-tips" class="form-control" type="number" min="0" step="0.01" value="${statMesAtual?.tips||0}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Views de conteúdo</label>
      <input id="avfl-views" class="form-control" type="number" min="0" value="${statMesAtual?.views||0}">
    </div>
    <div class="form-group mb-0">
      <label class="form-label">Notas</label>
      <textarea id="avfl-notas" class="form-control" rows="2" placeholder="Observações…">${escHtml(statMesAtual?.notas||'')}</textarea>
    </div>

    ${statsHistorico.length > 0 ? `
      <div style="margin-top:20px">
        <div style="font-weight:700;margin-bottom:10px">Histórico Fansly</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto">
          ${statsHistorico.map(s => {
            const d = new Date(s.mes);
            const recTotal = (parseFloat(s.receita)||0) + (parseFloat(s.tips)||0);
            return `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-elevated);border-radius:8px">
                <span style="font-size:.85rem">${d.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</span>
                <div style="display:flex;gap:16px;font-size:.82rem">
                  <span style="color:var(--text-muted)"><i class="fa-solid fa-users"></i> ${(s.subscribers||0).toLocaleString()}</span>
                  <span style="color:var(--pink);font-weight:700">€${recTotal.toFixed(2)}</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    ` : ''}`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveAvatarFanslyStats('${avatarId}','${mesAtual}','${statMesAtual?.id||''}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;

  app.openModal(`Fansly — ${avatarNome}`, body, footer);
}

async function saveAvatarFanslyStats(avatarId, mes, existingId) {
  const subscribers = parseInt(document.getElementById('avfl-subs')?.value)||0;
  const novos_subs  = parseInt(document.getElementById('avfl-novos')?.value)||0;
  const receita     = parseFloat(document.getElementById('avfl-receita')?.value)||0;
  const tips        = parseFloat(document.getElementById('avfl-tips')?.value)||0;
  const views       = parseInt(document.getElementById('avfl-views')?.value)||0;
  const notas       = document.getElementById('avfl-notas')?.value.trim();

  const payload = { avatar_id: avatarId, mes, subscribers, novos_subs, receita, tips, views, notas };
  if (existingId) payload.id = existingId;

  if (DB.ready()) {
    const { error } = await DB.upsertFanslyStats(payload);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }

  app.toast('Stats Fansly guardadas!', 'success');
  app.closeModal();
  const hash = location.hash.replace('#', '');
  const content = document.getElementById('content');
  if (content) {
    if (hash === 'monetizacao') renderMonetizacao(content);
    else if (hash === 'avatares') renderAvatares(content);
  }
}

/* ── Modal de Monetização unificado por Avatar ── */
async function openAvatarMonetizacaoModal(avatarId) {
  const a = app.getAvatares().find(x => String(x.id) === String(avatarId));
  if (!a) return;

  const plataformasMonetizacao = (a.plataformas || []).filter(p => ['fansly','onlyfans','patreon','twitch'].includes(p));
  // Sempre mostrar pelo menos Fansly e OnlyFans como opções
  const platsMostrar = [...new Set(['fansly', 'onlyfans', ...plataformasMonetizacao])];

  const refs     = a?.imagens_referencia || [];
  const avatarSrc = refs[0] || a?.imagem_url || null;

  const body = `
    <div style="background:linear-gradient(135deg,rgba(234,179,8,0.1),rgba(124,58,237,0.1));border:1px solid rgba(234,179,8,0.3);border-radius:12px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center">
        ${avatarSrc
          ? `<img src="${escHtml(avatarSrc)}" style="width:100%;height:100%;object-fit:cover">`
          : `<span style="font-size:1.6rem">${escHtml(a?.emoji || '🎭')}</span>`}
      </div>
      <div>
        <div style="font-weight:700">${escHtml(a.nome)}</div>
        <div style="font-size:.8rem;color:var(--yellow)"><i class="fa-solid fa-coins"></i> Gerir receitas por plataforma</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
      <button class="btn btn-secondary" style="flex-direction:column;gap:6px;padding:16px 12px;height:auto;border-color:var(--pink);justify-content:center;align-items:center"
        onclick="app.closeModal();openAvatarFanslyModal('${avatarId}')">
        <i class="fa-solid fa-dollar-sign" style="color:var(--pink);font-size:1.4rem"></i>
        <span style="font-weight:700">Fansly</span>
        <span class="text-sm text-muted">Subs, receita, tips</span>
      </button>

      <button class="btn btn-secondary" style="flex-direction:column;gap:6px;padding:16px 12px;height:auto;border-color:var(--blue);justify-content:center;align-items:center"
        onclick="app.closeModal();openAvatarOnlyfansModal('${avatarId}')">
        <i class="fa-solid fa-heart" style="color:var(--blue);font-size:1.4rem"></i>
        <span style="font-weight:700">OnlyFans</span>
        <span class="text-sm text-muted">Subs, PPV, tips</span>
      </button>

      <button class="btn btn-secondary" style="flex-direction:column;gap:6px;padding:16px 12px;height:auto;border-color:#f96854;justify-content:center;align-items:center"
        onclick="app.closeModal();app.navigate('monetizacao')">
        <i class="fa-brands fa-patreon" style="color:#f96854;font-size:1.4rem"></i>
        <span style="font-weight:700">Patreon</span>
        <span class="text-sm text-muted">Gerir em Monetização</span>
      </button>

      <button class="btn btn-secondary" style="flex-direction:column;gap:6px;padding:16px 12px;height:auto;border-color:#9146ff;justify-content:center;align-items:center"
        onclick="app.closeModal();app.navigate('monetizacao')">
        <i class="fa-brands fa-twitch" style="color:#9146ff;font-size:1.4rem"></i>
        <span style="font-weight:700">Twitch</span>
        <span class="text-sm text-muted">Gerir em Monetização</span>
      </button>
    </div>

    <div style="margin-top:14px;padding:10px;background:var(--bg-elevated);border-radius:8px;font-size:.82rem;color:var(--text-muted)">
      <i class="fa-solid fa-info-circle" style="color:var(--accent)"></i>
      Patreon e Twitch são globais (não por avatar). Fansly e OnlyFans são por avatar.
    </div>`;

  app.openModal(`Monetização — ${a.nome}`, body,
    `<button class="btn btn-secondary" onclick="app.closeModal()">Fechar</button>`);
}

/* ── OnlyFans Stats por Avatar ── */
async function openAvatarOnlyfansModal(avatarId) {
  const a = app.getAvatares().find(x => String(x.id) === String(avatarId));
  const avatarNome = a?.nome || '';
  const refs       = a?.imagens_referencia || [];
  const avatarSrc  = refs[0] || a?.imagem_url || null;

  let statsHistorico = [];
  const hoje     = new Date();
  const mesAtual = hoje.toISOString().slice(0,7) + '-01';

  if (DB.ready()) {
    const { data } = await DB.getOnlyfansStats(avatarId);
    statsHistorico = data || [];
  }

  const statMesAtual = statsHistorico.find(s => s.mes === mesAtual);

  const body = `
    <div style="background:linear-gradient(135deg,rgba(59,130,246,0.1),rgba(124,58,237,0.1));border:1px solid rgba(59,130,246,0.3);border-radius:12px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--bg-elevated);display:flex;align-items:center;justify-content:center">
        ${avatarSrc
          ? `<img src="${escHtml(avatarSrc)}" style="width:100%;height:100%;object-fit:cover">`
          : `<span style="font-size:1.8rem">${escHtml(a?.emoji || '🎭')}</span>`}
      </div>
      <div>
        <div style="font-weight:700;font-size:1.05rem">${escHtml(avatarNome)}</div>
        <div style="font-size:.8rem;color:var(--blue)"><i class="fa-solid fa-heart"></i> OnlyFans</div>
      </div>
    </div>

    <div style="font-weight:700;margin-bottom:12px">Mês atual — ${hoje.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Subscritores</label>
        <input id="avof-subs" class="form-control" type="number" min="0" value="${statMesAtual?.subscribers||0}">
      </div>
      <div class="form-group">
        <label class="form-label">Receita subscrições (€)</label>
        <input id="avof-receita" class="form-control" type="number" min="0" step="0.01" value="${statMesAtual?.receita||0}">
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Tips (€)</label>
        <input id="avof-tips" class="form-control" type="number" min="0" step="0.01" value="${statMesAtual?.tips||0}">
      </div>
      <div class="form-group">
        <label class="form-label">PPV — Pay Per View (€)</label>
        <input id="avof-ppv" class="form-control" type="number" min="0" step="0.01" value="${statMesAtual?.ppv_receita||0}">
      </div>
    </div>

    ${statsHistorico.length > 0 ? `
      <div style="margin-top:16px">
        <div style="font-weight:700;margin-bottom:10px">Histórico OnlyFans</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto">
          ${statsHistorico.map(s => {
            const d = new Date(s.mes);
            const recTotal = (parseFloat(s.receita)||0) + (parseFloat(s.tips)||0) + (parseFloat(s.ppv_receita)||0);
            return `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-elevated);border-radius:8px">
                <span style="font-size:.85rem">${d.toLocaleDateString('pt-PT',{month:'long',year:'numeric'})}</span>
                <div style="display:flex;gap:16px;font-size:.82rem">
                  <span style="color:var(--text-muted)"><i class="fa-solid fa-users"></i> ${(s.subscribers||0).toLocaleString()}</span>
                  <span style="color:var(--blue);font-weight:700">€${recTotal.toFixed(2)}</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>
    ` : ''}`;

  const footer = `
    <button class="btn btn-secondary" onclick="app.closeModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="saveAvatarOnlyfansStats('${avatarId}','${mesAtual}','${statMesAtual?.id||''}')">
      <i class="fa-solid fa-floppy-disk"></i> Guardar
    </button>`;

  app.openModal(`OnlyFans — ${avatarNome}`, body, footer);
}

async function saveAvatarOnlyfansStats(avatarId, mes, existingId) {
  const subscribers = parseInt(document.getElementById('avof-subs')?.value)||0;
  const receita     = parseFloat(document.getElementById('avof-receita')?.value)||0;
  const tips        = parseFloat(document.getElementById('avof-tips')?.value)||0;
  const ppv_receita = parseFloat(document.getElementById('avof-ppv')?.value)||0;

  const payload = { avatar_id: avatarId, mes, subscribers, receita, tips, ppv_receita };
  if (existingId) payload.id = existingId;

  if (DB.ready()) {
    const { error } = await DB.upsertOnlyfansStats(payload);
    if (error) { app.toast('Erro ao guardar: ' + error, 'error'); return; }
  }

  app.toast('Stats OnlyFans guardadas!', 'success');
  app.closeModal();
  const hash = location.hash.replace('#', '');
  const content = document.getElementById('content');
  if (content) {
    if (hash === 'monetizacao') renderMonetizacao(content);
    else if (hash === 'avatares') renderAvatares(content);
  }
}

/* ── Contas de redes sociais ── */
const PLATAFORMAS_INFO = {
  instagram:   { label: 'Instagram',   icon: 'fa-brands fa-instagram icon-instagram',   placeholder_id: 'Ex: 17841400000000000', placeholder_user: 'Ex: @minha_conta' },
  tiktok:      { label: 'TikTok',      icon: 'fa-brands fa-tiktok icon-tiktok',         placeholder_id: 'Ex: 6784563210987654',   placeholder_user: 'Ex: @minha_conta' },
  facebook:    { label: 'Facebook',    icon: 'fa-brands fa-facebook icon-facebook',     placeholder_id: 'Ex: 123456789012345',    placeholder_user: 'Ex: Nome da Página' },
  youtube:     { label: 'YouTube',     icon: 'fa-brands fa-youtube icon-youtube',       placeholder_id: 'Ex: UCxxxxxxxxxxxxxx',   placeholder_user: 'Ex: @meucanal' },
  fansly:      { label: 'Fansly',      icon: 'fa-solid fa-dollar-sign icon-fansly',     placeholder_id: 'Ex: fansly_id_123',      placeholder_user: 'Ex: @minhaconta' },
  onlyfans:    { label: 'OnlyFans',    icon: 'fa-solid fa-fire icon-onlyfans',          placeholder_id: 'Ex: of_id_123',          placeholder_user: 'Ex: @minhaconta' },
  patreon:     { label: 'Patreon',     icon: 'fa-brands fa-patreon icon-patreon',       placeholder_id: 'Ex: patreon_id_123',     placeholder_user: 'Ex: minhapagina' },
  twitch:      { label: 'Twitch',      icon: 'fa-brands fa-twitch icon-twitch',         placeholder_id: 'Ex: twitch_id_123',      placeholder_user: 'Ex: meucanal' },
  spotify:     { label: 'Spotify',     icon: 'fa-brands fa-spotify icon-spotify',       placeholder_id: 'Ex: spotify_id_123',     placeholder_user: 'Ex: Artista' },
  vimeo:       { label: 'Vimeo',       icon: 'fa-brands fa-vimeo-v icon-vimeo',         placeholder_id: 'Ex: vimeo.com/user',     placeholder_user: 'Ex: @meucanal' },
  rumble:      { label: 'Rumble',      icon: 'fa-solid fa-video icon-rumble',           placeholder_id: 'Ex: rumble.com/user',    placeholder_user: 'Ex: meucanal' },
  dailymotion: { label: 'Dailymotion', icon: 'fa-solid fa-play icon-dailymotion',       placeholder_id: 'Ex: dailymotion.com/user', placeholder_user: 'Ex: meucanal' },
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
                <input class="form-control" data-field="username" value="${escHtml(c.username || '')}" placeholder="${escHtml(info.placeholder_user)}">
              </div>
              <div>
                <label class="form-label" style="font-size:.75rem">ID da Conta</label>
                <input class="form-control" data-field="conta_id" value="${escHtml(c.conta_id || '')}" placeholder="${escHtml(info.placeholder_id)}">
              </div>
            </div>
            <div class="mt-2">
              <label class="form-label" style="font-size:.75rem">Access Token</label>
              <div class="key-field">
                <input class="form-control" type="password" data-field="access_token" value="${escHtml(c.access_token || '')}" placeholder="Token de acesso OAuth…">
                <button class="key-toggle" onclick="this.previousElementSibling.type=this.previousElementSibling.type==='password'?'text':'password';this.innerHTML=this.previousElementSibling.type==='password'?'<i class=\\'fa-solid fa-eye\\'></i>':'<i class=\\'fa-solid fa-eye-slash\\'></i>'"><i class="fa-solid fa-eye"></i></button>
              </div>
            </div>
            <div class="mt-2">
              <label class="form-label" style="font-size:.75rem">Notas (opcional)</label>
              <input class="form-control" data-field="notas" value="${escHtml(c.notas || '')}" placeholder="Ex: Conta principal, expira em Março…">
            </div>
            <input type="hidden" data-field="id" value="${escHtml(c.id || '')}">
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

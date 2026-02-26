/* ============================================================
   prompts-library.js — Biblioteca de prompts classificados
   para Avatares e Canais de Vídeo
   ============================================================ */
const PromptsLibrary = (() => {

  /* ══════════════════════════════════════════════════════════
     PROMPTS DE AVATAR
  ══════════════════════════════════════════════════════════ */
  const AVATAR_PROMPTS = [
    {
      categoria: 'Lifestyle & Wellness',
      icon: 'fa-solid fa-spa',
      color: 'var(--green)',
      items: [
        {
          label: 'Wellness & Mindfulness',
          nicho: 'Wellness & Mindfulness',
          emoji: '🧘',
          prompt_base: 'Criadora focada em bem-estar mental e físico. Partilho rotinas matinais, meditação guiada, receitas saudáveis e dicas de equilíbrio vida-trabalho. Tom sereno, acolhedor e motivador. Conteúdo autêntico que inspira pequenas mudanças diárias.',
          categorias: ['SFW', 'Lifestyle'],
          plataformas: ['instagram', 'tiktok', 'youtube'],
        },
        {
          label: 'Travel & Nomad Life',
          nicho: 'Travel & Digital Nomad',
          emoji: '✈️',
          prompt_base: 'Criadora nómada digital que documenta viagens por países pouco conhecidos. Partilho dicas práticas de viagem low-cost, work from anywhere e experiências culturais autênticas. Tom aventureiro, honesto e inspirador. Mistura de humor e informação útil.',
          categorias: ['SFW', 'Lifestyle'],
          plataformas: ['instagram', 'tiktok', 'youtube'],
        },
        {
          label: 'Aesthetic Home & Decor',
          nicho: 'Interior Design & Lifestyle',
          emoji: '🏠',
          prompt_base: 'Criadora especializada em decoração minimalista e lifestyle doméstico. Partilho transformações de espaços, DIY, hauls de decoração e rotinas de organização. Tom refinado, estético e acessível. Conteúdo visualmente impecável com foco em detalhes.',
          categorias: ['SFW', 'Lifestyle'],
          plataformas: ['instagram', 'tiktok'],
        },
      ],
    },
    {
      categoria: 'Gaming & Tech',
      icon: 'fa-solid fa-gamepad',
      color: 'var(--accent)',
      items: [
        {
          label: 'Gamer Competitivo',
          nicho: 'Gaming & Esports',
          emoji: '🎮',
          prompt_base: 'Streamer focado em gameplay competitivo de FPS e battle royale. Partilho highlights, análises de meta, tutoriais avançados e streams de ranked. Tom energético, técnico e competitivo. Comunicação directa com a comunidade gamer.',
          categorias: ['SFW', 'Gaming'],
          plataformas: ['twitch', 'youtube', 'tiktok'],
        },
        {
          label: 'Tech & Reviews',
          nicho: 'Tecnologia & Gadgets',
          emoji: '💻',
          prompt_base: 'Criador de conteúdo tecnológico com foco em reviews honestas e comparativas. Cubro smartphones, portáteis, wearables e software. Tom analítico, directo e aprofundado. Sem patrocínios escondidos — honestidade acima de tudo.',
          categorias: ['SFW'],
          plataformas: ['youtube', 'instagram', 'tiktok'],
        },
        {
          label: 'Indie Game Dev',
          nicho: 'Game Development & Indie',
          emoji: '🕹️',
          prompt_base: 'Desenvolvedor indie que documenta o processo de criar jogos a solo. Partilho devlogs, tutoriais de Unity/Godot, pós-mortems e bastidores do desenvolvimento. Tom técnico mas acessível. Comunidade de criadores e aspirantes a devs.',
          categorias: ['SFW', 'Gaming'],
          plataformas: ['youtube', 'tiktok', 'twitch'],
        },
      ],
    },
    {
      categoria: 'Fashion & Beauty',
      icon: 'fa-solid fa-palette',
      color: 'var(--pink)',
      items: [
        {
          label: 'Moda Sustentável',
          nicho: 'Sustainable Fashion & Style',
          emoji: '👗',
          prompt_base: 'Criadora de moda focada em sustentabilidade e consumo consciente. Partilho outfits thrift, dicas de vintage, OOTD e como criar looks com peças atemporais. Tom elegante, consciente e inclusivo. Inspiro a reduzir o consumo sem perder estilo.',
          categorias: ['SFW', 'Lifestyle'],
          plataformas: ['instagram', 'tiktok', 'youtube'],
        },
        {
          label: 'Makeup Artist',
          nicho: 'Beauty & Makeup',
          emoji: '💄',
          prompt_base: 'Maquilhadora profissional que partilha tutoriais acessíveis para todos os níveis. De looks naturais a editoriais, cubro técnicas, reviews de produtos e truques pro. Tom encorajador, criativo e detalhado. Acredito que a maquilhagem é arte e expressão pessoal.',
          categorias: ['SFW'],
          plataformas: ['instagram', 'tiktok', 'youtube'],
        },
      ],
    },
    {
      categoria: 'Fitness & Sport',
      icon: 'fa-solid fa-dumbbell',
      color: 'var(--yellow)',
      items: [
        {
          label: 'Fitness & Transformação',
          nicho: 'Fitness & Body Transformation',
          emoji: '💪',
          prompt_base: 'Coach de fitness especializado em transformações corporais naturais. Partilho treinos, nutrição prática, motivação e desmistificação de mitos fitness. Tom directo, honesto e motivador. Sem suplementos desnecessários — resultados reais com consistência.',
          categorias: ['SFW', 'Fitness'],
          plataformas: ['instagram', 'tiktok', 'youtube'],
        },
        {
          label: 'Yoga & Flexibilidade',
          nicho: 'Yoga & Movimento',
          emoji: '🧘',
          prompt_base: 'Instrutora de yoga com foco em flexibilidade e mobilidade para iniciantes. Partilho sequências guiadas, dicas de respiração e práticas de 10-20 minutos adaptadas ao dia-a-dia. Tom calmo, paciente e inclusivo. Yoga para todos os corpos e idades.',
          categorias: ['SFW', 'Lifestyle', 'Fitness'],
          plataformas: ['instagram', 'tiktok', 'youtube'],
        },
      ],
    },
    {
      categoria: 'Music & Art',
      icon: 'fa-solid fa-music',
      color: 'var(--blue)',
      items: [
        {
          label: 'Produtor Musical',
          nicho: 'Music Production & Beats',
          emoji: '🎵',
          prompt_base: 'Produtor musical independente especializado em lo-fi, hip-hop e música electrónica. Partilho bastidores de produção, tutoriais de DAW, packs de samples e o processo criativo. Tom criativo, técnico e apaixonado. Inspiro outros produtores a desenvolver o seu som único.',
          categorias: ['SFW', 'Music'],
          plataformas: ['youtube', 'tiktok', 'spotify', 'instagram'],
        },
        {
          label: 'Artist & Illustrator',
          nicho: 'Digital Art & Illustration',
          emoji: '🎨',
          prompt_base: 'Ilustradora digital especializada em character design e concept art. Partilho speedpaints, tutoriais de Procreate/Photoshop, comissões e o meu processo criativo. Tom artístico, detalhado e encorajador. Crio uma comunidade de artistas em crescimento.',
          categorias: ['SFW', 'Art'],
          plataformas: ['instagram', 'tiktok', 'youtube'],
        },
      ],
    },
    {
      categoria: 'Conteúdo Adulto',
      icon: 'fa-solid fa-fire',
      color: 'var(--red)',
      items: [
        {
          label: 'Modelo Sensual — Fansly',
          nicho: 'Adult Content Creator',
          emoji: '💋',
          prompt_base: 'Criadora de conteúdo adulto com personalidade cativante e presença forte. Estilo sensual mas com classe — combino lifestyle, fitness e conteúdo exclusivo. Tom confiante, próximo dos fãs e com sentido de humor. Interacção constante e conteúdo premium regular.',
          categorias: ['NSFW'],
          plataformas: ['fansly', 'onlyfans', 'instagram', 'tiktok'],
        },
        {
          label: 'Cosplay Adult Creator',
          nicho: 'Cosplay & Adult Content',
          emoji: '🎭',
          prompt_base: 'Criadora especializada em cosplay e conteúdo adulto temático. Combino paixão por anime/games com criatividade visual e conteúdo exclusivo para fãs. Tom lúdico, criativo e próximo da comunidade geek. Cosplays autênticos com atenção ao detalhe.',
          categorias: ['NSFW', 'Cosplay', 'Anime'],
          plataformas: ['fansly', 'onlyfans', 'instagram'],
        },
        {
          label: 'Lifestyle + OnlyFans',
          nicho: 'Lifestyle & Adult Content',
          emoji: '✨',
          prompt_base: 'Criadora que mistura lifestyle autêntico com conteúdo exclusivo para subscritores. Partilho viagens, fitness e rotinas no feed público — conteúdo exclusivo no OF/Fansly. Tom positivo, seguro de si e próximo da audiência. Presença activa e regular.',
          categorias: ['NSFW', 'Lifestyle'],
          plataformas: ['onlyfans', 'fansly', 'instagram', 'tiktok'],
        },
      ],
    },
  ];

  /* ══════════════════════════════════════════════════════════
     PROMPTS DE CANAIS DE VÍDEO
  ══════════════════════════════════════════════════════════ */
  const YOUTUBE_PROMPTS = [
    {
      categoria: 'Gaming',
      icon: 'fa-solid fa-gamepad',
      color: 'var(--accent)',
      items: [
        {
          label: 'Gaming Generalista',
          nicho: 'Gaming',
          notas: 'Canal de gaming com gameplay comentado, reviews de jogos indie e AAA, e vídeos de humor gaming. Conteúdo semanal com streams esporádicas.',
        },
        {
          label: 'Speedruns & Challenges',
          nicho: 'Speedrunning & Gaming Challenges',
          notas: 'Canal especializado em speedruns, challenges impossíveis e recordes. Conteúdo técnico e entretenimento competitivo. Comunidade de speedrunners activa.',
        },
        {
          label: 'Jogos Retrô & Nostalgia',
          nicho: 'Retro Gaming',
          notas: 'Canal dedicado a jogos clássicos, consolas vintage e memórias gaming. Reviews históricas, comparações retro vs. moderno e preservação da cultura gaming.',
        },
      ],
    },
    {
      categoria: 'Tecnologia',
      icon: 'fa-solid fa-microchip',
      color: 'var(--blue)',
      items: [
        {
          label: 'Reviews & Comparativos',
          nicho: 'Tecnologia & Reviews',
          notas: 'Reviews aprofundadas de smartphones, portáteis e gadgets. Comparativos honestos, benchmarks e guias de compra. Sem patrocínios não declarados.',
        },
        {
          label: 'Tutoriais & Produtividade',
          nicho: 'Tutoriais Tech & Produtividade',
          notas: 'Tutoriais práticos de software, automação, IA e produtividade digital. Vídeos curtos e directos. Para profissionais e estudantes que querem fazer mais em menos tempo.',
        },
        {
          label: 'Programação & Dev',
          nicho: 'Programação & Desenvolvimento Web',
          notas: 'Tutoriais de programação para iniciantes e intermédios. Projectos práticos, code reviews e dicas de carreira em tech. Foco em JavaScript, Python e desenvolvimento web moderno.',
        },
        {
          label: 'Inteligência Artificial',
          nicho: 'IA & Machine Learning',
          notas: 'Canal sobre IA: tutoriais de LLMs, prompting, automação com IA, reviews de ferramentas e impacto na sociedade. Para curiosos e profissionais da área.',
        },
      ],
    },
    {
      categoria: 'Educação',
      icon: 'fa-solid fa-graduation-cap',
      color: 'var(--green)',
      items: [
        {
          label: 'Documentário & Curiosidades',
          nicho: 'Documentário & Educação',
          notas: 'Canal de documentários curtos sobre história, ciência e fenómenos sociais. Pesquisa aprofundada com narrativa envolvente. Para mentes curiosas.',
        },
        {
          label: 'Línguas & Cultura',
          nicho: 'Aprendizagem de Línguas',
          notas: 'Tutoriais de aprendizagem de línguas com métodos modernos. Imersão cultural, dicas de memória e conteúdo para diferentes níveis. Comunidade multilíngue.',
        },
        {
          label: 'Finanças Pessoais',
          nicho: 'Finanças & Investimento',
          notas: 'Canal sobre finanças pessoais, investimento e independência financeira. Conceitos acessíveis, erros a evitar e estratégias práticas para portugueses e brasileiros.',
        },
      ],
    },
    {
      categoria: 'Lifestyle & Entertainment',
      icon: 'fa-solid fa-star',
      color: 'var(--yellow)',
      items: [
        {
          label: 'Vlog & Rotinas',
          nicho: 'Vlog & Lifestyle',
          notas: 'Vlogs autênticos de rotinas diárias, viagens, produtividade e vida real sem filtros. Conteúdo relativo e inspirador para jovens adultos.',
        },
        {
          label: 'Culinária & Receitas',
          nicho: 'Culinária & Food',
          notas: 'Canal de culinária com receitas simples para o dia-a-dia e receitas elaboradas para ocasiões especiais. Nutrição, dicas de cozinha e reviews de restaurantes.',
        },
        {
          label: 'Fitness & Treinos',
          nicho: 'Fitness & Treinos',
          notas: 'Canal de fitness com treinos completos, planos alimentares e transformações reais. Para todos os níveis. Sem exageros — resultados sustentáveis e duradouros.',
        },
      ],
    },
    {
      categoria: 'Música',
      icon: 'fa-solid fa-music',
      color: 'var(--pink)',
      items: [
        {
          label: 'Música Original & Covers',
          nicho: 'Música Original & Covers',
          notas: 'Canal de músico independente com música original, covers de qualidade e bastidores do processo criativo. Interacção com a comunidade e lives mensais.',
        },
        {
          label: 'Produção Musical',
          nicho: 'Produção Musical & Beats',
          notas: 'Tutoriais de produção musical: DAW, samples gratuitos, análise de beats de artistas famosos e o processo de criar música do zero.',
        },
      ],
    },
  ];

  /* ══════════════════════════════════════════════════════════
     ESTADO INTERNO
  ══════════════════════════════════════════════════════════ */
  const _state = { avatarOpen: false, youtubeOpen: false };

  /* ══════════════════════════════════════════════════════════
     RENDER — painel inline (retorna HTML)
  ══════════════════════════════════════════════════════════ */
  function renderAvatarPanel() {
    return _buildPanel(AVATAR_PROMPTS, 'avatar');
  }

  function renderYoutubePanel() {
    return _buildPanel(YOUTUBE_PROMPTS, 'youtube');
  }

  function _buildPanel(prompts, type) {
    const cats = prompts.map(c => c.categoria);
    const allItems = prompts.flatMap((cat, ci) =>
      cat.items.map((item, ii) => ({ ...item, _cat: cat.categoria, _icon: cat.icon, _color: cat.color, _idx: `${ci}-${ii}` }))
    );

    return `
      <div class="prompts-panel" id="prompts-panel-${type}">
        <div class="prompts-panel-toolbar">
          <div class="prompts-search-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input class="form-control" id="prompts-q-${type}" placeholder="Pesquisar…" oninput="PromptsLibrary.filter('${type}')">
          </div>
          <div class="prompts-cats" id="prompts-cats-${type}">
            <button class="prompts-cat-btn active" data-cat="" onclick="PromptsLibrary.setCat('${type}','',this)">Todos</button>
            ${prompts.map(cat => `
              <button class="prompts-cat-btn" data-cat="${cat.categoria}" onclick="PromptsLibrary.setCat('${type}','${cat.categoria}',this)" style="--cat-c:${cat.color}">
                <i class="${cat.icon}"></i> ${cat.categoria}
              </button>`).join('')}
          </div>
        </div>
        <div class="prompts-grid" id="prompts-grid-${type}">
          ${allItems.map(item => `
            <div class="prompt-card" data-cat="${item._cat}"
                 data-q="${(item.label + ' ' + item.nicho + ' ' + (item.prompt_base || item.notas || '')).toLowerCase()}">
              <div class="prompt-card-accent" style="background:${item._color}"></div>
              <div class="prompt-card-inner">
                <div class="prompt-card-meta">
                  <i class="${item._icon}" style="color:${item._color}"></i>
                  <span>${item._cat}</span>
                  ${item.emoji ? `<span class="prompt-emoji">${item.emoji}</span>` : ''}
                </div>
                <div class="prompt-card-title">${item.label}</div>
                <div class="prompt-card-nicho">${item.nicho}</div>
                <div class="prompt-card-preview">${(item.prompt_base || item.notas || '').slice(0, 90)}…</div>
                <button class="btn btn-sm btn-primary mt-1" onclick="PromptsLibrary.use('${type}','${item._idx}')">
                  <i class="fa-solid fa-check"></i> Usar
                </button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     TOGGLE (mostrar / esconder painel)
  ══════════════════════════════════════════════════════════ */
  function toggle(type) {
    const panel = document.getElementById(`prompts-panel-${type}`);
    const btn   = document.getElementById(`prompts-toggle-btn-${type}`);
    if (!panel) return;
    const open = panel.classList.toggle('open');
    if (btn) {
      btn.innerHTML = open
        ? '<i class="fa-solid fa-xmark"></i> Fechar biblioteca'
        : '<i class="fa-solid fa-book-open"></i> Biblioteca de prompts';
    }
  }

  /* ══════════════════════════════════════════════════════════
     FILTROS
  ══════════════════════════════════════════════════════════ */
  function filter(type) {
    const q    = (document.getElementById(`prompts-q-${type}`)?.value || '').toLowerCase();
    const cat  = document.getElementById(`prompts-cats-${type}`)?.querySelector('.active')?.dataset.cat || '';
    _applyFilter(type, q, cat);
  }

  function setCat(type, cat, btn) {
    document.getElementById(`prompts-cats-${type}`)?.querySelectorAll('.prompts-cat-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const q = (document.getElementById(`prompts-q-${type}`)?.value || '').toLowerCase();
    _applyFilter(type, q, cat);
  }

  function _applyFilter(type, q, cat) {
    document.getElementById(`prompts-grid-${type}`)?.querySelectorAll('.prompt-card').forEach(card => {
      const catMatch = !cat || card.dataset.cat === cat;
      const qMatch   = !q   || card.dataset.q.includes(q);
      card.style.display = catMatch && qMatch ? '' : 'none';
    });
  }

  /* ══════════════════════════════════════════════════════════
     USAR PROMPT
  ══════════════════════════════════════════════════════════ */
  function use(type, idx) {
    const [ci, ii] = idx.split('-').map(Number);
    if (type === 'avatar') {
      const item = AVATAR_PROMPTS[ci]?.items[ii];
      if (item) _fillAvatar(item);
    } else {
      const item = YOUTUBE_PROMPTS[ci]?.items[ii];
      if (item) _fillYoutube(item);
    }
    // Fechar painel após aplicar
    const panel = document.getElementById(`prompts-panel-${type}`);
    const btn   = document.getElementById(`prompts-toggle-btn-${type}`);
    if (panel) panel.classList.remove('open');
    if (btn)   btn.innerHTML = '<i class="fa-solid fa-book-open"></i> Biblioteca de prompts';
  }

  function _fillAvatar(item) {
    const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
    set('av-nicho',  item.nicho);
    set('av-emoji',  item.emoji || '');
    set('av-prompt', item.prompt_base || '');

    if (item.categorias) {
      document.querySelectorAll('#av-cats .category-chip').forEach(chip => {
        const on = item.categorias.some(c => c.toLowerCase() === chip.dataset.cat.toLowerCase());
        chip.classList.toggle('active', on);
      });
    }
    if (item.plataformas) {
      document.querySelectorAll('#av-platforms .platform-toggle').forEach(t => {
        const on = item.plataformas.includes(t.dataset.p);
        t.classList.toggle('active', on);
        t.classList.toggle(t.dataset.p, on);
      });
    }
    app.toast(`Template "${item.label}" aplicado!`, 'success');
  }

  function _fillYoutube(item) {
    const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
    set('yt-nicho', item.nicho || '');
    set('yt-notas', item.notas || '');
    app.toast(`Template "${item.label}" aplicado!`, 'success');
  }

  return { renderAvatarPanel, renderYoutubePanel, toggle, filter, setCat, use };
})();

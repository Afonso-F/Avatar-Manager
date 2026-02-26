/* ============================================================
   mistral.js — Mistral AI (texto + visão via Pixtral)
               + imagens via Pollinations.ai (grátis) ou fal.ai
               + vídeo via fal.ai
   ============================================================ */
const AI = (() => {
  const TEXT_MODEL   = 'mistral-small-latest';   // mais barato para texto
  const VISION_MODEL = 'pixtral-12b-2409';        // suporta imagens (visão)
  const BASE         = 'https://api.mistral.ai/v1';

  function key()      { return Config.get('MISTRAL'); }
  function falKey()   { return Config.get('FAL_AI'); }
  function vidModel() { return Config.get('VIDEO_MODEL') || 'fal-ai/wan/v2.1/t2v-480p'; }

  /* ── Texto / Visão ── */
  async function generateText(prompt, { temperature = 0.8, maxTokens = 1024, images = [] } = {}) {
    if (!key()) throw new Error('Mistral API key não configurada.');

    const hasImages = images && images.length > 0;
    const model = hasImages ? VISION_MODEL : TEXT_MODEL;

    let content;
    if (hasImages) {
      content = [
        { type: 'text', text: prompt },
        ...images.slice(0, 3).map(dataUrl => ({
          type: 'image_url',
          image_url: { url: dataUrl }
        }))
      ];
    } else {
      content = prompt;
    }

    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${key()}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message || `Erro ${res.status}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  /* ── Imagem: fal.ai (se configurado) ou Pollinations.ai (grátis) ── */
  async function generateImage(prompt, { aspectRatio = '1:1' } = {}) {
    if (falKey()) return _generateImageFal(prompt, { aspectRatio });
    return _generateImagePollinations(prompt, { aspectRatio });
  }

  /* Pollinations.ai — completamente gratuito, sem API key */
  async function _generateImagePollinations(prompt, { aspectRatio = '1:1' } = {}) {
    const sizeMap = {
      '1:1':  { w: 1024, h: 1024 },
      '9:16': { w: 768,  h: 1344 },
      '16:9': { w: 1344, h: 768  },
      '4:3':  { w: 1024, h: 768  },
      '3:4':  { w: 768,  h: 1024 },
    };
    const { w, h } = sizeMap[aspectRatio] || { w: 1024, h: 1024 };
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pollinations.ai erro ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Erro ao converter imagem'));
      reader.readAsDataURL(blob);
    });
  }

  /* fal.ai FLUX.1 Schnell — ~$0.003/imagem, maior qualidade */
  async function _generateImageFal(prompt, { aspectRatio = '1:1' } = {}) {
    const sizeMap = {
      '1:1':  'square_hd',
      '9:16': 'portrait_16_9',
      '16:9': 'landscape_16_9',
      '4:3':  'landscape_4_3',
      '3:4':  'portrait_4_3',
    };
    const image_size = sizeMap[aspectRatio] || 'square_hd';
    const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey()}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ prompt, image_size, num_images: 1 })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || err?.message || `fal.ai erro ${res.status}`);
    }
    const data = await res.json();
    const url = data?.images?.[0]?.url;
    if (!url) throw new Error('fal.ai: nenhuma imagem gerada.');
    return url;
  }

  /* ── Vídeo via fal.ai (Wan 2.6 / Kling / LTX) ──
     Devolve um objecto { url, isExternal } */
  async function generateVideo(prompt, { aspectRatio = '9:16', onProgress } = {}) {
    const fKey = falKey();
    if (!fKey) throw new Error('Chave fal.ai necessária para gerar vídeos. Configura em Configurações → fal.ai.');
    return _generateVideoFal(prompt, { aspectRatio, onProgress, fKey });
  }

  /* fal.ai Queue API */
  async function _generateVideoFal(prompt, { aspectRatio, onProgress, fKey }) {
    const model = vidModel();
    const queueUrl = `https://queue.fal.run/${model}`;

    const startRes = await fetch(queueUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${fKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ input: { prompt, aspect_ratio: aspectRatio } })
    });
    if (!startRes.ok) {
      const err = await startRes.json().catch(() => ({}));
      throw new Error(err?.detail || err?.message || `fal.ai erro ${startRes.status}`);
    }
    const { request_id, status_url } = await startRes.json();
    if (!request_id) throw new Error('fal.ai: resposta de queue inválida.');

    // Poll a cada 6s, até 10 min (100 tentativas)
    const pollUrl = status_url || `https://queue.fal.run/${model}/requests/${request_id}`;
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 6000));
      if (onProgress) onProgress(i + 1, 100);

      const pollRes = await fetch(pollUrl, {
        headers: { 'Authorization': `Key ${fKey}` }
      });
      if (!pollRes.ok) continue;

      const result = await pollRes.json();
      const status = result.status;

      if (status === 'FAILED') throw new Error(result.error || 'fal.ai: geração falhou.');

      if (status === 'COMPLETED') {
        const output = result.output || result;
        const videoUrl = output?.video?.url
          || output?.videos?.[0]?.url
          || output?.video_url
          || null;
        if (!videoUrl) throw new Error('fal.ai: URL de vídeo não encontrada na resposta.');
        return { url: videoUrl, isExternal: true };
      }
      // IN_QUEUE ou IN_PROGRESS — continuar
    }
    throw new Error('Timeout: fal.ai demorou mais de 10 minutos.');
  }

  /* ── Legenda por plataforma ── */
  async function generateCaption(avatar, topic, referenceImages = []) {
    const refCtx = referenceImages.length
      ? `\nTens ${referenceImages.length} imagem(ns) de referência do avatar incluídas para contexto visual.`
      : '';
    const prompt = `
Tens o papel de ${avatar.nome}, um criador de conteúdo ${avatar.nicho}.
O teu estilo: ${avatar.prompt_base || 'criativo, envolvente, autêntico'}.${refCtx}

Cria uma legenda cativante para um post sobre: "${topic}"
- Tom: natural, humano, sem parecer gerado por IA
- Comprimento: 2-4 frases
- Inclui 1 chamada à ação subtil
- Devolve APENAS a legenda, sem aspas nem explicações
    `.trim();
    return generateText(prompt, { temperature: 0.9, images: referenceImages });
  }

  /* Gera legendas adaptadas para cada plataforma numa só chamada */
  async function generateCaptionsPerPlatform(avatar, topic, platforms = ['instagram','tiktok','youtube','facebook']) {
    const prompt = `
Tens o papel de ${avatar.nome}, criador de conteúdo de ${avatar.nicho}.
Tema do post: "${topic}"

Gera UMA legenda específica e optimizada para CADA plataforma abaixo.
Adapta o tom, comprimento e estilo a cada plataforma:
- Instagram: emotivo, 3-5 frases, emojis
- TikTok: curto, energético, com gancho inicial, 1-3 frases
- YouTube (descrição): detalhado, inclui palavras-chave SEO, 3-5 frases
- Facebook: conversacional, promove interação com pergunta, 3-4 frases

Responde APENAS em JSON válido com a estrutura:
{ "instagram": "...", "tiktok": "...", "youtube": "...", "facebook": "..." }
    `.trim();
    const raw = await generateText(prompt, { temperature: 0.85, maxTokens: 800 });
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      return JSON.parse(match?.[0] || raw);
    } catch {
      return { instagram: raw, tiktok: raw, youtube: raw, facebook: raw };
    }
  }

  async function generateHashtags(nicho, topic, count = 20) {
    const prompt = `
Gera ${count} hashtags relevantes para Instagram/TikTok sobre "${topic}" no nicho "${nicho}".
Mistura hashtags populares (>500k posts) e de nicho (<100k posts).
Formato: apenas as hashtags separadas por espaço, com #, sem texto extra.
    `.trim();
    return generateText(prompt, { temperature: 0.5 });
  }

  /* Sugestão de hashtags baseada em imagem (Pixtral Vision) */
  async function suggestHashtagsFromImage(imageDataUrl, nicho = 'geral') {
    const prompt = `
Analisa esta imagem e gera 20 hashtags relevantes para Instagram/TikTok
no nicho "${nicho}" com base no conteúdo visual.
Formato: apenas as hashtags separadas por espaço, com #, sem explicações.
    `.trim();
    return generateText(prompt, { temperature: 0.5, images: [imageDataUrl] });
  }

  async function generateImagePrompt(avatar, topic) {
    const prompt = `
Cria um prompt em inglês para gerar uma imagem de redes sociais para ${avatar.nome} (${avatar.nicho}) sobre "${topic}".
- Estilo: fotografia profissional, alta qualidade, aesthetically pleasing
- Adequado para Instagram/TikTok
- Sem texto na imagem
- Máximo 100 palavras
- Devolve APENAS o prompt, sem explicações
    `.trim();
    return generateText(prompt, { temperature: 0.7 });
  }

  async function generateVideoPrompt(avatar, topic) {
    const prompt = `
Cria um prompt em inglês para gerar um vídeo curto (até 8 segundos) para redes sociais.
Avatar: "${avatar?.nome || 'criador'}" — nicho: ${avatar?.nicho || 'geral'}
Tema: "${topic}"
${avatar?.prompt_base ? `Estilo do avatar: ${avatar.prompt_base}` : ''}

Regras:
- Máximo 150 palavras
- Descreve cenas visuais concretas com movimento dinâmico
- Indica estilo cinemático (close-up, dolly shot, slow motion, etc.)
- Adequado para formato vertical 9:16 — TikTok / Instagram Reels
- Sem textos sobrepostos nem legendas no vídeo
- Devolve APENAS o prompt, sem explicações
    `.trim();
    return generateText(prompt, { temperature: 0.7, maxTokens: 200 });
  }

  /* Resumo semanal IA — recebe um objecto com dados da semana */
  async function generateWeeklySummary(weekData) {
    const prompt = `
És um analista de marketing de conteúdo. Com base nos dados desta semana:

Posts publicados: ${weekData.postsPublicados || 0}
Posts agendados: ${weekData.postsAgendados || 0}
Total likes: ${weekData.totalLikes || 0}
Total comentários: ${weekData.totalComentarios || 0}
Total visualizações: ${weekData.totalVisualizacoes || 0}
Plataformas ativas: ${weekData.plataformas || 'N/A'}
Receita do mês: €${weekData.receitaMes || 0}
Avatares ativos: ${weekData.avatares || 0}

Gera um resumo semanal conciso (4-6 parágrafos curtos) com:
1. Performance geral (positivo primeiro)
2. Pontos de melhoria
3. Recomendações accionáveis para a próxima semana
4. Motivação final

Tom: profissional mas encorajador. Responde em português.
    `.trim();
    return generateText(prompt, { temperature: 0.8, maxTokens: 600 });
  }

  return {
    generateText,
    generateImage,
    generateVideo,
    generateCaption,
    generateCaptionsPerPlatform,
    generateHashtags,
    suggestHashtagsFromImage,
    generateImagePrompt,
    generateVideoPrompt,
    generateWeeklySummary,
  };
})();

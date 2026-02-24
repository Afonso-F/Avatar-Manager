/* ============================================================
   gemini.js — Gemini API (texto + imagem via Imagen + vídeo via Veo)
   ============================================================ */
const Gemini = (() => {
  const TEXT_MODEL  = 'gemini-1.5-flash';
  const IMAGE_MODEL = 'imagen-3.0-generate-001';
  const VIDEO_MODEL = 'veo-002';
  const BASE        = 'https://generativelanguage.googleapis.com/v1beta';

  function key() { return Config.get('GEMINI'); }

  /* Gerar texto — aceita imagens inline opcionais para contexto multimodal */
  async function generateText(prompt, { temperature = 0.8, maxTokens = 1024, images = [] } = {}) {
    if (!key()) throw new Error('Gemini API key não configurada.');
    const parts = [{ text: prompt }];
    if (images && images.length) {
      images.slice(0, 3).forEach(dataUrl => {
        const [meta, b64] = dataUrl.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
        parts.push({ inlineData: { mimeType, data: b64 } });
      });
    }
    const res = await fetch(`${BASE}/models/${TEXT_MODEL}:generateContent?key=${key()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature, maxOutputTokens: maxTokens }
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${res.status}`);
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /* Gerar imagem via Imagen */
  async function generateImage(prompt, { aspectRatio = '1:1' } = {}) {
    if (!key()) throw new Error('Gemini API key não configurada.');
    const res = await fetch(`${BASE}/models/${IMAGE_MODEL}:predict?key=${key()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio }
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${res.status}`);
    }
    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    const mime = data?.predictions?.[0]?.mimeType || 'image/png';
    if (!b64) throw new Error('Nenhuma imagem gerada.');
    return `data:${mime};base64,${b64}`;
  }

  /* Gerar vídeo via Veo 2 (long-running — pode demorar 1-5 min)
     onProgress(tentativa, total) é chamado a cada poll */
  async function generateVideo(prompt, { aspectRatio = '9:16', onProgress } = {}) {
    if (!key()) throw new Error('Gemini API key não configurada.');

    const startRes = await fetch(`${BASE}/models/${VIDEO_MODEL}:predictLongRunning?key=${key()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { aspectRatio, sampleCount: 1 }
      })
    });
    if (!startRes.ok) {
      const err = await startRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ao iniciar geração de vídeo (${startRes.status})`);
    }
    const opData = await startRes.json();
    const operationName = opData.name;
    if (!operationName) throw new Error('Resposta inválida da API Veo.');

    // Poll a cada 10s, até 5 minutos (30 tentativas)
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 10000));
      if (onProgress) onProgress(i + 1, 30);

      const pollRes = await fetch(`${BASE}/${operationName}?key=${key()}`);
      if (!pollRes.ok) continue; // falha transitória — tentar de novo

      const pollData = await pollRes.json();
      if (!pollData.done) continue;

      if (pollData.error) throw new Error(pollData.error.message || 'Erro na geração de vídeo.');
      const video = pollData.response?.predictions?.[0];
      if (!video?.bytesBase64Encoded) throw new Error('Resposta de vídeo inválida.');
      return `data:video/mp4;base64,${video.bytesBase64Encoded}`;
    }
    throw new Error('Timeout: a geração de vídeo demorou mais de 5 minutos.');
  }

  /* Gerar legenda — aceita imagens de referência do avatar para contexto visual */
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

  async function generateHashtags(nicho, topic, count = 20) {
    const prompt = `
Gera ${count} hashtags relevantes para Instagram/TikTok sobre "${topic}" no nicho "${nicho}".
Mistura hashtags populares (>500k posts) e de nicho (<100k posts).
Formato: apenas as hashtags separadas por espaço, com #, sem texto extra.
    `.trim();
    return generateText(prompt, { temperature: 0.5 });
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

  /* Gerar prompt de vídeo otimizado para Veo */
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

  return { generateText, generateImage, generateVideo, generateCaption, generateHashtags, generateImagePrompt, generateVideoPrompt };
})();

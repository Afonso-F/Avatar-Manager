/* ============================================================
   supabase-client.js — wrapper do cliente Supabase
   ============================================================ */
const DB = (() => {
  let _client = null;

  function init() {
    const url = Config.get('SUPABASE_URL');
    const key = Config.get('SUPABASE_KEY');
    if (!url || !key) { _client = null; return false; }
    try {
      _client = supabase.createClient(url, key);
      return true;
    } catch (e) {
      console.error('Supabase init error:', e);
      _client = null;
      return false;
    }
  }

  function client() { return _client; }
  function ready()  { return !!_client; }

  /* ── Avatares ── */
  async function getAvatares() {
    if (!_client) return { data: [], error: 'not connected' };
    return _client.from('avatares').select('*').order('nome');
  }

  async function upsertAvatar(avatar) {
    if (!_client) return { error: 'not connected' };
    return _client.from('avatares').upsert(avatar).select().single();
  }

  async function deleteAvatar(id) {
    if (!_client) return { error: 'not connected' };
    return _client.from('avatares').delete().eq('id', id);
  }

  async function updateAvatarRefImages(id, urls) {
    if (!_client) return { error: 'not connected' };
    return _client.from('avatares').update({ imagens_referencia: urls }).eq('id', id);
  }

  /* ── Posts ── */
  async function getPosts({ status, avatar_id, limit = 50, offset = 0 } = {}) {
    if (!_client) return { data: [], error: 'not connected' };
    let q = _client.from('posts').select('*, avatares(nome, nicho)').order('agendado_para', { ascending: true });
    if (status)    q = q.eq('status', status);
    if (avatar_id) q = q.eq('avatar_id', avatar_id);
    q = q.range(offset, offset + limit - 1);
    return q;
  }

  async function upsertPost(post) {
    if (!_client) return { error: 'not connected' };
    return _client.from('posts').upsert(post).select().single();
  }

  async function deletePost(id) {
    if (!_client) return { error: 'not connected' };
    return _client.from('posts').delete().eq('id', id);
  }

  async function updatePostStatus(id, status) {
    if (!_client) return { error: 'not connected' };
    return _client.from('posts').update({ status }).eq('id', id).select().single();
  }

  /* ── Publicados ── */
  async function getPublicados({ avatar_id, plataforma, search, limit = 20, offset = 0 } = {}) {
    if (!_client) return { data: [], count: 0, error: 'not connected' };
    // Use !inner when searching so PostgREST applies the filter as an INNER JOIN,
    // otherwise the ilike on the embedded resource is ignored (LEFT JOIN behaviour).
    const postsJoin = search ? 'posts!inner(legenda, imagem_url, hashtags)' : 'posts(legenda, imagem_url, hashtags)';
    let q = _client.from('publicados')
      .select(`*, ${postsJoin}, avatares(nome)`, { count: 'exact' })
      .order('publicado_em', { ascending: false });
    if (avatar_id)   q = q.eq('avatar_id', avatar_id);
    if (plataforma)  q = q.eq('plataforma', plataforma);
    if (search)      q = q.filter('posts.legenda', 'ilike', `%${search}%`);
    q = q.range(offset, offset + limit - 1);
    return q;
  }

  /* ── Contas ── */
  async function getContas(avatar_id) {
    if (!_client) return { data: [], error: 'not connected' };
    let q = _client.from('contas').select('*').order('plataforma');
    if (avatar_id) q = q.eq('avatar_id', avatar_id);
    return q;
  }

  async function upsertConta(conta) {
    if (!_client) return { error: 'not connected' };
    return _client.from('contas').upsert(conta, { onConflict: 'avatar_id,plataforma' }).select().single();
  }

  async function deleteConta(id) {
    if (!_client) return { error: 'not connected' };
    return _client.from('contas').delete().eq('id', id);
  }

  /* ── YouTube Channels ── */
  async function getYoutubeChannels() {
    if (!_client) return { data: [], error: 'not connected' };
    return _client.from('youtube_channels').select('*').order('nome');
  }

  async function upsertYoutubeChannel(channel) {
    if (!_client) return { error: 'not connected' };
    return _client.from('youtube_channels').upsert(channel).select().single();
  }

  async function deleteYoutubeChannel(id) {
    if (!_client) return { error: 'not connected' };
    return _client.from('youtube_channels').delete().eq('id', id);
  }

  /* ── YouTube Videos ── */
  async function getYoutubeVideos(channelId) {
    if (!_client) return { data: [], error: 'not connected' };
    return _client.from('youtube_videos').select('*').eq('channel_id', channelId).order('publicado_em', { ascending: false });
  }

  async function upsertYoutubeVideo(video) {
    if (!_client) return { error: 'not connected' };
    return _client.from('youtube_videos').upsert(video).select().single();
  }

  async function deleteYoutubeVideo(id) {
    if (!_client) return { error: 'not connected' };
    return _client.from('youtube_videos').delete().eq('id', id);
  }

  /* ── Músicos ── */
  async function getMusicos() {
    if (!_client) return { data: [], error: 'not connected' };
    return _client.from('musicos').select('*').order('nome');
  }

  async function upsertMusico(musico) {
    if (!_client) return { error: 'not connected' };
    return _client.from('musicos').upsert(musico).select().single();
  }

  async function deleteMusico(id) {
    if (!_client) return { error: 'not connected' };
    return _client.from('musicos').delete().eq('id', id);
  }

  /* ── Musico Tracks ── */
  async function getMusicoTracks(musicoId) {
    if (!_client) return { data: [], error: 'not connected' };
    return _client.from('musico_tracks').select('*').eq('musico_id', musicoId).order('streams', { ascending: false });
  }

  async function upsertMusicoTrack(track) {
    if (!_client) return { error: 'not connected' };
    return _client.from('musico_tracks').upsert(track).select().single();
  }

  async function deleteMusicoTrack(id) {
    if (!_client) return { error: 'not connected' };
    return _client.from('musico_tracks').delete().eq('id', id);
  }

  /* ── Fansly Stats ── */
  async function getFanslyStats(avatarId, mes) {
    if (!_client) return { data: [], error: 'not connected' };
    let q = _client.from('fansly_stats').select('*').order('mes', { ascending: false });
    if (avatarId) q = q.eq('avatar_id', avatarId);
    if (mes)      q = q.eq('mes', mes);
    return q;
  }

  async function upsertFanslyStats(stats) {
    if (!_client) return { error: 'not connected' };
    return _client.from('fansly_stats').upsert(stats, { onConflict: 'avatar_id,mes' }).select().single();
  }

  /* ── Analytics ── */
  async function getAnalytics(avatar_id) {
    if (!_client) return { data: [], error: 'not connected' };
    let q = _client.from('publicados')
      .select('plataforma, likes, comentarios, partilhas, visualizacoes, publicado_em');
    if (avatar_id) q = q.eq('avatar_id', avatar_id);
    return q.order('publicado_em', { ascending: false }).limit(200);
  }

  /* ── Auth ── */
  async function signIn(email, password) {
    if (!_client) return { error: { message: 'Supabase não configurado' } };
    return _client.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    if (!_client) return;
    return _client.auth.signOut();
  }

  async function getSession() {
    if (!_client) return null;
    const { data } = await _client.auth.getSession();
    return data?.session || null;
  }

  function onAuthStateChange(callback) {
    if (!_client) return;
    _client.auth.onAuthStateChange(callback);
  }

  /* ── Storage ── */
  async function uploadPostImage(dataUrl, filename) {
    if (!_client) return { error: 'not connected' };
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/:(.*?);/)[1];
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const ext  = mime.split('/')[1]?.split('+')[0] || 'png';
    const path = `${filename || Date.now()}.${ext}`;

    const { error } = await _client.storage.from('post-images').upload(path, blob, { contentType: mime, upsert: true });
    if (error) return { error };

    const { data: urlData } = _client.storage.from('post-images').getPublicUrl(path);
    return { url: urlData?.publicUrl };
  }

  /* Upload de imagem de referência para um avatar */
  async function uploadAvatarReferenceImage(dataUrl, avatarId) {
    if (!_client) return { error: 'not connected' };
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/:(.*?);/)[1];
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const ext  = mime.split('/')[1]?.split('+')[0] || 'jpg';
    const path = `${avatarId}/${Date.now()}.${ext}`;

    const { error } = await _client.storage.from('avatar-references').upload(path, blob, { contentType: mime, upsert: false });
    if (error) return { error };

    const { data: urlData } = _client.storage.from('avatar-references').getPublicUrl(path);
    return { url: urlData?.publicUrl };
  }

  /* Upload de vídeo gerado/carregado para um post */
  async function uploadPostVideo(dataUrl, filename) {
    if (!_client) return { error: 'not connected' };
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/:(.*?);/)[1];
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const ext  = mime.split('/')[1]?.split('+')[0] || 'mp4';
    const path = `${filename || Date.now()}.${ext}`;

    const { error } = await _client.storage.from('post-videos').upload(path, blob, { contentType: mime, upsert: true });
    if (error) return { error };

    const { data: urlData } = _client.storage.from('post-videos').getPublicUrl(path);
    return { url: urlData?.publicUrl };
  }

  return { init, client, ready, getAvatares, upsertAvatar, deleteAvatar, updateAvatarRefImages, getPosts, upsertPost, deletePost, updatePostStatus, getPublicados, getAnalytics, getContas, upsertConta, deleteConta, signIn, signOut, getSession, onAuthStateChange, uploadPostImage, uploadAvatarReferenceImage, uploadPostVideo, getYoutubeChannels, upsertYoutubeChannel, deleteYoutubeChannel, getYoutubeVideos, upsertYoutubeVideo, deleteYoutubeVideo, getMusicos, upsertMusico, deleteMusico, getMusicoTracks, upsertMusicoTrack, deleteMusicoTrack, getFanslyStats, upsertFanslyStats };
})();

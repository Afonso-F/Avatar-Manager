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
    let q = _client.from('publicados')
      .select('*, posts(legenda, imagem_url, hashtags), avatares(nome)', { count: 'exact' })
      .order('publicado_em', { ascending: false });
    if (avatar_id)   q = q.eq('avatar_id', avatar_id);
    if (plataforma)  q = q.eq('plataforma', plataforma);
    if (search)      q = q.ilike('posts.legenda', `%${search}%`);
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

    const { error } = await _client.storage.from('post-images').upload(path, blob, { contentType: mime, upsert: false });
    if (error) return { error };

    const { data: urlData } = _client.storage.from('post-images').getPublicUrl(path);
    return { url: urlData?.publicUrl };
  }

  return { init, client, ready, getAvatares, upsertAvatar, deleteAvatar, getPosts, upsertPost, deletePost, updatePostStatus, getPublicados, getAnalytics, getContas, upsertConta, deleteConta, signIn, signOut, getSession, onAuthStateChange, uploadPostImage };
})();

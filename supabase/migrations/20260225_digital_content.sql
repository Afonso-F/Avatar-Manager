-- ============================================================
-- Digital Content Hub — Migração de conteúdos digitais
-- Adiciona: youtube_channels, musicos, fansly_stats,
--           youtube_videos, musico_tracks
-- ============================================================

-- ── YouTube Channels ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS youtube_channels (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome            TEXT NOT NULL,
  canal_id        TEXT,
  imagem_url      TEXT,
  descricao       TEXT,
  nicho           TEXT,
  seguidores      INTEGER DEFAULT 0,
  total_views     BIGINT  DEFAULT 0,
  videos_count    INTEGER DEFAULT 0,
  receita_mes     NUMERIC(10,2) DEFAULT 0,
  adsense_rpm     NUMERIC(10,2) DEFAULT 2.00,
  acesso_token    TEXT,
  notas           TEXT,
  ativo           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_youtube_channels" ON youtube_channels
  USING (auth.role() = 'authenticated');

-- ── Músicos / Bandas ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS musicos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome              TEXT NOT NULL,
  tipo              TEXT DEFAULT 'musico',   -- 'musico' | 'banda'
  genero            TEXT,
  imagem_url        TEXT,
  descricao         TEXT,
  ouvintes_mensais  INTEGER DEFAULT 0,
  total_streams     BIGINT  DEFAULT 0,
  seguidores        INTEGER DEFAULT 0,
  receita_mes       NUMERIC(10,2) DEFAULT 0,
  spotify_id        TEXT,
  apple_music_id    TEXT,
  plataformas       JSONB DEFAULT '[]',
  notas             TEXT,
  ativo             BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE musicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_musicos" ON musicos
  USING (auth.role() = 'authenticated');

-- ── Fansly Stats (por avatar, por mês) ───────────────────────
CREATE TABLE IF NOT EXISTS fansly_stats (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id    UUID REFERENCES avatares(id) ON DELETE CASCADE,
  mes          DATE NOT NULL,            -- primeiro dia do mês
  subscribers  INTEGER DEFAULT 0,
  novos_subs   INTEGER DEFAULT 0,
  receita      NUMERIC(10,2) DEFAULT 0,
  tips         NUMERIC(10,2) DEFAULT 0,
  views        INTEGER DEFAULT 0,
  notas        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(avatar_id, mes)
);

ALTER TABLE fansly_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_fansly_stats" ON fansly_stats
  USING (auth.role() = 'authenticated');

-- ── YouTube Videos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS youtube_videos (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id        UUID REFERENCES youtube_channels(id) ON DELETE CASCADE,
  titulo            TEXT NOT NULL,
  video_id          TEXT,
  thumbnail_url     TEXT,
  views             BIGINT  DEFAULT 0,
  likes             INTEGER DEFAULT 0,
  comentarios       INTEGER DEFAULT 0,
  duracao           TEXT,
  publicado_em      TIMESTAMPTZ,
  receita_estimada  NUMERIC(10,2) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_youtube_videos" ON youtube_videos
  USING (auth.role() = 'authenticated');

-- ── Musico Tracks ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS musico_tracks (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  musico_id    UUID REFERENCES musicos(id) ON DELETE CASCADE,
  titulo       TEXT NOT NULL,
  album        TEXT,
  capa_url     TEXT,
  streams      BIGINT  DEFAULT 0,
  plataforma   TEXT DEFAULT 'spotify',
  receita      NUMERIC(10,2) DEFAULT 0,
  publicado_em DATE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE musico_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_musico_tracks" ON musico_tracks
  USING (auth.role() = 'authenticated');

-- ============================================================
-- AvatarStudio — Supabase Schema
-- Cria as tabelas necessárias no teu projecto Supabase
-- ============================================================

-- Habilitar UUID
create extension if not exists "pgcrypto";

-- ── Tabela: avatares ─────────────────────────────────────────
create table if not exists avatares (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  nicho         text not null,
  emoji         text,
  prompt_base   text,
  plataformas   text[] default '{}',
  imagem_url    text,
  ativo         boolean default true,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Seed de avatares padrão
insert into avatares (nome, nicho, emoji, prompt_base, plataformas) values
  ('Luna', 'Lifestyle & Wellness',  '🌙', 'Criativa, positiva, inspira o bem-estar e autenticidade',       array['instagram','tiktok']),
  ('Aria', 'Tech & Productivity',   '⚡', 'Analítica, clara, simplifica tecnologia e produtividade',        array['instagram','youtube']),
  ('Zara', 'Fashion & Beauty',      '✨', 'Elegante, trendy, apaixonada por moda sustentável',              array['instagram','tiktok','facebook']),
  ('Nova', 'Fitness & Nutrition',   '🔥', 'Energética, motivadora, foco em saúde real e sem filtros',      array['instagram','youtube'])
on conflict do nothing;

-- ── Tabela: posts ────────────────────────────────────────────
create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  avatar_id     uuid references avatares(id) on delete set null,
  legenda       text,
  hashtags      text,
  imagem_url    text,
  plataformas   text[] default '{}',
  status        text default 'rascunho' check (status in ('rascunho','agendado','publicado','erro')),
  agendado_para timestamptz,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- Índices para posts
create index if not exists posts_status_idx        on posts(status);
create index if not exists posts_agendado_para_idx on posts(agendado_para);
create index if not exists posts_avatar_id_idx     on posts(avatar_id);

-- ── Tabela: publicados ───────────────────────────────────────
create table if not exists publicados (
  id             uuid primary key default gen_random_uuid(),
  post_id        uuid references posts(id) on delete set null,
  avatar_id      uuid references avatares(id) on delete set null,
  plataforma     text not null,
  publicado_em   timestamptz default now(),
  post_id_social text,           -- ID do post na rede social
  url_post       text,           -- URL do post publicado
  likes          integer default 0,
  comentarios    integer default 0,
  partilhas      integer default 0,
  visualizacoes  integer default 0,
  criado_em      timestamptz default now()
);

-- Índices para publicados
create index if not exists publicados_avatar_id_idx   on publicados(avatar_id);
create index if not exists publicados_plataforma_idx  on publicados(plataforma);
create index if not exists publicados_publicado_em_idx on publicados(publicado_em desc);

-- ── Row Level Security ───────────────────────────────────────
alter table avatares  enable row level security;
alter table posts     enable row level security;
alter table publicados enable row level security;

-- Política: permitir tudo para utilizadores autenticados (ajusta conforme necessário)
create policy "Allow all for authenticated" on avatares
  for all using (true) with check (true);

create policy "Allow all for authenticated" on posts
  for all using (true) with check (true);

create policy "Allow all for authenticated" on publicados
  for all using (true) with check (true);

-- ── Trigger: atualizar timestamp ─────────────────────────────
create or replace function update_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

create trigger avatares_updated before update on avatares
  for each row execute function update_atualizado_em();

create trigger posts_updated before update on posts
  for each row execute function update_atualizado_em();

-- ── View: analytics ──────────────────────────────────────────
create or replace view analytics_resumo as
select
  p.plataforma,
  av.nome                         as avatar_nome,
  count(*)                        as total_posts,
  sum(p.likes)                    as total_likes,
  sum(p.comentarios)              as total_comentarios,
  sum(p.visualizacoes)            as total_views,
  round(avg(p.likes)::numeric, 0) as media_likes,
  date_trunc('week', p.publicado_em) as semana
from publicados p
left join avatares av on av.id = p.avatar_id
group by p.plataforma, av.nome, semana
order by semana desc;

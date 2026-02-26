-- ============================================================
-- Novas plataformas de monetização
-- OnlyFans, Patreon, Twitch, Afiliados, Vendas Diretas
-- ============================================================

-- ── OnlyFans Stats (por avatar, por mês) ──────────────────
create table if not exists onlyfans_stats (
  id          uuid primary key default gen_random_uuid(),
  avatar_id   uuid references avatares(id) on delete cascade,
  mes         date not null,
  subscribers integer default 0,
  receita     numeric(10,2) default 0,
  tips        numeric(10,2) default 0,
  ppv_receita numeric(10,2) default 0,
  criado_em   timestamptz default now(),
  unique (avatar_id, mes)
);

-- ── Patreon Stats (global, por mês) ───────────────────────
create table if not exists patreon_stats (
  id          uuid primary key default gen_random_uuid(),
  mes         date not null unique,
  patrons     integer default 0,
  receita     numeric(10,2) default 0,
  tier1_patrons integer default 0,
  tier2_patrons integer default 0,
  tier3_patrons integer default 0,
  notas       text,
  criado_em   timestamptz default now()
);

-- ── Twitch Stats (global, por mês) ────────────────────────
create table if not exists twitch_stats (
  id              uuid primary key default gen_random_uuid(),
  mes             date not null unique,
  subscribers     integer default 0,
  bits_receita    numeric(10,2) default 0,
  donations_receita numeric(10,2) default 0,
  ad_receita      numeric(10,2) default 0,
  viewers_medio   integer default 0,
  horas_stream    integer default 0,
  notas           text,
  criado_em       timestamptz default now()
);

-- ── Afiliados (programas de afiliação) ────────────────────
create table if not exists afiliados (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  plataforma  text not null,
  codigo      text,
  url_link    text,
  comissao_pct numeric(5,2) default 0,
  cliques     integer default 0,
  conversoes  integer default 0,
  receita     numeric(10,2) default 0,
  ativo       boolean default true,
  notas       text,
  criado_em   timestamptz default now()
);

-- ── Vendas Diretas (produtos/serviços digitais) ───────────
create table if not exists vendas_diretas (
  id            uuid primary key default gen_random_uuid(),
  produto       text not null,
  tipo          text not null default 'digital',  -- digital, fisico, servico
  plataforma    text not null default 'outro',    -- gumroad, shopify, etsy, proprio, outro
  quantidade    integer default 1,
  preco_unitario numeric(10,2) default 0,
  receita_total numeric(10,2) default 0,
  data          date default current_date,
  notas         text,
  criado_em     timestamptz default now()
);

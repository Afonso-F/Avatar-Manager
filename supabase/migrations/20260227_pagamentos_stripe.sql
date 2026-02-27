-- ============================================================
-- Pagamentos / Stripe Connect
-- Contas bancárias dos avatares e histórico de levantamentos
-- ============================================================

-- ── Contas Bancárias ──────────────────────────────────────────
-- Cada avatar ou canal YouTube pode ter uma ou mais contas
-- bancárias associadas para receber levantamentos.

create table if not exists contas_bancarias (
  id                          uuid primary key default gen_random_uuid(),
  avatar_id                   uuid references avatares(id) on delete cascade,
  youtube_channel_id          uuid references youtube_channels(id) on delete cascade,
  titular                     text not null,
  banco                       text,
  iban                        text not null,
  bic                         text,
  country                     char(2) not null default 'PT',
  currency                    char(3) not null default 'eur',
  -- Stripe Connect
  stripe_account_id           text,           -- acct_xxx (connected account)
  stripe_external_account_id  text,           -- ba_xxx (bank account on Stripe)
  criado_em                   timestamptz default now(),
  atualizado_em               timestamptz default now(),

  -- Uma conta pertence a um avatar OU a um canal, nunca a ambos
  constraint conta_tem_um_dono check (
    (avatar_id is not null)::int + (youtube_channel_id is not null)::int = 1
  )
);

create index if not exists idx_contas_bancarias_avatar
  on contas_bancarias(avatar_id) where avatar_id is not null;

create index if not exists idx_contas_bancarias_youtube
  on contas_bancarias(youtube_channel_id) where youtube_channel_id is not null;

-- Auto-actualiza atualizado_em
create or replace function _touch_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_contas_bancarias_touch
  before update on contas_bancarias
  for each row execute function _touch_atualizado_em();


-- ── Levantamentos ─────────────────────────────────────────────
-- Histórico de todos os pedidos de levantamento (payouts).
-- montante está em cêntimos (ex: 10000 = 100,00 EUR)

create table if not exists levantamentos (
  id                  uuid primary key default gen_random_uuid(),
  avatar_id           uuid references avatares(id) on delete set null,
  youtube_channel_id  uuid references youtube_channels(id) on delete set null,
  conta_bancaria_id   uuid references contas_bancarias(id) on delete set null,
  montante            integer not null check (montante > 0),  -- cêntimos
  moeda               char(3) not null default 'eur',
  status              text not null default 'pending'
                        check (status in ('pending','in_transit','paid','failed','canceled','manual')),
  stripe_payout_id    text,           -- payout_xxx devolvido pelo Stripe
  descricao           text,
  criado_em           timestamptz default now(),
  atualizado_em       timestamptz default now()
);

create index if not exists idx_levantamentos_avatar
  on levantamentos(avatar_id) where avatar_id is not null;

create index if not exists idx_levantamentos_youtube
  on levantamentos(youtube_channel_id) where youtube_channel_id is not null;

create index if not exists idx_levantamentos_status
  on levantamentos(status);

create trigger trg_levantamentos_touch
  before update on levantamentos
  for each row execute function _touch_atualizado_em();


-- ── Row Level Security ────────────────────────────────────────
-- Apenas utilizadores autenticados podem ver/editar os seus dados.

alter table contas_bancarias enable row level security;
alter table levantamentos     enable row level security;

-- Política simples: utilizador autenticado vê tudo (single-tenant app)
create policy "Authenticated users full access"
  on contas_bancarias for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users full access"
  on levantamentos for all
  to authenticated
  using (true)
  with check (true);

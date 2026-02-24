-- ============================================================
-- Conta Mestre — utilizador administrador protegido
-- ============================================================

-- ── Perfis (roles de utilizador) ─────────────────────────────
create table if not exists perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'user' check (role in ('master', 'admin', 'user')),
  criado_em  timestamptz default now()
);

alter table perfis enable row level security;

-- Só o próprio utilizador pode ver o seu perfil
create policy "Utilizador vê o seu próprio perfil" on perfis
  for select using (auth.uid() = id);

-- Só o master pode fazer tudo
create policy "Master tem acesso total" on perfis
  for all using (
    exists (
      select 1 from perfis p
      where p.id = auth.uid() and p.role = 'master'
    )
  );

-- ── Criar utilizador mestre em auth.users ────────────────────
-- Password armazenada apenas como hash bcrypt (sem texto simples)
do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  -- Só cria se ainda não existir
  if not exists (
    select 1 from auth.users where email = 'afonsoferreira212@gmail.com'
  ) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'afonsoferreira212@gmail.com',
      '$2b$12$.C.nwFKqYqGcWB5CIbD9ueWiIMzTSb6OJxFu1Ieq16zQEOMqGTDuq',
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"master"}',
      now(),
      now()
    );

    -- Criar perfil master associado
    insert into perfis (id, role)
    values (v_user_id, 'master');
  end if;
end $$;

-- ── Restringir RLS para apenas o utilizador autenticado ──────
-- Atualizar as políticas existentes para só permitir ao dono autenticado

-- avatares: só o utilizador autenticado
drop policy if exists "Allow all for authenticated" on avatares;
create policy "Só autenticado" on avatares
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- posts
drop policy if exists "Allow all for authenticated" on posts;
create policy "Só autenticado" on posts
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- publicados
drop policy if exists "Allow all for authenticated" on publicados;
create policy "Só autenticado" on publicados
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- contas
drop policy if exists "Allow all for authenticated" on contas;
create policy "Só autenticado" on contas
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

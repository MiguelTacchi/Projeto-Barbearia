-- ============================================================
-- SCHEMA NOVO (versão HTML puro + Supabase Auth)
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Limpa tabelas antigas se existirem
drop table if exists public.agendamentos cascade;
drop table if exists public.servicos cascade;
drop table if exists public.perfis cascade;
drop table if exists public.usuarios cascade;

-- Perfis dos usuários (ligado ao sistema de login do Supabase)
create table public.perfis (
  id    uuid references auth.users(id) on delete cascade primary key,
  nome  text not null,
  tipo  text not null check (tipo in ('cliente', 'barbeiro')),
  criado_em timestamptz default now()
);

-- Serviços oferecidos
create table public.servicos (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  duracao_minutos  integer not null default 60,
  preco            numeric(10,2) not null
);

-- Agendamentos
create table public.agendamentos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid references auth.users(id) on delete cascade not null,
  servico_id  uuid references public.servicos(id) not null,
  data        date not null,
  horario     text not null,
  status      text not null default 'pendente'
              check (status in ('pendente', 'confirmado', 'concluido', 'cancelado')),
  criado_em   timestamptz default now()
);

-- Índices
create index on public.agendamentos(data);
create index on public.agendamentos(cliente_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.perfis      enable row level security;
alter table public.servicos    enable row level security;
alter table public.agendamentos enable row level security;

-- Perfis: qualquer um pode ler, só o dono pode criar/editar
create policy "perfis_ler"    on public.perfis for select using (true);
create policy "perfis_criar"  on public.perfis for insert with check (auth.uid() = id);

-- Serviços: todos podem ler
create policy "servicos_ler"  on public.servicos for select using (true);

-- Agendamentos: cliente vê os próprios / barbeiro vê todos
create policy "ag_ler" on public.agendamentos for select using (
  auth.uid() = cliente_id or
  exists (select 1 from public.perfis where id = auth.uid() and tipo = 'barbeiro')
);
create policy "ag_criar" on public.agendamentos for insert with check (
  auth.uid() = cliente_id
);
create policy "ag_atualizar" on public.agendamentos for update using (
  exists (select 1 from public.perfis where id = auth.uid() and tipo = 'barbeiro')
);

-- ============================================================
-- Dados iniciais
-- ============================================================
insert into public.servicos (nome, duracao_minutos, preco) values
  ('Corte',        60, 35.00),
  ('Barba',        60, 25.00),
  ('Corte + Barba', 60, 55.00);

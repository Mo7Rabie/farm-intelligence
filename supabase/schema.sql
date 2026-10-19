-- Farm Intelligence — Phase 1 schema (multi-tenant + RLS)

create extension if not exists "pgcrypto";

create type public.member_role as enum
  ('owner','farm_manager','accountant','supervisor','analyst','viewer');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  location text,
  area numeric check (area is null or area >= 0),
  area_unit text not null default 'feddan',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  area numeric check (area is null or area >= 0),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete restrict,
  field_id uuid references public.fields(id) on delete set null,
  expense_date date not null,
  category text not null,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'AED',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index on public.organization_members (user_id);
create index on public.farms (organization_id);
create index on public.fields (farm_id);
create index on public.expenses (organization_id, expense_date);
create index on public.expenses (farm_id);

-- Helper functions (security definer so RLS policies don't recurse)
create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members
                 where organization_id = org and user_id = auth.uid());
$$;

create or replace function public.has_org_role(org uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members
                 where organization_id = org and user_id = auth.uid()
                   and role = any(roles));
$$;

-- Create an organization and make the caller its owner (atomic)
create or replace function public.create_organization(org_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.organizations (name) values (org_name) returning id into new_id;
  insert into public.organization_members (organization_id, user_id, role)
    values (new_id, auth.uid(), 'owner');
  return new_id;
end $$;

-- Row Level Security
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.farms enable row level security;
alter table public.fields enable row level security;
alter table public.expenses enable row level security;

create policy org_select on public.organizations for select
  using (public.is_org_member(id));
create policy org_update on public.organizations for update
  using (public.has_org_role(id, array['owner']::public.member_role[]));

create policy members_select on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy farms_select on public.farms for select
  using (public.is_org_member(organization_id));
create policy farms_write on public.farms for all
  using (public.has_org_role(organization_id, array['owner','farm_manager']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','farm_manager']::public.member_role[]));

create policy fields_select on public.fields for select
  using (public.is_org_member(organization_id));
create policy fields_write on public.fields for all
  using (public.has_org_role(organization_id, array['owner','farm_manager']::public.member_role[]))
  with check (
    public.has_org_role(organization_id, array['owner','farm_manager']::public.member_role[])
    and exists (select 1 from public.farms f
                where f.id = farm_id and f.organization_id = fields.organization_id));

create policy expenses_select on public.expenses for select
  using (public.is_org_member(organization_id));
create policy expenses_write on public.expenses for all
  using (public.has_org_role(organization_id, array['owner','farm_manager','accountant']::public.member_role[]))
  with check (
    public.has_org_role(organization_id, array['owner','farm_manager','accountant']::public.member_role[])
    and exists (select 1 from public.farms f
                where f.id = farm_id and f.organization_id = expenses.organization_id));

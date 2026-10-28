-- Evidence zakázek (Kali Gravka): schéma pro Supabase.
-- Spusťte celé v Supabase → SQL Editor → New query → Run. Lze spustit opakovaně.

create table if not exists public.orders (
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id               text not null,                 -- číslo zakázky, např. #2026-014
  uuid             text,                          -- neměnná identita zakázky (řeší shodu čísel z více zařízení)
  created_at       date not null,
  customer_name    text not null default '',
  customer_contact text not null default '',
  delivery_method  text not null default 'shipping' check (delivery_method in ('shipping', 'pickup')),
  delivery_address text not null default '',
  deadline         date,
  status           text not null check (status in ('Přijato', 'Hotovo', 'Odesláno', 'Odevzdáno', 'Stornováno')),
  pricing_mode     text not null check (pricing_mode in ('per_item', 'total_manual')),
  price_total      numeric(12, 2) not null default 0,
  paid             boolean not null default false,
  items            jsonb not null default '[]'::jsonb,  -- výrobky zakázky
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,                   -- vyplněno = smazáno (smazání se přenese na další zařízení)
  primary key (user_id, id)
);

create table if not exists public.product_types (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         bigint not null,
  name       text not null,
  is_active  boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists orders_user_updated_idx on public.orders (user_id, updated_at desc);

-- Zabezpečení na úrovni řádků: přihlášený uživatel vidí a mění jen svoje řádky.
alter table public.orders enable row level security;
alter table public.product_types enable row level security;

drop policy if exists "orders: vlastník" on public.orders;
create policy "orders: vlastník" on public.orders
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "product_types: vlastník" on public.product_types;
create policy "product_types: vlastník" on public.product_types
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Nepřihlášený (anon) klíč k tabulkám nemá žádný přístup.
revoke all on public.orders from anon;
revoke all on public.product_types from anon;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.product_types to authenticated;

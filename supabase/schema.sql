-- MarketplaceForge Schema
-- Run this in your Supabase SQL editor

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  global_stock int not null default 0,
  created_at timestamptz default now()
);

create table if not exists platform_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  platform text not null check (platform in ('shopify', 'amazon')),
  price float not null default 0,
  stock int not null default 0,
  updated_at timestamptz default now()
);

-- Seed: one product, two platform listings
insert into products (id, name, global_stock)
values ('00000000-0000-0000-0000-000000000001', 'Wireless Earbuds Pro', 100);

insert into platform_listings (product_id, platform, price, stock)
values
  ('00000000-0000-0000-0000-000000000001', 'shopify', 49.99, 60),
  ('00000000-0000-0000-0000-000000000001', 'amazon', 47.99, 40);

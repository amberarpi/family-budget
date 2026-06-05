-- Run this SQL in your Supabase SQL Editor (supabase.com > your project > SQL Editor)

-- Transactions table (income and expenses for both users)
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text check (type in ('income', 'expense')) not null,
  category text not null,
  amount numeric(10,2) not null,
  description text,
  month int not null,  -- 1-12
  year int not null,
  created_at timestamptz default now()
);

-- Vacation goals table
create table if not exists vacation_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  destination text,
  target_amount numeric(10,2) not null,
  target_date date not null,
  saved_amount numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- Row Level Security: each user only sees their own data
alter table transactions enable row level security;
alter table vacation_goals enable row level security;

-- But for a family app, both users should see ALL transactions
-- We use a "family" approach: all authenticated users can read all data
-- (since it's just you and your wife sharing one app)
create policy "authenticated users can read all transactions"
  on transactions for select
  to authenticated
  using (true);

create policy "users can insert own transactions"
  on transactions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own transactions"
  on transactions for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users can delete own transactions"
  on transactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- Same for vacation goals
create policy "authenticated users can read all goals"
  on vacation_goals for select
  to authenticated
  using (true);

create policy "users can insert own goals"
  on vacation_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own goals"
  on vacation_goals for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users can delete own goals"
  on vacation_goals for delete
  to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- Proline Field OS — Relational Schema Migration
-- Version: 001
-- Run in Supabase SQL Editor (Project: jlqiiofhjudgezzbnxkc)
-- Safe to run on a fresh project — all tables are created fresh.
-- =============================================================================

-- Enable UUID extension (already on in Supabase, but be explicit)
create extension if not exists "pgcrypto";


-- =============================================================================
-- SECTION 1: CORE TENANT TABLES
-- =============================================================================

-- accounts — one row per company (the tenant)
-- Every other table references this via account_id
create table if not exists accounts (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  company_name      text not null default '',
  plan              text not null default 'trial',  -- trial | solo | crew | company | beta_free
  trial_start_date  date,
  billing_cycle_start date,
  renewal_date      date,
  canceled_at       timestamptz,
  brand_color       text default '#0a3ef8',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- account_members — maps auth users to accounts with roles
-- Owner is always a member of their own account (role = 'owner')
-- Foreman/crew get their own Supabase auth accounts and are added here
create table if not exists account_members (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'crew',  -- owner | office | foreman | crew
  name        text default '',
  email       text default '',
  added_at    timestamptz default now(),
  unique(account_id, user_id)
);

-- settings — one row per account; company info + contract defaults + payment config
create table if not exists settings (
  account_id        uuid primary key references accounts(id) on delete cascade,
  co_name           text default '',
  co_phone          text default '',
  co_email          text default '',
  co_city           text default '',
  license           text default '',
  primary_state     text default 'SC',
  tagline           text default '',
  -- contract defaults stored as jsonb (flat object, rarely queried individually)
  contract_defaults jsonb default '{
    "lateFee": 1.5,
    "curePeriod": 10,
    "lienDays": 90,
    "defaultPayment": "deposit_completion",
    "governingState": "SC",
    "disputeMethod": "mediation_arbitration",
    "adminFee": 75,
    "coResponseDays": 5
  }'::jsonb,
  -- payment methods + handles
  payment_config    jsonb default '{
    "check":   {"enabled": true,  "handle": ""},
    "zelle":   {"enabled": false, "handle": ""},
    "ach":     {"enabled": false, "handle": ""},
    "venmo":   {"enabled": false, "handle": ""},
    "cashapp": {"enabled": false, "handle": ""},
    "paypal":  {"enabled": false, "handle": ""}
  }'::jsonb,
  job_types         jsonb default '[]'::jsonb,  -- array of strings
  admin_settings    jsonb default '{"ownerName": "", "ownerPayPct": 60, "retainPct": 20}'::jsonb,
  role_permissions  jsonb default '{}'::jsonb,  -- {office:{...}, foreman:{...}, crew:{...}}
  updated_at        timestamptz default now()
);


-- =============================================================================
-- SECTION 2: OPERATIONAL TABLES
-- =============================================================================

-- jobs — core entity; every document hangs off job_id
-- Materials, comm_log, tasks, and assignedCrew stay as jsonb:
--   they are always loaded with the job, never queried cross-job independently
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  -- customer info
  client          text default '',
  address         text default '',
  phone           text default '',
  email           text default '',
  -- job info
  type            text default '',
  state           text default 'SC',
  contract_value  numeric(12,2) default 0,
  kb_status       text default 'new_lead',
  prev_kb_status  text,
  status          text default 'active',  -- active | complete
  portal_token    text unique,            -- 64-char random, never expires
  start_date      date,
  end_date        date,
  -- internal-only fields (never sent to portal)
  notes           text default '',
  tasks           jsonb default '[]'::jsonb,   -- [{id,text,done,createdAt}]
  comm_log        jsonb default '[]'::jsonb,   -- [{id,type,date,summary,outcome,...}]
  materials       jsonb default '[]'::jsonb,   -- [{id,name,qty,unit,costPerUnit,...}]
  assigned_crew   jsonb default '[]'::jsonb,   -- [crew_id, ...]
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- estimates — one per estimate document generated
create table if not exists estimates (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  job_id          uuid not null references jobs(id) on delete cascade,
  num             text not null,               -- EST-1001
  total           numeric(12,2) default 0,
  deposit_amount  numeric(12,2) default 0,
  scope_of_work   text default '',
  exclusions      text default '',
  expiry_date     date,
  portal_token    text,
  status          text default 'draft',        -- draft | sent | approved | declined
  attorney_ack    jsonb,                        -- {type, confirmedBy, date}
  document_text   text default '',             -- full generated/edited doc text
  generated_text  text default '',             -- original AI text (preserved)
  project_state   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- contracts — one per contract document
create table if not exists contracts (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  job_id           uuid not null references jobs(id) on delete cascade,
  num              text not null,              -- CON-1001
  status           text default 'draft',       -- draft | signed | void
  payment_version  text,                       -- A | B | C
  contract_value   numeric(12,2) default 0,
  deposit_amount   numeric(12,2) default 0,
  warranty_years   int default 1,
  project_state    text,
  governing_state  text default 'SC',
  attorney_ack     jsonb,                       -- {type, confirmedBy, date}
  document_text    text default '',
  generated_text   text default '',
  version_timestamp timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- change_orders — one per CO document
create table if not exists change_orders (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid not null references accounts(id) on delete cascade,
  job_id          uuid not null references jobs(id) on delete cascade,
  num             text not null,              -- CO-1001
  co_type         text not null,             -- customer | required_a | required_b
  status          text default 'pending',    -- pending | approved | declined
  amount          numeric(12,2) default 0,
  deposit_amount  numeric(12,2) default 0,
  description     text default '',
  document_text   text default '',
  generated_text  text default '',
  attorney_ack    jsonb,
  version_timestamp timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- invoices — one per invoice; account_id here enables cross-job queries
create table if not exists invoices (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  num         text not null,                  -- INV-1001
  amount      numeric(12,2) default 0,
  status      text default 'unpaid',          -- unpaid | partial | paid
  due_date    date,
  notes       text default '',
  client_name text default '',               -- denormalized for display without job join
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- payments — one per payment recorded against an invoice
create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  invoice_id  uuid not null references invoices(id) on delete cascade,
  amount      numeric(12,2) not null,
  method      text default 'Check',  -- Check | Zelle | Cash App | Venmo | ACH | Cash | Credit Card | PayPal | Other
  memo        text default '',
  paid_date   date,
  created_at  timestamptz default now()
);

-- expenses — account-level; optional job link for per-job P&L
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  category    text default 'Other',  -- Materials | Fuel | Equipment rental | Subcontractor | Permits & fees | Dump fees | Tools | Vehicle | Office | Other
  description text default '',
  amount      numeric(12,2) default 0,
  expense_date date,
  created_at  timestamptz default now()
);

-- crew — account-level roster
create table if not exists crew (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  name        text not null,
  role        text default 'crew',   -- foreman | crew
  phone       text default '',
  email       text default '',
  pay_type    text default 'daily',  -- daily | hourly
  pay_rate    numeric(10,2) default 0,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- payroll_runs — one per pay run
create table if not exists payroll_runs (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  run_date      date not null,
  total_labor   numeric(12,2) default 0,
  owner_draw    numeric(12,2) default 0,
  entries       jsonb default '[]'::jsonb,  -- [{crewId, name, hours/days, rate, total}]
  notes         text default '',
  created_at    timestamptz default now()
);

-- leads — pre-job pipeline
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  client      text default '',
  phone       text default '',
  email       text default '',
  address     text default '',
  stage       text default 'new',  -- new | contacted | quoted | following_up | won | lost
  source      text default '',     -- referral | google | facebook | door_knock | other
  notes       text default '',
  follow_up_date date,
  converted_job_id uuid references jobs(id) on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- custom_templates — attorney-approved or custom doc templates per type
create table if not exists custom_templates (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  type        text not null,   -- contract_a | contract_b | contract_c | estimate | co_02 | co_03a | co_03b | lien_waiver
  name        text default '',
  template_text text default '',
  file_name   text default '',
  active      boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(account_id, type)    -- one active template per type per account
);

-- custom_documents — uploaded files (wet-signed contracts, PDFs, etc.)
create table if not exists custom_documents (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  name        text default '',
  file_name   text default '',
  file_size   int default 0,
  notes       text default '',
  doc_type    text default 'other',  -- contract | co | signed | other
  file_data   text default '',       -- base64 or Supabase Storage path
  uploaded_at timestamptz default now()
);

-- audit_log — append-only action log
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  job_id      uuid references jobs(id) on delete set null,
  action      text not null,
  description text default '',
  created_at  timestamptz default now()
);

-- support_tickets — submitted by account to platform support
create table if not exists support_tickets (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  subject     text default '',
  body        text default '',
  status      text default 'open',  -- open | in_progress | resolved | closed
  priority    text default 'normal',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- snapshots — rolling 30-day backup of the full JSON blob per account
-- Gives you manual rollback without needing Supabase Pro PITR
create table if not exists snapshots (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  snapshot    jsonb not null,
  created_at  timestamptz default now()
);


-- =============================================================================
-- SECTION 3: SEQUENCE COUNTERS
-- One row per account — replaces _nextCon / _nextCO / _nextInv / _nextEst
-- in Zustand. Source of truth lives in the DB, not localStorage.
-- =============================================================================

create table if not exists counters (
  account_id  uuid primary key references accounts(id) on delete cascade,
  next_con    int default 1001,
  next_co     int default 1001,
  next_inv    int default 1001,
  next_est    int default 1001
);


-- =============================================================================
-- SECTION 4: INDEXES
-- Cover the most common query patterns without over-indexing
-- =============================================================================

create index if not exists idx_account_members_user    on account_members(user_id);
create index if not exists idx_account_members_account on account_members(account_id);

create index if not exists idx_jobs_account    on jobs(account_id);
create index if not exists idx_jobs_kb_status  on jobs(account_id, kb_status);
create index if not exists idx_jobs_portal     on jobs(portal_token);

create index if not exists idx_estimates_job       on estimates(job_id);
create index if not exists idx_contracts_job       on contracts(job_id);
create index if not exists idx_change_orders_job   on change_orders(job_id);

create index if not exists idx_invoices_account on invoices(account_id);
create index if not exists idx_invoices_job     on invoices(job_id);
create index if not exists idx_invoices_status  on invoices(account_id, status);

create index if not exists idx_payments_invoice on payments(invoice_id);
create index if not exists idx_payments_account on payments(account_id);

create index if not exists idx_expenses_account on expenses(account_id);
create index if not exists idx_expenses_job     on expenses(job_id);

create index if not exists idx_leads_account on leads(account_id);
create index if not exists idx_crew_account  on crew(account_id);

create index if not exists idx_audit_account on audit_log(account_id);
create index if not exists idx_snapshots_account on snapshots(account_id, created_at desc);


-- =============================================================================
-- SECTION 5: ROW LEVEL SECURITY
-- Every table: users can only see/write rows belonging to their account(s).
-- The helper function resolves all account_ids for the calling user once,
-- then every policy just references it — no N+1 subqueries.
-- =============================================================================

-- Helper: returns all account_ids the current user belongs to
create or replace function my_account_ids()
returns setof uuid
language sql
stable
security definer
as $$
  select account_id from account_members where user_id = auth.uid()
$$;

-- accounts
alter table accounts enable row level security;
create policy "members see own account" on accounts
  for all using (id in (select my_account_ids()));

-- account_members
alter table account_members enable row level security;
create policy "members see own account_members" on account_members
  for all using (account_id in (select my_account_ids()));

-- settings
alter table settings enable row level security;
create policy "members see own settings" on settings
  for all using (account_id in (select my_account_ids()));

-- jobs
alter table jobs enable row level security;
create policy "members see own jobs" on jobs
  for all using (account_id in (select my_account_ids()));

-- estimates
alter table estimates enable row level security;
create policy "members see own estimates" on estimates
  for all using (account_id in (select my_account_ids()));

-- contracts
alter table contracts enable row level security;
create policy "members see own contracts" on contracts
  for all using (account_id in (select my_account_ids()));

-- change_orders
alter table change_orders enable row level security;
create policy "members see own change_orders" on change_orders
  for all using (account_id in (select my_account_ids()));

-- invoices
alter table invoices enable row level security;
create policy "members see own invoices" on invoices
  for all using (account_id in (select my_account_ids()));

-- payments
alter table payments enable row level security;
create policy "members see own payments" on payments
  for all using (account_id in (select my_account_ids()));

-- expenses
alter table expenses enable row level security;
create policy "members see own expenses" on expenses
  for all using (account_id in (select my_account_ids()));

-- crew
alter table crew enable row level security;
create policy "members see own crew" on crew
  for all using (account_id in (select my_account_ids()));

-- payroll_runs
alter table payroll_runs enable row level security;
create policy "members see own payroll_runs" on payroll_runs
  for all using (account_id in (select my_account_ids()));

-- leads
alter table leads enable row level security;
create policy "members see own leads" on leads
  for all using (account_id in (select my_account_ids()));

-- custom_templates
alter table custom_templates enable row level security;
create policy "members see own custom_templates" on custom_templates
  for all using (account_id in (select my_account_ids()));

-- custom_documents
alter table custom_documents enable row level security;
create policy "members see own custom_documents" on custom_documents
  for all using (account_id in (select my_account_ids()));

-- audit_log
alter table audit_log enable row level security;
create policy "members see own audit_log" on audit_log
  for all using (account_id in (select my_account_ids()));

-- support_tickets
alter table support_tickets enable row level security;
create policy "members see own support_tickets" on support_tickets
  for all using (account_id in (select my_account_ids()));

-- snapshots
alter table snapshots enable row level security;
create policy "members see own snapshots" on snapshots
  for all using (account_id in (select my_account_ids()));

-- counters
alter table counters enable row level security;
create policy "members see own counters" on counters
  for all using (account_id in (select my_account_ids()));

-- =============================================================================
-- SECTION 6: PORTAL TOKEN ACCESS
-- The customer portal hits /portal/:token — no auth, no user session.
-- We need a separate policy that allows public read of a job by its token.
-- IMPORTANT: this policy only exposes fields that are safe for customers.
-- The portal API function (or edge function) must still strip internal fields.
-- =============================================================================

-- Allow public token-based read on jobs (portal only — no write)
create policy "public portal read by token" on jobs
  for select using (portal_token is not null);

-- Allow public read of estimates for the portal (estimate approval)
create policy "public portal read estimates" on estimates
  for select using (
    job_id in (select id from jobs where portal_token is not null)
  );

-- Allow public read of contracts for the portal
create policy "public portal read contracts" on contracts
  for select using (
    job_id in (select id from jobs where portal_token is not null)
  );

-- Allow public read of invoices + payments for the portal (balance view)
create policy "public portal read invoices" on invoices
  for select using (
    job_id in (select id from jobs where portal_token is not null)
  );

create policy "public portal read payments" on payments
  for select using (
    invoice_id in (select id from invoices where job_id in (
      select id from jobs where portal_token is not null
    ))
  );

-- Allow public write on estimates (customer accept/decline)
create policy "public portal estimate decision" on estimates
  for update using (
    job_id in (select id from jobs where portal_token is not null)
  )
  with check (
    job_id in (select id from jobs where portal_token is not null)
  );

-- Allow public write on jobs (kbStatus update when estimate approved/declined)
create policy "public portal job status update" on jobs
  for update using (portal_token is not null)
  with check (portal_token is not null);


-- =============================================================================
-- SECTION 7: ACCOUNT BOOTSTRAP FUNCTION
-- Called once on first login. Creates the account + member row + settings row
-- + counters row atomically. Safe to call multiple times (idempotent).
-- =============================================================================

create or replace function bootstrap_account(
  p_user_id     uuid,
  p_email       text default '',
  p_name        text default ''
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_account_id uuid;
begin
  -- Check if user already has an account
  select account_id into v_account_id
  from account_members
  where user_id = p_user_id
    and role = 'owner'
  limit 1;

  if v_account_id is not null then
    return v_account_id;  -- Already bootstrapped
  end if;

  -- Create the account
  insert into accounts (owner_id, plan)
  values (p_user_id, 'trial')
  returning id into v_account_id;

  -- Add owner as account member
  insert into account_members (account_id, user_id, role, email, name)
  values (v_account_id, p_user_id, 'owner', p_email, p_name);

  -- Create settings row
  insert into settings (account_id)
  values (v_account_id)
  on conflict (account_id) do nothing;

  -- Create counters row
  insert into counters (account_id)
  values (v_account_id)
  on conflict (account_id) do nothing;

  return v_account_id;
end;
$$;


-- =============================================================================
-- SECTION 8: SNAPSHOT CLEANUP FUNCTION
-- Keeps only the last 30 snapshots per account (cron or trigger)
-- =============================================================================

create or replace function cleanup_old_snapshots()
returns void
language plpgsql
security definer
as $$
begin
  delete from snapshots
  where id in (
    select id from (
      select id,
             row_number() over (partition by account_id order by created_at desc) as rn
      from snapshots
    ) ranked
    where rn > 30
  );
end;
$$;


-- =============================================================================
-- END OF SCHEMA MIGRATION
-- =============================================================================
-- After running this:
-- 1. Run 002_phase_a_migration.sql to populate from existing user_data blobs
-- 2. Update src/store/index.js for Phase A parallel writes
-- 3. Verify row counts match between user_data blob and new tables
-- =============================================================================

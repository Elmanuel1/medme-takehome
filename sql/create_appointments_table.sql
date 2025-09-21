-- Optional: needed for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  first_name varchar(150) not null,
  last_name varchar(150) not null,
  email text,
  phone_number text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  type text not null,
  status text not null default 'scheduled',
  notes jsonb not null default '{}',
  reason text,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint appointments_time_range check (end_at > start_at),
  constraint appointments_unique_slot unique (start_at, end_at),
  constraint appointments_contact_required check (email is not null or phone_number is not null)
);

create index if not exists idx_appointments_email on appointments (email);
create index if not exists idx_appointments_status on appointments (status);
create index if not exists idx_appointments_time_range on appointments (start_at, end_at);
create index if not exists idx_appointments_calendar_event on appointments (calendar_event_id);
create index if not exists idx_appointments_notes_gin on appointments using gin (notes);

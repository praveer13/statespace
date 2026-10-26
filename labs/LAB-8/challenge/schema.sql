-- LAB-8.5: the course's schema for the reply handler. Pinned: its hash goes into your receipt.
-- `uv run statespace check lab8.5` loads it into a fresh database on PostgreSQL 18.6, then your
-- sql/inbound.sql, then sends the provider's replies through handle_reply, one transaction each.

-- A hold the worker placed, and its fate: held, captured once, or released by a timer.
create table holds (
  intent text primary key,
  amount int not null check (amount > 0),
  status text not null check (status in ('held', 'captured', 'released'))
);

-- The intent's idempotency key, minted when the intent commits: uuidv7() is PostgreSQL 18's.
create table intents (
  intent text primary key references holds,
  key uuid not null unique default uuidv7()
);

-- At most one capture per intent.
create table captures (
  intent text primary key references holds,
  cost int not null
);

-- Every reply key the handler has taken in. The first copy of a key decides; later copies are no-ops.
create table inbound_keys (
  key uuid primary key,
  intent text not null,
  received_at timestamptz not null default now()
);

-- Replies your system refused but the provider may have acted on: the loss made visible.
create table reconciliations (
  key uuid not null,
  intent text not null,
  reason text not null,
  cost int
);

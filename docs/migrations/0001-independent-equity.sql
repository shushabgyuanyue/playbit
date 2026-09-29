-- Playbit independent equity migration draft.
-- Review the live database and run in one transaction after taking a backup.
-- The existing contract coupon rows keep their agreement_id; only the NOT NULL
-- constraint is removed so new game-result and independent coupons can coexist.

begin;

create table if not exists game_results (
  id text primary key,
  actor_key text not null,
  card_id text not null,
  kind text not null check (kind in ('winner', 'ranking', 'completed')),
  winner_label text,
  ranking jsonb,
  note text,
  recorder_user_id text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists certificates (
  id text primary key,
  game_result_id text references game_results(id) on delete set null,
  kind text not null check (kind in ('winner', 'ranking', 'completion')),
  title text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table coupons alter column agreement_id drop not null;
alter table coupons add column if not exists game_result_id text references game_results(id) on delete set null;
alter table coupons add column if not exists certificate_id text references certificates(id) on delete set null;
alter table coupons add column if not exists transfer_note text;

create index if not exists coupons_game_result_idx on coupons(game_result_id) where game_result_id is not null;
create index if not exists coupons_certificate_idx on coupons(certificate_id) where certificate_id is not null;
create index if not exists coupons_holder_status_idx on coupons(holder_user_id, status, created_at desc);

commit;

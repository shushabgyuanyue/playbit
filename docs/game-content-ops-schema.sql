-- Playbit 游戏卡智能研发与分发系统
-- PostgreSQL 参考 DDL，当前只作为设计稿，不直接执行。
-- 与现有 Playbit 协议表共存：users.id 当前为 text，因此用户外键保持 text。

create extension if not exists pgcrypto;

create type content_evidence_level as enum (
  'USER_PROVIDED', 'VERIFIED_WEB', 'CONVERSATION_MINE', 'NEEDS_REVIEW'
);

create type content_lifecycle as enum (
  'DRAFT', 'AGENT_PROPOSED', 'REVIEW', 'PLAYTEST', 'APPROVED',
  'LIMITED_RELEASE', 'PUBLISHED', 'PAUSED', 'MERGED', 'REJECTED', 'RETIRED'
);

create type l0_status as enum ('FORMAL', 'PROVISIONAL', 'CANDIDATE', 'RETIRED');
create type l0_role as enum ('PRIMARY', 'SECONDARY');
create type raw_l1_relation as enum ('INSPIRED_BY', 'NORMALIZED_TO', 'MERGED_INTO');
create type l2_status as enum ('DRAFT', 'REVIEW', 'PUBLISHED', 'PAUSED', 'QUARANTINED', 'RETIRED');
create type l2_source_mode as enum ('SYSTEM', 'HUMAN', 'ENVIRONMENT', 'EXTERNAL_AI', 'HYBRID');
create type tool_requirement as enum ('REQUIRED', 'OPTIONAL');
create type tool_status as enum ('DRAFT', 'PUBLISHED', 'PAUSED', 'RETIRED');
create type review_decision as enum ('KEEP', 'OBSERVE', 'MERGE', 'REJECT', 'PLAYTEST', 'PUBLISH');
create type agent_task_status as enum ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
create type reuse_scope as enum ('L1', 'L2');
create type game_card_instance_status as enum ('CREATED', 'EXPIRED', 'CONSUMED', 'CANCELLED');
create type agent_proposal_status as enum ('OPEN', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');
create type distribution_scope as enum ('L2_SCENE', 'L2', 'L1_SCENE', 'L1', 'GLOBAL');
create type l1_outcome_model as enum ('NO_WINNER', 'SELF_REPORTED_WINNER', 'RANKED_RESULT', 'SHARED_COMPLETION');

-- 原始来源和采矿样本。这里保留研究证据，不参与线上抽卡查询。
create table content_sources (
  id uuid primary key default gen_random_uuid(),
  source_type varchar(64) not null,
  region varchar(128),
  work_name varchar(255),
  source_url text,
  evidence_level content_evidence_level not null,
  provenance_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table raw_game_samples (
  id uuid primary key default gen_random_uuid(),
  sample_code varchar(32) not null unique,
  name varchar(255) not null,
  source_id uuid references content_sources(id) on delete set null,
  original_rule text not null,
  example_note text,
  core_interaction text,
  information_structure jsonb,
  control_structure jsonb,
  l0_hypothesis jsonb,
  editorial_status content_lifecycle not null default 'DRAFT',
  editorial_priority smallint not null default 0 check (editorial_priority between 0 and 100),
  editorial_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index raw_game_samples_source_idx on raw_game_samples(source_id);
create index raw_game_samples_status_idx on raw_game_samples(editorial_status, editorial_priority desc);

create table l0_mechanisms (
  id uuid primary key default gen_random_uuid(),
  code varchar(32) not null unique,
  name varchar(128) not null,
  status l0_status not null default 'CANDIDATE',
  definition text not null,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table l1_games (
  id uuid primary key default gen_random_uuid(),
  code varchar(32) not null unique,
  name varchar(128) not null,
  lifecycle content_lifecycle not null default 'DRAFT',
  min_players smallint not null check (min_players > 0),
  max_players smallint check (max_players is null or max_players >= min_players),
  duration_min smallint check (duration_min is null or duration_min > 0),
  duration_max smallint check (duration_max is null or duration_max >= duration_min),
  props_requirement varchar(32) not null default 'NONE',
  movement_level varchar(16) not null default 'LOW',
  outcome_model l1_outcome_model not null default 'NO_WINNER',
  host_required boolean not null default false,
  certificate_eligible boolean not null default false,
  editorial_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index l1_games_lifecycle_idx on l1_games(lifecycle, updated_at desc);

create table l1_game_versions (
  id uuid primary key default gen_random_uuid(),
  l1_id uuid not null references l1_games(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  short_rule text not null,
  rule_detail text,
  completion_condition text not null,
  failure_condition text,
  display_hook varchar(255),
  information_structure jsonb not null default '{}'::jsonb,
  control_structure jsonb not null default '{}'::jsonb,
  participant_model jsonb not null default '{}'::jsonb,
  review_status content_lifecycle not null default 'DRAFT',
  reviewed_by text references users(id) on delete set null,
  reviewed_at timestamptz,
  change_note text,
  created_by text references users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (l1_id, version_no)
);

create index l1_versions_published_idx on l1_game_versions(l1_id, published_at desc)
  where published_at is not null;

create table raw_l1_rel (
  raw_sample_id uuid not null references raw_game_samples(id) on delete cascade,
  l1_id uuid not null references l1_games(id) on delete cascade,
  relation raw_l1_relation not null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  note text,
  created_at timestamptz not null default now(),
  primary key (raw_sample_id, l1_id, relation)
);

create table l1_l0_rel (
  l1_id uuid not null references l1_games(id) on delete cascade,
  l0_id uuid not null references l0_mechanisms(id) on delete restrict,
  role l0_role not null,
  primary key (l1_id, l0_id)
);

create unique index l1_one_primary_l0_idx on l1_l0_rel(l1_id)
  where role = 'PRIMARY';

create table scene_tags (
  id uuid primary key default gen_random_uuid(),
  code varchar(32) not null unique,
  name varchar(64) not null,
  definition text not null,
  created_at timestamptz not null default now()
);

create table l1_scene_rel (
  l1_id uuid not null references l1_games(id) on delete cascade,
  scene_id uuid not null references scene_tags(id) on delete restrict,
  fit_level varchar(16) not null check (fit_level in ('PRIMARY', 'COMPATIBLE', 'AVOID')),
  note text,
  primary key (l1_id, scene_id)
);

create table l2_content (
  id uuid primary key default gen_random_uuid(),
  l1_id uuid not null references l1_games(id) on delete cascade,
  content_type varchar(32) not null,
  source_mode l2_source_mode not null,
  status l2_status not null default 'DRAFT',
  quality_tier smallint not null default 0 check (quality_tier between 0 and 100),
  sensitivity_tags jsonb not null default '[]'::jsonb,
  quarantine_reason text,
  distribution_limit bigint check (distribution_limit is null or distribution_limit > 0),
  distributed_count bigint not null default 0 check (distributed_count >= 0),
  exhaustion_warn_threshold bigint not null default 10 check (exhaustion_warn_threshold >= 0),
  manual_rank_adjustment numeric(12,4) not null default 0,
  manual_rank_reason text,
  editorial_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table l2_content_versions (
  id uuid primary key default gen_random_uuid(),
  l2_id uuid not null references l2_content(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  payload jsonb not null,
  change_note text,
  review_status content_lifecycle not null default 'DRAFT',
  reviewed_by text references users(id) on delete set null,
  reviewed_at timestamptz,
  created_by text references users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (l2_id, version_no)
);

create index l2_pool_idx on l2_content(l1_id, status, quality_tier desc, updated_at desc);
create index l2_version_published_idx on l2_content_versions(l2_id, published_at desc)
  where published_at is not null;

create table tool_defs (
  id uuid primary key default gen_random_uuid(),
  code varchar(64) not null,
  version_no integer not null default 1 check (version_no > 0),
  name varchar(64) not null,
  runtime_key varchar(128) not null,
  config_schema jsonb not null default '{}'::jsonb,
  status tool_status not null default 'DRAFT',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (code, version_no)
);

create table l1_tool_rel (
  l1_version_id uuid not null references l1_game_versions(id) on delete cascade,
  tool_id uuid not null references tool_defs(id) on delete restrict,
  requirement tool_requirement not null,
  default_config jsonb not null default '{}'::jsonb,
  primary key (l1_version_id, tool_id)
);

-- 冻结和消耗规则是内容策略，不写入 L2 payload，便于运营调整和审计。
create table content_reuse_policies (
  id uuid primary key default gen_random_uuid(),
  scope reuse_scope not null,
  l1_id uuid references l1_games(id) on delete cascade,
  l2_id uuid references l2_content(id) on delete cascade,
  cooldown_rounds integer not null default 0 check (cooldown_rounds >= 0),
  cooldown_days integer not null default 0 check (cooldown_days >= 0),
  max_exposure_count integer check (max_exposure_count is null or max_exposure_count > 0),
  max_play_count integer check (max_play_count is null or max_play_count > 0),
  permanent_exhaustion boolean not null default false,
  is_active boolean not null default true,
  skip_cooldown_rounds integer not null default 1 check (skip_cooldown_rounds >= 0),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  updated_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((scope = 'L1' and l1_id is not null and l2_id is null)
      or (scope = 'L2' and l2_id is not null and l1_id is null)),
  check (effective_to is null or effective_to > effective_from)
);

create index reuse_policy_l1_idx on content_reuse_policies(l1_id, effective_from desc)
  where scope = 'L1';
create index reuse_policy_l2_idx on content_reuse_policies(l2_id, effective_from desc)
  where scope = 'L2';
create unique index reuse_policy_active_l1_idx on content_reuse_policies(l1_id)
  where scope = 'L1' and is_active;
create unique index reuse_policy_active_l2_idx on content_reuse_policies(l2_id)
  where scope = 'L2' and is_active;

create table distribution_policies (
  id uuid primary key default gen_random_uuid(),
  l1_id uuid references l1_games(id) on delete cascade,
  l2_id uuid references l2_content(id) on delete cascade,
  scene_id uuid references scene_tags(id) on delete cascade,
  scope distribution_scope not null,
  base_weight numeric(12,4) not null default 1 check (base_weight >= 0),
  exploration_weight numeric(12,4) not null default 0 check (exploration_weight >= 0),
  exposure_budget bigint,
  priority smallint not null default 0 check (priority between 0 and 100),
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  reason text,
  updated_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (scope = 'GLOBAL' and l1_id is null and l2_id is null and scene_id is null)
    or (scope = 'L1' and l1_id is not null and l2_id is null and scene_id is null)
    or (scope = 'L1_SCENE' and l1_id is not null and l2_id is null and scene_id is not null)
    or (scope = 'L2' and l1_id is null and l2_id is not null and scene_id is null)
    or (scope = 'L2_SCENE' and l1_id is null and l2_id is not null and scene_id is not null)
  ),
  check (effective_to is null or effective_to > effective_from)
);

create index distribution_l1_scene_idx on distribution_policies(l1_id, scene_id, effective_from desc);
create index distribution_l2_idx on distribution_policies(l2_id, effective_from desc);
create unique index distribution_active_global_idx on distribution_policies(scope)
  where scope = 'GLOBAL' and is_active;
create unique index distribution_active_l1_idx on distribution_policies(l1_id, scope)
  where scope = 'L1' and is_active;
create unique index distribution_active_l1_scene_idx on distribution_policies(l1_id, scene_id, scope)
  where scope = 'L1_SCENE' and is_active;
create unique index distribution_active_l2_idx on distribution_policies(l2_id, scope)
  where scope = 'L2' and is_active;
create unique index distribution_active_l2_scene_idx on distribution_policies(l2_id, scene_id, scope)
  where scope = 'L2_SCENE' and is_active;

-- 用户侧是聚合状态表，用于快速判断是否可展示；不要每次抽卡扫描 game_events。
create table user_l1_preferences (
  user_id text not null references users(id) on delete cascade,
  l1_id uuid not null references l1_games(id) on delete cascade,
  is_favorite boolean not null default false,
  affinity_score numeric(12,6) not null default 0,
  replay_count integer not null default 0,
  accept_count integer not null default 0,
  skip_count integer not null default 0,
  last_played_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, l1_id)
);

create index user_l1_pref_rank_idx on user_l1_preferences(user_id, is_favorite desc, affinity_score desc);

create table user_l1_exposures (
  actor_key varchar(128) not null,
  user_id text references users(id) on delete cascade,
  l1_id uuid not null references l1_games(id) on delete cascade,
  shown_count integer not null default 0,
  started_count integer not null default 0,
  completed_count integer not null default 0,
  skipped_count integer not null default 0,
  last_shown_at timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  next_available_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (actor_key, l1_id)
);

create index user_l1_exposure_available_idx on user_l1_exposures(actor_key, next_available_at, l1_id);

create table user_l2_exposures (
  actor_key varchar(128) not null,
  user_id text references users(id) on delete cascade,
  l2_id uuid not null references l2_content(id) on delete cascade,
  shown_count integer not null default 0,
  started_count integer not null default 0,
  completed_count integer not null default 0,
  skipped_count integer not null default 0,
  last_shown_at timestamptz,
  last_started_at timestamptz,
  last_completed_at timestamptz,
  next_available_at timestamptz,
  exhausted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (actor_key, l2_id)
);

create index user_l2_available_idx on user_l2_exposures(actor_key, next_available_at, l2_id)
  where exhausted = false;

-- Durable snapshots are created only at a persistence boundary such as the host
-- recording a result/certificate, authenticated history, or server-recoverable play.
-- Anonymous ordinary play uses a signed Card Delivery and does not require a row here.
create table game_card_instances (
  id uuid primary key default gen_random_uuid(),
  actor_key varchar(128) not null,
  request_id varchar(128) not null,
  user_id text references users(id) on delete set null,
  l1_id uuid not null references l1_games(id) on delete restrict,
  l1_version_id uuid not null references l1_game_versions(id) on delete restrict,
  l2_id uuid references l2_content(id) on delete restrict,
  l2_version_id uuid references l2_content_versions(id) on delete restrict,
  tool_config jsonb not null default '{}'::jsonb,
  display_snapshot jsonb not null,
  recommendation_reason jsonb not null default '{}'::jsonb,
  context_snapshot jsonb not null default '{}'::jsonb,
  instance_status game_card_instance_status not null default 'CREATED',
  scene_code varchar(64),
  entry_point varchar(64),
  participant_count smallint check (participant_count is null or participant_count > 0),
  recommendation_policy_version varchar(64),
  experiment_code varchar(64),
  experiment_variant varchar(64),
  candidate_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index card_instances_user_idx on game_card_instances(user_id, created_at desc);
create index card_instances_l1_idx on game_card_instances(l1_id, created_at desc);
create unique index card_instances_request_idx on game_card_instances(actor_key, request_id);
create index card_instances_actor_idx on game_card_instances(actor_key, created_at desc);

create type game_event_type as enum (
  'IMPRESSION', 'REVEAL', 'START', 'SKIP', 'REDRAW', 'COMPLETE',
  'REPLAY_SAME_L1', 'SWITCH_L1', 'FAVORITE_L1', 'UNFAVORITE_L1',
  'RESULT_RECORDED', 'SCOREBOARD_RECORDED',
  'CERTIFICATE_CREATED', 'SHARE',
  'TOOL_OPENED', 'TOOL_COMPLETED', 'TOOL_SKIPPED', 'TOOL_ERROR',
  'ABANDON'
);

-- 高频追加事件按 occurred_at 分区。线上查询优先使用聚合状态表和报表汇总表。
-- 该表故意不添加业务级联外键，避免事件写入被内容实体锁住；引用由异步校验任务检查。
create table game_events (
  event_id bigint generated always as identity,
  occurred_at timestamptz not null,
  client_event_id varchar(128) not null,
  actor_key varchar(128) not null,
  user_id text,
  session_id uuid,
  card_instance_id uuid,
  card_delivery_id varchar(128),
  l1_id uuid,
  l2_id uuid,
  event_type game_event_type not null,
  context jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
) partition by range (occurred_at);

create table game_events_default partition of game_events default;

create index game_events_user_time_idx on game_events(user_id, occurred_at desc);
create index game_events_l1_time_idx on game_events(l1_id, occurred_at desc);
create index game_events_l2_time_idx on game_events(l2_id, occurred_at desc);
create index game_events_delivery_idx on game_events(actor_key, card_delivery_id, occurred_at desc);
create index game_events_type_time_idx on game_events(event_type, occurred_at desc);
create index game_events_brin_time_idx on game_events using brin(occurred_at);

-- 客户端重试去重。只保留有限窗口，超过窗口的客户端事件 ID 不再需要在线去重。
create table event_ingest_dedupe (
  actor_key varchar(128) not null,
  client_event_id varchar(128) not null,
  received_at timestamptz not null default now(),
  primary key (actor_key, client_event_id)
);

create index event_ingest_dedupe_received_idx on event_ingest_dedupe(received_at desc);

create table agent_tasks (
  id uuid primary key default gen_random_uuid(),
  task_type varchar(64) not null,
  instruction text not null,
  constraints jsonb not null default '{}'::jsonb,
  status agent_task_status not null default 'QUEUED',
  requested_by text references users(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index agent_tasks_queue_idx on agent_tasks(status, created_at)
  where status in ('QUEUED', 'RUNNING');

create table agent_proposals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references agent_tasks(id) on delete cascade,
  entity_type varchar(16) not null check (entity_type in ('RAW', 'L1', 'L2')),
  entity_id uuid,
  parent_entity_id uuid,
  target_version_id uuid,
  status agent_proposal_status not null default 'OPEN',
  resolved_by text references users(id) on delete set null,
  resolved_at timestamptz,
  proposal_payload jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  risk_note text,
  model_name varchar(128),
  model_run_id varchar(128),
  created_at timestamptz not null default now()
);

create index agent_proposals_task_idx on agent_proposals(task_id, created_at desc);
create index agent_proposals_status_idx on agent_proposals(status, created_at desc);

create table editorial_reviews (
  id uuid primary key default gen_random_uuid(),
  entity_type varchar(16) not null check (entity_type in ('RAW', 'L1', 'L2')),
  entity_id uuid not null,
  proposal_id uuid references agent_proposals(id) on delete set null,
  target_version_id uuid,
  reviewer_user_id text references users(id) on delete set null,
  decision review_decision not null,
  reason text not null,
  check ((entity_type = 'RAW' and target_version_id is null)
      or (entity_type in ('L1', 'L2') and target_version_id is not null)),
  created_at timestamptz not null default now()
);

create index editorial_reviews_entity_idx on editorial_reviews(entity_type, entity_id, created_at desc);

create table playtest_sessions (
  id uuid primary key default gen_random_uuid(),
  l1_id uuid not null references l1_games(id) on delete restrict,
  l1_version_id uuid references l1_game_versions(id) on delete restrict,
  player_count smallint,
  scene_context jsonb not null default '{}'::jsonb,
  started_easily boolean,
  wanted_replay boolean,
  awkward_note text,
  observer_note text,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index playtest_l1_idx on playtest_sessions(l1_id, created_at desc);

-- 运营报表和推荐读取使用日汇总，不直接扫 game_events。
create table l1_daily_metrics (
  metric_date date not null,
  l1_id uuid not null references l1_games(id) on delete restrict,
  impression_count bigint not null default 0,
  start_count bigint not null default 0,
  complete_count bigint not null default 0,
  skip_count bigint not null default 0,
  redraw_count bigint not null default 0,
  replay_same_l1_count bigint not null default 0,
  switch_l1_count bigint not null default 0,
  favorite_count bigint not null default 0,
  share_count bigint not null default 0,
  tool_open_count bigint not null default 0,
  tool_complete_count bigint not null default 0,
  tool_error_count bigint not null default 0,
  avg_duration_seconds integer,
  updated_at timestamptz not null default now(),
  primary key (metric_date, l1_id)
);

create index l1_daily_metrics_l1_idx on l1_daily_metrics(l1_id, metric_date desc);

create table l2_daily_metrics (
  metric_date date not null,
  l2_id uuid not null references l2_content(id) on delete restrict,
  impression_count bigint not null default 0,
  start_count bigint not null default 0,
  complete_count bigint not null default 0,
  skip_count bigint not null default 0,
  redraw_count bigint not null default 0,
  share_count bigint not null default 0,
  tool_open_count bigint not null default 0,
  tool_complete_count bigint not null default 0,
  tool_error_count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (metric_date, l2_id)
);

create index l2_daily_metrics_l2_idx on l2_daily_metrics(l2_id, metric_date desc);

-- 多维分析切片只保存有限维度的聚合，不把高基数筛选直接压到线上事件表。
create table recommendation_daily_slices (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  l1_id uuid not null references l1_games(id) on delete restrict,
  l2_id uuid references l2_content(id) on delete restrict,
  scene_id uuid references scene_tags(id) on delete restrict,
  participant_bucket varchar(16),
  user_cohort varchar(32),
  l1_version_id uuid references l1_game_versions(id) on delete restrict,
  recommendation_policy_version varchar(64),
  experiment_code varchar(64),
  experiment_variant varchar(64),
  impression_count bigint not null default 0,
  start_count bigint not null default 0,
  complete_count bigint not null default 0,
  skip_count bigint not null default 0,
  redraw_count bigint not null default 0,
  share_count bigint not null default 0,
  tool_open_count bigint not null default 0,
  tool_complete_count bigint not null default 0,
  tool_error_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

create unique index recommendation_daily_slices_key_idx
  on recommendation_daily_slices (
    metric_date,
    l1_id,
    coalesce(l2_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(scene_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(participant_bucket, ''),
    coalesce(user_cohort, ''),
    coalesce(l1_version_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(recommendation_policy_version, ''),
    coalesce(experiment_code, ''),
    coalesce(experiment_variant, '')
  );

create index recommendation_daily_slices_dimension_idx
  on recommendation_daily_slices(metric_date, scene_id, participant_bucket, user_cohort);

create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text references users(id) on delete set null,
  action varchar(64) not null,
  entity_type varchar(32) not null,
  entity_id uuid,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index admin_audit_entity_idx on admin_audit_logs(entity_type, entity_id, created_at desc);
create index admin_audit_actor_idx on admin_audit_logs(actor_user_id, created_at desc);

create table admin_roles (
  id uuid primary key default gen_random_uuid(),
  code varchar(64) not null unique,
  name varchar(128) not null,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table admin_user_roles (
  user_id text not null references users(id) on delete cascade,
  role_id uuid not null references admin_roles(id) on delete cascade,
  granted_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index admin_user_roles_role_idx on admin_user_roles(role_id, user_id);

create table recommendation_experiments (
  id uuid primary key default gen_random_uuid(),
  code varchar(64) not null unique,
  name varchar(128) not null,
  status varchar(16) not null check (status in ('DRAFT', 'RUNNING', 'PAUSED', 'ENDED')),
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 分组表只保留实验期间所需的稳定分组，不保存完整推荐候选快照。
create table recommendation_assignments (
  experiment_id uuid not null references recommendation_experiments(id) on delete cascade,
  actor_key varchar(128) not null,
  user_id text references users(id) on delete set null,
  variant varchar(64) not null,
  assigned_at timestamptz not null default now(),
  primary key (experiment_id, actor_key)
);

create index recommendation_assignments_user_idx on recommendation_assignments(user_id, experiment_id);

-- 分区维护示例：每月创建一个分区，并为未来月份提前创建。
-- create table game_events_2026_10 partition of game_events
--   for values from ('2026-10-01') to ('2026-11-01');
-- 归档前先停止写入对应月份，再导出到对象存储或分析库，最后 detach/drop 分区。

/*
性能和维护约定：
1. 抽卡请求只读 PUBLISHED 的 L1/L2、content_reuse_policies、distribution_policies
   和当前用户的聚合状态，不读取 game_events。
2. game_events 只追加，按月分区；保留期和归档周期由部署环境配置。
3. event_ingest_dedupe 只承担在线幂等窗口，定期清理过期记录。
4. l1_daily_metrics 和 l2_daily_metrics 由异步聚合任务更新，允许小延迟。
5. 版本表不原地覆盖已发布版本；发布产生新版本，历史实例保存版本 ID。
6. 修改冻结、展示次数和权重必须写入审计日志。审计日志可复用项目现有后台审计能力。
7. 复杂推荐模型的特征表和向量索引不进入第一版主库；先由日汇总和偏好表提供稳定输入。
*/

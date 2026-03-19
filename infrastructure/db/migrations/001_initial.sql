-- =============================================================================
-- Nebulosa GitHub Architecture Agent – Initial Schema
-- Migration: 001_initial.sql
-- =============================================================================

-- GitHub App installations
create table if not exists github_installations (
  id                     uuid        primary key default gen_random_uuid(),
  github_installation_id bigint      unique not null,
  account_login          text        not null,
  account_type           text        not null,  -- User | Organization
  created_at             timestamptz not null default now()
);

-- Repositories registered under an installation
create table if not exists repositories (
  id              uuid        primary key default gen_random_uuid(),
  installation_id uuid        not null references github_installations(id) on delete cascade,
  github_repo_id  bigint      unique not null,
  owner           text        not null,
  name            text        not null,
  default_branch  text,
  is_private      boolean     not null default false,
  language_summary jsonb      not null default '{}',
  active          boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_repositories_installation
  on repositories(installation_id);

-- Point-in-time repository snapshots (one per scan)
create table if not exists repository_snapshots (
  id              uuid        primary key default gen_random_uuid(),
  repository_id   uuid        not null references repositories(id) on delete cascade,
  commit_sha      text        not null,
  tree_sha        text,
  snapshot_status text        not null default 'queued',  -- queued|running|complete|failed
  file_count      integer,
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_snapshots_repository
  on repository_snapshots(repository_id, created_at desc);

-- Individual files within a snapshot
create table if not exists repository_files (
  id          uuid      primary key default gen_random_uuid(),
  snapshot_id uuid      not null references repository_snapshots(id) on delete cascade,
  path        text      not null,
  file_type   text      not null,  -- code|doc|config|infra|asset|other
  language    text,
  size_bytes  bigint,
  content_ref text,                -- object-storage key
  hash_sha256 text      not null,
  unique(snapshot_id, path)
);

create index if not exists idx_repo_files_snapshot
  on repository_files(snapshot_id);

-- Extracted architecture facts
create table if not exists architecture_facts (
  id             uuid         primary key default gen_random_uuid(),
  snapshot_id    uuid         not null references repository_snapshots(id) on delete cascade,
  fact_type      text         not null,  -- service|db|api|queue|framework|entrypoint|...
  subject        text         not null,
  object         text,
  attributes     jsonb        not null default '{}',
  source_file_id uuid         references repository_files(id) on delete set null,
  confidence     numeric(5,4) not null
);

create index if not exists idx_arch_facts_snapshot
  on architecture_facts(snapshot_id, fact_type);

-- Code chunks for semantic retrieval
create table if not exists code_chunks (
  id            uuid    primary key default gen_random_uuid(),
  file_id       uuid    not null references repository_files(id) on delete cascade,
  chunk_index   integer not null,
  text_content  text    not null,
  embedding_ref text,
  tokens        integer,
  unique(file_id, chunk_index)
);

-- Agent tasks submitted by users
create table if not exists tasks (
  id            uuid        primary key default gen_random_uuid(),
  repository_id uuid        not null references repositories(id) on delete cascade,
  snapshot_id   uuid        references repository_snapshots(id) on delete set null,
  task_type     text        not null,  -- architecture_report|target_design|api_design|...
  prompt        text        not null,
  status        text        not null default 'queued',  -- queued|running|completed|failed
  requested_by  text        not null,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists idx_tasks_repository
  on tasks(repository_id, created_at desc);

-- Generated architecture reports
create table if not exists reports (
  id               uuid        primary key default gen_random_uuid(),
  task_id          uuid        not null references tasks(id) on delete cascade,
  report_type      text        not null,
  markdown_content text        not null,
  artifact_ref     text,
  created_at       timestamptz not null default now()
);

-- Inbound GitHub webhook events (idempotent by delivery_id)
create table if not exists webhook_events (
  id              uuid        primary key default gen_random_uuid(),
  installation_id uuid        references github_installations(id) on delete set null,
  event_name      text        not null,
  delivery_id     text        not null,
  payload         jsonb       not null,
  received_at     timestamptz not null default now(),
  unique(delivery_id)
);

-- Audit trail
create table if not exists audit_logs (
  id          uuid        primary key default gen_random_uuid(),
  actor       text        not null,
  action      text        not null,
  entity_type text        not null,
  entity_id   uuid,
  metadata    jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_logs_entity
  on audit_logs(entity_type, entity_id);

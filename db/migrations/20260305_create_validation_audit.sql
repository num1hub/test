-- Validation audit table for production-grade historical tracking.
-- Apply in PostgreSQL environments where validator telemetry is persisted.

create table if not exists validation_audit (
  id uuid primary key,
  timestamp timestamptz not null,
  capsule_id text,
  success boolean not null,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  source text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_validation_audit_timestamp on validation_audit (timestamp desc);
create index if not exists idx_validation_audit_capsule_id on validation_audit (capsule_id);
create index if not exists idx_validation_audit_success on validation_audit (success);

-- PostgreSQL schema for the production Phase 1 service.
create extension if not exists pgcrypto;

create type concierge_role as enum ('super_user', 'admin', 'staff', 'student_staff', 'student');
create type article_status as enum ('draft', 'published', 'archived');
create type conversation_status as enum ('open', 'closed', 'escalated');
create type escalation_status as enum ('new', 'assigned', 'resolved', 'closed');

create table concierge_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  summary text not null default '',
  content text not null,
  source_url text not null,
  responsible_office text not null,
  contact_url text not null,
  status article_status not null default 'draft',
  search_document tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(category, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, ''))
  ) stored,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index concierge_kb_search_idx on concierge_knowledge_base using gin(search_document);
create index concierge_kb_status_idx on concierge_knowledge_base(status, category);

create table concierge_conversations (
  id uuid primary key default gen_random_uuid(),
  user_subject text, -- opaque authenticated identity; do not expose to the model
  status conversation_status not null default 'open',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table concierge_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references concierge_conversations(id) on delete cascade,
  role text not null check (role in ('student', 'assistant', 'system')),
  content text not null,
  answer_status text,
  source_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index concierge_messages_conversation_idx on concierge_messages(conversation_id, created_at);

create table concierge_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references concierge_messages(id) on delete cascade,
  rating text not null check (rating in ('helpful', 'not_helpful')),
  comment text,
  created_at timestamptz not null default now()
);

create table concierge_escalations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references concierge_conversations(id) on delete set null,
  student_id text,
  student_email text,
  question text not null,
  escalation_reason text not null,
  preferred_contact_method text not null check (preferred_contact_method in ('teams', 'email', 'follow_up', 'office_hours')),
  teams_link_clicked boolean not null default false,
  responsible_office text not null,
  status escalation_status not null default 'new',
  assigned_to text,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table concierge_appointments (
  id uuid primary key default gen_random_uuid(),
  student_id text,
  student_email text,
  appointment_type text not null check (appointment_type in ('retention', 'eagle-assistant')),
  provider_id text not null,
  provider_name text not null,
  appointment_reason_id text,
  appointment_reason_label text,
  tutoring_subject_id text,
  tutoring_subject_name text,
  eagle_assistant_status text check (eagle_assistant_status in ('assignment_pending', 'assigned')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_format text not null check (meeting_format in ('in_person', 'microsoft_teams')),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled', 'declined')),
  microsoft365_sync_status text not null default 'pending_it_approval',
  microsoft365_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index concierge_appointments_student_idx on concierge_appointments(student_id, starts_at);
create index concierge_appointments_provider_idx on concierge_appointments(provider_id, starts_at);

create table concierge_student_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  tougaloo_email text not null unique,
  profile_key_hash text not null,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'email_verified', 'staff_verified', 'sso_verified')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create table concierge_check_in_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  event_type text not null check (event_type in ('tutorial_center', 'event')),
  starts_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  created_by text not null,
  created_at timestamptz not null default now()
);

create table concierge_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references concierge_check_in_events(id) on delete restrict,
  profile_id uuid not null references concierge_student_profiles(id) on delete restrict,
  checked_in_by text not null,
  check_in_method text not null default 'secure_code',
  checked_in_at timestamptz not null default now(),
  unique(event_id, profile_id)
);
create index concierge_attendance_event_idx on concierge_attendance(event_id, checked_in_at);

create table concierge_user_roles (
  user_subject text primary key,
  role concierge_role not null,
  assigned_by text not null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Production PostgreSQL must enable row-level security for student-owned data.
-- Student requests set app.profile_id only after profile-key, email, or SSO verification.
alter table concierge_student_profiles enable row level security;
alter table concierge_attendance enable row level security;

create policy student_reads_own_profile on concierge_student_profiles
  for select using (id = nullif(current_setting('app.profile_id', true), '')::uuid);

create policy student_reads_own_attendance on concierge_attendance
  for select using (profile_id = nullif(current_setting('app.profile_id', true), '')::uuid);

-- Apply these policies through the Nest identity layer:
-- student: create/read own conversations/messages; create feedback/escalations; read published KB.
-- student: read only their own verified records and use student services.
-- student_staff: assigned check-in work only; no attendance lists or session management.
-- staff: Retention operations, sessions, attendance, and assigned student support.
-- admin: knowledge, Retention operations, reports, and staff workflows.
-- super_user: system configuration, role assignment, audits, and all capabilities.

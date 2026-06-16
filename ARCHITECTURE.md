# Nest Student Concierge Agent: Phase 1 Architecture

## Purpose

The Concierge is a safe, student-facing virtual front desk inside The Nest. Phase 1 answers general questions from approved content, links every answer to its source, and routes uncertain or private questions to people.

## Request Flow

1. The Nest identity layer supplies an opaque user subject and role.
2. The safety classifier checks for private-record requests and urgent-risk language before retrieval.
3. Retrieval searches only `published` records in `concierge_knowledge_base`.
4. The answer layer produces a short, source-linked response using the system prompt in `src/system-prompt.js`.
5. The conversation, answer status, and source IDs are recorded.
6. Students can submit feedback or an escalation to the responsible office.

## Components

- Student chat: suggested questions, sourced answers, contact buttons, feedback, and escalation.
- Retrieval service: keyword search in this prototype; PostgreSQL full-text search in production.
- Admin manager: role-protected draft and publishing workflow for approved articles.
- Audit data: conversations, messages, feedback, and escalations.
- Safety boundary: no student-record database access in Phase 1.

## Role-Based Access

| Capability | Student | Student staff | Staff | Admin | Super user |
|---|---:|---:|---:|---:|---:|
| Read published articles and use Concierge | Yes | Yes | Yes | Yes | Yes |
| Read own verified records | Yes | Own only | Own only | Own only | Own only |
| Check students into assigned sessions | No | Yes | Yes | Yes | Yes |
| Create sessions and read attendance | No | No | Yes | Yes | Yes |
| Manage Retention escalations | No | No | Yes | Yes | Yes |
| Manage approved knowledge | No | No | No | Yes | Yes |
| Read reports | No | No | No | Yes | Yes |
| Manage system configuration and roles | No | No | No | No | Yes |

Production must enforce roles server-side using an approved identity source. The demo uses `x-nest-role` only to show the contract; it is not production authentication. Admins cannot grant super-user access; only a super user can assign roles.

## Privacy Boundary

The model receives approved article text and the student's current general question only. It does not receive grades, balances, SAP status, conduct records, disability records, financial-aid records, private notes, passwords, or broad profile data. Private questions are intercepted and routed to a secure system or office.

Student-owned data uses object-level authorization: every profile or attendance read must verify the requesting student's ownership, and production PostgreSQL row-level security must independently restrict records to that verified profile.

## Production Evolution

Replace the in-memory demo store with PostgreSQL using `db/schema.sql`, connect Nest SSO, add an approved LLM provider behind the answer layer, enforce retention rules, and add an institutional content-review workflow. Keep retrieval scoped to published content and preserve the pre-retrieval privacy classifier.

-- Phase 5: allow storing generated lessons/theory as knowledge docs (optional).
-- Extends allowed knowledge_documents.source_type values.

alter table public.knowledge_documents
drop constraint if exists knowledge_documents_source_type_check;

alter table public.knowledge_documents
add constraint knowledge_documents_source_type_check
check (source_type in ('text','url','youtube','lesson','theory'));

-- Divine Financial Group — Database Schema
-- Run this in your Supabase SQL Editor

-- Users and Auth (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  auth_user_id TEXT,
  legal_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  business_name VARCHAR(255),
  address VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip VARCHAR(20),
  zip_code VARCHAR(10),
  avatar_url VARCHAR(500),
  notification_preferences JSONB DEFAULT '{}',
  role VARCHAR(50) DEFAULT 'client' CHECK (role IN ('client','support','tax_intern','broker','specialist','notary','accountant','manager','super_admin')),
  health_score INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Service Enrollments
CREATE TABLE service_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  service_type VARCHAR(50) CHECK (service_type IN ('tax','bookkeeping','formation','insurance','notary')),
  status VARCHAR(50) CHECK (status IN ('draft','pending','active','completed','cancelled')),
  progress INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  intake_data JSONB,
  workflow_id VARCHAR(255),
  assigned_staff_id UUID REFERENCES user_profiles(id),
  assigned_to UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  pod VARCHAR(50),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  internal_notes TEXT,
  client_message TEXT,
  sla_deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES user_profiles(id),
  client_approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document Vault
CREATE TABLE vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  enrollment_id UUID REFERENCES service_enrollments(id),
  file_name VARCHAR(255),
  display_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  storage_path VARCHAR(500),
  storage_key VARCHAR(500),
  storage_url TEXT,
  storage_bucket VARCHAR(100),
  category VARCHAR(50) CHECK (category IN ('tax','formation','insurance','notary','bookkeeping','identity','general')),
  status VARCHAR(50) CHECK (status IN ('quarantine','scanning','clean','flagged','archived')),
  uploaded_via VARCHAR(50) CHECK (uploaded_via IN ('direct','share_link','staff_upload','chat')),
  share_link_token UUID UNIQUE,
  share_link_expires TIMESTAMP,
  virus_scanned BOOLEAN DEFAULT FALSE,
  virus_clean BOOLEAN,
  content_sha256 VARCHAR(64),
  content_md5 VARCHAR(32),
  pii_flags JSONB DEFAULT '[]'::jsonb,
  scan_notes TEXT,
  document_version INTEGER DEFAULT 1,
  original_document_id UUID REFERENCES vault_documents(id),
  ocr_tags TEXT[],
  routed_to VARCHAR(100),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Staff <-> Client messaging per case
CREATE TABLE case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES service_enrollments(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES user_profiles(id),
  sender_type VARCHAR(10) CHECK (sender_type IN ('client','staff','system')),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  read_by_client BOOLEAN DEFAULT FALSE,
  read_by_staff BOOLEAN DEFAULT FALSE,
  attachment_ids UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Completed work delivered back to the client
CREATE TABLE case_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES service_enrollments(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_id UUID REFERENCES vault_documents(id),
  deliverable_type VARCHAR(50),
  requires_approval BOOLEAN DEFAULT FALSE,
  client_approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Staff checklist per service
CREATE TABLE case_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES service_enrollments(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  is_complete BOOLEAN DEFAULT FALSE,
  completed_by UUID REFERENCES user_profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  display_order INTEGER DEFAULT 0,
  visible_to_client BOOLEAN DEFAULT TRUE
);

-- Requested documents waiting on client
CREATE TABLE missing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES service_enrollments(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES user_profiles(id),
  document_name VARCHAR(255) NOT NULL,
  instructions TEXT,
  upload_link_id UUID,
  is_received BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMP WITH TIME ZONE,
  document_id UUID REFERENCES vault_documents(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secure Upload Links
CREATE TABLE upload_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES user_profiles(id),
  client_user_id UUID REFERENCES user_profiles(id),
  enrollment_id UUID REFERENCES service_enrollments(id),
  recipient_email VARCHAR(255),
  purpose TEXT,
  expires_at TIMESTAMP,
  used_at TIMESTAMP,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  used_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE missing_documents
  ADD CONSTRAINT missing_documents_upload_link_id_fkey
  FOREIGN KEY (upload_link_id) REFERENCES upload_links(id);

-- Audit Log (Append-Only)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  staff_id UUID REFERENCES user_profiles(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Business Formations
CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  business_name VARCHAR(255),
  entity_type VARCHAR(50) CHECK (entity_type IN ('llc','s-corp','c-corp','nonprofit','sole-prop')),
  state_of_formation VARCHAR(2),
  use_divine_agent BOOLEAN DEFAULT FALSE,
  filing_status VARCHAR(50) CHECK (filing_status IN ('draft','submitted','processing','approved','rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insurance Quotes
CREATE TABLE insurance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  zip_code VARCHAR(10),
  vehicle_usage VARCHAR(50),
  driver_history VARCHAR(50),
  status VARCHAR(50) CHECK (status IN ('pending','quoted','accepted','declined','expired')),
  monthly_premium DECIMAL(10,2),
  carrier VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notary Sessions
CREATE TABLE notary_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  document_type VARCHAR(100),
  signer_count INTEGER,
  session_status VARCHAR(50) CHECK (session_status IN ('scheduled','id_pending','ready','in_progress','completed','cancelled')),
  scheduled_time TIMESTAMP,
  kyc_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contact Form Submissions
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  service_interest VARCHAR(100),
  message TEXT,
  status VARCHAR(50) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT NOW()
);

-- SMS delivery log
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('vendel','textbee')),
  provider_message_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed','received')),
  error_message TEXT,
  related_resource_type VARCHAR(50),
  related_resource_id UUID,
  sent_by UUID REFERENCES user_profiles(id),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_name VARCHAR(255),
  caller_phone VARCHAR(30),
  intent VARCHAR(100) DEFAULT 'general',
  summary TEXT,
  full_transcript TEXT,
  duration_seconds INTEGER DEFAULT 0,
  call_source VARCHAR(50) DEFAULT 'web',
  handled_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) DEFAULT 'general',
  created_by UUID REFERENCES user_profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES user_profiles(id) NOT NULL,
  notification_id VARCHAR(255) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, notification_id)
);

-- Row Level Security Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notary_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Audit logs are append-only. Application roles may insert/select through
-- controlled APIs, but no runtime role should be able to delete audit events.
REVOKE DELETE ON audit_logs FROM anon, authenticated, project_admin;

-- Basic RLS: clients see their own data
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own enrollments" ON service_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own enrollments" ON service_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own vault files" ON vault_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own case messages" ON case_messages FOR SELECT USING (true);
CREATE POLICY "Users can view own deliverables" ON case_deliverables FOR SELECT USING (true);
CREATE POLICY "Users can view own checklist" ON case_checklist_items FOR SELECT USING (true);
CREATE POLICY "Users can view own missing docs" ON missing_documents FOR SELECT USING (true);
CREATE POLICY "Users can view own formations" ON formations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own quotes" ON insurance_quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notary sessions" ON notary_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can submit contact form" ON contact_submissions FOR INSERT WITH CHECK (true);

CREATE INDEX idx_enrollments_assigned ON service_enrollments(assigned_staff_id);
CREATE INDEX idx_enrollments_pod ON service_enrollments(pod);
CREATE INDEX idx_enrollments_status_priority ON service_enrollments(status, priority, created_at);
CREATE INDEX idx_case_messages_enrollment ON case_messages(enrollment_id);
CREATE INDEX idx_deliverables_enrollment ON case_deliverables(enrollment_id);
CREATE INDEX idx_missing_docs_enrollment ON missing_documents(enrollment_id);
CREATE INDEX idx_upload_links_client ON upload_links(client_user_id, is_active);
CREATE INDEX idx_upload_links_enrollment ON upload_links(enrollment_id);
CREATE INDEX idx_sms_messages_provider_msgid ON sms_messages(provider, provider_message_id);
CREATE INDEX idx_sms_messages_related ON sms_messages(related_resource_type, related_resource_id);
CREATE INDEX idx_sms_messages_recipient ON sms_messages(recipient_phone, created_at DESC);
CREATE INDEX idx_call_logs_created ON call_logs(created_at DESC);
CREATE INDEX idx_call_logs_phone ON call_logs(caller_phone);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category, is_active);
CREATE INDEX idx_notification_reads_staff ON notification_reads(staff_id, notification_id);
